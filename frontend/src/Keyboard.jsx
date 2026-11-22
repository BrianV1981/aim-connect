import { useEffect, useRef, useState } from 'react';
import Icon from './components/Icons';

// Singleton AudioContext for subtle keypress ticks
let audioCtx = null;
const playClickSound = () => {
  try {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      } else {
        return;
      }
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.03);
    gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.03);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.03);
  } catch {
    // Ignore if audio blocked
  }
};

export default function Keyboard({
  onKeyPress,
  mode = 'standard',
  onChangeMode,
  onClose,
  autoCaps = true,
  feedbackMode = 'audio',
}) {
  const [shiftState, setShiftState] = useState(0); // 0=off, 1=shift, 2=caps
  const [ctrlState, setCtrlState] = useState(false);
  const [layout, setLayout] = useState('alpha'); // 'alpha' | 'symbols' | 'fkeys'
  const [lastPunctuation, setLastPunctuation] = useState(false);

  const triggerFeedback = () => {
    if (feedbackMode === 'off') return;
    if (feedbackMode === 'haptic' && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch {}
    } else {
      playClickSound();
    }
  };

  const normalRows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '/'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '-'],
  ];
  const shiftRows = normalRows.map((row) => row.map((c) => c.toUpperCase()));

  const symbolRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['@', '#', '$', '%', '&', '-', '+', '(', ')', '/'],
    ['*', '"', "'", ':', ';', '!', '?', '~', '`', '\\'],
  ];

  const fnRows = [
    [
      { label: 'F1', val: '\x1bOP' },
      { label: 'F2', val: '\x1bOQ' },
      { label: 'F3', val: '\x1bOR' },
      { label: 'F4', val: '\x1bOS' },
      { label: 'F5', val: '\x1b[15~' },
      { label: 'F6', val: '\x1b[17~' },
      { label: 'F7', val: '\x1b[18~' },
      { label: 'F8', val: '\x1b[19~' },
      { label: 'F9', val: '\x1b[20~' },
      { label: 'F10', val: '\x1b[21~' },
    ],
    [
      { label: 'F11', val: '\x1b[23~' },
      { label: 'F12', val: '\x1b[24~' },
      { label: 'ESC', val: '\x1b' },
      { label: 'TAB', val: '\x09' },
      { label: 'INS', val: '\x1b[2~' },
      { label: 'DEL', val: '\x1b[3~' },
      { label: 'HOME', val: '\x1b[H' },
      { label: 'END', val: '\x1b[F' },
      { label: 'PGUP', val: '\x1b[5~' },
      { label: 'PGDN', val: '\x1b[6~' },
    ],
    [
      { label: '^C', val: '\x03' },
      { label: '^W', val: '\x17' },
      { label: '^U', val: '\x15' },
      { label: '^R', val: '\x12' },
      { label: '^L', val: '\x0c' },
      { label: '←', val: '\x1b[D' },
      { label: '↓', val: '\x1b[B' },
      { label: '↑', val: '\x1b[A' },
      { label: '→', val: '\x1b[C' },
      { label: '⌫', val: '\x7f' },
    ],
  ];

  const hackerRows = [
    [
      { label: 'ESC', val: '\x1b' },
      { label: 'TAB', val: '\x09' },
      { label: '^C', val: '\x03' },
      { label: '^D', val: '\x04' },
      { label: '^Z', val: '\x1a' },
      { label: '^L', val: '\x0c' },
      { label: 'PGUP', val: '\x1b[5~' },
      { label: 'PGDN', val: '\x1b[6~' },
      { label: 'HOME', val: '\x1b[H' },
      { label: 'END', val: '\x1b[F' },
    ],
    ['/', '-', '|', '~', '_', ':', ';', '"', "'", '\x7f'].map((k) => ({
      label: k === '\x7f' ? 'BKSP' : k,
      val: k,
    })),
    ['(', ')', '[', ']', '{', '}', '<', '>', '&&', '\x1b[A'].map((k) => ({
      label: k === '\x1b[A' ? '↑' : k,
      val: k,
    })),
  ];

  const repeatTimeouts = useRef({});
  const repeatIntervals = useRef({});

  useEffect(() => {
    return () => {
      Object.values(repeatTimeouts.current).forEach(clearTimeout);
      Object.values(repeatIntervals.current).forEach(clearInterval);
    };
  }, []);

  const handleKey = (e, key) => {
    e.preventDefault();
    triggerFeedback();

    let finalKey = key;
    if (ctrlState && key.length === 1 && /[a-zA-Z]/.test(key)) {
      finalKey = String.fromCharCode(key.toLowerCase().charCodeAt(0) - 96);
      setCtrlState(false);
    }

    onKeyPress(finalKey);

    if (shiftState === 1 && layout === 'alpha') {
      setShiftState(0);
    }

    if (autoCaps && finalKey === key) {
      if (['.', '!', '?'].includes(key)) {
        setLastPunctuation(true);
      } else if (key === ' ' && lastPunctuation) {
        setShiftState(1);
        setLastPunctuation(false);
      } else if (key !== '\b') {
        setLastPunctuation(false);
      }
    }
  };

  const handlePointerDown = (e, key) => {
    e.preventDefault();
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch {}
    handleKey(e, key);

    if (key === '\x7f' || ['\x1b[A', '\x1b[B', '\x1b[C', '\x1b[D'].includes(key) || key === ' ') {
      repeatTimeouts.current[key] = setTimeout(() => {
        repeatIntervals.current[key] = setInterval(() => {
          handleKey(e, key);
        }, 80);
      }, 400);
    }
  };

  const handlePointerUp = (e, key) => {
    e.preventDefault();
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch {}
    clearTimeout(repeatTimeouts.current[key]);
    clearInterval(repeatIntervals.current[key]);
  };

  const toggleCtrl = (e) => {
    e.preventDefault();
    triggerFeedback();
    setCtrlState((prev) => !prev);
  };

  const toggleShift = (e) => {
    e.preventDefault();
    triggerFeedback();
    setShiftState((prev) => (prev + 1) % 3);
  };

  if (mode === 'hacker') {
    return (
      <div className="sovereign-keyboard sovereign-kb-dock hacker-mode">
        <div className="kb-toolbar">
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <button
              type="button"
              className="subbar-util-btn"
              onClick={() => onChangeMode?.('standard')}
            >
              STANDARD ABC
            </button>
            <button type="button" className="subbar-util-btn active">
              HACKER KEYS
            </button>
          </div>
          {onClose && (
            <button type="button" className="ghost-btn" style={{ height: '24px', padding: '0 7px' }} onClick={onClose}>
              <Icon name="close" />
            </button>
          )}
        </div>
        {hackerRows.map((row, idx) => (
          <div key={`hk-${idx}`} className="kb-row">
            {row.map((item) => (
              <button
                key={item.label}
                type="button"
                className="kb-cap"
                onPointerDown={(e) => handlePointerDown(e, item.val)}
                onPointerUp={(e) => handlePointerUp(e, item.val)}
                onPointerCancel={(e) => handlePointerUp(e, item.val)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
        <div className="kb-row">
          <button
            type="button"
            className="kb-cap wide"
            onPointerDown={(e) => handlePointerDown(e, '/aim-handoff\r')}
            onPointerUp={(e) => handlePointerUp(e, '/aim-handoff\r')}
            onPointerCancel={(e) => handlePointerUp(e, '/aim-handoff\r')}
          >
            /handoff
          </button>
          <button
            type="button"
            className="kb-cap space"
            onPointerDown={(e) => handlePointerDown(e, ' ')}
            onPointerUp={(e) => handlePointerUp(e, ' ')}
            onPointerCancel={(e) => handlePointerUp(e, ' ')}
          >
            SPACE
          </button>
          <button
            type="button"
            className="kb-cap"
            onPointerDown={(e) => handlePointerDown(e, '\x1b[D')}
            onPointerUp={(e) => handlePointerUp(e, '\x1b[D')}
            onPointerCancel={(e) => handlePointerUp(e, '\x1b[D')}
          >
            ←
          </button>
          <button
            type="button"
            className="kb-cap"
            onPointerDown={(e) => handlePointerDown(e, '\x1b[B')}
            onPointerUp={(e) => handlePointerUp(e, '\x1b[B')}
            onPointerCancel={(e) => handlePointerUp(e, '\x1b[B')}
          >
            ↓
          </button>
          <button
            type="button"
            className="kb-cap"
            onPointerDown={(e) => handlePointerDown(e, '\x1b[C')}
            onPointerUp={(e) => handlePointerUp(e, '\x1b[C')}
            onPointerCancel={(e) => handlePointerUp(e, '\x1b[C')}
          >
            →
          </button>
          <button
            type="button"
            className="kb-cap wide"
            onPointerDown={(e) => handlePointerDown(e, '\r')}
            onPointerUp={(e) => handlePointerUp(e, '\r')}
            onPointerCancel={(e) => handlePointerUp(e, '\r')}
          >
            ENTER ⏎
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sovereign-keyboard sovereign-kb-dock">
      <div className="kb-toolbar">
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="subbar-util-btn active">
            STANDARD
          </button>
          <button
            type="button"
            className="subbar-util-btn"
            onClick={() => onChangeMode?.('hacker')}
          >
            HACKER
          </button>
          <span style={{ opacity: 0.25 }}>|</span>
          <button
            type="button"
            className={`fav-chip ${layout === 'alpha' ? 'active' : ''}`}
            onClick={() => setLayout('alpha')}
          >
            ABC
          </button>
          <button
            type="button"
            className={`fav-chip ${layout === 'symbols' ? 'active' : ''}`}
            onClick={() => setLayout('symbols')}
          >
            ?123
          </button>
          <button
            type="button"
            className={`fav-chip ${layout === 'fkeys' ? 'active' : ''}`}
            onClick={() => setLayout('fkeys')}
          >
            Fn F1–F12
          </button>
        </div>
        {onClose && (
          <button type="button" className="ghost-btn" style={{ height: '24px', padding: '0 7px' }} onClick={onClose}>
            <Icon name="close" />
          </button>
        )}
      </div>

      {layout === 'alpha' &&
        (shiftState > 0 ? shiftRows : normalRows).map((row, idx) => (
          <div key={`alpha-${idx}`} className="kb-row">
            {row.map((key) => (
              <button
                key={key}
                type="button"
                className="kb-cap"
                onPointerDown={(e) => handlePointerDown(e, key)}
                onPointerUp={(e) => handlePointerUp(e, key)}
                onPointerCancel={(e) => handlePointerUp(e, key)}
              >
                {key}
              </button>
            ))}
          </div>
        ))}

      {layout === 'symbols' &&
        symbolRows.map((row, idx) => (
          <div key={`sym-${idx}`} className="kb-row">
            {row.map((key) => (
              <button
                key={key}
                type="button"
                className="kb-cap"
                onPointerDown={(e) => handlePointerDown(e, key)}
                onPointerUp={(e) => handlePointerUp(e, key)}
                onPointerCancel={(e) => handlePointerUp(e, key)}
              >
                {key}
              </button>
            ))}
          </div>
        ))}

      {layout === 'fkeys' &&
        fnRows.map((row, idx) => (
          <div key={`fn-${idx}`} className="kb-row">
            {row.map((item) => (
              <button
                key={item.label}
                type="button"
                className="kb-cap"
                onPointerDown={(e) => handlePointerDown(e, item.val)}
                onPointerUp={(e) => handlePointerUp(e, item.val)}
                onPointerCancel={(e) => handlePointerUp(e, item.val)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}

      <div className="kb-row">
        <button
          type="button"
          className={`kb-cap ${shiftState > 0 ? 'mod-active' : ''}`}
          onPointerDown={toggleShift}
        >
          {shiftState === 2 ? '⇪ CAPS' : shiftState === 1 ? '⬆ SHIFT' : '⇧'}
        </button>
        <button
          type="button"
          className={`kb-cap ${ctrlState ? 'mod-active' : ''}`}
          onPointerDown={toggleCtrl}
        >
          CTRL
        </button>
        <button
          type="button"
          className="kb-cap space"
          onPointerDown={(e) => handlePointerDown(e, ' ')}
          onPointerUp={(e) => handlePointerUp(e, ' ')}
          onPointerCancel={(e) => handlePointerUp(e, ' ')}
        >
          SPACE
        </button>
        <button
          type="button"
          className="kb-cap"
          onPointerDown={(e) => handlePointerDown(e, '\x7f')}
          onPointerUp={(e) => handlePointerUp(e, '\x7f')}
          onPointerCancel={(e) => handlePointerUp(e, '\x7f')}
        >
          ⌫
        </button>
        <button
          type="button"
          className="kb-cap wide"
          onPointerDown={(e) => handlePointerDown(e, '\r')}
          onPointerUp={(e) => handlePointerUp(e, '\r')}
          onPointerCancel={(e) => handlePointerUp(e, '\r')}
        >
          ENTER ⏎
        </button>
      </div>
    </div>
  );
}
