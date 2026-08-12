"""System C: nightly blackbox seal of every session (cron)."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import List, Optional, Protocol

from handoff.models import JobResult, TranscriptRef
from handoff.paths import cron_state_dir, vessel_root


class _Adapter(Protocol):
    name: str

    def list_sessions(
        self, cwd: Optional[Path] = None, since_mtime: float = 0.0
    ) -> List[TranscriptRef]: ...


def run_blackbox_cron(
    *,
    adapter: _Adapter,
    root: Optional[Path] = None,
    since_mtime: float = 0.0,
    limit: int = 200,
) -> JobResult:
    root = Path(root) if root else vessel_root()
    state_dir = cron_state_dir(root)
    # ensure engine path for blackbox_vault
    core = root / "joshua_os" / ".aim_core"
    if str(core) not in sys.path:
        sys.path.insert(0, str(core))
    os.environ.setdefault("AIM_BLACKBOX_ALLOW_CRON", "1")

    from blackbox_vault import vault_session  # type: ignore

    sessions = adapter.list_sessions(cwd=None, since_mtime=since_mtime)[:limit]
    sealed = []
    failed = []
    for ref in sessions:
        try:
            ok = vault_session(
                str(ref.path),
                session_id=ref.session_id,
                vessel_root=str(root),
                reason="cron",
            )
            if ok:
                sealed.append(ref.session_id)
            else:
                failed.append(ref.session_id)
        except Exception as e:
            failed.append(f"{ref.session_id}:{e}")

    status = "ok" if sealed and not failed else (
        "partial" if sealed else ("empty" if not sessions else "error")
    )
    code = {
        "ok": "OK",
        "partial": "PARTIAL",
        "empty": "NO_SESSIONS",
        "error": "SEAL_FAIL",
    }[status]

    res = JobResult(
        system="blackbox_cron",
        status=status,
        code=code,
        vessel=root.name,
        turn_count=len(sealed),
        gates={
            "B0": True,
            "B1": len(sessions) > 0,
            "B2": len(sealed) > 0 or not sessions,
        },
        errors=failed[:50],
        paths={
            "blackbox": str(root / "archive" / ".raw_jsonl_blackbox"),
            "result": str(state_dir / "blackbox_cron_result.json"),
        },
        extras={
            "sealed": sealed,
            "failed_count": len(failed),
            "scanned": len(sessions),
        },
    )
    out = state_dir / "blackbox_cron_result.json"
    out.write_text(json.dumps(res.to_dict(), indent=2) + "\n", encoding="utf-8")
    return res
