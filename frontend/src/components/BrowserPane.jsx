import { useCallback, useEffect, useRef, useState } from 'react';

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
  onToggleSplitMode,
  onClose,
}) {
  const [daemonRunning, setDaemonRunning] = useState(false);
  const [startingDaemon, setStartingDaemon] = useState(false);
  const [tabs, setTabs] = useState([]);
  const [activeTargetId, setActiveTargetId] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [controlMode, setControlMode] = useState(false); // false = Watch, true = Interactive Control
  const [showTextBar, setShowTextBar] = useState(false);
  const [quickText, setQuickText] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [hudOverlay, setHudOverlay] = useState(null);

  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const stageSizeRef = useRef({ width: 1280, height: 900 });
  const viewportMetaRef = useRef({ deviceWidth: 1280, deviceHeight: 900 });
  const wsRef = useRef(null);
  const activeTargetRef = useRef('');
  const closingIdsRef = useRef(new Set());
  const hudTimerRef = useRef(null);
  const lastMoveSentRef = useRef(0);
  const touchLastYRef = useRef(null);

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
    if (!hud) return;
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
      const token = apiToken || localStorage.getItem('aim-api-token') || '';
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
            if (msg.target_id) setActiveTargetId(msg.target_id);
            if (msg.url) setAddressInput(msg.url);
            refreshStatus();
          } else if (msg.type === 'daemon_offline') {
            setDaemonRunning(false);
            setStatusMsg('Browser daemon stopped — tap Launch Browser to start.');
          } else if (msg.type === 'navigated') {
            if (msg.url) setAddressInput(msg.url);
            refreshStatus();
          } else if (msg.type === 'hud' && msg.hud) {
            showHud(msg.hud);
          } else if (msg.type === 'error') {
            setStatusMsg(msg.message || 'Browser error');
          } else if (msg.type === 'frame' && msg.data) {
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
    [apiToken, refreshStatus, showHud]
  );

  // Zero CPU / bandwidth when pane is closed; attach on open
  useEffect(() => {
    if (!isOpen) {
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
        const firstId = st.tabs?.[0]?.id || '';
        connectScreencast(activeTargetRef.current || firstId);
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
  }, [isOpen, connectScreencast, refreshStatus]);

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

  const sendWs = (payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  const handleStartBrowser = async () => {
    setStartingDaemon(true);
    setStatusMsg('Starting loopback Chromium CDP...');
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

  const handleSelectTab = (tab) => {
    setActiveTargetId(tab.id);
    activeTargetRef.current = tab.id;
    setAddressInput(tab.url || '');
    const dims = measureStageSize();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendWs({ type: 'switch_target', target_id: tab.id, width: dims.width, height: dims.height });
    } else {
      connectScreencast(tab.id);
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

    // Switch off the closing tab immediately BEFORE DELETE so DevTools detaches cleanly (#249)
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

  return (
    <div className={`file-explorer-pane browser-copilot-pane ${splitMode ? 'split-mode' : 'full-mode'}`}>
      <div className="brain-quick-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
          <span className="brain-bar-label">
            🌐 CO-PILOT {daemonRunning ? '🟢' : '⚪'}
          </span>
          {!daemonRunning ? (
            <button
              type="button"
              className="macro-btn action"
              style={{ padding: '3px 10px', fontSize: '11px' }}
              disabled={startingDaemon}
              onClick={handleStartBrowser}
            >
              {startingDaemon ? '⏳ Starting...' : '🚀 Launch Browser'}
            </button>
          ) : (
            <>
              <button
                type="button"
                className={`brain-quick-pill ${controlMode ? 'active browser-control-active' : ''}`}
                onClick={() => setControlMode((prev) => !prev)}
                title="Toggle Watch-Only vs Interactive Pointer/Keyboard Takeover (aim-login-hold)"
              >
                {controlMode ? '🎮 Control ON' : '👁️ Watch Only'}
              </button>
              <button
                type="button"
                className={`brain-quick-pill ${showTextBar ? 'active' : ''}`}
                onClick={() => setShowTextBar((prev) => !prev)}
                title="Type or paste 2FA / password text directly into the focused browser input (mobile friendly)"
              >
                🔑 Type / 2FA
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            className={`macro-btn ${splitMode ? 'action' : ''}`}
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={onToggleSplitMode}
            title="Toggle side-by-side Split Pane vs Full Viewport"
          >
            {splitMode ? '◫ Split' : '⬜ Full'}
          </button>
          <button
            type="button"
            className="macro-btn"
            style={{ padding: '3px 8px', fontSize: '11px', color: '#f87171' }}
            onClick={onClose}
            title="Close Live Browser Viewport"
          >
            ✖
          </button>
        </div>
      </div>

      {/* Multi-Tab Co-Pilot Strip (Operator + Subagent targetId Leases) */}
      <div className="workspace-tabs-bar">
        {tabs.map((t) => {
          const isSelected = t.id === activeTargetId;
          const badge = t.lease
            ? t.lease === 'operator'
              ? '👤 you'
              : `🤖 ${t.lease}`
            : `Tab ${t.index + 1}`;
          return (
            <div
              key={t.id}
              className={`workspace-tab-chip ${isSelected ? 'active' : ''}`}
              onClick={() => handleSelectTab(t)}
              title={`${t.title}\n${t.url}${t.lease ? `\nLease: ${t.lease}` : ''}`}
            >
              <span className="browser-tab-lease-badge">{badge}</span>
              <span style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.title || '(untitled)'}
              </span>
              {tabs.length > 1 && (
                <span
                  className="workspace-tab-close"
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
          className="workspace-tab-chip"
          onClick={handleNewTab}
          disabled={!daemonRunning}
          title="Open new isolated browser tab"
        >
          ➕ Tab
        </button>
      </div>

      {/* Address & Navigation Bar */}
      <form className="file-toolbar" onSubmit={handleNavigateSubmit} style={{ gap: '4px' }}>
        <button
          type="button"
          className="macro-btn"
          style={{ padding: '4px 7px', fontSize: '11px' }}
          disabled={!daemonRunning}
          onClick={() => sendWs({ type: 'back' })}
          title="Back"
        >
          ←
        </button>
        <button
          type="button"
          className="macro-btn"
          style={{ padding: '4px 7px', fontSize: '11px' }}
          disabled={!daemonRunning}
          onClick={() => sendWs({ type: 'forward' })}
          title="Forward"
        >
          →
        </button>
        <button
          type="button"
          className="macro-btn"
          style={{ padding: '4px 7px', fontSize: '11px' }}
          disabled={!daemonRunning}
          onClick={() => sendWs({ type: 'reload' })}
          title="Reload page"
        >
          🔄
        </button>
        <input
          type="text"
          className="browser-url-input"
          placeholder="https://... or localhost:5173"
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
        />
        <button type="submit" className="macro-btn action" style={{ padding: '4px 10px', fontSize: '11px' }}>
          Go
        </button>
      </form>

      {/* Mobile-Friendly Direct Text / 2FA Injection Bar */}
      {showTextBar && daemonRunning && (
        <form className="file-toolbar" onSubmit={handleSendQuickText} style={{ gap: '6px', background: 'rgba(15, 23, 42, 0.95)' }}>
          <input
            type="text"
            className="browser-url-input"
            placeholder="Type or paste text / 2FA code into focused browser field..."
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
          />
          <button type="submit" className="macro-btn action" style={{ padding: '4px 10px', fontSize: '11px' }}>
            Send Text
          </button>
          <button
            type="button"
            className="macro-btn"
            style={{ padding: '4px 8px', fontSize: '11px' }}
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
            ⏎ Enter
          </button>
        </form>
      )}

      {/* Live CDP Screencast Viewport + Agent Cursor HUD */}
      <div className="browser-viewport-stage" ref={stageRef}>
        {!daemonRunning ? (
          <div className="browser-offline-placeholder">
            <p style={{ margin: '0 0 12px 0', color: '#cbd5e1', fontSize: '14px' }}>
              {statusMsg || 'Loopback CDP browser daemon is currently idle (0% RAM/CPU).'}
            </p>
            <button
              type="button"
              className="macro-btn action"
              disabled={startingDaemon}
              onClick={handleStartBrowser}
            >
              {startingDaemon ? '⏳ Launching Chromium...' : '🚀 Launch Shared Co-Pilot Browser'}
            </button>
          </div>
        ) : (
          <div className="browser-canvas-wrap">
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
                style={{ left: `${hudLeftPct}%`, top: `${hudTopPct}%` }}
              >
                <span className="browser-agent-hud-dot" />
                <span className="browser-agent-hud-pill">
                  🤖 {hudOverlay.actor || 'agent'} · {hudOverlay.action}
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
