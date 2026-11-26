import json
import os
import subprocess
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import main
from tests.scripts_wsl_helper_loader import load_wsl_merge_module

WORKTREE_ROOT = Path(__file__).resolve().parents[2]
WSL_KEEPALIVE_SH = WORKTREE_ROOT / "scripts" / "wsl-keepalive.sh"
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"


@pytest.fixture
def admin_token():
    tok = "test-admin-token-305"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_remove_wslconfig_idle_timeout_preserves_other_keys_and_crlf(tmp_path):
    """#305: Removing vmIdleTimeout=-1 preserves networkingMode=mirrored, localhostForwarding, and CRLF."""
    mod = load_wsl_merge_module(WORKTREE_ROOT)
    sample = "[wsl2]\r\nnetworkingMode=mirrored\r\nlocalhostForwarding=true\r\nvmIdleTimeout=-1\r\n"

    cleaned, changed = mod.remove_wslconfig_idle_timeout_text(sample)
    assert changed is True
    assert "\r\n" in cleaned
    assert "networkingMode=mirrored" in cleaned
    assert "localhostForwarding=true" in cleaned
    assert "vmIdleTimeout" not in cleaned

    # Idempotent second pass
    cleaned_again, changed_again = mod.remove_wslconfig_idle_timeout_text(cleaned)
    assert changed_again is False
    assert cleaned_again == cleaned

    cfg_file = tmp_path / ".wslconfig"
    cfg_file.write_text(sample, encoding="utf-8")
    assert mod.remove_wslconfig_idle_timeout_file(cfg_file) is True
    assert "vmIdleTimeout" not in cfg_file.read_text(encoding="utf-8")
    assert (tmp_path / ".wslconfig.bak").is_file()
    assert mod.remove_wslconfig_idle_timeout_file(cfg_file) is False


def test_wsl_keepalive_cli_on_status_and_off_roundtrip(tmp_path):
    """#305: scripts/wsl-keepalive.sh on -> status -> off cleanly enables and reverts all artifacts."""
    win_home = tmp_path / "win_user"
    startup_dir = win_home / "AppData" / "Roaming" / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"
    startup_dir.mkdir(parents=True)
    wsl_cfg = win_home / ".wslconfig"
    wsl_cfg.write_text("[wsl2]\r\nnetworkingMode=mirrored\r\n", encoding="utf-8")

    env = os.environ.copy()
    env["AIM_WIN_HOME"] = str(win_home)
    env["AIM_SKIP_WIN_EXEC"] = "1"
    env["AIM_WSL_DISTRO"] = "Ubuntu"
    env["AIM_KEEPALIVE_PROC_NAME"] = "aim_wsl_keepalive_sleep_test305"

    try:
        # 1. Enable Always-On
        on_res = subprocess.run(
            ["bash", str(WSL_KEEPALIVE_SH), "on"],
            cwd=str(WORKTREE_ROOT),
            env=env,
            capture_output=True,
            text=True,
            timeout=10,
        )
        assert on_res.returncode == 0, on_res.stderr
        assert "vmIdleTimeout=-1" in wsl_cfg.read_text(encoding="utf-8")
        assert "networkingMode=mirrored" in wsl_cfg.read_text(encoding="utf-8")
        vbs_file = startup_dir / "aim-wsl-keepalive.vbs"
        assert vbs_file.is_file()
        vbs_body = vbs_file.read_text(encoding="utf-8")
        assert "WScript.Shell" in vbs_body
        assert "wsl.exe -d Ubuntu" in vbs_body
        assert "aim_wsl_keepalive_sleep" in vbs_body

        st_on = subprocess.run(
            ["bash", str(WSL_KEEPALIVE_SH), "status", "--json"],
            cwd=str(WORKTREE_ROOT),
            env=env,
            capture_output=True,
            text=True,
            timeout=10,
        )
        assert st_on.returncode == 0, st_on.stderr
        st_on_data = json.loads(st_on.stdout)
        assert st_on_data["wsl_always_on_enabled"] is True
        assert st_on_data["wsl_idle_timeout_configured"] is True
        assert st_on_data["windows_startup_installed"] is True
        assert st_on_data["wsl_keepalive_running"] is True

        # 2. Revert / Turn OFF Always-On
        off_res = subprocess.run(
            ["bash", str(WSL_KEEPALIVE_SH), "off"],
            cwd=str(WORKTREE_ROOT),
            env=env,
            capture_output=True,
            text=True,
            timeout=10,
        )
        assert off_res.returncode == 0, off_res.stderr
        assert not vbs_file.exists()
        reverted_cfg = wsl_cfg.read_text(encoding="utf-8")
        assert "vmIdleTimeout" not in reverted_cfg
        assert "networkingMode=mirrored" in reverted_cfg

        st_off = subprocess.run(
            ["bash", str(WSL_KEEPALIVE_SH), "status", "--json"],
            cwd=str(WORKTREE_ROOT),
            env=env,
            capture_output=True,
            text=True,
            timeout=10,
        )
        assert st_off.returncode == 0, st_off.stderr
        st_off_data = json.loads(st_off.stdout)
        assert st_off_data["wsl_always_on_enabled"] is False
        assert st_off_data["wsl_idle_timeout_configured"] is False
        assert st_off_data["windows_startup_installed"] is False
        assert st_off_data["wsl_keepalive_running"] is False
    finally:
        subprocess.run(["pkill", "-f", "^aim_wsl_keepalive_sleep_test305"], capture_output=True)


def test_api_tmux_host_control_enable_and_disable_wsl_always_on(tmp_path, monkeypatch, admin_token):
    """#305: POST /api/tmux/host-control toggles enable_wsl_always_on and disable_wsl_always_on."""
    win_home = tmp_path / "win_api_user"
    (win_home / "AppData" / "Roaming" / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup").mkdir(
        parents=True
    )
    (win_home / ".wslconfig").write_text("[wsl2]\r\nnetworkingMode=mirrored\r\n", encoding="utf-8")

    monkeypatch.setenv("AIM_WIN_HOME", str(win_home))
    monkeypatch.setenv("AIM_SKIP_WIN_EXEC", "1")
    monkeypatch.setenv("AIM_KEEPALIVE_PROC_NAME", "aim_wsl_keepalive_sleep_test305_api")
    monkeypatch.setattr("routes_sessions.AIM_CONNECT_ROOT", str(WORKTREE_ROOT))

    client = TestClient(main.app)
    try:
        en_resp = client.post(
            "/api/tmux/host-control",
            headers={"x-api-token": admin_token},
            json={"action": "enable_wsl_always_on"},
        )
        assert en_resp.status_code == 200
        en_host = en_resp.json()["host_status"]
        assert en_host["wsl_always_on_enabled"] is True
        assert en_host["windows_startup_installed"] is True
        assert en_host["wsl_idle_timeout_configured"] is True

        dis_resp = client.post(
            "/api/tmux/host-control",
            headers={"x-api-token": admin_token},
            json={"action": "disable_wsl_always_on"},
        )
        assert dis_resp.status_code == 200
        dis_host = dis_resp.json()["host_status"]
        assert dis_host["wsl_always_on_enabled"] is False
        assert dis_host["windows_startup_installed"] is False
        assert dis_host["wsl_idle_timeout_configured"] is False
    finally:
        subprocess.run(["pkill", "-f", "^aim_wsl_keepalive_sleep_test305_api"], capture_output=True)

    settings_jsx = (FRONTEND_SRC / "components" / "SettingsModal.jsx").read_text(encoding="utf-8")
    assert "enable_wsl_always_on" in settings_jsx
    assert "disable_wsl_always_on" in settings_jsx
    assert "TURN OFF & REVERT ALWAYS-ON" in settings_jsx
    assert "./scripts/wsl-keepalive.sh off" in settings_jsx
