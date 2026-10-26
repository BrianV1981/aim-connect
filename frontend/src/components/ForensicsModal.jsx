import { useEffect, useState } from 'react';

export default function ForensicsModal({
  isOpen,
  onClose,
  activeSession,
  sessions = [],
  onSendSessionCommand,
}) {
  const [activeTab, setActiveTab] = useState('turns'); // turns | search | swarm
  const [turnsData, setTurnsData] = useState({ turns: [], source: '', tool_call_count: 0 });
  const [loadingTurns, setLoadingTurns] = useState(false);
  const [expandedTools, setExpandedTools] = useState({});

  // Search state (FTS5 vs Brain Wiki)
  const [searchMode, setSearchMode] = useState('fts5'); // fts5 | brain
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Swarm state
  const [dispatches, setDispatches] = useState([]);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [dispatchTarget, setDispatchTarget] = useState('');
  const [dispatchMessage, setDispatchMessage] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState('');

  const fetchSessionForensics = async () => {
    if (!activeSession) return;
    setLoadingTurns(true);
    try {
      const res = await fetch(`/api/forensics/${encodeURIComponent(activeSession)}`);
      const data = await res.json();
      if (data && Array.isArray(data.turns)) {
        setTurnsData(data);
      }
    } catch (e) {
      console.error('Failed to fetch session forensics', e);
    } finally {
      setLoadingTurns(false);
    }
  };

  const fetchSwarmActivity = async () => {
    try {
      const res = await fetch('/api/swarm/activity');
      const data = await res.json();
      if (data && Array.isArray(data.dispatches)) {
        setDispatches(data.dispatches);
      }
    } catch (e) {
      console.error('Failed to fetch swarm activity', e);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'turns' && activeSession) {
      fetchSessionForensics();
    } else if (activeTab === 'swarm') {
      fetchSwarmActivity();
    }
  }, [isOpen, activeTab, activeSession]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const url =
        searchMode === 'fts5'
          ? `/api/forensics/search?q=${encodeURIComponent(q)}`
          : `/api/brain/search?session=${encodeURIComponent(activeSession || '')}&q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const data = await res.json();
      setSearchResults(Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      console.error('Forensic search failed', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const toggleToolExpand = (key) => {
    setExpandedTools((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAllTools = (expand) => {
    const next = {};
    (turnsData.turns || []).forEach((turn, tIdx) => {
      (turn.tool_calls || []).forEach((tc, tcIdx) => {
        next[`${tIdx}:${tc.id || tcIdx}`] = expand;
      });
    });
    setExpandedTools(next);
  };

  const handleSendSwarmDispatch = async (e) => {
    e.preventDefault();
    const target = dispatchTarget || activeSession;
    const body = dispatchMessage.trim();
    if (!target || !body || !onSendSessionCommand) return;

    const sender = activeSession || 'aim-connect';
    const formatted = `To: ${target} | From: ${sender} | REPLY_TO: ${sender} — ${body}`;
    setDispatchStatus('Sending...');
    try {
      await onSendSessionCommand(target, formatted);
      setDispatchStatus('✓ Delivered via 2-Step Tmux Buffer');
      setDispatchMessage('');
      setTimeout(() => setDispatchStatus(''), 2500);
    } catch (err) {
      setDispatchStatus('✗ Delivery failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card forensics-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px', width: '95%', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <h3 style={{ color: '#e2e8f0', fontSize: '16px', margin: 0 }}>
              🔬 Forensic Tool Inspector, FTS5 Search &amp; Swarm Feed
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px', fontFamily: 'Fira Code, monospace' }}>
              Active Session: {activeSession || 'None'} • On-Demand Lazy Inspector (Zero Background Overhead)
            </p>
          </div>
          <button className="macro-btn" onClick={onClose} style={{ color: '#f87171' }}>
            ✖
          </button>
        </div>

        <div className="token-grabber-tabs" style={{ borderBottom: '1px solid #1c305c', paddingBottom: '8px' }}>
          <button
            type="button"
            className={`fleet-filter-pill ${activeTab === 'turns' ? 'active' : ''}`}
            style={{ padding: '5px 12px', fontSize: '12px' }}
            onClick={() => setActiveTab('turns')}
          >
            🛠️ Turn &amp; Tool Inspector ({turnsData.tool_call_count || 0})
          </button>
          <button
            type="button"
            className={`fleet-filter-pill ${activeTab === 'search' ? 'active' : ''}`}
            style={{ padding: '5px 12px', fontSize: '12px' }}
            onClick={() => setActiveTab('search')}
          >
            🔎 FTS5 &amp; Brain Search
          </button>
          <button
            type="button"
            className={`fleet-filter-pill ${activeTab === 'swarm' ? 'active' : ''}`}
            style={{ padding: '5px 12px', fontSize: '12px' }}
            onClick={() => setActiveTab('swarm')}
          >
            📡 Swarm (aim-communicate)
          </button>
        </div>

        {/* TAB 1: Lazy-Loaded Turn & Tool-Call Inspector */}
        {activeTab === 'turns' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'Fira Code, monospace', fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Source: {turnsData.source || 'None'}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="macro-btn" style={{ padding: '3px 8px', fontSize: '11px' }} onClick={() => expandAllTools(true)}>
                  ➕ Expand All Tools
                </button>
                <button className="macro-btn" style={{ padding: '3px 8px', fontSize: '11px' }} onClick={() => expandAllTools(false)}>
                  ➖ Collapse All
                </button>
                <button className="macro-btn action" style={{ padding: '3px 8px', fontSize: '11px' }} onClick={fetchSessionForensics}>
                  🔄 Refresh
                </button>
              </div>
            </div>

            <div className="forensics-turn-list">
              {!activeSession ? (
                <div className="fleet-empty-state">Select a tmux session first to inspect its turns and tool calls.</div>
              ) : loadingTurns ? (
                <div className="fleet-empty-state">Parsing session transcript on demand...</div>
              ) : (turnsData.turns || []).length === 0 ? (
                <div className="fleet-empty-state">No structured turns or collapsed tool calls found for this session.</div>
              ) : (
                turnsData.turns.map((turn, tIdx) => (
                  <div key={tIdx} className={`forensic-turn-card role-${turn.role}`}>
                    <div className="forensic-turn-header">
                      <span className="fleet-vessel-badge">
                        {turn.role === 'user' ? '👤 OPERATOR / DISPATCH' : '🤖 AGENT TURN'} #{turn.step_index ?? tIdx + 1}
                      </span>
                      {turn.created_at && (
                        <span style={{ fontFamily: 'Fira Code, monospace', fontSize: '10px', color: '#64748b' }}>
                          {turn.created_at}
                        </span>
                      )}
                    </div>

                    {turn.content && (
                      <pre className="forensic-turn-content">{turn.content}</pre>
                    )}

                    {(turn.tool_calls || []).length > 0 && (
                      <div className="forensic-tool-list">
                        {turn.tool_calls.map((tc, tcIdx) => {
                          const key = `${tIdx}:${tc.id || tcIdx}`;
                          const isExpanded = !!expandedTools[key];
                          return (
                            <div key={key} className="forensic-tool-block">
                              <div
                                className="forensic-tool-summary"
                                onClick={() => toggleToolExpand(key)}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                                    {isExpanded ? '▼' : '▶'} ● {tc.name}
                                  </span>
                                  <span className="forensic-tool-args" title={tc.args}>
                                    ({tc.args})
                                  </span>
                                </div>
                                <span className="fleet-count-pill">{tc.status || 'DONE'}</span>
                              </div>
                              {isExpanded && (
                                <div className="forensic-tool-details">
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>Tool Arguments &amp; Output:</span>
                                    <button
                                      type="button"
                                      className="macro-btn"
                                      style={{ padding: '2px 6px', fontSize: '10px' }}
                                      onClick={() => navigator.clipboard.writeText(`${tc.name}(${tc.args})\n\n${tc.output || ''}`)}
                                    >
                                      📋 Copy
                                    </button>
                                  </div>
                                  <pre className="forensic-tool-output">
                                    {tc.output || '(No stdout/stderr captured in transcript line)'}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SQLite WAL FTS5 & Deduplicated Brain Search */}
        {activeTab === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '10px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`fleet-filter-pill ${searchMode === 'fts5' ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => {
                  setSearchMode('fts5');
                  setSearchResults([]);
                }}
              >
                🗄️ Cross-Fleet SQLite FTS5 (Transcripts &amp; Vault)
              </button>
              <button
                type="button"
                className={`fleet-filter-pill ${searchMode === 'brain' ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => {
                  setSearchMode('brain');
                  setSearchResults([]);
                }}
              >
                🧠 Session Brain Search (Deduplicated memory-wiki/ + HANDOFF.md)
              </button>
            </div>

            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="modal-input"
                style={{ marginBottom: 0, flex: 1 }}
                placeholder={
                  searchMode === 'fts5'
                    ? 'Search across all agent transcripts & tool calls (SQLite FTS5)...'
                    : 'Search memory-wiki/, HANDOFF.md, and AGENTS.md (per-file deduplicated)...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="macro-btn action" disabled={searching}>
                {searching ? 'Searching...' : '🔎 Search'}
              </button>
            </form>

            <div className="forensics-turn-list">
              {searchResults.length === 0 ? (
                <div className="fleet-empty-state">
                  {searching ? 'Querying index...' : 'Enter a query above to search.'}
                </div>
              ) : (
                searchResults.map((hit, idx) => (
                  <div key={idx} className="forensic-turn-card">
                    <div className="forensic-turn-header">
                      <span className="fleet-vessel-badge">
                        {searchMode === 'fts5' ? `📜 ${hit.session_name || 'transcript'}` : `📄 ${hit.rel_path}`}
                      </span>
                      <span style={{ fontFamily: 'Fira Code, monospace', fontSize: '10px', color: '#94a3b8' }}>
                        {searchMode === 'fts5'
                          ? `${hit.role || ''}${hit.tool_names ? ` • Tools: ${hit.tool_names}` : ''}`
                          : `Score: ${hit.score} • ${hit.title}`}
                      </span>
                    </div>
                    <pre className="forensic-turn-content">{hit.snippet}</pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Live aim-communicate Swarm Feed & Dispatcher */}
        {activeTab === 'swarm' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '10px' }}>
            <form onSubmit={handleSendSwarmDispatch} className="swarm-composer-box">
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'Fira Code, monospace', fontSize: '11px', color: '#60a5fa' }}>
                  📡 Dispatch To:
                </span>
                <select
                  className="session-select"
                  value={dispatchTarget || activeSession}
                  onChange={(e) => setDispatchTarget(e.target.value)}
                >
                  <option value="">-- Target Session --</option>
                  {sessions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {dispatchStatus && (
                  <span style={{ fontFamily: 'Fira Code, monospace', fontSize: '11px', color: '#34d399' }}>
                    {dispatchStatus}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <input
                  type="text"
                  className="modal-input"
                  style={{ marginBottom: 0, flex: 1 }}
                  placeholder="Send verified aim-communicate message via 2-step tmux buffer..."
                  value={dispatchMessage}
                  onChange={(e) => setDispatchMessage(e.target.value)}
                />
                <button type="submit" className="macro-btn action">
                  📤 Send
                </button>
              </div>
            </form>

            <div className="forensics-turn-list">
              {dispatches.length === 0 ? (
                <div className="fleet-empty-state">No chalkboard dispatches found on disk.</div>
              ) : (
                dispatches.map((d) => {
                  const isOpenDispatch = selectedDispatch === d.id;
                  return (
                    <div
                      key={d.id}
                      className="forensic-turn-card"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedDispatch(isOpenDispatch ? null : d.id)}
                    >
                      <div className="forensic-turn-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span className="fleet-vessel-badge vessel-agy">From: {d.sender}</span>
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>→</span>
                          <span className="fleet-vessel-badge vessel-opencode">To: {d.recipient}</span>
                          <span className="fleet-branch-badge">REPLY_TO: {d.reply_to}</span>
                        </div>
                        <span style={{ fontFamily: 'Fira Code, monospace', fontSize: '10px', color: '#64748b' }}>
                          {d.filename}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#cbd5e1', fontFamily: 'Fira Code, monospace' }}>
                        {d.preview}
                      </div>
                      {isOpenDispatch && (
                        <pre className="forensic-tool-output" style={{ marginTop: '8px' }}>
                          {d.content}
                        </pre>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
