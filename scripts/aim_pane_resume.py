#!/usr/bin/env python3
"""Relaunch an agent CLI in a tmux pane, resuming its exact saved conversation (#313).

tmux-resurrect runs this inside each restored agent pane via the AIM-managed
``@resurrect-processes`` rules in ~/.tmux.conf, e.g.::

    "~codex->python3 /path/to/aim-connect/scripts/aim_pane_resume.py codex"

Usage:
    aim_pane_resume.py <harness> [--dangerously-skip-permissions] [--dry-run]
    aim_pane_resume.py --capture        # write the pane-session manifest (resurrect post-save hook)

Environment:
    AIM_PANE_KEY            override the "session:window.pane" key (tests / manual use)
    AIM_PANE_SESSIONS_FILE  override the manifest path (default ~/.aim_pane_sessions.json)
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import pane_sessions  # noqa: E402
import tmux_workspace_manager as twm  # noqa: E402


def _current_pane_key() -> str:
    override = os.environ.get("AIM_PANE_KEY", "").strip()
    if override:
        return override
    target = os.environ.get("TMUX_PANE", "")
    cmd = ["tmux", "display-message", "-p"]
    if target:
        cmd += ["-t", target]
    cmd.append("#{session_name}:#{window_index}.#{pane_index}")
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
    except (OSError, subprocess.TimeoutExpired):
        return ""
    return res.stdout.strip() if res.returncode == 0 else ""


def _capture() -> int:
    manifest = twm.capture_and_store_pane_sessions()
    summary = pane_sessions.summarize_manifest(manifest)
    print(f"[aim-restore] captured {summary['exact_pane_count']}/{summary['agent_pane_count']} exact agent pane session(s)")
    return 0


def main(argv: list[str]) -> int:
    if "--capture" in argv:
        return _capture()

    positional = [a for a in argv if not a.startswith("--")]
    if not positional:
        print(__doc__, file=sys.stderr)
        return 2
    harness = positional[0].strip().lower()
    if harness not in pane_sessions.HARNESS_RESUME:
        print(f"[aim-restore] unsupported harness: {harness!r}", file=sys.stderr)
        return 2

    skip = "--dangerously-skip-permissions" in argv
    if not skip:
        try:
            skip = bool(twm.load_tmux_settings().get("skip_permissions", False))
        except Exception:
            skip = False

    key = _current_pane_key()
    cmd_argv, source = pane_sessions.resolve_restore_argv(
        harness,
        key,
        os.getcwd(),
        pane_sessions.read_manifest(),
        skip_permissions=skip,
    )
    command = pane_sessions.argv_to_command(cmd_argv)

    if "--dry-run" in argv:
        print(command)
        return 0

    print(f"[aim-restore] {key or '?'} -> {command}  ({source})", file=sys.stderr)
    try:
        os.execvp(cmd_argv[0], cmd_argv)
    except OSError as exc:
        print(f"[aim-restore] failed to launch {cmd_argv[0]!r}: {exc}", file=sys.stderr)
        return 127
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
