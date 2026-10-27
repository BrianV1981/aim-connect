import subprocess
import os
import re
import time
import json
import sqlite3
import shutil
import logging
from pydantic import BaseModel
from fastapi import APIRouter, Header, HTTPException, Depends
from main import (
    verify_token, require_admin, _get_user_from_token,
    SESSION_NAME_RE, AGENT_WORKSPACES_DIR, AIM_CONNECT_ROOT,
    ENABLE_E2EE, E2EE_SECRET, HOME_DIR
)
import asyncio

router = APIRouter()
logger = logging.getLogger("aim-connect")

BRAILLE_SPINNER_RE = re.compile(r"[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⢿⣻⣽⣾⣷⣯⣟]")
THINKING_TEXT_RE = re.compile(
    r"(?:Working\.{2,}|Thinking\.{2,}|Running command|Generating|Executing|esc to cancel|ctrl\+c to interrupt)",
    re.IGNORECASE,
)
WAITING_TEXT_RE = re.compile(
    r"(?:\[[yY]/[nN]\]|\(y/n\)|\(yes/no\)|Allow once|Allow always|Do you want to proceed|Select an option|Enter to select|Approve\?|Proceed\?)",
    re.IGNORECASE,
)
ERROR_TEXT_RE = re.compile(
    r"(?:Traceback \(most recent call last\)|\[ERROR\]|panic:|Auth Error|Connection refused)",
    re.IGNORECASE,
)
AGY_TOKENS_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*([kKmM]?)\s*in\s*\|\s*(\d+(?:\.\d+)?)\s*([kKmM]?)\s*out"
)
SLASH_TOKENS_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*([kKmM])\s*/\s*(\d+(?:\.\d+)?)\s*([kKmM])"
)
GENERIC_TOKENS_RE = re.compile(
    r"(\d+(?:,\d{3})+|\d+(?:\.\d+)?\s*[kKmM])\s*(?:tokens|tok|ctx)",
    re.IGNORECASE,
)
ANSI_ESCAPE_RE = re.compile(r"\x1b\[[0-9;?]*[a-zA-Z]")


def _parse_token_number(num_str: str, suffix: str = "") -> int:
    cleaned = num_str.replace(",", "").strip()
    if not cleaned:
        return 0
    if cleaned[-1].lower() in ("k", "m") and not suffix:
        suffix = cleaned[-1].lower()
        cleaned = cleaned[:-1].strip()
    try:
        val = float(cleaned)
    except ValueError:
        return 0
    s = suffix.lower()
    if s == "k":
        return int(val * 1_000)
    if s == "m":
        return int(val * 1_000_000)
    return int(val)


def compute_30pct_rule_tier(context_pct: float) -> str:
    """J.O.S.H.U.A. 30%-Rule Context Saturation Tiers:
    - normal: < 20%
    - warning: 20% to < 30% (prepare /aim-memory-wiki)
    - critical: >= 30% (Amnesia threshold — trigger /aim-handoff)
    """
    if context_pct >= 30.0:
        return "critical"
    if context_pct >= 20.0:
        return "warning"
    return "normal"


def parse_pane_telemetry(pane_text: str, command: str = "", session_name: str = "") -> dict:
    """Parse captured tmux pane text and command into vessel, status, and 30%-Rule telemetry."""
    clean_text = ANSI_ESCAPE_RE.sub("", pane_text or "")
    lines = [ln.strip() for ln in clean_text.splitlines() if ln.strip()]
    tail_text = "\n".join(lines[-12:]) if lines else ""
    cmd_lower = (command or "").lower()
    sess_lower = (session_name or "").lower()

    # 1. Detect vessel
    if "agy" in cmd_lower or "antigravity" in cmd_lower or "Gemini " in clean_text or "Ctrl+P commands" in clean_text or AGY_TOKENS_RE.search(clean_text):
        vessel = "agy"
    elif "grok" in cmd_lower or "Grok CLI" in clean_text or "xAI" in clean_text:
        vessel = "grok"
    elif "opencode" in cmd_lower or "OpenCode" in clean_text or "opencode" in sess_lower:
        vessel = "opencode"
    elif "codex" in cmd_lower:
        vessel = "codex"
    elif cmd_lower in ("uvicorn", "python3", "python", "cloudflared", "node", "npm") or sess_lower == "aim-connect-workspace":
        vessel = "service"
    else:
        vessel = "shell"

    # 2. Detect status (WAITING / THINKING / ERROR / IDLE) on bottom footer lines (#220)
    footer_text = "\n".join(lines[-4:]) if lines else ""
    if WAITING_TEXT_RE.search(footer_text):
        status = "WAITING"
    elif BRAILLE_SPINNER_RE.search(footer_text) or THINKING_TEXT_RE.search(footer_text):
        status = "THINKING"
    elif ERROR_TEXT_RE.search(tail_text):
        status = "ERROR"
    else:
        status = "IDLE"

    # 3. Parse token usage & context saturation
    tokens_used = 0
    tokens_limit = 1_000_000 if vessel == "agy" else 200_000

    agy_matches = list(AGY_TOKENS_RE.finditer(clean_text))
    slash_matches = list(SLASH_TOKENS_RE.finditer(clean_text))
    generic_matches = list(GENERIC_TOKENS_RE.finditer(clean_text))

    if agy_matches:
        m = agy_matches[-1]
        tokens_used = _parse_token_number(m.group(1), m.group(2))
        tokens_limit = 1_000_000
    elif slash_matches:
        m = slash_matches[-1]
        tokens_used = _parse_token_number(m.group(1), m.group(2))
        parsed_limit = _parse_token_number(m.group(3), m.group(4))
        if parsed_limit > 0:
            tokens_limit = parsed_limit
    elif generic_matches:
        m = generic_matches[-1]
        tokens_used = _parse_token_number(m.group(1))

    context_pct = round((tokens_used / tokens_limit) * 100.0, 1) if (tokens_used > 0 and tokens_limit > 0) else 0.0
    tier = compute_30pct_rule_tier(context_pct)

    # 4. Extract concise preview line (skip pure border lines)
    preview = ""
    for ln in reversed(lines):
        stripped_borders = ln.strip("─━│┃╭╮╯╰┌┐┘└├┤┬┴┼═║╔╗╚╝╠╣╦╩╬> ")
        if stripped_borders and len(stripped_borders) > 2:
            preview = stripped_borders[:100]
            break

    return {
        "vessel": vessel,
        "status": status,
        "tokens_used": tokens_used,
        "tokens_limit": tokens_limit,
        "context_pct": context_pct,
        "tier": tier,
        "preview": preview,
    }


def _get_git_branch(path: str) -> str:
    """Resolve current git branch for a directory without spawning git subprocesses when possible."""
    if not path or not os.path.isdir(path):
        return ""
    curr = os.path.abspath(path)
    for _ in range(6):
        dot_git = os.path.join(curr, ".git")
        head_file = None
        if os.path.isdir(dot_git):
            head_file = os.path.join(dot_git, "HEAD")
        elif os.path.isfile(dot_git):
            try:
                with open(dot_git, "r", encoding="utf-8", errors="ignore") as f:
                    first = f.readline().strip()
                if first.startswith("gitdir:"):
                    gitdir = first.split(":", 1)[1].strip()
                    if not os.path.isabs(gitdir):
                        gitdir = os.path.abspath(os.path.join(curr, gitdir))
                    head_file = os.path.join(gitdir, "HEAD")
            except OSError:
                pass
        if head_file and os.path.isfile(head_file):
            try:
                with open(head_file, "r", encoding="utf-8", errors="ignore") as f:
                    ref = f.readline().strip()
                if ref.startswith("ref: refs/heads/"):
                    return ref[len("ref: refs/heads/"):]
                return ref[:8]
            except OSError:
                return ""
        parent = os.path.dirname(curr)
        if parent == curr:
            break
        curr = parent
    return ""


SESSION_WORKSPACE_ALIASES = {
    "aim-dash": "aim-tmux-dashboard",
    "aim-cron": "aim-cron-dashboard",
}

_AGY_BRAIN_CACHE: dict = {"ts": 0.0, "by_key": {}}


def _normalize_workspace_root(path: str) -> str:
    """Normalize a file:// URI or filesystem path, stripping /workspace/issue-* worktree suffixes (#218)."""
    if not path:
        return ""
    cleaned = str(path).strip()
    if cleaned.startswith("file://"):
        cleaned = cleaned[len("file://"):]
    cleaned = cleaned.rstrip("/")
    if "/workspace/issue-" in cleaned:
        cleaned = cleaned.split("/workspace/issue-", 1)[0].rstrip("/")
    return cleaned


def _read_transcript_tail_tokens(transcript_path: str, tail_bytes: int = 65536) -> int:
    """Read last 64KB of AGY transcript.jsonl and return input_tokens + cache_read_tokens (#218)."""
    if not transcript_path or not os.path.isfile(transcript_path):
        return 0
    try:
        size = os.path.getsize(transcript_path)
        with open(transcript_path, "rb") as fh:
            if size > tail_bytes:
                fh.seek(size - tail_bytes)
            raw = fh.read().decode("utf-8", errors="replace")
        for line in reversed(raw.splitlines()):
            line = line.strip()
            if not line or "PLANNER_RESPONSE" not in line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            if obj.get("type") == "PLANNER_RESPONSE":
                inp = int(obj.get("input_tokens") or 0)
                cached = int(obj.get("cache_read_tokens") or 0)
                total_in = inp + cached
                if total_in > 0:
                    return total_in
    except OSError:
        pass
    return 0


def _resolve_agy_brain_tokens_by_workspace(
    app_data_dir: str = "",
    ttl_sec: float = 3.0,
) -> dict[str, int]:
    """Query conversation_summaries.db + transcript.jsonl tail for ground-truth AGY token usage (#218)."""
    now = time.time()
    if not app_data_dir and (now - _AGY_BRAIN_CACHE["ts"]) < ttl_sec and _AGY_BRAIN_CACHE["by_key"]:
        return dict(_AGY_BRAIN_CACHE["by_key"])

    base_dir = app_data_dir or os.environ.get(
        "AIM_AGY_APP_DATA_DIR",
        os.path.join(HOME_DIR, ".gemini", "antigravity-cli"),
    )
    db_path = os.path.join(base_dir, "conversation_summaries.db")
    if not os.path.isfile(db_path):
        return {}

    result: dict[str, int] = {}
    seen_roots: set[str] = set()
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=1.5)
        try:
            rows = conn.execute(
                "SELECT conversation_id, workspace_uris FROM conversation_summaries "
                "WHERE nesting_depth = 0 ORDER BY last_modified_time DESC LIMIT 40"
            ).fetchall()
        finally:
            conn.close()

        for cid, raw_uris in rows:
            if not cid or not raw_uris:
                continue
            try:
                uris = json.loads(raw_uris) if isinstance(raw_uris, str) else []
            except Exception:
                uris = []
            if not isinstance(uris, list):
                continue
            for u in uris:
                norm_root = _normalize_workspace_root(str(u))
                if not norm_root or norm_root in seen_roots:
                    continue
                seen_roots.add(norm_root)
                transcript_path = os.path.join(
                    base_dir, "brain", str(cid), ".system_generated", "logs", "transcript.jsonl"
                )
                total_in = _read_transcript_tail_tokens(transcript_path)
                if total_in > 0:
                    result[norm_root] = total_in
                    repo_base = os.path.basename(norm_root)
                    if repo_base and repo_base not in result:
                        result[repo_base] = total_in
    except Exception as e:
        logger.debug(f"AGY brain token resolution skipped: {e}")

    if not app_data_dir:
        _AGY_BRAIN_CACHE["ts"] = now
        _AGY_BRAIN_CACHE["by_key"] = dict(result)
    return result


def collect_fleet_telemetry(allowed_sessions: list[str]) -> tuple[list[dict], list[dict]]:
    """Collect pane-level and session-level telemetry for all allowed tmux sessions."""
    allowed_set = set(allowed_sessions)
    if not allowed_set:
        return [], []

    fmt = "#{session_name}@@@#{window_index}@@@#{window_name}@@@#{pane_index}@@@#{pane_current_command}@@@#{pane_current_path}@@@#{pane_pid}@@@#{session_attached}"
    res = subprocess.run(["tmux", "list-panes", "-a", "-F", fmt], capture_output=True, text=True)
    if res.returncode != 0:
        return [], []

    agy_brain_tokens = _resolve_agy_brain_tokens_by_workspace()
    panes = []
    by_session: dict[str, list[dict]] = {s: [] for s in allowed_sessions}

    for raw in res.stdout.splitlines():
        if not raw.strip():
            continue
        parts = raw.split("@@@")
        if len(parts) < 8:
            continue
        sess_name, win_idx, win_name, pane_idx, cmd, path, pid_str, attached_str = parts[:8]
        if sess_name not in allowed_set:
            continue

        target = f"{sess_name}:{win_idx}.{pane_idx}"
        # Capture last 25 lines of the pane for status & token telemetry
        cap = subprocess.run(
            ["tmux", "capture-pane", "-t", target, "-p", "-J", "-S", "-25"],
            capture_output=True,
            text=True,
        )
        pane_text = cap.stdout if cap.returncode == 0 else ""
        telemetry = parse_pane_telemetry(pane_text, command=cmd, session_name=sess_name)
        branch = _get_git_branch(path)
        is_worktree = "/workspace/issue-" in (path or "")
        repo_name = os.path.basename(path.rstrip("/")) if path else ""

        norm_root = _normalize_workspace_root(path)
        main_repo_name = os.path.basename(norm_root) if norm_root else repo_name
        alias_repo = SESSION_WORKSPACE_ALIASES.get(sess_name, sess_name)
        brain_total_in = (
            agy_brain_tokens.get(norm_root)
            or agy_brain_tokens.get(main_repo_name)
            or agy_brain_tokens.get(alias_repo)
            or 0
        )
        if telemetry["vessel"] == "agy" and brain_total_in > telemetry["tokens_used"]:
            telemetry["tokens_used"] = brain_total_in
            telemetry["tokens_limit"] = 1_000_000
            telemetry["context_pct"] = round((brain_total_in / 1_000_000) * 100.0, 1)
            telemetry["tier"] = compute_30pct_rule_tier(telemetry["context_pct"])

        pane_obj = {
            "session_name": sess_name,
            "window_index": int(win_idx) if win_idx.isdigit() else 0,
            "window_name": win_name,
            "pane_index": int(pane_idx) if pane_idx.isdigit() else 0,
            "target": target,
            "command": cmd,
            "path": path,
            "repo_name": repo_name,
            "branch": branch,
            "is_worktree": is_worktree,
            "pid": int(pid_str) if pid_str.isdigit() else None,
            "attached": attached_str == "1",
            **telemetry,
        }
        panes.append(pane_obj)
        by_session.setdefault(sess_name, []).append(pane_obj)

    fleet = []
    for sess_name in allowed_sessions:
        sess_panes = by_session.get(sess_name, [])
        if not sess_panes:
            fleet.append({
                "session_name": sess_name,
                "vessel": "shell",
                "status": "IDLE",
                "path": "",
                "repo_name": "",
                "branch": "",
                "is_worktree": False,
                "tokens_used": 0,
                "tokens_limit": 200_000,
                "context_pct": 0.0,
                "tier": "normal",
                "preview": "",
                "pane_count": 0,
                "panes": [],
            })
            continue

        # Prefer an AI vessel pane or THINKING pane as the primary summary for the session
        primary = sess_panes[0]
        for p in sess_panes:
            if p["vessel"] in ("agy", "grok", "opencode", "codex"):
                primary = p
                break
        any_thinking = any(p["status"] == "THINKING" for p in sess_panes)
        any_waiting = any(p["status"] == "WAITING" for p in sess_panes)
        any_error = any(p["status"] == "ERROR" for p in sess_panes)
        agg_status = (
            "THINKING"
            if any_thinking
            else ("WAITING" if any_waiting else ("ERROR" if any_error else primary["status"]))
        )

        fleet.append({
            "session_name": sess_name,
            "vessel": primary["vessel"],
            "status": agg_status,
            "command": primary["command"],
            "path": primary["path"],
            "repo_name": primary["repo_name"],
            "branch": primary["branch"],
            "is_worktree": primary["is_worktree"],
            "tokens_used": primary["tokens_used"],
            "tokens_limit": primary["tokens_limit"],
            "context_pct": primary["context_pct"],
            "tier": primary["tier"],
            "preview": primary["preview"],
            "attached": primary["attached"],
            "pane_count": len(sess_panes),
            "panes": sess_panes,
        })

    return fleet, panes



async def kill_all_user_sessions(sanitized_email: str, exclude_session: str = ""):
    """Kill ALL tmux sessions for this email to enforce 1-email-1-session.
    
    This is the server-side safety net that guarantees no ghost sessions
    persist across harness switches, browser crashes, or failed frontend
    DELETE calls. Called before spawning a new session.
    
    Args:
        sanitized_email: The user's email sanitized for tmux naming
        exclude_session: Optional session name to keep alive (for reconnects)
    """
    try:
        proc = await asyncio.create_subprocess_exec(
            "tmux", "list-sessions", "-F", "#{session_name}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()
        if proc.returncode != 0:
            return  # No tmux server or no sessions — nothing to kill
        
        prefix = f"agent-{sanitized_email}"
        for session_name in stdout.decode().strip().split('\n'):
            session_name = session_name.strip()
            if not session_name:
                continue
            # Match sessions that are exactly the prefix or start with prefix-
            if session_name == prefix or session_name.startswith(f"{prefix}-"):
                if exclude_session and session_name == exclude_session:
                    continue
                logger.info(f"[HARNESS SWITCH] Killing orphan session: {session_name}")
                await asyncio.create_subprocess_exec(
                    "tmux", "kill-session", "-t", session_name
                )
    except Exception as e:
        logger.warning(f"[HARNESS SWITCH] Error during session cleanup for {sanitized_email}: {e}")


@router.get("/api/sessions", dependencies=[Depends(verify_token)])
def get_sessions(x_api_token: str = Header(None)) -> dict:
    result = subprocess.run(["tmux", "ls", "-F", "#{session_name}"], capture_output=True, text=True)
    sessions = []
    role, prefix = _get_user_from_token(x_api_token)
    if result.returncode == 0:
        for line in result.stdout.splitlines():
            if line and not line.startswith("aim-client-"):
                # Non-admin users only see sessions with their prefix (or all if no prefix)
                if role == "admin" or not prefix or line.startswith(prefix):
                    sessions.append(line)
    try:
        fleet, panes = collect_fleet_telemetry(sessions)
    except Exception as e:
        logger.warning(f"Fleet telemetry collection error: {e}")
        fleet, panes = [], []
    return {"sessions": sessions, "fleet": fleet, "panes": panes}


@router.get("/api/fleet/panes", dependencies=[Depends(verify_token)])
def get_fleet_panes(x_api_token: str = Header(None)) -> dict:
    """Return enriched pane and session telemetry for all allowed sessions (#209)."""
    data = get_sessions(x_api_token=x_api_token)
    return {
        "sessions": data.get("sessions", []),
        "fleet": data.get("fleet", []),
        "panes": data.get("panes", []),
    }


class SessionCommandRequest(BaseModel):
    command: str


@router.post("/api/sessions/{name}/command", dependencies=[Depends(verify_token), Depends(require_admin)])
def send_session_command(name: str, req: SessionCommandRequest) -> dict:
    """Safely inject a command or slash skill (e.g. /aim-memory-wiki, /aim-handoff) into a tmux session (#209).

    Uses the 2-step tmux buffer + separate Enter key protocol so interactive TUIs
    (AGY, Grok, OpenCode) do not swallow the Enter keystroke.
    """
    if not SESSION_NAME_RE.match(name):
        raise HTTPException(status_code=400, detail="Invalid session name.")
    cmd_text = (req.command or "").strip()
    if not cmd_text:
        raise HTTPException(status_code=400, detail="Command cannot be empty.")

    try:
        subprocess.run(["tmux", "set-buffer", "--", cmd_text], capture_output=True, text=True, check=True)
        subprocess.run(["tmux", "paste-buffer", "-t", name], capture_output=True, text=True, check=True)
        time.sleep(0.1)
        subprocess.run(["tmux", "send-keys", "-t", name, "Enter"], capture_output=True, text=True, check=True)
        return {"status": "sent", "session": name, "command": cmd_text}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Tmux command injection failed: {e.stderr or str(e)}")


class SessionRequest(BaseModel):
    name: str

class E2EESettingsRequest(BaseModel):
    secret: str

@router.post("/api/settings/e2ee", dependencies=[Depends(verify_token), Depends(require_admin)])
def update_e2ee_settings(req: E2EESettingsRequest):
    """Updates the backend E2EE_SECRET dynamically and writes it to .env"""
    global ENABLE_E2EE, E2EE_SECRET
    
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
    new_lines = []
    found_enable = False
    found_secret = False
    
    for line in lines:
        if line.startswith("ENABLE_E2EE="):
            new_lines.append("ENABLE_E2EE=true\n" if req.secret else "ENABLE_E2EE=false\n")
            found_enable = True
        elif line.startswith("E2EE_SECRET="):
            new_lines.append(f'E2EE_SECRET="{req.secret}"\n')
            found_secret = True
        else:
            new_lines.append(line)
            
    if not found_enable:
        new_lines.append("ENABLE_E2EE=true\n" if req.secret else "ENABLE_E2EE=false\n")
    if not found_secret:
        new_lines.append(f'E2EE_SECRET="{req.secret}"\n')
        
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
        
    ENABLE_E2EE = bool(req.secret)
    E2EE_SECRET = req.secret
    return {"status": "success", "message": "E2EE settings updated on backend."}


@router.post("/api/sessions", dependencies=[Depends(verify_token), Depends(require_admin)])
def create_session(req: SessionRequest) -> dict:
    """Spawns a new detached tmux session and enables global mouse support."""
    if not SESSION_NAME_RE.match(req.name):
        raise HTTPException(status_code=400, detail="Invalid session name. Use only letters, numbers, hyphens, underscores (max 64 chars).")

    result = subprocess.run(["tmux", "new-session", "-d", "-s", req.name], capture_output=True, text=True)
    if result.returncode == 0:
        subprocess.run(["tmux", "set-option", "-g", "mouse", "on"])
        return {"status": "success"}
    return {"error": result.stderr}

@router.delete("/api/sessions/{name}", dependencies=[Depends(verify_token), Depends(require_admin)])
def kill_session(name: str, delete_workspace: bool = False):

    import shutil
    import re
    result = subprocess.run(["tmux", "kill-session", "-t", name], capture_output=True, text=True)
    
    if delete_workspace:
        # Obliterate the workspace directory for the agent/subagent
        # Unified model: primary sessions use user_root_dir, fleet sub-agents use fleet_sessions/
        workspace_dir = None
        parts = name.split('-')
        if name.startswith('agent-') and len(parts) >= 2:
            base_agent = f"agent-{parts[1]}"
            user_root_dir = f"{AGENT_WORKSPACES_DIR}/{base_agent}"
            if len(parts) > 3:
                # Fleet sub-agent: only delete its conversation isolation dir
                sub_id = '-'.join(parts[2:])
                workspace_dir = f"{user_root_dir}/fleet_sessions/{sub_id}"
            else:
                # Primary session — delete the entire user workspace
                workspace_dir = user_root_dir
        else:
            # Fallback for generic non-agent workspaces
            workspace_dir = f"{AIM_CONNECT_ROOT}/workspace/{name}"
            
        if workspace_dir and os.path.exists(workspace_dir):
            try:
                shutil.rmtree(workspace_dir)
                logger.info(f"Obliterated workspace directory: {workspace_dir}")
            except Exception as e:
                logger.error(f"Failed to delete workspace directory {workspace_dir}: {e}")
                return {"status": "success", "warning": f"Session killed, but failed to delete workspace: {e}"}

    if result.returncode == 0 or "can't find session" in result.stderr:
        return {"status": "success"}
    return {"error": result.stderr}

SECRET_QUERY_RE = re.compile(
    r"([?&](?:token|api_token|access_token|key|api_key|secret|password|sig|signature|jwt)=)([^&#\s]+)",
    re.IGNORECASE,
)
URL_TOKEN_RE = re.compile(r"https?://[^\s\"'<>)\]]+")
PATH_TOKEN_RE = re.compile(r"(?:~|(?:/[a-zA-Z0-9._-]+)){2,}(?:/[a-zA-Z0-9._-]+)*")
IPV4_TOKEN_RE = re.compile(r"\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?::\d{1,5})?\b")
GIT_SHA_TOKEN_RE = re.compile(r"\b[0-9a-f]{7,40}\b")


def redact_url_secrets(url: str) -> tuple[str, bool]:
    """Mask sensitive query parameter values in URL display strings (#210)."""
    redacted_url, count = SECRET_QUERY_RE.subn(r"\1***REDACTED***", url)
    return redacted_url, count > 0


def extract_scrollback_tokens(raw_text: str) -> list[dict]:
    """Extract deduplicated URLs, file paths, IPv4s, and git SHAs from terminal scrollback (#210)."""
    clean = ANSI_ESCAPE_RE.sub("", raw_text or "")
    items: list[dict] = []
    seen: set[tuple[str, str]] = set()

    # Walk lines in reverse so most recent tokens appear first
    for line in reversed(clean.splitlines()):
        for m in URL_TOKEN_RE.finditer(line):
            val = m.group(0).rstrip(".,;:!?)")
            key = ("url", val)
            if key not in seen:
                seen.add(key)
                disp, is_redacted = redact_url_secrets(val)
                items.append({
                    "type": "url",
                    "value": val,
                    "display_value": disp,
                    "redacted": is_redacted,
                })

        for m in IPV4_TOKEN_RE.finditer(line):
            val = m.group(0)
            key = ("ip", val)
            if key not in seen:
                seen.add(key)
                items.append({
                    "type": "ip",
                    "value": val,
                    "display_value": val,
                    "redacted": False,
                })

        for m in PATH_TOKEN_RE.finditer(line):
            val = m.group(0).rstrip(".,;:!?)")
            if val.startswith("//") or len(val) < 4:
                continue
            key = ("path", val)
            if key not in seen:
                seen.add(key)
                items.append({
                    "type": "path",
                    "value": val,
                    "display_value": val,
                    "redacted": False,
                })

        for m in GIT_SHA_TOKEN_RE.finditer(line):
            val = m.group(0)
            # Require both digits and hex letters to avoid plain integers or English hex words
            if not (any(c.isdigit() for c in val) and any(c in "abcdef" for c in val)):
                continue
            key = ("sha", val)
            if key not in seen:
                seen.add(key)
                items.append({
                    "type": "sha",
                    "value": val,
                    "display_value": val,
                    "redacted": False,
                })

    return items[:200]


@router.get("/api/scrollback/{session_name}", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_scrollback(session_name: str, lines: int = 2000):
    try:
        clamped_lines = max(100, min(5000, int(lines)))
        result = subprocess.run(
            ["tmux", "capture-pane", "-t", session_name, "-S", f"-{clamped_lines}", "-e", "-p"],
            capture_output=True,
            text=True,
            check=True
        )
        return {
            "scrollback": result.stdout,
            "tokens": extract_scrollback_tokens(result.stdout),
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/api/scrollback/{session_name}/tokens", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_scrollback_tokens(session_name: str, lines: int = 2000):
    data = get_scrollback(session_name=session_name, lines=lines)
    if "error" in data:
        return data
    return {"session": session_name, "tokens": data.get("tokens", [])}

