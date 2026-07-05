import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import './App.css';

function App() {
  const terminalRef = useRef(null);
  const term = useRef(null);
  const ws = useRef(null);
  const fitAddon = useRef(null);

  useEffect(() => {
    // Initialize xterm
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

    // Open terminal in the ref container
    if (terminalRef.current) {
      term.current.open(terminalRef.current);
      fitAddon.current.fit();
    }

    // Connect WebSocket
    // Route through the Vite proxy to avoid CORS/Firewall issues
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);
    ws.current.binaryType = 'arraybuffer';

    ws.current.onopen = () => {
      term.current.writeln('\x1b[32m[Connected to aim-connect bridge]\x1b[0m');
      // Request initial size
      const dims = fitAddon.current.proposeDimensions();
      if (dims) {
        ws.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
      }
    };

    ws.current.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Raw bytes from pty
        term.current.write(new Uint8Array(event.data));
      } else {
        // String fallback
        term.current.write(event.data);
      }
    };

    ws.current.onclose = () => {
      term.current.writeln('\x1b[31m\n[Connection lost]\x1b[0m');
    };

    // Send user input to backend
    term.current.onData((data) => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'input', payload: data }));
      }
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.current.fit();
      const dims = fitAddon.current.proposeDimensions();
      if (dims && ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ws.current) ws.current.close();
      if (term.current) term.current.dispose();
    };
  }, []);

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
