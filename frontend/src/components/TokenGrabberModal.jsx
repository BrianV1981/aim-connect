import { useEffect, useMemo, useState } from 'react';

const TYPE_META = {
  url: { icon: '🌐', label: 'URL' },
  path: { icon: '📄', label: 'Path' },
  ip: { icon: '🖧', label: 'IP/Port' },
  sha: { icon: '🔖', label: 'Git SHA' },
};

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
    } catch (err) {
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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card token-grabber-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '94%' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ color: '#e2e8f0', fontSize: '16px', margin: 0 }}>
              🔗 Scrollback Token &amp; URL Grabber
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px', fontFamily: 'Fira Code, monospace' }}>
              Session: {activeSession || 'None selected'} (last 2,000 lines)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="macro-btn" onClick={fetchTokens} disabled={loading || !activeSession}>
              🔄 Refresh
            </button>
            <button className="macro-btn" onClick={onClose} style={{ color: '#f87171' }}>
              ✖
            </button>
          </div>
        </div>

        <input
          type="text"
          className="modal-input"
          placeholder="Filter extracted URLs, file paths, IPs, or Git SHAs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />

        <div className="token-grabber-tabs">
          {[
            { id: 'all', label: `All (${counts.all})` },
            { id: 'url', label: `🌐 URLs (${counts.url})` },
            { id: 'path', label: `📄 Paths (${counts.path})` },
            { id: 'ip', label: `🖧 IPs (${counts.ip})` },
            { id: 'sha', label: `🔖 SHAs (${counts.sha})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`fleet-filter-pill ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="token-grabber-list">
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
              const meta = TYPE_META[item.type] || { icon: '🔹', label: item.type };
              const key = `${item.type}:${idx}`;
              const isCopied = copiedKey === key;

              return (
                <div key={key} className="token-grabber-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    <span className="fleet-vessel-badge" title={meta.label}>
                      {meta.icon} {meta.label}
                    </span>
                    <span className="token-grabber-value" title={item.display_value}>
                      {item.display_value}
                    </span>
                    {item.redacted && (
                      <span className="token-redacted-badge" title="Query secret masked in preview; Copy still copies full URL">
                        🔒 MASKED
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {item.type === 'url' && (
                      <a
                        href={item.value}
                        target="_blank"
                        rel="noreferrer"
                        className="macro-btn"
                        style={{ textDecoration: 'none', padding: '4px 8px', fontSize: '11px' }}
                        title="Open URL in new tab"
                      >
                        ↗ Open
                      </a>
                    )}
                    <button
                      type="button"
                      className="macro-btn action"
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                      onClick={() => handleCopy(item, idx)}
                    >
                      {isCopied ? '✓ Copied' : '📋 Copy'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
