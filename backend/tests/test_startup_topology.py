import os
import stat
import subprocess
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
STARTUP_SH = REPO_ROOT / "startup.sh"
AGENTS_MD = (REPO_ROOT / "AGENTS.md") if (REPO_ROOT / "AGENTS.md").exists() else (REPO_ROOT.parent.parent / "AGENTS.md")
AIM_MCP_START_SH = Path(os.environ.get("AIM_MCP_DIR", str(Path.home() / "aim-mcp"))) / "start_mcp.sh"


def _make_mock_bin(tmp_path: Path, lsof_8000: str = "", lsof_8001: str = "", pgrep_cf: str = "", has_session: int = 0) -> tuple[Path, Path]:
    """Create mock binaries for tmux, lsof, pgrep, and pkill that log invocations."""
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    log_file = tmp_path / "calls.log"
    log_file.write_text("")

    def write_exe(name: str, body: str):
        p = bin_dir / name
        p.write_text(f"#!/bin/bash\n{body}\n")
        p.chmod(p.stat().st_mode | stat.S_IEXEC)

    write_exe(
        "tmux",
        f"""
echo "tmux $*" >> "{log_file}"
if [ "$1" = "has-session" ]; then
    exit {has_session}
fi
if [ "$1" = "list-windows" ]; then
    printf "servers\\nmcp\\ncloudflared\\n"
    exit 0
fi
exit 0
""",
    )
    write_exe(
        "lsof",
        f"""
echo "lsof $*" >> "{log_file}"
case "$*" in
    *8000*)
        if [ -n "{lsof_8000}" ]; then
            echo "{lsof_8000}"
            exit 0
        fi
        exit 1
        ;;
    *8001*)
        if [ -n "{lsof_8001}" ]; then
            echo "{lsof_8001}"
            exit 0
        fi
        exit 1
        ;;
esac
exit 1
""",
    )
    write_exe(
        "pgrep",
        f"""
echo "pgrep $*" >> "{log_file}"
if [ -n "{pgrep_cf}" ]; then
    echo "{pgrep_cf}"
    exit 0
fi
exit 1
""",
    )
    write_exe(
        "pkill",
        f"""
echo "pkill $*" >> "{log_file}"
exit 0
""",
    )
    return bin_dir, log_file


def test_startup_sh_idempotent_when_all_running(tmp_path):
    """When :8000, :8001, and cloudflared are already up, startup.sh must not kill or restart them."""
    bin_dir, log_file = _make_mock_bin(
        tmp_path, lsof_8000="3449", lsof_8001="5311", pgrep_cf="5306", has_session=0
    )
    env = os.environ.copy()
    env["PATH"] = f"{bin_dir}:{env.get('PATH', '')}"

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

    assert not any("kill-session" in c for c in calls), f"Unexpected kill-session in {calls}"
    assert not any(c.startswith("pkill ") for c in calls), f"Unexpected pkill in {calls}"
    assert not any("send-keys" in c for c in calls), f"Should not send-keys when all running: {calls}"


def test_startup_sh_starts_only_stopped_services(tmp_path):
    """When :8000 is up but :8001 and cloudflared are down, startup.sh only starts mcp and cloudflared."""
    bin_dir, log_file = _make_mock_bin(
        tmp_path, lsof_8000="3449", lsof_8001="", pgrep_cf="", has_session=0
    )
    mock_mcp_dir = tmp_path / "aim-mcp"
    mock_mcp_dir.mkdir()
    (mock_mcp_dir / "start_mcp.sh").write_text("#!/bin/bash\n")
    mock_cf_cfg = tmp_path / "cloudflared.yml"
    mock_cf_cfg.write_text("tunnel: mock\n")

    env = os.environ.copy()
    env["PATH"] = f"{bin_dir}:{env.get('PATH', '')}"
    env["AIM_MCP_DIR"] = str(mock_mcp_dir)
    env["CLOUDFLARED_CONFIG"] = str(mock_cf_cfg)

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
    assert not any("aim-connect-workspace:servers" in c for c in send_keys_calls)
    assert any("aim-connect-workspace:mcp" in c for c in send_keys_calls)
    assert any("aim-connect-workspace:cloudflared" in c for c in send_keys_calls)


@pytest.mark.skipif(not AGENTS_MD.exists(), reason="AGENTS.md is gitignored and only present on Operator host")
def test_agents_md_codifies_operator_and_service_topology():
    """AGENTS.md must include the Operator name and the 3-window service topology."""
    content = AGENTS_MD.read_text()
    assert "[ASK OPERATOR FOR THEIR NAME" not in content
    assert "Brian Vasquez" in content
    assert "aim-connect-workspace" in content
    assert ":8000" in content
    assert ":8001" in content
    assert "cloudflared" in content


@pytest.mark.skipif(not AIM_MCP_START_SH.exists(), reason="aim-mcp is a sister repo only present on Operator host")
def test_aim_mcp_runs_in_foreground_for_tmux_resurrect():
    """start_mcp.sh must run python3 + uvicorn via exec in foreground by default so tmux-resurrect restores it."""
    content = AIM_MCP_START_SH.read_text()
    assert "exec " in content
    assert "venv/bin/python3" in content
    assert "venv/bin/uvicorn" in content
    assert "server:starlette_app" in content
