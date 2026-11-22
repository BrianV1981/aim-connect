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
                # Emulate real Chromium plain-text "Target is closing" response (#251)
                return Response(200, "OK", Headers([("Content-Type", "text/plain")]), b"Target is closing")
            return Response(404, "Not Found", Headers(), b"{}")

        async def ws_handler(ws):
            req_path = ws.request.path if getattr(ws, "request", None) else ""
            attached_tid = req_path.rsplit("/", 1)[-1] if "/devtools/page/" in req_path else ""
            async for raw in ws:
                msg = json.loads(raw)
                method = msg.get("method")
                cdp_commands.append(msg)
                if method == "Page.bringToFront" and attached_tid:
                    idx = next((i for i, t in enumerate(tabs_store) if t["id"] == attached_tid), None)
                    if idx is not None and idx > 0:
                        tabs_store.insert(0, tabs_store.pop(idx))
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

            def _recv_until(expected_type: str, max_msgs: int = 6) -> dict:
                for _ in range(max_msgs):
                    m = json.loads(ws.receive_text())
                    if m.get("type") == expected_type:
                        return m
                raise AssertionError(f"Did not receive {expected_type!r} within {max_msgs} frames")

            # Dynamic resize_viewport must update Emulation.setDeviceMetricsOverride without sliding TTL (#247/#249)
            fixed_exp = time.time() + 500
            main.VALID_API_TOKENS[admin_and_user_tokens["admin"]]["expires"] = fixed_exp
            ws.send_text(json.dumps({"type": "resize_viewport", "width": 920, "height": 1040}))
            ws.send_text(json.dumps({"type": "ping"}))
            assert _recv_until("pong")["type"] == "pong"
            assert main.VALID_API_TOKENS[admin_and_user_tokens["admin"]]["expires"] == fixed_exp

            # Send mouse click + 2FA insert_text
            ws.send_text(json.dumps({"type": "mouse", "eventType": "mousePressed", "x": 320, "y": 240, "button": "left"}))
            ws.send_text(json.dumps({"type": "insert_text", "text": "123456"}))

            # Write HUD event from aim-browser -> verify live push
            hud_file = admin_and_user_tokens["state_dir"] / "hud.json"
            hud_file.write_text(json.dumps({"seq": 1, "targetId": tid, "actor": "subagent-1", "action": "click", "label": "#login", "x": 320, "y": 240}))
            hud_msg = _recv_until("hud")
            assert hud_msg["hud"]["label"] == "#login"

            # Open a 2nd tab, switch_target to it, verify Page.bringToFront + stable tab order (#251)
            r_open2 = client.post("/api/browser/tabs", headers=headers, json={"url": "https://example.org"})
            assert r_open2.status_code == 200
            tid2 = r_open2.json()["tab"]["id"]

            ws.send_text(json.dumps({"type": "switch_target", "target_id": tid2, "width": 920, "height": 1040}))
            ready2 = _recv_until("ready")
            assert ready2["target_id"] == tid2

            # Even though /json/activate moved tid2 to index 0 in tabs_store, /api/browser/status preserves [tid, tid2]
            st_tabs = client.get("/api/browser/status", headers=headers).json()["tabs"]
            assert [t["id"] for t in st_tabs] == [tid, tid2]

            # Close the tab via plain-text "Target is closing" response without JSONDecodeError 502 (#251)
            r_del = client.delete(f"/api/browser/tabs/{tid}", headers=headers)
            assert r_del.status_code == 200
            returned_ids = [t["id"] for t in r_del.json()["tabs"]]
            assert tid not in returned_ids
            assert tid2 in returned_ids

        # Give upstream close a brief tick to flush stopScreencast
        time.sleep(0.05)
        methods = [c["method"] for c in cdp_commands]
        assert "Page.bringToFront" in methods
        assert "Page.captureScreenshot" not in methods
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


def test_browser_favorites_crud_dedup_and_validation(admin_and_user_tokens, monkeypatch):
    """Verify server-persisted favorites CRUD, URL normalization, deduplication, and admin gate (#250)."""
    monkeypatch.setenv("AIM_BROWSER_CDP_PORT", "65432")
    client = TestClient(main.app)
    admin_headers = {"X-API-Token": admin_and_user_tokens["admin"]}
    user_headers = {"X-API-Token": admin_and_user_tokens["user"]}

    # Non-admin rejected
    assert client.get("/api/browser/favorites", headers=user_headers).status_code == 403

    # Disallowed schemes & about:blank rejected
    assert client.post("/api/browser/favorites", headers=admin_headers, json={"url": "javascript:alert(1)"}).status_code == 400
    assert client.post("/api/browser/favorites", headers=admin_headers, json={"url": "about:blank"}).status_code == 400

    # Create favorite (normalizing bare host) + upsert title without duplicating
    r1 = client.post(
        "/api/browser/favorites",
        headers=admin_headers,
        json={"url": "news.ycombinator.com", "title": "HN"},
    )
    assert r1.status_code == 200
    fav_id = r1.json()["favorite"]["id"]
    assert r1.json()["favorite"]["url"] == "https://news.ycombinator.com"
    assert len(r1.json()["favorites"]) == 1

    r_upsert = client.post(
        "/api/browser/favorites",
        headers=admin_headers,
        json={"url": "https://news.ycombinator.com", "title": "Hacker News"},
    )
    assert r_upsert.status_code == 200
    assert len(r_upsert.json()["favorites"]) == 1
    assert r_upsert.json()["favorites"][0]["title"] == "Hacker News"

    # Included directly in /api/browser/status
    st = client.get("/api/browser/status", headers=admin_headers).json()
    assert len(st["favorites"]) == 1
    assert st["favorites"][0]["id"] == fav_id

    # Delete favorite
    r_del = client.delete(f"/api/browser/favorites/{fav_id}", headers=admin_headers)
    assert r_del.status_code == 200
    assert r_del.json()["favorites"] == []


def test_browser_tab_session_attribution_and_hud_metadata(admin_and_user_tokens, monkeypatch):
    """Verify session, actor, and updatedAt round-trip on /api/browser/tabs, /api/browser/status, and /ws/browser (#253)."""
    tabs_store = []
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
                return None
            if path == "/json/version":
                body = json.dumps({"Browser": "Chrome/144.0.0.0"}).encode()
                return Response(200, "OK", Headers([("Content-Type", "application/json")]), body)
            if path == "/json/list":
                return Response(200, "OK", Headers([("Content-Type", "application/json")]), json.dumps(tabs_store).encode())
            if path.startswith("/json/new"):
                tid = f"TAB_ATTR_{len(tabs_store) + 1}"
                created = {
                    "id": tid,
                    "type": "page",
                    "title": "Agent Research",
                    "url": "https://example.org",
                    "webSocketDebuggerUrl": f"ws://127.0.0.1:{port}/devtools/page/{tid}",
                }
                tabs_store.append(created)
                return Response(200, "OK", Headers([("Content-Type", "application/json")]), json.dumps(created).encode())
            return Response(404, "Not Found", Headers(), b"{}")

        async def ws_handler(ws):
            async for raw in ws:
                msg = json.loads(raw)
                if "id" in msg and msg.get("method") != "Page.screencastFrameAck":
                    await ws.send(json.dumps({"id": msg["id"], "result": {}}))

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

        r_open = client.post(
            "/api/browser/tabs",
            headers=headers,
            json={
                "url": "https://example.org",
                "lease": "market-brief",
                "actor": "aim-connect",
                "session": "aim-connect",
            },
        )
        assert r_open.status_code == 200
        tab_entry = r_open.json()["tabs"][0]
        assert tab_entry["lease"] == "market-brief"
        assert tab_entry["actor"] == "aim-connect"
        assert tab_entry["session"] == "aim-connect"
        assert tab_entry["updatedAt"] > 0

        st = client.get("/api/browser/status", headers=headers).json()
        assert st["tabs"][0]["session"] == "aim-connect"

        with client.websocket_connect("/ws/browser") as ws:
            ws.send_text(
                json.dumps(
                    {
                        "type": "auth",
                        "token": admin_and_user_tokens["admin"],
                        "target_id": tab_entry["id"],
                    }
                )
            )
            ready = json.loads(ws.receive_text())
            assert ready["type"] == "ready"
            assert ready["lease"] == "market-brief"
            assert ready["actor"] == "aim-connect"
            assert ready["session"] == "aim-connect"
    finally:
        if "stop" in server_info:
            server_info["stop"]()
        t.join(timeout=2.0)


def test_stale_hud_json_expired_from_status_and_read_hud(admin_and_user_tokens, monkeypatch):
    """Stale hud.json on disk (>6s old via ts or mtime) must return None instead of replaying forever (#255)."""
    import os

    monkeypatch.setenv("AIM_BROWSER_CDP_PORT", "65433")
    client = TestClient(main.app)
    headers = {"X-API-Token": admin_and_user_tokens["admin"]}
    hud_file = admin_and_user_tokens["state_dir"] / "hud.json"

    # 1. Stale ts (30 minutes ago) -> _read_hud() and /api/browser/status return None
    stale_ts_ms = int((time.time() - 1800) * 1000)
    hud_file.write_text(
        json.dumps(
            {
                "seq": 15,
                "ts": stale_ts_ms,
                "targetId": "T_OLD",
                "lease": "alpha-231",
                "actor": "joshua-alpha",
                "action": "click",
                "x": 278,
                "y": 296,
            }
        )
    )
    assert routes_browser._read_hud() is None
    assert client.get("/api/browser/status", headers=headers).json()["hud"] is None

    # 2. Legacy payload without ts whose file mtime is 30s old -> None
    hud_file.write_text(json.dumps({"seq": 16, "targetId": "T_OLD", "action": "click", "x": 10, "y": 20}))
    old_mtime = time.time() - 30.0
    os.utime(hud_file, (old_mtime, old_mtime))
    assert routes_browser._read_hud() is None

    # 3. Fresh ts (now) -> returned cleanly
    fresh_ts_ms = int(time.time() * 1000)
    hud_file.write_text(
        json.dumps({"seq": 17, "ts": fresh_ts_ms, "targetId": "T_NEW", "action": "click", "x": 50, "y": 60})
    )
    st = client.get("/api/browser/status", headers=headers).json()
    assert st["hud"] is not None
    assert st["hud"]["seq"] == 17
