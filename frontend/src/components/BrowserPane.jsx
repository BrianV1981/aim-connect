import { useCallback, useEffect, useRef, useState } from 'react';
import { getAgentColor, resolveTabAgentInfo } from '../agentColors';
import Icon from './Icons';

const KEY_CODE_MAP = {
  Enter: 13,
  Backspace: 8,
  Tab: 9,
  Escape: 27,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Delete: 46,
};

export default function BrowserPane({
  isOpen,
  splitMode,
  apiToken,
  activeSession = '',
  preferredTargetId = '',
  fleet = [],
  onAttachToComposer,
  onToggleSplitMode,
  onClose,
}) {
  const [daemonRunning, setDaemonRunning] = useState(false);
  const [startingDaemon, setStartingDaemon] = useState(false);
  const [tabs, setTabs] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [activeTargetId, setActiveTargetId] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [controlMode, setControlMode] = useState(false);
  const [showTextBar, setShowTextBar] = useState(false);
  const [quickText, setQuickText] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [hudOverlay, setHudOverlay] = useState(null);
  const [extFlash, setExtFlash] = useState(false);
  const [shotFlash, setShotFlash] = useState(false);
  const [showDownloadsPopover, setShowDownloadsPopover] = useState(false);
  const [downloads, setDownloads] = useState([]);
  const [dismissedDownloadIds, setDismissedDownloadIds] = useState([]);

  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const stageSizeRef = useRef({ width: 1280, height: 900 });
  const viewportMetaRef = useRef({ deviceWidth: 1280, deviceHeight: 900 });
  const wsRef = useRef(null);
  const activeTargetRef = useRef('');
  const closingIdsRef = useRef(new Set());
  const hudTimerRef = useRef(null);
  const lastHudSeqRef = useRef(-1);
  const lastMoveSentRef = useRef(0);
  const touchLastYRef = useRef(null);
  const lastAutoSyncedSessionRef = useRef('');

  const measureStageSize = useCallback(() => {
    const el = stageRef.current;
    if (!el) return stageSizeRef.current;
    const rect = el.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (w >= 320 && h >= 320) {
      stageSizeRef.current = { width: w, height: h };
    }
    return stageSizeRef.current;
  }, []);

  useEffect(() => {
    activeTargetRef.current = activeTargetId;
  }, [activeTargetId]);

  const showHud = useCallback((hud) => {
    if (!hud || typeof hud !== 'object') return;
    if (hud.ts && Date.now() - Number(hud.ts) > 6000) return;
    if (hud.seq !== undefined && hud.seq !== null) {
      const seqNum = Number(hud.seq);
      if (Number.isFinite(seqNum)) {
        if (seqNum === lastHudSeqRef.current) return;
        lastHudSeqRef.current = seqNum;
      }
    }
    setHudOverlay(hud);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => setHudOverlay(null), 4500);
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/browser/status');
      if (!res.ok) return null;
      const data = await res.json();
      setDaemonRunning(Boolean(data.running));
      if (Array.isArray(data.favorites)) {
        setFavorites(data.favorites);
      }
      const rawTabs = Array.isArray(data.tabs) ? data.tabs : [];
      const nextTabs = rawTabs.filter((t) => !closingIdsRef.current.has(t.id));
      setTabs(nextTabs);
      if (data.hud) showHud(data.hud);
      if (nextTabs.length > 0) {
        const cur = activeTargetRef.current;
        const found = nextTabs.find((t) => t.id === cur) || nextTabs[0];
        if (found.id !== cur) {
          setActiveTargetId(found.id);
        }
        setAddressInput((prev) => prev || found.url || '');
      }
      return data;
    } catch {
      return null;
    }
  }, [showHud]);

  const connectScreencast = useCallback(
    (targetIdToAttach = '') => {
      const token =
        apiToken ||
        localStorage.getItem('aim-token') ||
        localStorage.getItem('aim-api-token') ||
        '';
      if (!token) return;
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${proto}//${window.location.host}/ws/browser`);
      wsRef.current = socket;

      socket.onopen = () => {
        const dims = measureStageSize();
        socket.send(
          JSON.stringify({
            type: 'auth',
            token,
            target_id: targetIdToAttach || activeTargetRef.current || '',
            width: dims.width,
            height: dims.height,
          })
        );
      };

      socket.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'ready') {
            setDaemonRunning(true);
            setStatusMsg('');
            if (msg.target_id) {
              activeTargetRef.current = msg.target_id;
              setActiveTargetId(msg.target_id);
            }
            if (msg.url !== undefined) setAddressInput(msg.url);
            refreshStatus();
          } else if (msg.type === 'daemon_offline') {
            setDaemonRunning(false);
            setStatusMsg('Browser daemon stopped — tap Launch Browser to start.');
          } else if (msg.type === 'navigated') {
            if (!msg.target_id || msg.target_id === activeTargetRef.current) {
              if (msg.url) setAddressInput(msg.url);
            }
            refreshStatus();
          } else if (msg.type === 'hud' && msg.hud) {
            showHud(msg.hud);
          } else if (msg.type === 'error') {
            setStatusMsg(msg.message || 'Browser error');
          } else if (msg.type === 'frame' && msg.data) {
            if (msg.target_id && activeTargetRef.current && msg.target_id !== activeTargetRef.current) {
              return;
            }
            const meta = msg.metadata || {};
            const dw = Number(meta.deviceWidth) || 1280;
            const dh = Number(meta.deviceHeight) || 800;
            viewportMetaRef.current = { deviceWidth: dw, deviceHeight: dh };

            const canvas = canvasRef.current;
            if (!canvas) return;
            const img = new Image();
            img.onload = () => {
              if (!canvasRef.current) return;
              if (canvasRef.current.width !== dw || canvasRef.current.height !== dh) {
                canvasRef.current.width = dw;
                canvasRef.current.height = dh;
              }
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) ctx.drawImage(img, 0, 0, dw, dh);
            };
            img.src = `data:image/jpeg;base64,${msg.data}`;
          }
        } catch {
          /* ignore malformed frame */
        }
      };

      socket.onclose = () => {
        if (wsRef.current === socket) {
          wsRef.current = null;
        }
      };
    },
    [apiToken, measureStageSize, refreshStatus, showHud]
  );

  const sendWs = (payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  const handleSelectTab = useCallback(
    (tab) => {
      if (!tab?.id) return;
      setActiveTargetId(tab.id);
      activeTargetRef.current = tab.id;
      setAddressInput(tab.url || '');
      const dims = measureStageSize();
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: 'switch_target', target_id: tab.id, width: dims.width, height: dims.height })
        );
      } else {
        connectScreencast(tab.id);
      }
    },
    [connectScreencast, measureStageSize]
  );

  // Auto-focus active session's leased tab when switching nodes (#260)
  useEffect(() => {
    if (!isOpen || tabs.length === 0 || !activeSession) return;
    const syncKey = `${activeSession}:${preferredTargetId}`;
    if (lastAutoSyncedSessionRef.current === syncKey) return;

    const byId = preferredTargetId ? tabs.find((t) => t.id === preferredTargetId) : null;
    const byOwner =
      byId ||
      tabs.find((t) => {
        const info = resolveTabAgentInfo(t, hudOverlay, fleet);
        return info?.agentKey && info.agentKey.toLowerCase() === activeSession.toLowerCase();
      });

    if (byOwner) {
      lastAutoSyncedSessionRef.current = syncKey;
      if (byOwner.id !== activeTargetRef.current) {
        handleSelectTab(byOwner);
      }
    }
  }, [isOpen, tabs, activeSession, preferredTargetId, hudOverlay, fleet, handleSelectTab]);

  // Zero CPU / bandwidth when pane is closed; attach on open
  useEffect(() => {
    if (!isOpen) {
      lastAutoSyncedSessionRef.current = '';
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
      return undefined;
    }

    let cancelled = false;
    (async () => {
      const st = await refreshStatus();
      if (!cancelled && st?.running) {
        const pref =
          (preferredTargetId && st.tabs?.find((t) => t.id === preferredTargetId)?.id) ||
          activeTargetRef.current ||
          st.tabs?.[0]?.id ||
          '';
        connectScreencast(pref);
      }
    })();

    const poll = setInterval(() => {
      refreshStatus();
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 6000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
    };
  }, [isOpen, connectScreencast, preferredTargetId, refreshStatus]);

  // Dynamically match Chromium viewport height & width to the full split/full pane stage (#249)
  useEffect(() => {
    if (!isOpen || !stageRef.current || typeof ResizeObserver === 'undefined') return undefined;
    let resizeTimer = null;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      if (w < 320 || h < 320) return;
      const prev = stageSizeRef.current;
      if (Math.abs(w - prev.width) < 4 && Math.abs(h - prev.height) < 4) return;
      stageSizeRef.current = { width: w, height: h };
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'resize_viewport', width: w, height: h }));
        }
      }, 100);
    });
    observer.observe(stageRef.current);
    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      observer.disconnect();
    };
  }, [isOpen, daemonRunning, splitMode]);

  const handleStartBrowser = async () => {
    setStartingDaemon(true);
    setStatusMsg('Starting headless loopback Chromium CDP...');
    try {
      const res = await fetch('/api/browser/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'auto', url: addressInput || 'https://example.com' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(data.detail || 'Failed to start browser');
        return;
      }
      setDaemonRunning(true);
      setTabs(data.tabs || []);
      const tid = data.tabs?.[0]?.id || '';
      setActiveTargetId(tid);
      setStatusMsg('');
      connectScreencast(tid);
    } catch (err) {
      setStatusMsg(`Start failed: ${err.message}`);
    } finally {
      setStartingDaemon(false);
    }
  };

  const handleNewTab = async () => {
    try {
      const res = await fetch('/api/browser/tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'about:blank', lease: tabs.length === 0 ? 'operator' : '' }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.tabs) setTabs(data.tabs.filter((t) => !closingIdsRef.current.has(t.id)));
      if (data.tab?.id) {
        handleSelectTab({ id: data.tab.id, url: data.tab.url || 'about:blank' });
      }
    } catch {}
  };

  const handleCloseTab = async (e, tabId) => {
    e.stopPropagation();
    closingIdsRef.current.add(tabId);
    const closedIdx = tabs.findIndex((t) => t.id === tabId);
    const optimisticRemaining = tabs.filter((t) => t.id !== tabId);
    setTabs(optimisticRemaining);

    if (tabId === activeTargetId && optimisticRemaining.length > 0) {
      const nextIdx = Math.min(Math.max(0, closedIdx), optimisticRemaining.length - 1);
      handleSelectTab(optimisticRemaining[nextIdx]);
    }

    try {
      const res = await fetch(`/api/browser/tabs/${encodeURIComponent(tabId)}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        const serverTabs = (data.tabs || []).filter((t) => t.id !== tabId && !closingIdsRef.current.has(t.id));
        setTabs(serverTabs);
      }
    } catch {
      /* refreshStatus will reconcile if DELETE failed */
    } finally {
      setTimeout(() => {
        closingIdsRef.current.delete(tabId);
      }, 4000);
    }
  };

  const handleNavigateSubmit = (e) => {
    e.preventDefault();
    if (!addressInput.trim()) return;
    if (!daemonRunning) {
      handleStartBrowser();
      return;
    }
    sendWs({ type: 'navigate', url: addressInput.trim() });
  };

  const mapCanvasCoords = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const { deviceWidth, deviceHeight } = viewportMetaRef.current;
    const x = Math.max(0, Math.min(deviceWidth, ((clientX - rect.left) / Math.max(1, rect.width)) * deviceWidth));
    const y = Math.max(0, Math.min(deviceHeight, ((clientY - rect.top) / Math.max(1, rect.height)) * deviceHeight));
    return { x: Math.round(x), y: Math.round(y) };
  };

  const handlePointerMouse = (eventType, e) => {
    if (!controlMode || !daemonRunning) return;
    if (eventType === 'mouseMoved') {
      const now = performance.now();
      if (now - lastMoveSentRef.current < 40) return;
      lastMoveSentRef.current = now;
    }
    if (eventType === 'mousePressed') {
      canvasRef.current?.focus();
    }
    const { x, y } = mapCanvasCoords(e.clientX, e.clientY);
    const button = e.button === 2 ? 'right' : eventType === 'mouseMoved' ? 'none' : 'left';
    sendWs({ type: 'mouse', eventType, x, y, button, clickCount: 1 });
  };

  const handleCanvasWheel = (e) => {
    if (!controlMode || !daemonRunning) return;
    e.preventDefault();
    const { x, y } = mapCanvasCoords(e.clientX, e.clientY);
    sendWs({ type: 'wheel', x, y, deltaX: e.deltaX, deltaY: e.deltaY });
  };

  const handleCanvasKeyDown = (e) => {
    if (!controlMode || !daemonRunning) return;
    e.preventDefault();
    const modifiers = (e.altKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.metaKey ? 4 : 0) | (e.shiftKey ? 8 : 0);
    const vk = KEY_CODE_MAP[e.key] || (e.key.length === 1 ? e.key.toUpperCase().charCodeAt(0) : 0);
    const text = e.key === 'Enter' ? '\r' : e.key.length === 1 && !e.ctrlKey && !e.metaKey ? e.key : '';
    sendWs({ type: 'key', eventType: 'keyDown', key: e.key, code: e.code, text, windowsVirtualKeyCode: vk, modifiers });
    sendWs({ type: 'key', eventType: 'keyUp', key: e.key, code: e.code, windowsVirtualKeyCode: vk, modifiers });
  };

  const handleSendQuickText = (e) => {
    e.preventDefault();
    if (!quickText) return;
    sendWs({ type: 'insert_text', text: quickText });
    setQuickText('');
  };

  const normalizeComparableUrl = (raw) => {
    const u = String(raw || '').trim();
    if (!u || u === 'about:blank') return '';
    const withProto = u.includes('://')
      ? u
      : u.startsWith('localhost') || u.startsWith('127.0.0.1')
        ? `http://${u}`
        : `https://${u}`;
    return withProto.replace(/\/+$/, '').toLowerCase();
  };

  const activeTabObj = tabs.find((t) => t.id === activeTargetId) || null;
  const candidateUrl = (addressInput || activeTabObj?.url || '').trim();
  const normCandidate = normalizeComparableUrl(candidateUrl);
  const matchedFavorite = normCandidate
    ? favorites.find((f) => normalizeComparableUrl(f.url) === normCandidate) || null
    : null;

  const handleToggleFavorite = async () => {
    if (!normCandidate) return;
    try {
      if (matchedFavorite) {
        const res = await fetch(`/api/browser/favorites/${encodeURIComponent(matchedFavorite.id)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          const data = await res.json();
          setFavorites(data.favorites || []);
        }
      } else {
        const res = await fetch('/api/browser/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: candidateUrl,
            title: activeTabObj?.title || '',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setFavorites(data.favorites || []);
        }
      }
    } catch {}
  };

  const handleDeleteFavoriteChip = async (e, favId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/browser/favorites/${encodeURIComponent(favId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
      }
    } catch {}
  };

  const handleOpenFavorite = async (fav, openInNewTab = false) => {
    if (!fav?.url) return;
    setAddressInput(fav.url);
    if (!daemonRunning) {
      setStartingDaemon(true);
      try {
        const res = await fetch('/api/browser/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'auto', url: fav.url }),
        });
        const data = await res.json();
        if (res.ok) {
          setDaemonRunning(true);
          setTabs(data.tabs || []);
          const tid = data.tabs?.[0]?.id || '';
          setActiveTargetId(tid);
          connectScreencast(tid);
        }
      } finally {
        setStartingDaemon(false);
      }
      return;
    }

    if (openInNewTab) {
      try {
        const res = await fetch('/api/browser/tabs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: fav.url }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.tabs) setTabs(data.tabs.filter((t) => !closingIdsRef.current.has(t.id)));
          if (data.tab?.id) handleSelectTab({ id: data.tab.id, url: fav.url });
        }
      } catch {}
      return;
    }

    sendWs({ type: 'navigate', url: fav.url });
  };

  const fetchDownloads = useCallback(async () => {
    try {
      const res = await fetch('/api/browser/downloads');
      if (res.ok) {
        const data = await res.json();
        setDownloads(data.downloads || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isOpen || !showDownloadsPopover) return undefined;
    fetchDownloads();
    const timer = setInterval(fetchDownloads, 3000);
    return () => clearInterval(timer);
  }, [isOpen, showDownloadsPopover, fetchDownloads]);

  const handleOpenExternalBrowser = () => {
    const targetUrl = candidateUrl && candidateUrl !== 'about:blank' ? candidateUrl : 'https://example.com';
    const full = targetUrl.includes('://') ? targetUrl : `https://${targetUrl}`;
    window.open(full, '_blank', 'noopener,noreferrer');
    setExtFlash(true);
    setTimeout(() => setExtFlash(false), 1400);
  };

  const handleScreenshotToChat = async () => {
    try {
      const res = await fetch('/api/browser/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_id: activeTargetId || '',
          session: activeSession || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(data.detail || 'Screenshot capture failed');
        return;
      }
      onAttachToComposer?.({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        filename: data.filename,
        path: data.path,
        dims: data.dims,
        url: data.url,
      });
      setShotFlash(true);
      setTimeout(() => setShotFlash(false), 1500);
    } catch (err) {
      setStatusMsg(`Screenshot failed: ${err.message}`);
    }
  };

  const visibleDownloads = downloads.filter((d) => !dismissedDownloadIds.includes(d.id));
  const hasStreamingDl = visibleDownloads.some((d) => d.status === 'streaming');

  if (!isOpen) return null;

  const hudVisibleOnCurrentTab =
    hudOverlay &&
    (!hudOverlay.targetId || !activeTargetId || hudOverlay.targetId === activeTargetId);
  const hudLeftPct =
    hudVisibleOnCurrentTab && typeof hudOverlay.x === 'number'
      ? Math.min(96, Math.max(4, (hudOverlay.x / (viewportMetaRef.current.deviceWidth || 1280)) * 100))
      : null;
  const hudTopPct =
    hudVisibleOnCurrentTab && typeof hudOverlay.y === 'number'
      ? Math.min(96, Math.max(4, (hudOverlay.y / (viewportMetaRef.current.deviceHeight || 800)) * 100))
      : null;
  const activeAgentInfo = resolveTabAgentInfo(activeTabObj, hudOverlay, fleet);
  const hudColor = hudOverlay
    ? getAgentColor(hudOverlay.session || hudOverlay.actor || hudOverlay.lease)
    : null;

  const activeFleetEntry = activeSession
    ? fleet.find((f) => f && f.session_name === activeSession)
    : null;
  const sessionLacksLease = Boolean(activeSession && activeFleetEntry && !activeFleetEntry.has_browser_lease);

  return (
    <div
      className={`file-explorer-pane browser-copilot-pane ${splitMode ? 'split-mode' : 'full-mode'}`}
      style={{ position: 'relative' }}
    >
      <div className="copilot-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          <span
            className="pulse-led"
            style={!daemonRunning ? { background: '#6b7280', boxShadow: 'none' } : undefined}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em' }}>
            CO-PILOT // :9222
          </span>
          {!daemonRunning ? (
            <button
              type="button"
              className="subbar-util-btn active"
              disabled={startingDaemon}
              onClick={handleStartBrowser}
            >
              <span>{startingDaemon ? 'STARTING...' : 'LAUNCH BROWSER'}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                className={`fav-chip ${controlMode ? 'active' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', ...(controlMode ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}) }}
                onClick={() => setControlMode((prev) => !prev)}
                title="Toggle Watch-Only vs Interactive Pointer/Keyboard Takeover (aim-login-hold)"
              >
                <Icon name={controlMode ? 'gamepad' : 'eye'} size={12} />
                <span>{controlMode ? 'CONTROL ON' : 'WATCH ONLY'}</span>
              </button>
              <button
                type="button"
                className={`fav-chip ${showTextBar ? 'active' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setShowTextBar((prev) => !prev)}
                title="Type or paste 2FA / password text directly into the focused browser input"
              >
                <Icon name="key" size={12} />
                <span>TYPE / 2FA</span>
              </button>
            </>
          )}
        </div>

        <div className="cp-topright-actions">
          <button
            type="button"
            className={`cp-action-icon-btn ${extFlash ? 'flash-ok' : ''}`}
            onClick={handleOpenExternalBrowser}
            title={`Open in External Browser (${candidateUrl || 'about:blank'})`}
            aria-label="Open in External Browser"
          >
            <Icon name={extFlash ? 'check' : 'externalLink'} size={13} />
          </button>

          <button
            type="button"
            className={`cp-action-icon-btn ${shotFlash ? 'flash-ok' : ''}`}
            disabled={!daemonRunning}
            onClick={handleScreenshotToChat}
            title={`Add Screenshot to Conversation (${activeSession || 'active node'})`}
            aria-label="Add Screenshot to Conversation"
          >
            <Icon name={shotFlash ? 'check' : 'cameraPlus'} size={13} />
          </button>

          <button
            type="button"
            className={`cp-action-icon-btn ${showDownloadsPopover ? 'active' : ''}`}
            onClick={() => {
              const next = !showDownloadsPopover;
              setShowDownloadsPopover(next);
              if (next) fetchDownloads();
            }}
            title={`Browser Downloads (${visibleDownloads.length})`}
            aria-label="Browser Downloads"
          >
            <Icon name="downloadSm" size={13} />
            {visibleDownloads.length > 0 && (
              <span className={`cp-dl-badge ${hasStreamingDl ? 'is-live' : ''}`}>
                {visibleDownloads.length}
              </span>
            )}
          </button>

          <span style={{ opacity: 0.22, margin: '0 1px' }}>|</span>

          <button
            type="button"
            className={`pane-full-upgrade-btn desktop-only ${!splitMode ? 'is-full' : ''}`}
            onClick={onToggleSplitMode}
            title={splitMode ? 'Upgrade Browser to Full View' : 'Return Browser to Split Screen'}
          >
            <Icon name={splitMode ? 'maximize' : 'split'} size={12} />
            <span>{splitMode ? 'FULL VIEW' : 'SPLIT VIEW'}</span>
          </button>
          <button
            type="button"
            className="ghost-btn"
            style={{ height: '26px', padding: '0 6px' }}
            onClick={onClose}
            title="Close Live Browser Viewport"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      </div>

      {showDownloadsPopover && (
        <div className="browser-dl-popover" onClick={(e) => e.stopPropagation()}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '6px',
              borderBottom: '1px solid var(--border-hairline)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--accent)',
              }}
            >
              BROWSER DOWNLOADS // CDP ({visibleDownloads.length})
            </span>
            {visibleDownloads.some((d) => d.status === 'done') && (
              <button
                type="button"
                className="fav-chip"
                onClick={() =>
                  setDismissedDownloadIds((prev) => [
                    ...prev,
                    ...visibleDownloads.filter((d) => d.status === 'done').map((d) => d.id),
                  ])
                }
              >
                CLEAR DONE
              </button>
            )}
          </div>

          {visibleDownloads.length === 0 ? (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', padding: '8px 2px' }}>
              No recent downloads in ~/Downloads/aim-browser.
            </div>
          ) : (
            visibleDownloads.map((d) => (
              <div key={d.id} className="dl-item-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {d.name}
                  </span>
                  <span className="mono-kbd" style={{ fontSize: '9px' }}>
                    {d.status === 'streaming' ? 'STREAMING' : d.size}
                  </span>
                </div>
                {d.status === 'streaming' ? (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#93c5fd' }}>
                    {d.size} received · Streaming via CDP...
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>Completed {d.when}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        className="fav-chip"
                        onClick={() => {
                          onAttachToComposer?.({
                            id: d.id,
                            filename: d.name,
                            path: d.path,
                            dims: d.size,
                            url: 'cdp-download',
                          });
                          setShowDownloadsPopover(false);
                        }}
                        title="Attach file path into active agent composer"
                      >
                        + CHAT
                      </button>
                      <button
                        type="button"
                        className="fav-chip"
                        onClick={async () => {
                          try {
                            const tok = apiToken || localStorage.getItem('aim-token') || '';
                            const r = await fetch(`/api/browser/downloads/${encodeURIComponent(d.raw_name)}`, {
                              headers: tok ? { 'x-api-token': tok } : {},
                            });
                            if (!r.ok) return;
                            const blob = await r.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = d.name;
                            a.click();
                            URL.revokeObjectURL(url);
                          } catch {}
                        }}
                        title="Save downloaded file"
                      >
                        SAVE
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: 'var(--text-muted)', paddingTop: '2px' }}>
            DIR: ~/Downloads/aim-browser (--headless=new CDP)
          </div>
        </div>
      )}

      {sessionLacksLease && (
        <div
          style={{
            padding: '5px 12px',
            background: 'rgba(245, 158, 11, 0.1)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.35)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: '#fbbf24',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{activeSession.toUpperCase()} HAS NO OPEN BROWSER LEASE · Showing shared fleet tabs</span>
          <button type="button" className="fav-chip" onClick={onClose}>
            TERMINAL ONLY
          </button>
        </div>
      )}

      {/* Multi-Tab Co-Pilot Strip (Emerald Matrix Lucide Chrome — #260) */}
      <div className="copilot-tabs-row">
        {tabs.map((t) => {
          const isSelected = t.id === activeTargetId;
          const tabAgent = resolveTabAgentInfo(t, hudOverlay, fleet);
          const chipStyle = tabAgent
            ? { '--agent-color': tabAgent.color.hex, '--agent-rgb': tabAgent.color.rgb }
            : undefined;
          const tabLabel = tabAgent
            ? `${tabAgent.agentKey}${tabAgent.sublabel ? ` // ${tabAgent.sublabel}` : ''}`
            : (t.title || 'Operator Tab').slice(0, 24);

          return (
            <div
              key={t.id}
              className={`cp-tab ${isSelected ? 'active' : ''} ${tabAgent ? 'agent-tab' : ''}`}
              style={chipStyle}
              onClick={() => handleSelectTab(t)}
              title={`${t.title || ''}\n${t.url || ''}${
                tabAgent
                  ? `\nAgent: ${tabAgent.agentKey} (${tabAgent.color.name})${
                      tabAgent.sublabel ? ` · Lease: ${tabAgent.sublabel}` : ''
                    }${tabAgent.isWorking ? ' — ACTIVE' : ''}`
                  : ''
              }`}
            >
              {tabAgent ? (
                <span
                  className="project-pill-dot"
                  style={{
                    background: tabAgent.color.hex,
                    boxShadow: `0 0 8px ${tabAgent.color.hex}`,
                  }}
                />
              ) : (
                <Icon name="globe" size={12} />
              )}
              <span>{tabLabel}</span>
              {tabs.length > 1 && (
                <span
                  style={{ opacity: 0.65, paddingLeft: '3px' }}
                  onClick={(e) => handleCloseTab(e, t.id)}
                  title="Close browser tab"
                >
                  ×
                </span>
              )}
            </div>
          );
        })}
        <button
          type="button"
          className="fav-chip"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          onClick={handleNewTab}
          disabled={!daemonRunning}
          title="Open new isolated browser tab"
        >
          <Icon name="plus" size={11} />
          <span>TAB</span>
        </button>
      </div>

      {/* Address & Navigation Bar */}
      <form className="cp-url-bar" onSubmit={handleNavigateSubmit}>
        <button
          type="button"
          className="fav-chip"
          disabled={!daemonRunning}
          onClick={() => sendWs({ type: 'back' })}
          title="Back"
        >
          ←
        </button>
        <button
          type="button"
          className="fav-chip"
          disabled={!daemonRunning}
          onClick={() => sendWs({ type: 'forward' })}
          title="Forward"
        >
          →
        </button>
        <button
          type="button"
          className="fav-chip"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          disabled={!daemonRunning}
          onClick={() => sendWs({ type: 'reload' })}
          title="Reload page"
        >
          <Icon name="refresh" size={11} />
        </button>
        <input
          type="text"
          className="cp-url-input"
          placeholder="https://... or localhost:5173"
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
        />
        <button
          type="button"
          className="fav-chip"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...(matchedFavorite ? { color: '#eab308', borderColor: '#eab308' } : {}),
          }}
          disabled={!normCandidate}
          onClick={handleToggleFavorite}
          title={matchedFavorite ? 'Remove from Favorites' : 'Save URL to Favorites'}
        >
          <Icon name="star" size={12} />
        </button>
        <button type="submit" className="subbar-util-btn active">
          GO
        </button>
      </form>

      {/* Compact Persistent Favorites Bar (#250) */}
      <div className="cp-fav-bar">
        <span style={{ color: '#eab308', display: 'inline-flex' }}>
          <Icon name="star" size={12} />
        </span>
        {favorites.length === 0 ? (
          <button
            type="button"
            className="fav-chip"
            disabled={!normCandidate}
            onClick={handleToggleFavorite}
            title="Bookmark the current URL for 1-click access on desktop & mobile"
          >
            + PIN CURRENT URL
          </button>
        ) : (
          favorites.map((fav) => (
            <span
              key={fav.id}
              className={`fav-chip ${
                normCandidate && normalizeComparableUrl(fav.url) === normCandidate ? 'active' : ''
              }`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              onClick={(e) => handleOpenFavorite(fav, e.ctrlKey || e.metaKey)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  handleOpenFavorite(fav, true);
                }
              }}
              title={`${fav.title}\n${fav.url}\n(Click to open · Ctrl/Cmd/Middle-click for new tab)`}
            >
              <span>{fav.title}</span>
              <span
                style={{ opacity: 0.55 }}
                onClick={(e) => handleDeleteFavoriteChip(e, fav.id)}
                title="Remove favorite"
              >
                ×
              </span>
            </span>
          ))
        )}
      </div>

      {/* Direct Text / 2FA Injection Bar */}
      {showTextBar && daemonRunning && (
        <form
          onSubmit={handleSendQuickText}
          style={{
            display: 'flex',
            gap: '6px',
            padding: '6px 12px',
            borderBottom: '1px solid var(--border-hairline)',
            background: 'var(--bg-subtle)',
          }}
        >
          <input
            type="text"
            className="cp-url-input"
            placeholder="Type or paste 2FA code / password into focused browser input..."
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
          />
          <button type="submit" className="subbar-util-btn active">
            SEND TEXT
          </button>
          <button
            type="button"
            className="fav-chip"
            onClick={() =>
              sendWs({
                type: 'key',
                eventType: 'keyDown',
                key: 'Enter',
                code: 'Enter',
                text: '\r',
                windowsVirtualKeyCode: 13,
              })
            }
          >
            ENTER ⏎
          </button>
        </form>
      )}

      {/* Live CDP Screencast Viewport + Agent Lease Strip & Cursor HUD */}
      <div
        className={`cp-viewport-frame ${
          activeAgentInfo ? `has-agent ${activeAgentInfo.isWorking ? 'is-working' : ''}` : ''
        }`}
        style={
          activeAgentInfo
            ? {
                '--agent-color': activeAgentInfo.color.hex,
                '--agent-rgb': activeAgentInfo.color.rgb,
              }
            : undefined
        }
        ref={stageRef}
      >
        {activeAgentInfo && (
          <div className="agent-hud-corner">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="project-pill-dot" style={{ background: activeAgentInfo.color.hex }} />
              <span>LEASED TAB // {activeAgentInfo.agentKey.toUpperCase()}</span>
            </span>
            <span style={{ color: activeAgentInfo.color.hex }}>
              {activeAgentInfo.hudAction
                ? activeAgentInfo.hudAction.toUpperCase()
                : activeAgentInfo.isWorking
                  ? 'WORKING'
                  : 'IDLE · LEASE HELD'}
            </span>
          </div>
        )}

        {!daemonRunning ? (
          <div className="browser-offline-placeholder" style={{ margin: 'auto', textAlign: 'center', padding: '24px' }}>
            <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: '12.5px', fontFamily: 'var(--font-mono)' }}>
              {statusMsg || 'Headless CDP browser daemon is idle on :9222 (0% RAM/CPU).'}
            </p>
            <button
              type="button"
              className="neon-cta-btn"
              disabled={startingDaemon}
              onClick={handleStartBrowser}
            >
              <Icon name="globe" size={14} />
              <span>{startingDaemon ? 'LAUNCHING CHROMIUM...' : 'LAUNCH CO-PILOT BROWSER'}</span>
            </button>
          </div>
        ) : (
          <div className="browser-canvas-wrap" style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <canvas
              ref={canvasRef}
              tabIndex={0}
              className={`browser-screencast-canvas ${controlMode ? 'interactive' : ''}`}
              onContextMenu={(e) => controlMode && e.preventDefault()}
              onMouseDown={(e) => handlePointerMouse('mousePressed', e)}
              onMouseUp={(e) => handlePointerMouse('mouseReleased', e)}
              onMouseMove={(e) => handlePointerMouse('mouseMoved', e)}
              onWheel={handleCanvasWheel}
              onTouchStart={(e) => {
                if (controlMode && e.touches?.length === 1) {
                  touchLastYRef.current = e.touches[0].clientY;
                }
              }}
              onTouchMove={(e) => {
                if (!controlMode || !daemonRunning || e.touches?.length !== 1 || touchLastYRef.current === null) return;
                const curY = e.touches[0].clientY;
                const dy = touchLastYRef.current - curY;
                if (Math.abs(dy) >= 6) {
                  touchLastYRef.current = curY;
                  const { x, y } = mapCanvasCoords(e.touches[0].clientX, curY);
                  sendWs({ type: 'wheel', x, y, deltaX: 0, deltaY: Math.round(dy * 1.4) });
                }
              }}
              onTouchEnd={() => {
                touchLastYRef.current = null;
              }}
              onKeyDown={handleCanvasKeyDown}
            />

            {hudLeftPct !== null && hudTopPct !== null && (
              <div
                className="browser-agent-hud-cursor"
                style={{
                  left: `${hudLeftPct}%`,
                  top: `${hudTopPct}%`,
                  '--agent-color': hudColor?.hex || '#38bdf8',
                  '--agent-rgb': hudColor?.rgb || '56, 189, 248',
                }}
              >
                <span className="browser-agent-hud-dot" />
                <span className="browser-agent-hud-pill">
                  {(hudOverlay.session || hudOverlay.actor || 'agent').toUpperCase()} // {hudOverlay.action}
                  {hudOverlay.label ? ` "${hudOverlay.label}"` : ''}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
