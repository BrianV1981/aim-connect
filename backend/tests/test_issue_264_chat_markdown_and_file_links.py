from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"


def test_markdown_body_is_xss_safe_and_supports_gfm_and_file_links():
    """#264/#265: MarkdownBody + markdownParser render GFM headings, lists, code blocks, tables, and file:// buttons without dangerouslySetInnerHTML."""
    parser_js = (FRONTEND_SRC / "markdownParser.js").read_text(encoding="utf-8")
    md_jsx = (FRONTEND_SRC / "components" / "MarkdownBody.jsx").read_text(encoding="utf-8")
    chat_jsx = (FRONTEND_SRC / "components" / "LiveTranscriptStage.jsx").read_text(encoding="utf-8")
    hist_jsx = (FRONTEND_SRC / "components" / "HistoryVault.jsx").read_text(encoding="utf-8")
    explorer_jsx = (FRONTEND_SRC / "components" / "FileExplorer.jsx").read_text(encoding="utf-8")
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    css = (FRONTEND_SRC / "App.css").read_text(encoding="utf-8")

    # Zero dangerouslySetInnerHTML XSS vectors in MarkdownBody or markdownParser
    assert "dangerouslySetInnerHTML" not in md_jsx
    assert "dangerouslySetInnerHTML" not in parser_js
    assert "parseFileUriTarget" in parser_js
    assert "isSafeExternalUrl" in parser_js
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
