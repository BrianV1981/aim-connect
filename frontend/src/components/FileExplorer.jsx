import { useEffect, useRef, useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import Icon from './Icons';
import {
  copyTextToClipboard,
  getSelectionWithinNode,
  shouldPreserveSelectionOnMouseDown,
} from '../scrollbackSelection';

const MAX_TABS = 20;

export default function FileExplorer({
  isOpen,
  activeSession,
  splitMode,
  uiTheme = 'emerald',
  selectMode = false,
  onToggleSelectMode,
  onToggleSplitMode,
  onClose,
  editorRef,
}) {
  const [navMode, setNavMode] = useState('files'); // files | git
  const [currentPath, setCurrentPath] = useState('');
  const [fileItems, setFileItems] = useState([]);
  const [workspaceCtx, setWorkspaceCtx] = useState(null);
  const [gitStatus, setGitStatus] = useState({ branch: '', files: [], repo_path: '' });
  const [tabs, setTabs] = useState([]); // [{ id, type: 'file'|'diff', path, label, content, savedContent, mtime, language, original, conflict }]
  const [activeTabId, setActiveTabId] = useState('');
  const [saveBadge, setSaveBadge] = useState('');
  const [copyBadge, setCopyBadge] = useState('');
  const [copySelectionBadge, setCopySelectionBadge] = useState('');
  const [selectedFileText, setSelectedFileText] = useState('');
  const [localSelectMode, setLocalSelectMode] = useState(false);
  const [showMobileTree, setShowMobileTree] = useState(true);
  const selectSurfaceRef = useRef(null);
  const autoOpenedSessionRef = useRef('');

  const isSelectMode = onToggleSelectMode ? selectMode : localSelectMode;
  const toggleSelectMode = () => {
    if (onToggleSelectMode) {
      onToggleSelectMode();
    } else {
      setLocalSelectMode((prev) => !prev);
    }
  };

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  useEffect(() => {
    if (!isSelectMode) {
      setSelectedFileText('');
      return;
    }
    const syncSelection = () => {
      setSelectedFileText(getSelectionWithinNode(selectSurfaceRef.current));
    };
    document.addEventListener('selectionchange', syncSelection);
    return () => document.removeEventListener('selectionchange', syncSelection);
  }, [isSelectMode, activeTabId]);

  const copySelectedTabText = async () => {
    const current = getSelectionWithinNode(selectSurfaceRef.current) || selectedFileText;
    if (!current) return;
    const ok = await copyTextToClipboard(current);
    if (ok) {
      setCopySelectionBadge('COPIED SELECTION ✓');
      setTimeout(() => setCopySelectionBadge(''), 1800);
    }
  };

  const copyActiveTabContent = async () => {
    if (!activeTab) return;
    const textToCopy = activeTab.content || '';
    const ok = await copyTextToClipboard(textToCopy);
    if (ok) {
      setCopyBadge('COPIED ✓');
      setTimeout(() => setCopyBadge(''), 1800);
    }
  };

  const openFileTab = async (path, customLabel = '') => {
    const tabId = `file:${path}`;
    const existing = tabs.find((t) => t.id === tabId);
    if (existing) {
      setActiveTabId(tabId);
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        setShowMobileTree(false);
      }
      return;
    }
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.content !== undefined) {
        const newTab = {
          id: tabId,
          type: 'file',
          path: data.path || path,
          label: customLabel || path.split('/').pop(),
          content: data.content,
          savedContent: data.content,
          mtime: data.mtime || null,
          language: data.language || 'markdown',
          conflict: null,
        };
        setTabs((prev) => {
          const filtered = prev.filter((t) => t.id !== tabId);
          const next = [...filtered, newTab];
          return next.length > MAX_TABS ? next.slice(next.length - MAX_TABS) : next;
        });
        setActiveTabId(tabId);
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
          setShowMobileTree(false);
        }
      }
    } catch (e) {
      console.error('Failed to open file tab', e);
    }
  };

  const loadFiles = async (targetPath) => {
    try {
      const q = targetPath ? `?path=${encodeURIComponent(targetPath)}` : '';
      const res = await fetch(`/api/files${q}`);
      const data = await res.json();
      if (data.items) {
        setFileItems(data.items);
        setCurrentPath(data.path);
      }
    } catch (e) {
      console.error('Failed to load files', e);
    }
  };

  const loadGitStatus = async (sessionName = activeSession, targetPath = currentPath) => {
    try {
      const params = new URLSearchParams();
      if (sessionName) params.set('session', sessionName);
      if (targetPath) params.set('path', targetPath);
      const res = await fetch(`/api/git/status?${params.toString()}`);
      const data = await res.json();
      if (data && !data.error) {
        setGitStatus({
          branch: data.branch || '',
          files: Array.isArray(data.files) ? data.files : [],
          repo_path: data.repo_path || '',
        });
      }
    } catch (e) {
      console.error('Failed to load git status', e);
    }
  };

  const loadWorkspaceContext = async (sessionName, explicitPath = '') => {
    try {
      const params = new URLSearchParams();
      if (sessionName) params.set('session', sessionName);
      if (explicitPath) params.set('path', explicitPath);
      const res = await fetch(`/api/workspace/context?${params.toString()}`);
      const data = await res.json();
      if (data && !data.error) {
        setWorkspaceCtx(data);
        if (data.pane_path) {
          loadFiles(data.pane_path);
          loadGitStatus(sessionName, data.pane_path);
        }
        const sigKey = `${sessionName || 'default'}:${data.main_repo_root || data.pane_path || ''}`;
        if (tabs.length === 0 && autoOpenedSessionRef.current !== sigKey) {
          autoOpenedSessionRef.current = sigKey;
          const preferred = (data.brain_files || []).find(
            (bf) => bf.exists && (bf.label === 'HANDOFF.md' || bf.label === 'AGENTS.md' || bf.label === 'README.md')
          );
          if (preferred?.path) {
            openFileTab(preferred.path, preferred.label);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load workspace context', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadWorkspaceContext(activeSession);
    }
  }, [isOpen, activeSession]);

  const openDiffTab = async (path, relPath = '') => {
    const tabId = `diff:${path}`;
    try {
      const res = await fetch(`/api/git/diff?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data && data.modified !== undefined) {
        const newTab = {
          id: tabId,
          type: 'diff',
          path: data.path || path,
          label: `Δ ${relPath || data.rel_path || path.split('/').pop()}`,
          original: data.original || '',
          content: data.modified || '',
          savedContent: data.modified || '',
          language: data.language || 'plaintext',
          conflict: null,
        };
        setTabs((prev) => {
          const filtered = prev.filter((t) => t.id !== tabId);
          const next = [...filtered, newTab];
          return next.length > MAX_TABS ? next.slice(next.length - MAX_TABS) : next;
        });
        setActiveTabId(tabId);
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
          setShowMobileTree(false);
        }
      }
    } catch (e) {
      console.error('Failed to open git diff tab', e);
    }
  };

  const reloadActiveTabFromDisk = async () => {
    if (!activeTab) return;
    if (activeTab.type === 'diff') {
      await openDiffTab(activeTab.path);
      return;
    }
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(activeTab.path)}`);
      const data = await res.json();
      if (data.content !== undefined) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id
              ? {
                  ...t,
                  content: data.content,
                  savedContent: data.content,
                  mtime: data.mtime || null,
                  conflict: null,
                }
              : t
          )
        );
      }
    } catch (e) {
      console.error('Failed to reload file', e);
    }
  };

  const saveActiveTab = async (forceOverwrite = false) => {
    if (!activeTab || activeTab.type !== 'file') return;
    try {
      const payload = {
        path: activeTab.path,
        content: activeTab.content,
      };
      if (!forceOverwrite && activeTab.mtime) {
        payload.expected_mtime = activeTab.mtime;
      }
      const res = await fetch('/api/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 409) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id
              ? {
                  ...t,
                  conflict: data.error || 'File was modified on disk by another process.',
                }
              : t
          )
        );
        return;
      }
      if (res.ok) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id
              ? {
                  ...t,
                  savedContent: t.content,
                  mtime: data.mtime || t.mtime,
                  conflict: null,
                }
              : t
          )
        );
        setSaveBadge('SAVED ✓');
        setTimeout(() => setSaveBadge(''), 1800);
        loadGitStatus();
      }
    } catch (e) {
      console.error('Failed to save file', e);
    }
  };

  const closeTab = (e, tabId) => {
    e.stopPropagation();
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(next.length > 0 ? next[next.length - 1].id : '');
      }
      return next;
    });
  };

  const createItem = async (isDir) => {
    const name = window.prompt(`New ${isDir ? 'Folder' : 'File'} Name:`);
    if (!name || !currentPath) return;
    try {
      await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `${currentPath}/${name}`, is_dir: isDir }),
      });
      loadFiles(currentPath);
      loadGitStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteItem = async (path, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete ${path.split('/').pop()}?`)) return;
    try {
      await fetch(`/api/file?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
      loadFiles(currentPath);
      loadGitStatus();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const coreBrainFiles = (workspaceCtx?.brain_files || []).filter(
    (bf) => bf.exists && bf.category !== 'wiki_page'
  );
  const wikiPageFiles = (workspaceCtx?.brain_files || []).filter(
    (bf) => bf.exists && bf.category === 'wiki_page'
  );
  const worktrees = workspaceCtx?.worktrees || [];

  const gitByPath = new Map();
  gitStatus.files.forEach((gf) => {
    if (gf?.path) gitByPath.set(gf.path, gf.status);
  });

  return (
    <div className={`file-explorer-pane ${splitMode ? 'split-mode' : 'full-mode'}`}>
      {/* Emerald Matrix Single-Row Co-Pilot Top Bar (#260) */}
      <div className="copilot-top-bar" style={{ height: 'auto', minHeight: '38px', padding: '5px 12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
          <button
            type="button"
            className={`subbar-util-btn ${navMode === 'files' ? 'active' : ''}`}
            onClick={() => {
              setNavMode('files');
              setShowMobileTree(true);
            }}
          >
            <Icon name="files" size={13} />
            <span>FILES</span>
          </button>
          <button
            type="button"
            className={`subbar-util-btn ${navMode === 'git' ? 'active' : ''}`}
            onClick={() => {
              setNavMode('git');
              setShowMobileTree(true);
              loadGitStatus();
            }}
          >
            <Icon name="gitBranch" size={12} />
            <span>GIT DIFF ({gitStatus.files.length})</span>
          </button>

          {(coreBrainFiles.length > 0 || wikiPageFiles.length > 0 || worktrees.length > 0) && (
            <span style={{ opacity: 0.25 }}>|</span>
          )}

          {coreBrainFiles.map((bf) => (
            <button
              key={bf.path}
              type="button"
              className={`fav-chip ${activeTab?.path === bf.path ? 'active' : ''}`}
              onClick={() => openFileTab(bf.path, bf.label)}
              title={bf.path}
            >
              {bf.label}
            </button>
          ))}

          {wikiPageFiles.length > 0 && (
            <select
              className="ld-select"
              style={{ width: 'auto', height: '24px', padding: '0 8px', fontSize: '10.5px' }}
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  const chosen = wikiPageFiles.find((w) => w.path === e.target.value);
                  openFileTab(e.target.value, chosen?.label || '');
                }
              }}
            >
              <option value="">memory-wiki/ ({wikiPageFiles.length})</option>
              {wikiPageFiles.map((w) => (
                <option key={w.path} value={w.path}>
                  {w.label}
                </option>
              ))}
            </select>
          )}

          {worktrees.length > 0 && (
            <select
              className="ld-select"
              style={{ width: 'auto', height: '24px', padding: '0 8px', fontSize: '10.5px', borderColor: 'rgba(245, 158, 11, 0.5)', color: '#fbbf24' }}
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  setNavMode('files');
                  loadFiles(e.target.value);
                  loadGitStatus(activeSession, e.target.value);
                }
              }}
            >
              <option value="">worktrees ({worktrees.length})</option>
              {workspaceCtx?.main_repo_root && (
                <option value={workspaceCtx.main_repo_root}>main repo root</option>
              )}
              {worktrees.map((wt) => (
                <option key={wt.path} value={wt.path}>
                  {wt.name} ({wt.branch || 'detached'})
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          {activeTab?.type === 'file' && (
            <button
              id="save-btn"
              type="button"
              className="subbar-util-btn active"
              onClick={() => saveActiveTab(false)}
              title="Save active file to disk (HTTP 409 mtime guarded)"
            >
              <Icon name="check" size={12} />
              <span>{saveBadge || 'SAVE'}</span>
            </button>
          )}
          {activeTab && (
            <button
              type="button"
              className="subbar-util-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={copyActiveTabContent}
              title="Copy entire file contents to clipboard"
            >
              <Icon name="copyText" size={12} />
              <span>{copyBadge || 'COPY ALL'}</span>
            </button>
          )}
          <button
            type="button"
            className={`pane-full-upgrade-btn desktop-only ${!splitMode ? 'is-full' : ''}`}
            onClick={onToggleSplitMode}
            title={splitMode ? 'Upgrade Files to Full View' : 'Return Files to Split Screen'}
          >
            <Icon name={splitMode ? 'maximize' : 'split'} size={12} />
            <span>{splitMode ? 'FULL VIEW' : 'SPLIT VIEW'}</span>
          </button>
          <button
            type="button"
            className="ghost-btn"
            style={{ height: '26px', padding: '0 6px' }}
            onClick={onClose}
            title="Close Files Explorer"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      </div>

      {/* HTTP 409 mtime Conflict Guard Banner (#211) */}
      {activeTab?.conflict && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '7px 14px',
            background: 'rgba(245, 158, 11, 0.14)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.45)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: '#fbbf24',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="alert" size={13} />
            <span>HTTP 409 MTIME GUARD // {activeTab.conflict}</span>
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" className="fav-chip" onClick={reloadActiveTabFromDisk}>
              RELOAD DISK
            </button>
            <button
              type="button"
              className="danger-btn"
              style={{ height: '24px', padding: '0 9px', fontSize: '10px' }}
              onClick={() => saveActiveTab(true)}
            >
              FORCE OVERWRITE
            </button>
          </div>
        </div>
      )}

      {/* Persistent 2-Column Split Body: Left Tree Rail + Right Editor/Diff Stage (#260) */}
      <div className="files-split-body">
        <aside className={`files-tree-rail ${!showMobileTree && activeTab ? 'mobile-rail-hidden' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', padding: '2px 4px 6px', borderBottom: '1px solid var(--border-hairline)', marginBottom: '4px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.12em' }}>
              {navMode === 'git' ? `CHANGES (${gitStatus.branch || 'HEAD'})` : 'EXPLORER'}
            </span>
            <div style={{ display: 'flex', gap: '3px' }}>
              {navMode === 'files' ? (
                <>
                  <button
                    type="button"
                    className="fav-chip"
                    style={{ padding: '0 5px' }}
                    onClick={() => loadFiles(currentPath.split('/').slice(0, -1).join('/') || '/')}
                    title="Parent Directory"
                  >
                    <Icon name="arrowUp" size={11} />
                  </button>
                  <button
                    type="button"
                    className="fav-chip"
                    style={{ padding: '0 5px' }}
                    onClick={() => createItem(false)}
                    title="New File"
                  >
                    +F
                  </button>
                  <button
                    type="button"
                    className="fav-chip"
                    style={{ padding: '0 5px' }}
                    onClick={() => createItem(true)}
                    title="New Folder"
                  >
                    +D
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="fav-chip"
                  style={{ padding: '0 6px' }}
                  onClick={() => loadGitStatus()}
                  title="Refresh Git Status"
                >
                  <Icon name="refresh" size={11} />
                </button>
              )}
            </div>
          </div>

          {navMode === 'files' && currentPath && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9.5px',
                color: 'var(--text-muted)',
                padding: '0 4px 5px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={currentPath}
            >
              {currentPath.replace(/^\/home\/[^/]+/, '~')}
            </div>
          )}

          {navMode === 'git' ? (
            gitStatus.files.length === 0 ? (
              <div style={{ padding: '12px 6px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                Working tree clean.
              </div>
            ) : (
              gitStatus.files.map((gf, idx) => {
                const isSelected = activeTab?.path === gf.path;
                return (
                  <div
                    key={`${gf.path}:${idx}`}
                    className={`tree-file-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => openDiffTab(gf.path, gf.rel_path)}
                    title={`${gf.rel_path} (Click for Git Diff)`}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {gf.rel_path}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 700,
                          color: gf.status.includes('M') ? '#fbbf24' : 'var(--accent)',
                        }}
                      >
                        {gf.status}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          openFileTab(gf.path, gf.rel_path.split('/').pop());
                        }}
                        title="Edit file in Monaco"
                        style={{ opacity: 0.75, display: 'inline-flex' }}
                      >
                        <Icon name="edit" size={11} />
                      </span>
                    </span>
                  </div>
                );
              })
            )
          ) : (
            fileItems.map((item, idx) => {
              const st = gitByPath.get(item.path);
              const isSelected = activeTab?.path === item.path;
              return (
                <div
                  key={`${item.path || item.name}:${idx}`}
                  className={`tree-file-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => (item.is_dir ? loadFiles(item.path) : openFileTab(item.path))}
                  title={item.path}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                    <span style={{ color: item.is_dir ? 'var(--accent)' : 'var(--text-muted)', display: 'inline-flex' }}>
                      <Icon name={item.is_dir ? 'folder' : 'file'} size={12} />
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {st && (
                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: st.includes('M') ? '#fbbf24' : 'var(--accent)' }}>
                        {st}
                      </span>
                    )}
                    <span
                      role="button"
                      tabIndex={0}
                      className="tree-del-trigger"
                      onClick={(e) => deleteItem(item.path, e)}
                      title={`Delete ${item.name}`}
                    >
                      <Icon name="trash" size={11} />
                    </span>
                  </span>
                </div>
              );
            })
          )}
        </aside>

        <div className="files-editor-column">
          {tabs.length > 0 && (
            <div className="copilot-tabs-row" style={{ padding: '5px 10px' }}>
              <button
                type="button"
                className="fav-chip mobile-tree-toggle"
                onClick={() => setShowMobileTree((prev) => !prev)}
              >
                {showMobileTree ? 'HIDE TREE' : '← TREE'}
              </button>
              {tabs.map((t) => {
                const isDirty = t.type === 'file' && t.content !== t.savedContent;
                const isSelected = t.id === activeTabId;
                return (
                  <div
                    key={t.id}
                    className={`cp-tab ${isSelected ? 'active' : ''}`}
                    onClick={() => setActiveTabId(t.id)}
                    title={t.path}
                  >
                    <span>
                      {isDirty ? '● ' : ''}
                      {t.label}
                    </span>
                    <span
                      style={{ opacity: 0.65, paddingLeft: '3px' }}
                      onClick={(e) => closeTab(e, t.id)}
                      title="Close tab"
                    >
                      ×
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '4px 12px',
                borderBottom: '1px solid var(--border-hairline)',
                background: 'var(--bg-subtle)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10.5px',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: '120px' }}
                title={activeTab.path}
              >
                {activeTab.path}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`fav-chip ${isSelectMode ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={toggleSelectMode}
                  title="Toggle isolated native Scroll/Select text view vs Monaco Editor"
                >
                  {isSelectMode ? 'EDITOR MODE' : 'SELECT TEXT'}
                </button>
                {isSelectMode && (
                  <button
                    type="button"
                    className={`fav-chip ${selectedFileText ? 'active' : ''}`}
                    disabled={!selectedFileText}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={copySelectedTabText}
                  >
                    {copySelectionBadge ||
                      `Copy Selection${selectedFileText ? ` (${selectedFileText.length})` : ''}`}
                  </button>
                )}
                {activeTab.type === 'file' && (
                  <>
                    <button
                      type="button"
                      className="fav-chip"
                      onClick={() => openDiffTab(activeTab.path, activeTab.label)}
                      title="Compare file with Git HEAD in side-by-side DiffEditor"
                    >
                      DIFF VS HEAD
                    </button>
                    <button
                      type="button"
                      className="fav-chip"
                      onClick={reloadActiveTabFromDisk}
                      title="Reload latest file content from disk"
                    >
                      RELOAD
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="file-content-area" style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            {!activeTab ? (
              <div className="fleet-empty-state" style={{ margin: 'auto' }}>
                Select a file or changed Git path from the left explorer rail to inspect or edit in Monaco.
              </div>
            ) : isSelectMode ? (
              <div style={{ flex: 1, height: '100%', width: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <pre
                  ref={selectSurfaceRef}
                  className="file-select-surface"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const sel = typeof window !== 'undefined' ? window.getSelection?.() : null;
                    if (shouldPreserveSelectionOnMouseDown(e, sel)) {
                      e.preventDefault();
                    }
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                >
                  {activeTab.content}
                </pre>
              </div>
            ) : activeTab.type === 'diff' ? (
              <div style={{ flex: 1, height: '100%', width: '100%', position: 'relative' }}>
                <DiffEditor
                  height="100%"
                  theme={uiTheme === 'light' ? 'vs' : 'vs-dark'}
                  language={activeTab.language || 'plaintext'}
                  original={activeTab.original}
                  modified={activeTab.content}
                  options={{
                    renderSideBySide: !splitMode,
                    readOnly: true,
                    contextmenu: false,
                    automaticLayout: true,
                    fontSize: 13,
                    wordWrap: 'on',
                  }}
                />
              </div>
            ) : (
              <div style={{ flex: 1, height: '100%', width: '100%', position: 'relative' }}>
                <Editor
                  height="100%"
                  path={activeTab.path}
                  language={activeTab.language}
                  theme={uiTheme === 'light' ? 'vs' : 'vs-dark'}
                  value={activeTab.content}
                  onChange={(value) => {
                    const nextVal = value ?? '';
                    setTabs((prev) =>
                      prev.map((t) => (t.id === activeTab.id ? { ...t, content: nextVal } : t))
                    );
                  }}
                  onMount={(editor) => {
                    if (editorRef) editorRef.current = editor;
                  }}
                  options={{
                    minimap: { enabled: !splitMode },
                    contextmenu: false,
                    wordWrap: 'on',
                    automaticLayout: true,
                    fontSize: 13,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
