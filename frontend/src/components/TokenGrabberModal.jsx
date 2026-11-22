import { useEffect, useMemo, useState } from 'react';
import Icon from './Icons';

export default function TokenGrabberModal({ isOpen, onClose, activeSession }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all | url | path | ip | sha
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  const fetchTokens = async () => {
    if (!activeSession) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/scrollback/${encodeURIComponent(activeSession)}?lines=2000`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setTokens([]);
      } else {
        setTokens(Array.isArray(data.tokens) ? data.tokens : []);
      }
    } catch {
      setError('Failed to fetch scrollback tokens');
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeSession) {
      fetchTokens();
    }
  }, [isOpen, activeSession]);

  const counts = useMemo(() => {
    const c = { all: tokens.length, url: 0, path: 0, ip: 0, sha: 0 };
    tokens.forEach((t) => {
      if (c[t.type] !== undefined) c[t.type] += 1;
    });
    return c;
  }, [tokens]);

  const filteredTokens = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tokens.filter((t) => {
      if (activeTab !== 'all' && t.type !== activeTab) return false;
      if (!q) return true;
      return (
        (t.display_value || '').toLowerCase().includes(q) ||
        (t.type || '').toLowerCase().includes(q)
      );
    });
  }, [tokens, activeTab, searchQuery]);

  const handleCopy = async (item, idx) => {
    try {
      await navigator.clipboard.writeText(item.value);
      const key = `${item.type}:${idx}`;
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1800);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-veil" onClick={onClose}>
      <div
        className="ld-modal-card wide"
        style={{ width: 'min(680px, 95%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header-bar">
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--accent)', display: 'flex' }}>
                <Icon name="link" size={15} />
              </span>
              <span>SCROLLBACK TOKEN &amp; URL GRABBER</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.14em', color: 'var(--accent)', marginTop: '3px' }}>
              LAST 2,000 LINES OF {(activeSession || 'NONE').toUpperCase()} // AUTO-MASKS QUERY SECRETS IN PREVIEW
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="subbar-util-btn"
              onClick={fetchTokens}
              disabled={loading || !activeSession}
              title="Re-scan terminal scrollback"
            >
              <Icon name="refresh" size={12} />
              <span>REFRESH</span>
            </button>
            <button type="button" className="ghost-btn" style={{ padding: '0 6px' }} onClick={onClose}>
              <Icon name="close" size={14} />
            </button>
          </div>
        </div>

        <div className="modal-tabs-rail">
          {[
            ['all', `ALL (${counts.all})`],
            ['url', `URLS (${counts.url})`],
            ['path', `PATHS (${counts.path})`],
            ['ip', `IPS/PORTS (${counts.ip})`],
            ['sha', `GIT SHAS (${counts.sha})`],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`modal-tab-btn ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="modal-body-scroll">
          <input
            type="text"
            className="ld-text-input"
            placeholder="Filter extracted URLs, file paths, IPs, or Git SHAs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {!activeSession ? (
              <div className="fleet-empty-state">Select an active tmux session first.</div>
            ) : loading ? (
              <div className="fleet-empty-state">Scanning terminal scrollback...</div>
            ) : error ? (
              <div className="fleet-empty-state" style={{ color: '#f87171' }}>{error}</div>
            ) : filteredTokens.length === 0 ? (
              <div className="fleet-empty-state">No matching tokens found in scrollback.</div>
            ) : (
              filteredTokens.map((item, idx) => {
                const key = `${item.type}:${idx}`;
                const isCopied = copiedKey === key;

                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '9px 11px',
                      borderRadius: '9px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-hairline)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <span className="mono-kbd">{(item.type || 'TOK').toUpperCase()}</span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={item.display_value}
                      >
                        {item.display_value}
                      </span>
                      {item.redacted && (
                        <span
                          className="card-new-badge"
                          title="Query secret masked in preview; Copy copies full URL"
                        >
                          MASKED
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {item.type === 'url' && (
                        <a
                          href={item.value}
                          target="_blank"
                          rel="noreferrer"
                          className="subbar-util-btn"
                          style={{ textDecoration: 'none' }}
                          title="Open URL in new tab"
                        >
                          <span>OPEN</span>
                          <Icon name="externalLink" size={11} />
                        </a>
                      )}
                      <button
                        type="button"
                        className={`subbar-util-btn ${isCopied ? 'active' : ''}`}
                        onClick={() => handleCopy(item, idx)}
                      >
                        <Icon name={isCopied ? 'check' : 'copyText'} size={12} />
                        <span>{isCopied ? 'COPIED' : 'COPY'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
