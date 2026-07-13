import React, { useState, useRef, useEffect } from 'react';

// Singleton AudioContext for key clicks
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
    
    // Subtle Android-style tick sound
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.03);
    
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.03);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.03);
  } catch(e) {
    // Ignore if audio fails or is blocked
  }
};

export default function Keyboard({ onKeyPress, mode = 'standard', autoCaps = true, feedbackMode = 'audio' }) {
  // 0 = off, 1 = shift (1 char), 2 = caps lock
  const [shiftState, setShiftState] = useState(0);
  const [ctrlState, setCtrlState] = useState(false);
  const [layout, setLayout] = useState('alpha'); // 'alpha' or 'symbols'
  const [lastPunctuation, setLastPunctuation] = useState(false);
  
  const triggerFeedback = () => {
    if (feedbackMode === 'off') return;
    if (feedbackMode === 'haptic' && navigator.vibrate) {
      try { navigator.vibrate(10); } catch(e) {}
    } else if (feedbackMode === 'audio' || feedbackMode === 'haptic') {
      triggerFeedback();
    }
  };

  // ===================== STANDARD MODE =====================
  const normalRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ];
  const shiftRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
  ];
  const symbolRows = [
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
    ['`', '~', '-', '_', '=', '+', '[', ']', '{', '}'],
    ['\\', '|', ';', ':', "'", '"', '<', '>', '/', '?'],
  ];

  // ===================== HACKER MODE =====================
  const hackerNormalRows = [
    ['\x1b', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    ['\x09', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
    ['\x03', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", '\\'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
  ];
  const hackerShiftRows = [
    ['\x1b', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+'],
    ['\x09', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '{', '}'],
    ['\x03', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ':', '"', '|'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '<', '>', '?'],
  ];

  const repeatTimeouts = useRef({});
  const repeatIntervals = useRef({});

  useEffect(() => {
    return () => {
      Object.values(repeatTimeouts.current).forEach(clearTimeout);
      Object.values(repeatIntervals.current).forEach(clearInterval);
    };
  }, []);

  const handlePointerDown = (e, key) => {
    e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch(err) {}
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
    try { e.target.releasePointerCapture(e.pointerId); } catch(err) {}
    clearTimeout(repeatTimeouts.current[key]);
    clearInterval(repeatIntervals.current[key]);
  };

  const handleKey = (e, key) => {
    e.preventDefault(); // Prevents delay and double-firing!
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
    
    // Auto-capitalize logic
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

  const toggleCtrl = (e) => {
    e.preventDefault();
    triggerFeedback();
    setCtrlState(!ctrlState);
  };

  const toggleShift = (e) => {
    e.preventDefault();
    triggerFeedback();
    if (shiftState === 0) setShiftState(1);
    else if (shiftState === 1) setShiftState(2);
    else setShiftState(0);
  };

  const toggleLayout = (e) => {
    e.preventDefault();
    triggerFeedback();
    setLayout(layout === 'alpha' ? 'symbols' : 'alpha');
  };

  const toggleMode = (e) => {
    e.preventDefault();
    triggerFeedback();
    setMode(mode === 'standard' ? 'hacker' : 'standard');
  };

  const getDisplayLabel = (key) => {
    if (key === '\x1b') return 'Esc';
    if (key === '\x09') return 'Tab';
    if (key === '\x03') return 'CtrlC';
    if (key === '\x1b[A') return '↑';
    if (key === '\x1b[B') return '↓';
    if (key === '\x1b[D') return '←';
    if (key === '\x1b[C') return '→';
    return key;
  };

  const renderAlphaRow = (row, i, isShift) => {
    return (
      <div key={`alpha-${i}`} className="kb-row">
        {i === 3 && (
          <button 
            className={`kb-key kb-shift ${shiftState > 0 ? 'active' : ''} ${shiftState === 2 ? 'capslock' : ''}`} 
            onPointerDown={toggleShift}
          >
            {shiftState === 2 ? '⇪' : (shiftState === 1 ? '⬆' : '⇧')}
          </button>
        )}
        {row.map(key => (
          <button key={key} className="kb-key" onPointerDown={(e) => handlePointerDown(e, key)} onPointerUp={(e) => handlePointerUp(e, key)} onPointerCancel={(e) => handlePointerUp(e, key)}>
            {getDisplayLabel(key)}
          </button>
        ))}
        {i === 3 && (
          <button className="kb-key kb-backspace" onPointerDown={(e) => handlePointerDown(e, '\x7f')} onPointerUp={(e) => handlePointerUp(e, '\x7f')} onPointerCancel={(e) => handlePointerUp(e, '\x7f')}>
            ⌫
          </button>
        )}
      </div>
    );
  };

  const renderSymbolRow = (row, i) => {
    return (
      <div key={`sym-${i}`} className="kb-row">
        {row.map(key => (
          <button key={key} className="kb-key" onPointerDown={(e) => handlePointerDown(e, key)} onPointerUp={(e) => handlePointerUp(e, key)} onPointerCancel={(e) => handlePointerUp(e, key)}>
            {key}
          </button>
        ))}
        {i === 2 && (
          <button className="kb-key kb-backspace" onPointerDown={(e) => handlePointerDown(e, '\x7f')} onPointerUp={(e) => handlePointerUp(e, '\x7f')} onPointerCancel={(e) => handlePointerUp(e, '\x7f')}>
            ⌫
          </button>
        )}
      </div>
    );
  };

  if (mode === 'hacker') {
    return (
      <div className="sovereign-keyboard hacker-mode">
        {(shiftState > 0 ? hackerShiftRows : hackerNormalRows).map((row, i) => renderAlphaRow(row, i, shiftState > 0))}
        <div className="kb-row">
          <button 
            className="kb-key kb-ctrl" 
            onPointerDown={toggleCtrl}
            style={ctrlState ? { backgroundColor: '#e2e8f0', color: '#0f172a' } : {}}
          >
            Ctrl
          </button>
          <button className="kb-key kb-ctrl" onPointerDown={(e) => handlePointerDown(e, '\x1b[D')} onPointerUp={(e) => handlePointerUp(e, '\x1b[D')} onPointerCancel={(e) => handlePointerUp(e, '\x1b[D')}>←</button>
          <button className="kb-key kb-ctrl" onPointerDown={(e) => handlePointerDown(e, '\x1b[A')} onPointerUp={(e) => handlePointerUp(e, '\x1b[A')} onPointerCancel={(e) => handlePointerUp(e, '\x1b[A')}>↑</button>
          <button className="kb-key kb-ctrl" onPointerDown={(e) => handlePointerDown(e, '\x1b[B')} onPointerUp={(e) => handlePointerUp(e, '\x1b[B')} onPointerCancel={(e) => handlePointerUp(e, '\x1b[B')}>↓</button>
          <button className="kb-key kb-ctrl" onPointerDown={(e) => handlePointerDown(e, '\x1b[C')} onPointerUp={(e) => handlePointerUp(e, '\x1b[C')} onPointerCancel={(e) => handlePointerUp(e, '\x1b[C')}>→</button>
          <button className="kb-key kb-space" onPointerDown={(e) => handlePointerDown(e, ' ')} onPointerUp={(e) => handlePointerUp(e, ' ')} onPointerCancel={(e) => handlePointerUp(e, ' ')}>Space</button>
          <button className="kb-key kb-enter" onPointerDown={(e) => handlePointerDown(e, '\r')} onPointerUp={(e) => handlePointerUp(e, '\r')} onPointerCancel={(e) => handlePointerUp(e, '\r')}>Enter</button>
        </div>
      </div>
    );
  }

  // STANDARD MODE
  return (
    <div className="sovereign-keyboard">
      {layout === 'alpha' && (
        <>
          {(shiftState > 0 ? shiftRows : normalRows).map((row, i) => renderAlphaRow(row, i, shiftState > 0))}
        </>
      )}
      
      {layout === 'symbols' && (
        <>
          {symbolRows.map((row, i) => renderSymbolRow(row, i))}
        </>
      )}

      <div className="kb-row">
        <button 
          className="kb-key kb-ctrl" 
          onPointerDown={toggleCtrl}
          style={ctrlState ? { backgroundColor: '#e2e8f0', color: '#0f172a' } : {}}
        >
          Ctrl
        </button>
        <button 
          className="kb-key kb-ctrl" 
          onPointerDown={toggleLayout}
        >
          {layout === 'alpha' ? '?123' : 'ABC'}
        </button>
        <button className="kb-key" onPointerDown={(e) => handlePointerDown(e, ',')} onPointerUp={(e) => handlePointerUp(e, ',')} onPointerCancel={(e) => handlePointerUp(e, ',')}>,</button>
        <button className="kb-key kb-space" onPointerDown={(e) => handlePointerDown(e, ' ')} onPointerUp={(e) => handlePointerUp(e, ' ')} onPointerCancel={(e) => handlePointerUp(e, ' ')}>Space</button>
        <button className="kb-key" onPointerDown={(e) => handlePointerDown(e, '.')} onPointerUp={(e) => handlePointerUp(e, '.')} onPointerCancel={(e) => handlePointerUp(e, '.')}>.</button>
        <button className="kb-key kb-enter" onPointerDown={(e) => handlePointerDown(e, '\r')} onPointerUp={(e) => handlePointerUp(e, '\r')} onPointerCancel={(e) => handlePointerUp(e, '\r')}>Enter</button>
      </div>
    </div>
  );
}
