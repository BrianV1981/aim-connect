import glob
import json
import logging
import os
import re
import sqlite3
import subprocess
import time
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


def parse_jsonl_transcript(file_path: str, max_turns: int = 80) -> list[dict]:
    """Parse an AGY/Grok JSONL transcript into structured turns with /rewind rollback (#212, #261)."""
    turns: list[dict] = []
    if not os.path.isfile(file_path):
        return turns

    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
    except OSError:
        return turns

    window_size = max(800, max_turns * 12)
    for raw_line in lines[-window_size:]:
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

        step_type = obj.get("type") or obj.get("role") or ""
        if step_type in ("USER_INPUT", "user"):
            content = obj.get("content") or obj.get("text") or ""
            if isinstance(content, list):
                content = "\n".join(str(x) for x in content)
            turns.append({
                "step_index": raw_step_idx if has_int_step else len(turns),
                "_has_step_index": has_int_step,
                "role": "user",
                "created_at": obj.get("created_at", ""),
                "content": str(content)[:4000],
                "thinking": "",
                "tool_calls": [],
            })
        elif step_type in ("PLANNER_RESPONSE", "assistant", "model"):
            content = obj.get("content") or obj.get("text") or ""
            thinking = obj.get("thinking") or ""
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
                    "created_at": obj.get("created_at", ""),
                    "content": str(content)[:4000],
                    "thinking": str(thinking)[:2000],
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
    """Lazy-loaded on-demand Turn & Tool-Call Inspector for a session (#212)."""
    pane_cwd = _resolve_session_cwd(session=session_name)
    _, main_repo_root = _find_repo_roots(pane_cwd)

    chosen_source = ""
    turns: list[dict] = []

    # 1. Check candidate JSONL transcripts referencing this repo/session or most recent
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
                    c = obj.get("content") or obj.get("text") or ""
                    if isinstance(c, list):
                        c = " ".join(str(x) for x in c)
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


def _collect_project_history_records() -> list[dict]:
    """Index multi-generation session history across AGY conversation_summaries.db and vault JSONL/MD (#257)."""
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
                        "sort_key": str(last_mod or "") or f"{sort_ts:020.6f}",
                        "log_path": tx_path,
                    }
                )
        except Exception as exc:
            logger.debug(f"History DB scan skipped: {exc}")

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
                    "sort_key": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(mtime)) if mtime else "",
                    "log_path": abs_p,
                }
            )

    # Group by project/session to assign chronological GEN #01..GEN #NN and is_current
    by_proj: dict[str, list[dict]] = {}
    for rec in raw_records:
        by_proj.setdefault(rec["session"], []).append(rec)

    enriched: list[dict] = []
    for sess_name, items in by_proj.items():
        # Sort oldest -> newest to number GEN #01 .. GEN #NN
        items.sort(key=lambda r: (r["sort_key"], r["id"]))
        total_gen = len(items)
        for idx, item in enumerate(items):
            gen_num = idx + 1
            item["gen"] = f"GEN #{gen_num:02d}"
            item["is_current"] = gen_num == total_gen
            if item["is_current"] and item["seal"] != "POST-CLIFF RECOVERY":
                item["seal"] = "LIVE WORKSPACE"
            enriched.append(item)

    # Return newest-first within any list
    enriched.sort(key=lambda r: (r["sort_key"], r["gen"]), reverse=True)
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

    raw_steps = parse_jsonl_transcript(matched["log_path"], max_turns=600)
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
STRIP_META_BLOCKS_RE = re.compile(
    r"<(?:CONTEXT_SUMMARY|ADDITIONAL_METADATA|SYSTEM_MESSAGE)>.*?</(?:CONTEXT_SUMMARY|ADDITIONAL_METADATA|SYSTEM_MESSAGE)>",
    re.DOTALL | re.IGNORECASE,
)


def _clean_user_prompt_for_chat(raw_text: str) -> str:
    """Extract clean human Operator text from AGY/Grok transcript prompts, stripping XML envelopes (#260)."""
    text = str(raw_text or "").strip()
    if not text:
        return ""
    m_req = USER_REQUEST_BLOCK_RE.search(text)
    if m_req:
        return m_req.group(1).strip()
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
            for key in ("CommandLine", "Path", "query", "toolSummary", "url", "Target"):
                if parsed.get(key):
                    detail = str(parsed[key])
                    break
    except Exception:
        pass
    detail = re.sub(r"\s+", " ", detail).strip()
    if len(detail) > 92:
        detail = detail[:89] + "..."
    return f"{name}({detail})" if detail else name


@router.get("/api/sessions/{session_name}/live-turns", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_session_live_turns(session_name: str, limit: int = Query(24)):
    """Return structured live Operator + J.O.S.H.U.A. chat turns for the active session (#260)."""
    if not SESSION_NAME_RE.match(session_name):
        raise HTTPException(status_code=400, detail="Invalid session name.")

    clamped_limit = max(1, min(80, int(limit)))
    all_records = _collect_project_history_records()
    matched_rec = next((r for r in all_records if r["session"] == session_name), None)

    log_path = matched_rec["log_path"] if matched_rec else ""
    vessel = matched_rec["vessel"] if matched_rec else "AGY"

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

    if log_path and os.path.isfile(log_path):
        raw_steps = parse_jsonl_transcript(log_path, max_turns=240)
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
                        if t_pill not in prev["tools"] and len(prev["tools"]) < 12:
                            prev["tools"].append(t_pill)
                    if body:
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

    # Fallback to live tmux scrollback only when no structured JSONL transcript file exists (#260, #261)
    if not paired and not (log_path and os.path.isfile(log_path)):
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

