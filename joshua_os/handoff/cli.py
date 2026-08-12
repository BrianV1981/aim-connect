#!/usr/bin/env python3
"""CLI entry: handoff | wiki-batch | blackbox-cron | all (cron)."""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# package root = joshua_os
_OS = Path(__file__).resolve().parent.parent
if str(_OS) not in sys.path:
    sys.path.insert(0, str(_OS))
_CORE = _OS / ".aim_core"
if str(_CORE) not in sys.path:
    sys.path.insert(0, str(_CORE))


def _adapter(name: str, fixture_root: str | None = None):
    if name == "fixture":
        from handoff.adapters.fixture import FixtureAdapter

        if not fixture_root:
            raise SystemExit("--fixture-root required for adapter=fixture")
        return FixtureAdapter(Path(fixture_root))
    elif name == "agy":
        from handoff.adapters.agy import AgyAdapter

        return AgyAdapter()
    elif name == "grok":
        from handoff.adapters.grok import GrokAdapter

        return GrokAdapter()
    raise SystemExit(f"unknown adapter: {name}")


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Handoff vNext three pipelines")
    p.add_argument(
        "command",
        choices=["handoff", "blackbox-cron", "e2e-staged"],
    )
    p.add_argument("--session-id", default=None)
    p.add_argument("--adapter", default="grok", help="grok|fixture")
    p.add_argument("--fixture-root", default=None)
    p.add_argument("--vessel-root", default=None)
    p.add_argument("--project-root", default=None)
    p.add_argument("--marker", default=None)
    p.add_argument("--since-mtime", type=float, default=None)
    p.add_argument("--limit", type=int, default=50)
    p.add_argument("--json", action="store_true")
    args = p.parse_args(argv)

    root = Path(args.vessel_root or os.getcwd()).resolve()
    os.chdir(root)

    if args.command == "e2e-staged":
        return _e2e_staged(root, args)

    adapter = _adapter(args.adapter, args.fixture_root)

    if args.command == "handoff":
        from handoff.handoff_core import run_handoff

        res = run_handoff(
            adapter=adapter,
            session_id=args.session_id,
            cwd=Path(args.project_root or root),
            root=root,
            vessel=root.name,
            marker=args.marker,
        )
        return _emit(res, args.json)

    if args.command == "blackbox-cron":
        from handoff.blackbox_cron import run_blackbox_cron

        res = run_blackbox_cron(
            adapter=adapter,
            root=root,
            since_mtime=args.since_mtime or 0.0,
            limit=args.limit,
        )
        return _emit(res, args.json)

    return 2


def _emit(res, as_json: bool) -> int:
    d = res.to_dict()
    if as_json:
        print(json.dumps(d, indent=2))
    else:
        print(f"[{res.system}] status={res.status} code={res.code} session={res.session_id}")
        if res.paths:
            for k, v in res.paths.items():
                print(f"  {k}: {v}")
        if res.errors:
            print("  errors:", "; ".join(res.errors[:5]))
    if res.status == "ok":
        return 0
    if res.status == "empty":
        return 2
    if res.status == "partial":
        return 0  # partial still processed something
    return 1


def _e2e_staged(root: Path, args) -> int:
    """Full three-pipeline E2E on staged fixture history."""
    from handoff.blackbox_cron import run_blackbox_cron
    from handoff.handoff_core import run_handoff

    fix = Path(args.fixture_root or (root / "joshua_os/tests/fixtures/handoff_vnext"))
    if not fix.is_dir():
        print(f"[e2e] missing fixtures at {fix}", file=sys.stderr)
        return 1
    adapter = FixtureAdapter(fix)
    marker = args.marker or "E2E_HANDOFF_VNEXT_MARKER_7f3a"
    # pick first session
    sessions = adapter.list_sessions()
    if not sessions:
        print("[e2e] no staged sessions", file=sys.stderr)
        return 1
    sid = args.session_id or sessions[0].session_id

    r_h = run_handoff(
        adapter=adapter,
        session_id=sid,
        cwd=root,
        root=root,
        vessel=root.name,
        marker=marker,
    )
    r_b = run_blackbox_cron(adapter=adapter, root=root, since_mtime=0.0, limit=20)
    report = {
        "handoff": r_h.to_dict(),
        "blackbox": r_b.to_dict(),
    }
    out = root / "continuity" / "cron_state" / "e2e_staged_report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    # hard asserts
    ok = True
    reasons = []
    if r_h.status != "ok" or marker not in Path(r_h.paths["continuity"]).read_text():
        ok = False
        reasons.append(f"handoff failed: {r_h.status} {r_h.code}")
    if r_b.status not in ("ok", "partial"):
        ok = False
        reasons.append(f"blackbox failed: {r_b.status}")
    else:
        # wiki page should mention session
        wiki_pages = list((root / "joshua_os" / "memory-wiki" / "pages").glob(f"source-*{sid[:20]}*"))
        if not wiki_pages:
            wiki_pages = list((root / "joshua_os" / "memory-wiki" / "pages").glob("source-*.md"))
            wiki_pages = [p for p in wiki_pages if sid in p.read_text(encoding="utf-8", errors="replace")]
        if not wiki_pages:
            ok = False
            reasons.append("wiki page missing session id")
        fr = root / "continuity" / "flight_records" / f"{sid}.md"
        if not fr.is_file() or len(fr.read_text()) < 40:
            ok = False
            reasons.append("flight record missing")
        dbj = root / "joshua_os" / "memory_lance" / "handoff_vnext" / f"{sid}.jsonl"
        if not dbj.is_file():
            ok = False
            reasons.append("embed/db jsonl missing")

    print(json.dumps({"ok": ok, "reasons": reasons, "report_path": str(out)}, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
