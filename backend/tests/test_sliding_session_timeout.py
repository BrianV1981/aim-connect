import json
import socket
import subprocess
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect

from e2ee import encrypt_message


def test_passive_polling_does_not_renew_while_active_rest_actions_slide_ttl(monkeypatch, tmp_path):
    """Passive polls (GET /api/sessions, GET /api/fleet/panes, GET /api/swarm/activity, POST /api/tts)
    must NOT extend token expiry, whereas active user REST actions (FileExplorer context, /command, POST /api/sessions)
    MUST slide token expiry forward by TOKEN_TTL (#247).
    """
    import main

    save_calls = []
    monkeypatch.setattr(main, "save_tokens", lambda: save_calls.append(time.time()))
    monkeypatch.setattr(main, "TOKEN_TTL", 14400)
    monkeypatch.setattr(main, "TOKEN_SAVE_INTERVAL_S", 60.0, raising=False)
    if hasattr(main, "_LAST_TOKEN_DISK_SYNC"):
        monkeypatch.setattr(main, "_LAST_TOKEN_DISK_SYNC", {})

    tok = "a" * 64
    initial_exp = time.time() + 120.0
    monkeypatch.setitem(
        main.VALID_API_TOKENS,
        tok,
        {"expires": initial_exp, "user": "admin", "role": "admin", "prefix": ""},
    )

    client = TestClient(main.app)

    def _fake_tmux_run(cmd, *_a, **_kw):
        m = MagicMock(returncode=0, stderr="")
        if cmd[:2] == ["tmux", "ls"]:
            m.stdout = "aim-connect\n"
        elif cmd[:2] == ["tmux", "list-panes"]:
            m.stdout = f"aim-connect@@@0@@@main@@@0@@@bash@@@{tmp_path}@@@1000@@@1\n"
        else:
            m.stdout = ""
        return m

    with patch("routes_sessions.subprocess.run", side_effect=_fake_tmux_run), patch(
        "routes_sessions._resolve_agy_brain_tokens_by_workspace", return_value={}
    ):
        # 1. Passive 5s Fleet poll MUST NOT slide expiry
        r_poll = client.get("/api/sessions", headers={"x-api-token": tok})
        assert r_poll.status_code == 200
        assert main.VALID_API_TOKENS[tok]["expires"] == pytest.approx(initial_exp, abs=1.0)

        r_panes = client.get("/api/fleet/panes", headers={"x-api-token": tok})
        assert r_panes.status_code == 200
        assert main.VALID_API_TOKENS[tok]["expires"] == pytest.approx(initial_exp, abs=1.0)

        r_swarm = client.get("/api/swarm/activity", headers={"x-api-token": tok})
        assert r_swarm.status_code == 200
        assert main.VALID_API_TOKENS[tok]["expires"] == pytest.approx(initial_exp, abs=1.0)

        # 2. Active user action: opening File Browser (GET /api/workspace/context) MUST slide expiry to now + 14400
        before_touch = time.time()
        r_ctx = client.get(
            f"/api/workspace/context?path={main.AIM_CONNECT_ROOT}",
            headers={"x-api-token": tok},
        )
        assert r_ctx.status_code == 200
        slid_exp = main.VALID_API_TOKENS[tok]["expires"]
        assert slid_exp >= before_touch + 14395
        assert len(save_calls) == 1

        # 3. Reset expiry low again and verify clicking /handoff (POST /api/sessions/{name}/command) slides expiry
        main.VALID_API_TOKENS[tok]["expires"] = time.time() + 90.0
        with patch("routes_sessions.time.sleep"):
            r_cmd = client.post(
                "/api/sessions/aim-connect/command",
                headers={"x-api-token": tok},
                json={"command": "/aim-handoff"},
            )
        assert r_cmd.status_code == 200
        assert main.VALID_API_TOKENS[tok]["expires"] >= time.time() + 14395
        # Disk save throttled within 60s window
        assert len(save_calls) == 1


def test_ws_active_user_actions_slide_ttl_while_pings_and_resizes_do_not(monkeypatch):
    """Typing/switching in Plane A WebSocket slides token TTL by 4h (with throttled disk sync),
    whereas 10s pings and viewport resizes do NOT extend token TTL (#247).
    """
    import main
    import ws_handler

    secret = "test-e2ee-plane-a-247"
    admin_token = "b" * 64
    save_calls = []

    monkeypatch.setattr(main, "save_tokens", lambda: save_calls.append(time.time()))
    monkeypatch.setattr(main, "TOKEN_TTL", 14400)
    monkeypatch.setattr(main, "TOKEN_SAVE_INTERVAL_S", 60.0, raising=False)
    if hasattr(main, "_LAST_TOKEN_DISK_SYNC"):
        monkeypatch.setattr(main, "_LAST_TOKEN_DISK_SYNC", {})

    monkeypatch.setattr(ws_handler, "ENABLE_E2EE", True)
    monkeypatch.setattr(ws_handler, "E2EE_SECRET", secret)
    monkeypatch.setattr(ws_handler, "ALLOWED_IPS", "")
    ws_handler.auth_attempts.clear()

    initial_exp = time.time() + 150.0
    monkeypatch.setitem(
        main.VALID_API_TOKENS,
        admin_token,
        {"expires": initial_exp, "user": "admin", "role": "admin", "prefix": ""},
    )

    parent_sock, peer_sock = socket.socketpair()
    parent_fd = parent_sock.detach()

    monkeypatch.setattr(ws_handler.pty, "fork", lambda: (717171, parent_fd))
    monkeypatch.setattr(ws_handler, "set_pty_size", lambda *_a, **_k: None)
    monkeypatch.setattr(ws_handler.os, "kill", lambda *_a, **_k: None)
    monkeypatch.setattr(ws_handler.os, "waitpid", lambda *_a, **_k: (717171, 0))

    async def _noop_async_tmux(*_a, **_kw):
        return (0, "aim-connect\n", "")

    monkeypatch.setattr(ws_handler, "_run_tmux_cmd", _noop_async_tmux)
    monkeypatch.setattr(
        ws_handler.subprocess,
        "run",
        lambda args, **_kw: subprocess.CompletedProcess(args, 0, stdout="aim-connect\n", stderr=""),
    )

    client = TestClient(main.app)
    with client.websocket_connect("/ws") as ws:
        try:
            ws.send_text(
                json.dumps({"type": "auth", "token": admin_token, "harness": "admin", "session": "aim-connect"})
            )
            assert json.loads(ws.receive_text())["type"] == "auth_success"

            # 1. Automated ping + resize MUST NOT slide token expiry
            ws.send_text(encrypt_message(json.dumps({"type": "ping", "ts": 123}), secret))
            pong_raw = ws.receive_text()
            assert len(pong_raw) > 0
            ws.send_text(encrypt_message(json.dumps({"type": "resize", "rows": 40, "cols": 120}), secret))
            time.sleep(0.05)
            assert main.VALID_API_TOKENS[admin_token]["expires"] == pytest.approx(initial_exp, abs=1.0)
            assert len(save_calls) == 0

            # 2. Real terminal typing ('ls\r') MUST slide token expiry forward by 4h and throttle disk writes to 1
            for ch in ("l", "s", "\r"):
                ws.send_text(encrypt_message(json.dumps({"type": "input", "payload": ch}), secret))

            peer_sock.settimeout(2.0)
            received = b""
            while len(received) < 3:
                chunk = peer_sock.recv(64)
                if not chunk:
                    break
                received += chunk
            assert received == b"ls\r"

            assert main.VALID_API_TOKENS[admin_token]["expires"] >= time.time() + 14395
            assert len(save_calls) == 1
        finally:
            try:
                peer_sock.close()
            except OSError:
                pass


def test_ws_closes_with_1008_when_token_expires_mid_session(monkeypatch):
    """When an admin API token expires after idle timeout (or logout), the open Plane A WebSocket
    must terminate with code 1008 instead of remaining open in split-brain state (#247).
    """
    import main
    import ws_handler

    admin_token = "c" * 64
    monkeypatch.setattr(main, "save_tokens", lambda: None)
    monkeypatch.setattr(ws_handler, "ENABLE_E2EE", False)
    monkeypatch.setattr(ws_handler, "ALLOWED_IPS", "")
    monkeypatch.setattr(ws_handler, "ADMIN_KEEPALIVE_INTERVAL_S", 0.04, raising=False)
    ws_handler.auth_attempts.clear()

    monkeypatch.setitem(
        main.VALID_API_TOKENS,
        admin_token,
        {"expires": time.time() + 3600, "user": "admin", "role": "admin", "prefix": ""},
    )

    parent_sock, peer_sock = socket.socketpair()
    parent_fd = parent_sock.detach()

    monkeypatch.setattr(ws_handler.pty, "fork", lambda: (727272, parent_fd))
    monkeypatch.setattr(ws_handler, "set_pty_size", lambda *_a, **_k: None)
    monkeypatch.setattr(ws_handler.os, "kill", lambda *_a, **_k: None)
    monkeypatch.setattr(ws_handler.os, "waitpid", lambda *_a, **_k: (727272, 0))

    async def _noop_async_tmux(*_a, **_kw):
        return (0, "aim-connect\n", "")

    monkeypatch.setattr(ws_handler, "_run_tmux_cmd", _noop_async_tmux)

    client = TestClient(main.app)
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect("/ws") as ws:
            try:
                ws.send_text(
                    json.dumps({"type": "auth", "token": admin_token, "harness": "admin", "session": "aim-connect"})
                )
                assert json.loads(ws.receive_text())["type"] == "auth_success"

                # Simulate 4h idle expiry while socket is open
                main.VALID_API_TOKENS[admin_token]["expires"] = time.time() - 5.0

                # Drain any queued keepalive until inactivity_monitor closes with 1008
                for _ in range(10):
                    ws.receive_text()
            finally:
                try:
                    peer_sock.close()
                except OSError:
                    pass
    assert exc.value.code == 1008
    assert admin_token not in main.VALID_API_TOKENS


def test_expired_hex_session_token_ws_reconnect_does_not_lock_out_ip(monkeypatch):
    """Stale browser tabs reconnecting with an expired 64-char hex session token must close with 1008
    without incrementing brute-force PIN auth_attempts (#247).
    """
    import main
    import ws_handler

    monkeypatch.setattr(ws_handler, "ALLOWED_IPS", "")
    ws_handler.auth_attempts.clear()
    stale_hex_token = "d" * 64

    client = TestClient(main.app)
    for _ in range(6):
        with pytest.raises(WebSocketDisconnect) as exc:
            with client.websocket_connect("/ws") as ws:
                ws.send_text(json.dumps({"type": "auth", "token": stale_hex_token, "harness": "admin"}))
                ws.receive_text()
        assert exc.value.code == 1008

    # Client IP must NOT be locked out after 6 stale-tab reconnects
    for _, lock_until in ws_handler.auth_attempts.values():
        assert lock_until is None


def test_frontend_fetch_401_interceptor_triggers_clean_session_expiry():
    """App.jsx window.fetch wrapper must detect HTTP 401 on authenticated /api/* routes and cleanly
    expire the session without entering a WS reconnect loop (#247).
    """
    repo_root = Path(__file__).resolve().parents[2]
    app_jsx = (repo_root / "frontend" / "src" / "App.jsx").read_text(encoding="utf-8")

    assert "res.status === 401" in app_jsx
    assert "expireSession" in app_jsx
    assert "Session expired" in app_jsx
    assert "/api/webauthn/authenticate" in app_jsx
