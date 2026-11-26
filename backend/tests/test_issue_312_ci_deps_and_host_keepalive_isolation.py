import os
import subprocess
import time
from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
REQUIREMENTS_TXT = WORKTREE_ROOT / "backend" / "requirements.txt"
TEST_WORKFLOW_YML = WORKTREE_ROOT / ".github" / "workflows" / "test.yml"
WSL_KEEPALIVE_SH = WORKTREE_ROOT / "scripts" / "wsl-keepalive.sh"


def test_requirements_txt_includes_pillow_for_node_identity_and_ci():
    """#312: backend/requirements.txt must declare pillow so GitHub Actions collects #306 cleanly."""
    reqs = REQUIREMENTS_TXT.read_text(encoding="utf-8").lower()
    assert "pillow" in reqs

    wf = TEST_WORKFLOW_YML.read_text(encoding="utf-8")
    assert "requirements.txt" in wf
    assert "tmux" in wf


def test_wsl_keepalive_proc_name_isolation_never_kills_host_keepalive(tmp_path):
    """#312: Running wsl-keepalive.sh off with an isolated AIM_KEEPALIVE_PROC_NAME must never kill the host handle."""
    win_home = tmp_path / "win_iso"
    (win_home / "AppData" / "Roaming" / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup").mkdir(
        parents=True
    )
    (win_home / ".wslconfig").write_text("[wsl2]\r\nnetworkingMode=mirrored\r\n", encoding="utf-8")

    # Simulate a live production-like keepalive process with a prefix-adjacent name
    sim_prod_name = "aim_wsl_keepalive_sleep_simprod312"
    test_proc_name = "aim_wsl_keepalive_sleep_test312"

    subprocess.run(["pkill", "-f", f"^{sim_prod_name}"], capture_output=True)
    subprocess.run(["pkill", "-f", f"^{test_proc_name}"], capture_output=True)

    sim_prod = subprocess.Popen(
        ["bash", "-c", f"exec -a {sim_prod_name} sleep infinity"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        time.sleep(0.15)
        assert sim_prod.poll() is None

        env = os.environ.copy()
        env["AIM_WIN_HOME"] = str(win_home)
        env["AIM_SKIP_WIN_EXEC"] = "1"
        env["AIM_KEEPALIVE_PROC_NAME"] = test_proc_name

        subprocess.run(
            ["bash", str(WSL_KEEPALIVE_SH), "on"],
            cwd=str(WORKTREE_ROOT),
            env=env,
            check=True,
            capture_output=True,
        )
        subprocess.run(
            ["bash", str(WSL_KEEPALIVE_SH), "off"],
            cwd=str(WORKTREE_ROOT),
            env=env,
            check=True,
            capture_output=True,
        )
        time.sleep(0.15)
        # Simulated host keepalive MUST still be alive!
        assert sim_prod.poll() is None, "wsl-keepalive.sh off killed an unrelated keepalive process!"
    finally:
        sim_prod.terminate()
        subprocess.run(["pkill", "-f", f"^{sim_prod_name}"], capture_output=True)
        subprocess.run(["pkill", "-f", f"^{test_proc_name}"], capture_output=True)
