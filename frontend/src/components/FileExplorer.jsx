import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import Icon from './Icons';
import MarkdownBody from './MarkdownBody';
import {
  copyTextToClipboard,
  getSelectionWithinNode,
  shouldPreserveSelectionOnMouseDown,
} from '../scrollbackSelection';

const MAX_TABS = 20;

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.bmp',
  '.avif',
]);

const NOISY_DIR_NAMES = new Set([
  '.git',
  '.pytest_cache',
  '__pycache__',
  'node_modules',
  '.venv',
  '.mypy_cache',
  '.ruff_cache',
  '.DS_Store',
]);

function getExtLower(filePath) {
  const clean = String(filePath || '');
  const slashIdx = clean.lastIndexOf('/');
  const base = slashIdx >= 0 ? clean.slice(slashIdx + 1) : clean;
  const dotIdx = base.lastIndexOf('.');
  return dotIdx > 0 ? base.slice(dotIdx).toLowerCase() : '';
}

function isImagePath(filePath) {
  return IMAGE_EXTENSIONS.has(getExtLower(filePath));
}

function isMarkdownPath(filePath) {
  const ext = getExtLower(filePath);
  return ext === '.md' || ext === '.markdown';
}

function shouldHideEntry(item, hideDotfiles) {
  if (!hideDotfiles || !item?.name) return false;
  if (NOISY_DIR_NAMES.has(item.name)) return true;
  if (item.name.startsWith('.')) return true;
  return false;
}

export default function FileExplorer({
  isOpen,
  activeSession,
  splitMode,
  uiTheme = 'emerald',
  treeSide = 'left',
  hideDotfiles = true,
  onToggleHideDotfiles,
  editorFontSize = 13,
  editorWordWrap = true,
  requestedFile = null,
  selectMode = false,
  onToggleSelectMode,
  onToggleSplitMode,
  onClose,
  editorRef,
}) {
  const [navMode, setNavMode] = useState('files'); // files | git
  const [rootPath, setRootPath] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [dirChildrenMap, setDirChildrenMap] = useState({});
  const [expandedDirs, setExpandedDirs] = useState({});
  const [workspaceCtx, setWorkspaceCtx] = useState(null);
  const [gitStatus, setGitStatus] = useState({ branch: '', files: [], repo_path: '' });
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState('');
  const [mdViewMode, setMdViewMode] = useState('preview'); // preview | code
  const [imageZoomMode, setImageZoomMode] = useState('fit'); // fit | actual
  const [saveBadge, setSaveBadge] = useState('');
  const [copyBadge, setCopyBadge] = useState('');
  const [copySelectionBadge, setCopySelectionBadge] = useState('');
  const [selectedFileText, setSelectedFileText] = useState('');
  const [localSelectMode, setLocalSelectMode] = useState(false);
  const [treeCollapsed, setTreeCollapsed] = useState(
    () => localStorage.getItem('aim-files-tree-collapsed') === 'true'
  );
  const [showMobileTree, setShowMobileTree] = useState(true);
  const selectSurfaceRef = useRef(null);
  const autoOpenedSessionRef = useRef('');
  const blobUrlsRef = useRef(new Set());

  const isSelectMode = onToggleSelectMode ? selectMode : localSelectMode;
  const toggleSelectMode = () => {
    if (onToggleSelectMode) {
      onToggleSelectMode();
    } else {
      setLocalSelectMode((prev) => !prev);
    }
  };

  const toggleTreeRail = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setShowMobileTree((prev) => !prev);
      return;
    }
    setTreeCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('aim-files-tree-collapsed', String(next));
      return next;
    });
  };

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  useEffect(() => {
    const urls = blobUrlsRef.current;
    return () => {
      urls.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
      urls.clear();
    };
  }, []);

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

  const fetchDirectoryEntries = useCallback(async (dirPath) => {
    if (!dirPath) return null;
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(dirPath)}`);
      const data = await res.json();
      if (data && Array.isArray(data.items) && data.path) {
        setDirChildrenMap((prev) => ({
          ...prev,
          [data.path]: data.items,
        }));
        return data;
      }
    } catch (e) {
      console.error('Failed to load directory entries', e);
    }
    return null;
  }, []);

  const loadFiles = useCallback(
    async (targetPath, updateRoot = true) => {
      const data = await fetchDirectoryEntries(targetPath || '');
      if (data?.path) {
        setCurrentPath(data.path);
        if (updateRoot) {
          setRootPath(data.path);
        }
        setExpandedDirs((prev) => ({ ...prev, [data.path]: true }));
      }
    },
    [fetchDirectoryEntries]
  );

  const expandAncestorsToFile = useCallback(
    async (filePath, activeRoot) => {
      const baseRoot = activeRoot || rootPath;
      if (!filePath || !baseRoot || !filePath.startsWith(`${baseRoot}/`)) return;
      const rel = filePath.slice(baseRoot.length + 1);
      const parts = rel.split('/');
      if (parts.length <= 1) return;
      let cursor = baseRoot;
      const toExpand = { [baseRoot]: true };
      for (let i = 0; i < parts.length - 1; i++) {
        cursor = `${cursor}/${parts[i]}`;
        toExpand[cursor] = true;
        if (!dirChildrenMap[cursor]) {
          await fetchDirectoryEntries(cursor);
        }
      }
      setExpandedDirs((prev) => ({ ...prev, ...toExpand }));
      setCurrentPath(cursor);
    },
    [dirChildrenMap, fetchDirectoryEntries, rootPath]
  );

  const handleToggleDirectory = async (dirPath) => {
    setCurrentPath(dirPath);
    const willExpand = !expandedDirs[dirPath];
    setExpandedDirs((prev) => ({ ...prev, [dirPath]: willExpand }));
    if (willExpand && !dirChildrenMap[dirPath]) {
      await fetchDirectoryEntries(dirPath);
    }
  };

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
    const textToCopy = activeTab.type === 'image' ? activeTab.path : activeTab.content || '';
    const ok = await copyTextToClipboard(textToCopy);
    if (ok) {
      setCopyBadge(activeTab.type === 'image' ? 'COPIED PATH ✓' : 'COPIED ✓');
      setTimeout(() => setCopyBadge(''), 1800);
    }
  };

  const openFileTab = async (path, customLabel = '', opts = {}) => {
    if (!path) return;
    const tabId = `file:${path}`;
    const existing = tabs.find((t) => t.id === tabId);
    if (opts.forceCode) {
      setMdViewMode('code');
    }
    if (existing) {
      setActiveTabId(tabId);
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        setShowMobileTree(false);
      }
      expandAncestorsToFile(existing.path, rootPath);
      return;
    }

    if (isImagePath(path)) {
      try {
        const res = await fetch(`/api/file/raw?path=${encodeURIComponent(path)}`);
        if (!res.ok) return;
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        blobUrlsRef.current.add(blobUrl);
        const newTab = {
          id: tabId,
          type: 'image',
          path,
          label: customLabel || path.split('/').pop(),
          blobUrl,
          sizeBytes: blob.size,
          mimeType: blob.type,
          dims: '',
          content: '',
          savedContent: '',
          conflict: null,
        };
        setTabs((prev) => {
          const filtered = prev.filter((t) => t.id !== tabId);
          const next = [...filtered, newTab];
          return next.length > MAX_TABS ? next.slice(next.length - MAX_TABS) : next;
        });
        setActiveTabId(tabId);
        setImageZoomMode('fit');
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
          setShowMobileTree(false);
        }
        expandAncestorsToFile(path, rootPath);
      } catch (e) {
        console.error('Failed to open image preview', e);
      }
      return;
    }

    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.content !== undefined) {
        const resolvedPath = data.path || path;
        const newTab = {
          id: `file:${resolvedPath}`,
          type: 'file',
          path: resolvedPath,
          label: customLabel || resolvedPath.split('/').pop(),
          content: data.content,
          savedContent: data.content,
          mtime: data.mtime || null,
          language: data.language || 'markdown',
          conflict: null,
        };
        setTabs((prev) => {
          const filtered = prev.filter((t) => t.id !== newTab.id);
          const next = [...filtered, newTab];
          return next.length > MAX_TABS ? next.slice(next.length - MAX_TABS) : next;
        });
        setActiveTabId(newTab.id);
        if (isMarkdownPath(resolvedPath) && !opts.forceCode) {
          setMdViewMode('preview');
        }
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
          setShowMobileTree(false);
        }
        expandAncestorsToFile(resolvedPath, rootPath);
      }
    } catch (e) {
      console.error('Failed to open file tab', e);
    }
  };

  const loadGitStatus = async (sessionName = activeSession, targetPath = rootPath || currentPath) => {
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
        const startRoot = data.repo_root || data.pane_path;
        if (startRoot) {
          await loadFiles(startRoot, true);
          loadGitStatus(sessionName, startRoot);
        }
        const sigKey = `${sessionName || 'default'}:${data.main_repo_root || startRoot || ''}`;
        if (tabs.length === 0 && autoOpenedSessionRef.current !== sigKey) {
          autoOpenedSessionRef.current = sigKey;
          const preferred = (data.brain_files || []).find(
            (bf) =>
              bf.exists &&
              (bf.label === 'README.md' || bf.label === 'HANDOFF.md' || bf.label === 'AGENTS.md')
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

  // Open file:// links clicked inside Chat View / History directly in FileExplorer and reveal target line (#264, #266)
  useEffect(() => {
    if (!isOpen || !requestedFile?.path) return;
    let cancelled = false;
    (async () => {
      const hasLineTarget = Boolean(requestedFile.line && requestedFile.line > 0);
      const parentDir = requestedFile.path.includes('/')
        ? requestedFile.path.slice(0, requestedFile.path.lastIndexOf('/'))
        : '';
      if (parentDir && (!rootPath || !requestedFile.path.startsWith(`${rootPath}/`))) {
        await loadFiles(parentDir, true);
      }
      await openFileTab(requestedFile.path, '', { forceCode: hasLineTarget });
      if (!cancelled && hasLineTarget) {
        setTimeout(() => {
          const ed = editorRef?.current;
          if (ed) {
            try {
              ed.revealLineInCenter?.(requestedFile.line);
              ed.setPosition?.({ lineNumber: requestedFile.line, column: 1 });
            } catch {}
          }
        }, 140);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, requestedFile?.seq]);

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
    if (activeTab.type === 'image') {
      try {
        const res = await fetch(`/api/file/raw?path=${encodeURIComponent(activeTab.path)}`);
        if (!res.ok) return;
        const blob = await res.blob();
        const nextBlobUrl = URL.createObjectURL(blob);
        blobUrlsRef.current.add(nextBlobUrl);
        if (activeTab.blobUrl) {
          try {
            URL.revokeObjectURL(activeTab.blobUrl);
          } catch {}
          blobUrlsRef.current.delete(activeTab.blobUrl);
        }
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id ? { ...t, blobUrl: nextBlobUrl, sizeBytes: blob.size } : t
          )
        );
      } catch {}
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
      const closing = prev.find((t) => t.id === tabId);
      if (closing?.blobUrl) {
        try {
          URL.revokeObjectURL(closing.blobUrl);
        } catch {}
        blobUrlsRef.current.delete(closing.blobUrl);
      }
      const next = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(next.length > 0 ? next[next.length - 1].id : '');
      }
      return next;
    });
  };

  const refreshTree = async () => {
    const dirsToRefresh = new Set([rootPath, currentPath].filter(Boolean));
    Object.entries(expandedDirs).forEach(([dPath, isExp]) => {
      if (isExp) dirsToRefresh.add(dPath);
    });
    for (const d of dirsToRefresh) {
      await fetchDirectoryEntries(d);
    }
    loadGitStatus();
  };

  const createItem = async (isDir) => {
    const targetDir = currentPath || rootPath;
    const name = window.prompt(`New ${isDir ? 'Folder' : 'File'} Name in ${targetDir.split('/').pop() || '/'}:`);
    if (!name || !targetDir) return;
    try {
      await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `${targetDir}/${name}`, is_dir: isDir }),
      });
      setExpandedDirs((prev) => ({ ...prev, [targetDir]: true }));
      await fetchDirectoryEntries(targetDir);
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
      const parentDir = path.slice(0, Math.max(0, path.lastIndexOf('/'))) || rootPath;
      if (parentDir) await fetchDirectoryEntries(parentDir);
      loadGitStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const breadcrumbSegments = useMemo(() => {
    const targetPath = activeTab?.path || currentPath || rootPath;
    if (!targetPath) return [];
    if (rootPath && (targetPath === rootPath || targetPath.startsWith(`${rootPath}/`))) {
      const rootLabel = rootPath.split('/').filter(Boolean).pop() || '/';
      const segs = [{ label: rootLabel, path: rootPath, isDir: true }];
      const rel = targetPath === rootPath ? '' : targetPath.slice(rootPath.length + 1);
      if (rel) {
        const parts = rel.split('/');
        let acc = rootPath;
        parts.forEach((p, idx) => {
          acc = `${acc}/${p}`;
          const isLast = idx === parts.length - 1;
          segs.push({
            label: p,
            path: acc,
            isDir: !isLast || !activeTab || activeTab.path !== targetPath,
          });
        });
      }
      return segs;
    }
    const parts = targetPath.split('/').filter(Boolean);
    let acc = '';
    return parts.map((p, idx) => {
      acc = `${acc}/${p}`;
      return {
        label: p,
        path: acc,
        isDir: idx < parts.length - 1,
      };
    });
  }, [activeTab, currentPath, rootPath]);

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

  const renderTreeNodes = (dirPath, depth = 0) => {
    const rawEntries = dirChildrenMap[dirPath] || [];
    const entries = rawEntries.filter((item) => !shouldHideEntry(item, hideDotfiles));
    if (entries.length === 0 && depth === 0) {
      return (
        <div style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)' }}>
          Empty directory.
        </div>
      );
    }

    return entries.map((item) => {
      const st = gitByPath.get(item.path);
      const isExpanded = Boolean(expandedDirs[item.path]);
      const isSelected = activeTab?.path === item.path || (!activeTab && currentPath === item.path);
      const isImg = !item.is_dir && isImagePath(item.path);

      return (
        <div key={item.path}>
          <div
            className={`tree-file-btn ${isSelected ? 'active' : ''}`}
            style={{ paddingLeft: `${7 + Math.min(depth, 7) * 13}px` }}
            onClick={() => (item.is_dir ? handleToggleDirectory(item.path) : openFileTab(item.path))}
            title={item.path}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: 1 }}>
              {item.is_dir ? (
                <span style={{ color: 'var(--text-muted)', display: 'inline-flex', width: '12px' }}>
                  <Icon name={isExpanded ? 'chevronDown' : 'chevronRight'} size={11} />
                </span>
              ) : (
                <span style={{ width: '12px', flexShrink: 0 }} />
              )}
              <span
                style={{
                  color: item.is_dir ? 'var(--accent)' : isImg ? '#c084fc' : 'var(--text-muted)',
                  display: 'inline-flex',
                  flexShrink: 0,
                }}
              >
                <Icon name={item.is_dir ? 'folder' : isImg ? 'image' : 'file'} size={12} />
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
          {item.is_dir && isExpanded && depth < 8 && renderTreeNodes(item.path, depth + 1)}
        </div>
      );
    });
  };

  const activeIsMarkdown = Boolean(activeTab?.type === 'file' && isMarkdownPath(activeTab.path));
  const showMarkdownPreview = activeIsMarkdown && mdViewMode === 'preview' && !isSelectMode;

  return (
    <div className={`file-explorer-pane ${splitMode ? 'split-mode' : 'full-mode'}`}>
      {/* Emerald Matrix Co-Pilot Top Bar (#260, #266) */}
      <div className="copilot-top-bar" style={{ height: 'auto', minHeight: '38px', padding: '5px 12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
          <button
            type="button"
            className={`subbar-util-btn ${navMode === 'files' ? 'active' : ''}`}
            onClick={() => {
              setNavMode('files');
              setTreeCollapsed(false);
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
              setTreeCollapsed(false);
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
                  loadFiles(e.target.value, true);
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
          {activeTab?.type === 'file' && (!activeIsMarkdown || mdViewMode === 'code') && (
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
              title={activeTab.type === 'image' ? 'Copy image path to clipboard' : 'Copy entire file contents to clipboard'}
            >
              <Icon name="copyText" size={12} />
              <span>{copyBadge || (activeTab.type === 'image' ? 'COPY PATH' : 'COPY ALL')}</span>
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
            className={`ghost-btn ${!treeCollapsed ? 'active' : ''}`}
            style={{ height: '26px', padding: '0 7px' }}
            onClick={toggleTreeRail}
            title={treeCollapsed ? 'Show File Explorer Sidebar' : 'Collapse File Explorer Sidebar'}
          >
            <Icon name="menu" size={14} />
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

      {/* Persistent 2-Column Split Body: Configurable Left or Right Tree Rail + Editor/Preview Stage (#260, #266) */}
      <div className={`files-split-body ${treeSide === 'right' ? 'tree-right' : 'tree-left'}`}>
        <aside
          className={`files-tree-rail ${treeCollapsed ? 'rail-collapsed' : ''} ${
            !showMobileTree && activeTab ? 'mobile-rail-hidden' : ''
          }`}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', padding: '2px 4px 6px', borderBottom: '1px solid var(--border-hairline)', marginBottom: '4px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.12em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {navMode === 'git'
                ? `CHANGES (${gitStatus.branch || 'HEAD'})`
                : (rootPath.split('/').filter(Boolean).pop() || 'WORKSPACE').toUpperCase()}
            </span>
            <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
              {navMode === 'files' ? (
                <>
                  <button
                    type="button"
                    className={`fav-chip ${!hideDotfiles ? 'active' : ''}`}
                    style={{ padding: '0 5px' }}
                    onClick={() => onToggleHideDotfiles?.()}
                    title={hideDotfiles ? 'Hidden dotfiles/caches filtered — click to show all' : 'Showing dotfiles — click to hide .git/.pytest_cache'}
                  >
                    <Icon name={hideDotfiles ? 'eyeOff' : 'eye'} size={11} />
                  </button>
                  <button
                    type="button"
                    className="fav-chip"
                    style={{ padding: '0 5px' }}
                    onClick={() => loadFiles((rootPath || currentPath).split('/').slice(0, -1).join('/') || '/', true)}
                    title="Move Root Up One Directory"
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
                  <button
                    type="button"
                    className="fav-chip"
                    style={{ padding: '0 5px' }}
                    onClick={refreshTree}
                    title="Refresh Explorer Tree"
                  >
                    <Icon name="refresh" size={11} />
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
                        title="Open file"
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
            rootPath && renderTreeNodes(rootPath, 0)
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
                {showMobileTree ? 'HIDE TREE' : 'TREE'}
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {t.type === 'image' && <Icon name="image" size={11} />}
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

          {/* Clickable Antigravity-Style Breadcrumb & Mode Strip (#266) */}
          {(activeTab || breadcrumbSegments.length > 0) && (
            <div className="files-breadcrumb-bar">
              <div className="files-breadcrumb-trail">
                {breadcrumbSegments.map((seg, idx) => {
                  const isLast = idx === breadcrumbSegments.length - 1;
                  const isImg = isLast && activeTab?.type === 'image';
                  return (
                    <span key={seg.path} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                      {idx > 0 && (
                        <span style={{ opacity: 0.4, display: 'inline-flex' }}>
                          <Icon name="chevronRight" size={11} />
                        </span>
                      )}
                      {seg.isDir ? (
                        <button
                          type="button"
                          className="breadcrumb-seg-btn"
                          onClick={async () => {
                            setNavMode('files');
                            setTreeCollapsed(false);
                            setShowMobileTree(true);
                            setCurrentPath(seg.path);
                            setExpandedDirs((prev) => ({ ...prev, [seg.path]: true }));
                            if (!dirChildrenMap[seg.path]) {
                              await fetchDirectoryEntries(seg.path);
                            }
                          }}
                          title={`Reveal ${seg.path} in Explorer`}
                        >
                          {seg.label}
                        </button>
                      ) : (
                        <span className="breadcrumb-leaf">
                          {isImg && (
                            <span style={{ color: '#c084fc', display: 'inline-flex' }}>
                              <Icon name="image" size={12} />
                            </span>
                          )}
                          <span>{seg.label}</span>
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0, flexWrap: 'wrap' }}>
                {activeIsMarkdown && (
                  <button
                    type="button"
                    className={`fav-chip ${mdViewMode === 'preview' ? 'active' : ''}`}
                    onClick={() => setMdViewMode((prev) => (prev === 'preview' ? 'code' : 'preview'))}
                    title="Toggle rendered GitHub Markdown Preview vs Monaco Code Editor"
                  >
                    <Icon name={mdViewMode === 'preview' ? 'code' : 'eye'} size={11} />
                    <span style={{ marginLeft: '4px' }}>
                      {mdViewMode === 'preview' ? 'EDIT CODE' : 'PREVIEW'}
                    </span>
                  </button>
                )}

                {activeTab?.type === 'image' && (
                  <>
                    {activeTab.dims && (
                      <span className="mono-kbd" style={{ fontSize: '9.5px' }}>
                        {activeTab.dims}
                      </span>
                    )}
                    <button
                      type="button"
                      className={`fav-chip ${imageZoomMode === 'actual' ? 'active' : ''}`}
                      onClick={() => setImageZoomMode((prev) => (prev === 'fit' ? 'actual' : 'fit'))}
                      title="Toggle Fit-to-Pane vs 1:1 Actual Pixel Size"
                    >
                      {imageZoomMode === 'fit' ? '1:1 ZOOM' : 'FIT PANE'}
                    </button>
                  </>
                )}

                {activeTab && activeTab.type !== 'image' && (
                  <button
                    type="button"
                    className={`fav-chip ${isSelectMode ? 'active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={toggleSelectMode}
                    title="Toggle clean read-only surface for drag-highlighting lines"
                  >
                    {isSelectMode ? 'EDITOR MODE' : 'SELECT TEXT'}
                  </button>
                )}

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

                {activeTab?.type === 'file' && (
                  <button
                    type="button"
                    className="fav-chip"
                    onClick={() => openDiffTab(activeTab.path, activeTab.label)}
                    title="Compare file with Git HEAD in side-by-side DiffEditor"
                  >
                    DIFF VS HEAD
                  </button>
                )}

                {activeTab && (
                  <button
                    type="button"
                    className="fav-chip"
                    onClick={reloadActiveTabFromDisk}
                    title="Reload latest file content from disk"
                  >
                    <Icon name="refresh" size={11} />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="file-content-area" style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            {!activeTab ? (
              <div className="fleet-empty-state" style={{ margin: 'auto' }}>
                Select a file, Markdown doc, or image asset from the explorer tree to preview or edit.
              </div>
            ) : activeTab.type === 'image' ? (
              <div className={`files-image-stage ${imageZoomMode === 'actual' ? 'zoom-actual' : 'zoom-fit'}`}>
                <img
                  src={activeTab.blobUrl}
                  alt={activeTab.label}
                  onLoad={(ev) => {
                    const nw = ev.currentTarget?.naturalWidth;
                    const nh = ev.currentTarget?.naturalHeight;
                    if (nw && nh && !activeTab.dims) {
                      const dimsStr = `${nw} × ${nh}`;
                      setTabs((prev) =>
                        prev.map((t) => (t.id === activeTab.id ? { ...t, dims: dimsStr } : t))
                      );
                    }
                  }}
                />
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
            ) : showMarkdownPreview ? (
              <div className="files-md-preview">
                <MarkdownBody
                  content={activeTab.content}
                  fontSize={editorFontSize + 1}
                  baseFilePath={activeTab.path}
                  onOpenFileLink={(targetPath, line) => {
                    openFileTab(targetPath, '', { forceCode: Boolean(line && line > 0) });
                  }}
                />
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
                    fontSize: editorFontSize,
                    wordWrap: editorWordWrap ? 'on' : 'off',
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
                    wordWrap: editorWordWrap ? 'on' : 'off',
                    automaticLayout: true,
                    fontSize: editorFontSize,
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
