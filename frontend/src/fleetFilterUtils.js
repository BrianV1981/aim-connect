export function isRawTmuxItem(it) {
  if (!it) return false;
  return (
    it.vessel === 'service' ||
    (it.vessel === 'shell' && !it.tokens_used && Number(it.compaction_count || 0) === 0)
  );
}

export function computeFleetFilterCounts(items = [], unreadSessions = [], recentSessions = []) {
  const unreadSet = new Set(Array.isArray(unreadSessions) ? unreadSessions : []);
  const recentSet = new Set(Array.isArray(recentSessions) ? recentSessions : []);
  let thinking = 0;
  let unread = 0;
  let waiting = 0;
  let critical = 0;
  let warning = 0;
  let recent = 0;
  let rawTmux = 0;

  items.forEach((it) => {
    const isRaw = isRawTmuxItem(it);
    if (isRaw) rawTmux += 1;
    if (recentSet.has(it.session_name)) recent += 1;
    if (!isRaw && it.status === 'THINKING') thinking += 1;
    if (!isRaw && unreadSet.has(it.session_name) && it.status !== 'THINKING') unread += 1;
    if (it.status === 'WAITING') waiting += 1;
    if (!isRaw) {
      if (it.tier === 'critical' || Number(it.compaction_count || 0) > 0) critical += 1;
      else if (it.tier === 'warning') warning += 1;
    }
  });

  return {
    total: items.length,
    thinking,
    unread,
    waiting,
    critical,
    warning,
    recent,
    rawTmux,
  };
}

export function filterFleetItems(
  items = [],
  { statusFilter = 'all', filterText = '', unreadSessions = [], recentSessions = [] } = {}
) {
  const q = String(filterText || '').trim().toLowerCase();
  const unreadSet = new Set(Array.isArray(unreadSessions) ? unreadSessions : []);
  // #320: RECENT = sessions the Operator opened, most recent first (shared across devices).
  const recentOrder = new Map(
    (Array.isArray(recentSessions) ? recentSessions : []).map((name, idx) => [name, idx])
  );

  const matched = items.filter((it) => {
    const isRaw = isRawTmuxItem(it);
    if (statusFilter === 'thinking' && (isRaw || it.status !== 'THINKING')) return false;
    if (
      statusFilter === 'new' &&
      (isRaw || !unreadSet.has(it.session_name) || it.status === 'THINKING')
    ) {
      return false;
    }
    if (statusFilter === 'recent' && !recentOrder.has(it.session_name)) return false;
    if (statusFilter === 'tmux' && !isRaw) return false;
    if (statusFilter === 'waiting' && it.status !== 'WAITING') return false;
    if (
      statusFilter === 'high_ctx' &&
      (isRaw || (it.tier === 'normal' && Number(it.compaction_count || 0) === 0))
    ) {
      return false;
    }
    if (!q) return true;
    return (
      it.session_name.toLowerCase().includes(q) ||
      (it.vessel || '').toLowerCase().includes(q) ||
      (it.branch || '').toLowerCase().includes(q) ||
      (it.repo_name || '').toLowerCase().includes(q)
    );
  });
  if (statusFilter === 'recent') {
    return matched.sort((a, b) => recentOrder.get(a.session_name) - recentOrder.get(b.session_name));
  }
  return matched;
}

export function reconcileUnreadSessions(
  prevUnread = [],
  liveSessions = [],
  fleet = [],
  newlyCompleted = [],
  activeSession = ''
) {
  const liveSet =
    Array.isArray(liveSessions) && liveSessions.length > 0 ? new Set(liveSessions) : null;
  const thinkingSet = new Set(
    (Array.isArray(fleet) ? fleet : [])
      .filter((item) => item && item.status === 'THINKING' && item.session_name)
      .map((item) => item.session_name)
  );

  const retained = (Array.isArray(prevUnread) ? prevUnread : []).filter((s) => {
    if (!s || s === activeSession) return false;
    if (liveSet && !liveSet.has(s)) return false;
    if (thinkingSet.has(s)) return false;
    return true;
  });

  const merged = Array.from(
    new Set([
      ...retained,
      ...(Array.isArray(newlyCompleted) ? newlyCompleted : []).filter(
        (s) => s && s !== activeSession && !thinkingSet.has(s)
      ),
    ])
  );

  if (
    Array.isArray(prevUnread) &&
    merged.length === prevUnread.length &&
    merged.every((val, idx) => val === prevUnread[idx])
  ) {
    return prevUnread;
  }
  return merged;
}
