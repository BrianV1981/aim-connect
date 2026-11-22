import asyncio
import base64
import json
import stat
import struct
import threading
import time
import zlib
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import websockets
from fastapi.testclient import TestClient

import main
import routes_browser


REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = REPO_ROOT / "frontend" / "src"


def _make_tiny_png(width: int = 640, height: int = 360) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    raw = b"\x00" + (b"\x05\x05\x05" * width)
    idat = zlib.compress(raw * min(height, 2))
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


@pytest.fixture
def admin_token(monkeypatch, tmp_path):
    state_dir = tmp_path / "browser-state-258"
    state_dir.mkdir(parents=True)
    monkeypatch.setenv("AIM_BROWSER_STATE_DIR", str(state_dir))
    tok = "c" * 64
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 3600,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_browser_start_auto_defaults_to_headless_new_even_with_display(
    admin_token, monkeypatch, tmp_path
):
    """#258: mode='auto' must launch --headless=new even when DISPLAY/WAYLAND_DISPLAY exist (WSL2 desktop invisible)."""
    monkeypatch.setenv("DISPLAY", ":0")
    monkeypatch.setenv("WAYLAND_DISPLAY", "wayland-0")
    monkeypatch.setenv("CDP_PROFILE_DIR", str(tmp_path / "profile"))

    spawned_args = []

    def fake_popen(args, **kwargs):
        spawned_args.append(list(args))
        m = MagicMock()
        m.pid = 424242
        return m

    status_calls = [
        {"running": False, "cdp_port": 9222, "browser": "", "tabs": [], "favorites": [], "hud": None},
        {"running": True, "cdp_port": 9222, "browser": "Chrome/144", "tabs": [], "favorites": [], "hud": None},
    ]

    async def fake_collect():
        return status_calls.pop(0) if len(status_calls) > 1 else status_calls[0]

    client = TestClient(main.app)
    headers = {"X-API-Token": admin_token}

    with patch("routes_browser._find_browser_binary", return_value="/usr/bin/chromium"), patch(
        "routes_browser._collect_browser_status", side_effect=fake_collect
    ), patch("routes_browser.subprocess.Popen", side_effect=fake_popen):
        res = client.post("/api/browser/start", headers=headers, json={"mode": "auto", "url": "https://example.com"})
        assert res.status_code == 200
        assert res.json()["headless"] is True
        assert "--headless=new" in spawned_args[0]
        assert "--start-minimized" not in spawned_args[0]


def test_browser_screenshot_0600_and_downloads_endpoints(
    admin_token, monkeypatch, tmp_path
):
    """#258: POST /api/browser/screenshot writes 0600 PNG with dims; GET /api/browser/downloads lists CDP files."""
    shots_dir = tmp_path / "shots"
    dl_dir = tmp_path / "downloads"
    dl_dir.mkdir(parents=True)
    (dl_dir / "rig_bom.pdf.crdownload").write_bytes(b"partial-pdf-stream")
    (dl_dir / "dossier.csv").write_text("id,name\n1,Test\n", encoding="utf-8")

    monkeypatch.setenv("AIM_SHOTS_DIR", str(shots_dir))
    monkeypatch.setenv("AIM_BROWSER_DOWNLOAD_DIR", str(dl_dir))

    png_b64 = base64.b64encode(_make_tiny_png(1280, 800)).decode("ascii")
    ready_evt = threading.Event()
    server_info = {}

    def _run_mock_cdp():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def http_handler(connection, request):
            from websockets.datastructures import Headers
            from websockets.http11 import Response

            port = server_info["port"]
            if request.path.startswith("/devtools/page/"):
                return None
            if request.path == "/json/list":
                tabs = [
                    {
                        "id": "TAB_SHOT_1",
                        "type": "page",
                        "title": "Example Portal",
                        "url": "https://portal.example.org/dashboard",
                        "webSocketDebuggerUrl": f"ws://127.0.0.1:{port}/devtools/page/TAB_SHOT_1",
                    }
                ]
                return Response(200, "OK", Headers([("Content-Type", "application/json")]), json.dumps(tabs).encode())
            if request.path == "/json/version":
                return Response(200, "OK", Headers([("Content-Type", "application/json")]), b'{"Browser":"Chrome"}')
            return Response(404, "Not Found", Headers(), b"{}")

        async def ws_handler(ws):
            async for raw in ws:
                msg = json.loads(raw)
                if msg.get("method") == "Page.captureScreenshot":
                    await ws.send(json.dumps({"id": msg["id"], "result": {"data": png_b64}}))
                elif "id" in msg:
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
        headers = {"X-API-Token": admin_token}

        r_shot = client.post(
            "/api/browser/screenshot",
            headers=headers,
            json={"target_id": "TAB_SHOT_1", "session": "aim-connect"},
        )
        assert r_shot.status_code == 200
        shot_data = r_shot.json()
        assert shot_data["dims"] == "1280x800"
        assert "portal.example.org" in shot_data["filename"]
        saved_file = Path(shot_data["path"])
        assert saved_file.is_file()
        assert stat.S_IMODE(saved_file.stat().st_mode) == 0o600

        r_dl = client.get("/api/browser/downloads", headers=headers)
        assert r_dl.status_code == 200
        dl_items = r_dl.json()["downloads"]
        by_name = {d["name"]: d for d in dl_items}
        assert by_name["rig_bom.pdf"]["status"] == "streaming"
        assert by_name["dossier.csv"]["status"] == "done"

        r_file = client.get("/api/browser/downloads/dossier.csv", headers=headers)
        assert r_file.status_code == 200
        assert "id,name" in r_file.text

        # Traversal rejected
        assert client.get("/api/browser/downloads/..%2Fsecret", headers=headers).status_code in (400, 404)
    finally:
        if "stop" in server_info:
            server_info["stop"]()
        t.join(timeout=2.0)


def test_ticket_c_frontend_bolt_macro_studio_composer_and_browser_trio():
    """#258: Verify Bolt Control Pad, Macro Studio 4-tab UI, Composer + Mobile Dock, and 3 Browser Icons."""
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    macro_jsx = (FRONTEND_SRC / "components" / "MacroLibraryModal.jsx").read_text(encoding="utf-8")
    browser_jsx = (FRONTEND_SRC / "components" / "BrowserPane.jsx").read_text(encoding="utf-8")

    # 1. Bolt Control Pad, Keybar toggle, Composer & Mobile Bottom Dock
    assert "TERMINAL CONTROL PAD" in app_jsx
    assert "KEYBAR:" in app_jsx
    assert "ld-composer-shell" in app_jsx
    assert "ld-mobile-dock" in app_jsx
    assert "stagedAttachments" in app_jsx

    # 2. Macro Studio 4-tab upgrade
    assert "MACRO STUDIO" in macro_jsx
    assert "VOICE TRIGGERS" in macro_jsx
    assert "SERVER GLOBAL" in macro_jsx

    # 3. Top-Right Browser Action Trio
    assert "/api/browser/screenshot" in browser_jsx
    assert "/api/browser/downloads" in browser_jsx
    assert "Open in External Browser" in browser_jsx
    assert "Add Screenshot to Conversation" in browser_jsx
    assert "Browser Downloads" in browser_jsx
