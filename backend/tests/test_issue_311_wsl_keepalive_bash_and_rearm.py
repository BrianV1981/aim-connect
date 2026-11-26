import json
import os
import re
import stat
import subprocess
import time
from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
WSL_KEEPALIVE_SH = WORKTREE_ROOT / "scripts" / "wsl-keepalive.sh"
WSL_KEEPALIVE_PS1 = WORKTREE_ROOT / "scripts" / "windows" / "install-wsl-keepalive.ps1"
BOOT_RESTORE_SH = WORKTREE_ROOT / "scripts" / "boot-restore.sh"


def _write_exe(path: Path, body: str) -> Path:
    path.write_text(f"#!/bin/bash\n{body}\n", encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IEXEC)
    return path


def test_generated_vbs_uses_bash_and_spawns_persistent_sleep_without_self_matching(tmp_path):
    """#311: Extract the exact `--exec ...` command from generated VBS and prove it stays alive & deduplicates."""
    win_home = tmp_path / "win_user"
    startup_dir = win_home / "AppData" / "Roaming" / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"
    startup_dir.mkdir(parents=True)
    wsl_cfg = win_home / ".wslconfig"
    wsl_cfg.write_text("[wsl2]\r\nnetworkingMode=mirrored\r\n", encoding="utf-8")

    env = os.environ.copy()
    env["AIM_WIN_HOME"] = str(win_home)
    env["AIM_SKIP_WIN_EXEC"] = "1"
    env["AIM_WSL_DISTRO"] = "Ubuntu"
    env["AIM_KEEPALIVE_PROC_NAME"] = "aim_wsl_keepalive_sleep_test311_a"

    subprocess.run(["pkill", "-f", "^aim_wsl_keepalive_sleep_test311_a"], capture_output=True)
    try:
        res = subprocess.run(
            ["bash", str(WSL_KEEPALIVE_SH), "on"],
            cwd=str(WORKTREE_ROOT),
            env=env,
            capture_output=True,
            text=True,
            timeout=10,
        )
        assert res.returncode == 0, res.stderr
        # Kill the fallback process so we strictly test the VBS command itself!
        subprocess.run(["pkill", "-f", "^aim_wsl_keepalive_sleep_test311_a"], capture_output=True)
        time.sleep(0.15)

        vbs_text = (startup_dir / "aim-wsl-keepalive.vbs").read_text(encoding="utf-8")
        assert "--exec sh -c" not in vbs_text
        assert "--exec bash -c" in vbs_text

        ps_text = WSL_KEEPALIVE_PS1.read_text(encoding="utf-8")
        assert "--exec sh -c" not in ps_text
        assert "--exec bash -c" in ps_text

        # Extract the exact inner bash -c script from VBScript (unescaping doubled quotes `""` -> `"`)
        m = re.search(r'--exec bash -c ""(.+)"""\s*,\s*0\s*,\s*False', vbs_text)
        assert m, f"Could not extract bash -c payload from VBS: {vbs_text}"
        inner_cmd = m.group(1).replace('""', '"')

        # Launch via bash -c just as `wsl.exe --exec bash -c <inner_cmd>` does
        proc = subprocess.Popen(
            ["bash", "-c", inner_cmd],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
        time.sleep(0.25)
        assert proc.poll() is None, (
            f"Keepalive command exited prematurely (rc={proc.returncode}): "
            f"{proc.stderr.read().decode('utf-8', errors='replace')}"
        )

        # Status must see the live keepalive process
        st_res = subprocess.run(
            ["bash", str(WSL_KEEPALIVE_SH), "status", "--json"],
            cwd=str(WORKTREE_ROOT),
            env=env,
            capture_output=True,
            text=True,
            timeout=10,
        )
        assert st_res.returncode == 0
        st_data = json.loads(st_res.stdout)
        assert st_data["wsl_keepalive_running"] is True

        # Second invocation must detect the running process and exit 0 immediately (no duplicate)
        dup = subprocess.run(
            ["bash", "-c", inner_cmd],
            capture_output=True,
            text=True,
            timeout=3,
        )
        assert dup.returncode == 0
    finally:
        subprocess.run(["pkill", "-f", "^aim_wsl_keepalive_sleep_test311_a"], capture_output=True)


def test_ensure_handle_and_boot_restore_rearm_when_always_on_enabled(tmp_path):
    """#311: boot-restore.sh calls `wsl-keepalive.sh ensure-handle`, re-arming only when Always-On is enabled."""
    win_home = tmp_path / "win_boot_user"
    startup_dir = win_home / "AppData" / "Roaming" / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"
    startup_dir.mkdir(parents=True)
    wsl_cfg = win_home / ".wslconfig"
    wsl_cfg.write_text("[wsl2]\r\nnetworkingMode=mirrored\r\n", encoding="utf-8")

    env = os.environ.copy()
    env["AIM_WIN_HOME"] = str(win_home)
    env["AIM_SKIP_WIN_EXEC"] = "1"
    env["AIM_KEEPALIVE_PROC_NAME"] = "aim_wsl_keepalive_sleep_test311_b"

    subprocess.run(["pkill", "-f", "^aim_wsl_keepalive_sleep_test311_b"], capture_output=True)
    try:
        # 1. When Always-On is OFF, ensure-handle is a strict no-op
        noop_res = subprocess.run(
            ["bash", str(WSL_KEEPALIVE_SH), "ensure-handle"],
            cwd=str(WORKTREE_ROOT),
            env=env,
            capture_output=True,
            text=True,
            timeout=10,
        )
        assert noop_res.returncode == 0
        st_off = json.loads(
            subprocess.run(
                ["bash", str(WSL_KEEPALIVE_SH), "status", "--json"],
                cwd=str(WORKTREE_ROOT),
                env=env,
                capture_output=True,
                text=True,
                check=True,
            ).stdout
        )
        assert st_off["wsl_keepalive_running"] is False

        # 2. Configure Always-On, simulate WSL reboot killing the sleep process, then run boot-restore.sh
        subprocess.run(
            ["bash", str(WSL_KEEPALIVE_SH), "on"],
            cwd=str(WORKTREE_ROOT),
            env=env,
            check=True,
            capture_output=True,
        )
        subprocess.run(["pkill", "-f", "^aim_wsl_keepalive_sleep_test311_b"], capture_output=True)
        time.sleep(0.15)

        bin_dir = tmp_path / "bin"
        bin_dir.mkdir()
        _write_exe(bin_dir / "tmux", "exit 0")
        startup_sh = _write_exe(tmp_path / "startup.sh", "exit 0")

        boot_env = env.copy()
        boot_env["PATH"] = f"{bin_dir}:{env.get('PATH', '')}"
        boot_env["AIM_STARTUP_SCRIPT"] = str(startup_sh)
        boot_env["AIM_KEEPALIVE_SCRIPT"] = str(WSL_KEEPALIVE_SH)

        boot_res = subprocess.run(
            ["bash", str(BOOT_RESTORE_SH)],
            cwd=str(WORKTREE_ROOT),
            env=boot_env,
            capture_output=True,
            text=True,
            timeout=10,
        )
        assert boot_res.returncode == 0, boot_res.stderr

        st_rearmed = json.loads(
            subprocess.run(
                ["bash", str(WSL_KEEPALIVE_SH), "status", "--json"],
                cwd=str(WORKTREE_ROOT),
                env=env,
                capture_output=True,
                text=True,
                check=True,
            ).stdout
        )
        assert st_rearmed["wsl_always_on_enabled"] is True
        assert st_rearmed["wsl_keepalive_running"] is True
    finally:
        subprocess.run(["pkill", "-f", "^aim_wsl_keepalive_sleep_test311_b"], capture_output=True)
