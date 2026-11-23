import re
from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"


def test_terminal_container_zero_padding_for_fit_addon_row_math():
    """#272: @xterm/addon-fit reads parentElement border-box height without subtracting parentElement padding.

    Outer breathing room must live on .terminal-stage-pad while .terminal-container (terminalRef)
    keeps padding: 0 so FitAddon never allocates an extra half-clipped row over the tmux status bar.
    """
    css = (FRONTEND_SRC / "App.css").read_text(encoding="utf-8")
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    keyboard_jsx = (FRONTEND_SRC / "Keyboard.jsx").read_text(encoding="utf-8")

    assert ".terminal-stage-pad" in css
    assert "terminal-stage-pad" in app_jsx

    m = re.search(r"\.terminal-container\s*\{([^}]*)\}", css, re.DOTALL)
    assert m is not None, "Missing .terminal-container block in App.css"
    block = m.group(1)
    assert re.search(r"padding\s*:\s*0(?:px)?\s*;", block), (
        f".terminal-container must have padding: 0 so FitAddon does not clip bottom row; got:\n{block}"
    )

    # WebFont load re-fit + PTY resize sync on switching back to Raw Term
    assert "document.fonts" in app_jsx
    assert "syncTerminalFitAndResize" in app_jsx

    # F10 (\x1b[21~) preserved for tmux F10 (Popup) status bar action
    assert "label: 'F10'" in keyboard_jsx
    assert "\\x1b[21~" in keyboard_jsx
