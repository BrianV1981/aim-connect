"""Grok CLI auth file helpers (#189).

Valid token = auth.json larger than AUTH_MIN_BYTES on the registry workspace
(the same grok_data directory bwrap binds). A 0-byte stub is NOT valid.
"""

from __future__ import annotations

import os

AUTH_MIN_BYTES = 100


def grok_auth_path(workspace_dir: str) -> str:
    return os.path.join(workspace_dir, "grok_data", "auth.json")


def grok_auth_ready(workspace_dir: str) -> bool:
    path = grok_auth_path(workspace_dir)
    try:
        return os.path.isfile(path) and os.path.getsize(path) > AUTH_MIN_BYTES
    except OSError:
        return False


def grok_auth_state(workspace_dir: str) -> str:
    path = grok_auth_path(workspace_dir)
    if not os.path.isfile(path):
        return "missing"
    try:
        size = os.path.getsize(path)
    except OSError:
        return "missing"
    if size > AUTH_MIN_BYTES:
        return "ok"
    return "empty"
