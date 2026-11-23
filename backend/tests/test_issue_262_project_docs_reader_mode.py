import json
import subprocess
from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
DOCS_HISTORY_JS = FRONTEND_SRC / "docsReaderHistory.js"


def test_docs_reader_history_and_single_tab_upsert_in_node():
    """#262: Single-tab Docs reader history supports Back/Forward navigation, deduplication, and dirty-tab safety."""
    assert DOCS_HISTORY_JS.is_file(), "Missing frontend/src/docsReaderHistory.js"

    script = f"""
import {{
  DOCS_READER_TAB_ID,
  formatBrainChipLabel,
  pushDocsHistory,
  stepDocsHistory,
  upsertDocsReaderTab,
}} from {json.dumps(DOCS_HISTORY_JS.as_uri())};

let hist = {{ entries: [], index: -1 }};
hist = pushDocsHistory(hist, {{ path: '/repo/README.md', label: 'README.md' }});
hist = pushDocsHistory(hist, {{ path: '/repo/HANDOFF.md', label: 'HANDOFF.md' }});
hist = pushDocsHistory(hist, {{ path: '/repo/memory-wiki/index.md', label: 'wiki/index.md' }});
// Duplicate click on current doc does not push duplicate entry
hist = pushDocsHistory(hist, {{ path: '/repo/memory-wiki/index.md', label: 'wiki/index.md' }});

const back1 = stepDocsHistory(hist, -1);
const back2 = stepDocsHistory(back1.state, -1);
const fwd1 = stepDocsHistory(back2.state, 1);

// Navigating from a stepped-back state truncates forward history like a browser
const branched = pushDocsHistory(back1.state, {{ path: '/repo/AGENTS.md', label: 'AGENTS.md' }});

// Single-tab upsert replaces docs:reader in place without growing tab count
let tabs = [
  {{ id: 'file:/repo/src/main.py', type: 'file', path: '/repo/src/main.py', label: 'main.py', content: 'x', savedContent: 'x' }},
];
tabs = upsertDocsReaderTab(tabs, {{
  type: 'file',
  path: '/repo/README.md',
  label: 'README',
  content: '# Readme',
  savedContent: '# Readme',
}});
tabs = upsertDocsReaderTab(tabs, {{
  type: 'file',
  path: '/repo/HANDOFF.md',
  label: 'HANDOFF',
  content: '# Handoff',
  savedContent: '# Handoff',
}});
const cleanTabCount = tabs.length;

// Dirty unsaved edits in docs:reader are auto-pinned instead of overwritten
tabs = tabs.map((t) => (t.id === DOCS_READER_TAB_ID ? {{ ...t, content: '# Edited Handoff' }} : t));
tabs = upsertDocsReaderTab(tabs, {{
  type: 'file',
  path: '/repo/AGENTS.md',
  label: 'AGENTS',
  content: '# Agents',
  savedContent: '# Agents',
}});

console.log(JSON.stringify({{
  labels: {{
    readme: formatBrainChipLabel('README.md'),
    wikiIdx: formatBrainChipLabel('wiki/index.md'),
  }},
  histLen: hist.entries.length,
  back1Target: back1.target.path,
  back2Target: back2.target.path,
  fwd1Target: fwd1.target.path,
  branchedPaths: branched.entries.map((e) => e.path),
  cleanTabCount,
  afterDirtyIds: tabs.map((t) => t.id),
}}));
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        capture_output=True,
        text=True,
        timeout=3.0,
    )
    assert proc.returncode == 0, proc.stderr
    out = json.loads(proc.stdout.strip())
    assert out["labels"]["readme"] == "README"
    assert out["labels"]["wikiIdx"] == "Wiki Index"
    assert out["histLen"] == 3
    assert out["back1Target"] == "/repo/HANDOFF.md"
    assert out["back2Target"] == "/repo/README.md"
    assert out["fwd1Target"] == "/repo/HANDOFF.md"
    assert out["branchedPaths"] == ["/repo/README.md", "/repo/HANDOFF.md", "/repo/AGENTS.md"]
    assert out["cleanTabCount"] == 2
    assert out["afterDirtyIds"] == [
        "file:/repo/src/main.py",
        "file:/repo/HANDOFF.md",
        "docs:reader",
    ]


def test_issue_262_opt_in_docs_reader_and_capsule_ui_contracts():
    """#262: Visually distinct DOCS capsule + toggleable single-tab reader option in FileExplorer & SettingsModal."""
    explorer_jsx = (FRONTEND_SRC / "components" / "FileExplorer.jsx").read_text(encoding="utf-8")
    settings_jsx = (FRONTEND_SRC / "components" / "SettingsModal.jsx").read_text(encoding="utf-8")
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    icons_jsx = (FRONTEND_SRC / "components" / "Icons.jsx").read_text(encoding="utf-8")
    css = (FRONTEND_SRC / "App.css").read_text(encoding="utf-8")

    # 1. Distinct Project Docs hub bar + bookOpen icon
    assert "project-docs-hub-bar" in explorer_jsx
    assert ".project-docs-hub-bar" in css
    assert "case 'bookOpen':" in icons_jsx

    # 2. Toggleable opt-in setting wired across App.jsx, SettingsModal.jsx, and FileExplorer.jsx
    assert "docsSingleTabMode" in app_jsx
    assert "aim-docs-single-tab" in app_jsx
    assert "docsSingleTabMode" in settings_jsx
    assert "docsSingleTabMode" in explorer_jsx
    assert "onToggleDocsSingleTabMode" in explorer_jsx

    # 3. Single-tab reader navigation + Back/Forward history + Pin Tab escape hatch
    assert "DOCS_READER_TAB_ID" in explorer_jsx
    assert "stepDocsHistory" in explorer_jsx
    assert "PIN TAB" in explorer_jsx
