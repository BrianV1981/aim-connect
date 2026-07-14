import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { AnsiUp } from 'ansi_up';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import './App.css';
import Keyboard from './Keyboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState('');
  const [showFiles, setShowFiles] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [isNativeScrollMode, setIsNativeScrollMode] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const [voiceContinuous, setVoiceContinuous] = useState(() => JSON.parse(localStorage.getItem('aim-voice-continuous') ?? 'true'));
  const [voiceAutoEnter, setVoiceAutoEnter] = useState(() => JSON.parse(localStorage.getItem('aim-voice-enter') ?? 'true'));
  const [voiceAutoExecute, setVoiceAutoExecute] = useState(() => JSON.parse(localStorage.getItem('aim-voice-execute') ?? 'true'));
  const [voiceAutoSend, setVoiceAutoSend] = useState(() => JSON.parse(localStorage.getItem('aim-voice-send') ?? 'true'));
  const [scrollbackContent, setScrollbackContent] = useState('');
  const [rawScrollback, setRawScrollback] = useState('');
  const isNativeScrollModeRef = useRef(false);
  const hasScrolledUpInOverlay = useRef(false);

  useEffect(() => {
    isNativeScrollModeRef.current = isNativeScrollMode;
  }, [isNativeScrollMode]);

  const enterNativeScrollMode = async () => {
    if (!activeSession) return;
    setIsNativeScrollMode(true);
    hasScrolledUpInOverlay.current = false;
    setScrollbackContent('Loading scrollback...');
    try {
      const res = await window.fetch(`/api/scrollback/${encodeURIComponent(activeSession)}`);
      const data = await res.json();
      if (data.scrollback) {
        const ansi_up = new AnsiUp();
        const html = ansi_up.ansi_to_html(data.scrollback);
        setScrollbackContent(html);
        // Strip ANSI codes for the raw textarea
        setRawScrollback(data.scrollback.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, ''));
        setIsSelectMode(false);
      } else {
        setScrollbackContent('Error loading scrollback.');
        setRawScrollback('Error loading scrollback.');
      }
    } catch (err) {
      console.error('Scrollback fetch failed', err);
      setScrollbackContent('Error loading scrollback.');
      setRawScrollback('Error loading scrollback.');
    }
  };
  const [fileItems, setFileItems] = useState([]);
  const [openFileContent, setOpenFileContent] = useState('');
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [openFilePath, setOpenFilePath] = useState('');
  
  const defaultLibrary = [
    { id: 'pre-ctrlc', label: '^C', cmd: '\x03', isPinned: true },
    { id: 'pre-esc', label: 'Esc', cmd: '\x1b', isPinned: true },
    { id: 'pre-tab', label: 'Tab', cmd: '\x09', isPinned: true },
    { id: 'pre-pgup', label: 'PgUp', cmd: '\x1b[5~', isPinned: true },
    { id: 'pre-pgdn', label: 'PgDn', cmd: '\x1b[6~', isPinned: true },
    { id: 'pre-up', label: '↑', cmd: '\x1b[A', isPinned: true },
    { id: 'pre-down', label: '↓', cmd: '\x1b[B', isPinned: true },
    { id: 'pre-left', label: '←', cmd: '\x1b[D', isPinned: true },
    { id: 'pre-right', label: '→', cmd: '\x1b[C', isPinned: true },
    { id: '1', label: 'Clear', cmd: '\x0c', isPinned: true },
    { id: '2', label: 'top', cmd: 'top\r', isPinned: true },
    { id: '3', label: 'ls', cmd: 'ls -la\r', isPinned: true },
    { id: '4', label: 'Mini Mode', cmd: 'opencode --mini\r', isPinned: false },
    { id: 'pre-mode', label: '📜 Mode', cmd: '\x02[', isPinned: true }
  ];
  const [macroLibrary, setMacroLibrary] = useState(() => {
    const saved = localStorage.getItem('aim-macro-library');
    if (saved) {
      let parsed = JSON.parse(saved);
      // Migrate missing hardcoded macros into existing user libraries
      const missingDefaults = defaultLibrary.filter(def => 
        def.id.startsWith('pre-') && !parsed.some(m => m.id === def.id)
      );
      if (missingDefaults.length > 0) {
        parsed = [...missingDefaults, ...parsed];
        localStorage.setItem('aim-macro-library', JSON.stringify(parsed));
      }
      return parsed;
    }
    const oldSaved = localStorage.getItem('aim-macros');
    if (oldSaved) {
      try {
        const oldParsed = JSON.parse(oldSaved).map((m, i) => ({
          id: `old-${i}`, label: m.label, cmd: m.cmd, isPinned: true
        }));
        return [...defaultLibrary, ...oldParsed];
      } catch (e) {}
    }
    return defaultLibrary;
  });
  
  const [showMacroLibrary, setShowMacroLibrary] = useState(false);
  const [showMacroModal, setShowMacroModal] = useState(false);
  const [editingMacroId, setEditingMacroId] = useState(null);
  const [newMacroLabel, setNewMacroLabel] = useState('');
  const [newMacroCmd, setNewMacroCmd] = useState('');
  const [newMacroIsServer, setNewMacroIsServer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [keyboardMode, setKeyboardMode] = useState(() => {
    return localStorage.getItem('aim-kb-mode') || 'standard';
  });
  const [autoCaps, setAutoCaps] = useState(() => {
    const val = localStorage.getItem('aim-kb-autocaps');
    return val !== null ? JSON.parse(val) : true;
  });
  
  const [termFontSize, setTermFontSize] = useState(() => parseInt(localStorage.getItem('aim-term-fontsize') || '14', 10));
  const [termTheme, setTermTheme] = useState(() => localStorage.getItem('aim-term-theme') || 'standard');
  const [keyboardFeedback, setKeyboardFeedback] = useState(() => localStorage.getItem('aim-kb-feedback') || 'audio');
  const terminalRef = useRef(null);
  const term = useRef(null);
  const ws = useRef(null);
  const fitAddon = useRef(null);
  const authRef = useRef(false);
  const pinRef = useRef('');
  const passwordRef = useRef('');
  const apiTokenRef = useRef(localStorage.getItem('aim-token') || null);
  
  // Auto-auth on load if token exists
  useEffect(() => {
    if (apiTokenRef.current && !isAuthenticated) {
      setIsAuthenticated(true);
      authenticate(null, null);
    }
  }, []);

  // Dynamic Viewport Height Fix for Mobile PWA
  useEffect(() => {
    const setHeight = () => {
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`);
    };
    setHeight();
    window.addEventListener('resize', setHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setHeight);
    }
    return () => {
      window.removeEventListener('resize', setHeight);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setHeight);
      }
    };
  }, []);

  // Override fetch to include token for API routes
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (resource, config = {}) => {
      if (typeof resource === 'string' && resource.startsWith('/api/') && resource !== '/api/auth' && apiTokenRef.current) {
        config.headers = {
          ...config.headers,
          'x-api-token': apiTokenRef.current
        };
      }
      return originalFetch(resource, config);
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  // Keep ref in sync
  useEffect(() => {
    authRef.current = isAuthenticated;
  }, [isAuthenticated]);
  
  useEffect(() => {
    pinRef.current = pin;
  }, [pin]);

  useEffect(() => {
    passwordRef.current = password;
  }, [password]);

  // Fetch server macros
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchServerMacros = async () => {
      try {
        const res = await fetch('/api/macros');
        const data = await res.json();
        if (Array.isArray(data)) {
          setMacroLibrary(prev => {
            const localMacros = prev.filter(m => !m.isServer);
            const serverMacros = data.map(m => ({ ...m, isServer: true }));
            const merged = [...localMacros];
            serverMacros.forEach(sm => {
              const idx = merged.findIndex(lm => lm.id === sm.id);
              if (idx >= 0) merged[idx] = sm;
              else merged.push(sm);
            });
            localStorage.setItem('aim-macro-library', JSON.stringify(merged));
            return merged;
          });
        }
      } catch (err) {
        console.error('Failed to fetch server macros', err);
      }
    };
    fetchServerMacros();
  }, [isAuthenticated]);

  // Fetch tmux sessions
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/sessions');
        const data = await res.json();
        setSessions(prev => JSON.stringify(prev) === JSON.stringify(data.sessions) ? prev : data.sessions);
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
      if (fitAddon.current) {
        setTimeout(() => {
           const dims = fitAddon.current.proposeDimensions();
           if (dims && ws.current && ws.current.readyState === WebSocket.OPEN) {
             ws.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
           }
        }, 100);
      }
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
      authenticate(pin, password);
    }
  }, [pin, password]);

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

  const handleLogout = async () => {
    if (apiTokenRef.current) {
      try {
        await window.fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-token': apiTokenRef.current
          }
        });
      } catch (e) {
        console.error("Logout failed", e);
      }
    }
    apiTokenRef.current = null;
    localStorage.removeItem('aim-token');
    setIsAuthenticated(false);
    setPin('');
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  };

  const authenticate = async (token, pass) => {
    if (token !== null && !pass) {
        setAuthError('Please enter Admin Password first');
        setPin('');
        return;
    }
    if (token && pass) {
      try {
        const res = await window.fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pass })
      });
      if (!res.ok) {
        setAuthError('Invalid or expired PIN');
        setPin('');
        return;
      }
      const data = await res.json();
      apiTokenRef.current = data.api_token;
      localStorage.setItem('aim-token', data.api_token);
    } catch (e) {
      setAuthError('Connection failed');
      setPin('');
      return;
    }
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socket.binaryType = 'arraybuffer';
    
    socket.onopen = () => {
      // Send the API token to WS, not the original PIN
      socket.send(JSON.stringify({ type: 'auth', token: apiTokenRef.current }));
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

    socket.onclose = (event) => {
      if (event.code === 1008) {
        if (term.current) term.current.writeln('\x1b[31m\n[Session expired. Please log in again.]\x1b[0m');
        setTimeout(() => {
          handleLogout();
        }, 1500);
        return;
      }
      
      if (authRef.current) {
        if (term.current) term.current.writeln('\x1b[31m\n[Connection lost. Reconnecting...]\x1b[0m');
        setTimeout(() => {
          authenticate(null, null);
        }, 1000);
      } else {
        setAuthError('Connection failed');
        setPin('');
      }
    };
  };

  const syncMacrosToServer = async (library) => {
    const serverMacros = library.filter(m => m.isServer).map(({ isServer, ...rest }) => rest);
    try {
      await fetch('/api/macros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ macros: serverMacros })
      });
    } catch (e) { console.error('Failed to sync macros to server', e); }
  };

  const toggleMacroPin = (id) => {
    const updated = macroLibrary.map(m => m.id === id ? { ...m, isPinned: !m.isPinned } : m);
    setMacroLibrary(updated);
    localStorage.setItem('aim-macro-library', JSON.stringify(updated));
    if (updated.find(m => m.id === id)?.isServer) syncMacrosToServer(updated);
  };

  const saveMacro = () => {
    if (!newMacroLabel || !newMacroCmd) return;
    const processedCmd = newMacroCmd.replace(/\\r/g, '\r').replace(/\\n/g, '\n');
    let updated;
    if (editingMacroId) {
      updated = macroLibrary.map(m => m.id === editingMacroId ? { ...m, label: newMacroLabel, cmd: processedCmd, isServer: newMacroIsServer } : m);
    } else {
      updated = [...macroLibrary, { id: Date.now().toString(), label: newMacroLabel, cmd: processedCmd, isPinned: true, isServer: newMacroIsServer }];
    }
    setMacroLibrary(updated);
    localStorage.setItem('aim-macro-library', JSON.stringify(updated));
    syncMacrosToServer(updated);
    setShowMacroModal(false);
    setNewMacroLabel('');
    setNewMacroCmd('');
    setNewMacroIsServer(false);
    setEditingMacroId(null);
  };

  const deleteMacro = (id) => {
    if (!window.confirm('Delete this macro permanently?')) return;
    const isServer = macroLibrary.find(m => m.id === id)?.isServer;
    const updated = macroLibrary.filter(m => m.id !== id);
    setMacroLibrary(updated);
    localStorage.setItem('aim-macro-library', JSON.stringify(updated));
    if (isServer) syncMacrosToServer(updated);
  };

  useEffect(() => {
    if (term.current) {
      term.current.options.fontSize = termFontSize;
      if (termTheme === 'hacker') {
        term.current.options.theme = { background: '#000000', foreground: '#00ff00', cursor: '#00ff00' };
      } else if (termTheme === 'high-contrast') {
        term.current.options.theme = { background: '#000000', foreground: '#ffffff', cursor: '#ffffff' };
      } else {
        term.current.options.theme = { background: '#0B162C', foreground: '#e2e8f0', cursor: '#ff5722' };
      }
      setTimeout(() => fitAddon.current?.fit(), 50);
    }
  }, [termFontSize, termTheme]);

  // Initialize terminal once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    term.current = new Terminal({
      cursorBlink: true,
      theme: termTheme === 'hacker' ? { background: '#000000', foreground: '#00ff00', cursor: '#00ff00' } :
             termTheme === 'high-contrast' ? { background: '#000000', foreground: '#ffffff', cursor: '#ffffff' } :
             { background: '#0B162C', foreground: '#e2e8f0', cursor: '#ff5722' },
      fontFamily: '"Fira Code", monospace',
      fontSize: termFontSize,
    });
    
    fitAddon.current = new FitAddon();
    term.current.loadAddon(fitAddon.current);

    if (terminalRef.current) {
      term.current.open(terminalRef.current);
      
      // Robust fit loop: wait for CSS flexbox to finish settling on mobile
      let fitAttempts = 0;
      const fitInterval = setInterval(() => {
        if (fitAddon.current && terminalRef.current) {
          fitAddon.current.fit();
          const dims = fitAddon.current.proposeDimensions();
          if (dims && ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
          }
        }
        fitAttempts++;
        if (fitAttempts >= 10) clearInterval(fitInterval); // Try for 1.5 seconds (150ms * 10)
      }, 150);
      
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
    };

    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddon.current) {
        fitAddon.current.fit();
        const dims = fitAddon.current.proposeDimensions();
        if (dims && ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
        }
      }
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
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
        if (isNativeScrollModeRef.current) return;
        
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
      if (term.current && term.current.textarea) {
        term.current.textarea.readOnly = showKeyboard;
        // Blur the textarea if we just enabled the custom keyboard to ensure the native one drops
        if (showKeyboard) {
          term.current.textarea.blur();
        }
      }
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

  const shouldBeListeningRef = useRef(false);
  const lastVoiceEndedWithSpace = useRef(false);

  const startDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice dictation is not supported by your browser.");
      return;
    }

    if (isListening) {
      shouldBeListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    shouldBeListeningRef.current = true;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const lastIdx = event.results.length - 1;
      let transcript = event.results[lastIdx][0].transcript;
      const lowerTrimmed = transcript.trim().toLowerCase();
      
      // Check for verbal action commands
      let isCommand = false;
      if (lowerTrimmed === "enter" && voiceAutoEnter) isCommand = true;
      if (lowerTrimmed === "send" && voiceAutoSend) isCommand = true;
      if (lowerTrimmed === "execute" && voiceAutoExecute) isCommand = true;

      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        if (isCommand) {
          ws.current.send(JSON.stringify({ type: 'input', payload: '\r' }));
          lastVoiceEndedWithSpace.current = false;
        } else {
          // Handle verbal punctuation replacements
          let finalPayload = transcript
            .replace(/\bdot dot dot\b/gi, '...')
            .replace(/\bdot dot\b/gi, '..')
            .replace(/\bcomma\b/gi, ',')
            .replace(/\bperiod\b/gi, '.')
            .replace(/\bquestion mark\b/gi, '?')
            .replace(/\bquote\s+/gi, '"')
            .replace(/\s+\bunquote\b/gi, '"')
            .replace(/\bquote\b/gi, '"')
            .replace(/\bunquote\b/gi, '"')
            // Remove spaces BEFORE punctuation like period, comma, question mark
            .replace(/\s+([.,?!])/g, '$1');
          
          let prefix = "";
          if (lastVoiceEndedWithSpace.current && /^[.,?!]/.test(finalPayload)) {
            prefix = "\b";
          }
          
          // Send a space after the transcript to make chaining easier
          ws.current.send(JSON.stringify({ type: 'input', payload: prefix + finalPayload + ' ' }));
          lastVoiceEndedWithSpace.current = true;
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      if (event.error === 'not-allowed') {
        shouldBeListeningRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // If voiceContinuous is false, let it die naturally
      if (!voiceContinuous) {
        shouldBeListeningRef.current = false;
        setIsListening(false);
        return;
      }

      if (shouldBeListeningRef.current) {
        // Browser aggressively killed it due to a pause. Restart it silently!
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const sendCommand = (cmd) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'input', payload: cmd }));
      lastVoiceEndedWithSpace.current = false;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <img src="/aim-icon.jpg" alt="A.I.M. Logo" style={{ width: '80px', height: '80px', borderRadius: '16px', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0, 255, 170, 0.2)' }} />
            <h2>A.I.M. SECURE</h2>
            <p>Enter Password & Authenticator Code</p>
          </div>
          
          <div style={{ marginBottom: '20px', width: '100%', padding: '0 20px', boxSizing: 'border-box', position: 'relative' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              className="modal-input" 
              style={{ width: '100%', textAlign: 'center', letterSpacing: '2px', padding: '12px' }}
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button 
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '30px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '4px'
              }}
            >
              {showPassword ? '🫣' : '👁️'}
            </button>
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
          {showFiles ? '💻 Terminal' : '📁 Files'}
        </button>
        {!showFiles && (
          <>
            <button 
              className="macro-btn" 
              onClick={enterNativeScrollMode}
            >
              🔍 Scroll/Copy
            </button>
            <button 
              className="macro-btn" 
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) sendCommand(text);
                } catch (e) {
                  console.error("Paste failed", e);
                }
              }}
            >
              📋 Paste
            </button>
          </>
        )}
        <button 
          className={`macro-btn ${showKeyboard ? 'active' : ''}`} 
          onClick={() => setShowKeyboard(!showKeyboard)}
        >
          ⌨️ {showKeyboard ? 'ON' : 'OFF'}
        </button>
        <button 
          className={`macro-btn action ${isListening ? 'listening' : ''}`} 
          onClick={startDictation}
          style={{ background: isListening ? '#ef4444' : undefined }}
        >
          {isListening ? '🛑' : '🎤 Voice'}
        </button>
        <button className="macro-btn" onClick={() => setShowSettings(true)}>
          ⚙️ Settings
        </button>
        <button className="macro-btn" onClick={handleLogout} style={{ color: '#ef4444', border: '1px solid #ef4444' }}>
          🚪 Logout
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
        {!showKeyboard && (
          <div className="commander-toolbar">
            <div className="macro-group">
              {macroLibrary.filter(m => m.isPinned).map((macro) => (
                <button 
                  key={macro.id} 
                  className="macro-btn action" 
                  onClick={() => sendCommand(macro.cmd)}
                  onContextMenu={(e) => { e.preventDefault(); toggleMacroPin(macro.id); }}
                >
                  {macro.isServer ? "☁️ " : "📱 "}{macro.label}
                </button>
              ))}
                <button className="macro-btn action add-macro" onClick={() => setShowMacroLibrary(true)}>⚙️</button>
            </div>
          </div>
        )}
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <div className="terminal-container" ref={terminalRef} style={{ height: '100%', pointerEvents: isNativeScrollMode ? 'none' : 'auto' }}></div>
          {isNativeScrollMode && (
             <>
                <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1001, display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setIsSelectMode(!isSelectMode)}
                    style={{ background: '#3b82f6', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    {isSelectMode ? '🎨 Color View' : '📝 Select Text'}
                  </button>
                  <button 
                    onClick={() => { setIsNativeScrollMode(false); setScrollbackContent(''); }}
                    style={{ background: '#ef4444', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    ✖ Close
                  </button>
                </div>
                <div 
                  className="native-scrollback-overlay"
                  onTouchStart={e => e.stopPropagation()}
                  onTouchMove={e => e.stopPropagation()}
                  onTouchEnd={e => e.stopPropagation()}
                  onScroll={(e) => {
                     if (isSelectMode) return; // Disable auto-exit while user is trying to select text!
                     
                     const { scrollTop, scrollHeight, clientHeight } = e.target;
                     // Only exit if they've actually scrolled up first to avoid instant-exit on mount
                     if (scrollTop + clientHeight < scrollHeight - 50) {
                         hasScrolledUpInOverlay.current = true;
                     }
                     if (hasScrolledUpInOverlay.current && scrollTop + clientHeight >= scrollHeight - 10) {
                         setIsNativeScrollMode(false);
                         setScrollbackContent('');
                     }
                  }}
                  ref={(el) => {
                    if (el && scrollbackContent && scrollbackContent !== 'Loading scrollback...' && !el.dataset.scrolled) {
                       // Pre-scroll slightly above the bottom so the initial swipe down feels natural 
                       // and doesn't instantly snap to the absolute bottom edge
                       el.scrollTop = el.scrollHeight - el.clientHeight - 30;
                       el.dataset.scrolled = "true";
                    }
                  }}
                >
                   {isSelectMode ? (
                     <div 
                       contentEditable={true}
                       suppressContentEditableWarning={true}
                       onKeyDown={e => { e.preventDefault(); return false; }}
                       style={{ 
                         width: '100%', 
                         backgroundColor: 'transparent', 
                         color: '#e2e8f0', 
                         fontFamily: 'monospace', 
                         fontSize: '14px', 
                         whiteSpace: 'pre-wrap', 
                         paddingBottom: '50px',
                         WebkitUserSelect: 'text',
                         userSelect: 'text',
                         cursor: 'text',
                         outline: 'none'
                       }}
                     >
                       {rawScrollback}
                     </div>
                   ) : (
                     <div dangerouslySetInnerHTML={{ __html: scrollbackContent }} style={{ paddingBottom: '50px' }} />
                   )}
                </div>
             </>
          )}
        </div>
        {showKeyboard && (
          <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div className="commander-toolbar" style={{ borderBottom: '1px solid #1c305c', borderTop: 'none', borderRadius: 0 }}>
              <div className="macro-group">
                {macroLibrary.filter(m => m.isPinned).map((macro) => (
                  <button 
                    key={macro.id} 
                    className="macro-btn action" 
                    onClick={() => sendCommand(macro.cmd)}
                    onContextMenu={(e) => { e.preventDefault(); toggleMacroPin(macro.id); }}
                  >
                    {macro.isServer ? "☁️ " : "📱 "}{macro.label}
                  </button>
                ))}
                <button className="macro-btn action add-macro" onClick={() => setShowMacroLibrary(true)}>⚙️</button>
              </div>
            </div>
            <Keyboard mode={keyboardMode} autoCaps={autoCaps} feedbackMode={keyboardFeedback} onKeyPress={(key) => sendCommand(key)} />
          </div>
        )}
      </div>

      {showMacroLibrary && (
        <div className="modal-overlay" onClick={() => setShowMacroLibrary(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#e2e8f0', margin: 0 }}>Macro Library</h3>
              <button className="macro-btn action add-macro" onClick={() => { setEditingMacroId(null); setNewMacroLabel(''); setNewMacroCmd(''); setNewMacroIsServer(false); setShowMacroModal(true); }}>+ New</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '60vh', overflowY: 'auto' }}>
              {macroLibrary.map(macro => (
                <div key={macro.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1c305c', padding: '8px 12px', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      type="checkbox" 
                      checked={macro.isPinned} 
                      onChange={() => toggleMacroPin(macro.id)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
                    />
                    <div>
                      <div style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '14px' }}>{macro.isServer ? "☁️ " : "📱 "}{macro.label}</div>
                      <div style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>{macro.cmd.replace(/\r/g, '\\r').replace(/\x0c/g, '\\x0c')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="macro-btn" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => {
                      setEditingMacroId(macro.id);
                      setNewMacroLabel(macro.label);
                      setNewMacroCmd(macro.cmd.replace(/\r/g, '\\r').replace(/\n/g, '\\n'));
                      setNewMacroIsServer(!!macro.isServer);
                      setShowMacroModal(true);
                    }}>✏️</button>
                    <button className="macro-btn" style={{ padding: '4px 8px', fontSize: '12px', color: '#f87171' }} onClick={() => deleteMacro(macro.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="macro-btn action" onClick={() => setShowMacroLibrary(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {showMacroModal && (
        <div className="modal-overlay" onClick={() => setShowMacroModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#e2e8f0', marginBottom: '16px' }}>{editingMacroId ? 'Edit Macro' : 'Add Custom Macro'}</h3>
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
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '12px' }}>
              Hint: Add \r to the end to auto-press Enter.
            </p>
            <div style={{marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px'}}>
              <input 
                type="checkbox" 
                checked={newMacroIsServer} 
                onChange={e => setNewMacroIsServer(e.target.checked)}
                style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
              />
              <label style={{color: '#e2e8f0', margin: 0}}>☁️ Sync to Server (Global)</label>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="macro-btn" onClick={() => setShowMacroModal(false)}>Cancel</button>
              <button className="macro-btn action" onClick={saveMacro}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{color: '#c83803', marginBottom: '16px'}}>Settings</h3>
            <div style={{marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px'}}>
              <input 
                type="checkbox" 
                checked={autoCaps} 
                onChange={e => {
                  setAutoCaps(e.target.checked);
                  localStorage.setItem('aim-kb-autocaps', JSON.stringify(e.target.checked));
                }}
                style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
              />
              <label style={{color: '#e2e8f0', margin: 0}}>Auto-Capitalization</label>
            </div>
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: '#e2e8f0'}}>Keyboard Layout</label>
              <select 
                className="modal-input" 
                value={keyboardMode}
                onChange={e => {
                  setKeyboardMode(e.target.value);
                  localStorage.setItem('aim-kb-mode', e.target.value);
                }}
              >
                <option value="standard">Standard (Alpha)</option>
                <option value="hacker">Hacker (Terminal Keys)</option>
              </select>
            </div>
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: '#e2e8f0'}}>Theme</label>
              <select 
                className="modal-input" 
                value={theme}
                onChange={e => setTheme(e.target.value)}
              >
                <option value="dark">Dark</option>
                <option value="light">Light (Coming Soon)</option>
              </select>
            </div>
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: '#e2e8f0'}}>Keyboard Feedback</label>
              <select 
                className="modal-input" 
                value={keyboardFeedback}
                onChange={e => {
                  setKeyboardFeedback(e.target.value);
                  localStorage.setItem('aim-kb-feedback', e.target.value);
                }}
              >
                <option value="audio">Audio (Ticks)</option>
                <option value="haptic">Haptic (Vibration)</option>
                <option value="off">Off (Silent)</option>
              </select>
            </div>
            <div style={{marginBottom: '16px', borderTop: '1px solid #1c305c', paddingTop: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: 'bold'}}>Terminal Settings</label>
              <div style={{marginBottom: '12px'}}>
                <label style={{display: 'flex', justifyContent: 'space-between', color: '#e2e8f0', marginBottom: '4px'}}>
                  <span>Font Size</span>
                  <span>{termFontSize}px</span>
                </label>
                <input 
                  type="range" 
                  min="10" max="24" 
                  value={termFontSize}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10);
                    setTermFontSize(val);
                    localStorage.setItem('aim-term-fontsize', val);
                  }}
                  style={{width: '100%'}}
                />
              </div>
              <div style={{marginBottom: '12px'}}>
                <label style={{display: 'block', marginBottom: '8px', color: '#e2e8f0'}}>Terminal Theme</label>
                <select 
                  className="modal-input" 
                  value={termTheme}
                  onChange={e => {
                    setTermTheme(e.target.value);
                    localStorage.setItem('aim-term-theme', e.target.value);
                  }}
                >
                  <option value="standard">Standard Dark</option>
                  <option value="high-contrast">High Contrast (B&W)</option>
                  <option value="hacker">Hacker Green</option>
                </select>
              </div>
            </div>
            <div style={{marginBottom: '16px', borderTop: '1px solid #1c305c', paddingTop: '16px'}}>
              <label style={{display: 'block', marginBottom: '12px', color: '#e2e8f0', fontWeight: 'bold'}}>Voice Dictation Settings</label>
              
              <div style={{marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px'}}>
                <input 
                  type="checkbox" 
                  checked={voiceContinuous} 
                  onChange={e => {
                    setVoiceContinuous(e.target.checked);
                    localStorage.setItem('aim-voice-continuous', JSON.stringify(e.target.checked));
                  }}
                  style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
                />
                <label style={{color: '#e2e8f0', margin: 0}}>Continuous Loop (Causes Android Beeps)</label>
              </div>

              <div style={{marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px'}}>
                <input 
                  type="checkbox" 
                  checked={voiceAutoEnter} 
                  onChange={e => {
                    setVoiceAutoEnter(e.target.checked);
                    localStorage.setItem('aim-voice-enter', JSON.stringify(e.target.checked));
                  }}
                  style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
                />
                <label style={{color: '#e2e8f0', margin: 0}}>Verbal Command: "Enter"</label>
              </div>

              <div style={{marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px'}}>
                <input 
                  type="checkbox" 
                  checked={voiceAutoSend} 
                  onChange={e => {
                    setVoiceAutoSend(e.target.checked);
                    localStorage.setItem('aim-voice-send', JSON.stringify(e.target.checked));
                  }}
                  style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
                />
                <label style={{color: '#e2e8f0', margin: 0}}>Verbal Command: "Send"</label>
              </div>

              <div style={{marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px'}}>
                <input 
                  type="checkbox" 
                  checked={voiceAutoExecute} 
                  onChange={e => {
                    setVoiceAutoExecute(e.target.checked);
                    localStorage.setItem('aim-voice-execute', JSON.stringify(e.target.checked));
                  }}
                  style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
                />
                <label style={{color: '#e2e8f0', margin: 0}}>Verbal Command: "Execute"</label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="macro-btn action" onClick={() => setShowSettings(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
