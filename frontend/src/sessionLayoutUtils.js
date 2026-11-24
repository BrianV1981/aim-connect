export const SESSION_LAYOUT_STORAGE_KEY = 'aim-session-layouts-v1';
export const SESSION_LAYOUT_MODE_KEY = 'aim-session-layout-mode';
export const MAX_REMEMBERED_SESSIONS = 40;
export const MAX_REMEMBERED_TABS = 8;
export const MAX_MEDIA_POSITIONS = 12;

export function normalizeLayoutMode(mode) {
  return mode === 'global' ? 'global' : 'per-session';
}

export function normalizePaneTool(pane) {
  if (pane === 'files' || pane === 'browser') return pane;
  return 'terminal';
}

export function sanitizeFilesSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;

  const rawTabs = Array.isArray(snapshot.openFiles) ? snapshot.openFiles : [];
  const seen = new Set();
  const openFiles = [];
  for (const item of rawTabs) {
    if (!item || typeof item !== 'object') continue;
    const path = typeof item.path === 'string' ? item.path.trim() : '';
    if (!path) continue;
    const isDocsReader = Boolean(item.isDocsReader);
    const dedupeKey = isDocsReader ? '__docs_reader__' : path;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const label =
      typeof item.label === 'string' && item.label.trim()
        ? item.label.trim()
        : path.split('/').pop() || path;
    const playbackRate =
      typeof item.playbackRate === 'number' && Number.isFinite(item.playbackRate) && item.playbackRate > 0
        ? item.playbackRate
        : 1;
    openFiles.push({ path, label, isDocsReader, playbackRate });
    if (openFiles.length >= MAX_REMEMBERED_TABS) break;
  }

  const activePath = typeof snapshot.activePath === 'string' ? snapshot.activePath.trim() : '';
  const activeIsDocsReader = Boolean(snapshot.activeIsDocsReader);
  const currentDir = typeof snapshot.currentDir === 'string' ? snapshot.currentDir.trim() : '';
  const navMode = snapshot.navMode === 'git' ? 'git' : 'files';
  const mdViewMode = snapshot.mdViewMode === 'code' ? 'code' : 'preview';

  const mediaPositions = {};
  if (snapshot.mediaPositions && typeof snapshot.mediaPositions === 'object') {
    let count = 0;
    for (const [mPath, sec] of Object.entries(snapshot.mediaPositions)) {
      if (typeof mPath !== 'string' || !mPath.trim()) continue;
      if (typeof sec === 'number' && Number.isFinite(sec) && sec > 0) {
        mediaPositions[mPath] = Math.round(sec * 100) / 100;
        count += 1;
        if (count >= MAX_MEDIA_POSITIONS) break;
      }
    }
  }

  if (!openFiles.length && !activePath && !currentDir && Object.keys(mediaPositions).length === 0) {
    return null;
  }

  return {
    openFiles,
    activePath: activePath || (openFiles[openFiles.length - 1]?.path || ''),
    activeIsDocsReader,
    currentDir,
    navMode,
    mdViewMode,
    mediaPositions,
  };
}

export function createEmptySessionLayout(defaultSplit = true) {
  return {
    pane: 'terminal',
    splitMode: Boolean(defaultSplit),
    browserTargetId: '',
    files: null,
    updatedAt: 0,
  };
}

export function pruneSessionLayoutMap(map, maxEntries = MAX_REMEMBERED_SESSIONS) {
  if (!map || typeof map !== 'object') return {};
  const entries = Object.entries(map).filter(
    ([key, val]) => typeof key === 'string' && key.trim() && val && typeof val === 'object'
  );
  if (entries.length <= maxEntries) {
    const out = {};
    for (const [k, v] of entries) out[k] = v;
    return out;
  }
  entries.sort((a, b) => (Number(b[1]?.updatedAt) || 0) - (Number(a[1]?.updatedAt) || 0));
  const out = {};
  for (const [k, v] of entries.slice(0, maxEntries)) {
    out[k] = v;
  }
  return out;
}

export function loadSessionLayoutMap(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage || typeof storage.getItem !== 'function') return {};
  try {
    const raw = storage.getItem(SESSION_LAYOUT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const normalized = {};
    for (const [sessionName, entry] of Object.entries(parsed)) {
      if (!sessionName || !entry || typeof entry !== 'object') continue;
      normalized[sessionName] = {
        pane: normalizePaneTool(entry.pane),
        splitMode: typeof entry.splitMode === 'boolean' ? entry.splitMode : true,
        browserTargetId: typeof entry.browserTargetId === 'string' ? entry.browserTargetId : '',
        files: sanitizeFilesSnapshot(entry.files),
        updatedAt: Number.isFinite(Number(entry.updatedAt)) ? Number(entry.updatedAt) : 0,
      };
    }
    return pruneSessionLayoutMap(normalized);
  } catch {
    return {};
  }
}

export function saveSessionLayoutMap(map, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  const pruned = pruneSessionLayoutMap(map);
  if (!storage || typeof storage.setItem !== 'function') return pruned;
  try {
    storage.setItem(SESSION_LAYOUT_STORAGE_KEY, JSON.stringify(pruned));
  } catch {}
  return pruned;
}

export function upsertSessionLayout(map, sessionName, patch = {}) {
  const key = typeof sessionName === 'string' ? sessionName.trim() : '';
  if (!key) return map && typeof map === 'object' ? map : {};
  const prevMap = map && typeof map === 'object' ? map : {};
  const existing = prevMap[key] || createEmptySessionLayout(true);

  const nextPane = patch.pane !== undefined ? normalizePaneTool(patch.pane) : existing.pane;
  const nextSplit =
    typeof patch.splitMode === 'boolean' ? patch.splitMode : existing.splitMode;
  const nextTargetId =
    typeof patch.browserTargetId === 'string' ? patch.browserTargetId : existing.browserTargetId;
  const nextFiles =
    patch.files !== undefined ? sanitizeFilesSnapshot(patch.files) : existing.files;

  const nextEntry = {
    pane: nextPane,
    splitMode: nextSplit,
    browserTargetId: nextTargetId,
    files: nextFiles,
    updatedAt: typeof patch.updatedAt === 'number' ? patch.updatedAt : Date.now(),
  };

  return pruneSessionLayoutMap({
    ...prevMap,
    [key]: nextEntry,
  });
}

export function resolveSessionLayoutOnSwitch({
  layoutMode = 'per-session',
  layoutMap = {},
  targetSession = '',
  currentPane = 'terminal',
  currentSplitMode = true,
  defaultSplit = true,
  matchedFleet = null,
}) {
  const mode = normalizeLayoutMode(layoutMode);
  const fleetTargetId =
    matchedFleet?.has_browser_lease && matchedFleet?.browser_tab_id
      ? matchedFleet.browser_tab_id
      : '';
  const saved = targetSession && layoutMap ? layoutMap[targetSession] : null;

  if (mode === 'global') {
    return {
      pane: normalizePaneTool(currentPane),
      splitMode: Boolean(currentSplitMode),
      browserTargetId: fleetTargetId,
      filesSnapshot: saved?.files || null,
    };
  }

  if (!saved) {
    return {
      pane: 'terminal',
      splitMode: Boolean(defaultSplit),
      browserTargetId: fleetTargetId,
      filesSnapshot: null,
    };
  }

  return {
    pane: normalizePaneTool(saved.pane),
    splitMode: typeof saved.splitMode === 'boolean' ? saved.splitMode : Boolean(defaultSplit),
    browserTargetId: fleetTargetId || saved.browserTargetId || '',
    filesSnapshot: saved.files || null,
  };
}

export function pickPreferredWorkspaceFile(brainFiles = [], preferredLabels = []) {
  const list = Array.isArray(brainFiles) ? brainFiles.filter((bf) => bf && bf.exists && bf.path) : [];
  if (list.length === 0) return null;

  const cleanPrefs = (Array.isArray(preferredLabels) ? preferredLabels : [])
    .map((lbl) => (typeof lbl === 'string' ? lbl.trim().toLowerCase() : ''))
    .filter(Boolean);

  for (const pref of cleanPrefs) {
    const match = list.find((bf) => {
      const lbl = (bf.label || '').trim().toLowerCase();
      const base = (bf.path.split('/').pop() || '').trim().toLowerCase();
      return lbl === pref || base === pref;
    });
    if (match) return match;
  }

  const defaults = ['handoff.md', 'readme.md', 'agents.md'];
  for (const defLbl of defaults) {
    const match = list.find((bf) => (bf.label || '').trim().toLowerCase() === defLbl);
    if (match) return match;
  }

  return null;
}
