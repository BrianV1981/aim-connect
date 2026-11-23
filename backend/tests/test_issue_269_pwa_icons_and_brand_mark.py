import json
import struct
from pathlib import Path

import main


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = WORKTREE_ROOT / "frontend"
PUBLIC_DIR = FRONTEND_DIR / "public"


def _png_dimensions(path: Path) -> tuple[int, int]:
    raw = path.read_bytes()
    assert raw[:8] == b"\x89PNG\r\n\x1a\n", f"{path.name} is not a valid PNG"
    w, h = struct.unpack(">II", raw[16:24])
    return int(w), int(h)


def test_option_a_emerald_pwa_icons_manifest_no_store_and_auth_header_emblem(tmp_path):
    """#269: Verify Option A Emerald Matrix Fleet-Node PNG/SVG icons, no-store manifest, and unified Login/Header emblem."""
    assert _png_dimensions(PUBLIC_DIR / "icon-512.png") == (512, 512)
    assert _png_dimensions(PUBLIC_DIR / "icon-maskable-512.png") == (512, 512)
    assert _png_dimensions(PUBLIC_DIR / "icon-192.png") == (192, 192)
    assert _png_dimensions(PUBLIC_DIR / "apple-touch-icon.png") == (180, 180)

    manifest_raw = (PUBLIC_DIR / "manifest.json").read_text(encoding="utf-8")
    manifest = json.loads(manifest_raw)
    srcs = [ic.get("src", "") for ic in manifest.get("icons", [])]
    assert any("/icon-192.png" in s for s in srcs)
    assert any("/icon-512.png" in s for s in srcs)
    assert any("/icon-maskable-512.png" in s for s in srcs)
    assert any("/icon.svg" in s for s in srcs)
    assert all("aim-icon.jpg" not in s for s in srcs)

    index_html = (FRONTEND_DIR / "index.html").read_text(encoding="utf-8")
    assert "/apple-touch-icon.png" in index_html
    assert "aim-icon.jpg" not in index_html

    # Verify manifest.json is served with no-store Cache-Control so browsers never stick to stale PWA icons
    dist_dir = tmp_path / "dist_269"
    dist_dir.mkdir()
    (dist_dir / "index.html").write_text("<!doctype html><title>A.I.M. Connect</title>", encoding="utf-8")
    (dist_dir / "manifest.json").write_text(manifest_raw, encoding="utf-8")
    m_resp = main._render_frontend_file(str(dist_dir), "manifest.json")
    assert m_resp.status_code == 200
    assert "no-store" in m_resp.headers.get("cache-control", "")

    # Verify matching Option A aimMark emblem in AuthScreen (3FA Login) and App header
    icons_jsx = (FRONTEND_DIR / "src" / "components" / "Icons.jsx").read_text(encoding="utf-8")
    auth_jsx = (FRONTEND_DIR / "src" / "components" / "AuthScreen.jsx").read_text(encoding="utf-8")
    app_jsx = (FRONTEND_DIR / "src" / "App.jsx").read_text(encoding="utf-8")
    assert "case 'aimMark':" in icons_jsx
    assert 'name="aimMark"' in auth_jsx
    assert 'name="aimMark"' in app_jsx
