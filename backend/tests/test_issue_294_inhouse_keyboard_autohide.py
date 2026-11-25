import json
import subprocess
from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
KB_UTILS_JS = FRONTEND_SRC / "keyboardUtils.js"


def test_keyboard_utils_composer_routing_and_autohide_in_node():
    """#294: Verify in-house keyboard text routing into Chat View composer, PTY passthrough, and Auto-Hide defaults."""
    assert KB_UTILS_JS.is_file(), "Missing frontend/src/keyboardUtils.js"

    script = f"""
import {{
  loadKeyboardAutoHide,
  saveKeyboardAutoHide,
  shouldAutoHideKeyboardOnPointerDown,
  applyVirtualKeyToComposer,
}} from {json.dumps(KB_UTILS_JS.as_uri())};

// 1. Default Auto-Hide ON when unset
const mem = new Map();
const storage = {{
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
}};
const defaultOn = loadKeyboardAutoHide(storage);
saveKeyboardAutoHide(storage, false);
const savedOff = loadKeyboardAutoHide(storage);
saveKeyboardAutoHide(storage, true);
const savedOn = loadKeyboardAutoHide(storage);

// 2. Typing, backspace, cursor moves, Enter submit, and Ctrl+C passthrough
const r1 = applyVirtualKeyToComposer('', 'h', {{ selectionStart: 0, selectionEnd: 0 }});
const r2 = applyVirtualKeyToComposer('helo', 'l', {{ selectionStart: 2, selectionEnd: 2 }});
const r3 = applyVirtualKeyToComposer('hello', '\\x7f', {{ selectionStart: 5, selectionEnd: 5 }});
const r4 = applyVirtualKeyToComposer('hello', '\\x1b[D', {{ selectionStart: 5, selectionEnd: 5 }});
const r5 = applyVirtualKeyToComposer('hello', '\\r', {{ selectionStart: 5, selectionEnd: 5 }});
const r6 = applyVirtualKeyToComposer('hello', '\\x03', {{ selectionStart: 5, selectionEnd: 5 }});

// 3. Outside-tap detection
const mkTarget = (matches) => ({{
  closest: (sel) => matches.some((m) => sel.includes(m)) ? {{}} : null,
}});
const tapDock = shouldAutoHideKeyboardOnPointerDown(mkTarget(['.sovereign-keyboard-dock']), {{ showKeyboard: true, keyboardAutoHide: true }});
const tapComposer = shouldAutoHideKeyboardOnPointerDown(mkTarget(['.ld-input-box']), {{ showKeyboard: true, keyboardAutoHide: true }});
const tapToggle = shouldAutoHideKeyboardOnPointerDown(mkTarget(['[data-kb-toggle="true"]']), {{ showKeyboard: true, keyboardAutoHide: true }});
const tapStream = shouldAutoHideKeyboardOnPointerDown(mkTarget(['.live-transcript-stage']), {{ showKeyboard: true, keyboardAutoHide: true }});
const tapStreamDisabled = shouldAutoHideKeyboardOnPointerDown(mkTarget(['.live-transcript-stage']), {{ showKeyboard: true, keyboardAutoHide: false }});

console.log(JSON.stringify({{
  defaultOn,
  savedOff,
  savedOn,
  r1,
  r2,
  r3,
  r4,
  r5,
  r6,
  tapDock,
  tapComposer,
  tapToggle,
  tapStream,
  tapStreamDisabled,
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

    assert out["defaultOn"] is True
    assert out["savedOff"] is False
    assert out["savedOn"] is True

    assert out["r1"] == {"action": "edit", "text": "h", "caret": 1}
    assert out["r2"] == {"action": "edit", "text": "hello", "caret": 3}
    assert out["r3"] == {"action": "edit", "text": "hell", "caret": 4}
    assert out["r4"] == {"action": "caret", "text": "hello", "caret": 4}
    assert out["r5"] == {"action": "submit", "text": "hello", "caret": 5}
    assert out["r6"] == {"action": "passthrough_pty", "text": "hello", "caret": 5}

    assert out["tapDock"] is False
    assert out["tapComposer"] is False
    assert out["tapToggle"] is False
    assert out["tapStream"] is True
    assert out["tapStreamDisabled"] is False


def test_issue_294_inputmode_none_routing_and_settings_autohide_wired():
    """#294: Verify App.jsx sets inputMode='none' when KB ON, routes keys to composer, and SettingsModal exposes Auto-Hide (default ON)."""
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    settings_jsx = (FRONTEND_SRC / "components" / "SettingsModal.jsx").read_text(encoding="utf-8")

    assert "keyboardUtils" in app_jsx
    assert "inputMode={showKeyboard ? 'none' : undefined}" in app_jsx
    assert "applyVirtualKeyToComposer" in app_jsx
    assert "shouldAutoHideKeyboardOnPointerDown" in app_jsx
    assert "keyboardAutoHide" in app_jsx
    assert 'data-kb-dock="true"' in app_jsx
    assert 'data-kb-toggle="true"' in app_jsx
    assert "showSpawnModal" not in app_jsx and "deleteTarget" not in app_jsx
    assert "isSpawnModalOpen" in app_jsx and "isDeleteSessionModalOpen" in app_jsx

    assert "keyboardAutoHide" in settings_jsx
    assert "aim-kb-autohide" in settings_jsx
    assert "Auto-Hide In-House Keyboard" in settings_jsx
