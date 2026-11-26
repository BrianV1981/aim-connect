import { useState } from 'react';

// Tap-friendly ⓘ help bubble for Settings (#314). Works on touch screens (no hover needed)
// and is safe to place inside <label> rows: clicks never toggle the row's checkbox.
export default function InfoBubble({ text, label = 'What does this setting do?' }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;

  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <span className="info-bubble">
      <button
        type="button"
        className={`info-bubble-btn ${open ? 'open' : ''}`}
        aria-label={label}
        aria-expanded={open}
        title={open ? 'Hide explanation' : label}
        onClick={(e) => {
          stop(e);
          setOpen((prev) => !prev);
        }}
      >
        ?
      </button>
      {open && (
        <span className="info-bubble-panel" role="note" onClick={stop}>
          {text}
        </span>
      )}
    </span>
  );
}
