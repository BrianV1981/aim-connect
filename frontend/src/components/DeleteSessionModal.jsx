import Icon from './Icons';

export default function DeleteSessionModal({ isOpen, onClose, onConfirm, sessionName }) {
  if (!isOpen) return null;

  return (
    <div className="modal-veil" onClick={onClose}>
      <div
        className="ld-modal-card"
        style={{ padding: '22px', borderColor: 'rgba(239, 68, 68, 0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '15px',
            fontWeight: 700,
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="trash" size={15} />
            <span>TERMINATE SESSION // {sessionName}</span>
          </span>
          <button type="button" className="ghost-btn" style={{ padding: '0 6px' }} onClick={onClose}>
            <Icon name="close" size={14} />
          </button>
        </div>

        <p style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Are you sure you want to kill tmux session{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{sessionName}</strong>? Running shell
          processes inside this session will stop, while all git worktrees, repository files, and{' '}
          <code>memory-wiki/</code> artifacts remain safely preserved on disk.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
          <button type="button" className="ghost-btn" onClick={onClose}>
            CANCEL
          </button>
          <button
            type="button"
            className="danger-btn"
            onClick={() => onConfirm(sessionName)}
          >
            <Icon name="trash" size={13} />
            <span>TERMINATE SESSION</span>
          </button>
        </div>
      </div>
    </div>
  );
}
