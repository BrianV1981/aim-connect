import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import main
import routes_files


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def admin_token():
    tok = "test-admin-token-270"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_raw_media_streams_audio_and_video_extensions_with_250mb_cap(
    client, admin_token, tmp_path, monkeypatch
):
    """#270: GET /api/file/raw streams allowlisted audio/video formats and enforces a 250 MB cap."""
    monkeypatch.setenv("AIM_EXTRA_ALLOWED_ROOT", str(tmp_path))
    assert routes_files.MAX_RAW_MEDIA_BYTES == 250 * 1024 * 1024

    expected_mimes = {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac",
        ".flac": "audio/flac",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
    }
    payload = b"ID3\x04\x00\x00\x00\x00\x00\x1fFAKE_MEDIA_STREAM_BYTES_0123456789"

    for ext, expected_mime in expected_mimes.items():
        media_file = tmp_path / f"sample{ext}"
        media_file.write_bytes(payload)
        resp = client.get(
            f"/api/file/raw?path={media_file}",
            headers={"x-api-token": admin_token},
        )
        assert resp.status_code == 200, f"Failed for {ext}: {resp.text}"
        assert resp.headers["content-type"].startswith(expected_mime)
        assert resp.headers.get("accept-ranges") == "bytes"
        assert resp.headers.get("x-content-type-options") == "nosniff"
        assert resp.content == payload

    # Cap enforcement via monkeypatched byte limit
    monkeypatch.setattr(routes_files, "MAX_RAW_MEDIA_BYTES", 16)
    oversized = tmp_path / "huge.mp4"
    oversized.write_bytes(b"x" * 32)
    too_large = client.get(
        f"/api/file/raw?path={oversized}",
        headers={"x-api-token": admin_token},
    )
    assert too_large.status_code == 413
    assert "250 MB" in too_large.json()["error"]


def test_raw_media_supports_http_byte_range_seeking(
    client, admin_token, tmp_path, monkeypatch
):
    """#270: GET /api/file/raw supports RFC 9110 Range byte-seeking (206 Partial Content & 416)."""
    monkeypatch.setenv("AIM_EXTRA_ALLOWED_ROOT", str(tmp_path))

    stream_bytes = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    mp4_path = tmp_path / "clip.mp4"
    mp4_path.write_bytes(stream_bytes)

    # Explicit byte slice
    partial = client.get(
        f"/api/file/raw?path={mp4_path}",
        headers={"x-api-token": admin_token, "Range": "bytes=10-15"},
    )
    assert partial.status_code == 206
    assert partial.content == b"ABCDEF"
    assert partial.headers.get("content-range") == f"bytes 10-15/{len(stream_bytes)}"
    assert partial.headers.get("accept-ranges") == "bytes"
    assert partial.headers.get("content-length") == "6"

    # Open-ended byte range
    tail = client.get(
        f"/api/file/raw?path={mp4_path}",
        headers={"x-api-token": admin_token, "Range": "bytes=30-"},
    )
    assert tail.status_code == 206
    assert tail.content == b"UVWXYZ"
    assert tail.headers.get("content-range") == f"bytes 30-35/{len(stream_bytes)}"

    # Suffix byte range
    suffix = client.get(
        f"/api/file/raw?path={mp4_path}",
        headers={"x-api-token": admin_token, "Range": "bytes=-4"},
    )
    assert suffix.status_code == 206
    assert suffix.content == b"WXYZ"
    assert suffix.headers.get("content-range") == f"bytes 32-35/{len(stream_bytes)}"

    # Out-of-bounds range -> 416
    invalid = client.get(
        f"/api/file/raw?path={mp4_path}",
        headers={"x-api-token": admin_token, "Range": "bytes=500-600"},
    )
    assert invalid.status_code == 416
    assert invalid.headers.get("content-range") == f"bytes */{len(stream_bytes)}"


def test_read_file_returns_415_is_binary_instead_of_500_on_non_utf8_or_nul_bytes(
    client, admin_token, tmp_path, monkeypatch
):
    """#270: GET /api/file returns clean 415 with is_binary=True instead of 500 UnicodeDecodeError."""
    monkeypatch.setenv("AIM_EXTRA_ALLOWED_ROOT", str(tmp_path))

    non_utf8 = tmp_path / "voice_note.mp3"
    raw_mp3 = b"\xff\xfb\x90\x64\x00\x0f\xf0\x81\x99\xfe"
    non_utf8.write_bytes(raw_mp3)

    resp = client.get(
        f"/api/file?path={non_utf8}",
        headers={"x-api-token": admin_token},
    )
    assert resp.status_code == 415
    body = resp.json()
    assert body["is_binary"] is True
    assert body["size_bytes"] == len(raw_mp3)
    assert body["mime_type"] == "audio/mpeg"

    sqlite_bin = tmp_path / "vault.sqlite"
    sqlite_bytes = b"SQLite format 3\x00\x10\x00\x01\x01\x00@  "
    sqlite_bin.write_bytes(sqlite_bytes)

    resp_nul = client.get(
        f"/api/file?path={sqlite_bin}",
        headers={"x-api-token": admin_token},
    )
    assert resp_nul.status_code == 415
    body_nul = resp_nul.json()
    assert body_nul["is_binary"] is True
    assert body_nul["size_bytes"] == len(sqlite_bytes)


def test_binary_file_download_endpoint_streams_attachment_securely(
    client, admin_token, tmp_path, monkeypatch
):
    """#270: GET /api/file/download serves binary fallback files as attachment within secure_path."""
    monkeypatch.setenv("AIM_EXTRA_ALLOWED_ROOT", str(tmp_path))

    archive = tmp_path / "bundle.engram"
    archive_bytes = b"\x89ENGRAM\x00\x01\x02\xff\xfebinary-payload"
    archive.write_bytes(archive_bytes)

    dl = client.get(
        f"/api/file/download?path={archive}",
        headers={"x-api-token": admin_token},
    )
    assert dl.status_code == 200
    assert dl.content == archive_bytes
    assert "attachment" in dl.headers.get("content-disposition", "")
    assert "bundle.engram" in dl.headers.get("content-disposition", "")
    assert dl.headers.get("x-content-type-options") == "nosniff"

    # Reject path traversal outside workspace/home
    trav = client.get(
        "/api/file/download?path=/etc/passwd",
        headers={"x-api-token": admin_token},
    )
    assert trav.status_code == 403

    # Reject unauthenticated requests
    unauth = client.get(f"/api/file/download?path={archive}")
    assert unauth.status_code == 401


def test_file_explorer_audio_video_and_binary_fallback_ui_contracts():
    """#270: FileExplorer.jsx renders native <audio controls>, <video controls playsInline>, and binary fallback."""
    explorer_jsx = (FRONTEND_SRC / "components" / "FileExplorer.jsx").read_text(encoding="utf-8")
    icons_jsx = (FRONTEND_SRC / "components" / "Icons.jsx").read_text(encoding="utf-8")
    css = (FRONTEND_SRC / "App.css").read_text(encoding="utf-8")

    for ext in (".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".mp4", ".webm", ".mov"):
        assert f"'{ext}'" in explorer_jsx, f"Missing {ext} in FileExplorer.jsx"

    assert "<audio" in explorer_jsx and "controls" in explorer_jsx
    assert "<video" in explorer_jsx and "playsInline" in explorer_jsx
    assert "is_binary" in explorer_jsx
    assert "/api/file/download" in explorer_jsx
    assert "files-media-stage" in explorer_jsx
    assert ".files-media-stage" in css
    assert "case 'audio':" in icons_jsx
    assert "case 'video':" in icons_jsx
    assert "case 'fileBinary':" in icons_jsx
