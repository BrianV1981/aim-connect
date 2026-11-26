import json
import subprocess
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import main
import tmux_workspace_manager as twm

WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
TMUX_WS_UTILS_JS = FRONTEND_SRC / "tmuxWorkspaceUtils.js"


@pytest.fixture
def admin_token():
    tok = "test-admin-token-300"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


@pytest.fixture
def tenant_token():
    tok = "test-tenant-token-300"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "tenant@example.com",
        "role": "customer",
        "prefix": "agent-tenant",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_empty_save_guardrail_parity_with_aim_tmux_dashboard(tmp_path, monkeypatch):
    """#300 / #47: Empty-Save Guardrail warns when active_count <= 1 or active_count * 2 <= saved_count."""
    last_file = tmp_path / "last"
    last_file.write_text(
        "pane\taim-connect\t0\n"
        "pane\taim-connect\t1\n"
        "pane\taim-ld\t0\n"
        "pane\taim-joshua\t0\n"
        "pane\taim-dash\t0\n"
        "window\taim-connect\t0\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("AIM_TMUX_RESURRECT_LAST", str(last_file))

    saved_cnt, mtime = twm.get_saved_resurrect_session_count(home_dir=str(tmp_path))
    assert saved_cnt == 4
    assert mtime is not None

    warn_zero, msg_zero = twm.should_warn_before_save(0, 4)
    assert warn_zero is True and "4 sessions" in msg_zero

    warn_one, _ = twm.should_warn_before_save(1, 4)
    assert warn_one is True

    warn_half, msg_half = twm.should_warn_before_save(2, 4)
    assert warn_half is True and "compared to 4" in msg_half

    warn_healthy, msg_healthy = twm.should_warn_before_save(3, 4)
    assert warn_healthy is False and msg_healthy == ""


def test_resurrect_save_and_cold_boot_restore_endpoints(tmp_path, monkeypatch, admin_token, tenant_token):
    """#300 / #37 / #47: Verify admin guard, confirm_required guardrail, force save, and dead-daemon aim_restore_tmp restore."""
    resurrect_dir = tmp_path / "scripts"
    resurrect_dir.mkdir()
    save_sh = resurrect_dir / "save.sh"
    restore_sh = resurrect_dir / "restore.sh"
    save_sh.write_text("#!/bin/bash\n", encoding="utf-8")
    restore_sh.write_text("#!/bin/bash\n", encoding="utf-8")
    last_file = tmp_path / "last"
    last_file.write_text(
        "pane\taim-connect\t0\npane\taim-ld\t0\npane\taim-joshua\t0\npane\taim-dash\t0\n",
        encoding="utf-8",
    )

    monkeypatch.setenv("AIM_TMUX_RESURRECT_DIR", str(resurrect_dir))
    monkeypatch.setenv("AIM_TMUX_RESURRECT_LAST", str(last_file))
    monkeypatch.setenv("AIM_TMUX_SETTINGS_FILE", str(tmp_path / "tmux_settings.json"))
    monkeypatch.setenv("AIM_DASHBOARD_CONFIG_FILE", str(tmp_path / "dash.json"))
    monkeypatch.setenv("AIM_TMUX_CONF", str(tmp_path / ".tmux.conf"))

    client = TestClient(main.app)

    # Tenant token must be rejected (403)
    forbidden = client.get("/api/tmux/resurrect/status", headers={"x-api-token": tenant_token})
    assert forbidden.status_code == 403

    mock_hierarchy_low = {"aim-connect": {"windows": {"@1": {"active": True, "panes": []}}}}

    with (
        patch("tmux_workspace_manager.get_active_tmux_hierarchy", return_value=mock_hierarchy_low),
        patch("tmux_workspace_manager.capture_and_store_pane_sessions", return_value={"panes": {}}) as mock_capture,
        patch("tmux_workspace_manager.subprocess.run") as mock_run,
    ):
        status_resp = client.get("/api/tmux/resurrect/status", headers={"x-api-token": admin_token})
        assert status_resp.status_code == 200
        st = status_resp.json()
        assert st["installed"] is True
        assert st["active_session_count"] == 1
        assert st["saved_session_count"] == 4
        assert st["should_warn"] is True

        # Save without force -> confirm_required, nothing captured or executed
        save_guard = client.post(
            "/api/tmux/resurrect/save",
            json={"force": False},
            headers={"x-api-token": admin_token},
        )
        assert save_guard.status_code == 200
        assert save_guard.json()["status"] == "confirm_required"
        mock_run.assert_not_called()
        mock_capture.assert_not_called()

        # Save with force=True -> captures pane sessions, then runs save.sh synchronously via tmux run-shell (#313)
        save_forced = client.post(
            "/api/tmux/resurrect/save",
            json={"force": True},
            headers={"x-api-token": admin_token},
        )
        assert save_forced.status_code == 200
        # save.sh is a no-op fixture here, so the snapshot is honestly reported as unverified (#313)
        assert save_forced.json()["status"] == "save_unverified"
        mock_capture.assert_called_once()
        assert mock_run.call_args[0][0] == ["tmux", "run-shell", str(save_sh)]

    # Cold-boot restore when tmux daemon is dead (has-session rc=1) -> aim_restore_tmp bootstrap
    dead_check = MagicMock(returncode=1)
    with (
        patch("tmux_workspace_manager.subprocess.run", return_value=dead_check),
        patch("tmux_workspace_manager.subprocess.Popen") as mock_popen_restore,
    ):
        restore_resp = client.post("/api/tmux/resurrect/restore", headers={"x-api-token": admin_token})
        assert restore_resp.status_code == 200
        rdata = restore_resp.json()
        assert rdata["status"] == "restoring"
        assert rdata["bootstrapped_daemon"] is True
        popen_args = mock_popen_restore.call_args[0][0]
        assert popen_args[0] == "bash" and popen_args[1] == "-c"
        assert "aim_restore_tmp" in popen_args[2]
        assert str(restore_sh) in popen_args[2]


def test_fast_resume_reuses_idle_shell_or_spawns_persistent_window(tmp_path, monkeypatch, admin_token):
    """#300 / #38 / #49: Fast Resume (-c) reuses idle bash panes and wraps busy panes in bash -ic '<agent> -c; exec bash'."""
    monkeypatch.setenv("AIM_TMUX_SETTINGS_FILE", str(tmp_path / "tmux_settings.json"))
    monkeypatch.setenv("AIM_DASHBOARD_CONFIG_FILE", str(tmp_path / "dash.json"))
    monkeypatch.setenv("AIM_TMUX_CONF", str(tmp_path / ".tmux.conf"))
    client = TestClient(main.app)

    idle_hierarchy = {
        "aim-alpha": {
            "windows": {
                "@1": {
                    "active": True,
                    "panes": [{"id": "%11", "cmd": "bash", "active": True, "path": "/tmp/aim-alpha"}],
                }
            }
        }
    }
    with (
        patch("tmux_workspace_manager.get_active_tmux_hierarchy", return_value=idle_hierarchy),
        patch("tmux_workspace_manager.resolve_agent_binary", return_value="agy"),
        patch("tmux_workspace_manager.subprocess.run") as mock_run,
    ):
        resp = client.post(
            "/api/sessions/aim-alpha/fast-resume",
            json={},
            headers={"x-api-token": admin_token},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["mode"] == "reused-pane"
        assert body["command"] == "agy -c"
        mock_run.assert_called_once_with(
            ["tmux", "send-keys", "-t", "%11", "agy -c", "Enter"],
            check=True,
            capture_output=True,
            text=True,
        )

    busy_hierarchy = {
        "aim-beta": {
            "windows": {
                "@2": {
                    "active": True,
                    "panes": [{"id": "%22", "cmd": "htop", "active": True, "path": "/tmp/aim-beta"}],
                }
            }
        }
    }
    with (
        patch("tmux_workspace_manager.get_active_tmux_hierarchy", return_value=busy_hierarchy),
        patch("tmux_workspace_manager.subprocess.run") as mock_run_busy,
    ):
        resp2 = client.post(
            "/api/sessions/aim-beta/fast-resume",
            json={"agent": "grok"},
            headers={"x-api-token": admin_token},
        )
        assert resp2.status_code == 200
        body2 = resp2.json()
        assert body2["mode"] == "new-window"
        assert body2["command"] == "grok -c"
        called_cmd = mock_run_busy.call_args[0][0]
        assert called_cmd[:7] == ["tmux", "new-window", "-t", "aim-beta", "-c", "/tmp/aim-beta", "-n"]
        assert "bash -ic 'grok -c; exec bash'" in called_cmd[8]


def test_discover_git_repos_and_create_session_with_cwd_and_resume_agent(tmp_path, monkeypatch, admin_token):
    """#300 / #48: GET /api/projects/repos discovers repos (ignoring bloat/.bak) and POST /api/sessions supports cwd + agent -c."""
    repo_active = tmp_path / "repo-alpha"
    (repo_active / ".git").mkdir(parents=True)
    repo_offline = tmp_path / "nested" / "repo.beta"
    (repo_offline / ".git").mkdir(parents=True)
    repo_bak = tmp_path / "repo-alpha.bak"
    (repo_bak / ".git").mkdir(parents=True)
    repo_venv = tmp_path / "venv" / "hidden-repo"
    (repo_venv / ".git").mkdir(parents=True)

    monkeypatch.setenv("AIM_PROJECT_SEARCH_PATHS", str(tmp_path))
    monkeypatch.setenv("AIM_TMUX_SETTINGS_FILE", str(tmp_path / "tmux_settings.json"))
    monkeypatch.setenv("AIM_DASHBOARD_CONFIG_FILE", str(tmp_path / "dash.json"))
    monkeypatch.setenv("AIM_TMUX_CONF", str(tmp_path / ".tmux.conf"))

    mock_hierarchy = {
        "repo-alpha": {
            "windows": {
                "@1": {"active": True, "panes": [{"id": "%1", "cmd": "agy", "active": True, "path": str(repo_active)}]}
            }
        }
    }

    client = TestClient(main.app)
    with patch("tmux_workspace_manager.get_active_tmux_hierarchy", return_value=mock_hierarchy):
        repos_resp = client.get("/api/projects/repos", headers={"x-api-token": admin_token})
        assert repos_resp.status_code == 200
        repos = repos_resp.json()["repos"]
        names = [r["name"] for r in repos]
        assert names == ["repo-alpha", "repo.beta"]
        assert repos[0]["active"] is True
        assert repos[1]["active"] is False
        assert repos[1]["session_name"] == "repo-beta"

    ok_proc = MagicMock(returncode=0, stderr="")
    with patch("routes_sessions.subprocess.run", return_value=ok_proc) as mock_create_run:
        spawn_resp = client.post(
            "/api/sessions",
            json={
                "name": "repo-beta",
                "cwd": str(repo_offline),
                "agent": "opencode",
                "resume": True,
            },
            headers={"x-api-token": admin_token},
        )
        assert spawn_resp.status_code == 200
        sdata = spawn_resp.json()
        assert sdata["status"] == "success"
        assert sdata["launched"] == "opencode -c"

        calls = [c[0][0] for c in mock_create_run.call_args_list]
        assert ["tmux", "new-session", "-d", "-s", "repo-beta", "-c", str(repo_offline.resolve())] in calls
        assert ["tmux", "send-keys", "-t", "repo-beta", "opencode -c", "Enter"] in calls


def test_frontend_tmux_workspace_utils_and_ui_wiring():
    """#300: Verify tmuxWorkspaceUtils.js in Node and verify CommandPalette, SpawnSessionModal, FleetSidebar, and App.jsx wiring."""
    assert TMUX_WS_UTILS_JS.is_file()

    script = f"""
import {{
  sanitizeRepoSessionName,
  filterProjectRepos,
  buildSpawnSessionPayload,
}} from {json.dumps(TMUX_WS_UTILS_JS.as_uri())};

const repos = [
  {{ name: 'aim-connect', session_name: 'aim-connect', short_path: '~/aim-connect', active: true }},
  {{ name: 'aim-ld', session_name: 'aim-ld', short_path: '~/aim-ld', active: false }},
];

console.log(JSON.stringify({{
  sanitized: sanitizeRepoSessionName('my.repo:v2'),
  offlineFiltered: filterProjectRepos(repos, 'offline').map((r) => r.name),
  stringPayload: buildSpawnSessionPayload('aim-node'),
  repoPayload: buildSpawnSessionPayload({{ name: 'aim-ld', cwd: '/tmp/aim-ld', agent: 'agy', resume: true }}),
  shellPayload: buildSpawnSessionPayload({{ name: 'aim-sh', cwd: '/tmp/aim-sh', agent: 'shell', resume: true }}),
}}));
"""
    proc = subprocess.run(["node", "--input-type=module", "-e", script], capture_output=True, text=True, timeout=5)
    assert proc.returncode == 0, proc.stderr
    out = json.loads(proc.stdout.strip())
    assert out["sanitized"] == "my-repo-v2"
    assert out["offlineFiltered"] == ["aim-ld"]
    assert out["stringPayload"] == {"name": "aim-node"}
    assert out["repoPayload"] == {"name": "aim-ld", "cwd": "/tmp/aim-ld", "agent": "agy", "resume": True}
    assert out["shellPayload"] == {"name": "aim-sh", "cwd": "/tmp/aim-sh"}

    palette_jsx = (FRONTEND_SRC / "components" / "CommandPalette.jsx").read_text(encoding="utf-8")
    spawn_jsx = (FRONTEND_SRC / "components" / "SpawnSessionModal.jsx").read_text(encoding="utf-8")
    save_modal_jsx = (FRONTEND_SRC / "components" / "ResurrectSaveModal.jsx").read_text(encoding="utf-8")
    fleet_jsx = (FRONTEND_SRC / "components" / "FleetSidebar.jsx").read_text(encoding="utf-8")
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")

    assert "Workspace: Save Tmux State" in palette_jsx
    assert "Workspace: Restore Tmux State" in palette_jsx
    assert "Agent: Fast Resume (latest)" in palette_jsx
    assert "Project: Open Local Git Repo" in palette_jsx
    assert "/api/projects/repos" in spawn_jsx
    assert "EMPTY-SAVE GUARDRAIL" in save_modal_jsx
    assert "onFastResumeSession" in fleet_jsx
    assert "/api/tmux/resurrect/save" in app_jsx
    assert "/api/tmux/resurrect/restore" in app_jsx
    assert "/fast-resume" in app_jsx

    settings_jsx = (FRONTEND_SRC / "components" / "SettingsModal.jsx").read_text(encoding="utf-8")
    assert "TMUX & BOOT" in settings_jsx
    assert "/api/tmux/settings" in settings_jsx
    assert "/api/tmux/host-control" in settings_jsx


def test_all_5_tmux_and_boot_settings_persistence_and_sync(tmp_path, monkeypatch, admin_token):
    """#300: Verify all 5 TMUX & BOOT settings (harness/-c/skip-perms, boot auto-restore, host status, guardrail/bar, search_paths)."""
    settings_file = tmp_path / "tmux_settings.json"
    dash_file = tmp_path / "aim_dashboard.json"
    tmux_conf = tmp_path / ".tmux.conf"
    wsl_cfg = tmp_path / ".wslconfig"
    resurrect_dir = tmp_path / "scripts"
    resurrect_dir.mkdir()
    (resurrect_dir / "save.sh").write_text("#!/bin/bash\n", encoding="utf-8")
    (resurrect_dir / "restore.sh").write_text("#!/bin/bash\n", encoding="utf-8")
    last_file = tmp_path / "last"
    last_file.write_text("pane\taim-connect\t0\npane\taim-ld\t0\npane\taim-joshua\t0\n", encoding="utf-8")

    # Existing aim-dash UI layout keys must be preserved when updating search_paths
    dash_file.write_text(json.dumps({"pane_split_percent": 40, "search_paths": ["/opt/existing"]}), encoding="utf-8")
    wsl_cfg.write_text("[wsl2]\nvmIdleTimeout=-1\n", encoding="utf-8")

    monkeypatch.setenv("AIM_TMUX_SETTINGS_FILE", str(settings_file))
    monkeypatch.setenv("AIM_DASHBOARD_CONFIG_FILE", str(dash_file))
    monkeypatch.setenv("AIM_TMUX_CONF", str(tmux_conf))
    monkeypatch.setenv("AIM_WSLCONFIG_PATH", str(wsl_cfg))
    monkeypatch.setenv("AIM_TMUX_RESURRECT_DIR", str(resurrect_dir))
    monkeypatch.setenv("AIM_TMUX_RESURRECT_LAST", str(last_file))

    client = TestClient(main.app)

    init_resp = client.get("/api/tmux/settings", headers={"x-api-token": admin_token})
    assert init_resp.status_code == 200
    init_data = init_resp.json()
    assert init_data["settings"]["search_paths"] == ["/opt/existing"]
    assert init_data["host_status"]["wsl_idle_timeout_configured"] is True

    with patch("tmux_workspace_manager.subprocess.run") as mock_tmux_source:
        upd_resp = client.put(
            "/api/tmux/settings",
            json={
                "default_agent": "agy",
                "auto_resume_c": True,
                "skip_permissions": True,
                "auto_restore_on_boot": False,
                "empty_save_guardrail": False,
                "show_sidebar_resurrect_bar": False,
                "search_paths": ["/mnt/d/projects", "~/work"],
                "sync_tmux_conf": True,
            },
            headers={"x-api-token": admin_token},
        )
    assert upd_resp.status_code == 200
    saved = upd_resp.json()["settings"]
    assert saved["skip_permissions"] is True
    assert saved["auto_restore_on_boot"] is False
    assert saved["empty_save_guardrail"] is False
    assert saved["show_sidebar_resurrect_bar"] is False
    assert saved["search_paths"] == ["/mnt/d/projects", "~/work"]

    # Verify ~/.aim_dashboard.json preserved pane_split_percent while syncing search_paths
    dash_after = json.loads(dash_file.read_text(encoding="utf-8"))
    assert dash_after["pane_split_percent"] == 40
    assert dash_after["search_paths"] == ["/mnt/d/projects", "~/work"]

    # Verify ~/.tmux.conf routes agents through the exact per-pane resume script (#313), keeping agy's skip flag
    conf_txt = tmux_conf.read_text(encoding="utf-8")
    assert "aim_pane_resume.py agy --dangerously-skip-permissions\"" in conf_txt
    assert "aim_pane_resume.py grok\"" in conf_txt

    # Verify empty_save_guardrail=False bypasses confirm_required even with 1 active session
    low_h = {"aim-connect": {"windows": {"@1": {"active": True, "panes": []}}}}
    with (
        patch("tmux_workspace_manager.get_active_tmux_hierarchy", return_value=low_h),
        patch("tmux_workspace_manager.capture_and_store_pane_sessions", return_value={"panes": {}}),
        patch("tmux_workspace_manager.subprocess.run") as mock_run,
    ):
        save_resp = client.post("/api/tmux/resurrect/save", json={"force": False}, headers={"x-api-token": admin_token})
        assert save_resp.status_code == 200
        assert save_resp.json()["status"] in ("saved", "save_unverified")
        mock_run.assert_called_once()
