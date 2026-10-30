import json
import subprocess
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = REPO_ROOT / "frontend" / "src"
APP_JSX = FRONTEND_SRC / "App.jsx"
APP_CSS = FRONTEND_SRC / "App.css"
SCROLLBACK_OVERLAY_JSX = FRONTEND_SRC / "components" / "ScrollbackOverlay.jsx"
FILE_EXPLORER_JSX = FRONTEND_SRC / "components" / "FileExplorer.jsx"
SELECTION_UTILS_JS = FRONTEND_SRC / "scrollbackSelection.js"


def test_no_contenteditable_on_readonly_selection_surfaces():
    """contentEditable={true} collapses DOM highlights on right-click mousedown (#227)."""
    for jsx_path in (APP_JSX, SCROLLBACK_OVERLAY_JSX, FILE_EXPLORER_JSX):
        text = jsx_path.read_text(encoding="utf-8")
        assert "contentEditable" not in text, (
            f"{jsx_path.name} still uses contentEditable, which collapses selection on right-click"
        )


def test_scrollback_selection_utils_behavior_via_node():
    """Verify pure JS scrollback sanitizer & right-click selection guard in Node (#227)."""
    assert SELECTION_UTILS_JS.is_file(), "scrollbackSelection.js helper module must exist"

    script = f"""
import {{
  sanitizeAnsiScrollback,
  stripAnsiAndTrimLines,
  shouldPreserveSelectionOnMouseDown,
}} from {json.dumps(SELECTION_UTILS_JS.as_uri())};

const raw = [
  "\\x1b[1m\\x1b[38;5;111m> Highlight this exact sentence cleanly.\\x1b[0m                                        ",
  "  indented continuation line   ",
  "\\x1b[38;5;110mesc to cancel\\x1b[39m                                                      ",
].join("\\r\\n");

const cleanedAnsi = sanitizeAnsiScrollback(raw);
const plain = stripAnsiAndTrimLines(raw);

const result = {{
  cleanedAnsiLines: cleanedAnsi.split("\\n"),
  plainLines: plain.split("\\n"),
  rightClickWithSelection: shouldPreserveSelectionOnMouseDown(
    {{ button: 2, ctrlKey: false }},
    {{ isCollapsed: false, toString: () => "Highlight this exact sentence cleanly." }}
  ),
  ctrlLeftClickWithSelection: shouldPreserveSelectionOnMouseDown(
    {{ button: 0, ctrlKey: true }},
    {{ isCollapsed: false, toString: () => "sentence" }}
  ),
  rightClickCollapsed: shouldPreserveSelectionOnMouseDown(
    {{ button: 2, ctrlKey: false }},
    {{ isCollapsed: true, toString: () => "" }}
  ),
  leftClickWithSelection: shouldPreserveSelectionOnMouseDown(
    {{ button: 0, ctrlKey: false }},
    {{ isCollapsed: false, toString: () => "sentence" }}
  ),
}};
console.log(JSON.stringify(result));
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        capture_output=True,
        text=True,
        check=True,
    )
    out = json.loads(proc.stdout.strip())

    # Trailing 40-space tmux padding must be stripped while ANSI SGR codes and leading indent survive
    assert out["cleanedAnsiLines"][0].endswith("> Highlight this exact sentence cleanly.\x1b[0m")
    assert out["cleanedAnsiLines"][1] == "  indented continuation line"
    assert out["cleanedAnsiLines"][2] == "\x1b[38;5;110mesc to cancel\x1b[39m"

    assert out["plainLines"] == [
        "> Highlight this exact sentence cleanly.",
        "  indented continuation line",
        "esc to cancel",
    ]

    # Right-click (button 2) and Ctrl+Click (macOS context click) must preserve non-empty selection
    assert out["rightClickWithSelection"] is True
    assert out["ctrlLeftClickWithSelection"] is True
    # Collapsed selection or normal left-click must NOT be blocked so dragging a new selection works
    assert out["rightClickCollapsed"] is False
    assert out["leftClickWithSelection"] is False


def test_scrollback_overlay_and_file_explorer_guard_right_click_and_copy_selection():
    """Both ScrollbackOverlay and FileExplorer must preserve right-click selection and offer Copy Selection (#227)."""
    overlay_text = SCROLLBACK_OVERLAY_JSX.read_text(encoding="utf-8")
    explorer_text = FILE_EXPLORER_JSX.read_text(encoding="utf-8")

    # ScrollbackOverlay must be memoized, have no surprise onScroll auto-close, guard right-click, and offer Copy Selection
    assert "memo(" in overlay_text
    assert "onScroll=" not in overlay_text
    assert "shouldPreserveSelectionOnMouseDown" in overlay_text
    assert "Copy Selection" in overlay_text
    assert "Copy All" in overlay_text
    assert "<pre" in overlay_text

    # FileExplorer select-text surface must also guard right-click and offer Copy Selection on <pre>
    assert "shouldPreserveSelectionOnMouseDown" in explorer_text
    assert "Copy Selection" in explorer_text
    assert "<pre" in explorer_text


def test_app_wires_scrollback_overlay_blurs_xterm_and_toggles_cleanly():
    """App.jsx must mount <ScrollbackOverlay />, blur xterm on open, mute xterm keys while open, and toggle on click (#227)."""
    app_text = APP_JSX.read_text(encoding="utf-8")
    assert "import ScrollbackOverlay from './components/ScrollbackOverlay'" in app_text
    assert "<ScrollbackOverlay" in app_text
    assert "term.current.blur()" in app_text or "term.current?.blur()" in app_text
    assert "if (isNativeScrollModeRef.current) return false;" in app_text


def test_app_css_isolates_selection_from_surrounding_chrome():
    """App.css must lock surrounding chrome with user-select: none and fix z-index + word-break (#227)."""
    css_text = APP_CSS.read_text(encoding="utf-8")
    assert "word-break: break-all" not in css_text, (
        "word-break: break-all breaks English words mid-syllable and distorts sentence selection"
    )
    assert "z-index: 1002" in css_text, (
        "Scrollback overlay must sit above .xterm-helper-textarea (z-index: 1000)"
    )
    assert "overflow-wrap: anywhere" in css_text
    assert ".scrollback-toolbar" in css_text
    assert "user-select: none" in css_text
