import json
import re
from pathlib import Path
from fastapi.testclient import TestClient

import main


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = WORKTREE_ROOT / "frontend"
FRONTEND_SRC = FRONTEND_DIR / "src"


def test_emerald_matrix_four_themes_scrollbars_and_fonts():
    """Verify 4 semantic themes (emerald default, oled, light, navy), 4px scrollbars, Inter + JetBrains Mono, and preserved #229 header invariants (#256)."""
    index_html = (FRONTEND_DIR / "index.html").read_text(encoding="utf-8")
    app_css = (FRONTEND_SRC / "App.css").read_text(encoding="utf-8")
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    explorer_jsx = (FRONTEND_SRC / "components" / "FileExplorer.jsx").read_text(encoding="utf-8")

    # 1. index.html defaults to data-theme="emerald", #050505 meta-theme-color, Inter + JetBrains Mono, and keeps <title>A.I.M. Connect</title>
    assert 'data-theme="emerald"' in index_html
    assert 'id="meta-theme-color"' in index_html
    assert "#050505" in index_html
    assert "Inter" in index_html
    assert "JetBrains+Mono" in index_html
    assert "<title>A.I.M. Connect</title>" in index_html

    # 2. All 4 semantic themes & 4px scrollbars in App.css
    for selector in (
        '[data-theme="emerald"]',
        '[data-theme="oled"]',
        '[data-theme="light"]',
        '[data-theme="navy"]',
    ):
        assert selector in app_css, f"Missing theme selector {selector} in App.css"

    assert "#00ffa3" in app_css.lower()
    assert "#047857" in app_css.lower()
    assert "width: 4px" in app_css
    assert "height: 4px" in app_css
    assert ".ld-grid-backdrop" in app_css
    assert ".ld-aurora-wash" in app_css
    assert ".ld-mask-glass" in app_css
    assert ".ld-header" in app_css

    # 3. Preserved #229 header non-shrinking & .active-session-badge rules
    header_child_match = re.search(r"\.app-header\s*>\s*\*\s*\{([^}]+)\}", app_css)
    assert header_child_match is not None
    assert "flex-shrink: 0" in header_child_match.group(1)

    badge_match = re.search(r"\.active-session-badge\s*\{([^}]+)\}", app_css)
    assert badge_match is not None
    assert "flex-shrink: 0" in badge_match.group(1)
    assert "overflow: hidden" not in badge_match.group(1)

    # 4. App.jsx syncs data-theme across DOM, xterm.js, and FileExplorer Monaco
    assert "setAttribute('data-theme'" in app_jsx or 'setAttribute("data-theme"' in app_jsx
    assert "aim-ui-theme" in app_jsx
    assert "uiTheme" in explorer_jsx
    assert "'vs'" in explorer_jsx or '"vs"' in explorer_jsx


def test_pwa_manifest_passthrough_sw_no_store_and_google_fonts_csp(tmp_path):
    """Verify standalone window-controls-overlay manifest, pass-through /sw.js served no-store, and Google Fonts CSP (#256)."""
    manifest = json.loads((FRONTEND_DIR / "public" / "manifest.json").read_text(encoding="utf-8"))
    assert "window-controls-overlay" in manifest.get("display_override", [])
    assert manifest["background_color"].lower() == "#050505"
    assert manifest["theme_color"].lower() == "#050505"

    icon_svg = (FRONTEND_DIR / "public" / "icon.svg").read_text(encoding="utf-8")
    assert "#00FFA3" in icon_svg or "#00ffa3" in icon_svg

    sw_js = (FRONTEND_DIR / "public" / "sw.js").read_text(encoding="utf-8")
    assert "skipWaiting" in sw_js
    assert "clients.claim" in sw_js
    assert "caches.open" not in sw_js

    # Verify _render_frontend_file serves sw.js with no-store Cache-Control + Service-Worker-Allowed
    dist_dir = tmp_path / "dist"
    dist_dir.mkdir()
    (dist_dir / "index.html").write_text("<!doctype html><title>A.I.M. Connect</title>", encoding="utf-8")
    (dist_dir / "sw.js").write_text(sw_js, encoding="utf-8")

    sw_resp = main._render_frontend_file(str(dist_dir), "sw.js")
    assert sw_resp.status_code == 200
    assert "no-store" in sw_resp.headers.get("cache-control", "")
    assert sw_resp.headers.get("service-worker-allowed") == "/"

    # Verify CSP permits Inter & JetBrains Mono Google Fonts without weakening script-src
    client = TestClient(main.app)
    health_resp = client.get("/api/health")
    csp = health_resp.headers.get("content-security-policy", "")
    assert "https://fonts.googleapis.com" in csp
    assert "https://fonts.gstatic.com" in csp
    assert "unsafe-eval" not in csp


def test_frosted_header_matrix_scramble_homepage_and_auth_screen():
    """Verify Lucide Icons, Matrix character scramble, frosted 50px header layout, Sovereign Homepage, and Emerald Matrix 3FA AuthScreen (#256)."""
    icons_jsx = (FRONTEND_SRC / "components" / "Icons.jsx").read_text(encoding="utf-8")
    scramble_js = (FRONTEND_SRC / "scramble.js").read_text(encoding="utf-8")
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    auth_jsx = (FRONTEND_SRC / "components" / "AuthScreen.jsx").read_text(encoding="utf-8")

    assert 'className="lucide"' in icons_jsx or "lucide" in icons_jsx
    assert "SCRAMBLE_CHARS" in scramble_js

    # Frosted header structure: brand, colored session pill, GATE // & NEW // pills, cmdk-bar, seg-rail (TERMINAL | BROWSER | FILES), HISTORY, KB, Settings, E2EE LED
    assert "ld-header" in app_jsx
    assert 'className="active-session-badge"' in app_jsx
    assert "Return to A.I.M. Connect Welcome Screen" in app_jsx
    assert "GATE //" in app_jsx
    assert "NEW //" in app_jsx
    assert "cmdk-bar" in app_jsx
    assert "seg-rail" in app_jsx
    assert "TERMINAL" in app_jsx
    assert "BROWSER" in app_jsx
    assert "FILES" in app_jsx
    assert "HISTORY" in app_jsx

    # Sovereign Homepage
    assert "SOVEREIGN FLEET COCKPIT" in app_jsx
    assert "Own your stack." in app_jsx
    assert "Don't rent a seat." in app_jsx
    assert "https://buymeacoffee.com/brianv1981" in app_jsx

    # Emerald Matrix 3FA Lock Screen
    assert "3FA GATE" in auth_jsx
    assert "ZERO-TRUST TOTP" in auth_jsx
    assert "totp-keypad" in auth_jsx


def test_unified_5_tab_settings_vault_modal_and_operator_reply_preferences():
    """Verify 5-tab System Settings & Vault modal consolidating SettingsModal + IntegrationsModal, PWA install, Operator Reply Color/Side, and Custom Voice Macros round-trip (#256)."""
    settings_jsx = (FRONTEND_SRC / "components" / "SettingsModal.jsx").read_text(encoding="utf-8")
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    kb_jsx = (FRONTEND_SRC / "Keyboard.jsx").read_text(encoding="utf-8")

    for tab_label in (
        "APPEARANCE & APP",
        "KEYBOARD & ALERTS",
        "VOICE & NEURAL TTS",
        "INTEGRATIONS VAULT",
        "SECURITY & 3FA",
    ):
        assert tab_label in settings_jsx, f"Missing settings tab {tab_label}"

    # Appearance & App: PWA Install, 4 Themes, Operator Reply Color (Cyan/Gold/Emerald/Grey) & Left/Right Dot Side
    assert "INSTALL APP" in settings_jsx
    for scheme in ("Emerald Matrix", "Pure OLED Black", "Daylight Crisp", "Classic AIM Navy"):
        assert scheme in settings_jsx
    for op_color in ("cyan", "gold", "emerald", "grey"):
        assert f"'{op_color}'" in settings_jsx or f'"{op_color}"' in settings_jsx
    assert "LEFT (CLI STREAM)" in settings_jsx
    assert "RIGHT (CHAT BOX)" in settings_jsx
    assert "aim-operator-style" in app_jsx
    assert "aim-operator-side" in app_jsx

    # Voice & Neural TTS: Custom Voice Macros spotlight card + round-trip Macro Settings launcher
    assert "CUSTOM VOICE MACROS" in settings_jsx
    assert "MACRO SETTINGS" in settings_jsx
    assert "onOpenVoiceMacros" in settings_jsx

    # Integrations Vault consolidated inside SettingsModal
    assert "/api/integrations/" in settings_jsx
    assert "ZERO-OAUTH OUTBOUND EMAIL VAULT" in settings_jsx

    # Security & 3FA: E2EE + Passkeys + Logout / Lock 3FA
    assert "/api/settings/e2ee" in settings_jsx
    assert "REGISTER PASSKEY" in settings_jsx
    assert "LOGOUT / LOCK 3FA" in settings_jsx

    # Sovereign Keyboard toolbar upgrades
    assert "sovereign-kb-dock" in kb_jsx
    assert "Fn F1" in kb_jsx
