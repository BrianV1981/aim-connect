import json
import subprocess
from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = WORKTREE_ROOT / "frontend"
FRONTEND_SRC = FRONTEND_DIR / "src"
VIEWPORT_UTILS_JS = FRONTEND_SRC / "mobileViewportUtils.js"


def test_mobile_viewport_utils_keyboard_and_offset_pinning_in_node():
    """#291: Verify visualViewport height/offsetTop pinning under both resizes-content and resizes-visual modes."""
    assert VIEWPORT_UTILS_JS.is_file(), "Missing frontend/src/mobileViewportUtils.js"

    script = f"""
import {{
  isTextInputElement,
  computeMobileViewportState,
}} from {json.dumps(VIEWPORT_UTILS_JS.as_uri())};

// 1. Mobile portrait idle (no keyboard)
const idle = computeMobileViewportState({{
  innerWidth: 390,
  innerHeight: 844,
  baselineHeight: 844,
  visualViewport: {{ height: 844, offsetTop: 0, offsetLeft: 0 }},
  activeElementIsInput: false,
}});

// 2. Android resizes-content (innerHeight and visualViewport both shrink cleanly)
const resizesContent = computeMobileViewportState({{
  innerWidth: 390,
  innerHeight: 504,
  baselineHeight: 844,
  visualViewport: {{ height: 504, offsetTop: 0, offsetLeft: 0 }},
  activeElementIsInput: true,
}});

// 3. iOS / resizes-visual (innerHeight stays 844, visualViewport shrinks and pans offsetTop)
const resizesVisual = computeMobileViewportState({{
  innerWidth: 390,
  innerHeight: 844,
  baselineHeight: 844,
  visualViewport: {{ height: 480, offsetTop: 364, offsetLeft: 0 }},
  activeElementIsInput: true,
}});

// 4. Desktop window resize does not trigger mobile keyboard mode
const desktop = computeMobileViewportState({{
  innerWidth: 1280,
  innerHeight: 520,
  baselineHeight: 900,
  visualViewport: {{ height: 520, offsetTop: 0, offsetLeft: 0 }},
  activeElementIsInput: true,
}});

console.log(JSON.stringify({{
  idle,
  resizesContent,
  resizesVisual,
  desktop,
  ta: isTextInputElement({{ tagName: 'TEXTAREA' }}),
  btn: isTextInputElement({{ tagName: 'BUTTON' }}),
  txt: isTextInputElement({{ tagName: 'INPUT', type: 'text' }}),
  chk: isTextInputElement({{ tagName: 'INPUT', type: 'checkbox' }}),
}}));
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        capture_output=True,
        text=True,
        timeout=4.0,
    )
    assert proc.returncode == 0, proc.stderr
    out = json.loads(proc.stdout.strip())

    assert out["idle"] == {
        "vvHeight": 844,
        "vvTop": 0,
        "vvLeft": 0,
        "vhPx": 8.44,
        "isMobile": True,
        "keyboardOpen": False,
    }
    assert out["resizesContent"]["vvHeight"] == 504
    assert out["resizesContent"]["vvTop"] == 0
    assert out["resizesContent"]["keyboardOpen"] is True

    assert out["resizesVisual"]["vvHeight"] == 480
    assert out["resizesVisual"]["vvTop"] == 364
    assert out["resizesVisual"]["keyboardOpen"] is True

    assert out["desktop"]["isMobile"] is False
    assert out["desktop"]["keyboardOpen"] is False

    assert out["ta"] is True
    assert out["btn"] is False
    assert out["txt"] is True
    assert out["chk"] is False


def test_issue_291_mobile_keyboard_viewport_lock_wired():
    """#291: Verify index.html, App.jsx, and App.css eliminate body min-height race and lock visualViewport."""
    index_html = (FRONTEND_DIR / "index.html").read_text(encoding="utf-8")
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    app_css = (FRONTEND_SRC / "App.css").read_text(encoding="utf-8")

    assert "interactive-widget=resizes-content" in index_html
    assert "mobileViewportUtils" in app_jsx
    assert "--vv-height" in app_jsx and "--vv-top" in app_jsx
    assert "visualViewport" in app_jsx and "'scroll'" in app_jsx
    assert "dataset.kbOpen" in app_jsx or "data-kb-open" in app_jsx

    body_block = app_css.split("body {", 1)[1].split("}", 1)[0]
    assert "min-height: calc(var(--vh" not in body_block
    assert "--vv-height" in app_css and "--vv-top" in app_css
    assert "data-kb-open" in app_css
    assert "font-size: 16px" in app_css
