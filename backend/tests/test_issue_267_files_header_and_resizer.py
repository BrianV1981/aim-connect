from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"


def test_files_explorer_has_stacked_folder_and_action_rows_with_side_flip_and_resizer():
    """#267: FileExplorer separates folder title row from action toolbar, exposes inline Left/Right flip, and supports draggable width resize."""
    explorer_jsx = (FRONTEND_SRC / "components" / "FileExplorer.jsx").read_text(encoding="utf-8")
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    css = (FRONTEND_SRC / "App.css").read_text(encoding="utf-8")

    # 3 stacked sections inside .files-tree-rail in exact top-to-bottom order
    idx_folder = explorer_jsx.index('className="files-tree-folder-row"')
    idx_actions = explorer_jsx.index('className="files-tree-actions-row"')
    idx_scroll = explorer_jsx.index('className="files-tree-scroll"')
    assert idx_folder < idx_actions < idx_scroll

    # Inline Left <-> Right flip button synced via App.jsx onToggleTreeSide
    assert "tree-side-flip-btn" in explorer_jsx
    assert "onToggleTreeSide" in explorer_jsx
    assert "onToggleTreeSide={" in app_jsx
    assert "RIGHT →" in explorer_jsx
    assert "← LEFT" in explorer_jsx

    # Lightweight pointer-draggable vertical separator bar
    assert "files-tree-resizer" in explorer_jsx
    assert "handleTreeResizerPointerDown" in explorer_jsx
    assert "--files-tree-width" in explorer_jsx
    assert "var(--files-tree-width" in css
    assert ".files-tree-resizer" in css
