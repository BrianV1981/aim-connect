import glob
import json
import logging
import os
import re
import sqlite3
import subprocess
import time
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, Query
from main import (
    AGENT_WORKSPACES_DIR,
    AIM_CONNECT_ROOT,
    HOME_DIR,
    SESSION_NAME_RE,
    require_admin,
    require_admin_or_loopback,
    verify_token,
    verify_token_or_loopback,
)
from routes_files import _find_repo_roots, _resolve_session_cwd, secure_path
from routes_sessions import (
    ANSI_ESCAPE_RE,
    SESSION_WORKSPACE_ALIASES,
    _normalize_workspace_root,
    _read_transcript_telemetry,
    extract_spoken_summary,
    parse_pane_telemetry,
)

router = APIRouter()
logger = logging.getLogger("aim-connect")

COLLAPSED_TOOL_RE = re.compile(r"^[●•]\s*([A-Za-z0-9_.-]+)\((.*)\)(?:\s*\(([^)]*)\))?$")
FROM_HEADER_RE = re.compile(r"(?:From:\s*|\[FROM:\s*)([a-zA-Z0-9_.-]+)", re.IGNORECASE)
TO_HEADER_RE = re.compile(r"(?:To:\s*|\[TO:\s*)([a-zA-Z0-9_.-]+)", re.IGNORECASE)
REPLY_TO_RE = re.compile(r"REPLY_TO:\s*([a-zA-Z0-9_.-]+)", re.IGNORECASE)
FTS_SAFE_TOKEN_RE = re.compile(r"[a-zA-Z0-9_]+")


def _get_forensics_db_path() -> str:
    return os.environ.get("AIM_FORENSICS_DB", "/tmp/aim_connect_forensics_fts.db")


def _candidate_transcript_files() -> list[str]:
    """Return candidate JSONL transcript and vault flight record paths across the host."""
    files: list[str] = []
    custom_dir = os.environ.get("AIM_FORENSICS_DIR", "").strip()
    if custom_dir and os.path.isdir(custom_dir):
        files.extend(glob.glob(os.path.join(custom_dir, "**", "*.jsonl"), recursive=True))
        files.extend(glob.glob(os.path.join(custom_dir, "**", "*.md"), recursive=True))

    agy_brain_glob = os.path.join(
        HOME_DIR, ".gemini", "antigravity-cli", "brain", "*", ".system_generated", "logs", "transcript.jsonl"
    )
    files.extend(glob.glob(agy_brain_glob))

    grok_home = os.environ.get("AIM_GROK_HOME", os.path.join(HOME_DIR, ".grok"))
    files.extend(glob.glob(os.path.join(grok_home, "sessions", "*", "*", "chat_history.jsonl")))

    vault_glob = os.path.join(AIM_CONNECT_ROOT, "joshua_os", "vault", "*.md")
    files.extend(glob.glob(vault_glob))

    # Sort newest first
    valid = [f for f in files if os.path.isfile(f)]
    valid.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    return valid[:60]


def _get_agy_active_max_step_index(transcript_path: str) -> int | None:
    """Return active step_index ceiling from conversations/<cid>.db (?mode=ro) after /rewind (#261).

    AGY's transcript.jsonl is append-only, whereas conversations/<cid>.db immediately deletes
    rewound rows from `steps`. Returning -1 when `steps` is empty or MAX(idx) when populated
    erases rewound turns immediately—even before the Operator submits a new prompt.
    """
    if not transcript_path:
        return None
    norm = os.path.abspath(transcript_path)
    # Expected layout: <agy_root>/brain/<cid>/.system_generated/logs/transcript.jsonl
    logs_dir = os.path.dirname(norm)
    sys_gen_dir = os.path.dirname(logs_dir)
    cid_dir = os.path.dirname(sys_gen_dir)
    brain_dir = os.path.dirname(cid_dir)
    if os.path.basename(logs_dir) != "logs" or os.path.basename(brain_dir) != "brain":
        return None
    cid = os.path.basename(cid_dir)
    agy_root = os.path.dirname(brain_dir)
    conv_db = os.path.join(agy_root, "conversations", f"{cid}.db")
    if not cid or not os.path.isfile(conv_db):
        return None
    try:
        conn = sqlite3.connect(f"file:{conv_db}?mode=ro", uri=True, timeout=1.5)
        try:
            row = conn.execute("SELECT COUNT(*), MAX(idx) FROM steps").fetchone()
        finally:
            conn.close()
        if not row:
            return None
        cnt, max_idx = row[0], row[1]
        if int(cnt or 0) == 0:
            return -1
        if max_idx is not None:
            return int(max_idx)
    except sqlite3.Error:
        return None
    return None


MAX_TRANSCRIPT_TURN_CHARS = 32000
MAX_TRANSCRIPT_THINKING_CHARS = 8000


def _load_full_transcript_lookup(compact_file_path: str) -> tuple[list[dict | None], dict[int, dict]]:
    """Load sibling transcript_full.jsonl lazily when compact transcript.jsonl has truncated_fields (#271)."""
    if not compact_file_path or os.path.basename(compact_file_path) != "transcript.jsonl":
        return [], {}
    full_path = os.path.join(os.path.dirname(compact_file_path), "transcript_full.jsonl")
    if not os.path.isfile(full_path):
        return [], {}
    try:
        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            raw_lines = f.readlines()
    except OSError:
        return [], {}

    by_line: list[dict | None] = []
    by_step: dict[int, dict] = {}
    for raw in raw_lines:
        stripped = raw.strip()
        if not stripped:
            by_line.append(None)
            continue
        try:
            parsed = json.loads(stripped)
        except json.JSONDecodeError:
            by_line.append(None)
            continue
        if isinstance(parsed, dict):
            by_line.append(parsed)
            s_idx = parsed.get("step_index")
            if isinstance(s_idx, int) and not isinstance(s_idx, bool):
                by_step[s_idx] = parsed
        else:
            by_line.append(None)
    return by_line, by_step


def _unwrap_message_content(raw_content: object) -> str:
    """Unwrap plain strings or Grok/OpenAI structured content-block lists into clean text (#301)."""
    if raw_content is None:
        return ""
    if isinstance(raw_content, str):
        return raw_content
    if isinstance(raw_content, dict):
        return str(raw_content.get("text") or raw_content.get("content") or "")
    if isinstance(raw_content, list):
        parts: list[str] = []
        for item in raw_content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                txt = item.get("text") if "text" in item else item.get("content")
                if txt:
                    parts.append(str(txt))
        return "\n".join(p for p in parts if p)
    return str(raw_content)


def _is_synthetic_system_user_turn(obj: dict, unwrapped_text: str) -> bool:
    """Return True if a JSONL 'user' message is a synthetic CLI system/skill/workspace injection (#301)."""
    if obj.get("synthetic_reason"):
        return True
    stripped = unwrapped_text.strip()
    if not stripped:
        return True
    if "<user_query>" in stripped.lower() or "<user_request>" in stripped.lower():
        return False
    if stripped.startswith(("<user_info>", "<system-reminder>", "<workspace_info>")):
        return True
    return False


def parse_jsonl_transcript(file_path: str, max_turns: int = 80) -> list[dict]:
    """Parse an AGY/Grok JSONL transcript into structured turns with /rewind rollback (#212, #261, #271, #301)."""
    turns: list[dict] = []
    if not os.path.isfile(file_path):
        return turns

    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
    except OSError:
        return turns

    window_size = max(800, max_turns * 16)
    start_offset = max(0, len(lines) - window_size)
    full_loaded = False
    full_by_line: list[dict | None] = []
    full_by_step: dict[int, dict] = {}
    pending_reasoning = ""

    for rel_idx, raw_line in enumerate(lines[start_offset:]):
        abs_line_idx = start_offset + rel_idx
        raw_line = raw_line.strip()
        if not raw_line:
            continue
        try:
            obj = json.loads(raw_line)
        except json.JSONDecodeError:
            continue

        raw_step_idx = obj.get("step_index")
        has_int_step = isinstance(raw_step_idx, int) and not isinstance(raw_step_idx, bool)
        if has_int_step:
            # AGY /rewind resets step_index in append-only transcript.jsonl; prune superseded turns (#261)
            turns = [
                t
                for t in turns
                if not t.get("_has_step_index") or t["step_index"] < raw_step_idx
            ]

        trunc_fields = obj.get("truncated_fields")
        if isinstance(trunc_fields, list) and ("content" in trunc_fields or "thinking" in trunc_fields):
            if not full_loaded:
                full_by_line, full_by_step = _load_full_transcript_lookup(file_path)
                full_loaded = True
            full_obj = None
            if abs_line_idx < len(full_by_line):
                cand = full_by_line[abs_line_idx]
                if (
                    isinstance(cand, dict)
                    and cand.get("step_index") == raw_step_idx
                    and (cand.get("type") or cand.get("role")) == (obj.get("type") or obj.get("role"))
                ):
                    full_obj = cand
            if full_obj is None and has_int_step:
                cand = full_by_step.get(raw_step_idx)
                if isinstance(cand, dict) and (cand.get("type") or cand.get("role")) == (
                    obj.get("type") or obj.get("role")
                ):
                    full_obj = cand
            if full_obj is not None:
                obj = {**obj, **full_obj}

        step_type = obj.get("type") or obj.get("role") or ""
        if step_type == "reasoning":
            summary_list = obj.get("summary")
            if isinstance(summary_list, list):
                summary_txt = "\n".join(
                    str(s.get("text") or "") for s in summary_list if isinstance(s, dict) and s.get("text")
                ).strip()
                if summary_txt:
                    pending_reasoning = summary_txt
            continue

        if step_type in ("USER_INPUT", "user"):
            content = _unwrap_message_content(obj.get("content") or obj.get("text") or "")
            if _is_synthetic_system_user_turn(obj, content):
                continue
            pending_reasoning = ""
            turns.append({
                "step_index": raw_step_idx if has_int_step else len(turns),
                "_has_step_index": has_int_step,
                "role": "user",
                "created_at": obj.get("created_at") or obj.get("ts") or "",
                "content": str(content)[:MAX_TRANSCRIPT_TURN_CHARS],
                "thinking": "",
                "tool_calls": [],
            })
        elif step_type in ("PLANNER_RESPONSE", "assistant", "model"):
            content = _unwrap_message_content(obj.get("content") or obj.get("text") or "")
            thinking = _unwrap_message_content(obj.get("thinking") or "") or pending_reasoning
            pending_reasoning = ""
            raw_tools = obj.get("tool_calls") or []
            parsed_tools = []
            for tc in raw_tools:
                if not isinstance(tc, dict):
                    continue
                t_name = tc.get("name") or tc.get("tool_name") or tc.get("function", {}).get("name") or "tool"
                t_args = tc.get("arguments") or tc.get("args") or tc.get("input") or {}
                if isinstance(t_args, dict):
                    args_str = json.dumps(t_args, ensure_ascii=False)[:1200]
                else:
                    args_str = str(t_args)[:1200]
                t_out = tc.get("output") or tc.get("result") or tc.get("response") or ""
                parsed_tools.append({
                    "id": tc.get("id") or f"{t_name}-{len(parsed_tools)}",
                    "name": t_name,
                    "args": args_str,
                    "output": str(t_out)[:3000],
                    "status": tc.get("status") or obj.get("status") or "DONE",
                })
            if content or thinking or parsed_tools:
                turns.append({
                    "step_index": raw_step_idx if has_int_step else len(turns),
                    "_has_step_index": has_int_step,
                    "role": "assistant",
                    "created_at": obj.get("created_at") or obj.get("ts") or "",
                    "content": str(content)[:MAX_TRANSCRIPT_TURN_CHARS],
                    "thinking": str(thinking)[:MAX_TRANSCRIPT_THINKING_CHARS],
                    "tool_calls": parsed_tools,
                })

    max_active_step = _get_agy_active_max_step_index(file_path)
    if max_active_step is not None:
        turns = [
            t
            for t in turns
            if not t.get("_has_step_index") or t["step_index"] <= max_active_step
        ]

    for t in turns:
        t.pop("_has_step_index", None)

    return turns[-max_turns:]


OPENCODE_URI_PREFIX = "opencode_db://"


def _has_transcript_source(source_spec: str) -> bool:
    if not source_spec:
        return False
    if source_spec.startswith(OPENCODE_URI_PREFIX):
        rest = source_spec[len(OPENCODE_URI_PREFIX):]
        db_part = rest.split("#", 1)[0]
        return os.path.isfile(db_part)
    return os.path.isfile(source_spec)


def parse_opencode_db_session(db_path: str, session_id: str, max_turns: int = 80) -> list[dict]:
    """Parse an OpenCode SQLite session (`opencode.db?mode=ro`) into structured turns (#303)."""
    turns: list[dict] = []
    if not db_path or not session_id or not os.path.isfile(db_path):
        return turns

    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=2.0)
        try:
            msg_rows = conn.execute(
                "SELECT id, time_created, data FROM message WHERE session_id = ? ORDER BY time_created ASC",
                (session_id,),
            ).fetchall()
            part_rows = conn.execute(
                "SELECT message_id, time_created, data FROM part WHERE session_id = ? ORDER BY time_created ASC",
                (session_id,),
            ).fetchall()
        finally:
            conn.close()
    except sqlite3.Error:
        return turns

    parts_by_msg: dict[str, list[dict]] = {}
    for msg_id, _, raw_part in part_rows:
        if not msg_id or not raw_part:
            continue
        try:
            p_obj = json.loads(raw_part) if isinstance(raw_part, str) else {}
        except Exception:
            continue
        if isinstance(p_obj, dict):
            parts_by_msg.setdefault(str(msg_id), []).append(p_obj)

    for idx, (msg_id, time_created, raw_msg) in enumerate(msg_rows):
        try:
            m_obj = json.loads(raw_msg) if isinstance(raw_msg, str) else {}
        except Exception:
            m_obj = {}
        role_raw = str(m_obj.get("role") or "").lower()
        if role_raw not in ("user", "assistant", "model"):
            continue

        ts_num = float(time_created or 0)
        ts_sec = ts_num / 1000.0 if ts_num > 1e11 else ts_num
        stamp_iso = (
            time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(ts_sec))
            if ts_sec > 0
            else ""
        )

        msg_parts = parts_by_msg.get(str(msg_id), [])
        text_chunks: list[str] = []
        reasoning_chunks: list[str] = []
        tool_calls: list[dict] = []

        for p in msg_parts:
            ptype = str(p.get("type") or "")
            if ptype == "text" and p.get("text"):
                text_chunks.append(str(p["text"]))
            elif ptype == "reasoning" and p.get("text"):
                reasoning_chunks.append(str(p["text"]))
            elif ptype == "tool":
                t_name = str(p.get("tool") or p.get("name") or "tool")
                state_obj = p.get("state") if isinstance(p.get("state"), dict) else {}
                t_input = state_obj.get("input") if isinstance(state_obj, dict) else {}
                args_str = (
                    json.dumps(t_input, ensure_ascii=False)[:1200]
                    if isinstance(t_input, dict)
                    else str(t_input or "")[:1200]
                )
                t_out = str(state_obj.get("output") or state_obj.get("error") or "")[:3000]
                t_status = str(state_obj.get("status") or "DONE").upper()
                tool_calls.append(
                    {
                        "id": str(p.get("callID") or f"{t_name}-{len(tool_calls)}"),
                        "name": t_name,
                        "args": args_str,
                        "output": t_out,
                        "status": t_status,
                    }
                )

        content_str = "\n\n".join(c.strip() for c in text_chunks if c.strip())
        thinking_str = "\n\n".join(r.strip() for r in reasoning_chunks if r.strip())

        if role_raw == "user":
            if not content_str or _is_synthetic_system_user_turn(m_obj, content_str):
                continue
            turns.append(
                {
                    "step_index": idx,
                    "role": "user",
                    "created_at": stamp_iso,
                    "content": content_str[:MAX_TRANSCRIPT_TURN_CHARS],
                    "thinking": "",
                    "tool_calls": [],
                }
            )
        else:
            if content_str or thinking_str or tool_calls:
                turns.append(
                    {
                        "step_index": idx,
                        "role": "assistant",
                        "created_at": stamp_iso,
                        "content": content_str[:MAX_TRANSCRIPT_TURN_CHARS],
                        "thinking": thinking_str[:MAX_TRANSCRIPT_THINKING_CHARS],
                        "tool_calls": tool_calls,
                    }
                )

    return turns[-max_turns:]


def parse_transcript_source(source_spec: str, max_turns: int = 80) -> list[dict]:
    """Unified transcript parser supporting JSONL files and OpenCode SQLite URIs (#303)."""
    if not source_spec:
        return []
    if source_spec.startswith(OPENCODE_URI_PREFIX):
        rest = source_spec[len(OPENCODE_URI_PREFIX):]
        if "#" not in rest:
            return []
        db_path, session_id = rest.split("#", 1)
        return parse_opencode_db_session(db_path, session_id, max_turns=max_turns)
    return parse_jsonl_transcript(source_spec, max_turns=max_turns)


def parse_scrollback_tool_blocks(scrollback_text: str) -> list[dict]:
    """Parse collapsed TUI tool lines (e.g. '● Bash(pytest -q) (ctrl+o to expand)') from pane scrollback."""
    clean = ANSI_ESCAPE_RE.sub("", scrollback_text or "")
    lines = clean.splitlines()
    turns: list[dict] = []
    current_tools: list[dict] = []
    current_text: list[str] = []

    i = 0
    while i < len(lines):
        ln = lines[i].strip()
        m = COLLAPSED_TOOL_RE.match(ln)
        if m:
            tool_name = m.group(1)
            tool_args = m.group(2)
            out_lines = []
            j = i + 1
            while j < len(lines) and j < i + 25:
                nxt = lines[j]
                if COLLAPSED_TOOL_RE.match(nxt.strip()) or nxt.strip().startswith((">", "❯", "$")):
                    break
                if nxt.strip():
                    out_lines.append(nxt.rstrip())
                j += 1
            current_tools.append({
                "id": f"scroll-tc-{i}",
                "name": tool_name,
                "args": tool_args,
                "output": "\n".join(out_lines)[:2500],
                "status": "DONE",
            })
            i = j
            continue
        if ln:
            current_text.append(ln)
        i += 1

    if current_tools or current_text:
        turns.append({
            "step_index": 1,
            "role": "assistant",
            "created_at": "",
            "content": "\n".join(current_text[-30:])[:3000],
            "thinking": "",
            "tool_calls": current_tools,
        })
    return turns


@router.get("/api/forensics/search", dependencies=[Depends(verify_token), Depends(require_admin)])
def search_forensics_fts(q: str = Query(""), limit: int = Query(30)):
    """SQLite WAL FTS5 cross-fleet transcript search queried via ?mode=ro (#212)."""
    tokens = FTS_SAFE_TOKEN_RE.findall(q or "")
    if not tokens:
        return {"query": q, "results": []}

    db_path = _get_forensics_db_path()
    _sync_forensics_fts_index(db_path)

    fts_query = " AND ".join(f'"{t}"*' for t in tokens[:8])
    clamped_limit = max(1, min(100, int(limit)))

    results = []
    try:
        ro_uri = f"file:{os.path.abspath(db_path)}?mode=ro"
        conn = sqlite3.connect(ro_uri, uri=True, timeout=3.0)
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute(
                """
                SELECT
                    session_name,
                    source_path,
                    role,
                    tool_names,
                    created_at,
                    snippet(messages_fts, 4, '[', ']', ' … ', 24) AS snippet
                FROM messages_fts
                WHERE messages_fts MATCH ?
                ORDER BY rank
                LIMIT ?
                """,
                (fts_query, clamped_limit),
            ).fetchall()
            for r in rows:
                results.append({
                    "session_name": r["session_name"],
                    "source_path": r["source_path"],
                    "role": r["role"],
                    "tool_names": r["tool_names"],
                    "created_at": r["created_at"],
                    "snippet": r["snippet"],
                })
        finally:
            conn.close()
    except sqlite3.Error as e:
        logger.warning(f"FTS5 search error: {e}")

    return {"query": q, "results": results}


def _sync_forensics_fts_index(db_path: str) -> None:
    """Incrementally index modified JSONL transcripts and vault markdown records into SQLite WAL FTS5."""
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=5.0)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS file_meta (
                source_path TEXT PRIMARY KEY,
                mtime REAL
            );
            """
        )
        conn.execute(
            """
            CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
                session_name,
                source_path,
                role,
                tool_names,
                content,
                created_at UNINDEXED,
                tokenize='porter unicode61'
            );
            """
        )
        existing = {
            row[0]: row[1]
            for row in conn.execute("SELECT source_path, mtime FROM file_meta").fetchall()
        }

        for fpath in _candidate_transcript_files():
            try:
                mtime = os.path.getmtime(fpath)
            except OSError:
                continue
            if fpath in existing and abs(existing[fpath] - mtime) < 0.001:
                continue

            conn.execute("DELETE FROM messages_fts WHERE source_path = ?", (fpath,))
            session_guess = os.path.basename(os.path.dirname(fpath))
            if fpath.endswith(".jsonl"):
                turns = parse_jsonl_transcript(fpath, max_turns=120)
                rows_to_insert = []
                for t in turns:
                    tool_names = ", ".join(tc["name"] for tc in t.get("tool_calls", []))
                    tool_outputs = "\n".join(
                        f"{tc['name']}({tc['args']}): {tc['output']}" for tc in t.get("tool_calls", [])
                    )
                    combined = "\n".join(filter(None, [t.get("content", ""), t.get("thinking", ""), tool_outputs]))
                    if combined.strip():
                        rows_to_insert.append((
                            session_guess,
                            fpath,
                            t.get("role", "assistant"),
                            tool_names,
                            combined[:6000],
                            t.get("created_at", ""),
                        ))
                if rows_to_insert:
                    conn.executemany(
                        "INSERT INTO messages_fts (session_name, source_path, role, tool_names, content, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                        rows_to_insert,
                    )
            elif fpath.endswith(".md"):
                try:
                    text = open(fpath, "r", encoding="utf-8", errors="replace").read()
                    conn.execute(
                        "INSERT INTO messages_fts (session_name, source_path, role, tool_names, content, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                        (os.path.basename(fpath), fpath, "flight_record", "", text[:15000], ""),
                    )
                except OSError:
                    pass

            conn.execute(
                "INSERT OR REPLACE INTO file_meta (source_path, mtime) VALUES (?, ?)",
                (fpath, mtime),
            )
        conn.commit()
    finally:
        conn.close()


@router.get("/api/forensics/{session_name}", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_session_forensics(session_name: str):
    """Lazy-loaded on-demand Turn & Tool-Call Inspector for a session (#212, #303)."""
    pane_cwd = _resolve_session_cwd(session=session_name)
    _, main_repo_root = _find_repo_roots(pane_cwd)

    chosen_source = ""
    turns: list[dict] = []

    # 0. Prefer exact session / active-vessel record (AGY, Grok, OpenCode SQLite)
    preferred_vessel, active_cwd = _detect_active_session_pane_hint(session_name)
    all_records = _collect_project_history_records()
    sess_cands = [
        r
        for r in all_records
        if r["session"] == session_name
        or (active_cwd and r.get("workspace_root") == active_cwd)
    ]
    matched_rec = (
        next((r for r in sess_cands if r["vessel"] == preferred_vessel), None)
        if preferred_vessel
        else None
    ) or (sess_cands[0] if sess_cands else None)
    if matched_rec and _has_transcript_source(matched_rec["log_path"]):
        turns = parse_transcript_source(matched_rec["log_path"], max_turns=60)
        chosen_source = matched_rec["log_path"]

    # 1. Fallback to candidate JSONL transcripts referencing this repo/session
    if not turns:
        candidates = [f for f in _candidate_transcript_files() if f.endswith(".jsonl")]
        matched_file = None
        for fpath in candidates:
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    sample = f.read(65536)
                if session_name in sample or main_repo_root in sample:
                    matched_file = fpath
                    break
            except OSError:
                continue

        target_jsonl = matched_file or (candidates[0] if candidates else None)
        if target_jsonl:
            turns = parse_jsonl_transcript(target_jsonl, max_turns=60)
            chosen_source = target_jsonl

    # 2. Also capture live scrollback tool blocks if JSONL had no turns or to supplement
    if not turns:
        cap = subprocess.run(
            ["tmux", "capture-pane", "-t", session_name, "-S", "-600", "-p"],
            capture_output=True,
            text=True,
        )
        if cap.returncode == 0 and cap.stdout.strip():
            turns = parse_scrollback_tool_blocks(cap.stdout)
            chosen_source = f"tmux:{session_name}"

    tool_call_count = sum(len(t.get("tool_calls", [])) for t in turns)
    return {
        "session": session_name,
        "pane_path": pane_cwd,
        "source": chosen_source,
        "tool_call_count": tool_call_count,
        "turns": turns,
    }


@router.get("/api/brain/search", dependencies=[Depends(verify_token), Depends(require_admin)])
def search_brain_wiki(session: str = "", q: str = "", path: str = "", limit: int = 15):
    """Search the active session's memory-wiki/, HANDOFF.md, and AGENTS.md with per-path deduplication (#212)."""
    query_terms = [t.lower() for t in FTS_SAFE_TOKEN_RE.findall(q or "") if len(t) >= 2]
    if not query_terms:
        return {"query": q, "results": []}

    pane_cwd = _resolve_session_cwd(session=session, explicit_path=path)
    _, main_repo_root = _find_repo_roots(pane_cwd)

    md_files: list[str] = []
    for root_doc in ("HANDOFF.md", "AGENTS.md", "README.md"):
        cand = os.path.join(main_repo_root, root_doc)
        if os.path.isfile(cand):
            md_files.append(cand)

    wiki_dir = os.path.join(main_repo_root, "memory-wiki")
    if os.path.isdir(wiki_dir):
        md_files.extend(glob.glob(os.path.join(wiki_dir, "**", "*.md"), recursive=True))

    # Two-pass per-path deduplication (Operations Center pattern): keep only the highest-scoring chunk per file
    best_by_path: dict[str, dict] = {}
    for fpath in md_files:
        try:
            text = open(fpath, "r", encoding="utf-8", errors="replace").read()
        except OSError:
            continue

        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
        for para in paragraphs:
            para_lower = para.lower()
            score = sum(para_lower.count(term) * 10 for term in query_terms)
            if score <= 0:
                continue
            # Bonus if all query terms appear in the same chunk
            if all(term in para_lower for term in query_terms):
                score += 25

            prev = best_by_path.get(fpath)
            if not prev or score > prev["score"]:
                rel_path = os.path.relpath(fpath, main_repo_root)
                first_line = para.splitlines()[0].lstrip("# ").strip()[:80]
                best_by_path[fpath] = {
                    "path": fpath,
                    "rel_path": rel_path,
                    "title": first_line or os.path.basename(fpath),
                    "score": score,
                    "snippet": para[:450],
                }

    deduped = sorted(best_by_path.values(), key=lambda x: x["score"], reverse=True)
    return {
        "query": q,
        "repo_root": main_repo_root,
        "results": deduped[: max(1, min(50, int(limit)))],
    }


@router.get("/api/swarm/activity", dependencies=[Depends(verify_token_or_loopback), Depends(require_admin_or_loopback)])
def get_swarm_activity():
    """Return Hub-and-Spoke aim-communicate chalkboard dispatches and recent inter-agent reports (#212)."""
    candidate_files: list[str] = []
    custom_swarm_dir = os.environ.get("AIM_SWARM_DIR", "").strip()
    if custom_swarm_dir and os.path.isdir(custom_swarm_dir):
        candidate_files.extend(glob.glob(os.path.join(custom_swarm_dir, "*.md")))
        candidate_files.extend(glob.glob(os.path.join(custom_swarm_dir, "*.txt")))

    candidate_files.extend(glob.glob("/tmp/aim_comm*"))
    candidate_files.extend(glob.glob("/tmp/dispatch*"))
    candidate_files.extend(
        glob.glob(os.path.join(AIM_CONNECT_ROOT, "joshua_os", "planning-artifacts", "*REPORT*.md"))
    )
    candidate_files.extend(
        glob.glob(os.path.join(AIM_CONNECT_ROOT, "joshua_os", "planning-artifacts", "*DISPATCH*.md"))
    )

    valid = [f for f in set(candidate_files) if os.path.isfile(f)]
    valid.sort(key=lambda p: os.path.getmtime(p), reverse=True)

    dispatches = []
    for fpath in valid[:30]:
        try:
            content = open(fpath, "r", encoding="utf-8", errors="replace").read(12000)
            mtime = os.path.getmtime(fpath)
        except OSError:
            continue

        m_from = FROM_HEADER_RE.search(content)
        m_to = TO_HEADER_RE.search(content)
        m_reply = REPLY_TO_RE.search(content)

        sender = m_from.group(1) if m_from else "agent"
        recipient = m_to.group(1) if m_to else (m_reply.group(1) if m_reply else "fleet")
        reply_to = m_reply.group(1) if m_reply else sender

        lines = [ln.strip() for ln in content.splitlines() if ln.strip()]
        preview = lines[0][:120] if lines else os.path.basename(fpath)

        dispatches.append({
            "id": fpath,
            "filename": os.path.basename(fpath),
            "path": fpath,
            "sender": sender,
            "recipient": recipient,
            "reply_to": reply_to,
            "mtime": mtime,
            "preview": preview,
            "content": content[:5000],
        })

    return {"dispatches": dispatches}


REVERSE_WORKSPACE_ALIASES = {v: k for k, v in SESSION_WORKSPACE_ALIASES.items()}


def _format_tok_short(tokens: int, limit: int = 1_000_000) -> str:
    if not tokens or tokens <= 0:
        return "0k (0.0%)"
    pct = round((tokens / max(1, limit)) * 100.0, 1)
    if tokens >= 1_000_000:
        return f"{tokens / 1_000_000:.2f}M ({pct}%)"
    if tokens >= 1_000:
        return f"{round(tokens / 1_000)}k ({pct}%)"
    return f"{tokens} ({pct}%)"


def _infer_vessel_from_filename(fpath: str) -> str:
    low = os.path.basename(fpath).lower()
    if "grok" in low:
        return "GROK"
    if "opencode" in low or low.startswith("oc_"):
        return "OC"
    if "codex" in low or low.startswith("cdx_"):
        return "CDX"
    return "AGY"


def _infer_session_from_vault_file(fpath: str) -> str:
    stem = os.path.splitext(os.path.basename(fpath))[0]
    for prefix in ("grok_", "opencode_", "codex_", "agy_", "flight_"):
        if stem.lower().startswith(prefix):
            stem = stem[len(prefix):]
            break
    # Match aim-<slug> or <slug>-academy / <slug>-book patterns first
    m = re.search(r"(aim-[a-z0-9-]+|[a-z0-9]+-(?:academy|ai-book))", stem, re.IGNORECASE)
    if m:
        return m.group(1).lower()
    parts = stem.split("_")
    return (parts[0] if parts and parts[0] else "aim-connect").lower()


def _count_jsonl_user_turns(fpath: str) -> tuple[int, str]:
    """Return (user_turn_count, first_user_title_fallback) for a JSONL transcript with /rewind rollback (#261)."""
    if not os.path.isfile(fpath):
        return 0, ""
    user_entries: list[tuple[int | None, str]] = []
    try:
        with open(fpath, "r", encoding="utf-8", errors="replace") as fh:
            for raw_ln in fh:
                raw_ln_s = raw_ln.strip()
                if not raw_ln_s:
                    continue
                if "step_index" not in raw_ln_s and "USER_INPUT" not in raw_ln_s and '"user"' not in raw_ln_s:
                    continue
                try:
                    obj = json.loads(raw_ln_s)
                except Exception:
                    continue
                raw_step_idx = obj.get("step_index")
                has_int_step = isinstance(raw_step_idx, int) and not isinstance(raw_step_idx, bool)
                if has_int_step:
                    user_entries = [
                        (s_idx, prompt)
                        for s_idx, prompt in user_entries
                        if s_idx is None or s_idx < raw_step_idx
                    ]
                kind = obj.get("type") or obj.get("role") or ""
                if kind in ("USER_INPUT", "user"):
                    c = _unwrap_message_content(obj.get("content") or obj.get("text") or "")
                    if _is_synthetic_system_user_turn(obj, c):
                        continue
                    cleaned = re.sub(r"<[^>]+>", "", str(c)).strip()
                    first_line = next((ln.strip("#> ") for ln in cleaned.splitlines() if ln.strip()), "")
                    user_entries.append((raw_step_idx if has_int_step else None, first_line[:96]))
    except OSError:
        return 0, ""

    max_active_step = _get_agy_active_max_step_index(fpath)
    if max_active_step is not None:
        user_entries = [
            (s_idx, prompt)
            for s_idx, prompt in user_entries
            if s_idx is None or s_idx <= max_active_step
        ]

    first_prompt = next((prompt for _, prompt in user_entries if prompt), "")
    return len(user_entries), first_prompt


def _scan_grok_session_records(seen_paths: set[str]) -> list[dict]:
    """Scan live & historical Grok CLI session directories (~/.grok/sessions and tenant sandboxes) (#301)."""
    records: list[dict] = []
    grok_roots: list[tuple[str, str | None]] = []

    host_grok = os.environ.get("AIM_GROK_HOME", os.path.join(HOME_DIR, ".grok")).strip()
    if host_grok and os.path.isdir(host_grok):
        grok_roots.append((host_grok, None))

    if os.path.isdir(AGENT_WORKSPACES_DIR):
        for entry in sorted(os.listdir(AGENT_WORKSPACES_DIR)):
            if not entry.startswith("agent-"):
                continue
            tenant_grok = os.path.join(AGENT_WORKSPACES_DIR, entry, ".grok")
            if os.path.isdir(tenant_grok):
                grok_roots.append((tenant_grok, entry))

    for grok_root, tenant_session in grok_roots:
        active_ids: set[str] = set()
        active_file = os.path.join(grok_root, "active_sessions.json")
        if os.path.isfile(active_file):
            try:
                active_list = json.loads(open(active_file, "r", encoding="utf-8").read())
                if isinstance(active_list, list):
                    for item in active_list:
                        if isinstance(item, dict) and item.get("session_id"):
                            active_ids.add(str(item["session_id"]))
            except Exception:
                pass

        sessions_dir = os.path.join(grok_root, "sessions")
        if not os.path.isdir(sessions_dir):
            continue

        for chat_path in glob.glob(os.path.join(sessions_dir, "*", "*", "chat_history.jsonl")):
            abs_chat = os.path.abspath(chat_path)
            if abs_chat in seen_paths or not os.path.isfile(abs_chat):
                continue
            seen_paths.add(abs_chat)

            sess_uuid_dir = os.path.dirname(abs_chat)
            sess_uuid = os.path.basename(sess_uuid_dir)
            encoded_cwd_name = os.path.basename(os.path.dirname(sess_uuid_dir))
            decoded_cwd = urllib.parse.unquote(encoded_cwd_name)

            summary_data: dict = {}
            summary_path = os.path.join(sess_uuid_dir, "summary.json")
            if os.path.isfile(summary_path):
                try:
                    summary_data = json.loads(open(summary_path, "r", encoding="utf-8").read())
                except Exception:
                    summary_data = {}

            info_cwd = (
                (summary_data.get("info") or {}).get("cwd")
                if isinstance(summary_data.get("info"), dict)
                else None
            )
            raw_cwd = str(info_cwd or decoded_cwd or "")
            norm_root = _normalize_workspace_root(raw_cwd) if raw_cwd else ""

            if tenant_session:
                sess_name = tenant_session
            else:
                repo_base = os.path.basename(norm_root) if norm_root else "aim-connect"
                sess_name = REVERSE_WORKSPACE_ALIASES.get(repo_base, repo_base) or "aim-connect"

            turn_cnt, first_prompt = _count_jsonl_user_turns(abs_chat)
            if turn_cnt <= 0:
                num_chat = int(summary_data.get("num_chat_messages") or 0)
                if num_chat <= 0:
                    continue
                turn_cnt = max(1, num_chat // 4)

            try:
                mtime = os.path.getmtime(abs_chat)
            except OSError:
                mtime = 0.0

            # Read latest context token estimate from usage.json if available
            tok_display = "Grok JSONL"
            usage_path = os.path.join(sess_uuid_dir, "usage.json")
            if os.path.isfile(usage_path):
                try:
                    usage_obj = json.loads(open(usage_path, "r", encoding="utf-8").read())
                    turns_usage = usage_obj.get("turns") if isinstance(usage_obj, dict) else None
                    if isinstance(turns_usage, list) and turns_usage:
                        last_t = turns_usage[-1]
                        calls = max(1, int(last_t.get("modelCalls") or 1))
                        approx_ctx = int(last_t.get("inputTokens") or 0) // calls
                        if approx_ctx > 0:
                            tok_display = _format_tok_short(approx_ctx, 256_000)
                except Exception:
                    pass

            title = (
                str(summary_data.get("generated_title") or summary_data.get("session_summary") or "").strip()
                or first_prompt
                or f"{sess_name} (Grok session)"
            )
            is_live = sess_uuid in active_ids
            when_str = "ACTIVE NOW" if is_live else (time.strftime("%Y-%m-%d %H:%M", time.localtime(mtime)) if mtime else "Recorded")

            records.append(
                {
                    "id": str(sess_uuid),
                    "session": sess_name,
                    "vessel": "GROK",
                    "title": title,
                    "turns": turn_cnt,
                    "tokens": tok_display,
                    "compaction_count": 0,
                    "seal": "LIVE WORKSPACE" if is_live else "BLACKBOX SEALED",
                    "when": when_str,
                    "mtime_epoch": mtime,
                    "sort_key": f"{mtime:020.6f}",
                    "log_path": abs_chat,
                    "workspace_root": norm_root,
                    "is_live_process": is_live,
                }
            )
    return records


def _scan_opencode_session_records() -> list[dict]:
    """Scan live & persisted OpenCode SQLite sessions (`opencode.db?mode=ro`) across host and tenant sandboxes (#303)."""
    records: list[dict] = []
    oc_dbs: list[tuple[str, str | None]] = []

    host_oc_dir = os.environ.get(
        "AIM_OPENCODE_DATA_DIR",
        os.path.join(HOME_DIR, ".local", "share", "opencode"),
    ).strip()
    host_db = os.path.join(host_oc_dir, "opencode.db") if host_oc_dir else ""
    if host_db and os.path.isfile(host_db):
        oc_dbs.append((os.path.abspath(host_db), None))

    if os.path.isdir(AGENT_WORKSPACES_DIR):
        for entry in sorted(os.listdir(AGENT_WORKSPACES_DIR)):
            if not entry.startswith("agent-"):
                continue
            tenant_db = os.path.join(AGENT_WORKSPACES_DIR, entry, "opencode_data", "opencode.db")
            if os.path.isfile(tenant_db):
                oc_dbs.append((os.path.abspath(tenant_db), entry))

    for abs_db, tenant_session in oc_dbs:
        try:
            conn = sqlite3.connect(f"file:{abs_db}?mode=ro", uri=True, timeout=2.0)
            try:
                sess_rows = conn.execute(
                    """
                    SELECT id, title, directory, time_created, time_updated, tokens_input, tokens_cache_read
                    FROM session
                    WHERE parent_id IS NULL
                    ORDER BY time_updated DESC
                    LIMIT 200
                    """
                ).fetchall()
                if not sess_rows:
                    continue
                sids = [str(r[0]) for r in sess_rows if r[0]]
                placeholders = ",".join("?" for _ in sids)
                msg_rows = conn.execute(
                    f"SELECT session_id, data FROM message WHERE session_id IN ({placeholders})",
                    sids,
                ).fetchall()
            finally:
                conn.close()
        except sqlite3.Error as exc:
            logger.debug(f"OpenCode DB scan skipped for {abs_db}: {exc}")
            continue

        user_counts: dict[str, int] = {}
        for sid_val, raw_data in msg_rows:
            if not raw_data:
                continue
            if '"role":"user"' in raw_data or '"role": "user"' in raw_data:
                user_counts[str(sid_val)] = user_counts.get(str(sid_val), 0) + 1

        for sid, title, directory, time_created, time_updated, tok_in, tok_cache in sess_rows:
            if not sid:
                continue
            sid_str = str(sid)
            u_cnt = user_counts.get(sid_str, 0)
            if u_cnt <= 0:
                continue

            raw_dir = str(directory or "")
            norm_root = _normalize_workspace_root(raw_dir) if raw_dir else ""
            if tenant_session:
                sess_name = tenant_session
            else:
                repo_base = os.path.basename(norm_root) if norm_root else "aim-connect"
                sess_name = REVERSE_WORKSPACE_ALIASES.get(repo_base, repo_base) or "aim-connect"

            ts_raw = float(time_updated or time_created or 0)
            mtime = ts_raw / 1000.0 if ts_raw > 1e11 else ts_raw
            when_str = time.strftime("%Y-%m-%d %H:%M", time.localtime(mtime)) if mtime > 0 else "Recorded"

            approx_tok = int(tok_in or 0) + int(tok_cache or 0)
            tok_display = _format_tok_short(approx_tok, 200_000) if approx_tok > 0 else "OpenCode DB"
            clean_title = str(title or "").strip() or f"{sess_name} (OpenCode session)"

            records.append(
                {
                    "id": sid_str,
                    "session": sess_name,
                    "vessel": "OC",
                    "title": clean_title,
                    "turns": u_cnt,
                    "tokens": tok_display,
                    "compaction_count": 0,
                    "seal": "BLACKBOX SEALED",
                    "when": when_str,
                    "mtime_epoch": mtime,
                    "sort_key": f"{mtime:020.6f}",
                    "log_path": f"{OPENCODE_URI_PREFIX}{abs_db}#{sid_str}",
                    "workspace_root": norm_root,
                    "is_live_process": False,
                }
            )
    return records


def _collect_project_history_records() -> list[dict]:
    """Index multi-generation session history across AGY conversation_summaries.db, Grok ~/.grok/sessions, and vault JSONL (#257, #301)."""
    raw_records: list[dict] = []
    seen_paths: set[str] = set()

    agy_base = os.environ.get(
        "AIM_AGY_APP_DATA_DIR",
        os.path.join(HOME_DIR, ".gemini", "antigravity-cli"),
    )
    db_path = os.path.join(agy_base, "conversation_summaries.db")
    if os.path.isfile(db_path):
        try:
            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=2.0)
            try:
                rows = conn.execute(
                    """
                    SELECT conversation_id, title, preview, step_count, last_modified_time, workspace_uris, status
                    FROM conversation_summaries
                    WHERE nesting_depth = 0
                    ORDER BY last_modified_time DESC
                    LIMIT 250
                    """
                ).fetchall()
            finally:
                conn.close()

            for cid, title, preview, step_count, last_mod, raw_uris, status_str in rows:
                if not cid:
                    continue
                try:
                    uris = json.loads(raw_uris) if isinstance(raw_uris, str) else []
                except Exception:
                    uris = []
                norm_root = ""
                if isinstance(uris, list) and uris:
                    norm_root = _normalize_workspace_root(str(uris[0]))
                repo_base = os.path.basename(norm_root) if norm_root else "aim-connect"
                sess_name = REVERSE_WORKSPACE_ALIASES.get(repo_base, repo_base) or "aim-connect"

                tx_path = os.path.join(
                    agy_base, "brain", str(cid), ".system_generated", "logs", "transcript.jsonl"
                )
                seen_paths.add(os.path.abspath(tx_path))
                tok_in, comp_cnt = _read_transcript_telemetry(tx_path)
                turn_cnt, first_prompt = _count_jsonl_user_turns(tx_path)
                if turn_cnt <= 0:
                    turn_cnt = max(1, int(step_count or 2) // 2)

                try:
                    sort_ts = os.path.getmtime(tx_path) if os.path.isfile(tx_path) else 0.0
                except OSError:
                    sort_ts = 0.0
                if not sort_ts and last_mod:
                    sort_ts = 1.0

                clean_title = (title or preview or first_prompt or f"{sess_name} session").strip()
                is_running = "RUNNING" in str(status_str or "").upper()
                seal = (
                    "LIVE WORKSPACE"
                    if is_running
                    else ("POST-CLIFF RECOVERY" if comp_cnt > 0 else "BLACKBOX SEALED")
                )
                when_str = str(last_mod or "")[:19].replace("T", " ") or "Recorded"

                raw_records.append(
                    {
                        "id": str(cid),
                        "session": sess_name,
                        "vessel": "AGY",
                        "title": clean_title,
                        "turns": turn_cnt,
                        "tokens": _format_tok_short(tok_in, 1_000_000),
                        "compaction_count": comp_cnt,
                        "seal": seal,
                        "when": "ACTIVE NOW" if is_running else when_str,
                        "mtime_epoch": sort_ts,
                        "sort_key": f"{sort_ts:020.6f}" if sort_ts > 1.0 else str(last_mod or ""),
                        "log_path": tx_path,
                        "workspace_root": norm_root,
                        "is_live_process": is_running,
                    }
                )
        except Exception as exc:
            logger.debug(f"History DB scan skipped: {exc}")

    # Scan live & persisted Grok CLI and OpenCode SQLite sessions (#301, #303)
    raw_records.extend(_scan_grok_session_records(seen_paths))
    raw_records.extend(_scan_opencode_session_records())

    # Scan additional vault / forensics JSONL transcripts (Grok, OpenCode, Codex, sealed vaults)
    vault_dirs = []
    custom_dir = os.environ.get("AIM_FORENSICS_DIR", "").strip()
    if custom_dir and os.path.isdir(custom_dir):
        vault_dirs.append(custom_dir)
    else:
        for default_v in (
            os.path.join(HOME_DIR, ".aim", "vault"),
            os.path.join(AIM_CONNECT_ROOT, "joshua_os", "vault"),
        ):
            if os.path.isdir(default_v):
                vault_dirs.append(default_v)

    for vdir in vault_dirs:
        for fpath in glob.glob(os.path.join(vdir, "**", "*.jsonl"), recursive=True):
            abs_p = os.path.abspath(fpath)
            if abs_p in seen_paths or not os.path.isfile(abs_p):
                continue
            seen_paths.add(abs_p)
            vessel = _infer_vessel_from_filename(abs_p)
            sess_name = _infer_session_from_vault_file(abs_p)
            turn_cnt, first_prompt = _count_jsonl_user_turns(abs_p)
            try:
                mtime = os.path.getmtime(abs_p)
            except OSError:
                mtime = 0.0
            rec_id = os.path.splitext(os.path.basename(abs_p))[0]
            when_str = time.strftime("%Y-%m-%d %H:%M", time.localtime(mtime)) if mtime else "Sealed"
            raw_records.append(
                {
                    "id": rec_id,
                    "session": sess_name,
                    "vessel": vessel,
                    "title": first_prompt or f"{sess_name} ({vessel} Baton Transcript)",
                    "turns": max(1, turn_cnt),
                    "tokens": "Sealed JSONL",
                    "compaction_count": 0,
                    "seal": "BLACKBOX SEALED",
                    "when": when_str,
                    "mtime_epoch": mtime,
                    "sort_key": f"{mtime:020.6f}",
                    "log_path": abs_p,
                    "workspace_root": "",
                    "is_live_process": False,
                }
            )

    # Group by project/session to assign chronological GEN #01..GEN #NN and is_current
    by_proj: dict[str, list[dict]] = {}
    for rec in raw_records:
        by_proj.setdefault(rec["session"], []).append(rec)

    enriched: list[dict] = []
    for sess_name, items in by_proj.items():
        # Sort oldest -> newest by true epoch mtime across vessels (#301)
        items.sort(key=lambda r: (float(r.get("mtime_epoch") or 0.0), r["sort_key"], r["id"]))
        total_gen = len(items)
        for idx, item in enumerate(items):
            gen_num = idx + 1
            item["gen"] = f"GEN #{gen_num:02d}"
            item["is_current"] = gen_num == total_gen
            if item["is_current"] and item["seal"] != "POST-CLIFF RECOVERY":
                item["seal"] = "LIVE WORKSPACE"
            enriched.append(item)

    # Return newest-first within any list
    enriched.sort(key=lambda r: (float(r.get("mtime_epoch") or 0.0), r["sort_key"], r["gen"]), reverse=True)
    return enriched


@router.get("/api/sessions/history", dependencies=[Depends(verify_token), Depends(require_admin)])
def list_session_history(session: str = Query("")):
    """Return multi-generation project session notebook & baton-pass history (#257)."""
    all_records = _collect_project_history_records()
    counts_by_project: dict[str, int] = {}
    for rec in all_records:
        counts_by_project[rec["session"]] = counts_by_project.get(rec["session"], 0) + 1

    filtered = (
        [r for r in all_records if r["session"] == session]
        if session
        else all_records
    )
    return {
        "session": session,
        "total": len(all_records),
        "counts_by_project": counts_by_project,
        "records": filtered,
    }


@router.get("/api/sessions/history/{record_id}/turns", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_history_record_turns(record_id: str):
    """Return paired Operator + J.O.S.H.U.A. turns for any historical generation (#257)."""
    all_records = _collect_project_history_records()
    matched = next((r for r in all_records if r["id"] == record_id), None)
    if not matched:
        raise HTTPException(status_code=404, detail="History record not found.")

    raw_steps = parse_transcript_source(matched["log_path"], max_turns=600)
    paired_turns: list[dict] = []
    pending_op: dict | None = None

    for step in raw_steps:
        if step["role"] == "user":
            if pending_op is not None:
                paired_turns.append(
                    {
                        "idx": len(paired_turns) + 1,
                        "stamp": str(pending_op.get("created_at") or "")[11:19] or f"STEP {pending_op['step_index']}",
                        "operator": pending_op.get("content") or "",
                        "tool": "",
                        "agent": "(Awaiting assistant response / baton handoff)",
                    }
                )
            pending_op = step
        else:
            tools = step.get("tool_calls") or []
            tool_summary = " · ".join(
                f"{tc['name']}({str(tc.get('args') or '')[:80]})" for tc in tools[:4]
            )
            if pending_op is not None:
                paired_turns.append(
                    {
                        "idx": len(paired_turns) + 1,
                        "stamp": str(step.get("created_at") or pending_op.get("created_at") or "")[11:19]
                        or f"STEP {step['step_index']}",
                        "operator": pending_op.get("content") or "",
                        "tool": tool_summary,
                        "agent": step.get("content") or step.get("thinking") or "(Tool step executed)",
                    }
                )
                pending_op = None
            elif paired_turns:
                # Merge consecutive multi-step planner tool turns onto active exchange
                prev = paired_turns[-1]
                if tool_summary:
                    prev["tool"] = f"{prev['tool']} · {tool_summary}".strip(" ·")
                if step.get("content"):
                    prev["agent"] = step["content"]
            else:
                paired_turns.append(
                    {
                        "idx": 1,
                        "stamp": str(step.get("created_at") or "")[11:19] or "INIT",
                        "operator": "(Session attach)",
                        "tool": tool_summary,
                        "agent": step.get("content") or "(Initialized)",
                    }
                )

    if pending_op is not None:
        paired_turns.append(
            {
                "idx": len(paired_turns) + 1,
                "stamp": str(pending_op.get("created_at") or "")[11:19] or "LIVE",
                "operator": pending_op.get("content") or "",
                "tool": "",
                "agent": "(Turn in progress)",
            }
        )

    return {
        "record": matched,
        "turn_count": len(paired_turns),
        "turns": paired_turns,
    }


USER_REQUEST_BLOCK_RE = re.compile(r"<USER_REQUEST>\s*(.*?)\s*</USER_REQUEST>", re.DOTALL | re.IGNORECASE)
USER_QUERY_BLOCK_RE = re.compile(r"<user_query>\s*(.*?)\s*</user_query>", re.DOTALL | re.IGNORECASE)
STRIP_META_BLOCKS_RE = re.compile(
    r"<(?:CONTEXT_SUMMARY|ADDITIONAL_METADATA|SYSTEM_MESSAGE|user_info|system-reminder|workspace_info)>.*?</(?:CONTEXT_SUMMARY|ADDITIONAL_METADATA|SYSTEM_MESSAGE|user_info|system-reminder|workspace_info)>",
    re.DOTALL | re.IGNORECASE,
)


def _clean_user_prompt_for_chat(raw_text: str) -> str:
    """Extract clean human Operator text from AGY/Grok transcript prompts, stripping XML envelopes (#260, #301)."""
    text = str(raw_text or "").strip()
    if not text:
        return ""
    m_req = USER_REQUEST_BLOCK_RE.search(text)
    if m_req:
        return m_req.group(1).strip()
    m_query = USER_QUERY_BLOCK_RE.search(text)
    if m_query:
        return m_query.group(1).strip()
    cleaned = STRIP_META_BLOCKS_RE.sub("", text).strip()
    if not cleaned:
        return ""
    cleaned = re.sub(r"</?[A-Z_]{3,}>", "", cleaned).strip()
    return cleaned


def _split_agent_body_and_spoken(raw_content: str) -> tuple[str, str]:
    """Separate main assistant text from trailing 🔊 spoken summary for structured Chat cards (#260)."""
    text = str(raw_content or "").strip()
    if not text:
        return "", ""
    spoken = extract_spoken_summary(text, fallback=False)
    lines = text.splitlines()
    body_lines: list[str] = []
    for ln in lines:
        if ln.strip().startswith("🔊"):
            break
        body_lines.append(ln)
    body = "\n".join(body_lines).strip()
    return body, spoken


def _format_concise_tool_pill(tc: dict) -> str:
    name = str(tc.get("name") or "tool").strip()
    raw_args = str(tc.get("args") or "").strip()
    detail = raw_args
    try:
        parsed = json.loads(raw_args)
        if isinstance(parsed, dict):
            for key in (
                "CommandLine",
                "command",
                "Path",
                "filePath",
                "target_file",
                "file_path",
                "query",
                "pattern",
                "path",
                "toolSummary",
                "url",
                "Target",
            ):
                if parsed.get(key):
                    detail = str(parsed[key])
                    break
    except Exception:
        pass
    detail = re.sub(r"\s+", " ", detail).strip()
    if len(detail) > 92:
        if "/" in detail and " " not in detail:
            detail = "..." + detail[-88:]
        else:
            detail = detail[:89] + "..."
    return f"{name}({detail})" if detail else name


def _detect_active_session_pane_hint(session_name: str) -> tuple[str | None, str]:
    """Return (preferred_vessel_or_None, normalized_pane_cwd) from the live tmux pane (#301)."""
    try:
        res = subprocess.run(
            ["tmux", "list-panes", "-t", session_name, "-F", "#{pane_active}\t#{pane_current_command}\t#{pane_current_path}"],
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        return None, ""
    if res.returncode != 0:
        return None, ""

    chosen_cmd = ""
    chosen_cwd = ""
    for ln in res.stdout.splitlines():
        parts = ln.split("\t")
        if len(parts) != 3:
            continue
        is_act, cmd, cwd = parts
        if is_act == "1" or not chosen_cmd:
            chosen_cmd = cmd.strip().lower()
            chosen_cwd = _normalize_workspace_root(cwd.strip()) if cwd.strip() else ""
            if is_act == "1":
                break

    if "grok" in chosen_cmd:
        return "GROK", chosen_cwd
    if "opencode" in chosen_cmd:
        return "OC", chosen_cwd
    if "codex" in chosen_cmd:
        return "CDX", chosen_cwd
    if "agy" in chosen_cmd or "antigravity" in chosen_cmd:
        return "AGY", chosen_cwd
    return None, chosen_cwd


@router.get("/api/sessions/{session_name}/live-turns", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_session_live_turns(session_name: str, limit: int = Query(24)):
    """Return structured live Operator + J.O.S.H.U.A. chat turns for the active session (#260, #301)."""
    if not SESSION_NAME_RE.match(session_name):
        raise HTTPException(status_code=400, detail="Invalid session name.")

    clamped_limit = max(1, min(80, int(limit)))
    all_records = _collect_project_history_records()
    preferred_vessel, active_cwd = _detect_active_session_pane_hint(session_name)

    session_candidates = [
        r
        for r in all_records
        if r["session"] == session_name
        or (active_cwd and r.get("workspace_root") and r.get("workspace_root") == active_cwd)
    ]

    matched_rec = None
    if preferred_vessel:
        matched_rec = next((r for r in session_candidates if r["vessel"] == preferred_vessel), None)
    if matched_rec is None:
        matched_rec = session_candidates[0] if session_candidates else None

    log_path = matched_rec["log_path"] if matched_rec else ""
    vessel = matched_rec["vessel"] if matched_rec else (preferred_vessel or "AGY")

    if not log_path and session_name.startswith("agent-") and os.path.isdir(AGENT_WORKSPACES_DIR):
        parts = session_name.split("-")
        tenant_key = "-".join(parts[:2]) if len(parts) >= 2 else session_name
        brain_glob = os.path.join(
            AGENT_WORKSPACES_DIR, tenant_key, "brain", "*", ".system_generated", "logs", "transcript.jsonl"
        )
        cands = [p for p in glob.glob(brain_glob) if os.path.isfile(p)]
        if cands:
            cands.sort(key=lambda p: os.path.getmtime(p), reverse=True)
            log_path = cands[0]

    paired: list[dict] = []
    source_label = log_path

    if log_path and _has_transcript_source(log_path):
        raw_steps = parse_transcript_source(log_path, max_turns=240)
        pending_user: dict | None = None
        for step in raw_steps:
            if step["role"] == "user":
                clean_u = _clean_user_prompt_for_chat(step.get("content") or "")
                if not clean_u:
                    continue
                if pending_user is not None:
                    paired.append(
                        {
                            "idx": len(paired) + 1,
                            "stamp": str(pending_user.get("created_at") or "")[11:19] or "LIVE",
                            "user": pending_user["clean_user"],
                            "tools": [],
                            "body": "",
                            "spoken": "",
                        }
                    )
                pending_user = {**step, "clean_user": clean_u}
            else:
                tools = [_format_concise_tool_pill(tc) for tc in (step.get("tool_calls") or [])[:8]]
                body, spoken = _split_agent_body_and_spoken(step.get("content") or "")
                if pending_user is not None:
                    paired.append(
                        {
                            "idx": len(paired) + 1,
                            "stamp": str(step.get("created_at") or pending_user.get("created_at") or "")[11:19] or "LIVE",
                            "user": pending_user["clean_user"],
                            "tools": tools,
                            "body": body,
                            "spoken": spoken,
                        }
                    )
                    pending_user = None
                elif paired:
                    prev = paired[-1]
                    for t_pill in tools:
                        if t_pill not in prev["tools"]:
                            prev["tools"].append(t_pill)
                            if len(prev["tools"]) > 16:
                                prev["tools"] = prev["tools"][-16:]
                    if body:
                        if vessel in ("GROK", "OC") and prev["body"] and body not in prev["body"]:
                            prev["body"] = f"{prev['body']}\n\n{body}"[:MAX_TRANSCRIPT_TURN_CHARS]
                        else:
                            prev["body"] = body
                    if spoken:
                        prev["spoken"] = spoken
                elif body or spoken or tools:
                    paired.append(
                        {
                            "idx": 1,
                            "stamp": str(step.get("created_at") or "")[11:19] or "INIT",
                            "user": "(Session attached)",
                            "tools": tools,
                            "body": body,
                            "spoken": spoken,
                        }
                    )
        if pending_user is not None:
            paired.append(
                {
                    "idx": len(paired) + 1,
                    "stamp": str(pending_user.get("created_at") or "")[11:19] or "LIVE",
                    "user": pending_user["clean_user"],
                    "tools": [],
                    "body": "",
                    "spoken": "",
                }
            )

    # Fallback to live tmux scrollback only when no structured transcript source exists (#260, #261, #303)
    if not paired and not _has_transcript_source(log_path):
        cap = subprocess.run(
            ["tmux", "capture-pane", "-t", session_name, "-S", "-400", "-p"],
            capture_output=True,
            text=True,
        )
        if cap.returncode == 0 and cap.stdout.strip():
            source_label = f"tmux:{session_name}"
            blocks = parse_scrollback_tool_blocks(cap.stdout)
            spoken_fb = extract_spoken_summary(cap.stdout, fallback=False)
            for idx, blk in enumerate(blocks, start=1):
                body, sp = _split_agent_body_and_spoken(blk.get("content") or "")
                paired.append(
                    {
                        "idx": idx,
                        "stamp": "TMUX LIVE",
                        "user": f"Active terminal stream ({session_name})",
                        "tools": [_format_concise_tool_pill(tc) for tc in (blk.get("tool_calls") or [])[:8]],
                        "body": body,
                        "spoken": sp or spoken_fb,
                    }
                )

    sliced = paired[-clamped_limit:]
    return {
        "session": session_name,
        "vessel": vessel,
        "source": source_label,
        "turn_count": len(sliced),
        "turns": sliced,
    }


_BUILTIN_SLASH_COMMANDS: dict[str, list[dict[str, str]]] = {
    "agy": [
        {"cmd": "/new", "description": "Start a fresh conversation"},
        {"cmd": "/compact", "description": "Compact conversation context"},
        {"cmd": "/context", "description": "Inspect active context window usage"},
        {"cmd": "/model", "description": "Switch active Gemini model"},
        {"cmd": "/resume", "description": "Resume an earlier conversation"},
        {"cmd": "/rewind", "description": "Rewind recent turns"},
        {"cmd": "/browser", "description": "Invoke browser automation"},
        {"cmd": "/skills", "description": "List available skills"},
        {"cmd": "/goal", "description": "Run thorough goal-driven loop"},
        {"cmd": "/plan", "description": "Create step-by-step plan"},
        {"cmd": "/teamwork", "description": "Coordinate multi-agent swarm"},
        {"cmd": "/grill-me", "description": "Interactive design interview"},
        {"cmd": "/learn", "description": "Persist lesson or rule"},
        {"cmd": "/boost", "description": "Deep reasoning & verification mode"},
        {"cmd": "/schedule", "description": "Schedule timer or recurring job"},
        {"cmd": "/clear", "description": "Clear screen & reset view"},
        {"cmd": "/help", "description": "Show CLI slash command help"},
    ],
    "grok": [
        {"cmd": "/new", "description": "Start a fresh Grok conversation"},
        {"cmd": "/clear", "description": "Clear screen & reset conversation"},
        {"cmd": "/compact", "description": "Compact conversation history"},
        {"cmd": "/context", "description": "Show context window telemetry"},
        {"cmd": "/model", "description": "Switch active Grok model"},
        {"cmd": "/help", "description": "Show Grok CLI commands"},
    ],
    "opencode": [
        {"cmd": "/new", "description": "Start a new OpenCode session"},
        {"cmd": "/compact", "description": "Summarize and compact session"},
        {"cmd": "/models", "description": "Switch provider/model"},
        {"cmd": "/sessions", "description": "Browse OpenCode sessions"},
        {"cmd": "/undo", "description": "Undo last edit/turn"},
        {"cmd": "/redo", "description": "Redo undone edit/turn"},
        {"cmd": "/review", "description": "Review workspace changes"},
        {"cmd": "/init", "description": "Initialize project AGENTS.md"},
        {"cmd": "/themes", "description": "Switch OpenCode UI theme"},
        {"cmd": "/help", "description": "Show OpenCode commands"},
    ],
    "codex": [
        {"cmd": "/new", "description": "Start a new Codex session"},
        {"cmd": "/compact", "description": "Compact context"},
        {"cmd": "/model", "description": "Switch model"},
        {"cmd": "/review", "description": "Review git diff"},
        {"cmd": "/status", "description": "Inspect session status"},
        {"cmd": "/clear", "description": "Clear conversation"},
    ],
}


def _detect_session_vessel(session_name: str, explicit_vessel: str = "") -> str:
    clean_v = (explicit_vessel or "").strip().lower()
    if clean_v == "oc":
        return "opencode"
    if clean_v == "cdx":
        return "codex"
    if clean_v in _BUILTIN_SLASH_COMMANDS:
        return clean_v
    try:
        panes = subprocess.run(
            ["tmux", "list-panes", "-t", session_name, "-F", "#{pane_active}\t#{pane_current_command}"],
            capture_output=True,
            text=True,
            timeout=2.0,
        )
        pane_cmd = ""
        if panes.returncode == 0 and panes.stdout.strip():
            for ln in panes.stdout.splitlines():
                parts = ln.split("\t", 1)
                if len(parts) == 2:
                    if parts[0] == "1" or not pane_cmd:
                        pane_cmd = parts[1].strip()
                        if parts[0] == "1":
                            break
                elif not pane_cmd:
                    pane_cmd = ln.strip()
        cap = subprocess.run(
            ["tmux", "capture-pane", "-t", session_name, "-S", "-40", "-p"],
            capture_output=True,
            text=True,
            timeout=2.0,
        )
        parsed = parse_pane_telemetry(cap.stdout or "", command=pane_cmd, session_name=session_name)
        detected = (parsed.get("vessel") or "").lower()
        if detected in _BUILTIN_SLASH_COMMANDS:
            return detected
    except Exception:
        pass
    return "agy"


def _skill_dirs_for_vessel(vessel: str, cwd_path: str = "") -> list[str]:
    dirs: list[str] = []
    v = (vessel or "agy").lower()
    if v == "oc":
        v = "opencode"
    elif v == "cdx":
        v = "codex"

    repo_rels_by_vessel = {
        "opencode": (".opencode/skills", ".agents/skills"),
        "grok": (".grok/skills", ".agents/skills"),
        "codex": (".codex/skills", ".agents/skills"),
        "agy": (".gemini/skills", ".agents/skills"),
    }
    if cwd_path and os.path.isdir(cwd_path):
        for rel in repo_rels_by_vessel.get(v, (".gemini/skills", ".agents/skills")):
            cand = os.path.join(cwd_path, rel)
            if os.path.isdir(cand):
                dirs.append(cand)

    if v == "grok":
        dirs.append(os.path.join(HOME_DIR, ".grok", "skills"))
        dirs.append(os.path.join(HOME_DIR, ".agents", "skills"))
    elif v == "opencode":
        dirs.append(os.path.join(HOME_DIR, ".config", "opencode", "skills"))
        dirs.append(os.path.join(HOME_DIR, ".opencode", "skills"))
        dirs.append(os.path.join(HOME_DIR, ".agents", "skills"))
    elif v == "codex":
        dirs.append(os.path.join(HOME_DIR, ".codex", "skills"))
        dirs.append(os.path.join(HOME_DIR, ".agents", "skills"))
    else:
        dirs.append(os.path.join(HOME_DIR, ".gemini", "antigravity-cli", "skills"))
        dirs.append(os.path.join(HOME_DIR, ".gemini", "skills"))
        dirs.append(os.path.join(HOME_DIR, ".gemini", "antigravity-cli", "builtin", "skills"))
        dirs.append(os.path.join(HOME_DIR, ".agents", "skills"))

    deduped: list[str] = []
    for d in dirs:
        if os.path.isdir(d) and d not in deduped:
            deduped.append(d)
    return deduped


def _parse_skill_frontmatter(skill_md_path: str, fallback_name: str) -> tuple[str, str]:
    name = fallback_name
    desc = ""
    try:
        with open(skill_md_path, "r", encoding="utf-8", errors="ignore") as fh:
            head = fh.read(2048)
    except OSError:
        return name, desc

    lines = head.splitlines()
    if not lines or lines[0].strip() != "---":
        return name, desc

    fm_lines: list[str] = []
    for ln in lines[1:]:
        if ln.strip() == "---":
            break
        fm_lines.append(ln)

    in_desc_block = False
    desc_parts: list[str] = []
    for ln in fm_lines:
        stripped = ln.strip()
        if in_desc_block:
            if ln.startswith((" ", "\t")) and stripped:
                desc_parts.append(stripped)
                continue
            in_desc_block = False
        if ln.lower().startswith("name:"):
            val = ln.split(":", 1)[1].strip().strip("'\"")
            if val:
                name = val
        elif ln.lower().startswith("description:"):
            val = ln.split(":", 1)[1].strip()
            if val in (">", "|", ">-", "|-"):
                in_desc_block = True
            else:
                desc = val.strip("'\"")
    if desc_parts:
        desc = " ".join(desc_parts)
    desc = re.sub(r"\s+", " ", desc).strip()
    if len(desc) > 140:
        desc = desc[:137] + "..."
    return name, desc


@router.get("/api/sessions/{session_name}/slash-commands", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_session_slash_commands(session_name: str, vessel: str = Query("")):
    """Return built-in slash commands and installed SKILL.md commands for the active session harness (#287)."""
    if not SESSION_NAME_RE.match(session_name):
        raise HTTPException(status_code=400, detail="Invalid session name.")

    resolved_vessel = _detect_session_vessel(session_name, explicit_vessel=vessel)
    cwd_path = ""
    try:
        cwd_path = _resolve_session_cwd(session=session_name)
    except Exception:
        cwd_path = ""

    commands: list[dict[str, str]] = []
    seen_cmds: set[str] = set()

    for b in _BUILTIN_SLASH_COMMANDS.get(resolved_vessel, _BUILTIN_SLASH_COMMANDS["agy"]):
        cmd_str = b["cmd"]
        key = cmd_str.lower()
        if key in seen_cmds:
            continue
        seen_cmds.add(key)
        commands.append(
            {
                "cmd": cmd_str,
                "kind": "builtin",
                "description": b.get("description", ""),
                "source": resolved_vessel,
            }
        )

    skill_entries: list[dict[str, str]] = []
    for skill_root in _skill_dirs_for_vessel(resolved_vessel, cwd_path):
        try:
            entries = sorted(os.scandir(skill_root), key=lambda e: e.name.lower())
        except OSError:
            continue
        for entry in entries:
            if not entry.is_dir(follow_symlinks=True):
                continue
            skill_md = os.path.join(entry.path, "SKILL.md")
            if not os.path.isfile(skill_md):
                continue
            skill_name, desc = _parse_skill_frontmatter(skill_md, entry.name)
            cmd_str = f"/{skill_name.lstrip('/')}"
            key = cmd_str.lower()
            if key in seen_cmds:
                continue
            seen_cmds.add(key)
            skill_entries.append(
                {
                    "cmd": cmd_str,
                    "kind": "skill",
                    "description": desc or "Custom skill",
                    "source": os.path.basename(skill_root),
                }
            )

    commands.extend(sorted(skill_entries, key=lambda x: x["cmd"].lower()))
    return {
        "session": session_name,
        "vessel": resolved_vessel,
        "commands": commands,
    }

