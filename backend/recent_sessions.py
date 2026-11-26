"""Shared "recently opened sessions" list for the Fleet RECENT filter (#320).

One most-recently-used list per account, stored server-side so phone and desktop share it.
Admin logins (password, passkey, ...) all share the single operator list.
Up to MAX_LIMIT names are kept; the user's chosen limit only trims what is returned, so
lowering it and raising it again does not lose history.
"""

from __future__ import annotations

import json
import os
import tempfile
import threading
import time
from pathlib import Path

DEFAULT_LIMIT = 8
MIN_LIMIT = 3
MAX_LIMIT = 30

_LOCK = threading.Lock()


def store_path() -> Path:
    override = os.environ.get("AIM_RECENT_SESSIONS_FILE", "").strip()
    if override:
        return Path(override)
    return Path(os.path.expanduser("~")) / ".aim_recent_sessions.json"


def user_key_for(token_data: dict | float | int | None) -> str:
    if not isinstance(token_data, dict):
        return "admin"  # legacy float tokens were admin-only
    if token_data.get("role") == "admin":
        return "admin"
    return f"user:{token_data.get('user') or token_data.get('prefix') or 'anonymous'}"


def _clamp_limit(value) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return DEFAULT_LIMIT
    return max(MIN_LIMIT, min(MAX_LIMIT, n))


def _load() -> dict:
    path = store_path()
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"users": {}}
    if not isinstance(raw, dict) or not isinstance(raw.get("users"), dict):
        return {"users": {}}
    return raw


def _save(data: dict) -> None:
    path = store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".aim_recent_sessions.", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)
            fh.write("\n")
        os.chmod(tmp, 0o600)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def _entry(data: dict, key: str) -> dict:
    entry = data["users"].get(key)
    if not isinstance(entry, dict):
        entry = {}
    sessions = [s for s in entry.get("sessions", []) if isinstance(s, dict) and isinstance(s.get("name"), str)]
    entry = {"limit": _clamp_limit(entry.get("limit", DEFAULT_LIMIT)), "sessions": sessions[:MAX_LIMIT]}
    data["users"][key] = entry
    return entry


def _view(entry: dict) -> dict:
    return {"limit": entry["limit"], "sessions": [s["name"] for s in entry["sessions"][: entry["limit"]]]}


def get_recent(key: str) -> dict:
    with _LOCK:
        return _view(_entry(_load(), key))


def record_visit(key: str, session_name: str, now: float | None = None) -> dict:
    with _LOCK:
        data = _load()
        entry = _entry(data, key)
        rest = [s for s in entry["sessions"] if s["name"] != session_name]
        entry["sessions"] = ([{"name": session_name, "ts": int(now or time.time())}] + rest)[:MAX_LIMIT]
        _save(data)
        return _view(entry)


def set_limit(key: str, limit) -> dict:
    with _LOCK:
        data = _load()
        entry = _entry(data, key)
        entry["limit"] = _clamp_limit(limit)
        _save(data)
        return _view(entry)
