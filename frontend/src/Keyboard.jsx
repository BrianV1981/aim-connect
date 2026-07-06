import React, { useState } from 'react';

export default function Keyboard({ onKeyPress }) {
  const [isShift, setIsShift] = useState(false);
  
  const normalRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '['],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
  ];
  
  const shiftRows = [
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '{'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ':', '"'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '<', '>', '?'],
  ];

  const rows = isShift ? shiftRows : normalRows;

  const handleKey = (key) => {
    onKeyPress(key);
    // Auto-unshift after a character is typed, similar to mobile keyboards
    if (isShift) setIsShift(false);
  };

  return (
    <div className="sovereign-keyboard">
      {rows.map((row, i) => (
        <div key={i} className="kb-row">
          {i === 3 && (
            <button 
              className={`kb-key kb-shift ${isShift ? 'active' : ''}`} 
              onClick={() => setIsShift(!isShift)}
            >
              ⇧
            </button>
          )}
          {row.map(key => (
            <button key={key} className="kb-key" onClick={() => handleKey(key)}>
              {key}
            </button>
          ))}
          {i === 3 && (
            <button className="kb-key kb-backspace" onClick={() => onKeyPress('\x7f')}>
              ⌫
            </button>
          )}
        </div>
      ))}
      <div className="kb-row">
        <button className="kb-key kb-ctrl" onClick={() => onKeyPress('\x03')}>^C</button>
        <button className="kb-key kb-space" onClick={() => onKeyPress(' ')}>Space</button>
        <button className="kb-key kb-enter" onClick={() => onKeyPress('\r')}>Enter</button>
      </div>
    </div>
  );
}
