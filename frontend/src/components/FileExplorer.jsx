import { useEffect, useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';

const MAX_TABS = 20;

export default function FileExplorer({
  isOpen,
  activeSession,
  splitMode,
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

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

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
      }
    } catch (e) {
      console.error('Failed to load workspace context', e);
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

  useEffect(() => {
    if (isOpen) {
      loadWorkspaceContext(activeSession);
    }
  }, [isOpen, activeSession]);

  const openFileTab = async (path, customLabel = '') => {
    const tabId = `file:${path}`;
    const existing = tabs.find((t) => t.id === tabId);
    if (existing) {
      setActiveTabId(tabId);
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
          const next = [...prev, newTab];
          return next.length > MAX_TABS ? next.slice(next.length - MAX_TABS) : next;
        });
        setActiveTabId(tabId);
      }
    } catch (e) {
      console.error('Failed to open file tab', e);
    }
  };

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
        setSaveBadge('✓ Saved');
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

  return (
    <div className={`file-explorer-pane ${splitMode ? 'split-mode' : 'full-mode'}`}>
      {/* Top Brain & Worktree Bar */}
      <div className="brain-quick-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
          <span className="brain-bar-label">🧠 BRAIN:</span>
          {coreBrainFiles.map((bf) => (
            <button
              key={bf.path}
              type="button"
              className={`brain-quick-pill ${activeTab?.path === bf.path ? 'active' : ''}`}
              onClick={() => openFileTab(bf.path, bf.label)}
              title={bf.path}
            >
              {bf.label}
            </button>
          ))}
          {wikiPageFiles.length > 0 && (
            <select
              className="session-select"
              style={{ fontSize: '11px', padding: '2px 6px' }}
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  const chosen = wikiPageFiles.find((w) => w.path === e.target.value);
                  openFileTab(e.target.value, chosen?.label || '');
                }
              }}
            >
              <option value="">📚 Wiki Pages ({wikiPageFiles.length})...</option>
              {wikiPageFiles.map((w) => (
                <option key={w.path} value={w.path}>
                  {w.label}
                </option>
              ))}
            </select>
          )}
          {worktrees.length > 0 && (
            <select
              className="session-select"
              style={{ fontSize: '11px', padding: '2px 6px', borderColor: '#f59e0b', color: '#fbbf24' }}
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  setActiveTabId('');
                  setNavMode('files');
                  loadFiles(e.target.value);
                  loadGitStatus(activeSession, e.target.value);
                }
              }}
            >
              <option value="">🛠️ Worktrees ({worktrees.length})...</option>
              {workspaceCtx?.main_repo_root && (
                <option value={workspaceCtx.main_repo_root}>🏠 Main Repo Root</option>
              )}
              {worktrees.map((wt) => (
                <option key={wt.path} value={wt.path}>
                  {wt.name} ({wt.branch || 'detached'})
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            className={`macro-btn ${splitMode ? 'action' : ''}`}
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={onToggleSplitMode}
            title="Toggle side-by-side Split Pane vs Full Workspace"
          >
            {splitMode ? '◫ Split' : '⬜ Full'}
          </button>
          <button
            type="button"
            className="macro-btn"
            style={{ padding: '3px 8px', fontSize: '11px', color: '#f87171' }}
            onClick={onClose}
            title="Close Workspace Inspector"
          >
            ✖
          </button>
        </div>
      </div>

      {/* Mode Switcher & Open Tabs Bar */}
      <div className="workspace-tabs-bar">
        <button
          type="button"
          className={`workspace-tab-chip ${!activeTab && navMode === 'files' ? 'active' : ''}`}
          onClick={() => {
            setActiveTabId('');
            setNavMode('files');
          }}
        >
          📁 Explorer
        </button>
        <button
          type="button"
          className={`workspace-tab-chip ${!activeTab && navMode === 'git' ? 'active' : ''}`}
          onClick={() => {
            setActiveTabId('');
            setNavMode('git');
            loadGitStatus();
          }}
        >
          🔀 Git Diff ({gitStatus.files.length})
        </button>

        {tabs.map((t) => {
          const isDirty = t.type === 'file' && t.content !== t.savedContent;
          const isSelected = t.id === activeTabId;
          return (
            <div
              key={t.id}
              className={`workspace-tab-chip ${isSelected ? 'active' : ''} ${t.conflict ? 'conflict' : ''}`}
              onClick={() => setActiveTabId(t.id)}
              title={t.path}
            >
              <span>
                {isDirty ? '● ' : ''}
                {t.label}
              </span>
              <span
                className="workspace-tab-close"
                onClick={(e) => closeTab(e, t.id)}
                title="Close tab"
              >
                ×
              </span>
            </div>
          );
        })}
      </div>

      {/* Toolbar for Active Tab or Directory Explorer */}
      <div className="file-toolbar">
        {activeTab ? (
          <>
            <button
              className="macro-btn"
              onClick={() => setActiveTabId('')}
              style={{ padding: '4px 8px', fontSize: '11px' }}
            >
              ← Tree
            </button>
            <span className="file-path" style={{ flex: 1 }} title={activeTab.path}>
              {activeTab.path}
            </span>
            {activeTab.type === 'file' && (
              <>
                <button
                  className="macro-btn"
                  onClick={() => openDiffTab(activeTab.path, activeTab.label)}
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                  title="Compare file with Git HEAD in side-by-side DiffEditor"
                >
                  🔀 Diff vs HEAD
                </button>
                <button
                  className="macro-btn"
                  onClick={reloadActiveTabFromDisk}
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                  title="Reload latest file content from disk"
                >
                  🔄 Reload
                </button>
                <button
                  id="save-btn"
                  className="macro-btn action"
                  onClick={() => saveActiveTab(false)}
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                >
                  {saveBadge || '💾 Save'}
                </button>
              </>
            )}
          </>
        ) : navMode === 'git' ? (
          <>
            <span className="file-path" style={{ flex: 1 }}>
              🌿 {gitStatus.branch || 'HEAD'} — {gitStatus.repo_path || currentPath}
            </span>
            <button className="macro-btn" onClick={() => loadGitStatus()}>
              🔄 Refresh Status
            </button>
          </>
        ) : (
          <>
            <button
              className="macro-btn"
              onClick={() => loadFiles(currentPath.split('/').slice(0, -1).join('/') || '/')}
            >
              ← Up
            </button>
            <span className="file-path" style={{ flex: 1 }} title={currentPath}>
              {currentPath}
            </span>
            <button className="macro-btn" onClick={() => createItem(false)}>
              + File
            </button>
            <button className="macro-btn" onClick={() => createItem(true)}>
              + Dir
            </button>
          </>
        )}
      </div>

      {/* mtime 409 Conflict Banner */}
      {activeTab?.conflict && (
        <div className="mtime-conflict-banner">
          <span>⚠️ {activeTab.conflict}</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="macro-btn" onClick={reloadActiveTabFromDisk}>
              🔄 Reload Disk Version
            </button>
            <button
              className="macro-btn action"
              style={{ borderColor: '#ef4444', color: '#fecaca' }}
              onClick={() => saveActiveTab(true)}
            >
              ⚡ Force Overwrite
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="file-content-area">
        {activeTab ? (
          activeTab.type === 'diff' ? (
            <div style={{ flex: 1, height: '100%', minHeight: '420px', width: '100%', position: 'relative' }}>
              <DiffEditor
                height="100%"
                theme="vs-dark"
                language={activeTab.language || 'plaintext'}
                original={activeTab.original}
                modified={activeTab.content}
                options={{
                  renderSideBySide: !splitMode,
                  readOnly: true,
                  automaticLayout: true,
                  fontSize: 13,
                  wordWrap: 'on',
                }}
              />
            </div>
          ) : (
            <div style={{ flex: 1, height: '100%', minHeight: '420px', width: '100%', position: 'relative' }}>
              <Editor
                height="100%"
                path={activeTab.path}
                language={activeTab.language}
                theme="vs-dark"
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
                  wordWrap: 'on',
                  automaticLayout: true,
                  fontSize: 13,
                }}
              />
            </div>
          )
        ) : navMode === 'git' ? (
          <ul className="file-list">
            {gitStatus.files.length === 0 ? (
              <li className="fleet-empty-state">Working tree clean — no uncommitted changes.</li>
            ) : (
              gitStatus.files.map((gf, idx) => (
                <li
                  key={`${gf.path}:${idx}`}
                  className="file-item"
                  onClick={() => openDiffTab(gf.path, gf.rel_path)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <span className={`git-status-pill status-${gf.status.replace('?', 'U')}`}>
                      {gf.status}
                    </span>
                    <span
                      className="file-name"
                      style={{ fontFamily: 'Fira Code, monospace', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {gf.rel_path}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="macro-btn"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openFileTab(gf.path, gf.rel_path.split('/').pop());
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      className="macro-btn action"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDiffTab(gf.path, gf.rel_path);
                      }}
                    >
                      🔀 Diff
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        ) : (
          <ul className="file-list">
            {fileItems.map((item, idx) => (
              <li
                key={idx}
                className="file-item"
                onClick={() => (item.is_dir ? loadFiles(item.path) : openFileTab(item.path))}
              >
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <span className="file-icon">{item.is_dir ? '📁' : '📄'}</span>
                  <span
                    className="file-name"
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {item.name}
                  </span>
                </div>
                <button
                  className="macro-btn"
                  style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent' }}
                  onClick={(e) => deleteItem(item.path, e)}
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
