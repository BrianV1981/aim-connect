import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import Icon from './Icons';
import MarkdownBody from './MarkdownBody';
import {
  DOCS_READER_TAB_ID,
  formatBrainChipLabel,
  pushDocsHistory,
  stepDocsHistory,
  upsertDocsReaderTab,
} from '../docsReaderHistory';
import {
  copyTextToClipboard,
  getSelectionWithinNode,
  shouldPreserveSelectionOnMouseDown,
} from '../scrollbackSelection';
import {
  pickPreferredWorkspaceFile,
  sanitizeFilesSnapshot,
} from '../sessionLayoutUtils';

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

const AUDIO_EXTENSIONS = new Set([
  '.mp3',
  '.wav',
  '.ogg',
  '.oga',
  '.m4a',
  '.aac',
  '.flac',
  '.opus',
]);

const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.webm',
  '.mov',
  '.m4v',
  '.ogv',
]);

const PLAYBACK_RATES = [1, 1.25, 1.5, 2];

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

function isAudioPath(filePath) {
  return AUDIO_EXTENSIONS.has(getExtLower(filePath));
}

function isVideoPath(filePath) {
  return VIDEO_EXTENSIONS.has(getExtLower(filePath));
}

function isMediaOrBinaryTab(tab) {
  return Boolean(
    tab && (tab.type === 'image' || tab.type === 'audio' || tab.type === 'video' || tab.type === 'binary')
  );
}

function formatBytes(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(sec) {
  if (typeof sec !== 'number' || !Number.isFinite(sec) || sec <= 0) return '';
  const total = Math.round(sec);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

function getTabIconMeta(type) {
  if (type === 'image') return { icon: 'image', color: '#c084fc' };
  if (type === 'audio') return { icon: 'audio', color: '#38bdf8' };
  if (type === 'video') return { icon: 'video', color: '#f472b6' };
  if (type === 'binary') return { icon: 'fileBinary', color: '#fbbf24' };
  return null;
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
  onToggleTreeSide,
  hideDotfiles = true,
  onToggleHideDotfiles,
  docsSingleTabMode = false,
  onToggleDocsSingleTabMode,
  editorFontSize = 13,
  editorWordWrap = true,
  requestedFile = null,
  selectMode = false,
  onToggleSelectMode,
  onToggleSplitMode,
  onClose,
  editorRef,
  savedFilesState = null,
  onFilesStateChange = null,
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
  const [docsHistory, setDocsHistory] = useState({ entries: [], index: -1 });
  const [mdViewMode, setMdViewMode] = useState('preview'); // preview | code
  const [imageZoomMode, setImageZoomMode] = useState('fit'); // fit | actual
  const [saveBadge, setSaveBadge] = useState('');
  const [copyBadge, setCopyBadge] = useState('');
  const [downloadBadge, setDownloadBadge] = useState('');
  const [copySelectionBadge, setCopySelectionBadge] = useState('');
  const [selectedFileText, setSelectedFileText] = useState('');
  const [localSelectMode, setLocalSelectMode] = useState(false);
  const [treeCollapsed, setTreeCollapsed] = useState(
    () => localStorage.getItem('aim-files-tree-collapsed') === 'true'
  );
  const [treeWidthPx, setTreeWidthPx] = useState(() => {
    const saved = parseInt(localStorage.getItem('aim-files-tree-width') || '226', 10);
    return Number.isFinite(saved) && saved >= 150 && saved <= 520 ? saved : 226;
  });
  const [isResizingTree, setIsResizingTree] = useState(false);
  const [showMobileTree, setShowMobileTree] = useState(true);
  const splitBodyRef = useRef(null);
  const selectSurfaceRef = useRef(null);
  const mediaPlayerRef = useRef(null);
  const autoOpenedSessionRef = useRef('');
  const lastDocsRepoSigRef = useRef('');
  const tabsCountRef = useRef(0);
  const requestedFileRef = useRef(requestedFile);
  const docsSingleTabModeRef = useRef(docsSingleTabMode);
  const blobUrlsRef = useRef(new Set());
  const savedFilesStateRef = useRef(savedFilesState);
  const onFilesStateChangeRef = useRef(onFilesStateChange);
  const activeSessionPropRef = useRef(activeSession);
  const mediaPositionsRef = useRef({});
  const lastMediaSaveTsRef = useRef(0);
  const lastRenderedSessionRef = useRef('');
  const lastOpenDocLabelRef = useRef('');
  const workspaceLoadSeqRef = useRef(0);
  const suppressSnapshotEmitRef = useRef(false);

  requestedFileRef.current = requestedFile;
  tabsCountRef.current = tabs.length;
  docsSingleTabModeRef.current = docsSingleTabMode;
  savedFilesStateRef.current = savedFilesState;
  onFilesStateChangeRef.current = onFilesStateChange;
  activeSessionPropRef.current = activeSession;

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

  const handleTreeResizerPointerDown = useCallback(
    (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const container = splitBodyRef.current;
      if (!container) return;
      e.preventDefault();
      setIsResizingTree(true);

      let latestPx = treeWidthPx;
      const updateWidth = (clientX) => {
        const rect = container.getBoundingClientRect();
        if (rect.width < 320) return;
        const rawPx = treeSide === 'right' ? rect.right - clientX : clientX - rect.left;
        const maxPx = Math.min(520, Math.max(200, Math.round(rect.width * 0.65)));
        const clamped = Math.max(150, Math.min(maxPx, Math.round(rawPx)));
        latestPx = clamped;
        setTreeWidthPx(clamped);
      };

      const onMove = (ev) => updateWidth(ev.clientX);
      const onEnd = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onEnd);
        window.removeEventListener('pointercancel', onEnd);
        setIsResizingTree(false);
        try {
          localStorage.setItem('aim-files-tree-width', String(latestPx));
        } catch {}
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
    },
    [treeSide, treeWidthPx]
  );

  const handleTreeResizerDoubleClick = useCallback(() => {
    setTreeWidthPx(226);
    try {
      localStorage.setItem('aim-files-tree-width', '226');
    } catch {}
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  const revokeTrackedBlobUrls = useCallback(() => {
    const urls = blobUrlsRef.current;
    urls.forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    });
    urls.clear();
  }, []);

  useEffect(() => {
    return () => {
      revokeTrackedBlobUrls();
    };
  }, [revokeTrackedBlobUrls]);

  const recordMediaPosition = useCallback((filePath, currentSec, force = false) => {
    if (!filePath || typeof currentSec !== 'number' || !Number.isFinite(currentSec) || currentSec <= 0) {
      return;
    }
    const now = Date.now();
    if (!force && now - lastMediaSaveTsRef.current < 1000) return;
    lastMediaSaveTsRef.current = now;
    mediaPositionsRef.current = {
      ...mediaPositionsRef.current,
      [filePath]: Math.round(currentSec * 100) / 100,
    };
  }, []);

  const buildCurrentSnapshot = useCallback(() => {
    if (
      activeTab &&
      (activeTab.type === 'audio' || activeTab.type === 'video') &&
      mediaPlayerRef.current &&
      Number.isFinite(mediaPlayerRef.current.currentTime) &&
      mediaPlayerRef.current.currentTime > 0
    ) {
      mediaPositionsRef.current = {
        ...mediaPositionsRef.current,
        [activeTab.path]: Math.round(mediaPlayerRef.current.currentTime * 100) / 100,
      };
    }
    return sanitizeFilesSnapshot({
      openFiles: tabs.map((t) => ({
        path: t.path,
        label: t.label,
        isDocsReader: Boolean(t.isDocsReader),
        playbackRate: t.playbackRate || 1,
      })),
      activePath: activeTab?.path || '',
      activeIsDocsReader: Boolean(activeTab?.isDocsReader),
      currentDir: currentPath || rootPath || '',
      navMode,
      mdViewMode,
      mediaPositions: mediaPositionsRef.current,
    });
  }, [tabs, activeTab, currentPath, rootPath, navMode, mdViewMode]);

  const clearVolatileMemory = useCallback(() => {
    revokeTrackedBlobUrls();
    setTabs([]);
    setActiveTabId('');
    setDirChildrenMap({});
    setExpandedDirs({});
    setSelectedFileText('');
    setGitStatus({ branch: '', files: [], repo_path: '' });
    setWorkspaceCtx(null);
    setDocsHistory({ entries: [], index: -1 });
    autoOpenedSessionRef.current = '';
  }, [revokeTrackedBlobUrls]);

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
    const copiesPath = isMediaOrBinaryTab(activeTab);
    const textToCopy = copiesPath ? activeTab.path : activeTab.content || '';
    const ok = await copyTextToClipboard(textToCopy);
    if (ok) {
      setCopyBadge(copiesPath ? 'COPIED PATH ✓' : 'COPIED ✓');
      setTimeout(() => setCopyBadge(''), 1800);
    }
  };

  const triggerAnchorDownload = (href, filename) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename || 'download';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadTabFile = async (tab = activeTab) => {
    if (!tab?.path) return;
    const filename = tab.label || tab.path.split('/').pop() || 'download';
    if (tab.blobUrl) {
      triggerAnchorDownload(tab.blobUrl, filename);
      setDownloadBadge('SAVED ✓');
      setTimeout(() => setDownloadBadge(''), 1800);
      return;
    }
    try {
      setDownloadBadge('SAVING...');
      const res = await fetch(`/api/file/download?path=${encodeURIComponent(tab.path)}`);
      if (!res.ok) {
        setDownloadBadge('FAILED');
        setTimeout(() => setDownloadBadge(''), 2000);
        return;
      }
      const blob = await res.blob();
      const tempUrl = URL.createObjectURL(blob);
      triggerAnchorDownload(tempUrl, filename);
      setTimeout(() => {
        try {
          URL.revokeObjectURL(tempUrl);
        } catch {}
      }, 5000);
      setDownloadBadge('SAVED ✓');
      setTimeout(() => setDownloadBadge(''), 1800);
    } catch (e) {
      console.error('Failed to download binary file', e);
      setDownloadBadge('FAILED');
      setTimeout(() => setDownloadBadge(''), 2000);
    }
  };

  const applyPlaybackRate = (rate) => {
    if (!activeTab) return;
    if (mediaPlayerRef.current) {
      try {
        mediaPlayerRef.current.playbackRate = rate;
      } catch {}
    }
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab.id ? { ...t, playbackRate: rate } : t))
    );
  };

  const pushOrFocusTab = (newTab, targetPath) => {
    setTabs((prev) => {
      const prevMatch = prev.find((t) => t.id === newTab.id);
      if (prevMatch?.blobUrl && prevMatch.blobUrl !== newTab.blobUrl) {
        try {
          URL.revokeObjectURL(prevMatch.blobUrl);
        } catch {}
        blobUrlsRef.current.delete(prevMatch.blobUrl);
      }
      const existingIdx = prev.findIndex((t) => t.id === newTab.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = newTab;
        return copy;
      }
      const next = [...prev, newTab];
      return next.length > MAX_TABS ? next.slice(next.length - MAX_TABS) : next;
    });
    setActiveTabId(newTab.id);
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setShowMobileTree(false);
    }
    expandAncestorsToFile(targetPath, rootPath);
  };

  const openFileTab = async (path, customLabel = '', opts = {}) => {
    if (!path) return;
    const useDocsReader = Boolean(opts.docsReader);
    const tabId = useDocsReader ? DOCS_READER_TAB_ID : `file:${path}`;
    if (opts.forceCode) {
      setMdViewMode('code');
    }

    if (!opts.forceReloadStub) {
      if (useDocsReader) {
        const existingReader = tabs.find((t) => t.id === DOCS_READER_TAB_ID);
        if (existingReader && existingReader.path === path && !existingReader.lazyPending) {
          setActiveTabId(DOCS_READER_TAB_ID);
          if (!opts.skipHistoryPush) {
            setDocsHistory((prev) =>
              pushDocsHistory(prev, { path, label: customLabel || existingReader.label })
            );
          }
          if (typeof window !== 'undefined' && window.innerWidth <= 768) {
            setShowMobileTree(false);
          }
          expandAncestorsToFile(existingReader.path, rootPath);
          return;
        }
      } else {
        const existing = tabs.find((t) => t.id === tabId);
        if (existing && !existing.lazyPending) {
          setActiveTabId(tabId);
          if (typeof window !== 'undefined' && window.innerWidth <= 768) {
            setShowMobileTree(false);
          }
          expandAncestorsToFile(existing.path, rootPath);
          return;
        }
      }
    }

    const mediaType = isImagePath(path)
      ? 'image'
      : isAudioPath(path)
        ? 'audio'
        : isVideoPath(path)
          ? 'video'
          : null;

    if (mediaType) {
      try {
        const res = await fetch(`/api/file/raw?path=${encodeURIComponent(path)}`);
        if (!res.ok) {
          let errMsg = `Inline media preview unavailable (HTTP ${res.status}).`;
          try {
            const errJson = await res.json();
            if (errJson?.error) errMsg = errJson.error;
          } catch {}
          pushOrFocusTab(
            {
              id: `file:${path}`,
              type: 'binary',
              path,
              label: customLabel || path.split('/').pop(),
              sizeBytes: null,
              mimeType: '',
              errorReason: errMsg,
              content: '',
              savedContent: '',
              conflict: null,
            },
            path
          );
          return;
        }
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        blobUrlsRef.current.add(blobUrl);
        const existingStub = tabs.find((t) => t.id === `file:${path}`);
        const savedResumeTime =
          typeof opts.resumeTime === 'number' && opts.resumeTime > 0
            ? opts.resumeTime
            : mediaPositionsRef.current[path] || 0;
        const newTab = {
          id: `file:${path}`,
          type: mediaType,
          path,
          label: customLabel || path.split('/').pop(),
          blobUrl,
          sizeBytes: blob.size,
          mimeType: blob.type || '',
          dims: '',
          durationSec: null,
          playbackRate: existingStub?.playbackRate || 1,
          resumeTime: savedResumeTime,
          content: '',
          savedContent: '',
          conflict: null,
        };
        if (mediaType === 'image') {
          setImageZoomMode('fit');
        }
        pushOrFocusTab(newTab, path);
      } catch (e) {
        console.error(`Failed to open ${mediaType} preview`, e);
      }
      return;
    }

    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (res.status === 415 || res.status === 413 || data?.is_binary) {
        const resolvedPath = data?.path || path;
        pushOrFocusTab(
          {
            id: `file:${resolvedPath}`,
            type: 'binary',
            path: resolvedPath,
            label: customLabel || resolvedPath.split('/').pop(),
            sizeBytes: typeof data?.size_bytes === 'number' ? data.size_bytes : null,
            mtime: data?.mtime || null,
            mimeType: data?.mime_type || 'application/octet-stream',
            errorReason: res.status === 413 && data?.error ? data.error : '',
            content: '',
            savedContent: '',
            conflict: null,
          },
          resolvedPath
        );
        return;
      }
      if (data.content !== undefined) {
        const resolvedPath = data.path || path;
        const resolvedLabel = customLabel || resolvedPath.split('/').pop();
        if (useDocsReader) {
          const readerPayload = {
            type: 'file',
            path: resolvedPath,
            label: resolvedLabel,
            content: data.content,
            savedContent: data.content,
            mtime: data.mtime || null,
            language: data.language || 'markdown',
            conflict: null,
          };
          setTabs((prev) => upsertDocsReaderTab(prev, readerPayload, MAX_TABS));
          setActiveTabId(DOCS_READER_TAB_ID);
          if (!opts.skipHistoryPush) {
            setDocsHistory((prev) =>
              pushDocsHistory(prev, { path: resolvedPath, label: resolvedLabel })
            );
          }
          if (isMarkdownPath(resolvedPath) && !opts.forceCode) {
            setMdViewMode('preview');
          }
          if (typeof window !== 'undefined' && window.innerWidth <= 768) {
            setShowMobileTree(false);
          }
          expandAncestorsToFile(resolvedPath, rootPath);
          return;
        }

        const newTab = {
          id: `file:${resolvedPath}`,
          type: 'file',
          path: resolvedPath,
          label: resolvedLabel,
          content: data.content,
          savedContent: data.content,
          mtime: data.mtime || null,
          language: data.language || 'markdown',
          conflict: null,
        };
        if (isMarkdownPath(resolvedPath) && !opts.forceCode) {
          setMdViewMode('preview');
        }
        pushOrFocusTab(newTab, resolvedPath);
      }
    } catch (e) {
      console.error('Failed to open file tab', e);
    }
  };

  const openBrainDoc = (path, rawLabel = '', event = null) => {
    if (!path) return;
    const cleanLabel = formatBrainChipLabel(rawLabel) || rawLabel;
    const forceSeparateTab = Boolean(event?.ctrlKey || event?.metaKey);
    openFileTab(path, cleanLabel, {
      docsReader: Boolean(docsSingleTabMode && !forceSeparateTab),
    });
  };

  const handleStepDocsHistory = (delta) => {
    const { state: nextHist, target } = stepDocsHistory(docsHistory, delta);
    if (!target?.path) return;
    setDocsHistory(nextHist);
    openFileTab(target.path, target.label, { docsReader: true, skipHistoryPush: true });
  };

  const pinActiveDocsReaderTab = () => {
    if (!activeTab || activeTab.id !== DOCS_READER_TAB_ID) return;
    const pinnedId = `file:${activeTab.path}`;
    setTabs((prev) => {
      const withoutExisting = prev.filter((t) => t.id !== pinnedId);
      return withoutExisting.map((t) =>
        t.id === DOCS_READER_TAB_ID ? { ...t, id: pinnedId, isDocsReader: false } : t
      );
    });
    setActiveTabId(pinnedId);
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

  const buildCurrentSnapshotRef = useRef(buildCurrentSnapshot);
  buildCurrentSnapshotRef.current = buildCurrentSnapshot;

  const loadWorkspaceContext = async (sessionName, explicitPath = '') => {
    const loadSeq = ++workspaceLoadSeqRef.current;
    try {
      const params = new URLSearchParams();
      if (sessionName) params.set('session', sessionName);
      if (explicitPath) params.set('path', explicitPath);
      const res = await fetch(`/api/workspace/context?${params.toString()}`);
      const data = await res.json();
      if (loadSeq !== workspaceLoadSeqRef.current) return;
      if (data && !data.error) {
        setWorkspaceCtx(data);
        const startRoot = data.repo_root || data.pane_path;
        const saved = savedFilesStateRef.current;
        const desiredDir = saved?.currentDir || '';
        if (desiredDir && startRoot && desiredDir.startsWith(startRoot) && desiredDir !== startRoot) {
          await loadFiles(startRoot, true);
          if (loadSeq !== workspaceLoadSeqRef.current) return;
          await loadFiles(desiredDir, false);
        } else if (startRoot) {
          await loadFiles(startRoot, true);
        }
        if (loadSeq !== workspaceLoadSeqRef.current) return;
        if (startRoot) {
          loadGitStatus(sessionName, startRoot);
        }
        const repoSig = data.main_repo_root || startRoot || '';
        if (repoSig && lastDocsRepoSigRef.current && lastDocsRepoSigRef.current !== repoSig) {
          setDocsHistory({ entries: [], index: -1 });
        }
        lastDocsRepoSigRef.current = repoSig;

        if (!requestedFileRef.current?.path) {
          if (saved && Array.isArray(saved.openFiles) && saved.openFiles.length > 0) {
            setNavMode(saved.navMode === 'git' ? 'git' : 'files');
            setMdViewMode(saved.mdViewMode === 'code' ? 'code' : 'preview');
            mediaPositionsRef.current = { ...(saved.mediaPositions || {}) };
            const stubTabs = saved.openFiles.map((item) => ({
              id: item.isDocsReader ? DOCS_READER_TAB_ID : `file:${item.path}`,
              type: 'file',
              path: item.path,
              label: item.label || item.path.split('/').pop(),
              isDocsReader: Boolean(item.isDocsReader),
              playbackRate: item.playbackRate || 1,
              lazyPending: true,
              content: '',
              savedContent: '',
              conflict: null,
            }));
            setTabs(stubTabs);
            const activeItem =
              saved.openFiles.find((f) => f.path === saved.activePath) ||
              saved.openFiles[saved.openFiles.length - 1];
            if (activeItem?.path) {
              const targetTabId = activeItem.isDocsReader
                ? DOCS_READER_TAB_ID
                : `file:${activeItem.path}`;
              setActiveTabId(targetTabId);
              await openFileTab(activeItem.path, activeItem.label, {
                docsReader: Boolean(activeItem.isDocsReader),
                forceReloadStub: true,
                resumeTime: mediaPositionsRef.current[activeItem.path] || 0,
              });
            }
          } else {
            setNavMode('files');
            const sigKey = `${sessionName || 'default'}:${repoSig}`;
            if (tabsCountRef.current === 0 && autoOpenedSessionRef.current !== sigKey) {
              autoOpenedSessionRef.current = sigKey;
              const preferred = pickPreferredWorkspaceFile(
                data.brain_files,
                lastOpenDocLabelRef.current ? [lastOpenDocLabelRef.current] : []
              );
              if (preferred?.path) {
                const cleanLbl = formatBrainChipLabel(preferred.label) || preferred.label;
                await openFileTab(preferred.path, cleanLbl, {
                  docsReader: Boolean(docsSingleTabModeRef.current),
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to load workspace context', e);
    } finally {
      if (loadSeq === workspaceLoadSeqRef.current) {
        suppressSnapshotEmitRef.current = false;
      }
    }
  };

  useEffect(() => {
    const prevSess = lastRenderedSessionRef.current;
    if (!isOpen) {
      workspaceLoadSeqRef.current += 1;
      if (prevSess) {
        onFilesStateChangeRef.current?.(prevSess, buildCurrentSnapshotRef.current());
      }
      suppressSnapshotEmitRef.current = true;
      clearVolatileMemory();
      lastRenderedSessionRef.current = '';
      mediaPositionsRef.current = {};
      return;
    }

    if (prevSess && prevSess !== activeSession) {
      onFilesStateChangeRef.current?.(prevSess, buildCurrentSnapshotRef.current());
      lastOpenDocLabelRef.current = activeTab?.label || '';
      suppressSnapshotEmitRef.current = true;
      clearVolatileMemory();
    } else if (!prevSess) {
      suppressSnapshotEmitRef.current = true;
    }

    lastRenderedSessionRef.current = activeSession || '';
    mediaPositionsRef.current = { ...(savedFilesStateRef.current?.mediaPositions || {}) };
    loadWorkspaceContext(activeSession);
  }, [isOpen, activeSession]);

  useEffect(() => {
    if (!isOpen || suppressSnapshotEmitRef.current || !activeSessionPropRef.current) return;
    onFilesStateChangeRef.current?.(activeSessionPropRef.current, buildCurrentSnapshot());
  }, [isOpen, tabs, activeTabId, currentPath, navMode, mdViewMode, buildCurrentSnapshot]);

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
    if (activeTab.type === 'image' || activeTab.type === 'audio' || activeTab.type === 'video') {
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
            t.id === activeTab.id
              ? { ...t, blobUrl: nextBlobUrl, sizeBytes: blob.size, mimeType: blob.type || t.mimeType }
              : t
          )
        );
      } catch {}
      return;
    }
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(activeTab.path)}`);
      const data = await res.json();
      if (res.status === 415 || res.status === 413 || data?.is_binary) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id
              ? {
                  ...t,
                  type: 'binary',
                  sizeBytes: typeof data?.size_bytes === 'number' ? data.size_bytes : t.sizeBytes,
                  mtime: data?.mtime || t.mtime,
                  mimeType: data?.mime_type || t.mimeType,
                  errorReason: res.status === 413 && data?.error ? data.error : t.errorReason,
                }
              : t
          )
        );
        return;
      }
      if (data.content !== undefined) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id
              ? {
                  ...t,
                  type: 'file',
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

  const gitByPath = useMemo(() => {
    const map = new Map();
    gitStatus.files.forEach((gf) => {
      if (gf?.path) map.set(gf.path, gf.status);
    });
    return map;
  }, [gitStatus.files]);

  if (!isOpen) return null;

  const coreBrainFiles = (workspaceCtx?.brain_files || []).filter(
    (bf) => bf.exists && bf.category !== 'wiki_page'
  );
  const wikiPageFiles = (workspaceCtx?.brain_files || []).filter(
    (bf) => bf.exists && bf.category === 'wiki_page'
  );
  const worktrees = workspaceCtx?.worktrees || [];

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
      const isAud = !item.is_dir && isAudioPath(item.path);
      const isVid = !item.is_dir && isVideoPath(item.path);
      const entryIcon = item.is_dir
        ? 'folder'
        : isImg
          ? 'image'
          : isAud
            ? 'audio'
            : isVid
              ? 'video'
              : 'file';
      const entryIconColor = item.is_dir
        ? 'var(--accent)'
        : isImg
          ? '#c084fc'
          : isAud
            ? '#38bdf8'
            : isVid
              ? '#f472b6'
              : 'var(--text-muted)';

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
                  color: entryIconColor,
                  display: 'inline-flex',
                  flexShrink: 0,
                }}
              >
                <Icon name={entryIcon} size={12} />
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
      {/* Emerald Matrix Co-Pilot Top Bar (#260, #266, #279) */}
      <div className="copilot-top-bar files-top-bar">
        <div className="copilot-top-left">
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

          {(coreBrainFiles.length > 0 || wikiPageFiles.length > 0) && (
            <div className="project-docs-hub-bar" role="group" aria-label="Project Docs Hub">
              <span className="project-docs-hub-badge" title="Project Docs & Memory Wiki Hub">
                <Icon name="bookOpen" size={12} />
                <span>DOCS</span>
              </span>

              {docsSingleTabMode && (
                <>
                  <button
                    type="button"
                    className="docs-nav-arrow-btn"
                    disabled={docsHistory.index <= 0}
                    onClick={() => handleStepDocsHistory(-1)}
                    title="Back to previous Project Doc"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="docs-nav-arrow-btn"
                    disabled={
                      docsHistory.entries.length === 0 ||
                      docsHistory.index >= docsHistory.entries.length - 1
                    }
                    onClick={() => handleStepDocsHistory(1)}
                    title="Forward to next Project Doc"
                  >
                    →
                  </button>
                </>
              )}

              {coreBrainFiles.map((bf) => (
                <button
                  key={bf.path}
                  type="button"
                  className={`fav-chip ${activeTab?.path === bf.path ? 'active' : ''}`}
                  onClick={(e) => openBrainDoc(bf.path, bf.label, e)}
                  title={`${bf.label} (${bf.path})\n${
                    docsSingleTabMode
                      ? 'Click to navigate in place · Ctrl/Cmd+Click to open separate tab'
                      : 'Click to open tab'
                  }`}
                >
                  {formatBrainChipLabel(bf.label)}
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
                      openBrainDoc(e.target.value, chosen?.label || '');
                    }
                  }}
                >
                  <option value="">memory-wiki/ ({wikiPageFiles.length})</option>
                  {wikiPageFiles.map((w) => (
                    <option key={w.path} value={w.path}>
                      {formatBrainChipLabel(w.label)}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                className={`docs-webnav-toggle ${docsSingleTabMode ? 'active' : ''}`}
                onClick={() => onToggleDocsSingleTabMode?.()}
                title="Toggle Single-Tab Website Navigation (navigate Project Docs & Wiki in 1 reusable tab with Back/Forward vs opening a new tab per page)"
              >
                <span>{docsSingleTabMode ? '1-TAB: ON' : '1-TAB: OFF'}</span>
              </button>
            </div>
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

        <div className="copilot-top-right">
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
              title={
                isMediaOrBinaryTab(activeTab)
                  ? 'Copy file path to clipboard'
                  : 'Copy entire file contents to clipboard'
              }
            >
              <Icon name="copyText" size={12} />
              <span>
                {copyBadge || (isMediaOrBinaryTab(activeTab) ? 'COPY PATH' : 'COPY ALL')}
              </span>
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

      {/* Persistent 2-Column Split Body: Configurable Left or Right Tree Rail + Draggable Resizer + Editor/Preview Stage (#260, #266, #267) */}
      <div
        ref={splitBodyRef}
        className={`files-split-body ${treeSide === 'right' ? 'tree-right' : 'tree-left'} ${
          isResizingTree ? 'is-resizing-tree' : ''
        }`}
        style={{ '--files-tree-width': `${treeWidthPx}px` }}
      >
        <aside
          className={`files-tree-rail ${treeCollapsed ? 'rail-collapsed' : ''} ${
            !showMobileTree && activeTab ? 'mobile-rail-hidden' : ''
          }`}
        >
          {/* Row 1: Dedicated Folder / Repository Name Row (#267) */}
          <div className="files-tree-folder-row" title={rootPath || currentPath}>
            <span style={{ color: 'var(--accent)', display: 'inline-flex', flexShrink: 0 }}>
              <Icon name={navMode === 'git' ? 'gitBranch' : 'folder'} size={12} />
            </span>
            <span className="files-tree-folder-title">
              {navMode === 'git'
                ? `CHANGES (${gitStatus.branch || 'HEAD'})`
                : (rootPath.split('/').filter(Boolean).pop() || 'WORKSPACE').toUpperCase()}
            </span>
          </div>

          {/* Row 2: Dedicated Action & Left/Right Flip Toolbar Row (#267) */}
          <div className="files-tree-actions-row">
            <button
              type="button"
              className="fav-chip tree-side-flip-btn"
              onClick={() => onToggleTreeSide?.()}
              title={
                treeSide === 'right'
                  ? 'Move File Explorer to Left side'
                  : 'Move File Explorer to Right side'
              }
            >
              <Icon name={treeSide === 'right' ? 'sidebar' : 'panelRight'} size={11} />
              <span>{treeSide === 'right' ? '← LEFT' : 'RIGHT →'}</span>
            </button>

            {navMode === 'files' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`fav-chip ${!hideDotfiles ? 'active' : ''}`}
                  style={{ padding: '0 5px' }}
                  onClick={() => onToggleHideDotfiles?.()}
                  title={
                    hideDotfiles
                      ? 'Hidden dotfiles/caches filtered — click to show all'
                      : 'Showing dotfiles — click to hide .git/.pytest_cache'
                  }
                >
                  <Icon name={hideDotfiles ? 'eyeOff' : 'eye'} size={11} />
                </button>
                <button
                  type="button"
                  className="fav-chip"
                  style={{ padding: '0 5px' }}
                  onClick={() =>
                    loadFiles((rootPath || currentPath).split('/').slice(0, -1).join('/') || '/', true)
                  }
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
              </div>
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

          {/* Row 3: Scrollable File Explorer Tree Window (#267) */}
          <div className="files-tree-scroll">
            {navMode === 'git' ? (
              gitStatus.files.length === 0 ? (
                <div style={{ padding: '12px 6px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  Working tree clean.
                </div>
              ) : (
                gitStatus.files.map((gf, idx) => {
                  const isDirEntry = Boolean(gf.is_dir || gf.rel_path?.endsWith('/'));
                  const isSelected = activeTab?.path === gf.path;
                  return (
                    <div
                      key={`${gf.path}:${idx}`}
                      className={`tree-file-btn ${isSelected ? 'active' : ''}`}
                      onClick={async () => {
                        if (isDirEntry) {
                          setNavMode('files');
                          setCurrentPath(gf.path);
                          setExpandedDirs((prev) => ({ ...prev, [gf.path]: true }));
                          if (!dirChildrenMap[gf.path]) {
                            await fetchDirectoryEntries(gf.path);
                          }
                        } else {
                          openDiffTab(gf.path, gf.rel_path);
                        }
                      }}
                      title={
                        isDirEntry
                          ? `${gf.rel_path} (Untracked folder — click to browse in Files)`
                          : `${gf.rel_path} (Click for Git Diff)`
                      }
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
                        {!isDirEntry && (
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
                        )}
                      </span>
                    </div>
                  );
                })
              )
            ) : (
              rootPath && renderTreeNodes(rootPath, 0)
            )}
          </div>
        </aside>

        {!treeCollapsed && (
          <div
            className={`files-tree-resizer desktop-only ${isResizingTree ? 'dragging' : ''}`}
            role="separator"
            aria-orientation="vertical"
            aria-label="Drag vertical separator to resize folder explorer"
            title="Drag to resize folder explorer · Double-click to reset width"
            onPointerDown={handleTreeResizerPointerDown}
            onDoubleClick={handleTreeResizerDoubleClick}
          />
        )}

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
                const tabMeta = t.isDocsReader
                  ? { icon: 'bookOpen', color: 'var(--accent)' }
                  : getTabIconMeta(t.type);
                const shownLabel = t.isDocsReader ? `DOCS · ${t.label}` : t.label;
                return (
                  <div
                    key={t.id}
                    className={`cp-tab ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      if (t.lazyPending) {
                        openFileTab(t.path, t.label, {
                          docsReader: Boolean(t.isDocsReader),
                          forceReloadStub: true,
                          resumeTime: mediaPositionsRef.current[t.path] || 0,
                        });
                      } else {
                        setActiveTabId(t.id);
                      }
                    }}
                    title={t.path}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {tabMeta && (
                        <span style={{ color: tabMeta.color, display: 'inline-flex' }}>
                          <Icon name={tabMeta.icon} size={11} />
                        </span>
                      )}
                      {isDirty ? '● ' : ''}
                      {shownLabel}
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

          {/* Clickable Antigravity-Style Breadcrumb & Mode Strip (#266, #270) */}
          {(activeTab || breadcrumbSegments.length > 0) && (
            <div className="files-breadcrumb-bar">
              <div className="files-breadcrumb-trail">
                {breadcrumbSegments.map((seg, idx) => {
                  const isLast = idx === breadcrumbSegments.length - 1;
                  const leafMeta = isLast && activeTab ? getTabIconMeta(activeTab.type) : null;
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
                          {leafMeta && (
                            <span style={{ color: leafMeta.color, display: 'inline-flex' }}>
                              <Icon name={leafMeta.icon} size={12} />
                            </span>
                          )}
                          <span>{seg.label}</span>
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>

              <div className="files-breadcrumb-actions">
                {activeTab?.id === DOCS_READER_TAB_ID && (
                  <button
                    type="button"
                    className="fav-chip"
                    onClick={pinActiveDocsReaderTab}
                    title="Pin current doc as its own standalone tab so future Docs navigation opens alongside it"
                  >
                    <Icon name="pin" size={11} />
                    <span style={{ marginLeft: '4px' }}>PIN TAB</span>
                  </button>
                )}

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

                {activeTab && isMediaOrBinaryTab(activeTab) && (
                  <>
                    {activeTab.dims && (
                      <span className="mono-kbd" style={{ fontSize: '9.5px' }}>
                        {activeTab.dims}
                      </span>
                    )}
                    {activeTab.durationSec ? (
                      <span className="mono-kbd" style={{ fontSize: '9.5px' }}>
                        {formatDuration(activeTab.durationSec)}
                      </span>
                    ) : null}
                    {typeof activeTab.sizeBytes === 'number' && (
                      <span className="mono-kbd" style={{ fontSize: '9.5px' }}>
                        {formatBytes(activeTab.sizeBytes)}
                      </span>
                    )}
                  </>
                )}

                {activeTab?.type === 'image' && (
                  <button
                    type="button"
                    className={`fav-chip ${imageZoomMode === 'actual' ? 'active' : ''}`}
                    onClick={() => setImageZoomMode((prev) => (prev === 'fit' ? 'actual' : 'fit'))}
                    title="Toggle Fit-to-Pane vs 1:1 Actual Pixel Size"
                  >
                    {imageZoomMode === 'fit' ? '1:1 ZOOM' : 'FIT PANE'}
                  </button>
                )}

                {activeTab && isMediaOrBinaryTab(activeTab) && (
                  <button
                    type="button"
                    className="fav-chip"
                    onClick={() => downloadTabFile(activeTab)}
                    title="Save file to your device"
                  >
                    <Icon name="downloadSm" size={11} />
                    <span style={{ marginLeft: '4px' }}>{downloadBadge || 'DOWNLOAD'}</span>
                  </button>
                )}

                {activeTab && !isMediaOrBinaryTab(activeTab) && (
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

                {isSelectMode && !isMediaOrBinaryTab(activeTab) && (
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
                Select a file, Markdown doc, or media asset from the explorer tree to preview or edit.
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
            ) : activeTab.type === 'audio' ? (
              <div className="files-media-stage audio-stage">
                <div className="files-media-card">
                  <div className="files-media-card-header">
                    <span className="files-media-icon-box" style={{ color: '#38bdf8' }}>
                      <Icon name="audio" size={20} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="files-media-title">{activeTab.label}</div>
                      <div className="files-media-subpath">{activeTab.path}</div>
                    </div>
                    <span className="mono-kbd" style={{ fontSize: '9.5px' }}>
                      {(activeTab.mimeType || getExtLower(activeTab.path).replace('.', '') || 'AUDIO').toUpperCase()}
                    </span>
                  </div>

                  <audio
                    key={activeTab.blobUrl}
                    ref={mediaPlayerRef}
                    className="files-audio-player"
                    controls
                    preload="metadata"
                    src={activeTab.blobUrl}
                    onLoadedMetadata={(ev) => {
                      const el = ev.currentTarget;
                      const dur = el?.duration;
                      if (activeTab.playbackRate && activeTab.playbackRate !== 1) {
                        el.playbackRate = activeTab.playbackRate;
                      }
                      if (
                        activeTab.resumeTime > 0 &&
                        el.dataset.resumedForUrl !== activeTab.blobUrl
                      ) {
                        el.dataset.resumedForUrl = activeTab.blobUrl;
                        try {
                          el.currentTime = Math.min(
                            activeTab.resumeTime,
                            Number.isFinite(dur) && dur > 0.2 ? dur - 0.1 : activeTab.resumeTime
                          );
                        } catch {}
                      }
                      if (Number.isFinite(dur) && dur > 0 && !activeTab.durationSec) {
                        setTabs((prev) =>
                          prev.map((t) => (t.id === activeTab.id ? { ...t, durationSec: dur } : t))
                        );
                      }
                    }}
                    onTimeUpdate={(ev) => recordMediaPosition(activeTab.path, ev.currentTarget.currentTime)}
                    onPause={(ev) => recordMediaPosition(activeTab.path, ev.currentTarget.currentTime, true)}
                    onSeeked={(ev) => recordMediaPosition(activeTab.path, ev.currentTarget.currentTime, true)}
                  />

                  <div className="files-media-meta-row">
                    <div className="files-speed-pills">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginRight: '3px' }}>
                        SPEED
                      </span>
                      {PLAYBACK_RATES.map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          className={`fav-chip ${(activeTab.playbackRate || 1) === rate ? 'active' : ''}`}
                          onClick={() => applyPlaybackRate(rate)}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="fav-chip"
                        onClick={() => downloadTabFile(activeTab)}
                      >
                        <Icon name="downloadSm" size={11} />
                        <span style={{ marginLeft: '4px' }}>{downloadBadge || 'SAVE AUDIO'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab.type === 'video' ? (
              <div className="files-media-stage video-stage">
                <div className="files-video-frame">
                  <video
                    key={activeTab.blobUrl}
                    ref={mediaPlayerRef}
                    className="files-video-player"
                    controls
                    playsInline
                    preload="metadata"
                    src={activeTab.blobUrl}
                    onLoadedMetadata={(ev) => {
                      const el = ev.currentTarget;
                      const dur = el?.duration;
                      const vw = el?.videoWidth;
                      const vh = el?.videoHeight;
                      if (activeTab.playbackRate && activeTab.playbackRate !== 1) {
                        el.playbackRate = activeTab.playbackRate;
                      }
                      if (
                        activeTab.resumeTime > 0 &&
                        el.dataset.resumedForUrl !== activeTab.blobUrl
                      ) {
                        el.dataset.resumedForUrl = activeTab.blobUrl;
                        try {
                          el.currentTime = Math.min(
                            activeTab.resumeTime,
                            Number.isFinite(dur) && dur > 0.2 ? dur - 0.1 : activeTab.resumeTime
                          );
                        } catch {}
                      }
                      setTabs((prev) =>
                        prev.map((t) =>
                          t.id === activeTab.id
                            ? {
                                ...t,
                                durationSec: Number.isFinite(dur) && dur > 0 ? dur : t.durationSec,
                                dims: vw && vh ? `${vw} × ${vh}` : t.dims,
                              }
                            : t
                        )
                      );
                    }}
                    onTimeUpdate={(ev) => recordMediaPosition(activeTab.path, ev.currentTarget.currentTime)}
                    onPause={(ev) => recordMediaPosition(activeTab.path, ev.currentTarget.currentTime, true)}
                    onSeeked={(ev) => recordMediaPosition(activeTab.path, ev.currentTarget.currentTime, true)}
                  />
                  <div className="files-video-bar">
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                      <span style={{ color: '#f472b6', display: 'inline-flex' }}>
                        <Icon name="video" size={13} />
                      </span>
                      <span className="files-media-title" style={{ fontSize: '11.5px' }}>
                        {activeTab.label}
                      </span>
                      {activeTab.dims && (
                        <span className="mono-kbd" style={{ fontSize: '9.5px' }}>
                          {activeTab.dims}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <div className="files-speed-pills">
                        {PLAYBACK_RATES.map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            className={`fav-chip ${(activeTab.playbackRate || 1) === rate ? 'active' : ''}`}
                            onClick={() => applyPlaybackRate(rate)}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="fav-chip"
                        onClick={() => downloadTabFile(activeTab)}
                      >
                        <Icon name="downloadSm" size={11} />
                        <span style={{ marginLeft: '4px' }}>{downloadBadge || 'SAVE VIDEO'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab.type === 'binary' ? (
              <div className="files-media-stage binary-stage">
                <div className="files-media-card">
                  <div className="files-media-card-header">
                    <span className="files-media-icon-box" style={{ color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)' }}>
                      <Icon name="fileBinary" size={20} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span className="files-binary-badge">BINARY / NON-UTF-8</span>
                        {activeTab.mimeType && (
                          <span className="mono-kbd" style={{ fontSize: '9.5px' }}>
                            {activeTab.mimeType}
                          </span>
                        )}
                        {typeof activeTab.sizeBytes === 'number' && (
                          <span className="mono-kbd" style={{ fontSize: '9.5px' }}>
                            {formatBytes(activeTab.sizeBytes)}
                          </span>
                        )}
                      </div>
                      <div className="files-media-title">{activeTab.label}</div>
                      <div className="files-media-subpath">{activeTab.path}</div>
                    </div>
                  </div>

                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    {activeTab.errorReason ||
                      'This file contains binary or non-UTF-8 bytes and cannot be edited as plain text in Monaco. You can download it directly or copy its path.'}
                  </div>

                  <div className="files-media-meta-row">
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="subbar-util-btn active"
                        onClick={() => downloadTabFile(activeTab)}
                      >
                        <Icon name="downloadSm" size={12} />
                        <span>{downloadBadge || 'DOWNLOAD FILE'}</span>
                      </button>
                      <button
                        type="button"
                        className="fav-chip"
                        onClick={copyActiveTabContent}
                      >
                        <Icon name="copyText" size={11} />
                        <span style={{ marginLeft: '4px' }}>{copyBadge || 'COPY PATH'}</span>
                      </button>
                    </div>
                  </div>
                </div>
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
                    const hasLine = Boolean(line && line > 0);
                    const inPlaceDocs =
                      docsSingleTabMode &&
                      activeTab?.id === DOCS_READER_TAB_ID &&
                      isMarkdownPath(targetPath) &&
                      !hasLine;
                    openFileTab(targetPath, '', {
                      forceCode: hasLine,
                      docsReader: inPlaceDocs,
                    });
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
