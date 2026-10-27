import { useMemo, useState } from 'react';

function formatTokens(n) {
  if (!n || n <= 0) return '0';
  if (n >= 1_000_000) {
    return n % 1_000_000 === 0
      ? `${n / 1_000_000}M`
      : `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

const VESSEL_LABELS = {
  agy: 'AGY',
  grok: 'GROK',
  opencode: 'OC',
  codex: 'CDX',
  service: 'SVC',
  shell: 'SH',
};

export default function FleetSidebar({
  isOpen,
  onClose,
  sessions = [],
  fleet = [],
  activeSession = '',
  unreadSessions = [],
  onSelectSession,
  onCreateSession,
  onKillSession,
  onSendSessionCommand,
}) {
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | thinking | high_ctx | worktree
  const [commandFeedback, setCommandFeedback] = useState({});

  // Merge raw session names with enriched fleet metadata
  const items = useMemo(() => {
    const byName = new Map();
    fleet.forEach((f) => {
      if (f && f.session_name) byName.set(f.session_name, f);
    });
    return sessions.map((name) => {
      const meta = byName.get(name);
      return (
        meta || {
          session_name: name,
          vessel: 'shell',
          status: 'IDLE',
          branch: '',
          repo_name: '',
          is_worktree: false,
          tokens_used: 0,
          tokens_limit: 200_000,
          context_pct: 0,
          tier: 'normal',
          preview: '',
          pane_count: 1,
        }
      );
    });
  }, [sessions, fleet]);

  const counts = useMemo(() => {
    let thinking = 0;
    let waiting = 0;
    let critical = 0;
    let warning = 0;
    items.forEach((it) => {
      if (it.status === 'THINKING') thinking += 1;
      if (it.status === 'WAITING') waiting += 1;
      if (it.tier === 'critical') critical += 1;
      else if (it.tier === 'warning') warning += 1;
    });
    return { total: items.length, thinking, waiting, critical, warning };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return items.filter((it) => {
      if (statusFilter === 'thinking' && it.status !== 'THINKING' && it.status !== 'WAITING') return false;
      if (statusFilter === 'waiting' && it.status !== 'WAITING') return false;
      if (statusFilter === 'high_ctx' && it.tier === 'normal') return false;
      if (statusFilter === 'worktree' && !it.is_worktree) return false;
      if (!q) return true;
      return (
        it.session_name.toLowerCase().includes(q) ||
        (it.vessel || '').toLowerCase().includes(q) ||
        (it.branch || '').toLowerCase().includes(q) ||
        (it.repo_name || '').toLowerCase().includes(q)
      );
    });
  }, [items, filterText, statusFilter]);

  const handleTriggerSkill = async (e, sessionName, command, label) => {
    e.stopPropagation();
    if (!onSendSessionCommand) return;
    const key = `${sessionName}:${label}`;
    setCommandFeedback((prev) => ({ ...prev, [key]: 'Sending...' }));
    try {
      await onSendSessionCommand(sessionName, command);
      setCommandFeedback((prev) => ({ ...prev, [key]: '✓ Sent' }));
    } catch (err) {
      setCommandFeedback((prev) => ({ ...prev, [key]: '✗ Failed' }));
    }
    setTimeout(() => {
      setCommandFeedback((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 2200);
  };

  if (!isOpen) return null;

  return (
    <aside className="fleet-sidebar" aria-label="Fleet Session Sidebar">
      <div className="fleet-sidebar-header">
        <div className="fleet-sidebar-title-row">
          <span className="fleet-sidebar-title">🧭 FLEET</span>
          <span className="fleet-count-pill" title="Total active tmux sessions">
            {counts.total}
          </span>
          {counts.thinking > 0 && (
            <span className="fleet-thinking-pill" title="Sessions actively executing">
              ⚡ {counts.thinking}
            </span>
          )}
          {counts.waiting > 0 && (
            <span className="fleet-waiting-pill" title="Sessions waiting for user approval or input">
              ✋ {counts.waiting}
            </span>
          )}
          {counts.critical > 0 && (
            <span className="fleet-critical-pill" title="Sessions >= 30% context saturation (Amnesia threshold)">
              ⚠️ {counts.critical}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className={`macro-btn ${!activeSession ? 'action' : ''}`}
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={() => onSelectSession('')}
            title="Deselect session and return to A.I.M. Connect Home / Welcome Screen"
          >
            🏠 Home
          </button>
          <button
            className="macro-btn"
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={onCreateSession}
            title="Create new tmux session"
          >
            + New
          </button>
          <button
            className="macro-btn"
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={onClose}
            title="Collapse Fleet Sidebar"
          >
            ◀
          </button>
        </div>
      </div>

      <div className="fleet-sidebar-controls">
        <input
          type="text"
          className="fleet-search-input"
          placeholder="Filter sessions, branch, vessel..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
        <div className="fleet-filter-pills">
          <button
            type="button"
            className={`fleet-filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({counts.total})
          </button>
          <button
            type="button"
            className={`fleet-filter-pill ${statusFilter === 'thinking' ? 'active' : ''}`}
            onClick={() => setStatusFilter('thinking')}
          >
            ⚡ Busy ({counts.thinking})
          </button>
          {counts.waiting > 0 && (
            <button
              type="button"
              className={`fleet-filter-pill ${statusFilter === 'waiting' ? 'active' : ''}`}
              onClick={() => setStatusFilter('waiting')}
            >
              ✋ Wait ({counts.waiting})
            </button>
          )}
          <button
            type="button"
            className={`fleet-filter-pill ${statusFilter === 'high_ctx' ? 'active' : ''}`}
            onClick={() => setStatusFilter('high_ctx')}
          >
            🧠 &ge;20% ({counts.warning + counts.critical})
          </button>
          <button
            type="button"
            className={`fleet-filter-pill ${statusFilter === 'worktree' ? 'active' : ''}`}
            onClick={() => setStatusFilter('worktree')}
          >
            🛠️ Worktrees
          </button>
        </div>
      </div>

      <div className="fleet-session-list">
        {filteredItems.length === 0 ? (
          <div className="fleet-empty-state">No matching sessions</div>
        ) : (
          filteredItems.map((item) => {
            const isActive = item.session_name === activeSession;
            const isUnread = unreadSessions.includes(item.session_name);
            const vesselCode = VESSEL_LABELS[item.vessel] || 'SH';
            const showContextBar =
              item.tokens_used > 0 || ['agy', 'grok', 'opencode', 'codex'].includes(item.vessel);
            const barWidth = Math.min(100, Math.max(0, item.context_pct || 0));
            const wikiKey = `${item.session_name}:wiki`;
            const handoffKey = `${item.session_name}:handoff`;

            return (
              <div
                key={item.session_name}
                className={`fleet-session-card ${isActive ? 'active' : ''} tier-${item.tier || 'normal'}`}
                onClick={() => {
                  onSelectSession(item.session_name);
                  if (window.innerWidth < 768 && onClose) {
                    onClose();
                  }
                }}
              >
                <div className="fleet-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                    <span
                      className={`fleet-status-dot ${(item.status || 'IDLE').toLowerCase()}`}
                      title={`Status: ${item.status || 'IDLE'}`}
                    />
                    <span className="fleet-session-name" title={item.session_name}>
                      {item.session_name}
                    </span>
                    {item.status === 'WAITING' && (
                      <span className="fleet-waiting-badge" title="Agent paused waiting for permission or answer">
                        ✋ WAIT
                      </span>
                    )}
                    {isUnread && (
                      <span className="fleet-unread-badge" title="Completed turn while in background">
                        NEW
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <span className={`fleet-vessel-badge vessel-${item.vessel || 'shell'}`}>
                      {vesselCode}
                    </span>
                    <button
                      type="button"
                      className="fleet-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onKillSession?.(item.session_name);
                      }}
                      title={`Terminate session ${item.session_name}`}
                      aria-label={`Terminate session ${item.session_name}`}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {(item.branch || item.pane_count > 1) && (
                  <div className="fleet-card-meta">
                    {item.branch && (
                      <span
                        className={`fleet-branch-badge ${item.is_worktree ? 'worktree' : ''}`}
                        title={item.path || item.branch}
                      >
                        {item.is_worktree ? '🛠️ ' : '🌿 '}
                        {item.branch}
                      </span>
                    )}
                    {item.pane_count > 1 && (
                      <span className="fleet-pane-badge" title={`${item.pane_count} tmux panes`}>
                        🪟 {item.pane_count}p
                      </span>
                    )}
                  </div>
                )}

                {showContextBar && (
                  <div className="fleet-context-section">
                    <div className="fleet-context-header">
                      <span className="fleet-context-label">
                        {item.tier === 'critical'
                          ? '⚠️ 30% RULE'
                          : item.tier === 'warning'
                            ? '⚡ WIKI SOON'
                            : 'CTX'}
                      </span>
                      <span className={`fleet-context-pct tier-${item.tier || 'normal'}`}>
                        {`${Number(item.context_pct || 0).toFixed(1)}% · ${formatTokens(item.tokens_used)}/${formatTokens(item.tokens_limit)}`}
                      </span>
                    </div>
                    <div className="fleet-context-track" title="J.O.S.H.U.A. 30%-Rule Context Saturation Meter (Red >= 30%)">
                      <div
                        className={`fleet-context-fill tier-${item.tier || 'normal'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <div className="fleet-context-30-marker" title="30% Amnesia Threshold" />
                    </div>
                  </div>
                )}

                {item.preview && (
                  <div className="fleet-card-preview" title={item.preview}>
                    {item.preview}
                  </div>
                )}

                {(isActive || item.tier === 'warning' || item.tier === 'critical') && (
                  <div className="fleet-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="fleet-action-btn wiki"
                      onClick={(e) => handleTriggerSkill(e, item.session_name, '/aim-memory-wiki', 'wiki')}
                      title="Inject /aim-memory-wiki into session"
                    >
                      {commandFeedback[wikiKey] || '🧠 /wiki'}
                    </button>
                    <button
                      type="button"
                      className={`fleet-action-btn handoff ${item.tier === 'critical' ? 'critical-pulse' : ''}`}
                      onClick={(e) => handleTriggerSkill(e, item.session_name, '/aim-handoff', 'handoff')}
                      title="Inject /aim-handoff into session (30%-Rule Baton Pass)"
                    >
                      {commandFeedback[handoffKey] || '🤝 /handoff'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
