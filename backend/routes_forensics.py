import glob
import json
import logging
import os
import re
import sqlite3
import subprocess
import time
from fastapi import APIRouter, Depends, HTTPException, Query
from main import AIM_CONNECT_ROOT, HOME_DIR, require_admin, verify_token
from routes_files import _find_repo_roots, _resolve_session_cwd, secure_path
from routes_sessions import ANSI_ESCAPE_RE

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


def parse_jsonl_transcript(file_path: str, max_turns: int = 80) -> list[dict]:
    """Parse an AGY/Grok JSONL transcript into structured turns with expandable tool_calls (#212)."""
    turns: list[dict] = []
    if not os.path.isfile(file_path):
        return turns

    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
    except OSError:
        return turns

    for raw_line in lines[-400:]:
        raw_line = raw_line.strip()
        if not raw_line:
            continue
        try:
            obj = json.loads(raw_line)
        except json.JSONDecodeError:
            continue

        step_type = obj.get("type") or obj.get("role") or ""
        if step_type in ("USER_INPUT", "user"):
            content = obj.get("content") or obj.get("text") or ""
            if isinstance(content, list):
                content = "\n".join(str(x) for x in content)
            turns.append({
                "step_index": obj.get("step_index", len(turns)),
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
                    "step_index": obj.get("step_index", len(turns)),
                    "role": "assistant",
                    "created_at": obj.get("created_at", ""),
                    "content": str(content)[:4000],
                    "thinking": str(thinking)[:2000],
                    "tool_calls": parsed_tools,
                })

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


@router.get("/api/swarm/activity", dependencies=[Depends(verify_token), Depends(require_admin)])
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
