import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import './App.css';
import Keyboard from './Keyboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState('');
  const [showFiles, setShowFiles] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [currentPath, setCurrentPath] = useState('/home/kingb');
  const [fileItems, setFileItems] = useState([]);
  const [openFileContent, setOpenFileContent] = useState('');
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [openFilePath, setOpenFilePath] = useState('');
  
  const defaultMacros = [
    { label: 'Clear', cmd: '\x0c' },
    { label: 'top', cmd: 'top\r' },
    { label: 'ls', cmd: 'ls -la\r' }
  ];
  const [customMacros, setCustomMacros] = useState(() => {
    const saved = localStorage.getItem('aim-macros');
    return saved ? JSON.parse(saved) : defaultMacros;
  });
  
  const [showMacroModal, setShowMacroModal] = useState(false);
  const [newMacroLabel, setNewMacroLabel] = useState('');
  const [newMacroCmd, setNewMacroCmd] = useState('');
  
  const terminalRef = useRef(null);
  const term = useRef(null);
  const ws = useRef(null);
  const fitAddon = useRef(null);
  const authRef = useRef(false);
  const pinRef = useRef('');

  // Keep ref in sync
  useEffect(() => {
    authRef.current = isAuthenticated;
  }, [isAuthenticated]);
  
  useEffect(() => {
    pinRef.current = pin;
  }, [pin]);

  // Fetch tmux sessions
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/sessions');
        const data = await res.json();
        setSessions(data.sessions);
        if (data.sessions.length > 0 && !activeSession) {
          setActiveSession(data.sessions[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeSession]);

  const createSession = async () => {
    const name = window.prompt("New Session Name:");
    if (!name) return;
    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      // Force fetch to update dropdown
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(data.sessions);
      setActiveSession(name);
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'switch_session', session: name }));
      }
    } catch (e) { console.error(e); }
  };

  const killSession = async () => {
    if (!activeSession) return;
    if (!window.confirm(`Kill session ${activeSession}?`)) return;
    try {
      // Find another session to switch to FIRST to prevent PTY crash
      const res = await fetch('/api/sessions');
      const data = await res.json();
      const otherSessions = data.sessions.filter(s => s !== activeSession);
      
      if (otherSessions.length > 0) {
        const nextSession = otherSessions[0];
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'switch_session', session: nextSession }));
        }
        setActiveSession(nextSession);
      } else {
        setActiveSession('');
      }
      
      // Give tmux a millisecond to switch clients, then kill the original session
      setTimeout(async () => {
        await fetch(`/api/sessions/${activeSession}`, { method: 'DELETE' });
        const finalRes = await fetch('/api/sessions');
        const finalData = await finalRes.json();
        setSessions(finalData.sessions);
      }, 100);
      
    } catch (e) { console.error(e); }
  };

  const handleSessionSwitch = (e) => {
    const newSession = e.target.value;
    setActiveSession(newSession);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'switch_session', session: newSession }));
    }
  };

  const loadFiles = async (path) => {
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.items) {
        setFileItems(data.items);
        setCurrentPath(data.path);
        setOpenFileContent('');
        setIsEditingFile(false);
        setOpenFilePath('');
      }
    } catch (e) { console.error(e); }
  };

  const loadFileContent = async (path) => {
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.content !== undefined) {
        setOpenFileContent(data.content);
        setOpenFilePath(path);
        setIsEditingFile(true);
      } else {
        setOpenFileContent(data.error || 'Failed to read file');
      }
    } catch (e) { console.error(e); }
  };

  const saveFile = async () => {
    try {
      await fetch('/api/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: openFilePath, content: openFileContent })
      });
      // flash visual feedback
      const btn = document.getElementById('save-btn');
      if (btn) {
        btn.innerText = 'Saved!';
        setTimeout(() => btn.innerText = 'Save', 2000);
      }
    } catch (e) { console.error(e); }
  };

  const createItem = async (isDir) => {
    const name = window.prompt(`New ${isDir ? 'Folder' : 'File'} Name:`);
    if (!name) return;
    try {
      await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `${currentPath}/${name}`, is_dir: isDir })
      });
      loadFiles(currentPath);
    } catch (e) { console.error(e); }
  };

  const deleteItem = async (path, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete ${path.split('/').pop()}?`)) return;
    try {
      await fetch(`/api/file?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
      loadFiles(currentPath);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (showFiles) {
      loadFiles(currentPath);
    }
  }, [showFiles]);

  // Handle PIN input
  const handlePinInput = (digit) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
      setAuthError('');
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setAuthError('');
  };

  const handlePasteClick = async () => {
    try {
      const pastedText = await navigator.clipboard.readText();
      const digits = pastedText.replace(/\D/g, '').slice(0, 6);
      if (digits.length > 0) {
        setPin(digits);
        setAuthError('');
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  // Trigger auth when 6 digits are reached
  useEffect(() => {
    if (pin.length === 6) {
      authenticate(pin);
    }
  }, [pin]);

  // Support pasting TOTP codes directly
  useEffect(() => {
    if (isAuthenticated) return;
    
    const handlePaste = (e) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');
      const digits = pastedText.replace(/\D/g, '').slice(0, 6);
      if (digits.length > 0) {
        setPin(digits);
        setAuthError('');
      }
    };
    
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isAuthenticated]);

  const authenticate = (token) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socket.binaryType = 'arraybuffer';
    
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'auth', token: token }));
    };

    socket.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'auth_success') {
            ws.current = socket;
            authRef.current = true;
            setIsAuthenticated(true);
            return;
          } else if (msg.type === 'auth_failed') {
            setAuthError('Invalid or expired PIN');
            setPin('');
            socket.close();
            return;
          }
        } catch (e) {
          if (authRef.current && term.current) {
            term.current.write(event.data);
          }
        }
      } 
      
      if (event.data instanceof ArrayBuffer) {
        if (term.current) {
          term.current.write(new Uint8Array(event.data));
        }
      }
    };

    socket.onclose = () => {
      if (authRef.current) {
        if (term.current) term.current.writeln('\x1b[31m\n[Connection lost. Reconnecting...]\x1b[0m');
        setTimeout(() => {
          if (pinRef.current) authenticate(pinRef.current);
        }, 1000);
      } else {
        setAuthError('Connection failed');
        setPin('');
      }
    };
  };

  const saveMacro = () => {
    if (!newMacroLabel || !newMacroCmd) return;
    
    // Convert literal "\r" or "\n" typed by the user into actual carriage returns
    const processedCmd = newMacroCmd.replace(/\\r/g, '\r').replace(/\\n/g, '\n');
    
    const updated = [...customMacros, { label: newMacroLabel, cmd: processedCmd }];
    setCustomMacros(updated);
    localStorage.setItem('aim-macros', JSON.stringify(updated));
    setShowMacroModal(false);
    setNewMacroLabel('');
    setNewMacroCmd('');
  };

  const deleteMacro = (index) => {
    if (!window.confirm('Delete this macro?')) return;
    const updated = customMacros.filter((_, i) => i !== index);
    setCustomMacros(updated);
    localStorage.setItem('aim-macros', JSON.stringify(updated));
  };

  // Initialize terminal once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    term.current = new Terminal({
      cursorBlink: true,
      disableStdin: showKeyboard,
      theme: {
        background: '#0B162C',
        foreground: '#e2e8f0',
        cursor: '#ff5722',
      },
      fontFamily: '"Fira Code", monospace',
      fontSize: 14,
    });
    
    fitAddon.current = new FitAddon();
    term.current.loadAddon(fitAddon.current);

    if (terminalRef.current) {
      term.current.open(terminalRef.current);
      fitAddon.current.fit();
      
      // Aggressively disable mobile predictive text to prevent duplication glitches
      const textarea = terminalRef.current.querySelector('textarea');
      if (textarea) {
        textarea.setAttribute('autocorrect', 'off');
        textarea.setAttribute('autocapitalize', 'off');
        textarea.setAttribute('autocomplete', 'off');
        textarea.setAttribute('spellcheck', 'false');
      }
    }

    term.current.writeln('\x1b[32m[Access Granted - aim-connect]\x1b[0m');
    
    // Request initial size
    const dims = fitAddon.current.proposeDimensions();
    if (dims && ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
    }

    term.current.onData((data) => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'input', payload: data }));
      }
    });

    const handleResize = () => {
      // Force the body to match the visual viewport (which shrinks when native keyboard opens)
      if (window.visualViewport) {
        document.body.style.height = `${window.visualViewport.height}px`;
      }
      
      if (fitAddon.current) {
        fitAddon.current.fit();
        const dims = fitAddon.current.proposeDimensions();
        if (dims && ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
        }
      }
    };

    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    // Mobile touch-to-scroll adapter
    let lastTouchY = 0;
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        lastTouchY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 1) {
        e.preventDefault(); // Stop browser pull-to-refresh / scrolling
        const currentY = e.touches[0].clientY;
        const deltaY = lastTouchY - currentY;
        
        // Dispatch synthetic wheel event so xterm translates it to tmux mouse scrolls
        if (Math.abs(deltaY) > 5) {
          const wheelEvent = new WheelEvent('wheel', {
            deltaY: deltaY * 2, // Multiplier for scroll speed
            bubbles: true,
            cancelable: true
          });
          const target = terminalRef.current.querySelector('.xterm-screen') || terminalRef.current;
          target.dispatchEvent(wheelEvent);
          lastTouchY = currentY;
        }
      }
    };

    const termEl = terminalRef.current;
    if (termEl) {
      termEl.addEventListener('touchstart', handleTouchStart, { passive: false });
      termEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    }

    // CRITICAL MOBILE FIX: Prevent browser from scrolling the toolbar off-screen 
    // when xterm's hidden textarea receives focus at the bottom of the screen.
    const handleScroll = () => {
      if (window.scrollY > 0 || window.scrollX > 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        document.body.style.height = ''; // reset on unmount
      }
      window.removeEventListener('scroll', handleScroll);
      if (termEl) {
        termEl.removeEventListener('touchstart', handleTouchStart);
        termEl.removeEventListener('touchmove', handleTouchMove);
      }
      if (term.current) term.current.dispose();
      // DO NOT close ws.current here, otherwise it closes on re-renders
    };
  }, [isAuthenticated]);

  // Dynamically disable native keyboard when our custom one is open
  useEffect(() => {
    if (term.current) {
      term.current.options.disableStdin = showKeyboard;
      if (showKeyboard) {
        // Force blur the hidden textarea just in case it's currently focused
        const textarea = terminalRef.current?.querySelector('textarea');
        if (textarea) textarea.blur();
      }
      
      // Give React a few milliseconds to render the keyboard DOM, then resize the terminal
      // so it shrinks and the cursor stays visible above the keyboard!
      setTimeout(() => {
        if (fitAddon.current) {
          fitAddon.current.fit();
          const dims = fitAddon.current.proposeDimensions();
          if (dims && ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
          }
        }
      }, 50);
    }
  }, [showKeyboard]);

  const sendCommand = (cmd) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'input', payload: cmd }));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo"></div>
            <h2>A.I.M. SECURE</h2>
            <p>Enter Authenticator Code</p>
          </div>
          
          <div className="pin-display">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`}></div>
            ))}
          </div>
          
          {authError && <div className="auth-error">{authError}</div>}

          <div className="keypad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button key={num} className="key" onClick={() => handlePinInput(num.toString())}>
                {num}
              </button>
            ))}
            <button className="key action" style={{ fontSize: '24px' }} onClick={handlePasteClick}>📋</button>
            <button className="key" onClick={() => handlePinInput('0')}>0</button>
            <button className="key action" onClick={handleBackspace}>⌫</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>aim-connect</h1>
        {sessions.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <select 
              className="session-select" 
              value={activeSession} 
              onChange={handleSessionSwitch}
            >
              {sessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="macro-btn" onClick={createSession}>+</button>
            <button className="macro-btn" onClick={killSession}>🗑️</button>
          </div>
        )}
        {sessions.length === 0 && (
          <button className="macro-btn" onClick={createSession}>+ New Session</button>
        )}
        <button className="macro-btn" onClick={() => setShowFiles(!showFiles)}>
          {showFiles ? 'Terminal' : 'Files'}
        </button>
        <button 
          className={`macro-btn ${showKeyboard ? 'active' : ''}`} 
          onClick={() => setShowKeyboard(!showKeyboard)}
        >
          ⌨️ {showKeyboard ? 'ON' : 'OFF'}
        </button>
        <div className="status-indicator"></div>
      </header>
      
      <div className="file-explorer" style={{ display: showFiles ? 'flex' : 'none' }}>
        <div className="file-toolbar">
          {isEditingFile ? (
            <>
              <button className="macro-btn" onClick={() => { setIsEditingFile(false); setOpenFileContent(''); }}>← Back</button>
              <span className="file-path">{openFilePath.split('/').pop()}</span>
              <button id="save-btn" className="macro-btn action" onClick={saveFile}>Save</button>
            </>
          ) : (
            <>
              <button className="macro-btn" onClick={() => loadFiles(currentPath.split('/').slice(0, -1).join('/') || '/')}>
                ← Back
              </button>
              <span className="file-path">{currentPath}</span>
              <button className="macro-btn" onClick={() => createItem(false)}>+ File</button>
              <button className="macro-btn" onClick={() => createItem(true)}>+ Dir</button>
            </>
          )}
        </div>
        <div className="file-content-area">
          {isEditingFile ? (
            <textarea 
              className="file-editor" 
              value={openFileContent} 
              onChange={e => setOpenFileContent(e.target.value)} 
              spellCheck="false"
            />
          ) : (
            <ul className="file-list">
              {fileItems.map((item, idx) => (
                <li key={idx} className="file-item" onClick={() => item.is_dir ? loadFiles(item.path) : loadFileContent(item.path)}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <span className="file-icon">{item.is_dir ? '📁' : '📄'}</span>
                    <span className="file-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  </div>
                  <button className="macro-btn" style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent' }} onClick={(e) => deleteItem(item.path, e)}>🗑️</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div style={{ display: showFiles ? 'none' : 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div className="commander-toolbar">
          <div className="macro-group">
            <button className="macro-btn" onClick={() => sendCommand('\x03')}>^C</button>
            <button className="macro-btn" onClick={() => sendCommand('\x1b')}>Esc</button>
            <button className="macro-btn" onClick={() => sendCommand('\x09')}>Tab</button>
            <button className="macro-btn" onClick={() => sendCommand('\x1b[A')}>↑</button>
            <button className="macro-btn" onClick={() => sendCommand('\x1b[B')}>↓</button>
          </div>
          <div className="macro-group">
            {customMacros.map((macro, idx) => (
              <button 
                key={idx} 
                className="macro-btn action" 
                onClick={() => sendCommand(macro.cmd)}
                onContextMenu={(e) => { e.preventDefault(); deleteMacro(idx); }}
              >
                {macro.label}
              </button>
            ))}
            <button className="macro-btn action add-macro" onClick={() => setShowMacroModal(true)}>+</button>
          </div>
        </div>
        <div className="terminal-container" ref={terminalRef}></div>
        {showKeyboard && (
          <Keyboard onKeyPress={(key) => sendCommand(key)} />
        )}
      </div>

      {showMacroModal && (
        <div className="modal-overlay" onClick={() => setShowMacroModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#e2e8f0', marginBottom: '16px' }}>Add Custom Macro</h3>
            <input 
              className="modal-input" 
              placeholder="Button Label (e.g. logs)" 
              value={newMacroLabel} 
              onChange={e => setNewMacroLabel(e.target.value)} 
            />
            <input 
              className="modal-input" 
              placeholder="Bash Command (e.g. pm2 logs\r)" 
              value={newMacroCmd} 
              onChange={e => setNewMacroCmd(e.target.value)} 
            />
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '20px' }}>
              Hint: Add \r to the end to auto-press Enter. Long-press a macro to delete it.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="macro-btn" onClick={() => setShowMacroModal(false)}>Cancel</button>
              <button className="macro-btn action" onClick={saveMacro}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
