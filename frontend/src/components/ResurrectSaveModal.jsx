import Icon from './Icons';

export default function ResurrectSaveModal({
  isOpen,
  warningMessage,
  activeCount = 0,
  savedCount = 0,
  busy = false,
  onClose,
  onConfirmOverwrite,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-veil"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose?.();
      }}
    >
      <div
        className="ld-modal-card"
        style={{ padding: '22px', borderColor: 'rgba(245, 158, 11, 0.55)', width: 'min(480px, 94vw)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '14.5px',
            fontWeight: 700,
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="alert" size={15} />
            <span>EMPTY-SAVE GUARDRAIL // TMUX-RESURRECT</span>
          </span>
          <button type="button" className="ghost-btn" style={{ padding: '0 6px' }} onClick={onClose}>
            <Icon name="close" size={14} />
          </button>
        </div>

        <p style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {warningMessage ||
            `Only ${activeCount} active session(s) running compared to ${savedCount} in your last snapshot. Overwrite saved workspace state?`}
        </p>

        <div
          style={{
            marginTop: '10px',
            padding: '8px 10px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.28)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>ACTIVE NODES: {activeCount}</span>
          <span>LAST BACKUP: {savedCount}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
          <button type="button" className="ghost-btn" onClick={onClose} disabled={busy}>
            CANCEL
          </button>
          <button
            type="button"
            className="neon-cta-btn"
            style={{
              background: 'rgba(245, 158, 11, 0.18)',
              borderColor: 'rgba(245, 158, 11, 0.65)',
              color: '#fde68a',
            }}
            onClick={onConfirmOverwrite}
            disabled={busy}
          >
            <Icon name="upload" size={13} />
            <span>{busy ? 'SAVING...' : 'OVERWRITE BACKUP'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
