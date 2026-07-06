import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState('');
  const [showFiles, setShowFiles] = useState(false);
  const [currentPath, setCurrentPath] = useState('/home/kingb');
  const [fileItems, setFileItems] = useState([]);
  const [openFileContent, setOpenFileContent] = useState('');
  
  const terminalRef = useRef(null);
  const term = useRef(null);
  const ws = useRef(null);
  const fitAddon = useRef(null);
  const authRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    authRef.current = isAuthenticated;
  }, [isAuthenticated]);

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
      }
    } catch (e) { console.error(e); }
  };

  const loadFileContent = async (path) => {
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.content !== undefined) {
        setOpenFileContent(data.content);
      } else {
        setOpenFileContent(data.error || 'Failed to read file');
      }
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

  // Trigger auth when 6 digits are reached
  useEffect(() => {
    if (pin.length === 6) {
      authenticate(pin);
    }
  }, [pin]);

  const authenticate = (token) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socket.binaryType = 'arraybuffer';
    
    socket.onopen = () => {
      // Send auth token immediately
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
          // Normal terminal string output if not JSON
          if (authRef.current && term.current) {
            term.current.write(event.data);
          }
        }
      } 
      
      // Handle raw terminal bytes
      if (event.data instanceof ArrayBuffer) {
        if (term.current) {
          term.current.write(new Uint8Array(event.data));
        }
      }
    };

    socket.onclose = () => {
      if (authRef.current) {
        if (term.current) term.current.writeln('\x1b[31m\n[Connection lost]\x1b[0m');
      } else {
        setAuthError('Connection failed');
        setPin('');
      }
    };
  };

  // Initialize terminal once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    term.current = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
        cursor: '#f38ba8',
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
      if (fitAddon.current) {
        fitAddon.current.fit();
        const dims = fitAddon.current.proposeDimensions();
        if (dims && ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
        }
      }
    };

    window.addEventListener('resize', handleResize);

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

    return () => {
      window.removeEventListener('resize', handleResize);
      if (termEl) {
        termEl.removeEventListener('touchstart', handleTouchStart);
        termEl.removeEventListener('touchmove', handleTouchMove);
      }
      if (term.current) term.current.dispose();
      // DO NOT close ws.current here, otherwise it closes on re-renders
    };
  }, [isAuthenticated]);

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
            <button className="key empty"></button>
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
          <select 
            className="session-select" 
            value={activeSession} 
            onChange={handleSessionSwitch}
          >
            {sessions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <button className="macro-btn" onClick={() => setShowFiles(!showFiles)}>
          {showFiles ? 'Terminal' : 'Files'}
        </button>
        <div className="status-indicator"></div>
      </header>
      
      {showFiles ? (
        <div className="file-explorer">
          <div className="file-toolbar">
            <button className="macro-btn" onClick={() => loadFiles(currentPath.split('/').slice(0, -1).join('/') || '/')}>
              ← Back
            </button>
            <span className="file-path">{currentPath}</span>
          </div>
          <div className="file-content-area">
            {openFileContent !== '' ? (
              <pre className="file-viewer">{openFileContent}</pre>
            ) : (
              <ul className="file-list">
                {fileItems.map((item, idx) => (
                  <li key={idx} className="file-item" onClick={() => item.is_dir ? loadFiles(item.path) : loadFileContent(item.path)}>
                    <span className="file-icon">{item.is_dir ? '📁' : '📄'}</span>
                    <span className="file-name">{item.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="commander-toolbar">
            <div className="macro-group">
              <button className="macro-btn" onClick={() => sendCommand('\x03')}>^C</button>
              <button className="macro-btn" onClick={() => sendCommand('\x1b')}>Esc</button>
              <button className="macro-btn" onClick={() => sendCommand('\x09')}>Tab</button>
              <button className="macro-btn" onClick={() => sendCommand('\x1b[A')}>↑</button>
              <button className="macro-btn" onClick={() => sendCommand('\x1b[B')}>↓</button>
            </div>
            <div className="macro-group">
              <button className="macro-btn action" onClick={() => sendCommand('clear\r')}>Clear</button>
              <button className="macro-btn action" onClick={() => sendCommand('top\r')}>top</button>
              <button className="macro-btn action" onClick={() => sendCommand('ls -la\r')}>ls</button>
            </div>
          </div>
          <div className="terminal-container" ref={terminalRef}></div>
        </>
      )}
    </div>
  );
}

export default App;
