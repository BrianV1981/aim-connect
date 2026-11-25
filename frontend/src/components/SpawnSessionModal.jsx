import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AGENT_LAUNCH_OPTIONS,
  buildSpawnSessionPayload,
  filterProjectRepos,
} from '../tmuxWorkspaceUtils';
import Icon from './Icons';

const VALID_NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const SAVED_AGENT_PREF_KEY = 'aim-spawn-agent-pref';

export default function SpawnSessionModal({
  isOpen,
  initialTab = 'custom',
  defaultTmuxSettings = null,
  onClose,
  onConfirm,
  onSelectExistingSession,
}) {
  const [tab, setTab] = useState(initialTab);
  const [name, setName] = useState('');
  const [cwd, setCwd] = useState('');
  const [agentChoice, setAgentChoice] = useState('agy');
  const [resumeFlag, setResumeFlag] = useState(true);
  const [skipPermsFlag, setSkipPermsFlag] = useState(false);
  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [repoQuery, setRepoQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const repoSearchRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const nextTab = initialTab === 'repo' ? 'repo' : 'custom';
    setTab(nextTab);
    setName('');
    setCwd('');
    setRepoQuery('');
    setError('');
    setBusy(false);

    if (defaultTmuxSettings) {
      setAgentChoice(defaultTmuxSettings.default_agent || 'agy');
      setResumeFlag(defaultTmuxSettings.auto_resume_c !== false);
      setSkipPermsFlag(Boolean(defaultTmuxSettings.skip_permissions));
    } else {
      try {
        setAgentChoice(localStorage.getItem(SAVED_AGENT_PREF_KEY) || 'agy');
      } catch {
        setAgentChoice('agy');
      }
    }

    setReposLoading(true);
    fetch('/api/projects/repos')
      .then((r) => (r.ok ? r.json() : { repos: [] }))
      .then((d) => {
        if (Array.isArray(d?.repos)) setRepos(d.repos);
      })
      .catch(() => {})
      .finally(() => setReposLoading(false));

    setTimeout(() => {
      if (nextTab === 'repo') {
        repoSearchRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    }, 30);
  }, [isOpen, initialTab, defaultTmuxSettings]);

  const filteredRepos = useMemo(
    () => filterProjectRepos(repos, repoQuery),
    [repos, repoQuery]
  );

  if (!isOpen) return null;

  const persistAgentChoice = (val) => {
    setAgentChoice(val);
    try {
      localStorage.setItem(SAVED_AGENT_PREF_KEY, val);
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!VALID_NAME_RE.test(trimmed)) {
      setError('Use letters, numbers, hyphens, or underscores (1–64 chars).');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = buildSpawnSessionPayload({
        name: trimmed,
        cwd: cwd.trim(),
        agent: agentChoice,
        resume: resumeFlag,
        skip_permissions: skipPermsFlag,
      });
      await onConfirm(payload);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create tmux session.');
      setBusy(false);
    }
  };

  const handleLaunchRepo = async (repo) => {
    if (!repo) return;
    if (repo.active && repo.session_name) {
      onSelectExistingSession?.(repo.session_name);
      onClose();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = buildSpawnSessionPayload({
        name: repo.session_name,
        cwd: repo.path,
        agent: agentChoice,
        resume: resumeFlag,
        skip_permissions: skipPermsFlag,
      });
      await onConfirm(payload);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to launch repository session.');
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="modal-card ld-mask-glass"
        style={{ width: 'min(520px, 94vw)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ color: 'var(--accent)', display: 'flex' }}>
                <Icon name={tab === 'repo' ? 'gitBranch' : 'plus'} />
              </span>
              <span>{tab === 'repo' ? 'GIT PROJECT LAUNCHER' : 'SPAWN ISOLATED TMUX NODE'}</span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.14em',
                color: 'var(--accent)',
                marginTop: '3px',
              }}
            >
              FAST RESUME (-C) · STRICT ALPHABETICAL FLEET RAIL
            </div>
          </div>
          <button type="button" className="ghost-btn" style={{ padding: '0 6px' }} onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`fleet-filter-pill ${tab === 'repo' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center', padding: '6px 10px' }}
              onClick={() => {
                setTab('repo');
                setTimeout(() => repoSearchRef.current?.focus(), 20);
              }}
            >
              GIT REPOS ({repos.length})
            </button>
            <button
              type="button"
              className={`fleet-filter-pill ${tab === 'custom' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center', padding: '6px 10px' }}
              onClick={() => {
                setTab('custom');
                setTimeout(() => inputRef.current?.focus(), 20);
              }}
            >
              CUSTOM NODE
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '8px 10px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                AUTO-LAUNCH HARNESS
              </span>
              {agentChoice !== 'shell' && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {agentChoice === 'agy' && (
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10.5px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={skipPermsFlag}
                        onChange={(e) => setSkipPermsFlag(e.target.checked)}
                      />
                      <span>Skip perms</span>
                    </label>
                  )}
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10.5px',
                      color: 'var(--accent)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={resumeFlag}
                      onChange={(e) => setResumeFlag(e.target.checked)}
                    />
                    <span>Resume (-c)</span>
                  </label>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {AGENT_LAUNCH_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`fleet-filter-pill ${agentChoice === opt.id ? 'active' : ''}`}
                  onClick={() => persistAgentChoice(opt.id)}
                >
                  {opt.id === 'shell' ? opt.label : resumeFlag ? opt.label : opt.binary.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {tab === 'repo' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                ref={repoSearchRef}
                type="text"
                className="ld-text-input"
                placeholder="Filter local Git repositories (active or offline)..."
                value={repoQuery}
                onChange={(e) => setRepoQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredRepos.length > 0) {
                    e.preventDefault();
                    handleLaunchRepo(filteredRepos[0]);
                  }
                }}
                autoComplete="off"
              />
              <div
                style={{
                  maxHeight: '240px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: '8px',
                  padding: '6px',
                }}
              >
                {reposLoading ? (
                  <div className="fleet-empty-state">Scanning local Git repositories...</div>
                ) : filteredRepos.length === 0 ? (
                  <div className="fleet-empty-state">No matching Git repositories found</div>
                ) : (
                  filteredRepos.map((repo) => (
                    <button
                      key={repo.path}
                      type="button"
                      className="pop-item"
                      style={{ width: '100%', justifyContent: 'space-between', gap: '8px' }}
                      disabled={busy}
                      onClick={() => handleLaunchRepo(repo)}
                    >
                      <span
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          overflow: 'hidden',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
                          {repo.name}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {repo.short_path || repo.path}
                        </span>
                      </span>
                      <span
                        className="mono-kbd"
                        style={
                          repo.active
                            ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
                            : undefined
                        }
                      >
                        {repo.active ? 'ACTIVE · ATTACH' : 'OFFLINE · LAUNCH'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label
                  htmlFor="spawn-session-name-inp"
                  style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}
                >
                  Session Name (e.g. <code>aim-research</code>, <code>aim-worker-2</code>)
                </label>
                <input
                  ref={inputRef}
                  id="spawn-session-name-inp"
                  type="text"
                  className="ld-text-input"
                  placeholder="aim-new-node"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  autoComplete="off"
                />
              </div>

              <div>
                <label
                  htmlFor="spawn-session-cwd-inp"
                  style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}
                >
                  Working Directory (Optional — enables localized <code>-c</code> session resume)
                </label>
                <input
                  id="spawn-session-cwd-inp"
                  type="text"
                  className="ld-text-input"
                  placeholder="~/my-project"
                  value={cwd}
                  onChange={(e) => {
                    setCwd(e.target.value);
                    if (error) setError('');
                  }}
                  autoComplete="off"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button type="button" className="subbar-util-btn" onClick={onClose}>
                  CANCEL
                </button>
                <button type="submit" className="neon-cta-btn" disabled={busy}>
                  <Icon name="plus" />
                  <span>{busy ? 'SPAWNING...' : 'SPAWN & ATTACH'}</span>
                </button>
              </div>
            </form>
          )}

          {error && (
            <div
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
