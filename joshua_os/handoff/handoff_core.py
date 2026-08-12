"""System A: on-demand handoff / reincarnation."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import List, Optional, Protocol

from handoff.models import JobResult, TranscriptRef, Turn
from handoff.packet import build_packet, validate_packet
from handoff.paths import continuity_dir, vessel_root


class _Adapter(Protocol):
    name: str

    def resolve(self, session_id: Optional[str], cwd: Path) -> TranscriptRef: ...

    def iter_turns(self, ref: TranscriptRef) -> List[Turn] | object: ...


def run_handoff(
    *,
    adapter: _Adapter,
    session_id: Optional[str] = None,
    cwd: Optional[Path] = None,
    vessel: Optional[str] = None,
    marker: Optional[str] = None,
    root: Optional[Path] = None,
) -> JobResult:
    root = Path(root) if root else vessel_root()
    cwd = Path(cwd or root).resolve()
    vessel = vessel or root.name
    cont = continuity_dir(root)
    result_path = cont / "handoff_result.json"
    gates = {f"G{i}": False for i in range(6)}
    errors: List[str] = []

    try:
        ref = adapter.resolve(session_id, cwd)
        gates["G0"] = True
    except Exception as e:
        errors.append(f"G0 resolve: {e}")
        res = JobResult(
            system="handoff",
            status="error",
            code="RESOLVE_FAIL",
            session_id=session_id,
            vessel=vessel,
            gates=gates,
            errors=errors,
        )
        _write_result(result_path, res)
        return res

    turns = list(adapter.iter_turns(ref))
    users = [t for t in turns if t.role == "user" and t.text.strip()]
    turn_count = len([t for t in turns if t.role in ("user", "assistant") and t.text.strip()])
    gates["G1"] = turn_count >= 1
    gates["G2"] = len(users) >= 1
    if not gates["G1"] or not gates["G2"]:
        errors.append("empty or no user turns")
        res = JobResult(
            system="handoff",
            status="empty",
            code="EMPTY_SESSION",
            session_id=ref.session_id,
            vessel=vessel,
            turn_count=turn_count,
            gates=gates,
            errors=errors,
            paths={"source": str(ref.path)},
        )
        _write_result(result_path, res)
        return res

    hist_path = cont / "history" / f"{ref.session_id}.md"
    md, marker_used = build_packet(
        session_id=ref.session_id,
        vessel=vessel,
        turns=turns,
        source_path=str(ref.path),
        archive_path=str(hist_path),
        marker=marker,
    )
    v_errs = validate_packet(md)
    gates["G3"] = not v_errs
    if v_errs:
        errors.extend(v_errs)

    # G4: marker present in packet
    gates["G4"] = marker_used in md and f"- marker: {marker_used}" in md
    if not gates["G4"]:
        errors.append("marker missing from packet")

    if not all(gates[g] for g in ("G0", "G1", "G2", "G3", "G4")):
        res = JobResult(
            system="handoff",
            status="error",
            code="GATE_FAIL",
            session_id=ref.session_id,
            vessel=vessel,
            turn_count=turn_count,
            gates=gates,
            errors=errors,
            paths={"source": str(ref.path)},
        )
        _write_result(result_path, res)
        return res

    # atomic-ish write
    hist_path.parent.mkdir(parents=True, exist_ok=True)
    hist_path.write_text(md, encoding="utf-8")
    current = cont / "CURRENT.md"
    current.write_text(md, encoding="utf-8")

    gates["G5"] = True
    res = JobResult(
        system="handoff",
        status="ok",
        code="OK",
        session_id=ref.session_id,
        vessel=vessel,
        turn_count=turn_count,
        gates=gates,
        errors=[],
        paths={
            "continuity": str(current),
            "archive": str(hist_path),
            "source": str(ref.path),
            "result": str(result_path),
        },
        extras={"marker": marker_used, "host": adapter.name},
    )
    _write_result(result_path, res)
    return res


def _write_result(path: Path, res: JobResult) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(res.to_dict(), indent=2) + "\n", encoding="utf-8")
