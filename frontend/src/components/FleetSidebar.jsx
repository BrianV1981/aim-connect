import { useMemo, useState } from 'react';
import { getAgentColor } from '../agentColors';
import {
  computeFleetFilterCounts,
  filterFleetItems,
  isRawTmuxItem,
} from '../fleetFilterUtils';
import Icon from './Icons';

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
  service: 'TMUX',
  shell: 'TMUX',
};

function deriveTaskChip(item, isRawTmux, effectiveTier, isCompacted, histCount) {
  if (isRawTmux) {
    const wCnt = item.window_count || 1;
    const pCnt = item.pane_count || 1;
    return {
      kind: 'server',
      label: wCnt > 1 ? `${wCnt}W · ${pCnt}P DAEMONS` : `${pCnt}P DAEMON`,
    };
  }
  if (item.browser_waiting_for_human) {
    return { kind: 'gate', label: 'BROWSER 2FA / LOGIN' };
  }
  if (item.status === 'WAITING') {
    return { kind: 'gate', label: 'GATE HOLD [y/n]' };
  }
  if (item.status === 'THINKING') {
    return item.has_browser_lease
      ? { kind: 'mapping', label: 'ACTIVE · WEB' }
      : { kind: 'typing', label: 'THINKING' };
  }
  if (isCompacted) {
    return { kind: 'gate', label: 'HANDOFF NOW' };
  }
  if (effectiveTier === 'critical') {
    return { kind: 'gate', label: item.vessel === 'agy' ? '512K SOON' : '30% LIMIT' };
  }
  if (!item.has_browser_lease) {
    return { kind: 'cli', label: histCount > 0 ? `CLI · ${histCount} SESS` : 'CLI · NO WEB' };
  }
  return { kind: 'idle', label: histCount > 0 ? `IDLE · ${histCount} SESS` : 'LEASE HELD' };
}

export default function FleetSidebar({
  isOpen,
  onClose,
  sessions = [],
  fleet = [],
  activeSession = '',
  unreadSessions = [],
  historyCounts = {},
  onSelectSession,
  onCreateSession,
  onOpenRepoLauncher,
  onFastResumeSession,
  onSaveWorkspaceState,
  onRestoreWorkspaceState,
  showSidebarResurrectBar = true,
  resurrectGate = { disabled: false, title: '' },
  onKillSession,
  onSendSessionCommand,
}) {
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | nobrowser | tmux | high_ctx | waiting
  const [commandFeedback, setCommandFeedback] = useState({});

  // Merge raw session names with enriched fleet metadata in strict alphabetical order (#257)
  const items = useMemo(() => {
    const byName = new Map();
    fleet.forEach((f) => {
      if (f && f.session_name) byName.set(f.session_name, f);
    });
    const sortedNames = [...sessions].sort((a, b) => a.localeCompare(b));
    return sortedNames.map((name) => {
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
          compaction_count: 0,
          tier: 'normal',
          preview: '',
          has_browser_lease: false,
          browser_tab_id: '',
          window_count: 1,
          pane_count: 1,
        }
      );
    });
  }, [sessions, fleet]);

  const counts = useMemo(
    () => computeFleetFilterCounts(items, unreadSessions),
    [items, unreadSessions]
  );

  const filteredItems = useMemo(
    () => filterFleetItems(items, { statusFilter, filterText, unreadSessions }),
    [items, filterText, statusFilter, unreadSessions]
  );

  const handleTriggerSkill = async (e, sessionName, command, label) => {
    e.stopPropagation();
    if (!onSendSessionCommand) return;
    const key = `${sessionName}:${label}`;
    setCommandFeedback((prev) => ({ ...prev, [key]: 'SENDING...' }));
    try {
      await onSendSessionCommand(sessionName, command);
      setCommandFeedback((prev) => ({ ...prev, [key]: 'SENT ✓' }));
    } catch {
      setCommandFeedback((prev) => ({ ...prev, [key]: 'FAILED' }));
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
          <span className="fleet-sidebar-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="cpu" size={14} />
            <span>FLEET // {String(counts.total).padStart(2, '0')} NODES</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          {onOpenRepoLauncher && (
            <button
              type="button"
              className="ghost-btn"
              style={{ height: '24px', padding: '0 7px' }}
              onClick={onOpenRepoLauncher}
              title="Open local Git repository in tmux (with -c fast resume)"
            >
              <Icon name="gitBranch" size={11} />
              <span>REPOS</span>
            </button>
          )}
          <button
            type="button"
            className="ghost-btn"
            style={{ height: '24px', padding: '0 8px' }}
            onClick={onCreateSession}
            title="Spawn new isolated tmux session"
          >
            <Icon name="plus" size={12} />
            <span>NEW</span>
          </button>
          <button
            type="button"
            className="ghost-btn mobile-only-close"
            style={{ height: '24px', padding: '0 6px' }}
            onClick={onClose}
            title="Close Fleet Sidebar"
          >
            <Icon name="close" size={13} />
          </button>
        </div>
      </div>

      <div className="fleet-sidebar-controls">
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: '9px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              display: 'flex',
              pointerEvents: 'none',
            }}
          >
            <Icon name="search" size={13} />
          </span>
          <input
            type="text"
            className="fleet-search-input"
            style={{ paddingLeft: '28px' }}
            placeholder="Filter session, branch, vessel..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        <div className="fleet-filter-pills">
          <button
            type="button"
            className={`fleet-filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            ALL ({counts.total})
          </button>
          <button
            type="button"
            className={`fleet-filter-pill ${statusFilter === 'thinking' ? 'active' : ''} ${
              counts.thinking > 0 ? 'has-thinking' : ''
            }`}
            onClick={() => setStatusFilter('thinking')}
            title="Actively working / thinking AI agent sessions"
          >
            THINKING ({counts.thinking})
          </button>
          <button
            type="button"
            className={`fleet-filter-pill ${statusFilter === 'new' ? 'active' : ''} ${
              counts.unread > 0 ? 'has-new' : ''
            }`}
            onClick={() => setStatusFilter('new')}
            title="Agents that finished a turn and replied while in the background"
          >
            NEW ({counts.unread})
          </button>
          <button
            type="button"
            className={`fleet-filter-pill ${statusFilter === 'nobrowser' ? 'active' : ''}`}
            onClick={() => setStatusFilter('nobrowser')}
            title="CLI-Only Agents & Raw Tmux Servers with No Open Browser Lease"
          >
            NO WEB ({counts.noBrowser})
          </button>
          <button
            type="button"
            className={`fleet-filter-pill ${statusFilter === 'tmux' ? 'active' : ''}`}
            onClick={() => setStatusFilter('tmux')}
            title="Non-Agent Split-Pane Tmux Server & Shell Sessions"
          >
            TMUX ({counts.rawTmux})
          </button>
          <button
            type="button"
            className={`fleet-filter-pill ${statusFilter === 'high_ctx' ? 'active' : ''}`}
            onClick={() => setStatusFilter('high_ctx')}
            title="Sessions in Warning, Critical, or Compacted context state (>=30% AGY)"
          >
            CTX &ge;30% ({counts.warning + counts.critical})
          </button>
        </div>
      </div>

      <div className="fleet-session-list">
        {filteredItems.length === 0 ? (
          <div className="fleet-empty-state">
            {statusFilter === 'thinking'
              ? 'No agents currently thinking'
              : statusFilter === 'new'
                ? 'No unread agent replies'
                : 'No matching sessions'}
          </div>
        ) : (
          filteredItems.map((item) => {
            const isActive = item.session_name === activeSession;
            const isUnread = unreadSessions.includes(item.session_name) && item.status !== 'THINKING';
            const compactionCount = Number(item.compaction_count || 0);
            const isCompacted = compactionCount > 0;
            const isRawTmux = isRawTmuxItem(item);
            const vesselCode = VESSEL_LABELS[item.vessel] || 'TMUX';
            const rawPct = Math.min(100, Math.max(0, Number(item.context_pct || 0)));
            const barWidth = isCompacted ? Math.max(6, rawPct) : Math.max(4, rawPct);
            const effectiveTier = isCompacted ? 'critical' : item.tier || 'normal';
            const agentColor = getAgentColor(item.session_name);
            const wikiKey = `${item.session_name}:wiki`;
            const handoffKey = `${item.session_name}:handoff`;
            const histCnt = Number(historyCounts[item.session_name] || 0);
            const taskChip = deriveTaskChip(item, isRawTmux, effectiveTier, isCompacted, histCnt);
            const branchDisplay =
              item.branch ||
              (isRawTmux
                ? `${item.window_count || 1} windows · ${item.pane_count || 1}p`
                : 'workspace');

            return (
              <div
                key={item.session_name}
                className={`fleet-session-card spotlight-card ${isActive ? 'active' : ''} tier-${effectiveTier}`}
                style={{ '--agent-color': agentColor.hex, '--agent-rgb': agentColor.rgb }}
                onPointerMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
                  e.currentTarget.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
                }}
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
                    <span
                      className="fleet-session-name fleet-agent-name-pill"
                      style={{ '--agent-color': agentColor.hex, '--agent-rgb': agentColor.rgb }}
                      title={`${item.session_name} · Node color: ${agentColor.name} (${agentColor.hex})`}
                    >
                      {item.session_name}
                    </span>
                    {isUnread && (
                      <span className="fleet-unread-badge" title="Completed turn while in background">
                        NEW
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {item.has_browser_lease && (
                      <span
                        className="fleet-vessel-badge"
                        style={{
                          color: 'var(--accent)',
                          borderColor: 'rgba(var(--accent-rgb), 0.45)',
                          background: 'rgba(var(--accent-rgb), 0.1)',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                        title="Leased Co-Pilot Browser Tab Open"
                      >
                        <Icon name="globe" size={11} />
                      </span>
                    )}
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
                      <Icon name="trash" size={12} />
                    </button>
                  </div>
                </div>

                <div className="card-branch-row">
                  <span
                    className={`fleet-branch-badge ${item.is_worktree ? 'worktree' : ''}`}
                    style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={item.path || branchDisplay}
                  >
                    <Icon name="gitBranch" size={11} /> {branchDisplay}
                    {item.pane_count > 1 && !isRawTmux ? ` · ${item.pane_count}p` : ''}
                  </span>
                  <span className={`task-mode-chip ${taskChip.kind}`}>{taskChip.label}</span>
                </div>

                {isRawTmux ? (
                  <div className="fleet-context-section">
                    <div className="fleet-context-header">
                      <span className="fleet-context-label" style={{ color: '#34d399' }}>
                        DAEMON ONLINE
                      </span>
                      <span className="fleet-context-pct">
                        {`${item.pane_count || 1} ${(item.pane_count || 1) === 1 ? 'PANE' : 'PANES'}`}
                      </span>
                    </div>
                    <div className="fleet-context-track">
                      <div
                        className="fleet-context-fill tier-normal"
                        style={{ width: '100%', opacity: 0.55 }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="fleet-context-section">
                    <div className="fleet-context-header">
                      <span
                        className={`fleet-context-label tier-${effectiveTier}`}
                        title={
                          isCompacted
                            ? `Auto-compacted ${compactionCount}x by AGY (512k cliff) — stays RED until /handoff to a fresh session`
                            : item.vessel === 'agy' && effectiveTier === 'critical'
                              ? 'Approaching 512k (51.2%) Point of No Return — backend auto-compaction imminent'
                              : item.vessel === 'agy' && effectiveTier === 'warning'
                                ? 'Crossed 30% (300k) Save / Handoff checkpoint — safe headroom before 512k cliff'
                                : undefined
                        }
                      >
                        {isCompacted
                          ? `COMPACTED ${compactionCount}X`
                          : effectiveTier === 'critical'
                            ? item.vessel === 'agy'
                              ? '512K CLIFF ALERT'
                              : '30% RULE'
                            : effectiveTier === 'warning'
                              ? item.vessel === 'agy'
                                ? 'SAVE / HANDOFF'
                                : 'WIKI SOON'
                              : 'CONTEXT'}
                      </span>
                      <span className={`fleet-context-pct tier-${effectiveTier}`}>
                        {`${Number(item.context_pct || 0).toFixed(1)}% · ${formatTokens(item.tokens_used)}/${formatTokens(item.tokens_limit)}`}
                      </span>
                    </div>
                    <div
                      className={`fleet-context-track ${isCompacted ? 'is-compacted' : ''}`}
                      title={
                        isCompacted
                          ? `Session auto-compacted ${compactionCount}x — run /wiki & /handoff before multi-generation drift`
                          : item.vessel === 'agy'
                            ? 'AGY Context Meter (Amber >= 30% Save/Handoff · Red >= 45% · 51.2% / 512k Point of No Return)'
                            : 'J.O.S.H.U.A. 30%-Rule Context Saturation Meter (Red >= 30%)'
                      }
                    >
                      <div
                        className={`fleet-context-fill tier-${effectiveTier}`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <div
                        className={`fleet-context-30-marker ${item.vessel === 'agy' ? 'agy-warn-marker' : ''}`}
                        style={{ left: '30%' }}
                        title="30% Save / Handoff Warning"
                      />
                      {item.vessel === 'agy' && (
                        <div
                          className="fleet-context-512-marker"
                          style={{ left: '51.2%' }}
                          title="51.2% Point of No Return (512k — hard backend auto-compaction cliff)"
                        />
                      )}
                    </div>
                  </div>
                )}

                {item.preview && (
                  <div className="fleet-card-preview" title={item.preview}>
                    {item.preview}
                  </div>
                )}

                {!isRawTmux && (isActive || effectiveTier === 'warning' || effectiveTier === 'critical') && (
                  <div className="fleet-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="fleet-action-btn wiki"
                      onClick={(e) => handleTriggerSkill(e, item.session_name, '/aim-memory-wiki', 'wiki')}
                      title="Inject /aim-memory-wiki into session"
                    >
                      {commandFeedback[wikiKey] || '/wiki'}
                    </button>
                    <button
                      type="button"
                      className={`fleet-action-btn handoff ${effectiveTier === 'critical' ? 'critical-pulse' : ''}`}
                      onClick={(e) => handleTriggerSkill(e, item.session_name, '/aim-handoff', 'handoff')}
                      title="Inject /aim-handoff into session (Baton Pass)"
                    >
                      {commandFeedback[handoffKey] || '/handoff'}
                    </button>
                  </div>
                )}

                {isRawTmux && item.vessel === 'shell' && isActive && onFastResumeSession && (
                  <div className="fleet-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="fleet-action-btn wiki"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFastResumeSession(item.session_name);
                      }}
                      title="Resume the most recent AI agent conversation in this session's directory"
                    >
                      ▶ RESUME
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showSidebarResurrectBar && (onSaveWorkspaceState || onRestoreWorkspaceState) && (
        <div
          style={{
            padding: '7px 10px',
            borderTop: '1px solid var(--border-hairline)',
            display: 'flex',
            gap: '6px',
            flexShrink: 0,
          }}
        >
          {onSaveWorkspaceState && (
            <button
              type="button"
              className="ghost-btn"
              style={{ flex: 1, justifyContent: 'center', height: '26px', fontSize: '10.5px' }}
              onClick={onSaveWorkspaceState}
              disabled={resurrectGate.disabled}
              title={
                resurrectGate.disabled
                  ? resurrectGate.title
                  : 'Snapshot all tmux sessions and pin each agent pane to its exact conversation (Protected by Empty-Save Guardrail)'
              }
            >
              <Icon name="upload" size={11} />
              <span>SAVE STATE</span>
            </button>
          )}
          {onRestoreWorkspaceState && (
            <button
              type="button"
              className="ghost-btn"
              style={{ flex: 1, justifyContent: 'center', height: '26px', fontSize: '10.5px' }}
              onClick={onRestoreWorkspaceState}
              disabled={resurrectGate.disabled}
              title={
                resurrectGate.disabled
                  ? resurrectGate.title
                  : 'Restore saved tmux sessions and resume every agent pane in its exact saved conversation'
              }
            >
              <Icon name="refresh" size={11} />
              <span>RESTORE</span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
