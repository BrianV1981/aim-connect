"""Exact per-pane agent session capture & resume for tmux workspace SAVE/RESTORE (#313).

Stdlib-only on purpose: imported both by the FastAPI backend and by
``scripts/aim_pane_resume.py`` (which tmux-resurrect runs inside each restored pane).

Flow:
  SAVE    -> capture_pane_sessions(): for every tmux pane running an agent CLI, resolve the
             exact conversation/session ID it is using and persist a 0600 manifest keyed by
             ``session:window.pane``.
  RESTORE -> tmux-resurrect relaunches each agent pane through aim_pane_resume.py, which calls
             resolve_restore_argv() to exec the harness-correct *exact* resume command.

ID resolution order per pane (most to least precise):
  1. open-file  : the agent process holds its own session file open (/proc/<pid>/fd)
  2. argv       : the agent was launched with an explicit ID (e.g. ``--conversation X``)
  3. store-recent: newest unclaimed session for that cwd in the harness's native store
"""

from __future__ import annotations

import json
import os
import re
import shlex
import sqlite3
import tempfile
import time
from pathlib import Path
from urllib.parse import quote

MANIFEST_VERSION = 1

# Verified against installed CLIs' --help (2026-11-26).
#   exact : argv suffix template for resuming a specific session ("{id}" placeholder), or None
#   latest: argv suffix for "most recent" fallback, or None (fresh launch)
HARNESS_RESUME: dict[str, dict[str, list[str] | None]] = {
    "agy": {"exact": ["--conversation", "{id}"], "latest": ["-c"]},
    "grok": {"exact": ["-r", "{id}"], "latest": ["-c"]},
    "opencode": {"exact": ["-s", "{id}"], "latest": ["-c"]},
    "codex": {"exact": ["resume", "{id}"], "latest": ["resume", "--last"]},
    "claude": {"exact": ["-r", "{id}"], "latest": ["-c"]},
    "gemini": {"exact": None, "latest": ["--resume", "latest"]},
    "aider": {"exact": None, "latest": None},
}

RESUMABLE_HARNESSES = ("agy", "grok", "opencode", "codex", "claude", "gemini")

_INTERPRETERS = {"node", "nodejs", "bun", "deno", "python", "python3"}

# Package-path fragments that identify a harness when launched through an interpreter.
_PACKAGE_MARKERS = {
    "claude": ("claude-code",),
    "gemini": ("gemini-cli",),
    "codex": ("@openai/codex",),
    "opencode": ("opencode-ai",),
}

_UUID = r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
_OPEN_FILE_PATTERNS = {
    "agy": re.compile(rf"/conversations/({_UUID})\.db$"),
    "codex": re.compile(rf"/\.codex/sessions/.*rollout-.*?({_UUID})\.jsonl$"),
    "claude": re.compile(rf"/\.claude/projects/[^/]+/({_UUID})\.jsonl$"),
    "grok": re.compile(r"/\.grok/sessions/[^/]+/([^/]+)/[^/]+$"),
}

# Flags that carry an explicit session ID, per harness.
_ID_FLAGS = {
    "agy": ("--conversation",),
    "grok": ("-r", "--resume"),
    "opencode": ("-s", "--session"),
    "claude": ("-r", "--resume", "--session-id"),
}


# ---------------------------------------------------------------------------
# Command building
# ---------------------------------------------------------------------------


def build_resume_argv(harness: str, session_id: str | None = None, resume: bool = True, skip_permissions: bool = False) -> list[str]:
    """Return argv that launches ``harness``: exact resume when an ID is known, else latest, else fresh."""
    argv = [harness]
    if harness == "agy" and skip_permissions:
        argv.append("--dangerously-skip-permissions")
    if not resume:
        return argv
    spec = HARNESS_RESUME.get(harness) or {}
    exact = spec.get("exact")
    latest = spec.get("latest")
    if session_id and exact:
        argv.extend(part.replace("{id}", session_id) for part in exact)
    elif latest:
        argv.extend(latest)
    return argv


def argv_to_command(argv: list[str]) -> str:
    return " ".join(shlex.quote(part) for part in argv)


# ---------------------------------------------------------------------------
# Process inspection
# ---------------------------------------------------------------------------


def _norm_name(token: str) -> str:
    name = os.path.basename(token or "").lower()
    for suffix in (".real", ".js", ".mjs", ".cjs", ".exe"):
        if name.endswith(suffix):
            name = name[: -len(suffix)]
    return "agy" if name == "antigravity" else name


def detect_harness(argv: list[str]) -> str | None:
    """Identify the agent harness from a process argv, or None for non-agent processes."""
    if not argv:
        return None
    first = _norm_name(argv[0])
    if first in HARNESS_RESUME:
        return first
    if first in _INTERPRETERS and len(argv) > 1:
        script = argv[1]
        name = _norm_name(script)
        if name in HARNESS_RESUME:
            return name
        for harness, markers in _PACKAGE_MARKERS.items():
            if any(m in script for m in markers):
                return harness
    for harness, markers in _PACKAGE_MARKERS.items():
        if any(m in argv[0] for m in markers):
            return harness
    return None


def explicit_session_id(harness: str, argv: list[str]) -> str | None:
    """Return a session ID passed explicitly on the command line, if any."""
    if harness == "codex":
        for i, tok in enumerate(argv[:-1]):
            if tok == "resume":
                nxt = argv[i + 1]
                return None if nxt.startswith("-") else nxt
        return None
    flags = _ID_FLAGS.get(harness, ())
    for i, tok in enumerate(argv):
        for flag in flags:
            if tok.startswith(flag + "="):
                val = tok.split("=", 1)[1]
                return val or None
            if tok == flag and i + 1 < len(argv):
                nxt = argv[i + 1]
                return None if nxt.startswith("-") else nxt
    return None


def session_id_from_open_files(harness: str, paths: list[str]) -> str | None:
    pattern = _OPEN_FILE_PATTERNS.get(harness)
    if pattern is None:
        return None
    for path in paths:
        match = pattern.search(path)
        if match:
            return match.group(1)
    return None


def _read_argv(pid: int) -> list[str]:
    try:
        raw = Path(f"/proc/{pid}/cmdline").read_bytes()
    except OSError:
        return []
    return [part.decode("utf-8", "replace") for part in raw.split(b"\0") if part]


def process_tree(root_pid: int, max_depth: int = 4) -> list[tuple[int, list[str]]]:
    """Return (pid, argv) for every descendant of ``root_pid`` (breadth-first, excluding root)."""
    children: dict[int, list[int]] = {}
    try:
        entries = os.listdir("/proc")
    except OSError:
        return []
    for entry in entries:
        if not entry.isdigit():
            continue
        try:
            stat = Path(f"/proc/{entry}/stat").read_text(encoding="utf-8", errors="replace")
            ppid = int(stat.rsplit(")", 1)[1].split()[1])
        except (OSError, ValueError, IndexError):
            continue
        children.setdefault(ppid, []).append(int(entry))

    result: list[tuple[int, list[str]]] = []
    frontier = [root_pid]
    for _ in range(max_depth):
        nxt: list[int] = []
        for pid in frontier:
            for child in sorted(children.get(pid, [])):
                result.append((child, _read_argv(child)))
                nxt.append(child)
        frontier = nxt
        if not frontier:
            break
    return result


def open_files(pid: int) -> list[str]:
    fd_dir = f"/proc/{pid}/fd"
    try:
        fds = os.listdir(fd_dir)
    except OSError:
        return []
    paths: list[str] = []
    for fd in fds:
        try:
            paths.append(os.readlink(os.path.join(fd_dir, fd)))
        except OSError:
            continue
    return paths


# ---------------------------------------------------------------------------
# Native session stores (newest first, scoped to cwd)
# ---------------------------------------------------------------------------


def _home(home: str | None) -> Path:
    return Path(home or os.path.expanduser("~"))


def _ro_query(db_path: Path, sql: str, params: tuple) -> list[tuple]:
    if not db_path.is_file():
        return []
    try:
        con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=2.5)
        try:
            return con.execute(sql, params).fetchall()
        finally:
            con.close()
    except sqlite3.Error:
        return []


def _agy_candidates(cwd: str, home: Path) -> list[str]:
    db = Path(os.environ.get("AIM_AGY_APP_DIR", str(home / ".gemini" / "antigravity-cli"))) / "conversation_summaries.db"
    rows = _ro_query(
        db,
        "SELECT conversation_id, workspace_uris FROM conversation_summaries "
        "WHERE COALESCE(parent_conversation_id, '') = '' AND COALESCE(nesting_depth, 0) = 0 "
        "AND workspace_uris LIKE ? ORDER BY last_modified_time DESC LIMIT 50",
        (f"%{cwd}%",),
    )
    target = f"file://{cwd}"
    out: list[str] = []
    for cid, uris in rows:
        try:
            uri_list = json.loads(uris or "[]")
        except ValueError:
            continue
        if target in uri_list and cid:
            out.append(cid)
    return out


def _grok_candidates(cwd: str, home: Path) -> list[str]:
    base = home / ".grok" / "sessions" / quote(cwd, safe="")
    if not base.is_dir():
        return []
    found: list[tuple[float, str]] = []
    for entry in base.iterdir():
        events = entry / "events.jsonl"
        if entry.is_dir() and events.is_file():
            found.append((events.stat().st_mtime, entry.name))
    return [name for _, name in sorted(found, reverse=True)]


def _opencode_candidates(cwd: str, home: Path) -> list[str]:
    db = home / ".local" / "share" / "opencode" / "opencode.db"
    rows = _ro_query(
        db,
        "SELECT id FROM session WHERE directory = ? AND parent_id IS NULL AND time_archived IS NULL "
        "ORDER BY time_updated DESC LIMIT 50",
        (cwd,),
    )
    return [r[0] for r in rows if r and r[0]]


def _codex_candidates(cwd: str, home: Path, scan_limit: int = 400) -> list[str]:
    base = home / ".codex" / "sessions"
    if not base.is_dir():
        return []
    files = sorted(base.rglob("rollout-*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)[:scan_limit]
    out: list[str] = []
    for path in files:
        try:
            with path.open("r", encoding="utf-8", errors="replace") as fh:
                first = json.loads(fh.readline() or "{}")
        except (OSError, ValueError):
            continue
        payload = first.get("payload") if isinstance(first, dict) else None
        if isinstance(payload, dict) and payload.get("cwd") == cwd and payload.get("id"):
            out.append(str(payload["id"]))
    return out


def _claude_candidates(cwd: str, home: Path) -> list[str]:
    base = home / ".claude" / "projects" / re.sub(r"[^A-Za-z0-9]", "-", cwd)
    if not base.is_dir():
        return []
    files = sorted(base.glob("*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)
    return [p.stem for p in files]


_STORE_RESOLVERS = {
    "agy": _agy_candidates,
    "grok": _grok_candidates,
    "opencode": _opencode_candidates,
    "codex": _codex_candidates,
    "claude": _claude_candidates,
}


def store_candidates(harness: str, cwd: str, home: str | None = None) -> list[str]:
    resolver = _STORE_RESOLVERS.get(harness)
    if resolver is None or not cwd:
        return []
    try:
        return resolver(cwd, _home(home))
    except OSError:
        return []


# ---------------------------------------------------------------------------
# Capture (SAVE)
# ---------------------------------------------------------------------------


def _agent_process(pane_pid: int) -> tuple[str | None, list[tuple[int, list[str]]]]:
    """Return (harness, agent-subtree processes) for the first agent found under the pane shell."""
    tree = process_tree(pane_pid)
    for idx, (_, argv) in enumerate(tree):
        harness = detect_harness(argv)
        if harness:
            return harness, tree[idx:]
    return None, []


def capture_pane_sessions(panes: list[dict], home: str | None = None) -> dict:
    """Build a manifest mapping each agent pane to its exact session ID.

    ``panes`` items: {"key": "session:window.pane", "pane_pid": int, "cwd": str}
    """
    entries: dict[str, dict] = {}
    pending: list[str] = []
    claimed: dict[tuple[str, str], set[str]] = {}

    for pane in panes:
        harness, procs = _agent_process(int(pane.get("pane_pid") or 0))
        if harness is None:
            continue
        cwd = str(pane.get("cwd") or "")
        sid, source = None, "none"
        for pid, _ in procs:
            sid = session_id_from_open_files(harness, open_files(pid))
            if sid:
                source = "open-file"
                break
        if not sid:
            for _, argv in procs:
                if detect_harness(argv) == harness:
                    sid = explicit_session_id(harness, argv)
                    if sid:
                        source = "argv"
                        break
        entries[pane["key"]] = {"harness": harness, "cwd": cwd, "session_id": sid, "source": source}
        if sid:
            claimed.setdefault((harness, cwd), set()).add(sid)
        else:
            pending.append(pane["key"])

    store_cache: dict[tuple[str, str], list[str]] = {}
    for key in pending:
        entry = entries[key]
        group = (entry["harness"], entry["cwd"])
        if group not in store_cache:
            store_cache[group] = store_candidates(entry["harness"], entry["cwd"], home=home)
        taken = claimed.setdefault(group, set())
        for cand in store_cache[group]:
            if cand not in taken:
                entry["session_id"] = cand
                entry["source"] = "store-recent"
                taken.add(cand)
                break

    return {"version": MANIFEST_VERSION, "captured_at": time.time(), "panes": entries}


# ---------------------------------------------------------------------------
# Manifest persistence
# ---------------------------------------------------------------------------


def manifest_path(home: str | None = None) -> Path:
    override = os.environ.get("AIM_PANE_SESSIONS_FILE", "").strip()
    if override:
        return Path(override)
    return _home(home) / ".aim_pane_sessions.json"


def write_manifest(manifest: dict, home: str | None = None) -> Path:
    path = manifest_path(home)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".aim_pane_sessions.", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(manifest, fh, indent=2)
            fh.write("\n")
        os.chmod(tmp, 0o600)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise
    return path


def read_manifest(home: str | None = None) -> dict:
    empty = {"version": MANIFEST_VERSION, "captured_at": None, "panes": {}}
    path = manifest_path(home)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return empty
    if not isinstance(data, dict) or not isinstance(data.get("panes"), dict):
        return empty
    return data


def summarize_manifest(manifest: dict) -> dict:
    panes = (manifest or {}).get("panes") or {}
    exact = sum(1 for p in panes.values() if isinstance(p, dict) and p.get("session_id"))
    return {"agent_pane_count": len(panes), "exact_pane_count": exact}


# ---------------------------------------------------------------------------
# Restore
# ---------------------------------------------------------------------------


def resolve_restore_argv(
    harness: str,
    pane_key: str,
    cwd: str,
    manifest: dict,
    skip_permissions: bool = False,
    home: str | None = None,
) -> tuple[list[str], str]:
    """Return (argv, source) to relaunch ``harness`` in a restored pane."""
    entry = ((manifest or {}).get("panes") or {}).get(pane_key)
    if isinstance(entry, dict) and entry.get("harness") == harness and entry.get("session_id"):
        return build_resume_argv(harness, entry["session_id"], skip_permissions=skip_permissions), "manifest"

    spec = HARNESS_RESUME.get(harness) or {}
    if spec.get("exact"):
        cands = store_candidates(harness, cwd, home=home)
        if cands:
            return build_resume_argv(harness, cands[0], skip_permissions=skip_permissions), "store-recent"
    if spec.get("latest"):
        return build_resume_argv(harness, None, skip_permissions=skip_permissions), "cli-latest"
    return build_resume_argv(harness, None, resume=False, skip_permissions=skip_permissions), "fresh"
