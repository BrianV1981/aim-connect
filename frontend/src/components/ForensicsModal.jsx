import { useEffect, useState } from 'react';
import Icon from './Icons';

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

  const [searchMode, setSearchMode] = useState('fts5'); // fts5 | brain
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

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
    if (!target || !body) return;

    const sender = activeSession || 'aim-connect';
    setDispatchStatus('SENDING...');
    try {
      const res = await fetch('/api/swarm/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_agent: sender,
          to: target,
          reply_to: sender,
          subject: 'Operator Swarm Dispatch',
          body,
        }),
      });
      if (!res.ok) {
        if (onSendSessionCommand) {
          await onSendSessionCommand(target, body);
        } else {
          throw new Error('Dispatch failed');
        }
      }
      setDispatchStatus('DELIVERED VIA A-MAIL ✓');
      setDispatchMessage('');
      fetchSwarmActivity();
      setTimeout(() => setDispatchStatus(''), 2500);
    } catch {
      setDispatchStatus('DELIVERY FAILED');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="ld-modal-card wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-bar">
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--accent)', display: 'flex' }}>
                <Icon name="microscope" size={15} />
              </span>
              <span>FORENSICS, SQLITE FTS5 &amp; SWARM MATRIX</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.14em', color: 'var(--accent)', marginTop: '3px' }}>
              ACTIVE NODE: {(activeSession || 'NONE').toUpperCase()} // ON-DEMAND TOOL TRACE &amp; INTER-AGENT COMMS
            </div>
          </div>
          <button type="button" className="ghost-btn" style={{ padding: '0 6px' }} onClick={onClose}>
            <Icon name="close" size={14} />
          </button>
        </div>

        <div className="modal-tabs-rail">
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === 'turns' ? 'active' : ''}`}
            onClick={() => setActiveTab('turns')}
          >
            1. TURN &amp; TOOL INSPECTOR ({turnsData.tool_call_count || 0})
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            2. SQLITE FTS5 &amp; BRAIN SEARCH
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === 'swarm' ? 'active' : ''}`}
            onClick={() => setActiveTab('swarm')}
          >
            3. SWARM (A-MAIL)
          </button>
        </div>

        <div className="modal-body-scroll">
          {activeTab === 'turns' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  SOURCE: {turnsData.source || 'NONE'}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" className="subbar-util-btn" onClick={() => expandAllTools(true)}>
                    EXPAND ALL
                  </button>
                  <button type="button" className="subbar-util-btn" onClick={() => expandAllTools(false)}>
                    COLLAPSE ALL
                  </button>
                  <button type="button" className="subbar-util-btn active" onClick={fetchSessionForensics}>
                    <Icon name="refresh" size={12} />
                    <span>REFRESH</span>
                  </button>
                </div>
              </div>

              {!activeSession ? (
                <div className="fleet-empty-state">Select a tmux session first to inspect its turns and tool calls.</div>
              ) : loadingTurns ? (
                <div className="fleet-empty-state">Parsing session transcript on demand...</div>
              ) : (turnsData.turns || []).length === 0 ? (
                <div className="fleet-empty-state">No structured turns or collapsed tool calls found for this session.</div>
              ) : (
                turnsData.turns.map((turn, tIdx) => (
                  <div key={tIdx} className="settings-group-card" style={{ gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span className="settings-group-title">
                        {turn.role === 'user' ? 'OPERATOR // DISPATCH' : 'J.O.S.H.U.A. // AGENT TURN'} #{turn.step_index ?? tIdx + 1}
                      </span>
                      {turn.created_at && (
                        <span className="mono-kbd">{turn.created_at}</span>
                      )}
                    </div>

                    {turn.content && (
                      <pre
                        style={{
                          margin: 0,
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                          color: 'var(--text-primary)',
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                          lineHeight: 1.55,
                        }}
                      >
                        {turn.content}
                      </pre>
                    )}

                    {(turn.tool_calls || []).length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {turn.tool_calls.map((tc, tcIdx) => {
                          const key = `${tIdx}:${tc.id || tcIdx}`;
                          const isExpanded = Boolean(expandedTools[key]);
                          return (
                            <div
                              key={key}
                              style={{
                                padding: '9px 11px',
                                borderRadius: '9px',
                                background: 'var(--bg-term)',
                                border: '1px solid var(--border-hairline)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '11px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                              }}
                            >
                              <div
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                onClick={() => toggleToolExpand(key)}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flex: 1 }}>
                                  <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>
                                    {isExpanded ? '▼' : '▶'} {tc.name}
                                  </span>
                                  <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    ({tc.args})
                                  </span>
                                </div>
                                <span className="mono-kbd">{tc.status || 'DONE'}</span>
                              </div>
                              {isExpanded && (
                                <div style={{ paddingTop: '6px', borderTop: '1px dashed var(--border-hairline)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ARGUMENTS &amp; OUTPUT</span>
                                    <button
                                      type="button"
                                      className="subbar-util-btn"
                                      style={{ height: '22px' }}
                                      onClick={() => navigator.clipboard.writeText(`${tc.name}(${tc.args})\n\n${tc.output || ''}`)}
                                    >
                                      <Icon name="copyText" size={11} />
                                      <span>COPY</span>
                                    </button>
                                  </div>
                                  <pre
                                    style={{
                                      margin: 0,
                                      maxHeight: '220px',
                                      overflowY: 'auto',
                                      whiteSpace: 'pre-wrap',
                                      overflowWrap: 'anywhere',
                                      color: 'var(--text-secondary)',
                                    }}
                                  >
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
            </>
          )}

          {activeTab === 'search' && (
            <>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`subbar-util-btn ${searchMode === 'fts5' ? 'active' : ''}`}
                  onClick={() => {
                    setSearchMode('fts5');
                    setSearchResults([]);
                  }}
                >
                  CROSS-FLEET SQLITE FTS5
                </button>
                <button
                  type="button"
                  className={`subbar-util-btn ${searchMode === 'brain' ? 'active' : ''}`}
                  onClick={() => {
                    setSearchMode('brain');
                    setSearchResults([]);
                  }}
                >
                  DEDUPED SESSION BRAIN
                </button>
              </div>

              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="ld-text-input"
                  style={{ flex: 1 }}
                  placeholder={
                    searchMode === 'fts5'
                      ? 'Query transcripts & tool outputs across fleet (SQLite FTS5)...'
                      : 'Query memory-wiki/, HANDOFF.md, and AGENTS.md (deduplicated)...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="neon-cta-btn" disabled={searching}>
                  <Icon name="search" size={13} />
                  <span>{searching ? 'QUERYING...' : 'SEARCH'}</span>
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {searchResults.length === 0 ? (
                  <div className="fleet-empty-state">
                    {searching ? 'Querying index...' : 'Enter a query above to search transcripts or session brain.'}
                  </div>
                ) : (
                  searchResults.map((hit, idx) => (
                    <div key={idx} className="settings-group-card" style={{ gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '10.5px' }}>
                        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                          {searchMode === 'fts5' ? hit.session_name || 'transcript' : hit.rel_path}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {searchMode === 'fts5'
                            ? `${hit.role || ''}${hit.tool_names ? ` · ${hit.tool_names}` : ''}`
                            : `SCORE ${hit.score} · ${hit.title}`}
                        </span>
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                          color: 'var(--text-primary)',
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {hit.snippet}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === 'swarm' && (
            <>
              <form onSubmit={handleSendSwarmDispatch} className="settings-group-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span className="settings-group-title">A-MAIL INTER-AGENT DISPATCHER (AMAIL)</span>
                  {dispatchStatus && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--accent)' }}>
                      {dispatchStatus}
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr auto', gap: '8px' }}>
                  <select
                    className="ld-select"
                    value={dispatchTarget || activeSession}
                    onChange={(e) => setDispatchTarget(e.target.value)}
                  >
                    <option value="">-- Target Node --</option>
                    {sessions.map((s) => (
                      <option key={s} value={s}>
                        -&gt; {s}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="ld-text-input"
                    placeholder="Transmit verified 1-hop A-Mail directive (Enter-only wake)..."
                    value={dispatchMessage}
                    onChange={(e) => setDispatchMessage(e.target.value)}
                  />
                  <button type="submit" className="neon-cta-btn" style={{ height: '34px' }}>
                    <Icon name="send" size={13} />
                    <span>DISPATCH</span>
                  </button>
                </div>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dispatches.length === 0 ? (
                  <div className="fleet-empty-state">No A-Mail envelopes found in mailbox.</div>
                ) : (
                  dispatches.map((d) => {
                    const isOpenDispatch = selectedDispatch === d.id;
                    return (
                      <div
                        key={d.id}
                        className="settings-group-card"
                        style={{ gap: '6px', cursor: 'pointer' }}
                        onClick={() => setSelectedDispatch(isOpenDispatch ? null : d.id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '10.5px' }}>
                          <span>
                            <strong style={{ color: 'var(--accent)' }}>{d.sender}</strong>
                            {' -> '}
                            <strong style={{ color: 'var(--accent-secondary)' }}>{d.recipient}</strong>
                            <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                              (REPLY_TO: {d.reply_to})
                            </span>
                          </span>
                          <span className="mono-kbd">{d.filename}</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-primary)' }}>
                          {d.preview}
                        </div>
                        {isOpenDispatch && (
                          <pre
                            style={{
                              margin: '4px 0 0',
                              padding: '10px',
                              borderRadius: '8px',
                              background: 'var(--bg-term)',
                              border: '1px solid var(--border-hairline)',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              color: 'var(--text-secondary)',
                              whiteSpace: 'pre-wrap',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {d.content}
                          </pre>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
