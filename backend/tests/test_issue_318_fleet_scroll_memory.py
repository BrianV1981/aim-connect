"""#318: Fleet panel remembers its scroll position across close/reopen.

`FleetSidebar` unmounts when closed (mobile auto-closes it on session switch), so the list's
scrollTop must be persisted outside the component and restored when it reopens.
"""

import json
import subprocess
from pathlib import Path

WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
UTILS_JS = FRONTEND_SRC / "fleetScrollMemory.js"
SIDEBAR_JSX = FRONTEND_SRC / "components" / "FleetSidebar.jsx"


def test_fleet_scroll_memory_helpers_node():
    assert UTILS_JS.is_file()
    node_script = f"""
import assert from 'node:assert/strict';
import {{
  FLEET_SCROLL_STORAGE_KEY,
  saveFleetScrollTop,
  loadFleetScrollTop,
}} from {json.dumps(UTILS_JS.as_uri())};

const mem = () => {{
  const m = new Map();
  return {{ getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }};
}};

// Round-trip
const s = mem();
assert.equal(loadFleetScrollTop(s), 0);
saveFleetScrollTop(s, 1234.6);
assert.equal(s.getItem(FLEET_SCROLL_STORAGE_KEY), '1235');
assert.equal(loadFleetScrollTop(s), 1235);

// Garbage / negative / missing storage are safe
const g = mem();
g.setItem(FLEET_SCROLL_STORAGE_KEY, 'nope');
assert.equal(loadFleetScrollTop(g), 0);
g.setItem(FLEET_SCROLL_STORAGE_KEY, '-50');
assert.equal(loadFleetScrollTop(g), 0);
assert.equal(loadFleetScrollTop(null), 0);
assert.doesNotThrow(() => saveFleetScrollTop(null, 10));

// Throwing storage (Safari private mode / quota) never breaks the UI
const boom = {{ getItem() {{ throw new Error('x'); }}, setItem() {{ throw new Error('x'); }} }};
assert.equal(loadFleetScrollTop(boom), 0);
assert.doesNotThrow(() => saveFleetScrollTop(boom, 10));
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", node_script], capture_output=True, text=True, check=False
    )
    assert proc.returncode == 0, f"Node test failed:\nSTDOUT: {proc.stdout}\nSTDERR: {proc.stderr}"


def test_fleet_sidebar_wires_scroll_persistence_and_restore():
    jsx = SIDEBAR_JSX.read_text(encoding="utf-8")
    assert "fleetScrollMemory" in jsx
    assert "useLayoutEffect" in jsx
    assert "ref={listRef}" in jsx
    assert "onScroll={handleListScroll}" in jsx
    assert "loadFleetScrollTop" in jsx and "saveFleetScrollTop" in jsx
