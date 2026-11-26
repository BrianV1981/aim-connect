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
    for flt_token in ('data-flt="all"', 'data-flt="thinking"', 'data-flt="new"', 'data-flt="recent"', 'data-flt="servers"', 'data-flt="ctx"'):
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

    # Non-agent Google & YouTube globe user tabs, dropped localhost calendar/youtube tabs, real WebP captures, & standalone button Matrix Scramble
    assert "tab-user-google" in app_js and "tab-user-youtube" in app_js
    assert "'tab-calendar'" not in app_js and "'tab-youtube'" not in app_js
    for screen_name in (
        "google.webp",
        "youtube.webp",
        "leaddeeds.webp",
        "tbsoftwash.webp",
        "github-joshua.webp",
        "academy.webp",
        "github-connect.webp",
    ):
        assert (DEMO_DIR / "screens" / screen_name).is_file(), f"Missing docs/demo/screens/{screen_name}"
        assert f"./screens/{screen_name}" in app_js, f"Missing screen asset reference {screen_name}"
    assert "MATRIX_SCRAMBLE_TICK_MS" in app_js
    assert "bindStandaloneButtonScrambles" in app_js
    assert 'id="scramble-kb"' in app_js
    assert "prevTabsLeft" in app_js and "copilot-tabs-row" in app_js
    assert "prevStreamTop" in app_js and "hop-bottom-fab" in app_js

    # Settings parity (#266, #222): Workspace & Editor card + Alan UK J.O.S.H.U.A. / JARVIS Piper voice
    assert "piper:en_GB-alan-medium" in app_js
    assert "WORKSPACE &amp; EDITOR" in app_js or "WORKSPACE & EDITOR" in app_js

    # #289 / #290: Multi-row resizable textarea composer, Shift+Enter newline, & bordered Mic/Speaker controls
    assert "<textarea" in app_js and 'id="node-input"' in app_js
    assert "composer-resize-handle" in app_js and ".composer-resize-handle" in styles_css
    assert "composer-actions-group" in app_js and ".composer-actions-group" in styles_css
    assert "composer-mic-btn" in app_js and "composer-speak-btn" in app_js
    assert "Shift+Enter" in app_js and "composerCustomHeight" in app_js
    assert "data-actions-layout" in app_js and 'data-actions-layout="two-tier"' in styles_css and 'data-actions-layout="stacked"' in styles_css
    btn_block = styles_css.split(".composer-icon-btn {", 1)[1].split("}", 1)[0]
    assert "border:" in btn_block and "transparent" not in btn_block

    # #299 / #300 / #302: TMUX & BOOT 5-card Settings tab, Empty-Save Guardrail, Fast Resume (-c), & Git Repo Launcher
    assert "TMUX & BOOT" in app_js
    assert "EMPTY-SAVE GUARDRAIL // TMUX-RESURRECT" in app_js
    assert "GIT PROJECT LAUNCHER" in app_js
    assert "Workspace: Save Tmux State" in app_js
    assert "Workspace: Restore Tmux State" in app_js
    assert "Agent: Fast Resume (-c)" in app_js
    assert 'data-act="open-repo-launcher"' in app_js
    assert 'data-act="save-tmux-state"' in app_js
    assert 'data-act="restore-tmux-state"' in app_js

    # #304 / #305 / #306 / #307: Refresh App, Reversible WSL2 Always-On, & Multi-Server Switcher parity
    html_text = (DEMO_DIR / "index.html").read_text(encoding="utf-8")
    assert "?v=307" in html_text
    assert "REFRESH APP" in app_js
    assert 'data-act="hard-refresh-app"' in app_js
    assert "TURN OFF & REVERT ALWAYS-ON" in app_js
    assert "./scripts/wsl-keepalive.sh off" in app_js
    assert "SERVER IDENTITY &amp; MULTI-SERVER SWITCHER" in app_js
    assert "LOGOUT &amp; SWITCH" in app_js
    assert "SWITCH NODE" in app_js
    assert "LOCK / SWITCH SERVER" in app_js

    proto_dir = DEMO_DIR.parents[1] / "planning-artifacts" / "emerald-matrix-prototype"
    if proto_dir.is_dir():
        for fname in ("index.html", "styles.css", "app.js"):
            assert (DEMO_DIR / fname).read_text(encoding="utf-8") == (proto_dir / fname).read_text(
                encoding="utf-8"
            ), f"docs/demo/{fname} and planning-artifacts/emerald-matrix-prototype/{fname} drifted"


def test_readme_features_interactive_ecosystem_showcase_front_and_center():
    """#259/#298: Interactive 12-Node / 40-Session A.I.M. Ecosystem Showcase must appear front-and-center at top of README.md without obsolete screenshot tables."""
    readme = README_MD.read_text(encoding="utf-8")
    top_lines = "\n".join(readme.splitlines()[:35])
    assert "https://brianv1981.github.io/aim-connect/" in top_lines
    assert "docs/screenshots/emerald-matrix-showcase.png" in top_lines
    assert "aim-connect_homepage.png" not in readme
    assert "aim-joshua-home-android.jpg" not in readme
    # Historical progression images remain preserved in docs/screenshots/
    assert (REPO_ROOT / "docs" / "screenshots" / "aim-connect_homepage.png").is_file()
    assert (REPO_ROOT / "docs" / "screenshots" / "emerald-matrix-showcase.png").is_file()
    assert (REPO_ROOT / ".github" / "workflows" / "pages.yml").is_file()
