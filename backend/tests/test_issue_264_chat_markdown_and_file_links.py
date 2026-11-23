from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"


def test_markdown_body_is_xss_safe_and_supports_gfm_and_file_links():
    """#264: MarkdownBody renders GFM headings, lists, code blocks, tables, and file:// buttons without dangerouslySetInnerHTML."""
    md_jsx = (FRONTEND_SRC / "components" / "MarkdownBody.jsx").read_text(encoding="utf-8")
    chat_jsx = (FRONTEND_SRC / "components" / "LiveTranscriptStage.jsx").read_text(encoding="utf-8")
    hist_jsx = (FRONTEND_SRC / "components" / "HistoryVault.jsx").read_text(encoding="utf-8")
    explorer_jsx = (FRONTEND_SRC / "components" / "FileExplorer.jsx").read_text(encoding="utf-8")
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    css = (FRONTEND_SRC / "App.css").read_text(encoding="utf-8")

    # Zero dangerouslySetInnerHTML XSS vectors in MarkdownBody
    assert "dangerouslySetInnerHTML" not in md_jsx
    assert "parseFileUriTarget" in md_jsx
    assert "isSafeExternalUrl" in md_jsx
    assert "md-file-link" in md_jsx
    assert "CodeBlockCard" in md_jsx
    assert "md-table" in md_jsx

    # Wired into both LiveTranscriptStage (CHAT VIEW) and HistoryVault (HISTORY)
    assert "<MarkdownBody" in chat_jsx
    assert "onOpenFileLink={onOpenFileLink}" in chat_jsx
    assert "<MarkdownBody" in hist_jsx
    assert "onOpenFileLink={onOpenFileLink}" in hist_jsx

    # Clicking file:// links opens FileExplorer in split mode and reveals target line in Monaco
    assert "handleOpenFileFromChat" in app_jsx
    assert "requestedFile={requestedExplorerFile}" in app_jsx
    assert "revealLineInCenter" in explorer_jsx
    assert ".ld-markdown-body" in css
    assert ".md-file-link" in css
