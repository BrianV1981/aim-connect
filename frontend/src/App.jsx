import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState('');
  
  const terminalRef = useRef(null);
  const term = useRef(null);
  const ws = useRef(null);
  const fitAddon = useRef(null);

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
          if (isAuthenticated && term.current) {
            term.current.write(event.data);
          }
        }
      } 
      
      // Handle raw terminal bytes if authenticated
      if (isAuthenticated && event.data instanceof ArrayBuffer) {
        if (term.current) {
          term.current.write(new Uint8Array(event.data));
        }
      }
    };

    socket.onclose = () => {
      if (isAuthenticated) {
        if (term.current) term.current.writeln('\x1b[31m\n[Connection lost]\x1b[0m');
      } else if (!authError) {
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

    return () => {
      window.removeEventListener('resize', handleResize);
      if (term.current) term.current.dispose();
    };
  }, [isAuthenticated]);

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
        <div className="status-indicator"></div>
      </header>
      <div className="terminal-container" ref={terminalRef}></div>
    </div>
  );
}

export default App;
