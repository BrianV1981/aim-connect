from __future__ import annotations

import os
from pathlib import Path


def vessel_root(start: str | None = None) -> Path:
    current = Path(start or os.getcwd()).resolve()
    for _ in range(14):
        if (current / "joshua_os" / "setup.sh").is_file():
            return current
        if (current / "joshua_os" / ".aim_core").is_dir():
            return current
        if current.parent == current:
            break
        current = current.parent
    return Path(start or os.getcwd()).resolve()


def continuity_dir(root: Path | None = None) -> Path:
    r = root or vessel_root()
    d = r / "continuity"
    d.mkdir(parents=True, exist_ok=True)
    (d / "history").mkdir(exist_ok=True)
    return d


def cron_state_dir(root: Path | None = None) -> Path:
    d = continuity_dir(root) / "cron_state"
    d.mkdir(parents=True, exist_ok=True)
    return d


def wiki_root(root: Path | None = None) -> Path:
    r = root or vessel_root()
    w = r / "joshua_os" / "memory-wiki"
    w.mkdir(parents=True, exist_ok=True)
    (w / "pages").mkdir(exist_ok=True)
    return w


def fr_cache_dir(root: Path | None = None) -> Path:
    d = continuity_dir(root) / "flight_records"
    d.mkdir(parents=True, exist_ok=True)
    return d


def memory_db_dir(root: Path | None = None) -> Path:
    d = (root or vessel_root()) / "joshua_os" / "memory_lance" / "handoff_vnext"
    d.mkdir(parents=True, exist_ok=True)
    return d
