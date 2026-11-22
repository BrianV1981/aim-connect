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


def test_readme_features_interactive_ecosystem_showcase_front_and_center():
    """#259: Interactive 12-Node / 40-Session A.I.M. Ecosystem Showcase must appear front-and-center at top of README.md."""
    readme = README_MD.read_text(encoding="utf-8")
    top_lines = "\n".join(readme.splitlines()[:40])
    assert "https://brianv1981.github.io/aim-connect/" in top_lines
    assert "docs/screenshots/emerald-matrix-showcase.png" in top_lines
    assert (REPO_ROOT / "docs" / "screenshots" / "emerald-matrix-showcase.png").is_file()
    assert (REPO_ROOT / ".github" / "workflows" / "pages.yml").is_file()
