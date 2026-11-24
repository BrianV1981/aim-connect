import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { AnsiUp } from 'ansi_up';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';
import './App.css';
import Keyboard from './Keyboard';
import Icon from './components/Icons';
import SettingsModal from './components/SettingsModal';
import MacroLibraryModal from './components/MacroLibraryModal';
import AuthScreen from './components/AuthScreen';
import DeleteSessionModal from './components/DeleteSessionModal';
import FleetSidebar from './components/FleetSidebar';
import { reconcileUnreadSessions } from './fleetFilterUtils';
import CommandPalette from './components/CommandPalette';
import TokenGrabberModal from './components/TokenGrabberModal';
import FileExplorer from './components/FileExplorer';
import BrowserPane from './components/BrowserPane';
import ForensicsModal from './components/ForensicsModal';
import HistoryVault from './components/HistoryVault';
import SpawnSessionModal from './components/SpawnSessionModal';
import ScrollbackOverlay from './components/ScrollbackOverlay';
import LiveTranscriptStage from './components/LiveTranscriptStage';
import TmuxServerStage from './components/TmuxServerStage';
import ShotMarkupModal from './components/ShotMarkupModal';
import { sanitizeAnsiScrollback, stripAnsiAndTrimLines } from './scrollbackSelection';
import { normalizeWindowsPathsInText } from './shotMarkupUtils';
import { E2EESocketWrapper } from './e2ee';
import { getAgentColor } from './agentColors';
import { useMatrixScramble, useStandaloneButtonScrambles } from './scramble';

const THEME_META_COLORS = {
  emerald: '#050505',
  oled: '#000000',
  light: '#f8fafc',
  navy: '#050a14',
};

function resolveXtermPalette(uiTheme, termPalette) {
  if (termPalette === 'hacker') {
    return { background: '#000000', foreground: '#22c55e', cursor: '#00ffa3' };
  }
  if (termPalette === 'high-contrast' || termPalette === 'contrast') {
    return { background: '#000000', foreground: '#ffffff', cursor: '#ffffff' };
  }
  if (termPalette === 'standard') {
    return { background: '#0B162C', foreground: '#e2e8f0', cursor: '#ff5722' };
  }
  if (uiTheme === 'light') {
    return { background: '#ffffff', foreground: '#09090b', cursor: '#047857' };
  }
  if (uiTheme === 'oled') {
    return { background: '#000000', foreground: '#ffffff', cursor: '#00ffa3' };
  }
  if (uiTheme === 'navy') {
    return { background: '#081122', foreground: '#e2e8f0', cursor: '#ff5722' };
  }
  return { background: '#040505', foreground: '#f3f4f6', cursor: '#00ffa3' };
}

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

  // Emerald Matrix V4 Theme & Operator Reply Preferences (#256)
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('aim-ui-theme');
    return ['emerald', 'oled', 'light', 'navy'].includes(saved) ? saved : 'emerald';
  });
  const setTheme = useCallback((nextTheme) => {
    const valid = ['emerald', 'oled', 'light', 'navy'].includes(nextTheme) ? nextTheme : 'emerald';
    setThemeState(valid);
    localStorage.setItem('aim-ui-theme', valid);
  }, []);

  const [operatorStyle, setOperatorStyleState] = useState(
    () => localStorage.getItem('aim-operator-style') || 'cyan'
  );
  const setOperatorStyle = useCallback((val) => {
    setOperatorStyleState(val);
    localStorage.setItem('aim-operator-style', val);
  }, []);

  const [operatorSide, setOperatorSideState] = useState(
    () => localStorage.getItem('aim-operator-side') || 'right'
  );
  const setOperatorSide = useCallback((val) => {
    setOperatorSideState(val);
    localStorage.setItem('aim-operator-side', val);
  }, []);

  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const triggerInstallApp = useCallback(async () => {
    if (!deferredInstallPrompt) return false;
    try {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
    } catch {}
    setDeferredInstallPrompt(null);
    return true;
  }, [deferredInstallPrompt]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.getElementById('meta-theme-color');
    if (meta) {
      meta.setAttribute('content', THEME_META_COLORS[theme] || '#050505');
    }
  }, [theme]);

  const brandAimScramble = useMatrixScramble('AIM');
  const brandConnScramble = useMatrixScramble('CONNECT');
  const termTabScramble = useMatrixScramble('TERMINAL');
  const browserTabScramble = useMatrixScramble('BROWSER');
  const filesTabScramble = useMatrixScramble('FILES');
  const historyTabScramble = useMatrixScramble('HISTORY');
  const homeSloganScramble = useMatrixScramble("Don't rent a seat.");
  useStandaloneButtonScrambles(true);

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
        try {
          ctx.close();
        } catch {}
      }, 650);
    } catch {
      // Ignore audio context autoplay restrictions
    }
  };

  const [showFleetSidebar, setShowFleetSidebar] = useState(() => {
    const saved = localStorage.getItem('aim-show-fleet');
    if (saved !== null) return JSON.parse(saved);
    return typeof window !== 'undefined' ? window.innerWidth >= 900 : true;
  });
  const prevStatusRef = useRef({});
  const lastChimedDigestRef = useRef({});
  const [activeSession, setActiveSession] = useState('');
  const activeSessionRef = useRef('');
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);
  const [sessionToDelete, setSessionToDelete] = useState('');
  const [isDeleteSessionModalOpen, setIsDeleteSessionModalOpen] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showTokenGrabber, setShowTokenGrabber] = useState(false);
  const [showForensics, setShowForensics] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyCounts, setHistoryCounts] = useState({});
  const [isSpawnModalOpen, setIsSpawnModalOpen] = useState(false);
  const [scrollFocusSearch, setScrollFocusSearch] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [requestedExplorerFile, setRequestedExplorerFile] = useState(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [preferredBrowserTargetId, setPreferredBrowserTargetId] = useState('');
  const [agentStageMode, setAgentStageModeState] = useState(() =>
    localStorage.getItem('aim-agent-stage-mode') === 'chat' ? 'chat' : 'pty'
  );
  const setAgentStageMode = useCallback((mode) => {
    const next = mode === 'chat' ? 'chat' : 'pty';
    setAgentStageModeState(next);
    localStorage.setItem('aim-agent-stage-mode', next);
  }, []);
  const [tmuxStageMode, setTmuxStageMode] = useState('grid'); // grid | pty
  const [optimisticChatBySession, setOptimisticChatBySession] = useState({});
  const pendingSessionBottomScrollRef = useRef(false);

  const reconcileOptimisticChat = useCallback((sessionKey, serverTurns = [], opts = {}) => {
    if (!sessionKey) return;
    setOptimisticChatBySession((prev) => {
      const list = prev[sessionKey];
      if (!Array.isArray(list) || list.length === 0) return prev;
      if (opts?.rewound) {
        const next = { ...prev };
        delete next[sessionKey];
        return next;
      }
      const serverPrompts = new Set(
        (Array.isArray(serverTurns) ? serverTurns : [])
          .map((t) => (t?.user || '').trim())
          .filter(Boolean)
      );
      const now = Date.now();
      const filtered = list.filter((m) => {
        const txt = (m?.text || '').trim();
        if (txt && serverPrompts.has(txt)) return false;
        if (m?.createdAt && now - m.createdAt > 15000) return false;
        return true;
      });
      if (filtered.length === list.length) return prev;
      return { ...prev, [sessionKey]: filtered };
    });
  }, []);
  const [pasteFlash, setPasteFlash] = useState(false);
  const [fileSelectMode, setFileSelectMode] = useState(false);
  const [isWidescreen, setIsWidescreen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 900 : true
  );
  const [splitMode, setSplitMode] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 900 : true
  );
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onViewportResize = () => setIsWidescreen(window.innerWidth > 900);
    window.addEventListener('resize', onViewportResize);
    return () => window.removeEventListener('resize', onViewportResize);
  }, []);
  const effectiveSplitMode = splitMode && isWidescreen;
  const [splitWidthPct, setSplitWidthPct] = useState(() => {
    if (typeof window === 'undefined') return 48;
    const saved = Number(localStorage.getItem('aim-split-pane-pct'));
    return Number.isFinite(saved) && saved >= 20 && saved <= 80 ? saved : 48;
  });
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const cockpitBodyRef = useRef(null);
  const terminalColumnRef = useRef(null);
  const splitFitRafRef = useRef(null);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const kbTabScramble = useMatrixScramble(showKeyboard ? 'KB ON' : 'KB OFF');
  const [isNativeScrollMode, setIsNativeScrollMode] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const [voiceAutoRead, setVoiceAutoRead] = useState(() =>
    JSON.parse(localStorage.getItem('aim-voice-autoread') ?? 'false')
  );
  const voiceAutoReadRef = useRef(voiceAutoRead);
  useEffect(() => {
    voiceAutoReadRef.current = voiceAutoRead;
  }, [voiceAutoRead]);
  const [ttsVoice, setTtsVoice] = useState(
    () => localStorage.getItem('aim-voice-tts-voice') || 'piper:en_GB-alan-medium'
  );
  const ttsVoiceRef = useRef(ttsVoice);
  useEffect(() => {
    ttsVoiceRef.current = ttsVoice;
  }, [ttsVoice]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const ttsAudioRef = useRef(null);
  const ttsAudioCtxRef = useRef(null);
  const ttsBufferSourceRef = useRef(null);
  const ttsAbortRef = useRef(null);
  const lastSpokenSummaryRef = useRef({});
  const [voiceContinuous, setVoiceContinuous] = useState(() =>
    JSON.parse(localStorage.getItem('aim-voice-continuous') ?? 'true')
  );
  const [voiceAutoEnter, setVoiceAutoEnter] = useState(() =>
    JSON.parse(localStorage.getItem('aim-voice-enter') ?? 'true')
  );
  const [voiceAutoExecute, setVoiceAutoExecute] = useState(() =>
    JSON.parse(localStorage.getItem('aim-voice-execute') ?? 'true')
  );
  const [voiceAutoCapitalize, setVoiceAutoCapitalize] = useState(() =>
    JSON.parse(localStorage.getItem('aim-voice-autocap') ?? 'true')
  );
  const [voiceSlashes, setVoiceSlashes] = useState(() =>
    JSON.parse(localStorage.getItem('aim-voice-slashes') ?? 'false')
  );
  const [voiceAutoSend, setVoiceAutoSend] = useState(() =>
    JSON.parse(localStorage.getItem('aim-voice-send') ?? 'true')
  );

  const stopSpeaking = () => {
    if (ttsAbortRef.current) {
      try {
        ttsAbortRef.current.abort();
      } catch {}
      ttsAbortRef.current = null;
    }
    if (ttsBufferSourceRef.current) {
      try {
        ttsBufferSourceRef.current.stop(0);
      } catch {}
      ttsBufferSourceRef.current = null;
    }
    if (ttsAudioRef.current) {
      try {
        ttsAudioRef.current.pause();
        if (ttsAudioRef.current.dataset?.blobUrl) {
          URL.revokeObjectURL(ttsAudioRef.current.dataset.blobUrl);
        }
      } catch {}
      ttsAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setIsSpeaking(false);
  };

  const speakBrowserFallback = (cleaned) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSpeaking(false);
      return false;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(cleaned);
      utterance.lang = 'en-US';
      utterance.rate = 1.04;
      const voices = window.speechSynthesis.getVoices?.() || [];
      const preferred = voices.find(
        (v) => /natural|google us english|siri|samantha/i.test(v.name) && /^en/i.test(v.lang)
      );
      if (preferred) utterance.voice = preferred;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      setIsSpeaking(false);
      return false;
    }
  };

  const speakSummaryText = async (text, overrideVoice = '') => {
    const cleaned = (text || '').trim();
    if (!cleaned || typeof window === 'undefined') {
      return false;
    }
    stopSpeaking();
    const chosenVoice = overrideVoice || ttsVoiceRef.current || 'piper:en_GB-alan-medium';
    if (chosenVoice.startsWith('browser:')) {
      return speakBrowserFallback(cleaned);
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      if (!ttsAudioCtxRef.current || ttsAudioCtxRef.current.state === 'closed') {
        ttsAudioCtxRef.current = new AudioCtx();
      }
      if (ttsAudioCtxRef.current.state === 'suspended') {
        try {
          ttsAudioCtxRef.current.resume();
        } catch {}
      }
    }

    const controller = new AbortController();
    ttsAbortRef.current = controller;
    setIsSpeaking(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleaned, voice: chosenVoice }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`TTS HTTP ${res.status}`);
      }
      const arrayBuf = await res.arrayBuffer();
      if (controller.signal.aborted) return false;

      if (ttsAudioCtxRef.current) {
        if (ttsAudioCtxRef.current.state === 'suspended') {
          await ttsAudioCtxRef.current.resume();
        }
        const decoded = await ttsAudioCtxRef.current.decodeAudioData(arrayBuf.slice(0));
        if (controller.signal.aborted) return false;
        const source = ttsAudioCtxRef.current.createBufferSource();
        source.buffer = decoded;
        source.connect(ttsAudioCtxRef.current.destination);
        ttsBufferSourceRef.current = source;
        source.onended = () => {
          if (ttsBufferSourceRef.current === source) {
            ttsBufferSourceRef.current = null;
            setIsSpeaking(false);
          }
        };
        source.start(0);
        return true;
      }

      const contentType = res.headers.get('content-type') || 'audio/wav';
      const blob = new Blob([arrayBuf], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);
      const audio = new Audio(blobUrl);
      audio.dataset.blobUrl = blobUrl;
      ttsAudioRef.current = audio;
      const cleanup = () => {
        if (ttsAudioRef.current === audio) {
          ttsAudioRef.current = null;
          setIsSpeaking(false);
        }
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {}
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      await audio.play();
      return true;
    } catch (err) {
      if (err?.name === 'AbortError') {
        setIsSpeaking(false);
        return false;
      }
      console.error('Neural TTS playback error:', err);
      return speakBrowserFallback(cleaned);
    }
  };

  const handleSpeakSummary = async () => {
    if (
      isSpeaking ||
      ttsBufferSourceRef.current ||
      ttsAudioRef.current ||
      (typeof window !== 'undefined' && window.speechSynthesis?.speaking)
    ) {
      stopSpeaking();
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
    } catch {
      // Fallback to cached fleet telemetry
    }
    if (!summaryText) {
      const fleetItem = fleet.find((f) => f.session_name === targetSession);
      summaryText = fleetItem?.spoken_summary || fleetItem?.preview || '';
    }
    if (summaryText) {
      lastSpokenSummaryRef.current[targetSession] = summaryText;
      await speakSummaryText(summaryText);
    }
  };

  const [scrollbackContent, setScrollbackContent] = useState('');
  const [rawScrollback, setRawScrollback] = useState('');
  const isNativeScrollModeRef = useRef(false);

  useEffect(() => {
    isNativeScrollModeRef.current = isNativeScrollMode;
  }, [isNativeScrollMode]);

  const closeNativeScrollMode = useCallback(() => {
    setIsNativeScrollMode(false);
    setScrollFocusSearch(false);
    setScrollbackContent('');
    setRawScrollback('');
  }, []);

  const toggleScrollbackSelectMode = useCallback(() => {
    setIsSelectMode((prev) => !prev);
  }, []);

  const enterNativeScrollMode = useCallback(async (opts = {}) => {
    const targetSession = activeSessionRef.current || activeSession;
    if (!targetSession) return;
    const wantSearch = Boolean(opts && opts.focusSearch);
    setScrollFocusSearch(wantSearch);
    setShowHistory(false);

    // Blur xterm and clear stale selection so hidden textarea never hijacks Ctrl+C or selection (#227)
    if (term.current) {
      try {
        term.current.clearSelection?.();
      } catch {}
      try {
        term.current.blur();
      } catch {}
      try {
        term.current.textarea?.blur();
      } catch {}
    }
    const hiddenTextarea = terminalRef.current?.querySelector('textarea');
    if (hiddenTextarea) {
      try {
        hiddenTextarea.blur();
      } catch {}
    }
    try {
      window.getSelection?.()?.removeAllRanges?.();
    } catch {}

    setIsNativeScrollMode(true);
    setScrollbackContent('Loading scrollback...');
    try {
      const res = await fetch(`/api/scrollback/${encodeURIComponent(targetSession)}`);
      const data = await res.json();
      if (data.scrollback !== undefined) {
        const cleanedAnsi = sanitizeAnsiScrollback(data.scrollback);
        const ansi_up = new AnsiUp();
        const html = ansi_up.ansi_to_html(cleanedAnsi);
        setScrollbackContent(html);
        setRawScrollback(stripAnsiAndTrimLines(data.scrollback));
      } else {
        setScrollbackContent('Error loading scrollback.');
        setRawScrollback('Error loading scrollback.');
      }
    } catch (err) {
      console.error('Scrollback fetch failed', err);
      setScrollbackContent('Error loading scrollback.');
      setRawScrollback('Error loading scrollback.');
    }
  }, [activeSession]);

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
    { id: 'pre-mode', label: 'Copy Mode', cmd: '\x02[', isPinned: true },
  ];

  const [macroLibrary, setMacroLibrary] = useState(() => {
    const saved = localStorage.getItem('aim-macro-library');
    if (saved) {
      let parsed = JSON.parse(saved);
      const missingDefaults = defaultLibrary.filter(
        (def) => def.id.startsWith('pre-') && !parsed.some((m) => m.id === def.id)
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
          id: `old-${i}`,
          label: m.label,
          cmd: m.cmd,
          isPinned: true,
        }));
        return [...defaultLibrary, ...oldParsed];
      } catch {}
    }
    return defaultLibrary;
  });

  const macroLibraryRef = useRef(macroLibrary);
  useEffect(() => {
    macroLibraryRef.current = macroLibrary;
  }, [macroLibrary]);

  const [showMacroLibrary, setShowMacroLibrary] = useState(false);
  const [macroReturnToVoice, setMacroReturnToVoice] = useState(false);
  const [showBoltPopover, setShowBoltPopover] = useState(false);
  useEffect(() => {
    if (!showBoltPopover) return undefined;
    const handleOutsideOrEsc = (ev) => {
      if (ev.type === 'keydown' && ev.key === 'Escape') {
        setShowBoltPopover(false);
      } else if (ev.type === 'pointerdown') {
        if (
          !ev.target?.closest?.('.quick-actions-popover') &&
          !ev.target?.closest?.('.ld-bolt-btn')
        ) {
          setShowBoltPopover(false);
        }
      }
    };
    window.addEventListener('keydown', handleOutsideOrEsc);
    window.addEventListener('pointerdown', handleOutsideOrEsc);
    return () => {
      window.removeEventListener('keydown', handleOutsideOrEsc);
      window.removeEventListener('pointerdown', handleOutsideOrEsc);
    };
  }, [showBoltPopover]);
  const [showKeybar, setShowKeybar] = useState(
    () => localStorage.getItem('aim-show-keybar') === 'true'
  );
  const [composerText, setComposerText] = useState('');
  const [stagedAttachments, setStagedAttachments] = useState({});
  const [editingShot, setEditingShot] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('appearance');

  const [keyboardMode, setKeyboardMode] = useState(() => localStorage.getItem('aim-kb-mode') || 'standard');
  const [autoCaps, setAutoCaps] = useState(() => {
    const val = localStorage.getItem('aim-kb-autocaps');
    return val !== null ? JSON.parse(val) : true;
  });

  const [termFontSize, setTermFontSize] = useState(() =>
    parseInt(localStorage.getItem('aim-term-fontsize') || '14', 10)
  );
  const [termTheme, setTermTheme] = useState(() => localStorage.getItem('aim-term-theme') || 'match');
  const [filesTreeSide, setFilesTreeSide] = useState(() =>
    localStorage.getItem('aim-files-tree-side') === 'right' ? 'right' : 'left'
  );
  const [filesHideDotfiles, setFilesHideDotfiles] = useState(() =>
    JSON.parse(localStorage.getItem('aim-files-hide-dotfiles') ?? 'true')
  );
  const [docsSingleTabMode, setDocsSingleTabMode] = useState(
    () => localStorage.getItem('aim-docs-single-tab') === 'true'
  );
  const [sessionAutoScroll, setSessionAutoScroll] = useState(
    () => localStorage.getItem('aim-session-autoscroll') === 'true'
  );
  const [xtermScrolledUp, setXtermScrolledUp] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(() =>
    parseInt(localStorage.getItem('aim-editor-fontsize') || '13', 10)
  );
  const [editorWordWrap, setEditorWordWrap] = useState(() =>
    JSON.parse(localStorage.getItem('aim-editor-wordwrap') ?? 'true')
  );
  const [keyboardFeedback, setKeyboardFeedback] = useState(
    () => localStorage.getItem('aim-kb-feedback') || 'audio'
  );
  const terminalRef = useRef(null);
  const term = useRef(null);
  const ws = useRef(null);
  const fitAddon = useRef(null);
  const authRef = useRef(false);
  const pinRef = useRef('');
  const passwordRef = useRef('');
  const harnessRef = useRef('admin');
  const apiTokenRef = useRef(localStorage.getItem('aim-token') || null);
  const clientIdRef = useRef(
    (() => {
      try {
        let cid = sessionStorage.getItem('aim-tab-client-id');
        if (!cid) {
          cid =
            window.crypto && window.crypto.randomUUID
              ? window.crypto.randomUUID()
              : `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
          sessionStorage.setItem('aim-tab-client-id', cid);
        }
        return cid;
      } catch {
        return `tab-${Date.now().toString(36)}`;
      }
    })()
  );
  const reconnectAttempts = useRef(0);
  const [connState, setConnState] = useState('disconnected');
  const editorRef = useRef(null);
  const searchAddon = useRef(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (apiTokenRef.current && !isAuthenticated) {
      setIsAuthenticated(true);
      const urlParams = new URLSearchParams(window.location.search);
      const harnessFromUrl = urlParams.get('harness') || 'admin';
      authenticate(null, null, harnessFromUrl);
    }
  }, []);

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
        if (fitAddon.current) {
          try {
            fitAddon.current.fit();
          } catch {}
        }
      }, 150);
    };
    const handleOrientation = () => {
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

  const expireSession = useCallback((reason = 'Session expired — please sign in again') => {
    authRef.current = false;
    apiTokenRef.current = null;
    localStorage.removeItem('aim-token');
    if (ws.current) {
      try {
        if (typeof ws.current._dispose === 'function') {
          ws.current._dispose();
        } else {
          ws.current.close();
        }
      } catch {}
      ws.current = null;
    }
    setConnState('disconnected');
    setIsAuthenticated(false);
    setPin('');
    if (reason) {
      setAuthError(reason);
    }
  }, []);

  // Override fetch to include token for API routes & cleanly expire session on HTTP 401 (#247)
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (resource, config = {}) => {
      const urlStr = typeof resource === 'string' ? resource : resource?.url || '';
      const isApiRoute = urlStr.startsWith('/api/') || urlStr.includes('/api/');
      const isAuthBootstrap =
        urlStr.startsWith('/api/auth') ||
        urlStr.startsWith('/api/logout') ||
        urlStr.startsWith('/api/webauthn/authenticate');
      const sentToken = !isAuthBootstrap && isApiRoute && apiTokenRef.current ? apiTokenRef.current : null;
      if (sentToken) {
        config = {
          ...config,
          headers: {
            ...(config.headers || {}),
            'x-api-token': sentToken,
          },
        };
      }
      const res = await originalFetch(resource, config);
      if (res.status === 401 && sentToken && apiTokenRef.current === sentToken) {
        expireSession('Session expired — please sign in again');
      }
      return res;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [expireSession]);

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
          setMacroLibrary((prev) => {
            const localMacros = prev.filter((m) => !m.isServer);
            const serverMacros = data.map((m) => ({ ...m, isServer: true }));
            const merged = [...localMacros];
            serverMacros.forEach((sm) => {
              const idx = merged.findIndex((lm) => lm.id === sm.id);
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
          setSessions((prev) =>
            JSON.stringify(prev) === JSON.stringify(data.sessions) ? prev : data.sessions
          );
        }
        if (Array.isArray(data.fleet)) {
          setFleet(data.fleet);
          const newlyCompleted = [];
          let triggeredWaiting = false;
          const currWaiting = [];
          data.fleet.forEach((item) => {
            const sName = item.session_name;
            const prevSt = prevStatusRef.current[sName];
            const currDigest = item.turn_digest || item.spoken_summary || '';
            if (prevSt === undefined || sName === activeSession) {
              lastChimedDigestRef.current[sName] = currDigest;
            }
            if (item.status === 'WAITING') {
              currWaiting.push(sName);
              if (prevSt && prevSt !== 'WAITING') {
                triggeredWaiting = true;
              }
            }
            if (prevSt === 'THINKING' && item.status === 'IDLE' && sName !== activeSession) {
              if (!currDigest || lastChimedDigestRef.current[sName] !== currDigest) {
                newlyCompleted.push(sName);
                lastChimedDigestRef.current[sName] = currDigest;
              }
            }
            const currSummary = item.spoken_summary || '';
            const prevSummary = lastSpokenSummaryRef.current[sName];
            if (prevSummary === undefined) {
              lastSpokenSummaryRef.current[sName] = currSummary;
            } else if (item.status !== 'THINKING' && currSummary) {
              const turnFinished =
                prevSt === 'THINKING' && (item.status === 'IDLE' || item.status === 'WAITING');
              if (currSummary !== prevSummary || turnFinished) {
                lastSpokenSummaryRef.current[sName] = currSummary;
                if (sName === activeSession && voiceAutoReadRef.current) {
                  speakSummaryText(currSummary);
                }
              }
            }
            prevStatusRef.current[sName] = item.status;
          });
          setWaitingSessions(currWaiting);
          if (triggeredWaiting) {
            playAlertChime('waiting');
          } else if (newlyCompleted.length > 0) {
            playAlertChime('done');
          }
          setUnreadSessions((prev) =>
            reconcileUnreadSessions(
              prev,
              Array.isArray(data.sessions) ? data.sessions : [],
              data.fleet,
              newlyCompleted,
              activeSession
            )
          );
        }
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
          try {
            fitAddon.current.fit();
          } catch {}
        }
      }, 80);
      return next;
    });
  };

  const scheduleTerminalRefit = useCallback(() => {
    if (splitFitRafRef.current) return;
    splitFitRafRef.current = window.requestAnimationFrame(() => {
      splitFitRafRef.current = null;
      if (fitAddon.current) {
        try {
          fitAddon.current.fit();
        } catch {}
      }
    });
  }, []);

  const handleSplitDividerPointerDown = useCallback(
    (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const bodyEl = cockpitBodyRef.current;
      if (!bodyEl) return;
      e.preventDefault();
      setIsDraggingSplit(true);

      let latestPct = splitWidthPct;

      const updateFromClientX = (clientX) => {
        const bodyRect = bodyEl.getBoundingClientRect();
        if (bodyRect.width < 600) return;
        const termLeft = terminalColumnRef.current
          ? terminalColumnRef.current.getBoundingClientRect().left
          : bodyRect.left;
        const minBrowserPx = 320;
        const minTerminalPx = 260;
        const availablePx = Math.max(minBrowserPx + minTerminalPx, bodyRect.right - termLeft);
        const maxBrowserPx = Math.max(minBrowserPx, availablePx - minTerminalPx);
        const clampedBrowserPx = Math.max(
          minBrowserPx,
          Math.min(maxBrowserPx, bodyRect.right - clientX)
        );
        const nextPct = Number(((clampedBrowserPx / bodyRect.width) * 100).toFixed(2));
        latestPct = nextPct;
        setSplitWidthPct(nextPct);
        scheduleTerminalRefit();
      };

      const onPointerMove = (ev) => {
        updateFromClientX(ev.clientX);
      };

      const finishDrag = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', finishDrag);
        window.removeEventListener('pointercancel', finishDrag);
        setIsDraggingSplit(false);
        try {
          localStorage.setItem('aim-split-pane-pct', String(latestPct));
        } catch {}
        setTimeout(() => {
          try {
            fitAddon.current?.fit();
          } catch {}
        }, 60);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', finishDrag);
      window.addEventListener('pointercancel', finishDrag);
    },
    [scheduleTerminalRefit, splitWidthPct]
  );

  const handleSplitDividerDoubleClick = useCallback(() => {
    setSplitWidthPct(48);
    try {
      localStorage.setItem('aim-split-pane-pct', '48');
    } catch {}
    setTimeout(() => {
      try {
        fitAddon.current?.fit();
      } catch {}
    }, 60);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/sessions/history')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.counts_by_project) setHistoryCounts(d.counts_by_project);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const createSession = () => {
    setIsSpawnModalOpen(true);
  };

  const confirmCreateSession = async (name) => {
    const createRes = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const createData = await createRes.json();
    if (!createRes.ok || createData.error) {
      throw new Error(createData.detail || createData.error || 'Failed to spawn session');
    }
    const res = await fetch('/api/sessions');
    const data = await res.json();
    const sorted = [...(data.sessions || [])].sort((a, b) => a.localeCompare(b));
    setSessions(sorted);
    if (Array.isArray(data.fleet)) setFleet(data.fleet);
    setShowHistory(false);
    setActiveSession(name);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'switch_session', session: name }));
    }
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
      const otherSessions = (data.sessions || []).filter((s) => s !== sessionToKill);

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

      setTimeout(async () => {
        await fetch(`/api/sessions/${encodeURIComponent(sessionToKill)}?delete_workspace=false`, {
          method: 'DELETE',
        });
        const finalRes = await fetch('/api/sessions');
        const finalData = await finalRes.json();
        setSessions(finalData.sessions || []);
        if (Array.isArray(finalData.fleet)) setFleet(finalData.fleet);
      }, 100);
    } catch (e) {
      console.error(e);
    }
  };

  const switchToSession = (newSession) => {
    if (!newSession) {
      setActiveSession('');
      setShowFiles(false);
      setShowHistory(false);
      setFileSelectMode(false);
      closeNativeScrollMode();
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setShowFleetSidebar(false);
      }
      return;
    }
    if (newSession !== activeSessionRef.current) {
      closeNativeScrollMode();
      setShowHistory(false);
    }
    setActiveSession(newSession);
    setUnreadSessions((prev) => prev.filter((s) => s !== newSession));
    const matchedFleet = fleet.find((f) => f.session_name === newSession);
    if (matchedFleet) {
      lastChimedDigestRef.current[newSession] =
        matchedFleet.turn_digest || matchedFleet.spoken_summary || '';
      const isRawTarget =
        matchedFleet.vessel === 'service' ||
        (matchedFleet.vessel === 'shell' && !matchedFleet.tokens_used);
      if (isRawTarget) {
        setTmuxStageMode((matchedFleet.window_count || matchedFleet.pane_count || 1) > 1 ? 'grid' : 'pty');
      }
      // Keep Co-Pilot Browser open/closed state persistent across session switches;
      // update preferredBrowserTargetId so an open Browser auto-switches to this session's tab (#261).
      setPreferredBrowserTargetId(
        matchedFleet.has_browser_lease ? matchedFleet.browser_tab_id || '' : ''
      );
    } else {
      setPreferredBrowserTargetId('');
    }
    pendingSessionBottomScrollRef.current = true;
    if (term.current) {
      try {
        term.current.scrollToBottom?.();
      } catch {}
    }
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'switch_session', session: newSession }));
      if (fitAddon.current) {
        setTimeout(() => {
          try {
            fitAddon.current?.fit();
            term.current?.scrollToBottom?.();
          } catch {}
          const dims = fitAddon.current.proposeDimensions();
          if (dims && ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
          }
        }, 100);
      }
    }
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

  const handlePinInput = (digit) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setAuthError('');
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
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

  useEffect(() => {
    if (pin.length === 6) {
      authenticate(pin, password, 'admin');
    }
  }, [pin, password]);

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
    const tokenToRevoke = apiTokenRef.current;
    expireSession('');
    if (tokenToRevoke) {
      try {
        await window.fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-token': tokenToRevoke,
          },
        });
      } catch (e) {
        console.error('Logout failed', e);
      }
    }
  };

  const handleWebAuthnLogin = (token, passedE2eeSecret) => {
    apiTokenRef.current = token;
    localStorage.setItem('aim-token', token);
    if (passedE2eeSecret !== undefined) {
      setE2eeSecret(passedE2eeSecret);
    }
    setAuthError('');
    authenticate(null, null, 'admin');
  };

  const authenticate = async (token, pass, harness = 'admin') => {
    if (token !== null && (!pass || !passphrase)) {
      setAuthError(!passphrase ? 'Please enter Name first' : 'Please enter Admin Password first');
      setPin('');
      return;
    }

    harnessRef.current = harness;

    if (token && pass) {
      try {
        const res = await window.fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password: pass, passphrase }),
        });
        if (!res.ok) {
          setAuthError('Invalid or expired PIN');
          setPin('');
          return;
        }
        const data = await res.json();
        apiTokenRef.current = data.api_token;
        localStorage.setItem('aim-token', data.api_token);
      } catch {
        setAuthError('Connection failed');
        setPin('');
        return;
      }
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    if (ws.current) {
      try {
        if (typeof ws.current._dispose === 'function') {
          ws.current._dispose();
        } else {
          ws.current.close();
        }
      } catch {}
      ws.current = null;
    }

    const rawSocket = new WebSocket(wsUrl);
    rawSocket.binaryType = 'arraybuffer';

    const socket = new E2EESocketWrapper(rawSocket, e2eeSecret);
    socket.init();

    let pingInterval;
    let disposed = false;
    let authRequestedSession = '';
    let lastServerMessageAt = Date.now();

    const handleVisibilityChange = () => {
      if (disposed || document.visibilityState !== 'visible') return;
      lastServerMessageAt = Date.now();
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    socket._dispose = () => {
      disposed = true;
      if (pingInterval) clearInterval(pingInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.close();
    };

    socket.onopen = () => {
      authRequestedSession = activeSessionRef.current || '';
      lastServerMessageAt = Date.now();
      socket.send(
        JSON.stringify({
          type: 'auth',
          token: apiTokenRef.current,
          harness: harnessRef.current,
          session: authRequestedSession || undefined,
          client_id: clientIdRef.current,
        })
      );
    };

    socket.onmessage = (event) => {
      lastServerMessageAt = Date.now();
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'pong') {
            return;
          }
          if (msg.type === 'auth_success') {
            ws.current = socket;
            authRef.current = true;
            reconnectAttempts.current = 0;
            setConnState('connected');
            setIsAuthenticated(true);
            if (activeSessionRef.current && activeSessionRef.current !== authRequestedSession) {
              socket.send(
                JSON.stringify({
                  type: 'switch_session',
                  session: activeSessionRef.current,
                })
              );
            }
            if (fitAddon.current) {
              const dims = fitAddon.current.proposeDimensions();
              if (dims && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
              }
            }

            pingInterval = setInterval(() => {
              if (socket.readyState === WebSocket.OPEN) {
                if (
                  document.visibilityState === 'visible' &&
                  Date.now() - lastServerMessageAt > 35000
                ) {
                  socket.close();
                  return;
                }
                socket.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
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
        } catch {
          if (authRef.current && term.current) {
            term.current.write(event.data, () => {
              if (pendingSessionBottomScrollRef.current) {
                pendingSessionBottomScrollRef.current = false;
                try {
                  term.current?.scrollToBottom?.();
                } catch {}
              }
            });
          }
        }
      }

      if (event.data instanceof ArrayBuffer) {
        if (term.current) {
          term.current.write(new Uint8Array(event.data), () => {
            if (pendingSessionBottomScrollRef.current) {
              pendingSessionBottomScrollRef.current = false;
              try {
                term.current?.scrollToBottom?.();
              } catch {}
            }
          });
        }
      }
    };

    socket.onclose = (event) => {
      if (pingInterval) clearInterval(pingInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (disposed) return;
      if (event.code === 1008) {
        if (term.current)
          term.current.writeln('\x1b[31m\n[Session expired. Please log in again.]\x1b[0m');
        expireSession('Session expired — please sign in again');
        return;
      }

      if (authRef.current) {
        const MAX_RECONNECT = 5;
        const BASE_DELAY = 1000;
        reconnectAttempts.current++;

        if (reconnectAttempts.current > MAX_RECONNECT) {
          if (term.current)
            term.current.writeln(
              '\x1b[31m\n[Connection lost. Max retries exceeded. Returning to login.]\x1b[0m'
            );
          setConnState('disconnected');
          setTimeout(() => handleLogout(), 2000);
          return;
        }

        const delay = BASE_DELAY * Math.pow(2, reconnectAttempts.current - 1);
        setConnState('reconnecting');
        if (term.current)
          term.current.writeln(
            `\x1b[33m\n[Reconnecting... attempt ${reconnectAttempts.current}/${MAX_RECONNECT} (${
              delay / 1000
            }s)]\x1b[0m`
          );
        setTimeout(() => authenticate(null, null), delay);
      } else {
        setConnState('disconnected');
        setAuthError('Connection failed');
        setPin('');
      }
    };
  };

  const syncMacrosToServer = async (library) => {
    const serverMacros = library.filter((m) => m.isServer).map(({ isServer, ...rest }) => rest);
    try {
      await fetch('/api/macros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ macros: serverMacros }),
      });
    } catch (e) {
      console.error('Failed to sync macros to server', e);
    }
  };

  const toggleMacroPin = (id) => {
    const updated = macroLibrary.map((m) => (m.id === id ? { ...m, isPinned: !m.isPinned } : m));
    setMacroLibrary(updated);
    localStorage.setItem('aim-macro-library', JSON.stringify(updated));
    if (updated.find((m) => m.id === id)?.isServer) syncMacrosToServer(updated);
  };

  const saveMacro = (editingId, label, cmd, voiceTrigger, isServer) => {
    if (!label || !cmd) return;
    let updated;
    if (editingId) {
      updated = macroLibrary.map((m) =>
        m.id === editingId ? { ...m, label, cmd, voiceTrigger, isServer } : m
      );
    } else {
      updated = [
        ...macroLibrary,
        { id: Date.now().toString(), label, cmd, voiceTrigger, isPinned: true, isServer },
      ];
    }
    setMacroLibrary(updated);
    localStorage.setItem('aim-macro-library', JSON.stringify(updated));
    syncMacrosToServer(updated);
  };

  const deleteMacro = (id) => {
    if (!window.confirm('Delete this macro permanently?')) return;
    const isServer = macroLibrary.find((m) => m.id === id)?.isServer;
    const updated = macroLibrary.filter((m) => m.id !== id);
    setMacroLibrary(updated);
    localStorage.setItem('aim-macro-library', JSON.stringify(updated));
    if (isServer) syncMacrosToServer(updated);
  };

  const importMacros = (importedMacros, mode) => {
    let updated;
    if (mode === 'replace') {
      updated = importedMacros.map((m) => ({
        ...m,
        id: m.id || Date.now().toString() + Math.random(),
      }));
    } else {
      const existing = [...macroLibrary];
      importedMacros.forEach((m) => {
        if (!existing.some((e) => e.label === m.label)) {
          existing.push({ ...m, id: m.id || Date.now().toString() + Math.random() });
        }
      });
      updated = existing;
    }
    setMacroLibrary(updated);
    localStorage.setItem('aim-macro-library', JSON.stringify(updated));
    syncMacrosToServer(updated);
  };

  const syncTerminalFitAndResize = useCallback(() => {
    if (!fitAddon.current || !terminalRef.current) return;
    try {
      fitAddon.current.fit();
      const dims = fitAddon.current.proposeDimensions();
      if (
        dims &&
        dims.cols > 0 &&
        dims.rows > 0 &&
        ws.current &&
        ws.current.readyState === WebSocket.OPEN
      ) {
        ws.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
      }
    } catch {}
  }, []);

  // Sync xterm.js font size and theme across UI schemes + Terminal Palette overrides (#256, #272)
  useEffect(() => {
    if (term.current) {
      term.current.options.fontSize = termFontSize;
      term.current.options.theme = resolveXtermPalette(theme, termTheme);
      setTimeout(() => syncTerminalFitAndResize(), 50);
    }
  }, [termFontSize, termTheme, theme, syncTerminalFitAndResize]);

  // Initialize terminal once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    term.current = new Terminal({
      cursorBlink: true,
      theme: resolveXtermPalette(theme, termTheme),
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: termFontSize,
    });

    fitAddon.current = new FitAddon();
    term.current.loadAddon(fitAddon.current);
    searchAddon.current = new SearchAddon();
    term.current.loadAddon(searchAddon.current);

    if (terminalRef.current) {
      term.current.open(terminalRef.current);

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
        if (fitAttempts >= 10) clearInterval(fitInterval);
      }, 150);

      if (typeof document !== 'undefined' && document.fonts?.ready) {
        document.fonts.ready
          .then(() => {
            syncTerminalFitAndResize();
          })
          .catch(() => {});
      }

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
    term.current.writeln('\x1b[1;32m    A.I.M. SOVEREIGN NODE - EMERALD MATRIX INTERFACE\x1b[0m');
    term.current.writeln('\x1b[90m    ================================================\x1b[0m');
    term.current.writeln('\x1b[32m    [+] Connection Established\x1b[0m');
    term.current.writeln('\x1b[32m    [+] E2EE Handshake Verified\x1b[0m');
    term.current.writeln('\x1b[32m    [+] Primary Node Initialized\x1b[0m');
    term.current.writeln('');
    term.current.writeln('\x1b[37m    Welcome, Operator. The Sovereign AI is ready.\x1b[0m');
    term.current.writeln('');

    const syncXtermScrollState = () => {
      const buf = term.current?.buffer?.active;
      const up = Boolean(buf && buf.baseY > 0 && buf.viewportY < buf.baseY);
      setXtermScrolledUp((prev) => (prev === up ? prev : up));
    };
    const scrollDisp = term.current.onScroll?.(syncXtermScrollState);
    const writeDisp = term.current.onWriteParsed?.(syncXtermScrollState);

    term.current.onData((data) => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
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

    term.current.attachCustomKeyEventHandler((ev) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') {
        if (ev.type === 'keydown') {
          ev.preventDefault();
          setShowCommandPalette((prev) => !prev);
        }
        return false;
      }
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'f' && activeSessionRef.current) {
        if (ev.type === 'keydown') {
          ev.preventDefault();
          enterNativeScrollMode({ focusSearch: true });
        }
        return false;
      }
      if (isNativeScrollModeRef.current) return false;
      return true;
    });

    const handleGlobalKeyDown = (ev) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') {
        ev.preventDefault();
        setShowCommandPalette((prev) => !prev);
      } else if (
        (ev.metaKey || ev.ctrlKey) &&
        ev.key.toLowerCase() === 'f' &&
        activeSessionRef.current &&
        !document.querySelector('.modal-overlay')
      ) {
        ev.preventDefault();
        enterNativeScrollMode({ focusSearch: true });
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);

    const handleResize = () => {
      if (window.visualViewport) {
        document.body.style.height = `${window.visualViewport.height}px`;
      }
    };

    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    let lastSentCols = 0;
    let lastSentRows = 0;
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddon.current) {
        fitAddon.current.fit();
        const dims = fitAddon.current.proposeDimensions();
        if (
          dims &&
          (dims.cols !== lastSentCols || dims.rows !== lastSentRows) &&
          ws.current &&
          ws.current.readyState === WebSocket.OPEN
        ) {
          lastSentCols = dims.cols;
          lastSentRows = dims.rows;
          ws.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
        }
      }
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    const TOUCH_SCROLL_THROTTLE_MS = 32;
    let lastTouchY = 0;
    let pendingTouchDeltaY = 0;
    let lastTouchWheelFlushTs = 0;
    let touchFlushTimer = null;

    const flushTouchWheel = () => {
      touchFlushTimer = null;
      if (!terminalRef.current || Math.abs(pendingTouchDeltaY) <= 5) return;
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: pendingTouchDeltaY * 2,
        bubbles: true,
        cancelable: true,
      });
      pendingTouchDeltaY = 0;
      lastTouchWheelFlushTs = Date.now();
      const target = terminalRef.current.querySelector('.xterm-screen') || terminalRef.current;
      target.dispatchEvent(wheelEvent);
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        lastTouchY = e.touches[0].clientY;
        pendingTouchDeltaY = 0;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 1) {
        if (isNativeScrollModeRef.current) return;
        e.preventDefault();
        const currentY = e.touches[0].clientY;
        const deltaY = lastTouchY - currentY;
        lastTouchY = currentY;
        pendingTouchDeltaY += deltaY;

        if (Math.abs(pendingTouchDeltaY) > 5) {
          const elapsed = Date.now() - lastTouchWheelFlushTs;
          if (elapsed >= TOUCH_SCROLL_THROTTLE_MS) {
            if (touchFlushTimer) {
              clearTimeout(touchFlushTimer);
              touchFlushTimer = null;
            }
            flushTouchWheel();
          } else if (!touchFlushTimer) {
            touchFlushTimer = setTimeout(flushTouchWheel, TOUCH_SCROLL_THROTTLE_MS - elapsed);
          }
        }
      }
    };

    const termEl = terminalRef.current;
    if (termEl) {
      termEl.addEventListener('touchstart', handleTouchStart, { passive: false });
      termEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    }

    const handleScroll = () => {
      if (window.scrollY > 0 || window.scrollX > 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      if (touchFlushTimer) clearTimeout(touchFlushTimer);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        document.body.style.height = '';
      }
      window.removeEventListener('scroll', handleScroll);
      if (termEl) {
        termEl.removeEventListener('touchstart', handleTouchStart);
        termEl.removeEventListener('touchmove', handleTouchMove);
      }
      if (term.current) term.current.dispose();
      scrollDisp?.dispose?.();
      writeDisp?.dispose?.();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (term.current) {
      if (term.current.textarea) {
        term.current.textarea.readOnly = showKeyboard;
        if (showKeyboard) {
          term.current.textarea.blur();
        }
      }
      if (showKeyboard) {
        const textarea = terminalRef.current?.querySelector('textarea');
        if (textarea) textarea.blur();
      }

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
      alert('Voice dictation is not supported by your browser.');
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
    lastVoiceEndedSentence.current = true;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      const lastIdx = event.results.length - 1;
      const transcript = event.results[lastIdx][0].transcript;
      const lowerTrimmed = transcript.trim().toLowerCase();

      const matchingMacro = macroLibraryRef.current?.find(
        (m) => m.voiceTrigger && m.voiceTrigger.toLowerCase() === lowerTrimmed
      );

      let isEnterCommand = false;
      let isSubmitCommand = false;
      if (lowerTrimmed === 'enter' && voiceAutoEnter) isEnterCommand = true;
      if (lowerTrimmed === 'send' && voiceAutoSend) isSubmitCommand = true;
      if (lowerTrimmed === 'execute' && voiceAutoExecute) isSubmitCommand = true;

      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        if (matchingMacro) {
          ws.current.send(JSON.stringify({ type: 'input', payload: matchingMacro.cmd }));
          lastVoiceEndedWithSpace.current = false;
          lastVoiceEndedSentence.current = true;
        } else if (isSubmitCommand || isEnterCommand) {
          ws.current.send(JSON.stringify({ type: 'input', payload: '\r' }));
          lastVoiceEndedWithSpace.current = false;
          lastVoiceEndedSentence.current = true;
        } else {
          let finalPayload = transcript.trim().replace(/\s+/g, ' ');

          if (voiceAutoCapitalize && lastVoiceEndedSentence.current) {
            finalPayload = finalPayload.trimStart();
            finalPayload = finalPayload.charAt(0).toUpperCase() + finalPayload.slice(1);
          }

          if (voiceSlashes) {
            finalPayload = finalPayload
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
            .replace(/\b(?:open|left)\s+paren(?:thesis)?\b\s*/gi, '(')
            .replace(/\s*\b(?:close|right)\s+paren(?:thesis)?\b/gi, ')')
            .replace(/\bquote\b\s*/gi, '"')
            .replace(/\s*\bunquote\b/gi, '"')
            .replace(/\s+([.,?!])/g, '$1');

          if (voiceAutoCapitalize) {
            finalPayload = finalPayload.replace(/([.?!])\s+([a-z])/g, (match, p1, p2) => p1 + ' ' + p2.toUpperCase());
          }

          let prefix = '';
          if (lastVoiceEndedWithSpace.current) {
            const startsWithPunctuation = /^[.,?!)]/.test(finalPayload.trimStart());
            const startsWithUnquote = finalPayload.startsWith('"') && lowerTrimmed.startsWith('unquote');
            if (startsWithPunctuation || startsWithUnquote) {
              prefix = '\b';
            }
          }

          let appendSpace = ' ';
          if (
            finalPayload.endsWith('(') ||
            finalPayload.endsWith('/') ||
            finalPayload.endsWith('\\') ||
            finalPayload.endsWith('-')
          ) {
            appendSpace = '';
          }
          if (finalPayload.endsWith('"') && lowerTrimmed.endsWith('quote') && !lowerTrimmed.endsWith('unquote')) {
            appendSpace = '';
          }

          ws.current.send(JSON.stringify({ type: 'input', payload: prefix + finalPayload + appendSpace }));

          lastVoiceEndedWithSpace.current = appendSpace === ' ';
          lastVoiceEndedSentence.current =
            /[.?!]\s*$/.test(finalPayload) || /[.?!]$/.test(finalPayload.trimEnd());
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      const hard = ['not-allowed', 'network', 'service-not-allowed', 'audio-capture', 'language-not-supported'];
      if (hard.includes(event.error)) {
        shouldBeListeningRef.current = false;
        setIsListening(false);
        const msg =
          {
            'not-allowed': 'Microphone permission denied. Allow mic for this site and try again.',
            network:
              'Voice recognition failed (network/service). Brave often cannot use Web Speech — try Chrome or Edge.',
            'service-not-allowed': 'This browser blocks speech recognition. Try Chrome or Edge.',
            'audio-capture': 'Could not capture microphone audio.',
            'language-not-supported': 'Speech language not supported in this browser.',
          }[event.error] || `Voice error: ${event.error}`;
        alert(msg);
      }
    };

    recognition.onend = () => {
      if (!voiceContinuous) {
        shouldBeListeningRef.current = false;
        setIsListening(false);
        return;
      }

      if (shouldBeListeningRef.current) {
        try {
          recognition.start();
        } catch {
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

  const attachToActiveComposer = useCallback((attachment) => {
    if (!attachment) return;
    const target = activeSessionRef.current || activeSession || 'default';
    setStagedAttachments((prev) => ({
      ...prev,
      [target]: [...(prev[target] || []), attachment],
    }));
  }, [activeSession]);

  const removeStagedAttachment = useCallback((sessionKey, attId) => {
    setStagedAttachments((prev) => ({
      ...prev,
      [sessionKey]: (prev[sessionKey] || []).filter((item) => item.id !== attId),
    }));
  }, []);

  const updateStagedAttachment = useCallback((sessionKey, updatedAtt) => {
    if (!sessionKey || !updatedAtt?.id) return;
    setStagedAttachments((prev) => ({
      ...prev,
      [sessionKey]: (prev[sessionKey] || []).map((item) =>
        item.id === updatedAtt.id ? updatedAtt : item
      ),
    }));
  }, []);

  const downloadShotFile = useCallback(async (att) => {
    if (!att?.path) return;
    try {
      const res = await fetch(`/api/file/download?path=${encodeURIComponent(att.path)}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const tempUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = tempUrl;
      a.download = att.filename || att.path.split('/').pop() || 'screenshot.png';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        try {
          URL.revokeObjectURL(tempUrl);
        } catch {}
      }, 4000);
    } catch (err) {
      console.error('Screenshot download failed', err);
    }
  }, []);

  const handleComposerPaste = async (ev) => {
    const items = ev.clipboardData?.items;
    if (!items) return;
    const imgItem = Array.from(items).find((it) => it.type && it.type.startsWith('image/'));
    if (!imgItem) return;
    const file = imgItem.getAsFile();
    if (!file) return;
    ev.preventDefault();
    try {
      const bitmapUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 800;
          canvas.height = img.naturalHeight || img.height || 600;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0);
          const pngDataUrl = canvas.toDataURL('image/png');
          const res = await fetch('/api/browser/screenshot/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: pngDataUrl, label: 'clipboard' }),
          });
          const data = await res.json();
          if (res.ok && data?.path) {
            attachToActiveComposer({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              filename: data.filename,
              path: data.path,
              dims: data.dims,
              url: 'clipboard',
            });
          }
        } finally {
          URL.revokeObjectURL(bitmapUrl);
        }
      };
      img.onerror = () => URL.revokeObjectURL(bitmapUrl);
      img.src = bitmapUrl;
    } catch (err) {
      console.error('Clipboard image paste failed', err);
    }
  };

  const handleComposerSubmit = (e) => {
    e.preventDefault();
    const target = activeSessionRef.current || activeSession;
    if (!target) return;
    const attachments = stagedAttachments[target] || [];
    const attRefs = attachments.map((a) => `@${a.path}`).join(' ');
    const cleanText = normalizeWindowsPathsInText(composerText.trim());
    const combined = [cleanText, attRefs].filter(Boolean).join(' ');
    if (!combined) return;
    pasteToTerminal(combined);
    setTimeout(() => sendCommand('\r'), 90);
    setOptimisticChatBySession((prev) => ({
      ...prev,
      [target]: [
        ...(prev[target] || []).slice(-4),
        { id: `opt-${Date.now()}`, text: cleanText, attachments, createdAt: Date.now() },
      ],
    }));
    setComposerText('');
    if (attachments.length > 0) {
      setStagedAttachments((prev) => ({ ...prev, [target]: [] }));
    }
  };

  const openSettingsModal = (tab = 'appearance') => {
    setSettingsInitialTab(tab);
    setShowSettings(true);
  };

  const handleOpenFileFromChat = useCallback((filePath, line = null, endLine = null) => {
    if (!filePath) return;
    const desktopSplit = typeof window !== 'undefined' ? window.innerWidth > 900 : true;
    setShowFiles(true);
    setShowBrowser(false);
    setSplitMode(desktopSplit);
    setRequestedExplorerFile({
      path: filePath,
      line: line || null,
      endLine: endLine || null,
      seq: Date.now(),
    });
    setTimeout(() => {
      try {
        fitAddon.current?.fit();
      } catch {}
    }, 80);
  }, []);

  const selectWorkspaceTool = (tool) => {
    const desktopSplit = typeof window !== 'undefined' ? window.innerWidth > 900 : true;
    if (tool === 'none') {
      setShowBrowser(false);
      setShowFiles(false);
      setSplitMode(desktopSplit);
    } else if (tool === 'browser') {
      if (showBrowser) {
        setSplitMode((prev) => !prev);
      } else {
        setShowBrowser(true);
        setShowFiles(false);
        setSplitMode(desktopSplit);
      }
    } else if (tool === 'files') {
      if (showFiles) {
        setSplitMode((prev) => !prev);
      } else {
        setShowFiles(true);
        setShowBrowser(false);
        setSplitMode(desktopSplit);
      }
    }
    setTimeout(() => {
      try {
        fitAddon.current?.fit();
      } catch {}
    }, 80);
  };

  if (!isAuthenticated) {
    return (
      <AuthScreen
        passphrase={passphrase}
        setPassphrase={setPassphrase}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        pin={pin}
        authError={authError}
        e2eeSecret={e2eeSecret}
        setE2eeSecret={setE2eeSecret}
        onPinInput={handlePinInput}
        onBackspace={handleBackspace}
        onPasteClick={handlePasteClick}
        onWebAuthnLogin={handleWebAuthnLogin}
      />
    );
  }

  return (
    <div className="app-container cockpit-shell" data-op-style={operatorStyle} data-op-side={operatorSide}>
      <div className="ld-grid-backdrop" />
      <div className="ld-aurora-wash" />

      {/* Frosted 50px Header (Half-Screen Coherent — Preserves #229 & #255 Invariants) */}
      <header className="app-header ld-header">
        <div className="hdr-cluster">
          <button
            type="button"
            className={`ghost-btn desktop-only ${showFleetSidebar ? 'active' : ''}`}
            onClick={toggleFleetSidebar}
            title="Toggle Multi-Session Fleet Sidebar"
            style={{ position: 'relative' }}
          >
            <Icon name="sidebar" />
            {unreadSessions.length > 0 && (
              <span className="fleet-header-unread-dot" title={`${unreadSessions.length} unread completed session(s)`}>
                {unreadSessions.length}
              </span>
            )}
          </button>

          <div
            className="ld-brand"
            data-scramble-manual="1"
            onClick={() => switchToSession('')}
            onMouseEnter={() => {
              brandAimScramble.triggerScramble();
              brandConnScramble.triggerScramble();
            }}
            onMouseLeave={() => {
              brandAimScramble.resetScramble();
              brandConnScramble.resetScramble();
            }}
            title="Return to A.I.M. Connect Welcome Screen"
          >
            <div className="ld-brand-box">
              <Icon name="aimMark" size={18} />
            </div>
            <div className="ld-brand-word">
              <strong style={{ color: 'var(--text-primary)' }}>{brandAimScramble.display}</strong>
              <span>{brandConnScramble.display}</span>
            </div>
          </div>

          {activeSession && (() => {
            const activeColor = getAgentColor(activeSession);
            return (
              <span
                className="active-session-badge"
                style={{ '--agent-color': activeColor.hex, '--agent-rgb': activeColor.rgb }}
                title={`Active tmux session: ${activeSession} (${activeColor.name})`}
              >
                <span className="project-pill-dot" />
                {activeSession}
              </span>
            );
          })()}

          {waitingSessions.length > 0 && (
            <button
              type="button"
              className="wait-alert-pill hide-halfscreen"
              onClick={() => {
                const targetSess = waitingSessions[0];
                switchToSession(targetSess);
                const wf = fleet.find((f) => f && f.session_name === targetSess);
                if (wf?.browser_waiting_for_human) {
                  setShowBrowser(true);
                  setShowFiles(false);
                  if (wf.browser_waiting_for_human.targetId) {
                    setPreferredBrowserTargetId(wf.browser_waiting_for_human.targetId);
                  }
                }
              }}
              title={`Agent waiting for permission or input: ${waitingSessions.join(', ')}`}
            >
              GATE // {waitingSessions.length}
            </button>
          )}

          {unreadSessions.length > 0 && (
            <button
              type="button"
              className="new-reply-pill hide-halfscreen"
              onClick={() => switchToSession(unreadSessions[0])}
              title="Click to jump straight to next unread completed session"
            >
              NEW // {unreadSessions.length}
            </button>
          )}
        </div>

        <div className="hdr-center desktop-only">
          <div
            className="cmdk-bar"
            onClick={() => setShowCommandPalette(true)}
            title="Open Command Palette (⌘K / Ctrl+K)"
          >
            <span className="cmdk-bar-inner">
              <Icon name="search" />
              <span className="cmdk-bar-text">Search nodes, files, commands...</span>
            </span>
            <span className="mono-kbd">⌘K</span>
          </div>

          <div className="seg-rail">
            <button
              type="button"
              className={`seg-item ${!showBrowser && !showFiles ? 'active' : ''}`}
              data-scramble-manual="1"
              onClick={() => selectWorkspaceTool('none')}
              onMouseEnter={termTabScramble.triggerScramble}
              onMouseLeave={termTabScramble.resetScramble}
              title="Terminal Only"
            >
              <Icon name="terminal" />
              <span>{termTabScramble.display}</span>
            </button>
            <button
              type="button"
              className={`seg-item ${showBrowser ? 'active' : ''}`}
              data-scramble-manual="1"
              onClick={() => selectWorkspaceTool('browser')}
              onMouseEnter={browserTabScramble.triggerScramble}
              onMouseLeave={browserTabScramble.resetScramble}
              title="Toggle Live CDP Co-Pilot Browser Split-Pane (Re-click to toggle Split vs Full)"
            >
              <Icon name="globe" />
              <span>{browserTabScramble.display}</span>
              {showBrowser && (
                <span className={`seg-expand-badge ${!splitMode ? 'is-full' : ''}`}>
                  {!splitMode ? 'SPLIT' : 'FULL'}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`seg-item ${showFiles ? 'active' : ''}`}
              data-scramble-manual="1"
              onClick={() => selectWorkspaceTool('files')}
              onMouseEnter={filesTabScramble.triggerScramble}
              onMouseLeave={filesTabScramble.resetScramble}
              title="Toggle File Explorer, Brain & Git Diff (Re-click to toggle Split vs Full)"
            >
              <Icon name="files" />
              <span>{filesTabScramble.display}</span>
              {showFiles && (
                <span className={`seg-expand-badge ${!splitMode ? 'is-full' : ''}`}>
                  {!splitMode ? 'SPLIT' : 'FULL'}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="hdr-cluster">
          <button
            type="button"
            className={`ghost-btn desktop-only ${showHistory ? 'active' : ''}`}
            data-scramble-manual="1"
            onClick={() => setShowHistory((prev) => !prev)}
            onMouseEnter={historyTabScramble.triggerScramble}
            onMouseLeave={historyTabScramble.resetScramble}
            title="Project Session Notebook & Past-Reincarnations History Vault"
          >
            <Icon name="history" />
            <span className="hide-halfscreen">{historyTabScramble.display}</span>
          </button>

          <button
            type="button"
            className={`ghost-btn ${showKeyboard ? 'active' : ''}`}
            data-scramble-manual="1"
            onClick={() => setShowKeyboard((prev) => !prev)}
            onMouseEnter={kbTabScramble.triggerScramble}
            onMouseLeave={kbTabScramble.resetScramble}
            title={`Toggle On-Screen Sovereign Keyboard (${showKeyboard ? 'ON' : 'OFF'})`}
          >
            <Icon name="keyboard" />
            <span className="hide-halfscreen">{kbTabScramble.display}</span>
          </button>

          <button
            type="button"
            className={`ghost-btn desktop-only ${showSettings ? 'active' : ''}`}
            onClick={() => openSettingsModal('appearance')}
            title="System Settings (Themes, Standalone App, Keyboard, Voice, Vault & 3FA)"
          >
            <Icon name="settings" />
          </button>

          <div
            className={`status-indicator ${connState}`}
            title={`WebSocket Status: ${connState.toUpperCase()}${e2eeSecret ? ' · E2EE Active' : ''}`}
          />
        </div>
      </header>

      <div
        className={`cockpit-body ${isDraggingSplit ? 'is-resizing-split' : ''} ${
          effectiveSplitMode && (showFiles || showBrowser) ? 'has-split' : ''
        }`}
        ref={cockpitBodyRef}
        style={{ '--split-pane-width': `${splitWidthPct}%` }}
      >
        <FleetSidebar
          isOpen={showFleetSidebar}
          onClose={toggleFleetSidebar}
          sessions={sessions}
          fleet={fleet}
          activeSession={activeSession}
          unreadSessions={unreadSessions}
          historyCounts={historyCounts}
          onSelectSession={switchToSession}
          onCreateSession={createSession}
          onKillSession={killSession}
          onSendSessionCommand={sendSessionCommand}
        />

        <div
          ref={terminalColumnRef}
          style={{
            display: (!showFiles && !showBrowser) || effectiveSplitMode ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {activeSession && (() => {
            const activeFleetItem = fleet.find((f) => f.session_name === activeSession);
            const isRawTmux =
              activeFleetItem &&
              (activeFleetItem.vessel === 'service' ||
                (activeFleetItem.vessel === 'shell' && !activeFleetItem.tokens_used));
            const histCount = historyCounts[activeSession] || 0;
            return (
              <div className="node-subbar">
                <div className="node-title-tag" style={{ minWidth: 0, overflow: 'hidden' }}>
                  <Icon name={isRawTmux ? 'terminal' : 'shield'} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeSession}
                  </span>
                  {!activeFleetItem?.has_browser_lease && (
                    <span className="mono-kbd" style={{ fontSize: '9px', padding: '1px 5px', color: 'var(--text-muted)' }}>
                      {isRawTmux ? 'SPLIT TMUX' : 'NO BROWSER'}
                    </span>
                  )}
                </div>
                <div className="subbar-tools-row">
                  {isRawTmux ? (
                    <button
                      type="button"
                      className={`subbar-util-btn ${tmuxStageMode === 'grid' ? 'active' : ''}`}
                      onClick={() => {
                        setTmuxStageMode((prev) => {
                          const next = prev === 'grid' ? 'pty' : 'grid';
                          if (next === 'pty') {
                            setTimeout(() => {
                              syncTerminalFitAndResize();
                            }, 60);
                          }
                          return next;
                        });
                      }}
                      title="Toggle Simultaneous Multi-Window Tmux Split Grid vs Interactive Xterm"
                    >
                      <Icon name={tmuxStageMode === 'grid' ? 'grid' : 'terminal'} size={12} />
                      <span>{tmuxStageMode === 'grid' ? 'SPLIT GRID' : 'RAW TERM'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`subbar-util-btn ${agentStageMode === 'chat' ? 'active' : ''}`}
                      onClick={() => {
                        const next = agentStageMode === 'chat' ? 'pty' : 'chat';
                        setAgentStageMode(next);
                        if (next === 'pty') {
                          setTimeout(() => {
                            try {
                              syncTerminalFitAndResize();
                              term.current?.scrollToBottom?.();
                            } catch {}
                          }, 60);
                        }
                      }}
                      title="Toggle Live Structured Chat Bubbles (Operator Highlight/Dot) vs Raw Interactive Xterm"
                    >
                      <Icon name={agentStageMode === 'chat' ? 'message' : 'terminal'} size={12} />
                      <span>{agentStageMode === 'chat' ? 'CHAT VIEW' : 'RAW TERM'}</span>
                    </button>
                  )}
                  {!isRawTmux && (
                    <button
                      type="button"
                      className={`subbar-util-btn ${sessionAutoScroll ? 'active' : ''}`}
                      style={{ padding: '0 6px' }}
                      onClick={() => {
                        setSessionAutoScroll((prev) => {
                          const next = !prev;
                          localStorage.setItem('aim-session-autoscroll', String(next));
                          return next;
                        });
                      }}
                      title={`Auto-Scroll to Latest Reply: ${
                        sessionAutoScroll ? 'ON (click to turn OFF)' : 'OFF (click to follow new replies)'
                      }`}
                      aria-label="Toggle Session Auto-Scroll"
                    >
                      <Icon name="arrowDownToLine" size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    className={`subbar-util-btn ${pasteFlash ? 'active' : ''}`}
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          pasteToTerminal(text);
                          setPasteFlash(true);
                          setTimeout(() => setPasteFlash(false), 1400);
                        }
                      } catch (e) {
                        console.error('Paste failed', e);
                      }
                    }}
                    title="Bracketed Paste from Clipboard"
                  >
                    <Icon name={pasteFlash ? 'check' : 'clipboard'} />
                    <span>{pasteFlash ? 'PASTED!' : 'PASTE'}</span>
                  </button>
                  <button
                    type="button"
                    className={`subbar-util-btn ${isNativeScrollMode ? 'active' : ''}`}
                    onClick={() => {
                      if (isNativeScrollMode) closeNativeScrollMode();
                      else enterNativeScrollMode({ focusSearch: false });
                    }}
                    title="Full 2,000-Line Scroll / Copy & Multi-Page Search (Ctrl+F)"
                  >
                    <Icon name="copyText" />
                    <span>SCROLL/COPY</span>
                  </button>
                  <button
                    type="button"
                    className={`subbar-util-btn ${showTokenGrabber ? 'active' : ''}`}
                    onClick={() => setShowTokenGrabber(true)}
                    title="Extract URLs, File Paths, IPs & Git SHAs"
                  >
                    <Icon name="link" />
                    <span>GRAB</span>
                  </button>
                  {!isRawTmux && (
                    <button
                      type="button"
                      className={`subbar-util-btn ${showForensics ? 'active' : ''}`}
                      onClick={() => setShowForensics(true)}
                      title="Forensic Tool Inspector, SQLite FTS5 Search & Swarm Dispatcher"
                    >
                      <Icon name="microscope" />
                      <span className="subbar-lbl-collapse">FORENSICS</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className={`subbar-util-btn ${showHistory ? 'active' : ''}`}
                    onClick={() => {
                      setShowHistory((prev) => {
                        const next = !prev;
                        if (next) closeNativeScrollMode();
                        return next;
                      });
                    }}
                    title="Project Session Notebook & Baton-Pass Reincarnations"
                  >
                    <Icon name="history" />
                    <span className="subbar-lbl-collapse">{isRawTmux ? 'FLEET HISTORY' : 'HISTORY'}</span>
                    {!isRawTmux && histCount > 0 && <span>({histCount})</span>}
                  </button>
                </div>
              </div>
            );
          })()}

          <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
            {!activeSession && !showHistory && (
              <div className="welcome-screen home-stage">
                <div className="ld-grid-backdrop" />
                <div className="ld-aurora-wash" />

                <div className="home-hero-badge">
                  <span className="pulse-led" />
                  <span>SOVEREIGN FLEET COCKPIT // 100% OPEN SOURCE</span>
                </div>

                <div style={{ position: 'relative', zIndex: 2 }}>
                  <h1 className="home-slogan">
                    Own your stack.
                    <br />
                    <span
                      className="home-slogan-grad"
                      data-scramble-manual="1"
                      onMouseEnter={homeSloganScramble.triggerScramble}
                      onMouseLeave={homeSloganScramble.resetScramble}
                    >
                      {homeSloganScramble.display}
                    </span>
                  </h1>
                  <p
                    style={{
                      maxWidth: '480px',
                      margin: '12px auto 0',
                      fontSize: '13.5px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                    }}
                  >
                    You are securely authenticated via 3FA &amp; E2EE, with no active workspace attached to the center viewport.
                  </p>
                </div>

                <div className="home-quick-card ld-mask-glass">
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.16em',
                      color: 'var(--accent)',
                    }}
                  >
                    QUICK LAUNCH // ATTACH WORKSPACE
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                    {sessions.length === 0 ? (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        No active tmux sessions yet — click + New in the Fleet rail to spawn one.
                      </span>
                    ) : (
                      sessions.slice(0, 6).map((sName) => {
                        const sColor = getAgentColor(sName);
                        return (
                          <button
                            key={sName}
                            type="button"
                            className="project-pill"
                            style={{
                              '--agent-color': sColor.hex,
                              '--agent-rgb': sColor.rgb,
                              cursor: 'pointer',
                              padding: '5px 12px',
                            }}
                            onClick={() => switchToSession(sName)}
                          >
                            <span className="project-pill-dot" />
                            {sName}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      paddingTop: '6px',
                      borderTop: '1px solid var(--border-hairline)',
                    }}
                  >
                    <span>
                      Press <span className="mono-kbd">⌘K</span> to search sessions, macros &amp; commands
                    </span>
                    <span>
                      Click <strong>+ New</strong> in the Fleet rail to spawn an isolated node
                    </span>
                  </div>
                </div>

                <div className="home-coffee-card">
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '460px' }}>
                    A.I.M. Connect is proudly <strong>100% ad-free and open-source</strong>. If this tool helps you take back control, consider buying me a coffee to keep the servers humming.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '2px' }}>
                    <a
                      href="https://buymeacoffee.com/brianv1981"
                      target="_blank"
                      rel="noreferrer"
                      className="coffee-cta-btn"
                    >
                      <Icon name="coffee" />
                      <span>BUY ME A COFFEE</span>
                    </a>
                    <a
                      href="https://github.com/BrianV1981/aim-connect"
                      target="_blank"
                      rel="noreferrer"
                      className="subbar-util-btn"
                      style={{ height: '36px', padding: '0 12px', textDecoration: 'none' }}
                    >
                      [ GITHUB ]
                    </a>
                    <a
                      href="https://github.com/BrianV1981/aim-ecosystem"
                      target="_blank"
                      rel="noreferrer"
                      className="subbar-util-btn"
                      style={{ height: '36px', padding: '0 12px', textDecoration: 'none' }}
                    >
                      [ A.I.M. ECOSYSTEM ]
                    </a>
                  </div>
                </div>
              </div>
            )}

            {(() => {
              const activeFleetItem = fleet.find((f) => f.session_name === activeSession);
              const isRawTmux =
                Boolean(activeSession) &&
                activeFleetItem &&
                (activeFleetItem.vessel === 'service' ||
                  (activeFleetItem.vessel === 'shell' && !activeFleetItem.tokens_used));
              const showLiveChat =
                Boolean(activeSession) &&
                !isRawTmux &&
                agentStageMode === 'chat' &&
                !showHistory &&
                !isNativeScrollMode;
              const showTmuxGrid =
                Boolean(activeSession) &&
                Boolean(isRawTmux) &&
                tmuxStageMode === 'grid' &&
                !showHistory &&
                !isNativeScrollMode;
              const hideXterm = showHistory || showLiveChat || showTmuxGrid;

              return (
                <>
                  <div
                    className="terminal-stage-pad"
                    style={{
                      pointerEvents: isNativeScrollMode || hideXterm ? 'none' : 'auto',
                      visibility: hideXterm ? 'hidden' : 'visible',
                    }}
                  >
                    <div
                      className="terminal-container"
                      ref={terminalRef}
                    />
                  </div>
                  {!hideXterm && activeSession && !isNativeScrollMode && xtermScrolledUp && (
                    <button
                      type="button"
                      className="hop-bottom-fab"
                      onClick={() => {
                        try {
                          term.current?.scrollToBottom?.();
                        } catch {}
                        setXtermScrolledUp(false);
                      }}
                      title="Hop to bottom of terminal"
                      aria-label="Hop to bottom of terminal"
                    >
                      <Icon name="arrowDown" size={14} />
                    </button>
                  )}
                  {showLiveChat && (
                    <LiveTranscriptStage
                      activeSession={activeSession}
                      fleetItem={activeFleetItem}
                      operatorStyle={operatorStyle}
                      operatorSide={operatorSide}
                      termFontSize={termFontSize}
                      termTheme={termTheme}
                      autoScroll={sessionAutoScroll}
                      optimisticMessages={optimisticChatBySession[activeSession] || []}
                      onReconcileOptimistic={reconcileOptimisticChat}
                      onOpenFileLink={handleOpenFileFromChat}
                      onDownloadAttachment={downloadShotFile}
                      onSpeakText={(txt) => speakSummaryText(txt)}
                      onSendRawCommand={sendCommand}
                      onSwitchToTerminal={() => {
                        setAgentStageMode('pty');
                        setTimeout(() => {
                          try {
                            syncTerminalFitAndResize();
                            term.current?.scrollToBottom?.();
                          } catch {}
                        }, 60);
                      }}
                    />
                  )}
                  {showTmuxGrid && (
                    <TmuxServerStage
                      activeSession={activeSession}
                      termFontSize={termFontSize}
                      onSwitchToInteractiveTerm={() => {
                        setTmuxStageMode('pty');
                        setTimeout(() => {
                          syncTerminalFitAndResize();
                        }, 60);
                      }}
                    />
                  )}
                </>
              );
            })()}
            {showHistory && (
              <HistoryVault
                activeSession={activeSession}
                fleet={fleet}
                operatorStyle={operatorStyle}
                operatorSide={operatorSide}
                onHistoryCountsChange={setHistoryCounts}
                onOpenFileLink={handleOpenFileFromChat}
                onInjectToAgent={(text) => {
                  setShowHistory(false);
                  pasteToTerminal(text);
                }}
                onClose={() => setShowHistory(false)}
              />
            )}
            {isNativeScrollMode && !showHistory && (
              <ScrollbackOverlay
                scrollbackContent={scrollbackContent}
                rawScrollback={rawScrollback}
                isSelectMode={isSelectMode}
                focusSearch={scrollFocusSearch}
                onToggleSelectMode={toggleScrollbackSelectMode}
                onRefresh={() => enterNativeScrollMode({ focusSearch: false })}
                onClose={closeNativeScrollMode}
              />
            )}
          </div>

          {activeSession && (() => {
            const isControlKeyMacro = (m) =>
              m.id.startsWith('pre-') || m.id === '1';
            const pinnedKeys = macroLibrary.filter((m) => m.isPinned && isControlKeyMacro(m));
            const pinnedCmds = macroLibrary.filter((m) => m.isPinned && !isControlKeyMacro(m));
            const curStaged = stagedAttachments[activeSession] || [];

            return (
              <div className="ld-composer-shell">
                {showBoltPopover && (
                  <div className="quick-actions-popover" onClick={(e) => e.stopPropagation()}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingBottom: '6px',
                        borderBottom: '1px solid var(--border-hairline)',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '0.14em',
                          color: 'var(--accent)',
                        }}
                      >
                        MACROS &amp; CONTROL KEYS
                      </span>
                      <button
                        type="button"
                        className={`subbar-util-btn ${showKeybar ? 'active' : ''}`}
                        onClick={() => {
                          setShowKeybar((prev) => {
                            const next = !prev;
                            localStorage.setItem('aim-show-keybar', String(next));
                            setTimeout(() => {
                              try {
                                fitAddon.current?.fit();
                              } catch {}
                            }, 50);
                            return next;
                          });
                        }}
                      >
                        <Icon name="keyboard" size={12} />
                        <span>KEYBAR: {showKeybar ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>

                    {pinnedKeys.length > 0 && (
                      <>
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9.5px',
                            color: 'var(--text-muted)',
                            letterSpacing: '0.1em',
                            marginTop: '2px',
                          }}
                        >
                          TERMINAL CONTROL PAD ({pinnedKeys.length})
                        </div>
                        <div className="ctrl-key-grid">
                          {pinnedKeys.map((k) => (
                            <button
                              key={k.id}
                              type="button"
                              className="ctrl-mini-key"
                              onClick={() => {
                                sendCommand(k.cmd);
                                setShowBoltPopover(false);
                              }}
                              title={k.voiceTrigger ? `${k.label} · mic: "${k.voiceTrigger}"` : k.label}
                            >
                              {k.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {pinnedCmds.length > 0 && (
                      <>
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9.5px',
                            color: 'var(--text-muted)',
                            letterSpacing: '0.1em',
                            marginTop: '4px',
                          }}
                        >
                          PINNED COMMANDS &amp; SKILLS ({pinnedCmds.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {pinnedCmds.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              className="bolt-cmd-item"
                              onClick={() => {
                                sendCommand(m.cmd);
                                setShowBoltPopover(false);
                              }}
                            >
                              <span>
                                {m.isServer ? '☁ ' : ''}
                                {m.label}
                              </span>
                              <span className="mono-kbd">
                                {String(m.cmd || '').replace(/\r/g, '\\r')}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    <button
                      type="button"
                      className="macro-manage-footer-btn"
                      onClick={() => {
                        setShowBoltPopover(false);
                        setMacroReturnToVoice(false);
                        setShowMacroLibrary(true);
                      }}
                    >
                      <Icon name="settings" size={13} />
                      <span>MACRO STUDIO // CREATE, EDIT &amp; SYNC ({macroLibrary.length})</span>
                    </button>
                  </div>
                )}

                {showKeybar && !showKeyboard && (
                  <div className="commander-toolbar composer-keybar">
                    <div className="macro-group">
                      {macroLibrary
                        .filter((m) => m.isPinned)
                        .map((macro) => (
                          <button
                            key={macro.id}
                            type="button"
                            className="macro-btn action"
                            onClick={() => sendCommand(macro.cmd)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              toggleMacroPin(macro.id);
                            }}
                          >
                            {macro.isServer ? '☁ ' : ''}
                            {macro.label}
                          </button>
                        ))}
                      <button
                        type="button"
                        className="macro-btn action add-macro"
                        onClick={() => {
                          setMacroReturnToVoice(false);
                          setShowMacroLibrary(true);
                        }}
                        title="Open Macro Studio"
                      >
                        <Icon name="settings" size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {curStaged.length > 0 && (
                  <div className="staged-attachments-row">
                    {curStaged.map((att) => (
                      <span key={att.id} className="staged-shot-chip" title={att.path}>
                        <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
                          <Icon name="camera" size={12} />
                        </span>
                        <button
                          type="button"
                          className="shot-link-btn"
                          onClick={() => handleOpenFileFromChat(att.path)}
                          title={`Preview ${att.filename} in Files`}
                        >
                          {att.filename}
                        </button>
                        {att.annotated && (
                          <span className="mono-kbd" style={{ fontSize: '8.5px', color: 'var(--accent)' }}>
                            MARKED
                          </span>
                        )}
                        {att.dims && <span style={{ color: 'var(--text-muted)' }}>{att.dims}</span>}
                        <button
                          type="button"
                          className="shot-chip-icon-btn"
                          onClick={() => setEditingShot({ sessionKey: activeSession, attachment: att })}
                          title="Open Visual Markup Studio (drop ① ② ③ pins, circles, or arrows)"
                          aria-label={`Annotate ${att.filename}`}
                        >
                          <Icon name="edit" size={11} />
                        </button>
                        <button
                          type="button"
                          className="shot-chip-icon-btn"
                          onClick={() => downloadShotFile(att)}
                          title={`Download ${att.filename}`}
                          aria-label={`Download ${att.filename}`}
                        >
                          <Icon name="downloadSm" size={11} />
                        </button>
                        <button
                          type="button"
                          className="ghost-btn"
                          style={{ height: '18px', padding: '0 4px' }}
                          onClick={() => removeStagedAttachment(activeSession, att.id)}
                          title="Remove attached file"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <form className="ld-composer-row" onSubmit={handleComposerSubmit}>
                  <button
                    type="button"
                    className={`ld-bolt-btn ${showBoltPopover ? 'active' : ''}`}
                    onClick={() => setShowBoltPopover((prev) => !prev)}
                    title="Terminal Control Pad, Pinned Macros & Macro Studio"
                  >
                    <Icon name="zap" size={15} />
                  </button>
                  <div className="ld-input-box">
                    <input
                      type="text"
                      className="ld-prompt-field"
                      placeholder={
                        isListening
                          ? `Listening on mic — speak directive for ${activeSession}...`
                          : `Transmit directive to ${activeSession}... (Paste screenshot with Ctrl+V)`
                      }
                      value={composerText}
                      onChange={(e) => setComposerText(e.target.value)}
                      onPaste={handleComposerPaste}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className={`composer-icon-btn ${isListening ? 'mic-on' : ''}`}
                      onClick={startDictation}
                      title={isListening ? 'Stop Voice Dictation' : 'Start Voice Dictation'}
                    >
                      <Icon name={isListening ? 'mic' : 'micOff'} size={14} />
                    </button>
                    <button
                      type="button"
                      className={`composer-icon-btn ${isSpeaking || voiceAutoRead ? 'speak-on' : ''}`}
                      onClick={handleSpeakSummary}
                      title="Speak latest 🔊 agent summary"
                    >
                      <Icon name={isSpeaking ? 'volumeOff' : 'volume'} size={14} />
                    </button>
                    <button type="submit" className="ld-send-btn" title="Send Directive">
                      <Icon name="send" size={14} />
                    </button>
                  </div>
                </form>
              </div>
            );
          })()}
        </div>

        {effectiveSplitMode && (showFiles || showBrowser) && (
          <div
            className={`split-pane-resizer ${isDraggingSplit ? 'dragging' : ''}`}
            role="separator"
            aria-orientation="vertical"
            aria-label="Drag vertical divider to resize split panel"
            title="Drag to resize panel · Double-click to reset"
            onPointerDown={handleSplitDividerPointerDown}
            onDoubleClick={handleSplitDividerDoubleClick}
          >
            <span className="split-pane-resizer-grip" />
          </div>
        )}

        <FileExplorer
          isOpen={showFiles}
          activeSession={activeSession}
          splitMode={effectiveSplitMode}
          uiTheme={theme}
          treeSide={filesTreeSide}
          onToggleTreeSide={() => {
            setFilesTreeSide((prev) => {
              const next = prev === 'right' ? 'left' : 'right';
              localStorage.setItem('aim-files-tree-side', next);
              return next;
            });
          }}
          hideDotfiles={filesHideDotfiles}
          onToggleHideDotfiles={() => {
            setFilesHideDotfiles((prev) => {
              const next = !prev;
              localStorage.setItem('aim-files-hide-dotfiles', JSON.stringify(next));
              return next;
            });
          }}
          docsSingleTabMode={docsSingleTabMode}
          onToggleDocsSingleTabMode={() => {
            setDocsSingleTabMode((prev) => {
              const next = !prev;
              localStorage.setItem('aim-docs-single-tab', String(next));
              return next;
            });
          }}
          editorFontSize={editorFontSize}
          editorWordWrap={editorWordWrap}
          requestedFile={requestedExplorerFile}
          selectMode={fileSelectMode}
          onToggleSelectMode={() => setFileSelectMode((prev) => !prev)}
          onToggleSplitMode={() => {
            setSplitMode((prev) => !prev);
            setTimeout(() => {
              try {
                fitAddon.current?.fit();
              } catch {}
            }, 80);
          }}
          onClose={() => {
            setShowFiles(false);
            setFileSelectMode(false);
            setTimeout(() => {
              try {
                fitAddon.current?.fit();
              } catch {}
            }, 80);
          }}
          editorRef={editorRef}
        />

        <BrowserPane
          isOpen={showBrowser}
          splitMode={effectiveSplitMode}
          apiToken={apiTokenRef.current}
          activeSession={activeSession}
          preferredTargetId={preferredBrowserTargetId}
          fleet={fleet}
          onAttachToComposer={attachToActiveComposer}
          onSendSessionCommand={sendSessionCommand}
          onToggleSplitMode={() => {
            setSplitMode((prev) => !prev);
            setTimeout(() => {
              try {
                fitAddon.current?.fit();
              } catch {}
            }, 80);
          }}
          onClose={() => {
            setShowBrowser(false);
            setTimeout(() => {
              try {
                fitAddon.current?.fit();
              } catch {}
            }, 80);
          }}
        />
      </div>

      {/* Frosted Mobile Bottom Dock (<768px 1-Tap Full-View Browser, Files, Voice & Settings — #258, #280) */}
      <nav className="ld-mobile-dock" aria-label="Mobile Navigation Dock">
        <button
          type="button"
          className={`m-dock-tab ${showFleetSidebar ? 'active' : ''}`}
          onClick={toggleFleetSidebar}
          style={{ position: 'relative' }}
        >
          <Icon name="cpu" size={15} />
          <span>FLEET</span>
          {unreadSessions.length > 0 && (
            <span className="fleet-header-unread-dot" title={`${unreadSessions.length} unread completed session(s)`}>
              {unreadSessions.length}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`m-dock-tab ${!showBrowser && !showFiles && !showFleetSidebar ? 'active' : ''}`}
          onClick={() => {
            setShowFleetSidebar(false);
            selectWorkspaceTool('none');
          }}
        >
          <Icon name="terminal" size={15} />
          <span>TERMINAL</span>
        </button>
        <button
          type="button"
          className={`m-dock-tab ${showBrowser && !showFleetSidebar ? 'active' : ''}`}
          onClick={() => {
            setShowFleetSidebar(false);
            setShowBrowser(true);
            setShowFiles(false);
          }}
        >
          <Icon name="globe" size={15} />
          <span>BROWSER</span>
        </button>
        <button
          type="button"
          className={`m-dock-tab ${showFiles && !showFleetSidebar ? 'active' : ''}`}
          onClick={() => {
            setShowFleetSidebar(false);
            setShowFiles(true);
            setShowBrowser(false);
          }}
        >
          <Icon name="files" size={15} />
          <span>FILES</span>
        </button>
        <button
          type="button"
          className={`m-dock-tab ${isListening ? 'active' : ''}`}
          onClick={startDictation}
        >
          <Icon name="mic" size={15} />
          <span>VOICE</span>
        </button>
        <button
          type="button"
          className={`m-dock-tab ${showSettings ? 'active' : ''}`}
          onClick={() => openSettingsModal('appearance')}
        >
          <Icon name="settings" size={15} />
          <span>SETTINGS</span>
        </button>
      </nav>

      {showKeyboard && (
        <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div className="commander-toolbar" style={{ borderTop: '1px solid var(--border-hairline)', borderRadius: 0 }}>
            <div className="macro-group">
              {macroLibrary
                .filter((m) => m.isPinned)
                .map((macro) => (
                  <button
                    key={macro.id}
                    type="button"
                    className="macro-btn action"
                    onClick={() => sendCommand(macro.cmd)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      toggleMacroPin(macro.id);
                    }}
                  >
                    {macro.isServer ? '☁ ' : ''}
                    {macro.label}
                  </button>
                ))}
              <button
                type="button"
                className="macro-btn action add-macro"
                onClick={() => {
                  setMacroReturnToVoice(false);
                  setShowMacroLibrary(true);
                }}
              >
                <Icon name="settings" size={13} />
              </button>
            </div>
          </div>
          <Keyboard
            mode={keyboardMode}
            onChangeMode={(nextMode) => {
              setKeyboardMode(nextMode);
              localStorage.setItem('aim-kb-mode', nextMode);
            }}
            onClose={() => setShowKeyboard(false)}
            autoCaps={autoCaps}
            feedbackMode={keyboardFeedback}
            onKeyPress={(key) => {
              if (showFiles && editorRef.current) {
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
            }}
          />
        </div>
      )}

      {showMacroLibrary && (
        <MacroLibraryModal
          macroLibrary={macroLibrary}
          onToggleMacroPin={toggleMacroPin}
          onSaveMacro={saveMacro}
          onDeleteMacro={deleteMacro}
          onImportMacros={importMacros}
          onRunMacro={(cmdStr) => sendCommand(cmdStr)}
          returnToVoice={macroReturnToVoice}
          onBackToVoice={() => {
            setMacroReturnToVoice(false);
            setShowMacroLibrary(false);
            openSettingsModal('voice');
          }}
          onClose={() => {
            setMacroReturnToVoice(false);
            setShowMacroLibrary(false);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          initialTab={settingsInitialTab}
          activeSession={activeSession}
          macroLibrary={macroLibrary}
          onOpenVoiceMacros={() => {
            setShowSettings(false);
            setMacroReturnToVoice(true);
            setShowMacroLibrary(true);
          }}
          deferredInstallPrompt={deferredInstallPrompt}
          onTriggerInstallApp={triggerInstallApp}
          onLogout={handleLogout}
          autoCaps={autoCaps}
          setAutoCaps={setAutoCaps}
          keyboardMode={keyboardMode}
          setKeyboardMode={setKeyboardMode}
          theme={theme}
          setTheme={setTheme}
          operatorStyle={operatorStyle}
          setOperatorStyle={setOperatorStyle}
          operatorSide={operatorSide}
          setOperatorSide={setOperatorSide}
          keyboardFeedback={keyboardFeedback}
          setKeyboardFeedback={setKeyboardFeedback}
          alertChime={alertChime}
          setAlertChime={setAlertChime}
          termFontSize={termFontSize}
          setTermFontSize={setTermFontSize}
          termTheme={termTheme}
          setTermTheme={setTermTheme}
          filesTreeSide={filesTreeSide}
          setFilesTreeSide={setFilesTreeSide}
          filesHideDotfiles={filesHideDotfiles}
          setFilesHideDotfiles={setFilesHideDotfiles}
          docsSingleTabMode={docsSingleTabMode}
          setDocsSingleTabMode={setDocsSingleTabMode}
          sessionAutoScroll={sessionAutoScroll}
          setSessionAutoScroll={setSessionAutoScroll}
          editorFontSize={editorFontSize}
          setEditorFontSize={setEditorFontSize}
          editorWordWrap={editorWordWrap}
          setEditorWordWrap={setEditorWordWrap}
          agentStageMode={agentStageMode}
          setAgentStageMode={setAgentStageMode}
          splitWidthPct={splitWidthPct}
          onSetSplitPreset={(pctVal) => {
            setSplitWidthPct(pctVal);
            localStorage.setItem('aim-split-pane-pct', String(pctVal));
            setTimeout(() => {
              try {
                fitAddon.current?.fit();
              } catch {}
            }, 60);
          }}
          voiceAutoRead={voiceAutoRead}
          setVoiceAutoRead={setVoiceAutoRead}
          ttsVoice={ttsVoice}
          setTtsVoice={setTtsVoice}
          onPreviewVoice={(v) =>
            speakSummaryText('All systems online. Neural voice synthesis verified.', v)
          }
          voiceContinuous={voiceContinuous}
          setVoiceContinuous={setVoiceContinuous}
          voiceAutoEnter={voiceAutoEnter}
          setVoiceAutoEnter={setVoiceAutoEnter}
          voiceAutoSend={voiceAutoSend}
          setVoiceAutoSend={setVoiceAutoSend}
          voiceAutoExecute={voiceAutoExecute}
          setVoiceAutoExecute={setVoiceAutoExecute}
          voiceAutoCapitalize={voiceAutoCapitalize}
          setVoiceAutoCapitalize={setVoiceAutoCapitalize}
          voiceSlashes={voiceSlashes}
          setVoiceSlashes={setVoiceSlashes}
          apiToken={apiTokenRef.current}
          e2eeSecret={e2eeSecret}
          setE2eeSecret={setE2eeSecret}
        />
      )}

      <SpawnSessionModal
        isOpen={isSpawnModalOpen}
        onClose={() => setIsSpawnModalOpen(false)}
        onConfirm={confirmCreateSession}
      />

      <ShotMarkupModal
        isOpen={Boolean(editingShot?.attachment)}
        attachment={editingShot?.attachment || null}
        onSaveAnnotated={(updated) => {
          if (editingShot?.sessionKey) {
            updateStagedAttachment(editingShot.sessionKey, updated);
          }
        }}
        onDownload={downloadShotFile}
        onClose={() => setEditingShot(null)}
      />

      <DeleteSessionModal
        isOpen={isDeleteSessionModalOpen}
        onClose={() => {
          setIsDeleteSessionModalOpen(false);
          setSessionToDelete('');
        }}
        onConfirm={confirmKillSession}
        sessionName={sessionToDelete || activeSession}
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
        onToggleFiles={() => selectWorkspaceTool('files')}
        onToggleBrowser={() => selectWorkspaceTool('browser')}
        onToggleFleetSidebar={toggleFleetSidebar}
        onOpenTokenGrabber={() => setShowTokenGrabber(true)}
        onOpenForensics={() => setShowForensics(true)}
        onOpenHistory={() => {
          closeNativeScrollMode();
          setShowHistory(true);
        }}
        onToggleChatMode={() =>
          setAgentStageMode(agentStageMode === 'chat' ? 'pty' : 'chat')
        }
        onEnterScrollMode={() => enterNativeScrollMode({ focusSearch: false })}
        onOpenSearch={() => enterNativeScrollMode({ focusSearch: true })}
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
        onOpenSettings={() => openSettingsModal('appearance')}
        onOpenIntegrations={() => openSettingsModal('integrations')}
        onSetUiTheme={setTheme}
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
