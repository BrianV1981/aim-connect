import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icons';

export default function TmuxServerStage({
  activeSession = '',
  termFontSize = 14,
  onSwitchToInteractiveTerm,
}) {
  const [serverData, setServerData] = useState({ uptime: 'ONLINE', windows: [], loadedFor: '' });
  const [activeIdx, setActiveIdx] = useState(0);
  const [gridMode, setGridMode] = useState(true);
  const [shellInput, setShellInput] = useState('');
  const [execBadge, setExecBadge] = useState('');
  const paneGridRef = useRef(null);
  const needsInitialPaneScrollRef = useRef(true);

  const fetchWindows = useCallback(async (targetSession = activeSession) => {
    if (!targetSession) return;
    try {
      const res = await fetch(`/api/tmux/${encodeURIComponent(targetSession)}/windows`);
      if (res.ok) {
        const data = await res.json();
        const wins = Array.isArray(data.windows) ? data.windows : [];
        setServerData({
          uptime: data.uptime || 'ONLINE',
          windows: wins,
          loadedFor: targetSession,
        });
      }
    } catch {
      // Keep previous snapshot on transient failure
    }
  }, [activeSession]);

  useEffect(() => {
    needsInitialPaneScrollRef.current = true;
    setActiveIdx(0);
    setGridMode(true);
    fetchWindows(activeSession);
    const timer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchWindows(activeSession);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [activeSession, fetchWindows]);

  const wins = serverData.windows;
  const clampedIdx = wins.length > 0 ? Math.min(wins.length - 1, Math.max(0, activeIdx)) : 0;

  // Start tmux pane logs scrolled to the bottom on session selection (#261)
  useLayoutEffect(() => {
    const gridEl = paneGridRef.current;
    if (!gridEl || serverData.loadedFor !== activeSession || wins.length === 0) return;
    const preNodes = gridEl.querySelectorAll('.tmux-pane-log');
    preNodes.forEach((pre) => {
      const nearBottom = pre.scrollHeight - pre.scrollTop - pre.clientHeight < 100;
      if (needsInitialPaneScrollRef.current || nearBottom) {
        pre.scrollTop = pre.scrollHeight;
      }
    });
    needsInitialPaneScrollRef.current = false;
  }, [activeSession, serverData.loadedFor, wins, gridMode, clampedIdx]);
  const activeWin = wins[clampedIdx] || null;
  const gridClass =
    !gridMode || wins.length <= 1 ? 'grid-1' : wins.length === 2 ? 'grid-2' : 'grid-4';
  const visibleWins = gridMode ? wins : activeWin ? [activeWin] : [];

  const handleSelectWindow = async (idx, openInteractive = false) => {
    setActiveIdx(idx);
    const targetWin = wins[idx];
    if (targetWin) {
      try {
        await fetch(`/api/tmux/${encodeURIComponent(activeSession)}/exec`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: targetWin.target, select_only: true }),
        });
      } catch {}
    }
    if (openInteractive) {
      onSwitchToInteractiveTerm?.();
    }
  };

  const handleShellSubmit = async (e) => {
    e.preventDefault();
    const cmd = shellInput.trim();
    if (!cmd || !activeSession) return;
    const target = activeWin?.target || '0.0';
    setExecBadge('SENT ✓');
    try {
      const res = await fetch(`/api/tmux/${encodeURIComponent(activeSession)}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, command: cmd }),
      });
      if (res.ok) {
        setShellInput('');
        setTimeout(() => fetchWindows(), 250);
      } else {
        setExecBadge('ERR');
      }
    } catch {
      setExecBadge('ERR');
    }
    setTimeout(() => setExecBadge(''), 1400);
  };

  const shortCwd = activeWin?.cwd
    ? activeWin.cwd.replace(/^\/home\/[^/]+/, '~')
    : '~';

  return (
    <div className="tmux-server-stage">
      <div className="tmux-status-strip">
        <div className="tmux-win-pills">
          <span style={{ color: '#10b981', fontWeight: 800 }}>
            [tmux: {activeSession}]
          </span>
          {wins.map((w, idx) => (
            <button
              key={w.target || idx}
              type="button"
              className={`tmux-win-btn ${clampedIdx === idx ? 'active' : ''}`}
              onClick={() => handleSelectWindow(idx, false)}
              onDoubleClick={() => handleSelectWindow(idx, true)}
              title={`Focus window ${w.title} (Double-click for interactive xterm)`}
            >
              {w.id}
              {clampedIdx === idx ? '*' : ''}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span style={{ color: '#94a3b8', fontSize: '10px' }}>
            {serverData.uptime} · DAEMON WORKSPACE
          </span>
          {wins.length > 1 && (
            <button
              type="button"
              className={`tmux-win-btn ${gridMode ? 'active' : ''}`}
              onClick={() => setGridMode((prev) => !prev)}
            >
              {gridMode ? `⊞ SPLIT (${wins.length} PANES)` : '▢ 1-WINDOW VIEW'}
            </button>
          )}
          <button
            type="button"
            className="tmux-win-btn"
            onClick={() => handleSelectWindow(clampedIdx, true)}
            title="Attach interactive xterm.js to the selected tmux window"
          >
            ▣ INTERACTIVE TERM
          </button>
        </div>
      </div>

      <div className={`tmux-pane-grid ${gridClass}`} ref={paneGridRef}>
        {visibleWins.length === 0 ? (
          <div className="fleet-empty-state">Inspecting tmux server panes...</div>
        ) : (
          visibleWins.map((w) => {
            const realIdx = wins.indexOf(w);
            const isFocused = realIdx === clampedIdx;
            return (
              <div
                key={w.target || realIdx}
                className={`tmux-raw-pane ${isFocused ? 'focused-pane' : ''}`}
                onClick={() => {
                  if (!isFocused) handleSelectWindow(realIdx, false);
                }}
                onDoubleClick={() => handleSelectWindow(realIdx, true)}
              >
                <div className="tmux-pane-hdr">
                  <span
                    style={{
                      color: isFocused ? '#00ffa3' : '#94a3b8',
                      fontWeight: 700,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isFocused ? '● ' : ''}
                    {w.title}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.pid ? `PID ${w.pid} · ` : ''}
                    {w.cwd ? w.cwd.replace(/^\/home\/[^/]+/, '~') : ''}
                  </span>
                </div>
                <pre
                  className="tmux-pane-log"
                  style={{ fontSize: `${Math.max(11, termFontSize - 1)}px` }}
                >
                  <span style={{ color: '#6ee7b7' }}>$ {w.cmd}</span>
                  {'\n'}
                  {(w.lines || []).join('\n')}
                </pre>
              </div>
            );
          })
        )}
      </div>

      <form className="tmux-shell-bar" onSubmit={handleShellSubmit}>
        <span style={{ color: '#10b981', fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <Icon name="terminal" size={12} />
          <span>{shortCwd}$</span>
        </span>
        <input
          type="text"
          className="tmux-shell-inp"
          placeholder={`Send raw bash command to pane ${activeWin?.id || '0'} (e.g. ./startup.sh, lsof -i :8000, git status)...`}
          value={shellInput}
          onChange={(e) => setShellInput(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className="subbar-util-btn active">
          {execBadge || 'EXEC ⏎'}
        </button>
      </form>
    </div>
  );
}
