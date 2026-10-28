import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Terminal } from '@xterm/xterm';
import { AnsiUp } from 'ansi_up';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';
import './App.css';
import Keyboard from './Keyboard';
import SettingsModal from './components/SettingsModal';
import MacroLibraryModal from './components/MacroLibraryModal';
import AuthScreen from './components/AuthScreen';
import DeleteSessionModal from './components/DeleteSessionModal';
import IntegrationsModal from './components/IntegrationsModal';
import FleetSidebar from './components/FleetSidebar';
import CommandPalette from './components/CommandPalette';
import TokenGrabberModal from './components/TokenGrabberModal';
import FileExplorer from './components/FileExplorer';
import ForensicsModal from './components/ForensicsModal';
import { E2EESocketWrapper } from './e2ee';
import { authenticateWebAuthn } from './webauthn';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [e2eeSecret, setE2eeSecretState] = useState(() => localStorage.getItem('aim-e2ee-secret') || '');
  
  const setE2eeSecret = (val) => {
    setE2eeSecretState(val);
    localStorage.setItem('aim-e2ee-secret', val);
  };
  
  
  const [sessions, setSessions] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [unreadSessions, setUnreadSessions] = useState([]);
  const [waitingSessions, setWaitingSessions] = useState([]);
  const [alertChime, setAlertChime] = useState(() => {
    const val = localStorage.getItem('aim-alert-chime');
    return val !== null ? JSON.parse(val) : true;
  });
  const alertChimeRef = useRef(alertChime);
  useEffect(() => {
    alertChimeRef.current = alertChime;
  }, [alertChime]);

  const playAlertChime = (kind = 'waiting') => {
    if (!alertChimeRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const notes = kind === 'waiting' ? [587.33, 880.0] : [523.25, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.24);
      });
      setTimeout(() => {
        try { ctx.close(); } catch (e) {}
      }, 650);
    } catch (e) {
      // Ignore audio context autoplay restrictions
    }
  };
  const [showFleetSidebar, setShowFleetSidebar] = useState(() => {
    const saved = localStorage.getItem('aim-show-fleet');
    if (saved !== null) return JSON.parse(saved);
    return typeof window !== 'undefined' ? window.innerWidth >= 900 : true;
  });
  const prevStatusRef = useRef({});
  const [activeSession, setActiveSession] = useState('');
  const activeSessionRef = useRef('');
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);
  const [sessionToDelete, setSessionToDelete] = useState('');
  const [isDeleteSessionModalOpen, setIsDeleteSessionModalOpen] = useState(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showTokenGrabber, setShowTokenGrabber] = useState(false);
  const [showForensics, setShowForensics] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [fileSelectMode, setFileSelectMode] = useState(false);
  const [splitMode, setSplitMode] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [isNativeScrollMode, setIsNativeScrollMode] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const [voiceAutoRead, setVoiceAutoRead] = useState(() => JSON.parse(localStorage.getItem('aim-voice-autoread') ?? 'false'));
  const voiceAutoReadRef = useRef(voiceAutoRead);
  useEffect(() => {
    voiceAutoReadRef.current = voiceAutoRead;
  }, [voiceAutoRead]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastSpokenSummaryRef = useRef({});
  const [voiceContinuous, setVoiceContinuous] = useState(() => JSON.parse(localStorage.getItem('aim-voice-continuous') ?? 'true'));
  const [voiceAutoEnter, setVoiceAutoEnter] = useState(() => JSON.parse(localStorage.getItem('aim-voice-enter') ?? 'true'));
  const [voiceAutoExecute, setVoiceAutoExecute] = useState(() => JSON.parse(localStorage.getItem('aim-voice-execute') ?? 'true'));
  const [voiceAutoCapitalize, setVoiceAutoCapitalize] = useState(() => JSON.parse(localStorage.getItem('aim-voice-autocap') ?? 'true'));
  const [voiceSlashes, setVoiceSlashes] = useState(() => JSON.parse(localStorage.getItem('aim-voice-slashes') ?? 'false'));
  const [voiceAutoSend, setVoiceAutoSend] = useState(() => JSON.parse(localStorage.getItem('aim-voice-send') ?? 'true'));

  const speakSummaryText = (text) => {
    const cleaned = (text || '').trim();
    if (!cleaned || typeof window === 'undefined' || !window.speechSynthesis) {
      return false;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(cleaned);
      utterance.lang = 'en-US';
      utterance.rate = 1.04;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (e) {
      setIsSpeaking(false);
      return false;
    }
  };

  const handleSpeakSummary = async () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('Speech synthesis is not supported by your browser.');
      return;
    }
    if (isSpeaking || window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const targetSession = activeSessionRef.current || activeSession;
    if (!targetSession) return;

    let summaryText = '';
    try {
      const res = await fetch(`/api/scrollback/${encodeURIComponent(targetSession)}?lines=200`);
      const data = await res.json();
      if (data && data.spoken_summary) {
        summaryText = data.spoken_summary;
      }
    } catch (e) {
      // Fallback to cached fleet telemetry
    }
    if (!summaryText) {
      const fleetItem = fleet.find((f) => f.session_name === targetSession);
      summaryText = fleetItem?.spoken_summary || fleetItem?.preview || '';
    }
    if (summaryText) {
      lastSpokenSummaryRef.current[targetSession] = summaryText;
      speakSummaryText(summaryText);
    }
  };
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
      const res = await fetch(`/api/scrollback/${encodeURIComponent(activeSession)}`);
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
    { id: 'pre-bksp', label: 'Bksp', cmd: '\x7f', isPinned: true, voiceTrigger: 'backspace' },
    { id: 'pre-delword', label: 'Del Word', cmd: '\x17', isPinned: true, voiceTrigger: 'delete word' },
    { id: 'pre-pgup', label: 'PgUp', cmd: '\x1b[5~', isPinned: true },
    { id: 'pre-pgdn', label: 'PgDn', cmd: '\x1b[6~', isPinned: true },
    { id: 'pre-up', label: '↑', cmd: '\x1b[A', isPinned: true },
    { id: 'pre-down', label: '↓', cmd: '\x1b[B', isPinned: true },
    { id: 'pre-left', label: '←', cmd: '\x1b[D', isPinned: true },
    { id: 'pre-right', label: '→', cmd: '\x1b[C', isPinned: true },
    { id: 'pre-dropdown', label: 'Drop Down', cmd: '\\\r', isPinned: true, voiceTrigger: 'drop down' },
    { id: 'pre-submit', label: 'Submit', cmd: '\r', isPinned: true, voiceTrigger: 'submit' },
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
  
  const macroLibraryRef = useRef(macroLibrary);
  useEffect(() => {
    macroLibraryRef.current = macroLibrary;
  }, [macroLibrary]);

  const [showMacroLibrary, setShowMacroLibrary] = useState(false);
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
  const harnessRef = useRef('admin');
  const apiTokenRef = useRef(localStorage.getItem('aim-token') || null);
  const reconnectAttempts = useRef(0);
  const [connState, setConnState] = useState('disconnected');
  const editorRef = useRef(null);
  const searchAddon = useRef(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Auto-auth on load if token exists
  useEffect(() => {
    if (apiTokenRef.current && !isAuthenticated) {
      setIsAuthenticated(true);
      const urlParams = new URLSearchParams(window.location.search);
      const harnessFromUrl = urlParams.get('harness') || 'admin';
      authenticate(null, null, harnessFromUrl);
    }
  }, []);

  // Dynamic Viewport Height Fix for Mobile PWA (debounced for iOS Safari)
  useEffect(() => {
    let viewportTimeout;
    const setHeight = () => {
      clearTimeout(viewportTimeout);
      viewportTimeout = setTimeout(() => {
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`);
        if (window.visualViewport) {
          document.body.style.height = `${window.visualViewport.height}px`;
        }
        // Refit terminal after viewport settles
        if (fitAddon.current) {
          try { fitAddon.current.fit(); } catch (e) { /* terminal not ready */ }
        }
      }, 150);
    };
    const handleOrientation = () => {
      // iOS needs ~300ms to finish the rotation animation
      setTimeout(setHeight, 350);
    };
    setHeight();
    window.addEventListener('resize', setHeight);
    window.addEventListener('orientationchange', handleOrientation);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setHeight);
    }
    return () => {
      clearTimeout(viewportTimeout);
      window.removeEventListener('resize', setHeight);
      window.removeEventListener('orientationchange', handleOrientation);
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

  // Fetch tmux sessions + fleet telemetry (#209)
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/sessions');
        const data = await res.json();
        if (Array.isArray(data.sessions)) {
          setSessions(prev => JSON.stringify(prev) === JSON.stringify(data.sessions) ? prev : data.sessions);
        }
        if (Array.isArray(data.fleet)) {
          setFleet(data.fleet);
          // Detect THINKING -> IDLE transitions on background sessions & WAITING permission alerts (#220)
          const newlyCompleted = [];
          let triggeredWaiting = false;
          const currWaiting = [];
          data.fleet.forEach((item) => {
            const prevSt = prevStatusRef.current[item.session_name];
            if (item.status === 'WAITING') {
              currWaiting.push(item.session_name);
              if (prevSt && prevSt !== 'WAITING') {
                triggeredWaiting = true;
              }
            }
            if (prevSt === 'THINKING' && item.status === 'IDLE' && item.session_name !== activeSession) {
              newlyCompleted.push(item.session_name);
            }
            const currSummary = item.spoken_summary || '';
            const prevSummary = lastSpokenSummaryRef.current[item.session_name];
            if (prevSummary === undefined) {
              lastSpokenSummaryRef.current[item.session_name] = currSummary;
            } else if (item.status !== 'THINKING' && currSummary) {
              const turnFinished = prevSt === 'THINKING' && (item.status === 'IDLE' || item.status === 'WAITING');
              if (currSummary !== prevSummary || turnFinished) {
                lastSpokenSummaryRef.current[item.session_name] = currSummary;
                if (item.session_name === activeSession && voiceAutoReadRef.current) {
                  speakSummaryText(currSummary);
                }
              }
            }
            prevStatusRef.current[item.session_name] = item.status;
          });
          setWaitingSessions(currWaiting);
          if (triggeredWaiting) {
            playAlertChime('waiting');
          } else if (newlyCompleted.length > 0) {
            playAlertChime('done');
          }
          if (newlyCompleted.length > 0) {
            setUnreadSessions((prev) => Array.from(new Set([...prev, ...newlyCompleted])));
          }
        }
        // Do not auto-assign activeSession to force the Welcome Screen on login
      } catch (err) {
        console.error(err);
      }
    };
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeSession]);

  const toggleFleetSidebar = () => {
    setShowFleetSidebar((prev) => {
      const next = !prev;
      localStorage.setItem('aim-show-fleet', JSON.stringify(next));
      setTimeout(() => {
        if (fitAddon.current) {
          try { fitAddon.current.fit(); } catch (e) {}
        }
      }, 80);
      return next;
    });
  };

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
      setSessions(data.sessions || []);
      if (Array.isArray(data.fleet)) setFleet(data.fleet);
      setActiveSession(name);
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'switch_session', session: name }));
      }
    } catch (e) { console.error(e); }
  };

  const killSession = async (targetName) => {
    const target = typeof targetName === 'string' && targetName ? targetName : activeSession;
    if (!target) return;
    setSessionToDelete(target);
    setIsDeleteSessionModalOpen(true);
  };

  const confirmKillSession = async (sessionToKill) => {
    setIsDeleteSessionModalOpen(false);
    setSessionToDelete('');
    if (!sessionToKill) return;
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      const otherSessions = (data.sessions || []).filter(s => s !== sessionToKill);
      
      // Only switch activeSession if we are killing the currently attached session
      if (sessionToKill === activeSession) {
        if (otherSessions.length > 0) {
          const nextSession = otherSessions[0];
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'switch_session', session: nextSession }));
          }
          setActiveSession(nextSession);
        } else {
          setActiveSession('');
        }
      }
      
      // Give tmux a millisecond to switch clients, then kill the original session and its workspace
      setTimeout(async () => {
        await fetch(`/api/sessions/${encodeURIComponent(sessionToKill)}?delete_workspace=false`, { method: 'DELETE' });
        const finalRes = await fetch('/api/sessions');
        const finalData = await finalRes.json();
        setSessions(finalData.sessions || []);
        if (Array.isArray(finalData.fleet)) setFleet(finalData.fleet);
      }, 100);
      
    } catch (e) { console.error(e); }
  };

  const switchToSession = (newSession) => {
    if (!newSession) {
      setActiveSession('');
      setShowFiles(false);
      setFileSelectMode(false);
      setIsNativeScrollMode(false);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setShowFleetSidebar(false);
      }
      return;
    }
    setActiveSession(newSession);
    setUnreadSessions((prev) => prev.filter((s) => s !== newSession));
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

  const handleSessionSwitch = (e) => {
    switchToSession(e.target.value);
  };

  const sendSessionCommand = async (sessionName, command) => {
    const res = await fetch(`/api/sessions/${encodeURIComponent(sessionName)}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    if (!res.ok) {
      throw new Error(`Command injection failed: ${res.status}`);
    }
    return res.json();
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
      authenticate(pin, password, 'admin');
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

  const handleWebAuthnLogin = (token, passedE2eeSecret) => {
    apiTokenRef.current = token;
    localStorage.setItem('aim-token', token);
    if (passedE2eeSecret !== undefined) {
      setE2eeSecret(passedE2eeSecret);
    }
    setAuthError('');
    authenticate(null, null, 'admin'); // proceed to WS connection
  };

  const authenticate = async (token, pass, harness = 'admin') => {
    if (token !== null && (!pass || !passphrase)) {
        setAuthError(!passphrase ? 'Please enter Name first' : 'Please enter Admin Password first');
        setPin('');
        return;
    }
    
    // Store the harness to pass to the WS later
    harnessRef.current = harness;
    
    if (token && pass) {
      try {
        const res = await window.fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pass, passphrase })
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
    
    const rawSocket = new WebSocket(wsUrl);
    rawSocket.binaryType = 'arraybuffer';
    
    const socket = new E2EESocketWrapper(rawSocket, e2eeSecret);
    socket.init();
    
    let pingInterval;

    socket.onopen = () => {
      // Send the API token to WS, not the original PIN, plus current activeSession on reconnect (#217)
      socket.send(
        JSON.stringify({
          type: 'auth',
          token: apiTokenRef.current,
          harness: harnessRef.current,
          session: activeSessionRef.current || undefined,
        })
      );
    };

    socket.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'auth_success') {
            ws.current = socket;
            authRef.current = true;
            reconnectAttempts.current = 0;
            setConnState('connected');
            setIsAuthenticated(true);
            if (activeSessionRef.current) {
              socket.send(
                JSON.stringify({
                  type: 'switch_session',
                  session: activeSessionRef.current,
                })
              );
            }
            
            // Keep-alive ping every 10s to prevent aggressive proxy timeouts
            pingInterval = setInterval(() => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'ping' }));
              }
            }, 10000);
            return;
          } else if (msg.type === 'auth_failed') {
            setAuthError('Invalid or expired PIN');
            setPin('');
            socket.close();
            return;
          } else if (msg.type === 'error') {
            if (authRef.current && term.current) {
              term.current.writeln('\x1b[31m[!] ' + (msg.message || 'Error') + '\x1b[0m');
            }
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
      if (pingInterval) clearInterval(pingInterval);
      if (event.code === 1008) {
        if (term.current) term.current.writeln('\x1b[31m\n[Session expired. Please log in again.]\x1b[0m');
        setConnState('disconnected');
        setTimeout(() => {
          handleLogout();
        }, 1500);
        return;
      }
      
      if (authRef.current) {
        const MAX_RECONNECT = 5;
        const BASE_DELAY = 1000;
        reconnectAttempts.current++;
        
        if (reconnectAttempts.current > MAX_RECONNECT) {
          if (term.current) term.current.writeln('\x1b[31m\n[Connection lost. Max retries exceeded. Returning to login.]\x1b[0m');
          setConnState('disconnected');
          setTimeout(() => handleLogout(), 2000);
          return;
        }
        
        const delay = BASE_DELAY * Math.pow(2, reconnectAttempts.current - 1);
        setConnState('reconnecting');
        if (term.current) term.current.writeln(`\x1b[33m\n[Reconnecting... attempt ${reconnectAttempts.current}/${MAX_RECONNECT} (${delay/1000}s)]\x1b[0m`);
        setTimeout(() => authenticate(null, null), delay);
      } else {
        setConnState('disconnected');
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

  const saveMacro = (editingId, label, cmd, voiceTrigger, isServer) => {
    if (!label || !cmd) return;
    let updated;
    if (editingId) {
      updated = macroLibrary.map(m => m.id === editingId ? { ...m, label, cmd, voiceTrigger, isServer } : m);
    } else {
      updated = [...macroLibrary, { id: Date.now().toString(), label, cmd, voiceTrigger, isPinned: true, isServer }];
    }
    setMacroLibrary(updated);
    localStorage.setItem('aim-macro-library', JSON.stringify(updated));
    syncMacrosToServer(updated);
  };

  const deleteMacro = (id) => {
    if (!window.confirm('Delete this macro permanently?')) return;
    const isServer = macroLibrary.find(m => m.id === id)?.isServer;
    const updated = macroLibrary.filter(m => m.id !== id);
    setMacroLibrary(updated);
    localStorage.setItem('aim-macro-library', JSON.stringify(updated));
    if (isServer) syncMacrosToServer(updated);
  };

  const importMacros = (importedMacros, mode) => {
    let updated;
    if (mode === 'replace') {
      updated = importedMacros.map(m => ({ ...m, id: m.id || Date.now().toString() + Math.random() }));
    } else {
      // Merge: skip duplicates by label
      const existing = [...macroLibrary];
      importedMacros.forEach(m => {
        if (!existing.some(e => e.label === m.label)) {
          existing.push({ ...m, id: m.id || Date.now().toString() + Math.random() });
        }
      });
      updated = existing;
    }
    setMacroLibrary(updated);
    localStorage.setItem('aim-macro-library', JSON.stringify(updated));
    syncMacrosToServer(updated);
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
    searchAddon.current = new SearchAddon();
    term.current.loadAddon(searchAddon.current);

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

    term.current.writeln('');
    term.current.writeln('\x1b[1;36m      :::::::::::  ::::::::   ::::::::  :::    ::: :::    :::     :::     \x1b[0m');
    term.current.writeln('\x1b[1;36m          :+:     :+:    :+: :+:    :+: :+:    :+: :+:    :+:   :+: :+:   \x1b[0m');
    term.current.writeln('\x1b[1;36m          +:+     +:+    +:+ +:+        +:+    +:+ +:+    +:+  +:+   +:+  \x1b[0m');
    term.current.writeln('\x1b[1;36m          +#+     +#+    +:+ +#++:++#++ +#++:++#++ +#+    +:+ +#++:++#++: \x1b[0m');
    term.current.writeln('\x1b[1;36m          +#+     +#+    +#+        +#+ +#+    +#+ +#+    +#+ +#+     +#+ \x1b[0m');
    term.current.writeln('\x1b[1;36m      #+# #+#     #+#    #+# #+#    #+# #+#    #+# #+#    #+# #+#     #+# \x1b[0m');
    term.current.writeln('\x1b[1;36m       #####       ########   ########  ###    ###  ########  ###     ### \x1b[0m');
    term.current.writeln('');
    term.current.writeln('\x1b[1;34m    A.I.M. SOVEREIGN NODE - TERMINAL INTERFACE\x1b[0m');
    term.current.writeln('\x1b[90m    ===========================================\x1b[0m');
    term.current.writeln('\x1b[32m    [+] Connection Established\x1b[0m');
    term.current.writeln('\x1b[32m    [+] E2EE Handshake Verified\x1b[0m');
    term.current.writeln('\x1b[32m    [+] Primary Node Initialized\x1b[0m');
    term.current.writeln('');
    term.current.writeln('\x1b[37m    Welcome, Operator. The Sovereign AI is ready.\x1b[0m');
    term.current.writeln('');
    term.current.onData((data) => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        // Intercept multi-line pastes (either raw or xterm bracketed \x1b[200~...\x1b[201~)
        // so tmux load-buffer + paste-buffer -p -r handles them without firing Enter on newlines (#216)
        if (data.startsWith('\x1b[200~') && data.endsWith('\x1b[201~')) {
          const inner = data.slice(6, -6).replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n+$/, '');
          if (inner) {
            ws.current.send(
              JSON.stringify({
                type: 'paste',
                payload: inner,
                session: activeSessionRef.current,
              })
            );
          }
          return;
        }
        if (data.length > 1 && (data.includes('\n') || data.includes('\r')) && !data.startsWith('\x1b')) {
          const cleaned = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n+$/, '');
          if (cleaned) {
            ws.current.send(
              JSON.stringify({
                type: 'paste',
                payload: cleaned,
                session: activeSessionRef.current,
              })
            );
          }
          return;
        }
        ws.current.send(JSON.stringify({ type: 'input', payload: data }));
      }
    });

    // Intercept Cmd+K / Ctrl+K inside xterm.js so it opens CommandPalette instead of sending ^K (#210)
    term.current.attachCustomKeyEventHandler((ev) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') {
        if (ev.type === 'keydown') {
          ev.preventDefault();
          setShowCommandPalette((prev) => !prev);
        }
        return false;
      }
      return true;
    });

    const handleGlobalKeyDown = (ev) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') {
        ev.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);

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
      window.removeEventListener('keydown', handleGlobalKeyDown);
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

  // Force layout recalculation when switching sessions
  useEffect(() => {
    if (activeSession && fitAddon.current && ws.current && ws.current.readyState === WebSocket.OPEN) {
      setTimeout(() => {
        fitAddon.current.fit();
        const dims = fitAddon.current.proposeDimensions();
        if (dims) {
          ws.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
        }
      }, 100);
    }
  }, [activeSession]);

  const shouldBeListeningRef = useRef(false);
  const lastVoiceEndedWithSpace = useRef(false);
  const lastVoiceEndedSentence = useRef(true);

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
    lastVoiceEndedWithSpace.current = false;
    lastVoiceEndedSentence.current = true; // Always capitalize the first word of a brand new dictation session
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const lastIdx = event.results.length - 1;
      let transcript = event.results[lastIdx][0].transcript;
      const lowerTrimmed = transcript.trim().toLowerCase();
      
      // Check for Macro Voice Triggers first
      const matchingMacro = macroLibraryRef.current?.find(m => m.voiceTrigger && m.voiceTrigger.toLowerCase() === lowerTrimmed);
      
      // Check for verbal action commands
      let isEnterCommand = false;
      let isSubmitCommand = false;
      if (lowerTrimmed === "enter" && voiceAutoEnter) isEnterCommand = true;
      if (lowerTrimmed === "send" && voiceAutoSend) isSubmitCommand = true;
      if (lowerTrimmed === "execute" && voiceAutoExecute) isSubmitCommand = true;

      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        if (matchingMacro) {
          // If a macro Voice Trigger is matched, execute its payload exactly like clicking the macro button
          ws.current.send(JSON.stringify({ type: 'input', payload: matchingMacro.cmd }));
          lastVoiceEndedWithSpace.current = false;
          lastVoiceEndedSentence.current = true;
        } else if (isSubmitCommand) {
          ws.current.send(JSON.stringify({ type: 'input', payload: '\r' })); // Send Carriage Return for AGY UI
          lastVoiceEndedWithSpace.current = false;
          lastVoiceEndedSentence.current = true;
        } else if (isEnterCommand) {
          ws.current.send(JSON.stringify({ type: 'input', payload: '\r' }));
          lastVoiceEndedWithSpace.current = false;
          lastVoiceEndedSentence.current = true;
        } else {
          // Handle verbal punctuation replacements
          // Collapse multiple spaces into single space before doing replacements
          let finalPayload = transcript.trim().replace(/\s+/g, ' ');

          // If auto-capitalize is on, and the previous payload ended with a sentence terminator
          if (voiceAutoCapitalize && lastVoiceEndedSentence.current) {
            finalPayload = finalPayload.trimStart();
            finalPayload = finalPayload.charAt(0).toUpperCase() + finalPayload.slice(1);
          }

          if (voiceSlashes) {
            finalPayload = finalPayload
              // CRITICAL: Backslash MUST be processed before slash to prevent "back slash" becoming "back/"
              .replace(/\s*\bback\s?slash\b\s*/gi, '\\')
              .replace(/\s*\b(?:forward\s)?slash\b\s*/gi, '/')
              .replace(/\s*\bdash\b\s*/gi, '-');
          }

          finalPayload = finalPayload
            .replace(/\bdot dot dot\b/gi, '...')
            .replace(/\bdot dot\b/gi, '..')
            .replace(/\bcomma\b/gi, ',')
            .replace(/\bperiod\b/gi, '.')
            .replace(/\bquestion mark\b/gi, '?')
            // Parentheses fixes: OPEN paren eats trailing space, preserves leading. CLOSE paren eats leading space, preserves trailing.
            .replace(/\b(?:open|left)\s+paren(?:thesis)?\b\s*/gi, '(')
            .replace(/\s*\b(?:close|right)\s+paren(?:thesis)?\b/gi, ')')
            // Quote fixes: OPEN quote ("quote") eats trailing space. CLOSE quote ("unquote") eats leading space.
            .replace(/\bquote\b\s*/gi, '"')
            .replace(/\s*\bunquote\b/gi, '"')
            // Remove spaces BEFORE punctuation like period, comma, question mark
            .replace(/\s+([.,?!])/g, '$1');

          // IN-CHUNK AUTO-CAPITALIZATION: If auto-capitalize is on, ensure any word immediately following a sentence terminator inside the same chunk gets capitalized.
          if (voiceAutoCapitalize) {
            finalPayload = finalPayload.replace(/([.?!])\s+([a-z])/g, (match, p1, p2) => p1 + ' ' + p2.toUpperCase());
          }
          
          let prefix = "";
          if (lastVoiceEndedWithSpace.current) {
            const startsWithPunctuation = /^[.,?!)]/.test(finalPayload.trimStart());
            const startsWithUnquote = finalPayload.startsWith('"') && lowerTrimmed.startsWith('unquote');
            if (startsWithPunctuation || startsWithUnquote) {
              prefix = "\b";
            }
          }
          
          // Determine if we should append a trailing space for the NEXT chunk.
          // We SHOULD NOT append a trailing space if the payload ends with an OPENING symbol: "(", "/", "\", "-", or "quote"
          let appendSpace = " ";
          if (finalPayload.endsWith('(') || finalPayload.endsWith('/') || finalPayload.endsWith('\\') || finalPayload.endsWith('-')) {
            appendSpace = "";
          }
          if (finalPayload.endsWith('"') && lowerTrimmed.endsWith('quote') && !lowerTrimmed.endsWith('unquote')) {
            appendSpace = "";
          }
          
          // Send a space after the transcript to make chaining easier
          ws.current.send(JSON.stringify({ type: 'input', payload: prefix + finalPayload + appendSpace }));
          
          lastVoiceEndedWithSpace.current = (appendSpace === " ");
          // Determine if this dictation segment ended with a sentence terminator
          lastVoiceEndedSentence.current = /[.?!]\s*$/.test(finalPayload) || /[.?!]$/.test(finalPayload.trimEnd());
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      const hard = ["not-allowed", "network", "service-not-allowed", "audio-capture", "language-not-supported"];
      if (hard.includes(event.error)) {
        shouldBeListeningRef.current = false;
        setIsListening(false);
        const msg = {
          "not-allowed": "Microphone permission denied. Allow mic for this site and try again.",
          "network": "Voice recognition failed (network/service). Brave often cannot use Web Speech — try Chrome or Edge.",
          "service-not-allowed": "This browser blocks speech recognition. Try Chrome or Edge.",
          "audio-capture": "Could not capture microphone audio.",
          "language-not-supported": "Speech language not supported in this browser."
        }[event.error] || `Voice error: ${event.error}`;
        alert(msg);
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

  const pasteToTerminal = (rawText) => {
    if (!rawText) return;
    const cleaned = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n+$/, '');
    if (!cleaned) return;
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: 'paste',
          payload: cleaned,
          session: activeSessionRef.current || activeSession,
        })
      );
      lastVoiceEndedWithSpace.current = false;
    }
  };

  if (!isAuthenticated) {
    return (
      <AuthScreen
        passphrase={passphrase} setPassphrase={setPassphrase}
        password={password} setPassword={setPassword}
        showPassword={showPassword} setShowPassword={setShowPassword}
        pin={pin} authError={authError}
        e2eeSecret={e2eeSecret} setE2eeSecret={setE2eeSecret}
        onPinInput={handlePinInput}
        onBackspace={handleBackspace}
        onPasteClick={handlePasteClick}
        onWebAuthnLogin={handleWebAuthnLogin}
      />
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <button
          className={`macro-btn ${showFleetSidebar ? 'action' : ''}`}
          onClick={toggleFleetSidebar}
          title="Toggle Multi-Session Fleet Sidebar"
          style={{ position: 'relative' }}
        >
          🧭 Fleet ({sessions.length})
          {unreadSessions.length > 0 && (
            <span className="fleet-header-unread-dot" title={`${unreadSessions.length} unread completed session(s)`}>
              {unreadSessions.length}
            </span>
          )}
        </button>
        <h1
          onClick={() => switchToSession('')}
          style={{ cursor: 'pointer' }}
          title="Return to A.I.M. Connect Welcome Screen"
        >
          aim-connect
        </h1>
        {activeSession && (
          <span
            className="fleet-branch-badge"
            style={{ color: '#e2e8f0', border: '1px solid #2a4a7f', padding: '3px 8px', fontSize: '11px' }}
            title="Active tmux session"
          >
            ⚡ {activeSession}
          </span>
        )}
        {waitingSessions.length > 0 && (
          <button
            className="macro-btn header-waiting-alert-btn"
            onClick={() => switchToSession(waitingSessions[0])}
            title={`Agent waiting for permission or input: ${waitingSessions.join(', ')}`}
          >
            ✋ {waitingSessions.length} Waiting
          </button>
        )}
        <button className="macro-btn" onClick={() => setIsIntegrationsModalOpen(true)} title="Integrations Vault">
          🔌
        </button>
        <button
          className={`macro-btn ${showFiles ? 'action' : ''}`}
          onClick={() => {
            setShowFiles((prev) => !prev);
            setTimeout(() => {
              try { fitAddon.current?.fit(); } catch (e) {}
            }, 80);
          }}
          title="Toggle File Explorer, Brain (HANDOFF.md / memory-wiki/), and Git DiffEditor"
        >
          {showFiles ? (splitMode ? '◫ Split' : '💻 Terminal') : '📁 Files'}
        </button>
        <button
          className="macro-btn action"
          onClick={() => setShowCommandPalette(true)}
          title="Open Command Palette (Cmd+K / Ctrl+K)"
        >
          ⌘K
        </button>
        <button
          className="macro-btn"
          onClick={() => setShowTokenGrabber(true)}
          title="Extract URLs, Paths, IPs, and Git SHAs from Scrollback"
        >
          🔗 Grab
        </button>
        <button
          className="macro-btn"
          onClick={() => setShowForensics(true)}
          title="Open On-Demand Forensic Tool Inspector, SQLite FTS5 Search & Swarm Feed"
        >
          🔬 Forensics
        </button>
            <button 
              className={`macro-btn ${(showFiles ? fileSelectMode : isNativeScrollMode) ? 'action' : ''}`}
              onClick={() => {
                if (showFiles) {
                  setFileSelectMode((prev) => !prev);
                } else {
                  enterNativeScrollMode();
                }
              }}
            >
              🔍 Scroll/Copy
            </button>
            <button 
              className="macro-btn" 
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) pasteToTerminal(text);
                } catch (e) {
                  console.error("Paste failed", e);
                }
              }}
            >
              📋 Paste
            </button>
            <button 
              className="macro-btn" 
              onClick={() => setShowSearch(!showSearch)}
            >
              🔎 Find
            </button>
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
        <button
          className={`macro-btn action ${isSpeaking ? 'listening' : ''}`}
          onClick={handleSpeakSummary}
          disabled={!activeSession}
          title={
            isSpeaking
              ? 'Stop speaking summary'
              : `Speak latest 🔊 agent summary${voiceAutoRead ? ' (Auto-Playback ON)' : ' (Manual Mode)'}`
          }
          style={{
            background: isSpeaking ? '#ef4444' : undefined,
            opacity: activeSession ? 1 : 0.5,
          }}
        >
          {isSpeaking ? '🔇 Stop' : (voiceAutoRead ? '🔊 Auto' : '🔊 Speak')}
        </button>
        <button className="macro-btn" onClick={() => setShowSettings(true)}>
          ⚙️ Settings
        </button>
        <button className="macro-btn" onClick={handleLogout} style={{ color: '#ef4444', border: '1px solid #ef4444' }}>
          🚪 Logout
        </button>
        <div className={`status-indicator ${connState}`}></div>
      </header>
      
      <div className="cockpit-body">
        <FleetSidebar
          isOpen={showFleetSidebar}
          onClose={toggleFleetSidebar}
          sessions={sessions}
          fleet={fleet}
          activeSession={activeSession}
          unreadSessions={unreadSessions}
          onSelectSession={switchToSession}
          onCreateSession={createSession}
          onKillSession={killSession}
          onSendSessionCommand={sendSessionCommand}
        />

      <div style={{ display: (!showFiles || splitMode) ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0 }}>
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
          {showSearch && (
            <div className="search-bar">
              <input
                type="text"
                className="search-input"
                placeholder="Search terminal..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (e.shiftKey) searchAddon.current?.findPrevious(searchTerm);
                    else searchAddon.current?.findNext(searchTerm);
                  }
                  if (e.key === 'Escape') { setShowSearch(false); setSearchTerm(''); }
                }}
                autoFocus
              />
              <button className="search-btn" onClick={() => searchAddon.current?.findPrevious(searchTerm)}>▲</button>
              <button className="search-btn" onClick={() => searchAddon.current?.findNext(searchTerm)}>▼</button>
              <button className="search-btn search-close" onClick={() => { setShowSearch(false); setSearchTerm(''); }}>✖</button>
            </div>
          )}
          { !activeSession && (
            <div className="welcome-screen" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 50, background: termTheme === 'hacker' || termTheme === 'high-contrast' ? '#000000' : '#0B162C', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e2e8f0', padding: '20px', textAlign: 'center', userSelect: 'none' }}>
              <div style={{ marginBottom: '24px', opacity: 0.9 }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5"></polyline>
                  <line x1="12" y1="19" x2="20" y2="19"></line>
                </svg>
              </div>
              <h2 style={{ color: '#e2e8f0', marginBottom: '12px', fontSize: '24px', fontWeight: '600' }}>Welcome to A.I.M. Connect</h2>
              <p style={{ maxWidth: '400px', lineHeight: '1.6', fontSize: '15px', color: '#94a3b8', marginBottom: '32px' }}>
                You are securely authenticated, but no workspace is active in your viewport.
              </p>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '20px 24px', borderRadius: '12px', border: '1px solid #1e293b', textAlign: 'left' }}>
                <p style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '12px', color: '#cbd5e1' }}>
                  <span style={{ fontSize: '20px' }}>🧭</span> 
                  <span>Select an existing session from the <strong>Fleet Sidebar</strong> (or press <strong>⌘K</strong>).</span>
                </p>
                <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', color: '#cbd5e1' }}>
                  <span style={{ fontSize: '20px' }}>➕</span> 
                  <span>Tap <strong>+ New</strong> in the Fleet Sidebar to spawn a brand new isolated workspace.</span>
                </p>
              </div>
              <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #1e293b', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '18px', fontWeight: '500', letterSpacing: '0.5px' }}>Own your stack. Don't rent a seat.</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' }}>
                  A.I.M. Connect is proudly 100% ad-free and open-source. If this tool helps you take back control, consider <a href="https://buymeacoffee.com/brianv1981" target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>buying me a coffee ☕</a> to keep the servers humming.
                </p>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px' }}>
                  <a href="https://github.com/BrianV1981/aim-connect" target="_blank" rel="noreferrer" style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px', fontWeight: '500', transition: 'color 0.2s' }}>[ GitHub ]</a>
                  <a href="https://github.com/BrianV1981/aim-ecosystem" target="_blank" rel="noreferrer" style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px', fontWeight: '500', transition: 'color 0.2s' }}>[ A.I.M. Ecosystem ]</a>
                </div>
              </div>
            </div>
          )}
          
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
      </div>

      <FileExplorer
        isOpen={showFiles}
        activeSession={activeSession}
        splitMode={splitMode}
        selectMode={fileSelectMode}
        onToggleSelectMode={() => setFileSelectMode((prev) => !prev)}
        onToggleSplitMode={() => {
          setSplitMode((prev) => !prev);
          setTimeout(() => {
            try { fitAddon.current?.fit(); } catch (e) {}
          }, 80);
        }}
        onClose={() => {
          setShowFiles(false);
          setFileSelectMode(false);
          setTimeout(() => {
            try { fitAddon.current?.fit(); } catch (e) {}
          }, 80);
        }}
        editorRef={editorRef}
      />
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
            <Keyboard mode={keyboardMode} autoCaps={autoCaps} feedbackMode={keyboardFeedback} onKeyPress={(key) => {
              if (showFiles && isEditingFile && editorRef.current) {
                const editor = editorRef.current;
                if (key === '\x7f') {
                  editor.trigger('keyboard', 'deleteLeft');
                } else if (key === '\r') {
                  editor.trigger('keyboard', 'type', { text: '\n' });
                } else if (key === '\x1b[A') {
                  editor.trigger('keyboard', 'cursorUp');
                } else if (key === '\x1b[B') {
                  editor.trigger('keyboard', 'cursorDown');
                } else if (key === '\x1b[C') {
                  editor.trigger('keyboard', 'cursorRight');
                } else if (key === '\x1b[D') {
                  editor.trigger('keyboard', 'cursorLeft');
                } else if (!key.startsWith('\x1b')) {
                  editor.trigger('keyboard', 'type', { text: key });
                }
                editor.focus();
              } else {
                sendCommand(key);
              }
            }} />
          </div>
        )}

      {showMacroLibrary && (
        <MacroLibraryModal
          macroLibrary={macroLibrary}
          onToggleMacroPin={toggleMacroPin}
          onSaveMacro={saveMacro}
          onDeleteMacro={deleteMacro}
          onImportMacros={importMacros}
          onClose={() => setShowMacroLibrary(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          autoCaps={autoCaps} setAutoCaps={setAutoCaps}
          keyboardMode={keyboardMode} setKeyboardMode={setKeyboardMode}
          theme={theme} setTheme={setTheme}
          keyboardFeedback={keyboardFeedback} setKeyboardFeedback={setKeyboardFeedback}
          alertChime={alertChime} setAlertChime={setAlertChime}
          termFontSize={termFontSize} setTermFontSize={setTermFontSize}
          termTheme={termTheme} setTermTheme={setTermTheme}
          voiceAutoRead={voiceAutoRead} setVoiceAutoRead={setVoiceAutoRead}
          voiceContinuous={voiceContinuous} setVoiceContinuous={setVoiceContinuous}
          voiceAutoEnter={voiceAutoEnter} setVoiceAutoEnter={setVoiceAutoEnter}
          voiceAutoSend={voiceAutoSend} setVoiceAutoSend={setVoiceAutoSend}
          voiceAutoExecute={voiceAutoExecute} setVoiceAutoExecute={setVoiceAutoExecute}
          voiceAutoCapitalize={voiceAutoCapitalize} setVoiceAutoCapitalize={setVoiceAutoCapitalize}
          voiceSlashes={voiceSlashes} setVoiceSlashes={setVoiceSlashes}
          apiToken={apiTokenRef.current}
          e2eeSecret={e2eeSecret} setE2eeSecret={setE2eeSecret}
        />
      )}

      <DeleteSessionModal 
        isOpen={isDeleteSessionModalOpen} 
        onClose={() => {
          setIsDeleteSessionModalOpen(false);
          setSessionToDelete('');
        }} 
        onConfirm={confirmKillSession}
        sessionName={sessionToDelete || activeSession}
      />
      
      <IntegrationsModal
        isOpen={isIntegrationsModalOpen}
        onClose={() => setIsIntegrationsModalOpen(false)}
        activeSession={activeSession}
      />

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        sessions={sessions}
        fleet={fleet}
        activeSession={activeSession}
        macroLibrary={macroLibrary}
        onSelectSession={switchToSession}
        onCreateSession={createSession}
        onKillSession={killSession}
        onSendSessionCommand={sendSessionCommand}
        onSendRawCommand={sendCommand}
        onToggleFiles={() => setShowFiles((prev) => !prev)}
        onToggleFleetSidebar={toggleFleetSidebar}
        onOpenTokenGrabber={() => setShowTokenGrabber(true)}
        onOpenForensics={() => setShowForensics(true)}
        onEnterScrollMode={enterNativeScrollMode}
        onOpenSearch={() => setShowSearch(true)}
        onToggleKeyboard={() => setShowKeyboard((prev) => !prev)}
        onToggleVoice={startDictation}
        onSpeakSummary={handleSpeakSummary}
        onToggleVoiceAutoRead={() => {
          setVoiceAutoRead((prev) => {
            const next = !prev;
            localStorage.setItem('aim-voice-autoread', JSON.stringify(next));
            return next;
          });
        }}
        onOpenSettings={() => setShowSettings(true)}
        onOpenIntegrations={() => setIsIntegrationsModalOpen(true)}
        onSetTermTheme={(newTheme) => {
          setTermTheme(newTheme);
          localStorage.setItem('aim-term-theme', newTheme);
        }}
        onChangeFontSize={(delta) => {
          setTermFontSize((prev) => {
            const next = Math.max(10, Math.min(24, prev + delta));
            localStorage.setItem('aim-term-fontsize', String(next));
            return next;
          });
        }}
      />

      <TokenGrabberModal
        isOpen={showTokenGrabber}
        onClose={() => setShowTokenGrabber(false)}
        activeSession={activeSession}
      />

      <ForensicsModal
        isOpen={showForensics}
        onClose={() => setShowForensics(false)}
        activeSession={activeSession}
        sessions={sessions}
        onSendSessionCommand={sendSessionCommand}
      />

    </div>
  );
}

export default App;
