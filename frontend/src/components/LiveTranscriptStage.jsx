import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icons';

export default function LiveTranscriptStage({
  activeSession = '',
  fleetItem = null,
  operatorStyle = 'cyan',
  operatorSide = 'right',
  termFontSize = 14,
  termTheme = 'match',
  optimisticMessages = [],
  onReconcileOptimistic,
  onSpeakText,
  onSendRawCommand,
  onSwitchToTerminal,
}) {
  const [turnsData, setTurnsData] = useState({
    vessel: 'AGY',
    source: '',
    turns: [],
    loadedFor: '',
  });
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const activeSessionRef = useRef(activeSession);
  const needsBottomAnchorRef = useRef(true);
  const lastTurnSigRef = useRef('');
  const prevTurnCountRef = useRef(0);

  activeSessionRef.current = activeSession;

  const fetchLiveTurns = useCallback(async (isInitial = false, targetSession = activeSession) => {
    if (!targetSession) return;
    if (isInitial) setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(targetSession)}/live-turns?limit=30`);
      if (res.ok && activeSessionRef.current === targetSession) {
        const data = await res.json();
        const nextTurns = Array.isArray(data.turns) ? data.turns : [];
        const rewound = !isInitial && nextTurns.length < prevTurnCountRef.current;
        prevTurnCountRef.current = nextTurns.length;
        setTurnsData({
          vessel: data.vessel || (fleetItem?.vessel || 'AGY').toUpperCase(),
          source: data.source || '',
          turns: nextTurns,
          loadedFor: targetSession,
        });
        onReconcileOptimistic?.(targetSession, nextTurns, { rewound });
      }
    } catch {
      // Keep last known turns on transient failure
    } finally {
      if (isInitial && activeSessionRef.current === targetSession) {
        setLoading(false);
      }
    }
  }, [activeSession, fleetItem?.vessel, onReconcileOptimistic]);

  useEffect(() => {
    needsBottomAnchorRef.current = true;
    lastTurnSigRef.current = '';
    prevTurnCountRef.current = 0;
    setTurnsData((prev) =>
      prev.loadedFor === activeSession
        ? prev
        : {
            vessel: (fleetItem?.vessel || 'AGY').toUpperCase(),
            source: '',
            turns: [],
            loadedFor: '',
          }
    );
    fetchLiveTurns(true, activeSession);
    const timer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchLiveTurns(false, activeSession);
      }
    }, 2800);
    return () => clearInterval(timer);
  }, [activeSession, fetchLiveTurns]);

  // Always anchor at the bottom when clicking a session or mounting Chat View;
  // on subsequent live polls, auto-scroll only if the Operator is already near the bottom (#261).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || turnsData.loadedFor !== activeSession) return;

    const lastTurn = turnsData.turns[turnsData.turns.length - 1];
    const sig = `${activeSession}:${turnsData.turns.length}:${lastTurn?.body?.length || 0}:${lastTurn?.spoken?.length || 0}:${optimisticMessages.length}`;

    if (needsBottomAnchorRef.current) {
      needsBottomAnchorRef.current = false;
      lastTurnSigRef.current = sig;
      el.scrollTop = el.scrollHeight;
      const raf = window.requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
      return () => window.cancelAnimationFrame(raf);
    }

    if (sig === lastTurnSigRef.current) return undefined;
    lastTurnSigRef.current = sig;

    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 180;
    if (nearBottom) {
      el.scrollTop = el.scrollHeight;
    }
    return undefined;
  }, [activeSession, turnsData.loadedFor, turnsData.turns, optimisticMessages.length]);

  const overrideStyle =
    termTheme === 'hacker'
      ? { background: '#010802', color: '#22c55e' }
      : termTheme === 'contrast' || termTheme === 'high-contrast'
        ? { background: '#000000', color: '#ffffff' }
        : undefined;

  const vesselLabel = (turnsData.vessel || fleetItem?.vessel || 'AGY').toUpperCase();
  const serverPrompts = new Set(
    turnsData.turns.map((t) => (t.user || '').trim()).filter(Boolean)
  );
  const pendingOptimistic = optimisticMessages.filter(
    (m) => m.text && !serverPrompts.has(m.text.trim())
  );

  return (
    <div className="live-transcript-stage" style={overrideStyle}>
      <div className="stream-scroll" ref={scrollRef}>
        {loading && turnsData.turns.length === 0 ? (
          <div className="fleet-empty-state">Loading live structured session turns...</div>
        ) : turnsData.turns.length === 0 && pendingOptimistic.length === 0 ? (
          <div className="fleet-empty-state">
            No structured turns recorded yet for {activeSession}. Send a directive below or switch to RAW TERM.
          </div>
        ) : (
          turnsData.turns.map((turn) => (
            <div key={`turn-${turn.idx}`} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className={`transmission-block op-style-${operatorStyle} op-side-${operatorSide}`}>
                <div className="transmission-header" style={{ color: 'var(--op-accent, var(--text-muted))' }}>
                  {operatorSide === 'right' ? (
                    <>
                      <div className="transmission-rule" />
                      <span>[OPERATOR // {turn.stamp || 'TURN'}]</span>
                      <span className="op-dot-ind" />
                    </>
                  ) : (
                    <>
                      <span className="op-dot-ind" />
                      <span>[OPERATOR // {turn.stamp || 'TURN'}]</span>
                      <div className="transmission-rule" />
                    </>
                  )}
                </div>
                <div
                  className="transmission-body-operator"
                  style={{ fontSize: `${termFontSize}px`, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                >
                  {turn.user}
                </div>
              </div>

              {(turn.tools?.length > 0 || turn.body || turn.spoken) && (
                <div className="transmission-block">
                  <div className="transmission-header" style={{ color: 'var(--accent)' }}>
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        boxShadow: '0 0 8px var(--accent)',
                      }}
                    />
                    <span>[J.O.S.H.U.A. // {vesselLabel} ENGINE]</span>
                    <div className="transmission-rule" />
                  </div>
                  <div className="transmission-body-agent">
                    {Array.isArray(turn.tools) && turn.tools.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {turn.tools.map((tStr, i) => (
                          <div
                            key={`${turn.idx}-t-${i}`}
                            className="tool-exec-pill"
                            style={{ fontSize: `${Math.max(11, termFontSize - 1)}px`, overflowWrap: 'anywhere' }}
                          >
                            <Icon name="terminal" size={12} />
                            <span>{tStr}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {turn.body && (
                      <div
                        style={{
                          fontSize: `${termFontSize}px`,
                          lineHeight: 1.65,
                          color: 'var(--text-primary)',
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {turn.body}
                      </div>
                    )}

                    {turn.spoken && (
                      <div className="spoken-brief-card" style={{ fontSize: `${termFontSize}px` }}>
                        <button
                          type="button"
                          className="ghost-btn"
                          style={{ height: '24px', padding: '0 5px', color: 'var(--accent-secondary)', flexShrink: 0 }}
                          onClick={() => onSpeakText?.(turn.spoken)}
                          title="Speak this summary aloud"
                        >
                          <Icon name="volume" size={14} />
                        </button>
                        <div style={{ overflowWrap: 'anywhere' }}>{turn.spoken}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {pendingOptimistic.map((msg) => (
          <div
            key={msg.id}
            className={`transmission-block op-style-${operatorStyle} op-side-${operatorSide}`}
          >
            <div className="transmission-header" style={{ color: 'var(--op-accent, var(--text-muted))' }}>
              {operatorSide === 'right' ? (
                <>
                  <div className="transmission-rule" />
                  <span>[OPERATOR // LIVE]</span>
                  <span className="op-dot-ind" />
                </>
              ) : (
                <>
                  <span className="op-dot-ind" />
                  <span>[OPERATOR // LIVE]</span>
                  <div className="transmission-rule" />
                </>
              )}
            </div>
            <div
              className="transmission-body-operator"
              style={{ fontSize: `${termFontSize}px`, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
            >
              {msg.text && <div>{msg.text}</div>}
              {Array.isArray(msg.attachments) &&
                msg.attachments.map((att) => (
                  <div key={att.id} className="chat-shot-attachment-card">
                    <Icon name="camera" size={12} />
                    <span>
                      {att.filename}
                      {att.dims ? ` · ${att.dims}` : ''}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}

        {fleetItem?.status === 'THINKING' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-secondary)' }}>
            <span className="state-indicator thinking" />
            <span>{activeSession} is executing tools / reasoning...</span>
          </div>
        )}
      </div>

      {fleetItem?.status === 'WAITING' && (
        <div className="chat-gate-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="alert" size={14} />
            <span>APPROVAL GATE ACTIVE IN TERMINAL ([y/n] OR INTERACTIVE PROMPT)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="neon-cta-btn"
              style={{ height: '26px', padding: '0 10px', fontSize: '10.5px' }}
              onClick={() => onSendRawCommand?.('y\r')}
            >
              APPROVE (y)
            </button>
            <button
              type="button"
              className="subbar-util-btn"
              onClick={() => onSendRawCommand?.('n\r')}
            >
              DECLINE (n)
            </button>
            <button
              type="button"
              className="subbar-util-btn active"
              onClick={onSwitchToTerminal}
            >
              OPEN RAW TERM
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
