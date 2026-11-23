import json
import time
from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient

import main
import routes_browser
import routes_sessions


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"


def test_waiting_for_human_status_fleet_propagation_passive_ttl_and_clear_human(monkeypatch, tmp_path):
    """#275: Verify waitingForHuman enrichment, Fleet WAITING propagation, PASSIVE_TOKEN_ENDPOINTS invariance, and 3FA clear-human."""
    state_dir = tmp_path / "aim-browser-state"
    state_dir.mkdir()
    monkeypatch.setenv("AIM_BROWSER_STATE_DIR", str(state_dir))
    monkeypatch.setenv("AIM_BROWSER_CDP_PORT", "65433")

    now_ms = int(time.time() * 1000)
    leases_file = state_dir / "leases.json"
    leases_file.write_text(
        json.dumps(
            {
                "subagent-login": {
                    "lease": "subagent-login",
                    "targetId": "TAB_LOGIN_1",
                    "actor": "subagent-login",
                    "session": "aim-connect",
                    "url": "https://accounts.example.com/2fa",
                    "title": "Two-Factor Verification",
                    "updatedAt": now_ms,
                    "waitingForHuman": {
                        "reason": "Complete Google Authenticator 2FA code",
                        "requestedAt": now_ms - 500,
                    },
                }
            }
        )
    )

    # Mock CDP /json/version and /json/list so /api/browser/status enriches live tabs
    async def _fake_cdp_json(path: str, method: str = "GET", timeout: float = 2.0):
        if path == "/json/version":
            return {"Browser": "Chrome/144.0.0.0"}
        if path == "/json/list":
            return [
                {
                    "id": "TAB_LOGIN_1",
                    "type": "page",
                    "title": "Two-Factor Verification",
                    "url": "https://accounts.example.com/2fa",
                    "webSocketDebuggerUrl": "ws://127.0.0.1:65433/devtools/page/TAB_LOGIN_1",
                }
            ]
        return {}

    monkeypatch.setattr(routes_browser, "_cdp_http_json", _fake_cdp_json)

    # Mock tmux list-panes + capture-pane where aim-connect pane is THINKING (active subagent),
    # proving browser waitingForHuman overrides THINKING -> WAITING so ✋ Waiting chimes fire!
    def _fake_tmux_run(cmd, *args, **kwargs):
        if cmd[:3] == ["tmux", "ls", "-F"]:
            return SimpleNamespace(returncode=0, stdout="aim-connect\naim-other\n", stderr="")
        if cmd[:3] == ["tmux", "list-panes", "-a"]:
            lines = (
                "aim-connect@@@0@@@main@@@0@@@agy@@@/tmp/aim-connect@@@1001@@@1@@@1700000001\n"
                "aim-other@@@0@@@main@@@0@@@agy@@@/tmp/aim-other@@@1002@@@1@@@1700000001\n"
            )
            return SimpleNamespace(returncode=0, stdout=lines, stderr="")
        if cmd[:2] == ["tmux", "capture-pane"]:
            target = cmd[cmd.index("-t") + 1]
            if target.startswith("aim-connect:"):
                # Active subagent spinner in footer -> normally THINKING without browser hold
                body = "⠋ Running 1 subagent(s)\n" + ("─" * 30) + "\n> \n" + ("─" * 30) + "\n120k in | 4k out\n"
            else:
                body = "Done.\n" + ("─" * 30) + "\n> \n" + ("─" * 30) + "\n40k in | 1k out\n"
            return SimpleNamespace(returncode=0, stdout=body, stderr="")
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.setattr(routes_sessions.subprocess, "run", _fake_tmux_run)

    admin_tok = "w" * 64
    user_tok = "t" * 64
    initial_exp = time.time() + 900.0
    main.VALID_API_TOKENS[admin_tok] = {
        "expires": initial_exp,
        "user": "operator",
        "role": "admin",
        "prefix": "",
    }
    main.VALID_API_TOKENS[user_tok] = {
        "expires": initial_exp,
        "user": "tenant",
        "role": "user",
        "prefix": "agent-tenant",
    }

    try:
        client = TestClient(main.app)
        admin_headers = {"X-API-Token": admin_tok}

        # 1. GET /api/browser/status surfaces waitingForHuman on tab & waiting_leases WITHOUT sliding passive TTL
        r_status = client.get("/api/browser/status", headers=admin_headers)
        assert r_status.status_code == 200
        st_json = r_status.json()
        assert st_json["tabs"][0]["waitingForHuman"] == {
            "reason": "Complete Google Authenticator 2FA code",
            "requestedAt": now_ms - 500,
        }
        assert len(st_json["waiting_leases"]) == 1
        assert st_json["waiting_leases"][0]["lease"] == "subagent-login"
        assert main.VALID_API_TOKENS[admin_tok]["expires"] == initial_exp

        # 2. GET /api/sessions propagates waitingForHuman into Fleet WAITING status WITHOUT sliding passive TTL
        r_sess = client.get("/api/sessions", headers=admin_headers)
        assert r_sess.status_code == 200
        fleet_by_name = {f["session_name"]: f for f in r_sess.json()["fleet"]}
        assert fleet_by_name["aim-connect"]["status"] == "WAITING"
        assert fleet_by_name["aim-connect"]["browser_waiting_for_human"]["lease"] == "subagent-login"
        assert (
            fleet_by_name["aim-connect"]["browser_waiting_for_human"]["reason"]
            == "Complete Google Authenticator 2FA code"
        )
        assert fleet_by_name["aim-other"]["status"] == "IDLE"
        assert fleet_by_name["aim-other"]["browser_waiting_for_human"] is None
        assert main.VALID_API_TOKENS[admin_tok]["expires"] == initial_exp

        # 3. 3FA guardrails on POST /api/browser/leases/{lease}/clear-human
        assert client.post("/api/browser/leases/subagent-login/clear-human").status_code == 401
        assert (
            client.post(
                "/api/browser/leases/subagent-login/clear-human",
                headers={"X-API-Token": user_tok},
            ).status_code
            == 403
        )
        assert (
            client.post(
                "/api/browser/leases/bad%20lease!/clear-human",
                headers=admin_headers,
            ).status_code
            == 400
        )

        # 4. Admin clear-human clears waitingForHuman, slides active 4h TTL, and returns Fleet to THINKING
        r_clear = client.post(
            "/api/browser/leases/subagent-login/clear-human",
            headers=admin_headers,
        )
        assert r_clear.status_code == 200
        clear_json = r_clear.json()
        assert clear_json["cleared"] is True
        assert clear_json["waiting_leases"] == []
        assert clear_json["tabs"][0]["waitingForHuman"] is None
        assert main.VALID_API_TOKENS[admin_tok]["expires"] > initial_exp

        r_sess_after = client.get("/api/sessions", headers=admin_headers)
        fleet_after = {f["session_name"]: f for f in r_sess_after.json()["fleet"]}
        assert fleet_after["aim-connect"]["status"] == "THINKING"
        assert fleet_after["aim-connect"]["browser_waiting_for_human"] is None
    finally:
        main.VALID_API_TOKENS.pop(admin_tok, None)
        main.VALID_API_TOKENS.pop(user_tok, None)


def test_issue_275_browser_takeover_banner_ui_contracts():
    """#275: Verify BrowserPane, FleetSidebar, App, and App.css wire TAKE CONTROL & 2FA, RESUME AGENT, and amber tab pulse."""
    browser_jsx = (FRONTEND_SRC / "components" / "BrowserPane.jsx").read_text(encoding="utf-8")
    sidebar_jsx = (FRONTEND_SRC / "components" / "FleetSidebar.jsx").read_text(encoding="utf-8")
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    css = (FRONTEND_SRC / "App.css").read_text(encoding="utf-8")

    assert "TAKE CONTROL & 2FA" in browser_jsx
    assert "RESUME AGENT" in browser_jsx
    assert "/clear-human" in browser_jsx
    assert "waiting-human-tab" in browser_jsx
    assert "browser-human-gate-banner" in browser_jsx
    assert "BROWSER 2FA / LOGIN" in sidebar_jsx
    assert "onSendSessionCommand={sendSessionCommand}" in app_jsx
    assert ".browser-human-gate-banner" in css
    assert ".cp-tab.waiting-human-tab" in css
