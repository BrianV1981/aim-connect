import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  copyTextToClipboard,
  getSelectionWithinNode,
  shouldPreserveSelectionOnMouseDown,
} from '../scrollbackSelection';
import Icon from './Icons';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildSearchHighlightedHtml(rawText, query, matchIndex) {
  const safe = escapeHtml(rawText);
  const trimmed = (query || '').trim();
  if (!trimmed) return { html: safe, count: 0, activeIdx: 0 };
  const esc = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reGlobal = new RegExp(esc, 'gi');
  const matches = safe.match(reGlobal);
  const total = matches ? matches.length : 0;
  if (total === 0) return { html: safe, count: 0, activeIdx: 0 };
  const activeIdx = ((matchIndex % total) + total) % total;
  let idxCounter = 0;
  const html = safe.replace(new RegExp(`(${esc})`, 'gi'), (m) => {
    const cur = idxCounter++;
    const cls = cur === activeIdx ? 'find-hit-mark active-hit' : 'find-hit-mark';
    return `<mark class="${cls}" id="scroll-hit-${cur}">${m}</mark>`;
  });
  return { html, count: total, activeIdx };
}

const ScrollbackOverlay = memo(function ScrollbackOverlay({
  scrollbackContent,
  rawScrollback,
  isSelectMode,
  focusSearch = false,
  onToggleSelectMode,
  onRefresh,
  onClose,
}) {
  const shellRef = useRef(null);
  const viewportRef = useRef(null);
  const searchInputRef = useRef(null);
  const didInitialScrollRef = useRef(false);
  const [selectedText, setSelectedText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);

  const searchResult = useMemo(
    () => buildSearchHighlightedHtml(rawScrollback || '', searchQuery, activeMatchIdx),
    [rawScrollback, searchQuery, activeMatchIdx]
  );

  const htmlPayload = useMemo(() => {
    if (searchQuery.trim()) {
      return { __html: searchResult.html };
    }
    return { __html: scrollbackContent || '' };
  }, [scrollbackContent, searchQuery, searchResult.html]);

  // Move focus onto the overlay shell (or search box when opened via Ctrl+F) on mount (#227, #257)
  useEffect(() => {
    if (focusSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 20);
    } else {
      shellRef.current?.focus?.({ preventScroll: true });
    }
  }, [focusSearch]);

  // Scroll to bottom once when scrollback finishes loading (never auto-close on scroll).
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    if (!scrollbackContent || scrollbackContent === 'Loading scrollback...') {
      didInitialScrollRef.current = false;
      return;
    }
    if (!didInitialScrollRef.current && !searchQuery.trim()) {
      el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
      didInitialScrollRef.current = true;
    }
  }, [scrollbackContent, searchQuery]);

  // Scroll active search hit into view across all 2,000+ lines (#257)
  useEffect(() => {
    if (!searchQuery.trim() || searchResult.count <= 0) return;
    const hitEl = viewportRef.current?.querySelector(`#scroll-hit-${searchResult.activeIdx}`);
    if (hitEl) {
      hitEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [searchQuery, searchResult.activeIdx, searchResult.count]);

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
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
          e.preventDefault();
          e.stopPropagation();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
          return;
        }
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div
        className="scrollback-toolbar"
        onMouseDown={(e) => {
          // Keep active text highlight intact unless clicking inside the search input
          if (e.target.tagName !== 'INPUT') {
            e.preventDefault();
          }
          e.stopPropagation();
        }}
      >
        <div className="scrollback-search-cluster" style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '210px' }}>
          <span style={{ color: 'var(--accent)', display: 'flex' }}>
            <Icon name="search" size={14} />
          </span>
          <input
            ref={searchInputRef}
            id="scroll-search-inp"
            type="text"
            className="ld-text-input"
            style={{ width: 'min(240px, 100%)', height: '28px', fontSize: '11.5px', padding: '0 9px' }}
            placeholder="Search all 2,000+ tmux lines..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveMatchIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchResult.count > 0) {
                e.preventDefault();
                setActiveMatchIdx((prev) => prev + (e.shiftKey ? -1 : 1));
              }
            }}
          />
          {searchQuery.trim() && (
            <>
              <span className="mono-kbd">
                {searchResult.count > 0 ? `${searchResult.activeIdx + 1} / ${searchResult.count}` : '0 HITS'}
              </span>
              <button
                type="button"
                className="subbar-util-btn"
                style={{ padding: '0 7px' }}
                disabled={searchResult.count === 0}
                onClick={() => setActiveMatchIdx((prev) => prev - 1)}
                title="Previous match across pages (Shift+Enter)"
              >
                ▲
              </button>
              <button
                type="button"
                className="subbar-util-btn"
                style={{ padding: '0 7px' }}
                disabled={searchResult.count === 0}
                onClick={() => setActiveMatchIdx((prev) => prev + 1)}
                title="Next match across pages (Enter)"
              >
                ▼
              </button>
            </>
          )}
        </div>

        <div className="scrollback-toolbar-actions">
          <button
            type="button"
            className={`subbar-util-btn ${selectedText ? 'active scrollback-copy-active' : ''}`}
            disabled={!selectedText}
            onClick={handleCopySelection}
            title={
              selectedText
                ? `Copy highlighted selection (${selectedText.length} chars)`
                : 'Highlight text below to copy selection'
            }
          >
            <Icon name="copyText" size={13} />
            <span>
              {copyFeedback === '✓ Copied Selection!'
                ? copyFeedback
                : `Copy Selection${selectedText ? ` (${selectedText.length})` : ''}`}
            </span>
          </button>
          <button
            type="button"
            className="subbar-util-btn"
            onClick={handleCopyAll}
            title="Copy entire 2,000-line scrollback buffer to clipboard"
          >
            <Icon name="copyText" size={13} />
            <span>{copyFeedback === '✓ Copied All!' ? copyFeedback : 'Copy All'}</span>
          </button>
          <button
            type="button"
            className={`subbar-util-btn ${isSelectMode ? 'active' : ''}`}
            onClick={onToggleSelectMode}
            title="Switch between ANSI color view and stripped plain text"
          >
            <span>{isSelectMode ? 'ANSI Color' : 'Plain Text'}</span>
          </button>
          {onRefresh && (
            <button
              type="button"
              className="subbar-util-btn"
              onClick={onRefresh}
              title="Re-capture latest 2,000-line tmux buffer"
            >
              <Icon name="refresh" size={13} />
            </button>
          )}
          <button
            type="button"
            className="subbar-util-btn active scrollback-close-btn"
            onClick={onClose}
            title="Close Scroll/Copy view (Esc)"
          >
            EXIT
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
        {isSelectMode && !searchQuery.trim() ? (
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
