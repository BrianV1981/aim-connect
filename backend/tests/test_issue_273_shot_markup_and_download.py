import base64
import json
import stat
import struct
import subprocess
import time
import zlib
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

import main
import routes_browser


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
MARKUP_UTILS_JS = FRONTEND_SRC / "shotMarkupUtils.js"


def _make_valid_png_bytes(width: int = 640, height: int = 1800) -> bytes:
    """Construct a minimal valid PNG header + IHDR + IDAT + IEND with exact dimensions."""
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)

    def _chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    raw_scanline = b"\x00" + b"\x05\x05\x05" * 4
    idat = zlib.compress(raw_scanline)
    return (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", ihdr)
        + _chunk(b"IDAT", idat)
        + _chunk(b"IEND", b"")
    )


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def admin_token():
    tok = "test-admin-token-273"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_annotated_screenshot_save_endpoint_writes_0600_png_and_validates_magic(
    client, admin_token, tmp_path, monkeypatch
):
    """#273: POST /api/browser/screenshot/save persists annotated/pasted PNGs with 0600 perms and rejects non-PNGs."""
    shots_dir = tmp_path / "shots"
    monkeypatch.setenv("AIM_SHOTS_DIR", str(shots_dir))

    png_bytes = _make_valid_png_bytes(920, 640)
    data_url = "data:image/png;base64," + base64.b64encode(png_bytes).decode("ascii")

    resp = client.post(
        "/api/browser/screenshot/save",
        headers={"x-api-token": admin_token},
        json={"image_base64": data_url, "label": "x.com-markup"},
    )
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert payload["filename"].startswith("annotated-")
    assert payload["filename"].endswith(".png")
    assert payload["dims"] == "920x640"

    saved_path = Path(payload["path"])
    assert saved_path.is_file()
    assert saved_path.read_bytes() == png_bytes
    assert stat.S_IMODE(saved_path.stat().st_mode) == 0o600

    # Reject non-PNG payload
    bad = client.post(
        "/api/browser/screenshot/save",
        headers={"x-api-token": admin_token},
        json={"image_base64": base64.b64encode(b"not-a-png").decode("ascii"), "label": "bad"},
    )
    assert bad.status_code == 400


def test_browser_screenshot_supports_optional_full_page_capture(
    client, admin_token, tmp_path, monkeypatch
):
    """#273: POST /api/browser/screenshot with full_page=True queries Page.getLayoutMetrics and sets captureBeyondViewport."""
    shots_dir = tmp_path / "shots_full"
    monkeypatch.setenv("AIM_SHOTS_DIR", str(shots_dir))

    tall_png = _make_valid_png_bytes(1280, 3400)
    tall_b64 = base64.b64encode(tall_png).decode("ascii")
    sent_cdp_messages: list[dict] = []

    class _FakeCdpWs:
        def __init__(self):
            self._queue: list[str] = []

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def send(self, raw: str):
            msg = json.loads(raw)
            sent_cdp_messages.append(msg)
            if msg["method"] == "Page.getLayoutMetrics":
                self._queue.append(
                    json.dumps(
                        {
                            "id": msg["id"],
                            "result": {"cssContentSize": {"width": 1280, "height": 3400}},
                        }
                    )
                )
            elif msg["method"] == "Page.captureScreenshot":
                self._queue.append(json.dumps({"id": msg["id"], "result": {"data": tall_b64}}))

        async def recv(self) -> str:
            return self._queue.pop(0)

    async def _fake_resolve(_tid: str):
        return ("TAB273", "ws://127.0.0.1:9222/devtools/page/TAB273", {"url": "https://example.org/pricing"})

    monkeypatch.setattr(routes_browser, "_resolve_target_ws", _fake_resolve)
    with patch("routes_browser.websockets.connect", return_value=_FakeCdpWs()):
        resp = client.post(
            "/api/browser/screenshot",
            headers={"x-api-token": admin_token},
            json={"target_id": "TAB273", "session": "aim-connect", "full_page": True},
        )

    assert resp.status_code == 200, resp.text
    out = resp.json()
    assert out["full_page"] is True
    assert out["dims"] == "1280x3400"

    methods = [m["method"] for m in sent_cdp_messages]
    assert "Page.getLayoutMetrics" in methods
    cap_msg = next(m for m in sent_cdp_messages if m["method"] == "Page.captureScreenshot")
    assert cap_msg["params"]["captureBeyondViewport"] is True
    assert cap_msg["params"]["clip"]["height"] == 3400


def test_shot_markup_utils_pins_colors_wsl_paths_and_turn_attachments_in_node():
    """#273: Verify 4-color convention, numbered pin auto-increment, WSL2 C:\\ bridge, and Operator @shot extraction."""
    assert MARKUP_UTILS_JS.is_file(), "Missing frontend/src/shotMarkupUtils.js"

    script = f"""
import {{
  MARKUP_COLORS,
  nextCalloutNumber,
  normalizeWindowsPathsInText,
  extractOperatorTurnAttachments,
}} from {json.dumps(MARKUP_UTILS_JS.as_uri())};

const n1 = nextCalloutNumber([]);
const n2 = nextCalloutNumber([{{ type: 'pin', num: 1 }}, {{ type: 'arrow' }}, {{ type: 'pin', num: 2 }}]);

const wslConverted = normalizeWindowsPathsInText(
  'Check circle on "C:\\\\Users\\\\demo\\\\OneDrive\\\\Pictures\\\\Screenshots\\\\Screenshot 2026-11-22.png" please'
);

const parsed = extractOperatorTurnAttachments(
  'Fix #1 and #2 @/tmp/shots/annotated-x.com-179540.png @/tmp/shots/screenshot-example-179541.png'
);

console.log(JSON.stringify({{
  colorIds: MARKUP_COLORS.map((c) => c.id),
  n1,
  n2,
  wslConverted,
  cleanText: parsed.cleanText,
  attFiles: parsed.attachments.map((a) => a.filename),
}}));
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        capture_output=True,
        text=True,
        timeout=3.0,
    )
    assert proc.returncode == 0, proc.stderr
    data = json.loads(proc.stdout.strip())
    assert data["colorIds"] == ["red", "emerald", "cyan", "amber"]
    assert data["n1"] == 1
    assert data["n2"] == 3
    assert "/mnt/c/Users/demo/OneDrive/Pictures/Screenshots/Screenshot 2026-11-22.png" in data["wslConverted"]
    assert data["cleanText"] == "Fix #1 and #2"
    assert data["attFiles"] == [
        "annotated-x.com-179540.png",
        "screenshot-example-179541.png",
    ]


def test_issue_273_markup_modal_and_download_ui_contracts():
    """#273: ShotMarkupModal, staged/chat download buttons next to dims, and full-page capture wired."""
    modal_jsx = (FRONTEND_SRC / "components" / "ShotMarkupModal.jsx").read_text(encoding="utf-8")
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    chat_jsx = (FRONTEND_SRC / "components" / "LiveTranscriptStage.jsx").read_text(encoding="utf-8")
    browser_jsx = (FRONTEND_SRC / "components" / "BrowserPane.jsx").read_text(encoding="utf-8")

    assert "ShotMarkupModal" in app_jsx
    assert "/api/browser/screenshot/save" in modal_jsx
    assert "downloadShotFile" in app_jsx or "onDownloadAttachment" in chat_jsx
    assert "extractOperatorTurnAttachments" in chat_jsx
    assert "full_page" in browser_jsx
