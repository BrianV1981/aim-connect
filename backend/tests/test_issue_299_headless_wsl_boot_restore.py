import os
import stat
import subprocess
from pathlib import Path

from tests.scripts_wsl_helper_loader import load_wsl_merge_module


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
BOOT_RESTORE_SH = WORKTREE_ROOT / "scripts" / "boot-restore.sh"
INSTALL_HEADLESS_SH = WORKTREE_ROOT / "scripts" / "install-headless-boot.sh"
SYSTEMD_UNIT_TEMPLATE = WORKTREE_ROOT / "scripts" / "systemd" / "aim-connect-boot.service"
WSL_KEEPALIVE_PS1 = WORKTREE_ROOT / "scripts" / "windows" / "install-wsl-keepalive.ps1"


def _write_exe(path: Path, body: str) -> Path:
    path.write_text(f"#!/bin/bash\n{body}\n", encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IEXEC)
    return path


def test_boot_restore_bootstraps_dead_tmux_daemon_and_runs_startup_sh(tmp_path):
    """#299: When tmux server is dead and snapshot exists, boot-restore.sh runs aim_restore_tmp + restore.sh + startup.sh."""
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    calls_log = tmp_path / "calls.log"
    calls_log.write_text("", encoding="utf-8")
    server_alive_flag = tmp_path / "tmux_alive"

    _write_exe(
        bin_dir / "tmux",
        f"""
echo "tmux $*" >> "{calls_log}"
if [ "$1" = "has-session" ]; then
    if [ -f "{server_alive_flag}" ]; then
        exit 0
    fi
    exit 1
fi
if [ "$1" = "new-session" ]; then
    touch "{server_alive_flag}"
    exit 0
fi
exit 0
""",
    )

    restore_sh = _write_exe(
        tmp_path / "restore.sh",
        f'echo "restore.sh invoked" >> "{calls_log}"',
    )
    startup_sh = _write_exe(
        tmp_path / "startup.sh",
        f'echo "startup.sh $*" >> "{calls_log}"',
    )
    last_snapshot = tmp_path / "last"
    last_snapshot.write_text("pane\taim-connect\t0\n", encoding="utf-8")

    env = os.environ.copy()
    env["PATH"] = f"{bin_dir}:{env.get('PATH', '')}"
    env["AIM_RESURRECT_RESTORE_SCRIPT"] = str(restore_sh)
    env["AIM_RESURRECT_LAST_FILE"] = str(last_snapshot)
    env["AIM_BOOT_RESTORE_WAIT_SECONDS"] = "0"
    env["AIM_STARTUP_SCRIPT"] = str(startup_sh)

    res = subprocess.run(
        ["bash", str(BOOT_RESTORE_SH)],
        cwd=str(WORKTREE_ROOT),
        env=env,
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert res.returncode == 0, res.stderr
    calls = calls_log.read_text(encoding="utf-8").splitlines()

    assert "tmux has-session" in calls
    assert "tmux new-session -d -s aim_restore_tmp" in calls
    assert f"tmux run-shell {restore_sh}" in calls
    assert "tmux kill-session -t aim_restore_tmp" in calls
    assert "startup.sh " in calls


def test_boot_restore_skips_resurrect_when_tmux_server_already_active(tmp_path):
    """#299: When tmux server is already alive, boot-restore.sh must NOT re-run restore.sh, only startup.sh."""
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    calls_log = tmp_path / "calls.log"
    calls_log.write_text("", encoding="utf-8")

    _write_exe(
        bin_dir / "tmux",
        f"""
echo "tmux $*" >> "{calls_log}"
if [ "$1" = "has-session" ]; then
    exit 0
fi
exit 0
""",
    )
    restore_sh = _write_exe(tmp_path / "restore.sh", f'echo "restore" >> "{calls_log}"')
    startup_sh = _write_exe(tmp_path / "startup.sh", f'echo "startup.sh $*" >> "{calls_log}"')
    last_snapshot = tmp_path / "last"
    last_snapshot.write_text("pane\taim-connect\t0\n", encoding="utf-8")

    env = os.environ.copy()
    env["PATH"] = f"{bin_dir}:{env.get('PATH', '')}"
    env["AIM_RESURRECT_RESTORE_SCRIPT"] = str(restore_sh)
    env["AIM_RESURRECT_LAST_FILE"] = str(last_snapshot)
    env["AIM_BOOT_RESTORE_WAIT_SECONDS"] = "0"
    env["AIM_STARTUP_SCRIPT"] = str(startup_sh)

    res = subprocess.run(
        ["bash", str(BOOT_RESTORE_SH)],
        cwd=str(WORKTREE_ROOT),
        env=env,
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert res.returncode == 0, res.stderr
    calls = calls_log.read_text(encoding="utf-8").splitlines()

    assert "tmux has-session" in calls
    assert not any("aim_restore_tmp" in c for c in calls)
    assert not any("run-shell" in c for c in calls)
    assert "startup.sh " in calls


def test_boot_restore_honors_auto_restore_on_boot_false_setting(tmp_path):
    """#299/#300: When auto_restore_on_boot is false in ~/.aim_tmux_settings.json, boot-restore.sh skips restore.sh and boots startup.sh only."""
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    calls_log = tmp_path / "calls.log"
    calls_log.write_text("", encoding="utf-8")

    _write_exe(
        bin_dir / "tmux",
        f"""
echo "tmux $*" >> "{calls_log}"
if [ "$1" = "has-session" ]; then
    exit 1
fi
exit 0
""",
    )
    restore_sh = _write_exe(tmp_path / "restore.sh", f'echo "restore" >> "{calls_log}"')
    startup_sh = _write_exe(tmp_path / "startup.sh", f'echo "startup.sh $*" >> "{calls_log}"')
    last_snapshot = tmp_path / "last"
    last_snapshot.write_text("pane\taim-connect\t0\n", encoding="utf-8")
    settings_json = tmp_path / "settings.json"
    settings_json.write_text('{"auto_restore_on_boot": false}\n', encoding="utf-8")

    env = os.environ.copy()
    env["PATH"] = f"{bin_dir}:{env.get('PATH', '')}"
    env["AIM_RESURRECT_RESTORE_SCRIPT"] = str(restore_sh)
    env["AIM_RESURRECT_LAST_FILE"] = str(last_snapshot)
    env["AIM_TMUX_SETTINGS_FILE"] = str(settings_json)
    env["AIM_BOOT_RESTORE_WAIT_SECONDS"] = "0"
    env["AIM_STARTUP_SCRIPT"] = str(startup_sh)

    res = subprocess.run(
        ["bash", str(BOOT_RESTORE_SH)],
        cwd=str(WORKTREE_ROOT),
        env=env,
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert res.returncode == 0, res.stderr
    calls = calls_log.read_text(encoding="utf-8").splitlines()
    assert not any("aim_restore_tmp" in c for c in calls)
    assert not any("run-shell" in c for c in calls)
    assert "startup.sh " in calls


def test_install_headless_boot_renders_user_unit_and_preserves_existing_tmux_conf(tmp_path):
    """#299: install-headless-boot.sh installs systemd user unit and respects existing @resurrect-processes."""
    fake_home = tmp_path / "home"
    fake_home.mkdir()
    tmux_conf = fake_home / ".tmux.conf"

    env = os.environ.copy()
    env["HOME"] = str(fake_home)
    env["XDG_CONFIG_HOME"] = str(fake_home / ".config")
    env["AIM_TMUX_CONF"] = str(tmux_conf)
    env["AIM_SKIP_SYSTEMCTL"] = "1"

    res = subprocess.run(
        ["bash", str(INSTALL_HEADLESS_SH), "--install", "--configure-tmux"],
        cwd=str(WORKTREE_ROOT),
        env=env,
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert res.returncode == 0, res.stderr

    unit_file = fake_home / ".config" / "systemd" / "user" / "aim-connect-boot.service"
    assert unit_file.is_file()
    unit_text = unit_file.read_text(encoding="utf-8")
    assert f"ExecStart=/bin/bash {WORKTREE_ROOT}/scripts/boot-restore.sh" in unit_text

    conf_text = tmux_conf.read_text(encoding="utf-8")
    assert "@resurrect-capture-pane-contents 'on'" in conf_text
    # #313: agents relaunch through the exact per-pane resume script (no blanket -c rules)
    resume_py = str(WORKTREE_ROOT / "scripts" / "aim_pane_resume.py")
    for harness in ("agy", "grok", "opencode", "codex", "claude", "gemini"):
        assert f'"~{harness}->python3 {resume_py} {harness}"' in conf_text
    assert f"set -g @resurrect-hook-post-save-all 'python3 {resume_py} --capture'" in conf_text
    assert ' -c"' not in conf_text

    # Custom user rule must NOT be overwritten on subsequent --configure-tmux runs
    custom_conf = "set -g @resurrect-processes '\"~agy->agy --dangerously-skip-permissions -c\"'\n"
    tmux_conf.write_text(custom_conf, encoding="utf-8")
    res2 = subprocess.run(
        ["bash", str(INSTALL_HEADLESS_SH), "--configure-tmux"],
        cwd=str(WORKTREE_ROOT),
        env=env,
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert res2.returncode == 0, res2.stderr
    assert tmux_conf.read_text(encoding="utf-8").count("@resurrect-processes") == 1
    assert "--dangerously-skip-permissions -c" in tmux_conf.read_text(encoding="utf-8")

    # Uninstall cleans up unit file
    res3 = subprocess.run(
        ["bash", str(INSTALL_HEADLESS_SH), "--uninstall"],
        cwd=str(WORKTREE_ROOT),
        env=env,
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert res3.returncode == 0, res3.stderr
    assert not unit_file.exists()


def test_wslconfig_merge_preserves_mirrored_networking_and_sets_idle_timeout(tmp_path):
    """#299: wsl_config_merge.py preserves existing [wsl2] keys, CRLF endings, and adds vmIdleTimeout=-1."""
    mod = load_wsl_merge_module(WORKTREE_ROOT)

    sample = "[wsl2]\r\nnetworkingMode=mirrored\r\nlocalhostForwarding=true"
    merged, changed = mod.merge_wslconfig_text(sample)
    assert changed is True
    assert "\r\n" in merged
    assert "networkingMode=mirrored" in merged
    assert "localhostForwarding=true" in merged
    assert "vmIdleTimeout=-1" in merged

    # Idempotent second pass
    merged_again, changed_again = mod.merge_wslconfig_text(merged)
    assert changed_again is False
    assert merged_again == merged

    # Disk write + backup creation
    cfg_path = tmp_path / ".wslconfig"
    cfg_path.write_text(sample, encoding="utf-8")
    assert mod.ensure_wslconfig_file(cfg_path) is True
    assert (tmp_path / ".wslconfig.bak").is_file()
    assert mod.ensure_wslconfig_file(cfg_path) is False


def test_windows_keepalive_script_never_calls_wsl_shutdown_and_has_no_personal_paths():
    """#299: Verify PowerShell keepalive installer uses zero-window wscript.exe and never runs wsl --shutdown."""
    ps_text = WSL_KEEPALIVE_PS1.read_text(encoding="utf-8")
    assert "vmIdleTimeout=-1" in ps_text
    assert "wscript.exe" in ps_text
    assert "sleep infinity" in ps_text
    assert "wsl --shutdown" not in ps_text
    assert "wsl.exe --shutdown" not in ps_text
    assert SYSTEMD_UNIT_TEMPLATE.is_file()
