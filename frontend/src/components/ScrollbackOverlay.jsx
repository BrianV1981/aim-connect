import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  copyTextToClipboard,
  getSelectionWithinNode,
  shouldPreserveSelectionOnMouseDown,
} from '../scrollbackSelection';

const ScrollbackOverlay = memo(function ScrollbackOverlay({
  scrollbackContent,
  rawScrollback,
  isSelectMode,
  onToggleSelectMode,
  onRefresh,
  onClose,
}) {
  const shellRef = useRef(null);
  const viewportRef = useRef(null);
  const didInitialScrollRef = useRef(false);
  const [selectedText, setSelectedText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');

  const htmlPayload = useMemo(
    () => ({ __html: scrollbackContent || '' }),
    [scrollbackContent]
  );

  // Move focus onto the overlay shell on mount so Ctrl/Cmd+C copies DOM selection
  // instead of sending SIGINT (\x03) to xterm's hidden textarea (#227).
  useEffect(() => {
    shellRef.current?.focus?.({ preventScroll: true });
  }, []);

  // Scroll to bottom once when scrollback finishes loading (never auto-close on scroll).
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    if (!scrollbackContent || scrollbackContent === 'Loading scrollback...') {
      didInitialScrollRef.current = false;
      return;
    }
    if (!didInitialScrollRef.current) {
      el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
      didInitialScrollRef.current = true;
    }
  }, [scrollbackContent]);

  // Track highlighted text inside the scrollback viewport for 1-click Copy Selection.
  useEffect(() => {
    const syncSelection = () => {
      const next = getSelectionWithinNode(viewportRef.current);
      setSelectedText(next);
    };
    document.addEventListener('selectionchange', syncSelection);
    return () => document.removeEventListener('selectionchange', syncSelection);
  }, []);

  const handleViewportMouseDown = (e) => {
    e.stopPropagation();
    const sel = typeof window !== 'undefined' ? window.getSelection?.() : null;
    if (shouldPreserveSelectionOnMouseDown(e, sel)) {
      e.preventDefault();
    }
  };

  const flashBadge = (msg) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(''), 1800);
  };

  const handleCopySelection = async () => {
    const current = getSelectionWithinNode(viewportRef.current) || selectedText;
    if (!current) return;
    const ok = await copyTextToClipboard(current);
    if (ok) flashBadge('✓ Copied Selection!');
  };

  const handleCopyAll = async () => {
    if (!rawScrollback) return;
    const ok = await copyTextToClipboard(rawScrollback);
    if (ok) flashBadge('✓ Copied All!');
  };

  return (
    <div
      ref={shellRef}
      className="native-scrollback-shell"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div
        className="scrollback-toolbar"
        onMouseDown={(e) => {
          // Keep active text highlight intact when clicking any toolbar button
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="scrollback-toolbar-title">
          <span>📜 Scroll / Copy</span>
          <span className="scrollback-toolbar-hint">
            Drag to highlight · Right-click or ⌘/Ctrl+C to copy
          </span>
        </div>
        <div className="scrollback-toolbar-actions">
          <button
            type="button"
            className={`macro-btn ${selectedText ? 'action scrollback-copy-active' : ''}`}
            disabled={!selectedText}
            onClick={handleCopySelection}
            title={
              selectedText
                ? `Copy highlighted selection (${selectedText.length} chars)`
                : 'Highlight text below to copy selection'
            }
          >
            {copyFeedback === '✓ Copied Selection!'
              ? copyFeedback
              : `📋 Copy Selection${selectedText ? ` (${selectedText.length})` : ''}`}
          </button>
          <button
            type="button"
            className="macro-btn"
            onClick={handleCopyAll}
            title="Copy entire scrollback buffer to clipboard"
          >
            {copyFeedback === '✓ Copied All!' ? copyFeedback : '📋 Copy All'}
          </button>
          <button
            type="button"
            className="macro-btn"
            onClick={onToggleSelectMode}
            title="Switch between ANSI color view and stripped plain text"
          >
            {isSelectMode ? '🎨 Color View' : '📝 Plain Text'}
          </button>
          {onRefresh && (
            <button
              type="button"
              className="macro-btn"
              onClick={onRefresh}
              title="Refresh latest terminal scrollback"
            >
              🔄 Refresh
            </button>
          )}
          <button
            type="button"
            className="macro-btn scrollback-close-btn"
            onClick={onClose}
            title="Close Scroll/Copy view (Esc)"
          >
            ✖ Close
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="native-scrollback-overlay"
        onMouseDown={handleViewportMouseDown}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {isSelectMode ? (
          <pre className="scrollback-selectable-content">{rawScrollback}</pre>
        ) : (
          <pre
            className="scrollback-selectable-content"
            dangerouslySetInnerHTML={htmlPayload}
          />
        )}
      </div>
    </div>
  );
});

export default ScrollbackOverlay;
