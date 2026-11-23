export const DOCS_READER_TAB_ID = 'docs:reader';
export const MAX_DOCS_HISTORY = 50;

export function formatBrainChipLabel(rawLabel) {
  const clean = String(rawLabel || '').trim();
  if (clean === 'README.md') return 'README';
  if (clean === 'HANDOFF.md') return 'HANDOFF';
  if (clean === 'AGENTS.md') return 'AGENTS';
  if (clean === 'wiki/index.md') return 'Wiki Index';
  if (clean === 'wiki/log.md') return 'Wiki Log';
  if (clean.startsWith('pages/') && clean.endsWith('.md')) {
    return clean.slice('pages/'.length, -3);
  }
  return clean;
}

export function pushDocsHistory(state, entry) {
  if (!entry?.path) return state || { entries: [], index: -1 };
  const curEntries = Array.isArray(state?.entries) ? state.entries : [];
  const curIdx =
    typeof state?.index === 'number' && state.index >= -1
      ? Math.min(state.index, curEntries.length - 1)
      : curEntries.length - 1;

  const activeEntry = curIdx >= 0 ? curEntries[curIdx] : null;
  if (activeEntry && activeEntry.path === entry.path) {
    if (entry.label && activeEntry.label !== entry.label) {
      const updated = curEntries.slice();
      updated[curIdx] = { path: entry.path, label: entry.label };
      return { entries: updated, index: curIdx };
    }
    return { entries: curEntries, index: curIdx };
  }

  const head = curIdx >= 0 ? curEntries.slice(0, curIdx + 1) : [];
  const nextEntries = [
    ...head,
    { path: entry.path, label: entry.label || entry.path.split('/').pop() || '' },
  ];
  const trimmed =
    nextEntries.length > MAX_DOCS_HISTORY
      ? nextEntries.slice(nextEntries.length - MAX_DOCS_HISTORY)
      : nextEntries;
  return {
    entries: trimmed,
    index: trimmed.length - 1,
  };
}

export function stepDocsHistory(state, delta) {
  const curEntries = Array.isArray(state?.entries) ? state.entries : [];
  const curIdx = typeof state?.index === 'number' ? state.index : -1;
  if (curEntries.length === 0) {
    return { state: { entries: [], index: -1 }, target: null };
  }
  const nextIdx = curIdx + delta;
  if (nextIdx < 0 || nextIdx >= curEntries.length) {
    return { state: { entries: curEntries, index: curIdx }, target: null };
  }
  return {
    state: { entries: curEntries, index: nextIdx },
    target: curEntries[nextIdx],
  };
}

export function upsertDocsReaderTab(tabs, newTabPayload, maxTabs = 20) {
  const list = Array.isArray(tabs) ? tabs.slice() : [];
  const readerTab = {
    ...newTabPayload,
    id: DOCS_READER_TAB_ID,
    isDocsReader: true,
  };

  const existingIdx = list.findIndex((t) => t.id === DOCS_READER_TAB_ID);
  if (existingIdx >= 0) {
    const prevReader = list[existingIdx];
    const isDirty =
      prevReader.type === 'file' &&
      prevReader.content !== undefined &&
      prevReader.content !== prevReader.savedContent;

    if (isDirty && prevReader.path && prevReader.path !== readerTab.path) {
      const pinnedId = `file:${prevReader.path}`;
      const withoutDupPinned = list.filter(
        (t, i) => i === existingIdx || t.id !== pinnedId
      );
      const adjIdx = withoutDupPinned.findIndex((t) => t.id === DOCS_READER_TAB_ID);
      withoutDupPinned[adjIdx] = {
        ...prevReader,
        id: pinnedId,
        isDocsReader: false,
      };
      const appended = [...withoutDupPinned, readerTab];
      return appended.length > maxTabs ? appended.slice(appended.length - maxTabs) : appended;
    }

    list[existingIdx] = readerTab;
    return list;
  }

  const appended = [...list, readerTab];
  return appended.length > maxTabs ? appended.slice(appended.length - maxTabs) : appended;
}
