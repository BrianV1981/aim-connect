import json
import subprocess
from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
LAYOUT_UTILS_JS = FRONTEND_SRC / "sessionLayoutUtils.js"


def test_session_layout_memory_and_pruning_in_node():
    """#285: Verify per-session UI layout memory, lightweight sanitization, LRU cap, global fallback, and doc-label swap."""
    assert LAYOUT_UTILS_JS.is_file(), "Missing frontend/src/sessionLayoutUtils.js"

    script = f"""
import {{
  SESSION_LAYOUT_STORAGE_KEY,
  MAX_REMEMBERED_SESSIONS,
  MAX_REMEMBERED_TABS,
  sanitizeFilesSnapshot,
  loadSessionLayoutMap,
  saveSessionLayoutMap,
  upsertSessionLayout,
  resolveSessionLayoutOnSwitch,
  pickPreferredWorkspaceFile,
}} from {json.dumps(LAYOUT_UTILS_JS.as_uri())};

// Mock localStorage
const store = new Map();
const memStorage = {{
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
}};

// 1. Heavy blob/content/tree fields must be stripped by sanitizeFilesSnapshot
const bloated = sanitizeFilesSnapshot({{
  openFiles: [
    {{ path: '/repo/a/HANDOFF.md', label: 'HANDOFF.md', content: 'HUGE_TEXT_'.repeat(5000), blobUrl: 'blob:http://localhost/123', playbackRate: 1 }},
    {{ path: '/repo/a/clip.mp4', label: 'clip.mp4', blobUrl: 'blob:http://localhost/456', playbackRate: 1.5 }},
    {{ path: '/repo/a/clip.mp4', label: 'clip.mp4' }}, // duplicate
  ],
  activePath: '/repo/a/clip.mp4',
  currentDir: '/repo/a/media',
  navMode: 'files',
  mdViewMode: 'preview',
  mediaPositions: {{ '/repo/a/clip.mp4': 14.256, '/repo/a/zero.mp4': 0 }},
  dirChildrenMap: {{ '/repo/a': ['heavy'] }},
}});

// 2. Build multi-session workspace memories
let map = {{}};
map = upsertSessionLayout(map, 'aim-connect', {{
  pane: 'files',
  splitMode: true,
  files: {{
    openFiles: [{{ path: '/home/u/aim-connect/HANDOFF.md', label: 'HANDOFF.md' }}],
    activePath: '/home/u/aim-connect/HANDOFF.md',
    currentDir: '/home/u/aim-connect',
  }},
  updatedAt: 100,
}});
map = upsertSessionLayout(map, 'aim-tbsoftwash', {{
  pane: 'browser',
  splitMode: true,
  browserTargetId: 'TARGET_TB_1',
  updatedAt: 200,
}});
map = upsertSessionLayout(map, 'aim-calendar', {{
  pane: 'terminal',
  splitMode: true,
  updatedAt: 300,
}});
map = upsertSessionLayout(map, 'aim-ayrianna', {{
  pane: 'files',
  splitMode: false,
  files: {{
    openFiles: [{{ path: '/home/u/aim-ayrianna/walkthrough.mp4', label: 'walkthrough.mp4', playbackRate: 1.25 }}],
    activePath: '/home/u/aim-ayrianna/walkthrough.mp4',
    mediaPositions: {{ '/home/u/aim-ayrianna/walkthrough.mp4': 42.5 }},
  }},
  updatedAt: 400,
}});

saveSessionLayoutMap(map, memStorage);
const reloaded = loadSessionLayoutMap(memStorage);

// 3. Resolve switching across sessions in per-session mode vs unvisited vs global mode
const toConnect = resolveSessionLayoutOnSwitch({{
  layoutMode: 'per-session',
  layoutMap: reloaded,
  targetSession: 'aim-connect',
  currentPane: 'terminal',
  currentSplitMode: true,
}});
const toTb = resolveSessionLayoutOnSwitch({{
  layoutMode: 'per-session',
  layoutMap: reloaded,
  targetSession: 'aim-tbsoftwash',
  currentPane: 'files',
  currentSplitMode: true,
}});
const toCalendar = resolveSessionLayoutOnSwitch({{
  layoutMode: 'per-session',
  layoutMap: reloaded,
  targetSession: 'aim-calendar',
  currentPane: 'browser',
  currentSplitMode: true,
}});
const toAyrianna = resolveSessionLayoutOnSwitch({{
  layoutMode: 'per-session',
  layoutMap: reloaded,
  targetSession: 'aim-ayrianna',
  currentPane: 'terminal',
  currentSplitMode: true,
}});
const toBrandNew = resolveSessionLayoutOnSwitch({{
  layoutMode: 'per-session',
  layoutMap: reloaded,
  targetSession: 'brand-new-node',
  currentPane: 'files',
  currentSplitMode: false,
  defaultSplit: true,
}});
const toTbGlobal = resolveSessionLayoutOnSwitch({{
  layoutMode: 'global',
  layoutMap: reloaded,
  targetSession: 'aim-tbsoftwash',
  currentPane: 'files',
  currentSplitMode: true,
  matchedFleet: {{ has_browser_lease: true, browser_tab_id: 'LIVE_LEASE_9' }},
}});

// 4. Verify bounded MAX_REMEMBERED_SESSIONS LRU pruning
let manyMap = {{}};
for (let i = 0; i < MAX_REMEMBERED_SESSIONS + 12; i++) {{
  manyMap = upsertSessionLayout(manyMap, `sess-${{i}}`, {{ pane: 'terminal', updatedAt: i + 1 }});
}}
const prunedKeys = Object.keys(manyMap);

// 5. Verify pickPreferredWorkspaceFile swaps to matching doc label (e.g. HANDOFF.md -> target HANDOFF.md)
const pickedHandoff = pickPreferredWorkspaceFile(
  [
    {{ label: 'README.md', path: '/tb/README.md', exists: true }},
    {{ label: 'HANDOFF.md', path: '/tb/HANDOFF.md', exists: true }},
  ],
  ['HANDOFF.md']
);
const pickedFallback = pickPreferredWorkspaceFile(
  [
    {{ label: 'AGENTS.md', path: '/cal/AGENTS.md', exists: true }},
    {{ label: 'README.md', path: '/cal/README.md', exists: true }},
  ],
  ['HANDOFF.md']
);

console.log(JSON.stringify({{
  storageKey: SESSION_LAYOUT_STORAGE_KEY,
  maxTabs: MAX_REMEMBERED_TABS,
  bloated,
  toConnect,
  toTb,
  toCalendar,
  toAyrianna,
  toBrandNew,
  toTbGlobal,
  prunedCount: prunedKeys.length,
  keptNewest: Boolean(manyMap[`sess-${{MAX_REMEMBERED_SESSIONS + 11}}`]),
  droppedOldest: !manyMap['sess-0'],
  pickedHandoff: pickedHandoff?.path || null,
  pickedFallback: pickedFallback?.path || null,
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

    # Bloated fields stripped & duplicates collapsed
    assert len(out["bloated"]["openFiles"]) == 2
    assert "content" not in out["bloated"]["openFiles"][0]
    assert "blobUrl" not in out["bloated"]["openFiles"][0]
    assert "dirChildrenMap" not in out["bloated"]
    assert out["bloated"]["mediaPositions"] == {"/repo/a/clip.mp4": 14.26}

    # Per-session restores
    assert out["toConnect"]["pane"] == "files"
    assert out["toConnect"]["filesSnapshot"]["activePath"] == "/home/u/aim-connect/HANDOFF.md"
    assert out["toTb"]["pane"] == "browser"
    assert out["toTb"]["browserTargetId"] == "TARGET_TB_1"
    assert out["toCalendar"]["pane"] == "terminal"
    assert out["toAyrianna"]["pane"] == "files"
    assert out["toAyrianna"]["splitMode"] is False
    assert out["toAyrianna"]["filesSnapshot"]["mediaPositions"]["/home/u/aim-ayrianna/walkthrough.mp4"] == 42.5
    assert out["toBrandNew"]["pane"] == "terminal"
    assert out["toBrandNew"]["splitMode"] is True

    # Global keeps current pane & splitMode while picking live lease target
    assert out["toTbGlobal"]["pane"] == "files"
    assert out["toTbGlobal"]["browserTargetId"] == "LIVE_LEASE_9"

    # Bounded LRU cap
    assert out["prunedCount"] == 40
    assert out["keptNewest"] is True
    assert out["droppedOldest"] is True

    # Matching Brain doc swap across repos
    assert out["pickedHandoff"] == "/tb/HANDOFF.md"
    assert out["pickedFallback"] == "/cal/README.md"


def test_issue_285_ui_contracts_and_resource_cleanup():
    """#285: Verify App, FileExplorer, BrowserPane, and SettingsModal wire per-session layout memory & resource teardown."""
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    files_jsx = (FRONTEND_SRC / "components" / "FileExplorer.jsx").read_text(encoding="utf-8")
    browser_jsx = (FRONTEND_SRC / "components" / "BrowserPane.jsx").read_text(encoding="utf-8")
    settings_jsx = (FRONTEND_SRC / "components" / "SettingsModal.jsx").read_text(encoding="utf-8")

    # App.jsx wires sessionLayoutMode + resolveSessionLayoutOnSwitch + upsertSessionLayout
    assert "sessionLayoutUtils" in app_jsx
    assert "sessionLayoutMode" in app_jsx
    assert "resolveSessionLayoutOnSwitch" in app_jsx
    assert "savedFilesState" in app_jsx
    assert "onFilesStateChange" in app_jsx
    assert "onActiveTargetChange" in app_jsx

    # FileExplorer.jsx tears down blobs/tabs on close or session switch, supports lazyPending & media resumeTime
    assert "pickPreferredWorkspaceFile" in files_jsx
    assert "revokeTrackedBlobUrls" in files_jsx
    assert "lazyPending" in files_jsx
    assert "resumeTime" in files_jsx
    assert "mediaPositions" in files_jsx

    # BrowserPane notifies active tab selection cleanly
    assert "onActiveTargetChange" in browser_jsx

    # SettingsModal exposes Per-Session Memory vs Global toggle
    assert "sessionLayoutMode" in settings_jsx
    assert "Per-Session" in settings_jsx
