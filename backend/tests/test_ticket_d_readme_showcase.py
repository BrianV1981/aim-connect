import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DEMO_DIR = REPO_ROOT / "docs" / "demo"
README_MD = REPO_ROOT / "README.md"


def test_standalone_12_node_40_session_showcase_bundle_and_privacy_guardrails():
    """#259: Verify standalone zero-backend 12-node / 40-session showcase in docs/demo/ with 0 moat/PII leaks."""
    for fname in ("index.html", "styles.css", "app.js", "manifest.json", "sw.js", "icon.svg"):
        assert (DEMO_DIR / fname).is_file(), f"Missing docs/demo/{fname}"

    html = (DEMO_DIR / "index.html").read_text(encoding="utf-8")
    assert "./styles.css" in html
    assert "./app.js" in html

    app_js = (DEMO_DIR / "app.js").read_text(encoding="utf-8")

    # All 12 strict-alphabetical ecosystem nodes present
    expected_nodes = [
        "aim-auditor",
        "aim-calendar",
        "aim-connect",
        "aim-connect-workspace",
        "aim-joshua",
        "aim-ld",
        "aim-tbsoftwash",
        "aim-tbsoftwash-content",
        "aim-youtube",
        "leaddeeds-motion-vault",
        "tbsoftwash-academy",
        "tbsoftwash-ai-book",
    ]
    for node in expected_nodes:
        assert f"'{node}'" in app_js or f'"{node}"' in app_js, f"Missing showcase node {node}"

    # Count gen: 'GEN #...' entries -> 40 multi-generation session records
    gen_matches = re.findall(r"gen:\s*'GEN #\d+'", app_js)
    assert len(gen_matches) == 40, f"Expected 40 session history reincarnations, got {len(gen_matches)}"

    # Strict privacy & moat guardrails
    forbidden_patterns = [
        "/" + "home/kingb",
        "kingb@",
        "9800X3D",
        "brian@leaddeeds.com",
        "SWFWMD",
        "SFWMD",
        "SJRWMD",
        "Water CRM",
        "nal_classifier",
    ]
    for tok in forbidden_patterns:
        assert tok.lower() not in app_js.lower(), f"Forbidden token {tok!r} found in docs/demo/app.js"

    # Only loopback, 0.0.0.0, or RFC 5737 documentation IPs allowed
    allowed_ips = {"0.0.0.0", "127.0.0.1", "198.51.100.42", "203.0.113.88"}
    found_ips = set(re.findall(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", app_js))
    assert found_ips.issubset(allowed_ips), f"Unexpected IPs in docs/demo/app.js: {found_ips - allowed_ips}"


def test_showcase_reflects_live_cockpit_features_260_through_281():
    """#283: Verify docs/demo/ mock matches live #260-#281 AIM-Connect architecture & UI controls."""
    icon_svg = (DEMO_DIR / "icon.svg").read_text(encoding="utf-8")
    styles_css = (DEMO_DIR / "styles.css").read_text(encoding="utf-8")
    app_js = (DEMO_DIR / "app.js").read_text(encoding="utf-8")

    # #269: Option A Emerald Matrix Fleet-Node emblem in icon.svg & app.js
    assert "neonBloom" in icon_svg
    assert "aimMark" in app_js

    # #281: All 6 Fleet filter pills including THINKING & NEW
    for flt_token in ('data-flt="all"', 'data-flt="thinking"', 'data-flt="new"', 'data-flt="nobrowser"', 'data-flt="servers"', 'data-flt="ctx"'):
        assert flt_token in app_js, f"Missing Fleet filter pill {flt_token}"

    # #279 & #280: Widescreen-only Split View (>900px) & non-overlapping flex headers
    assert "window.innerWidth > 900" in app_js
    assert ".copilot-top-left" in styles_css
    assert ".files-breadcrumb-trail" in styles_css

    # #260, #264, #272, #277: [CHAT VIEW | RAW TERM], GFM Markdown, unclipped terminal-stage-pad, & Discord Hop-to-Bottom
    assert "CHAT VIEW" in app_js and "RAW TERM" in app_js
    assert "sessionAutoScroll" in app_js
    assert "hop-bottom-fab" in app_js and ".hop-bottom-fab" in styles_css
    assert "terminal-stage-pad" in app_js
    assert "ld-markdown-body" in app_js and ".ld-markdown-body" in styles_css

    # #262, #266, #267, #270: 2-Column Left/Right Files Explorer, DOCS 1-TAB Reader, Breadcrumbs & Media Player
    assert "project-docs-hub-bar" in app_js and ".project-docs-hub-bar" in styles_css
    assert "1-TAB: ON" in app_js and "1-TAB: OFF" in app_js
    assert "PIN TAB" in app_js
    assert "RIGHT →" in app_js and "← LEFT" in app_js
    assert "files-tree-resizer" in app_js and ".files-tree-resizer" in styles_css
    assert "EDIT CODE" in app_js and "PREVIEW" in app_js
    assert "files-audio-player" in app_js and "SAVE AUDIO" in app_js
    assert "BINARY / NON-UTF-8" in app_js

    # #273, #275, #276: Browser PANE/FULL capture, Visual Markup Studio (6 inks w/ WHITE & BLACK), & 2FA Takeover Banner
    assert "VISUAL MARKUP STUDIO" in app_js
    assert "shot-markup-modal" in app_js and ".shot-markup-modal" in styles_css
    for ink_label in ("FIX", "KEEP", "INFO", "MOVE", "WHITE", "BLACK"):
        assert ink_label in app_js, f"Missing markup ink {ink_label}"
    assert "browser-human-gate-banner" in app_js and ".browser-human-gate-banner" in styles_css
    assert "TAKE CONTROL & 2FA" in app_js
    assert "RESUME AGENT" in app_js
    assert "BROWSER 2FA / LOGIN" in app_js

    # Settings parity (#266, #222): Workspace & Editor card + Alan UK J.O.S.H.U.A. / JARVIS Piper voice
    assert "piper:en_GB-alan-medium" in app_js
    assert "WORKSPACE &amp; EDITOR" in app_js or "WORKSPACE & EDITOR" in app_js


def test_readme_features_interactive_ecosystem_showcase_front_and_center():
    """#259: Interactive 12-Node / 40-Session A.I.M. Ecosystem Showcase must appear front-and-center at top of README.md."""
    readme = README_MD.read_text(encoding="utf-8")
    top_lines = "\n".join(readme.splitlines()[:40])
    assert "https://brianv1981.github.io/aim-connect/" in top_lines
    assert "docs/screenshots/emerald-matrix-showcase.png" in top_lines
    assert (REPO_ROOT / "docs" / "screenshots" / "emerald-matrix-showcase.png").is_file()
    assert (REPO_ROOT / ".github" / "workflows" / "pages.yml").is_file()
