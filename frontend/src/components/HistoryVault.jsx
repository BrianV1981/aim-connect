import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAgentColor } from '../agentColors';
import { copyTextToClipboard } from '../scrollbackSelection';
import Icon from './Icons';
import MarkdownBody from './MarkdownBody';

export default function HistoryVault({
  activeSession = '',
  fleet = [],
  operatorStyle = 'cyan',
  operatorSide = 'right',
  onOpenFileLink,
  onInjectToAgent,
  onClose,
  onHistoryCountsChange,
}) {
  const [records, setRecords] = useState([]);
  const [countsByProject, setCountsByProject] = useState({});
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState('project'); // project | all
  const [selectedProject, setSelectedProject] = useState(activeSession || 'aim-connect');
  const [vesselFilter, setVesselFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState({});
  const [turnsById, setTurnsById] = useState({});
  const [loadingTurnsId, setLoadingTurnsId] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [exportedId, setExportedId] = useState('');

  useEffect(() => {
    if (activeSession) {
      const fleetItem = fleet.find((f) => f.session_name === activeSession);
      const isRaw =
        fleetItem &&
        (fleetItem.vessel === 'service' ||
          (fleetItem.vessel === 'shell' && !fleetItem.tokens_used));
      if (!isRaw) {
        setSelectedProject(activeSession);
      }
    }
  }, [activeSession, fleet]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sessions/history');
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setCountsByProject(data.counts_by_project || {});
        onHistoryCountsChange?.(data.counts_by_project || {});
      }
    } catch (err) {
      console.error('Failed to load session history', err);
    } finally {
      setLoading(false);
    }
  }, [onHistoryCountsChange]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const activeFleetItem = fleet.find((f) => f.session_name === activeSession);
  const isRawTmux =
    activeFleetItem &&
    (activeFleetItem.vessel === 'service' ||
      (activeFleetItem.vessel === 'shell' && !activeFleetItem.tokens_used));

  const targetProject = useMemo(() => {
    if (selectedProject && countsByProject[selectedProject]) return selectedProject;
    if (activeSession && countsByProject[activeSession]) return activeSession;
    const keys = Object.keys(countsByProject).sort((a, b) => a.localeCompare(b));
    return keys[0] || activeSession || 'aim-connect';
  }, [selectedProject, activeSession, countsByProject]);

  const projectEntries = useMemo(
    () => records.filter((r) => r.session === targetProject),
    [records, targetProject]
  );

  const filteredEntries = useMemo(() => {
    const base = scope === 'project' ? projectEntries : records;
    const q = searchQuery.trim().toLowerCase();
    return base.filter((h) => {
      if (vesselFilter !== 'ALL' && h.vessel !== vesselFilter) return false;
      if (
        q &&
        !`${h.session} ${h.gen || ''} ${h.id} ${h.title} ${h.vessel}`.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [scope, projectEntries, records, vesselFilter, searchQuery]);

  const projectPills = useMemo(() => {
    return Object.entries(countsByProject)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, cnt]) => ({
        name,
        cnt,
        color: getAgentColor(name),
      }));
  }, [countsByProject]);

  const loadTurnsForRecord = async (recordId) => {
    if (turnsById[recordId]) return turnsById[recordId];
    setLoadingTurnsId(recordId);
    try {
      const res = await fetch(`/api/sessions/history/${encodeURIComponent(recordId)}/turns`);
      if (res.ok) {
        const data = await res.json();
        const turns = data.turns || [];
        setTurnsById((prev) => ({ ...prev, [recordId]: turns }));
        return turns;
      }
    } catch (err) {
      console.error('Failed to fetch turns', err);
    } finally {
      setLoadingTurnsId('');
    }
    return [];
  };

  const toggleExpand = async (recordId) => {
    const isCurrentlyOpen = Boolean(expandedIds[recordId]);
    if (isCurrentlyOpen) {
      setExpandedIds((prev) => ({ ...prev, [recordId]: false }));
      return;
    }
    setExpandedIds((prev) => ({ ...prev, [recordId]: true }));
    await loadTurnsForRecord(recordId);
  };

  const buildRefString = (h) =>
    `[${h.session} · ${h.gen} · ${h.vessel}] session_id=${h.id} transcript=${h.log_path} — "${h.title}"`;

  const handleCopyRef = async (h) => {
    const ok = await copyTextToClipboard(buildRefString(h));
    if (ok) {
      setCopiedId(h.id);
      setTimeout(() => setCopiedId(''), 1800);
    }
  };

  const handleSendToAgent = (h) => {
    const refText = `Reference prior session ${h.gen} (${h.vessel}, ID ${h.id}) at ${h.log_path}: `;
    onInjectToAgent?.(refText);
  };

  const handleExportFlightRecord = async (h) => {
    const turns = (await loadTurnsForRecord(h.id)) || [];
    const lines = [
      `# Flight Record — ${h.session} (${h.gen})`,
      ``,
      `- **Title:** ${h.title}`,
      `- **Session ID:** \`${h.id}\``,
      `- **Harness / Vessel:** ${h.vessel}`,
      `- **Status / Seal:** ${h.seal}`,
      `- **Context:** ${h.tokens}`,
      `- **Transcript Source:** \`${h.log_path}\``,
      ``,
      `---`,
      ``,
    ];
    turns.forEach((t) => {
      lines.push(`## Turn #${String(t.idx).padStart(2, '0')} (${t.stamp})`);
      lines.push(`**Operator:**`);
      lines.push(t.operator || '');
      lines.push('');
      if (t.tool) {
        lines.push(`**Tools:** \`${t.tool}\``);
        lines.push('');
      }
      lines.push(`**J.O.S.H.U.A. (${h.vessel}):**`);
      lines.push(t.agent || '');
      lines.push('');
      lines.push('---');
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeSlug = (h.session || 'session').replace(/[^a-zA-Z0-9_-]/g, '-');
    a.download = `${safeSlug}-${(h.gen || 'gen').toLowerCase().replace(/[^a-z0-9]/g, '')}-${String(h.id).slice(0, 8)}-flight-record.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportedId(h.id);
    setTimeout(() => setExportedId(''), 2000);
  };

  return (
    <div className="history-vault">
      <div className="history-vault-header">
        <div>
          <div className="history-vault-kicker">
            PROJECT SESSION NOTEBOOK &amp; BATON-PASS REINCARNATIONS
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {isRawTmux
              ? `Note: ${activeSession} is a raw non-agent tmux server session — showing ${targetProject} notebook below.`
              : 'Switch models/harnesses at ~30% context with zero amnesia — click TURNS (N) on any generation to inspect recorded exchanges.'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`subbar-util-btn ${scope === 'project' ? 'active' : ''}`}
            onClick={() => setScope('project')}
          >
            {targetProject.toUpperCase()} ({projectEntries.length} SESSIONS)
          </button>
          <button
            type="button"
            className={`subbar-util-btn ${scope === 'all' ? 'active' : ''}`}
            onClick={() => setScope('all')}
          >
            ALL FLEET ({records.length} SESSIONS)
          </button>
          <button type="button" className="ghost-btn" style={{ height: '26px', padding: '0 8px' }} onClick={onClose} title="Close History Vault">
            <Icon name="close" />
          </button>
        </div>
      </div>

      {projectPills.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            BY PROJECT:
          </span>
          {projectPills.map((p) => {
            const isSel = scope === 'project' && targetProject === p.name;
            return (
              <button
                key={p.name}
                type="button"
                className={`fleet-filter-pill ${isSel ? 'active' : ''}`}
                style={isSel ? { borderColor: p.color.hex, color: p.color.hex } : undefined}
                onClick={() => {
                  setScope('project');
                  setSelectedProject(p.name);
                }}
              >
                {p.name} ({p.cnt})
              </button>
            );
          })}
        </div>
      )}

      {scope === 'project' && projectEntries.length > 1 && (
        <div className="baton-chain-bar">
          <span style={{ color: 'var(--accent)', fontWeight: 700, whiteSpace: 'nowrap' }}>BATON RELAY:</span>
          {[...projectEntries].reverse().map((h, idx) => (
            <span key={h.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {idx > 0 && <span style={{ color: 'var(--text-muted)' }}>-&gt;</span>}
              <button
                type="button"
                className={`baton-node ${h.is_current ? 'current' : ''}`}
                onClick={() => toggleExpand(h.id)}
                title={h.title}
              >
                <span>{h.gen}</span>
                <strong>{h.vessel}</strong>
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="ld-text-input"
          style={{ flex: 1, minWidth: '200px', height: '30px' }}
          placeholder={`Search ${scope === 'project' ? projectEntries.length : records.length} session titles, UUIDs, issues, or harnesses...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '4px' }}>
          {['ALL', 'AGY', 'GROK', 'OC', 'CDX'].map((v) => (
            <button
              key={v}
              type="button"
              className={`fleet-filter-pill ${vesselFilter === v ? 'active' : ''}`}
              onClick={() => setVesselFilter(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="fleet-empty-state">Loading multi-generation session history...</div>
      ) : filteredEntries.length === 0 ? (
        <div className="fleet-empty-state">No matching session history records found.</div>
      ) : (
        filteredEntries.map((h, idx) => {
          const sColor = getAgentColor(h.session);
          const isExpanded = Boolean(expandedIds[h.id]);
          const loadedTurns = turnsById[h.id] || [];
          const isCopied = copiedId === h.id;
          const isExported = exportedId === h.id;
          const basename = (h.log_path || '').split('/').slice(-1)[0] || 'transcript.jsonl';

          return (
            <div key={h.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {idx > 0 && <div className="reincarnation-divider">BATON PASSED FROM PREVIOUS GENERATION</div>}
              <div className={`history-card ${h.is_current ? 'is-current' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                    <span className="mono-kbd" style={{ color: 'var(--accent)', borderColor: 'rgba(var(--accent-rgb), 0.4)', fontWeight: 700 }}>
                      {h.gen}
                    </span>
                    <span
                      className="project-pill"
                      style={{ '--agent-color': sColor.hex, '--agent-rgb': sColor.rgb }}
                    >
                      <span className="project-pill-dot" />
                      {h.session}
                    </span>
                    <span className="mono-kbd">{h.vessel}</span>
                    <span className="mono-kbd">{h.seal}</span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10.5px',
                        color: h.is_current ? 'var(--accent)' : 'var(--text-muted)',
                        fontWeight: 700,
                      }}
                    >
                      {h.when}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`subbar-util-btn ${isCopied ? 'active' : ''}`}
                      onClick={() => handleCopyRef(h)}
                      title="Copy Session Name + Gen + UUID + Transcript Path"
                    >
                      <Icon name={isCopied ? 'check' : 'copyText'} size={13} />
                      <span>{isCopied ? 'COPIED REF!' : 'COPY ID & REF'}</span>
                    </button>
                    <button
                      type="button"
                      className="subbar-util-btn"
                      onClick={() => handleSendToAgent(h)}
                      title="Inject Session UUID & Transcript Path into active agent terminal"
                    >
                      <Icon name="send" size={13} />
                      <span>SEND TO AGENT</span>
                    </button>
                    <button
                      type="button"
                      className={`subbar-util-btn ${isExported ? 'active' : ''}`}
                      onClick={() => handleExportFlightRecord(h)}
                      title="Download complete Flight Recorder Markdown (.md)"
                    >
                      <Icon name="download" size={13} />
                      <span>{isExported ? 'SAVED .MD!' : 'FLIGHT RECORD'}</span>
                    </button>
                    <button
                      type="button"
                      className={`subbar-util-btn ${isExpanded ? 'active' : ''}`}
                      onClick={() => toggleExpand(h.id)}
                    >
                      <span>{isExpanded ? `HIDE TURNS (${h.turns})` : `TURNS (${h.turns})`}</span>
                    </button>
                  </div>
                </div>

                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{h.title}</div>

                <div className="history-meta-bar">
                  <span>
                    SESSION ID: <strong style={{ color: 'var(--text-primary)', userSelect: 'all' }}>{h.id}</strong>
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {h.turns} turns · {h.tokens} · {basename}
                  </span>
                </div>

                {isExpanded && (
                  <div className="history-turns-shell">
                    <div className="history-turns-bar">
                      <span>
                        {loadingTurnsId === h.id
                          ? 'LOADING RECORDED TURNS...'
                          : `SHOWING ALL ${loadedTurns.length} RECORDED TURNS`}
                      </span>
                      {loadedTurns.length > 1 && (
                        <button
                          type="button"
                          className="subbar-util-btn"
                          style={{ height: '22px', fontSize: '10px' }}
                          onClick={() => {
                            const vp = document.getElementById(`hist-vp-${h.id}`);
                            if (vp) vp.scrollTop = vp.scrollHeight;
                          }}
                        >
                          JUMP TO TURN #{loadedTurns.length} ↓
                        </button>
                      )}
                    </div>
                    <div className="history-turns-viewport" id={`hist-vp-${h.id}`}>
                      {loadedTurns.map((t) => (
                        <div
                          key={t.idx}
                          className={`history-turn-pair op-style-${operatorStyle} op-side-${operatorSide}`}
                        >
                          <div className="history-turn-head">
                            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                              TURN #{String(t.idx).padStart(2, '0')} / {String(loadedTurns.length).padStart(2, '0')}
                            </span>
                            <span>
                              {t.stamp} · {h.vessel}
                            </span>
                          </div>
                          <div className="history-turn-op">
                            <div className="history-op-header">
                              <span className="op-dot-ind" />
                              <span>[OPERATOR]</span>
                            </div>
                            <div style={{ marginTop: '3px', whiteSpace: 'pre-wrap' }}>{t.operator}</div>
                          </div>
                          <div className="history-turn-ag">
                            {t.tool && <div className="history-turn-tool">&gt;_ {t.tool}</div>}
                            <div>
                              <strong style={{ color: 'var(--accent)', fontSize: '9.5px', letterSpacing: '0.08em' }}>
                                [J.O.S.H.U.A.]
                              </strong>
                              <div style={{ marginTop: '4px' }}>
                                <MarkdownBody
                                  content={t.agent}
                                  fontSize={13}
                                  onOpenFileLink={onOpenFileLink}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
