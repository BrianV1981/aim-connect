import json
import subprocess
from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
COMPOSER_UTILS_JS = FRONTEND_SRC / "composerUtils.js"


def test_composer_utils_multiline_resize_and_shift_enter_in_node():
    """#289: Verify Shift+Enter newline vs Enter submit, auto-grow height, corner drag math, and storage persistence."""
    assert COMPOSER_UTILS_JS.is_file(), "Missing frontend/src/composerUtils.js"

    script = f"""
import {{
  COMPOSER_MIN_HEIGHT_PX,
  COMPOSER_AUTO_MAX_HEIGHT_PX,
  COMPOSER_MAX_HEIGHT_PX,
  clampComposerHeight,
  computeResizedComposerHeight,
  resolveComposerTextareaLayout,
  loadComposerCustomHeight,
  saveComposerCustomHeight,
  classifyComposerKeyAction,
  resolveComposerActionsLayout,
}} from {json.dumps(COMPOSER_UTILS_JS.as_uri())};

// 1. Key classification: Enter submits, Shift+Enter inserts newline, slash menu takes precedence without Shift
const kEnter = classifyComposerKeyAction({{ key: 'Enter', shiftKey: false }}, {{ slashMenuOpen: false }});
const kShiftEnter = classifyComposerKeyAction({{ key: 'Enter', shiftKey: true }}, {{ slashMenuOpen: false }});
const kSlashEnter = classifyComposerKeyAction({{ key: 'Enter', shiftKey: false }}, {{ slashMenuOpen: true }});
const kSlashShiftEnter = classifyComposerKeyAction({{ key: 'Enter', shiftKey: true }}, {{ slashMenuOpen: true }});
const kSlashTab = classifyComposerKeyAction({{ key: 'Tab' }}, {{ slashMenuOpen: true }});
const kImeEnter = classifyComposerKeyAction({{ key: 'Enter', isComposing: true }}, {{ slashMenuOpen: false }});

// 2. Auto-grow layout when no manual resize is set
const singleRow = resolveComposerTextareaLayout({{ scrollHeight: 28, customHeight: null }});
const threeRows = resolveComposerTextareaLayout({{ scrollHeight: 68, customHeight: null }});
const cappedAuto = resolveComposerTextareaLayout({{ scrollHeight: 220, customHeight: null }});
const manualLayout = resolveComposerTextareaLayout({{ scrollHeight: 28, customHeight: 150 }});

// 3. Upward drag from bottom bar (clientY decreases => height increases) and bounds clamping
const draggedUp = computeResizedComposerHeight(32, 800, 710);
const draggedDownFloor = computeResizedComposerHeight(40, 800, 920);
const draggedUpCap = computeResizedComposerHeight(200, 800, 400);

// 4. Storage persistence & reset
const mem = new Map();
const fakeStorage = {{
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
}};
saveComposerCustomHeight(fakeStorage, 140);
const loadedCustom = loadComposerCustomHeight(fakeStorage);
saveComposerCustomHeight(fakeStorage, null);
const clearedCustom = loadComposerCustomHeight(fakeStorage);

// 5. Adaptive 3-tier action button layout with hysteresis (#292)
const actRow = resolveComposerActionsLayout(28, 'row');
const actTwoTier = resolveComposerActionsLayout(64, 'row');
const actTwoTierHyst = resolveComposerActionsLayout(56, 'two-tier');
const actBackToRow = resolveComposerActionsLayout(48, 'two-tier');
const actStacked = resolveComposerActionsLayout(100, 'two-tier');
const actStackedHyst = resolveComposerActionsLayout(88, 'stacked');

console.log(JSON.stringify({{
  COMPOSER_MIN_HEIGHT_PX,
  COMPOSER_AUTO_MAX_HEIGHT_PX,
  COMPOSER_MAX_HEIGHT_PX,
  kEnter,
  kShiftEnter,
  kSlashEnter,
  kSlashShiftEnter,
  kSlashTab,
  kImeEnter,
  singleRow,
  threeRows,
  cappedAuto,
  manualLayout,
  draggedUp,
  draggedDownFloor,
  draggedUpCap,
  loadedCustom,
  clearedCustom,
  clampedNull: clampComposerHeight('not-a-num'),
  actRow,
  actTwoTier,
  actTwoTierHyst,
  actBackToRow,
  actStacked,
  actStackedHyst,
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

    assert out["kEnter"] == "submit"
    assert out["kShiftEnter"] == "newline"
    assert out["kSlashEnter"] == "slash_select"
    assert out["kSlashShiftEnter"] == "newline"
    assert out["kSlashTab"] == "slash_select"
    assert out["kImeEnter"] == "none"

    assert out["singleRow"] == {"heightPx": out["COMPOSER_MIN_HEIGHT_PX"], "overflowY": "hidden", "isManual": False}
    assert out["threeRows"] == {"heightPx": 68, "overflowY": "hidden", "isManual": False}
    assert out["cappedAuto"] == {"heightPx": out["COMPOSER_AUTO_MAX_HEIGHT_PX"], "overflowY": "auto", "isManual": False}
    assert out["manualLayout"] == {"heightPx": 150, "overflowY": "auto", "isManual": True}

    assert out["draggedUp"] == 122
    assert out["draggedDownFloor"] == out["COMPOSER_MIN_HEIGHT_PX"]
    assert out["draggedUpCap"] == out["COMPOSER_MAX_HEIGHT_PX"]
    assert out["loadedCustom"] == 140
    assert out["clearedCustom"] is None
    assert out["clampedNull"] is None
    assert out["actRow"] == "row"
    assert out["actTwoTier"] == "two-tier"
    assert out["actTwoTierHyst"] == "two-tier"
    assert out["actBackToRow"] == "row"
    assert out["actStacked"] == "stacked"
    assert out["actStackedHyst"] == "stacked"


def test_issue_289_multiline_composer_resize_and_bordered_controls_wired():
    """#289/#292: Verify App.jsx uses textarea + Shift+Enter + resize grip + adaptive 3-tier action layout."""
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    app_css = (FRONTEND_SRC / "App.css").read_text(encoding="utf-8")

    assert "composerUtils" in app_jsx
    assert "<textarea" in app_jsx
    assert "composer-resize-handle" in app_jsx
    assert "classifyComposerKeyAction" in app_jsx
    assert "resolveComposerActionsLayout" in app_jsx
    assert "data-actions-layout" in app_jsx
    assert "Shift+Enter" in app_jsx
    assert "composer-mic-btn" in app_jsx
    assert "composer-speak-btn" in app_jsx
    assert "composer-actions-group" in app_jsx

    assert ".composer-resize-handle" in app_css
    assert ".composer-actions-group" in app_css
    assert 'data-actions-layout="two-tier"' in app_css
    assert 'data-actions-layout="stacked"' in app_css
    assert ".composer-icon-btn" in app_css
    # Mic & Speaker buttons must have explicit borders (not border: none)
    btn_block = app_css.split(".composer-icon-btn {", 1)[1].split("}", 1)[0]
    assert "border:" in btn_block and "border: none" not in btn_block
