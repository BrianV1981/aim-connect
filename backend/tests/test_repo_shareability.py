import os
import subprocess
from pathlib import Path

from tests.test_startup_topology import _make_mock_bin


REPO_ROOT = Path(__file__).resolve().parents[2]
STARTUP_SH = REPO_ROOT / "startup.sh"
ROUTES_API_PY = REPO_ROOT / "backend" / "routes_api.py"


def test_no_personal_os_files_tracked_in_git():
    """Public git index must not track joshua_os/, HANDOFF.md, aim, or internal ticket dumps."""
    res = subprocess.run(
        ["git", "ls-files"],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=True,
    )
    tracked = res.stdout.splitlines()
    assert not any(f.startswith("joshua_os/") for f in tracked), "joshua_os/ must not be tracked in git"
    assert "HANDOFF.md" not in tracked, "HANDOFF.md must not be tracked in git"
    assert "aim" not in tracked, "aim wrapper must not be tracked in git"
    assert not any(f.startswith("docs/TICKET_") for f in tracked), "Internal TICKET docs must not be tracked"
    assert "docs/aim_connect_launch_plan.md" not in tracked


def test_gitignore_covers_local_operational_and_scratch_files():
    """git check-ignore must match local J.O.S.H.U.A. state, worktrees, and scratch artifacts (#172/#202)."""
    candidates = [
        "joshua_os/memory-wiki/index.md",
        "HANDOFF.md",
        "aim",
        "workspace/issue-202",
        "archive/scratch.txt",
        "planning-artifacts/plan.md",
        "aim-communicate.md",
        "testjay.md",
        "docs/transcript_abc.md",
        "docs/summary_abc.md",
        "docs/grok_session_abc.md",
        "backend/test_admin.py",
    ]
    res = subprocess.run(
        ["git", "check-ignore", *candidates],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
    )
    ignored = set(res.stdout.splitlines())
    missing = [c for c in candidates if c not in ignored]
    assert not missing, f"Files not covered by .gitignore: {missing}"


def test_no_hardcoded_operator_home_in_startup_or_routes():
    """startup.sh and backend/routes_api.py must not hardcode /home/kingb."""
    startup_text = STARTUP_SH.read_text()
    routes_text = ROUTES_API_PY.read_text()
    assert "/home/kingb" not in startup_text, "startup.sh still hardcodes /home/kingb"
    assert "/home/kingb" not in routes_text, "backend/routes_api.py still hardcodes /home/kingb"


def test_startup_sh_skips_optional_mcp_and_cloudflared_when_absent(tmp_path):
    """A fresh open-source clone without aim-mcp or cloudflared config still starts :8000 cleanly."""
    bin_dir, log_file = _make_mock_bin(
        tmp_path, lsof_8000="", lsof_8001="", pgrep_cf="", has_session=0
    )
    env = os.environ.copy()
    env["PATH"] = f"{bin_dir}:{env.get('PATH', '')}"
    env["AIM_MCP_DIR"] = str(tmp_path / "nonexistent-aim-mcp")
    env["CLOUDFLARED_CONFIG"] = str(tmp_path / "nonexistent-cloudflared.yml")

    res = subprocess.run(
        ["bash", str(STARTUP_SH)],
        cwd=str(REPO_ROOT),
        env=env,
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert res.returncode == 0, res.stderr
    calls = log_file.read_text().splitlines()
    send_keys_calls = [c for c in calls if "send-keys" in c]
    assert any("aim-connect-workspace:servers" in c for c in send_keys_calls)
    assert not any("aim-connect-workspace:mcp" in c for c in send_keys_calls)
    assert not any("aim-connect-workspace:cloudflared" in c for c in send_keys_calls)
