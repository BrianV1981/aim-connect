import re
from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"


def test_bolt_popover_is_solid_blurred_and_theme_tokens_defined():
    """#263: Bolt quick-actions popover uses opaque/blurred --bg-popover surface with zero undefined --bg-* tokens."""
    css = (FRONTEND_SRC / "App.css").read_text(encoding="utf-8")

    defined = set(re.findall(r"(--[a-zA-Z0-9_-]+)\s*:", css))
    used_bg = set(re.findall(r"var\(\s*(--bg-[a-zA-Z0-9_-]+)", css))
    missing_bg = used_bg - defined
    assert not missing_bg, f"Undefined --bg-* CSS tokens found: {missing_bg}"

    for theme_sel in ('[data-theme="emerald"]', '[data-theme="oled"]', '[data-theme="light"]', '[data-theme="navy"]'):
        assert theme_sel in css

    popover_block = css.split(".quick-actions-popover {")[1].split("}")[0]
    assert "var(--bg-popover" in popover_block
    assert "backdrop-filter: blur(" in popover_block
    assert "calc(100% - 24px)" in popover_block
    assert "100vw" not in popover_block


def test_keybar_docks_directly_above_composer_and_stays_confined_to_chat_width():
    """#263: Keybar renders inside .ld-composer-shell directly above .ld-composer-row and wraps within 100% width."""
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    css = (FRONTEND_SRC / "App.css").read_text(encoding="utf-8")

    # Keybar must be inside .ld-composer-shell right above .ld-composer-row, never above the center viewport
    before_composer, composer_and_after = app_jsx.split('<div className="ld-composer-shell">', 1)
    assert "commander-toolbar" not in before_composer
    composer_shell_only = composer_and_after.split('<form className="ld-composer-row"', 1)[0]
    assert 'className="commander-toolbar composer-keybar"' in composer_shell_only

    # Strict width confinement inside terminal column & composer bar
    keybar_css = css.split(".commander-toolbar.composer-keybar {")[1].split(".ld-composer-row {")[0]
    assert "width: 100%;" in keybar_css
    assert "max-width: 100%;" in keybar_css
    assert "min-width: 0;" in keybar_css
    assert "overflow-x: hidden;" in keybar_css
    assert "flex-wrap: wrap;" in keybar_css
