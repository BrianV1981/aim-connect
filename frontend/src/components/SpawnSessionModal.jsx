import { useEffect, useRef, useState } from 'react';
import Icon from './Icons';

const VALID_NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export default function SpawnSessionModal({ isOpen, onClose, onConfirm }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError('');
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
      await onConfirm(trimmed);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create tmux session.');
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
        style={{ width: 'min(440px, 94vw)' }}
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
                <Icon name="plus" />
              </span>
              <span>SPAWN ISOLATED TMUX NODE</span>
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
              STRICT ALPHABETICAL FLEET RAIL · MOUSE ON
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
      </div>
    </div>
  );
}
