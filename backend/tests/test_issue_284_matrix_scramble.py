import json
import subprocess
from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
SCRAMBLE_UTILS_JS = FRONTEND_SRC / "scrambleUtils.js"
SCRAMBLE_JS = FRONTEND_SRC / "scramble.js"
APP_JSX = FRONTEND_SRC / "App.jsx"
APP_CSS = FRONTEND_SRC / "App.css"


def test_scramble_utils_uses_22ms_tempo_and_computes_deterministic_frames_in_node():
    """#284: Verify 22ms Matrix Scramble timing constants, pure frame computation, and standalone exclusion helpers."""
    assert SCRAMBLE_UTILS_JS.is_file(), "Missing frontend/src/scrambleUtils.js"
    assert SCRAMBLE_JS.is_file(), "Missing frontend/src/scramble.js"

    raw_utils = SCRAMBLE_UTILS_JS.read_text(encoding="utf-8")
    raw_hooks = SCRAMBLE_JS.read_text(encoding="utf-8")
    assert "MATRIX_SCRAMBLE_TICK_MS = 22" in raw_utils
    assert "MATRIX_SCRAMBLE_STEP = 0.62" in raw_utils
    assert "export function computeScrambleFrame" in raw_utils
    assert "export function isStandaloneScrambleCandidate" in raw_utils
    assert "export function attachGlobalStandaloneButtonScrambles" in raw_utils
    assert "export function useStandaloneButtonScrambles" in raw_hooks

    script = f"""
import {{
  SCRAMBLE_CHARS,
  MATRIX_SCRAMBLE_TICK_MS,
  MATRIX_SCRAMBLE_STEP,
  computeScrambleFrame,
}} from {json.dumps(SCRAMBLE_UTILS_JS.as_uri())};

const f0 = computeScrambleFrame('KB OFF', 0);
const f2 = computeScrambleFrame('KB OFF', 2);
const fDone = computeScrambleFrame('KB OFF', 6);
const think0 = computeScrambleFrame('THINKING (4)', 0);
const think5 = computeScrambleFrame('THINKING (4)', 5);

console.log(JSON.stringify({{
  tick: MATRIX_SCRAMBLE_TICK_MS,
  step: MATRIX_SCRAMBLE_STEP,
  charCount: SCRAMBLE_CHARS.length,
  f0,
  f2,
  fDone,
  think0,
  think5,
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
    assert out["tick"] == 22
    assert out["step"] == 0.62
    assert out["charCount"] > 10
    assert len(out["f0"]) == len("KB OFF")
    assert out["f0"][2] == " "
    assert out["f0"] != "KB OFF"
    assert out["f2"].startswith("KB ")
    assert out["fDone"] == "KB OFF"
    assert out["think5"].startswith("THINK")


def test_app_jsx_wires_kb_scramble_and_standalone_button_delegation():
    """#284: Verify App.jsx wires KB OFF/KB ON scramble and global standalone button scrambling."""
    app_text = APP_JSX.read_text(encoding="utf-8")
    css_text = APP_CSS.read_text(encoding="utf-8")

    assert "useStandaloneButtonScrambles" in app_text
    assert "kbTabScramble = useMatrixScramble(showKeyboard ? 'KB ON' : 'KB OFF')" in app_text
    assert app_text.index("const [showKeyboard, setShowKeyboard]") < app_text.index("const kbTabScramble")
    assert "{kbTabScramble.display}" in app_text
    assert "onMouseEnter={kbTabScramble.triggerScramble}" in app_text
    assert "onMouseLeave={kbTabScramble.resetScramble}" in app_text
    assert 'data-scramble-manual="1"' in app_text

    assert ".fleet-filter-pill" in css_text
    pill_block = css_text.split(".fleet-filter-pill {", 1)[1].split("}", 1)[0]
    assert "white-space: nowrap" in pill_block
    assert "overflow: hidden" in pill_block


def test_standalone_exclusions_keep_fleet_cards_keyboards_and_browser_tabs_untouched():
    """#284: Verify exclusion selector list keeps fleet cards, keypads, tabs, and file links out of automatic scramble."""
    raw = SCRAMBLE_UTILS_JS.read_text(encoding="utf-8")
    for excluded in (
        '[data-scramble-manual="1"]',
        ".fleet-session-card",
        ".spotlight-card",
        ".fleet-delete-btn",
        ".totp-keypad",
        ".sovereign-keyboard",
        ".ctrl-key-grid",
        ".composer-keybar",
        ".cp-tab",
        ".cp-fav-bar",
        ".files-tree-panel",
        ".md-file-link",
        ".shot-link-btn",
    ):
        assert excluded in raw, f"Missing exclusion guard {excluded} in frontend/src/scrambleUtils.js"
