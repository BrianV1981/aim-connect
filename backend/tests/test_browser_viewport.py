import asyncio
import json
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest
import websockets
from fastapi.testclient import TestClient

import main
import routes_browser


@pytest.fixture
def admin_and_user_tokens(monkeypatch, tmp_path):
    state_dir = tmp_path / "aim-browser-state"
    state_dir.mkdir()
    monkeypatch.setenv("AIM_BROWSER_STATE_DIR", str(state_dir))

    admin_tok = "a" * 64
    user_tok = "u" * 64
    now = time.time()
    main.VALID_API_TOKENS[admin_tok] = {
        "expires": now + 3600,
        "user": "operator",
        "role": "admin",
        "prefix": "",
    }
    main.VALID_API_TOKENS[user_tok] = {
        "expires": now + 3600,
        "user": "tenant",
        "role": "user",
        "prefix": "agent-tenant",
    }
    yield {"admin": admin_tok, "user": user_tok, "state_dir": state_dir}
    main.VALID_API_TOKENS.pop(admin_tok, None)
    main.VALID_API_TOKENS.pop(user_tok, None)


def test_browser_routes_enforce_operator_admin_3fa(admin_and_user_tokens):
    client = TestClient(main.app)

    # Unauthenticated -> 401
    assert client.get("/api/browser/status").status_code == 401

    # Non-admin user token -> 403 (never expose host loopback CDP to non-admin seats)
    r_user = client.get("/api/browser/status", headers={"X-API-Token": admin_and_user_tokens["user"]})
    assert r_user.status_code == 403

    # WS rejects non-admin & bad tokens with 1008
    with client.websocket_connect("/ws/browser") as ws:
        ws.send_text(json.dumps({"type": "auth", "token": admin_and_user_tokens["user"]}))
        with pytest.raises(Exception):
            ws.receive_text()


def test_browser_status_is_passive_for_sliding_timeout(admin_and_user_tokens, monkeypatch):
    """GET /api/browser/status must NOT slide token expiry (#247 passive poll rule)."""
    monkeypatch.setenv("AIM_BROWSER_CDP_PORT", "65431")
    client = TestClient(main.app)
    admin_tok = admin_and_user_tokens["admin"]
    initial_exp = time.time() + 600
    main.VALID_API_TOKENS[admin_tok]["expires"] = initial_exp

    res = client.get("/api/browser/status", headers={"X-API-Token": admin_tok})
    assert res.status_code == 200
    assert res.json()["running"] is False
    assert main.VALID_API_TOKENS[admin_tok]["expires"] == initial_exp


def test_anti_ssrf_cdp_ws_url_validation():
    ok = routes_browser._validate_cdp_ws_url("ws://127.0.0.1:9222/devtools/page/TAB_1", 9222)
    assert ok == "ws://127.0.0.1:9222/devtools/page/TAB_1"

    with pytest.raises(ValueError):
        routes_browser._validate_cdp_ws_url("ws://169.254.169.254:9222/devtools/page/TAB_1", 9222)
    with pytest.raises(ValueError):
        routes_browser._validate_cdp_ws_url("ws://127.0.0.1:8000/devtools/page/TAB_1", 9222)
    with pytest.raises(ValueError):
        routes_browser._validate_cdp_ws_url("http://127.0.0.1:9222/devtools/page/TAB_1", 9222)
    with pytest.raises(ValueError):
        routes_browser._validate_cdp_ws_url("ws://127.0.0.1:9222/admin", 9222)


def test_end_to_end_cdp_tabs_screencast_input_and_hud(admin_and_user_tokens, monkeypatch):
    """Verify /api/browser/tabs + /ws/browser screencast ack, input dispatch, HUD push, & teardown."""
    cdp_commands = []
    tabs_store = []

    # 1. Start mock loopback CDP WebSocket server on an ephemeral port, plus HTTP /json/* on same port?
    #Wait: CDP uses one port for HTTP & WS, or /json/list returns webSocketDebuggerUrl with that port!
    # Let's run a single websockets server with process_request serving /json/version, /json/list, /json/new, /json/close!
    ready_evt = threading.Event()
    server_info = {}

    def _run_mock_cdp():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def http_handler(connection, request):
            from websockets.datastructures import Headers
            from websockets.http11 import Response

            path = request.path
            port = server_info["port"]
            if path.startswith("/devtools/page/"):
                return None  # Upgrade to WebSocket!
            if path == "/json/version":
                body = json.dumps({"Browser": "Chrome/144.0.0.0", "webSocketDebuggerUrl": f"ws://127.0.0.1:{port}/devtools/browser/root"}).encode()
                return Response(200, "OK", Headers([("Content-Type", "application/json")]), body)
            if path == "/json/list":
                body = json.dumps(tabs_store).encode()
                return Response(200, "OK", Headers([("Content-Type", "application/json")]), body)
            if path.startswith("/json/new"):
                tid = f"TAB_{len(tabs_store) + 1}"
                url = path.split("?", 1)[1] if "?" in path else "about:blank"
                from urllib.parse import unquote
                created = {
                    "id": tid,
                    "type": "page",
                    "title": f"Mock {tid}",
                    "url": unquote(url),
                    "webSocketDebuggerUrl": f"ws://127.0.0.1:{port}/devtools/page/{tid}",
                }
                tabs_store.append(created)
                return Response(200, "OK", Headers([("Content-Type", "application/json")]), json.dumps(created).encode())
            if path.startswith("/json/close/"):
                tid = path.rsplit("/", 1)[-1]
                tabs_store[:] = [t for t in tabs_store if t["id"] != tid]
                return Response(200, "OK", Headers([("Content-Type", "application/json")]), b"{}")
            return Response(404, "Not Found", Headers(), b"{}")

        async def ws_handler(ws):
            async for raw in ws:
                msg = json.loads(raw)
                method = msg.get("method")
                cdp_commands.append(msg)
                if "id" in msg and method != "Page.screencastFrameAck":
                    await ws.send(json.dumps({"id": msg["id"], "result": {}}))
                if method == "Page.startScreencast":
                    await ws.send(
                        json.dumps(
                            {
                                "method": "Page.screencastFrame",
                                "params": {
                                    "sessionId": 7,
                                    "data": "FAKE_JPEG_BASE64",
                                    "metadata": {"deviceWidth": 1280, "deviceHeight": 800},
                                },
                            }
                        )
                    )

        async def main_srv():
            stop_fut = loop.create_future()
            server_info["stop"] = lambda: loop.call_soon_threadsafe(
                lambda: not stop_fut.done() and stop_fut.set_result(True)
            )
            async with websockets.serve(ws_handler, "127.0.0.1", 0, process_request=http_handler) as srv:
                server_info["port"] = srv.sockets[0].getsockname()[1]
                ready_evt.set()
                await stop_fut

        loop.run_until_complete(main_srv())

    t = threading.Thread(target=_run_mock_cdp, daemon=True)
    t.start()
    assert ready_evt.wait(timeout=5.0)

    try:
        monkeypatch.setenv("AIM_BROWSER_CDP_PORT", str(server_info["port"]))
        client = TestClient(main.app)
        headers = {"X-API-Token": admin_and_user_tokens["admin"]}

        # Open leased subagent tab + operator tab
        r_open = client.post(
            "/api/browser/tabs",
            headers=headers,
            json={"url": "localhost:5173", "lease": "subagent-1", "actor": "subagent-1"},
        )
        assert r_open.status_code == 200
        tid = r_open.json()["tab"]["id"]
        assert r_open.json()["tabs"][0]["lease"] == "subagent-1"

            # Connect /ws/browser with portrait split-pane bounds -> verify Emulation + screencast
        with client.websocket_connect("/ws/browser") as ws:
            ws.send_text(
                json.dumps(
                    {
                        "type": "auth",
                        "token": admin_and_user_tokens["admin"],
                        "target_id": tid,
                        "width": 780,
                        "height": 980,
                    }
                )
            )
            msg1 = json.loads(ws.receive_text())
            msg2 = json.loads(ws.receive_text())
            received_types = {msg1["type"], msg2["type"]}
            assert "ready" in received_types
            assert "frame" in received_types
            frame_msg = msg1 if msg1["type"] == "frame" else msg2
            assert frame_msg["data"] == "FAKE_JPEG_BASE64"

            # Dynamic resize_viewport must update Emulation.setDeviceMetricsOverride without sliding TTL (#247/#249)
            fixed_exp = time.time() + 500
            main.VALID_API_TOKENS[admin_and_user_tokens["admin"]]["expires"] = fixed_exp
            ws.send_text(json.dumps({"type": "resize_viewport", "width": 920, "height": 1040}))
            ws.send_text(json.dumps({"type": "ping"}))
            assert json.loads(ws.receive_text())["type"] == "pong"
            assert main.VALID_API_TOKENS[admin_and_user_tokens["admin"]]["expires"] == fixed_exp

            # Send mouse click + 2FA insert_text
            ws.send_text(json.dumps({"type": "mouse", "eventType": "mousePressed", "x": 320, "y": 240, "button": "left"}))
            ws.send_text(json.dumps({"type": "insert_text", "text": "123456"}))

            # Write HUD event from aim-browser -> verify live push (draining resized screencast frame)
            hud_file = admin_and_user_tokens["state_dir"] / "hud.json"
            hud_file.write_text(json.dumps({"seq": 1, "targetId": tid, "actor": "subagent-1", "action": "click", "label": "#login", "x": 320, "y": 240}))
            hud_msg = None
            for _ in range(4):
                candidate = json.loads(ws.receive_text())
                if candidate.get("type") == "hud":
                    hud_msg = candidate
                    break
            assert hud_msg is not None
            assert hud_msg["hud"]["label"] == "#login"

            # Open a 2nd tab & close the ACTIVE attached tab (tid) WHILE /ws/browser is still connected (#249)!
            r_open2 = client.post("/api/browser/tabs", headers=headers, json={"url": "https://example.org"})
            assert r_open2.status_code == 200
            tid2 = r_open2.json()["tab"]["id"]

            # Simulate Chromium /json/close race where /json/list lags if DevTools wasn't detached
            r_del = client.delete(f"/api/browser/tabs/{tid}", headers=headers)
            assert r_del.status_code == 200
            returned_ids = [t["id"] for t in r_del.json()["tabs"]]
            assert tid not in returned_ids
            assert tid2 in returned_ids

        # Give upstream close a brief tick to flush stopScreencast
        time.sleep(0.05)
        methods = [c["method"] for c in cdp_commands]
        assert "Emulation.setDeviceMetricsOverride" in methods
        assert "Page.startScreencast" in methods
        assert "Page.screencastFrameAck" in methods
        assert "Input.dispatchMouseEvent" in methods
        assert "Input.insertText" in methods
        assert "Page.stopScreencast" in methods

        emulation_calls = [c["params"] for c in cdp_commands if c["method"] == "Emulation.setDeviceMetricsOverride"]
        assert any(p.get("width") == 780 and p.get("height") == 980 for p in emulation_calls)
        assert any(p.get("width") == 920 and p.get("height") == 1040 for p in emulation_calls)

        # Delete second tab and confirm cleanup
        r_del2 = client.delete(f"/api/browser/tabs/{tid2}", headers=headers)
        assert r_del2.status_code == 200
        assert r_del2.json()["tabs"] == []
    finally:
        if "stop" in server_info:
            server_info["stop"]()
        t.join(timeout=2.0)
