import { useEffect, useState } from 'react';
import { registerWebAuthn } from '../webauthn';
import Icon from './Icons';

const TTS_VOICES = [
  { id: 'piper:en_GB-alan-medium', label: 'Offline Piper — Alan (UK J.O.S.H.U.A. / JARVIS)' },
  { id: 'piper:en_US-ryan-medium', label: 'Offline Piper — Ryan (US Male)' },
  { id: 'piper:en_US-lessac-medium', label: 'Offline Piper — Lessac (US Female)' },
  { id: 'edge:en-GB-RyanNeural', label: 'Edge Neural — Ryan (UK J.O.S.H.U.A. / JARVIS)' },
  { id: 'edge:en-US-BrianNeural', label: 'Edge Neural — Brian (US Male)' },
  { id: 'edge:en-US-AndrewNeural', label: 'Edge Neural — Andrew (US Warm Male)' },
  { id: 'edge:en-US-AvaNeural', label: 'Edge Neural — Ava (US Female)' },
  { id: 'browser:default', label: 'Browser Native Speech API' },
];

export default function SettingsModal({
  onClose,
  initialTab = 'appearance',
  activeSession = '',
  macroLibrary = [],
  onOpenVoiceMacros,
  deferredInstallPrompt = null,
  onTriggerInstallApp,
  onLogout,
  autoCaps,
  setAutoCaps,
  keyboardMode,
  setKeyboardMode,
  theme,
  setTheme,
  operatorStyle = 'cyan',
  setOperatorStyle,
  operatorSide = 'right',
  setOperatorSide,
  keyboardFeedback,
  setKeyboardFeedback,
  keyboardAutoHide = true,
  setKeyboardAutoHide,
  alertChime,
  setAlertChime,
  termFontSize,
  setTermFontSize,
  termTheme,
  setTermTheme,
  filesTreeSide = 'left',
  setFilesTreeSide,
  filesHideDotfiles = true,
  setFilesHideDotfiles,
  docsSingleTabMode = false,
  setDocsSingleTabMode,
  sessionAutoScroll = false,
  setSessionAutoScroll,
  sessionLayoutMode = 'per-session',
  setSessionLayoutMode,
  editorFontSize = 13,
  setEditorFontSize,
  editorWordWrap = true,
  setEditorWordWrap,
  agentStageMode = 'pty',
  setAgentStageMode,
  splitWidthPct = 48,
  onSetSplitPreset,
  voiceAutoRead,
  setVoiceAutoRead,
  ttsVoice,
  setTtsVoice,
  onPreviewVoice,
  voiceContinuous,
  setVoiceContinuous,
  voiceAutoEnter,
  setVoiceAutoEnter,
  voiceAutoSend,
  setVoiceAutoSend,
  voiceAutoExecute,
  setVoiceAutoExecute,
  voiceAutoCapitalize,
  setVoiceAutoCapitalize,
  voiceSlashes,
  setVoiceSlashes,
  apiToken,
  e2eeSecret,
  setE2eeSecret,
  tmuxSettings = null,
  onTmuxSettingsChange,
  onSaveWorkspaceState,
  onRestoreWorkspaceState,
  onRefreshApp,
  appUpdateAvailable = false,
  currentBuildId = '',
  latestBuildId = '',
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'appearance');
  const [registerStatus, setRegisterStatus] = useState('');
  const [showE2eeSecret, setShowE2eeSecret] = useState(false);
  const [localE2eeSecret, setLocalE2eeSecret] = useState(e2eeSecret || '');
  const [e2eeStatus, setE2eeStatus] = useState('');
  const [pwaHint, setPwaHint] = useState('');

  // Tmux & Boot Persistence settings (#300)
  const [localTmuxCfg, setLocalTmuxCfg] = useState(() => ({
    default_agent: tmuxSettings?.default_agent || 'agy',
    auto_resume_c: tmuxSettings?.auto_resume_c !== false,
    skip_permissions: Boolean(tmuxSettings?.skip_permissions),
    auto_restore_on_boot: tmuxSettings?.auto_restore_on_boot !== false,
    empty_save_guardrail: tmuxSettings?.empty_save_guardrail !== false,
    show_sidebar_resurrect_bar: tmuxSettings?.show_sidebar_resurrect_bar !== false,
    search_paths: Array.isArray(tmuxSettings?.search_paths) ? tmuxSettings.search_paths : [],
  }));
  const [searchPathsText, setSearchPathsText] = useState(() =>
    Array.isArray(tmuxSettings?.search_paths) ? tmuxSettings.search_paths.join('\n') : ''
  );
  const [resurrectMeta, setResurrectMeta] = useState(null);
  const [hostBootStatus, setHostBootStatus] = useState(null);
  const [tmuxCfgStatus, setTmuxCfgStatus] = useState('');
  const [hostActionBusy, setHostActionBusy] = useState(false);

  // Integrations Vault state (consolidating IntegrationsModal)
  const targetVaultSession = activeSession || 'aim-connect';
  const [vaultEmail, setVaultEmail] = useState('');
  const [vaultAppPass, setVaultAppPass] = useState('');
  const [hasVaultPassword, setHasVaultPassword] = useState(false);
  const [vaultStatus, setVaultStatus] = useState('');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (activeTab !== 'tmux') return;
    fetch('/api/tmux/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.settings) {
          setLocalTmuxCfg(data.settings);
          setSearchPathsText((data.settings.search_paths || []).join('\n'));
          onTmuxSettingsChange?.(data.settings);
        }
        if (data.resurrect) setResurrectMeta(data.resurrect);
        if (data.host_status) setHostBootStatus(data.host_status);
      })
      .catch(() => {});
  }, [activeTab, onTmuxSettingsChange]);

  const persistTmuxSettingsPatch = async (patch, syncTmuxConf = false, toastLabel = 'SAVED ✓') => {
    const optimistic = { ...localTmuxCfg, ...patch };
    setLocalTmuxCfg(optimistic);
    onTmuxSettingsChange?.(optimistic);
    try {
      const res = await fetch('/api/tmux/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patch, sync_tmux_conf: Boolean(syncTmuxConf) }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setLocalTmuxCfg(data.settings);
          onTmuxSettingsChange?.(data.settings);
        }
        if (data.resurrect) setResurrectMeta(data.resurrect);
        if (data.host_status) setHostBootStatus(data.host_status);
        setTmuxCfgStatus(toastLabel);
      } else {
        setTmuxCfgStatus('Save failed');
      }
    } catch {
      setTmuxCfgStatus('Network error');
    }
    setTimeout(() => setTmuxCfgStatus(''), 2600);
  };

  const handleSaveScanPaths = () => {
    const parsed = searchPathsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    persistTmuxSettingsPatch({ search_paths: parsed }, false, 'SCAN PATHS SYNCED ✓');
  };

  const handleHostControl = async (action) => {
    setHostActionBusy(true);
    try {
      const res = await fetch('/api/tmux/host-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.host_status) {
        setHostBootStatus(data.host_status);
        setTmuxCfgStatus('HOST UPDATED ✓');
      } else {
        setTmuxCfgStatus(data.detail || 'Host control failed');
      }
    } catch {
      setTmuxCfgStatus('Host control request failed');
    } finally {
      setHostActionBusy(false);
      setTimeout(() => setTmuxCfgStatus(''), 2600);
    }
  };

  useEffect(() => {
    if (activeTab !== 'integrations' || !targetVaultSession) return;
    fetch(`/api/integrations/${encodeURIComponent(targetVaultSession)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error) {
          setVaultEmail(data.gmail_address || '');
          setHasVaultPassword(Boolean(data.has_password));
          setVaultAppPass('');
        }
      })
      .catch(() => {});
  }, [activeTab, targetVaultSession]);

  const handleSaveVault = async () => {
    try {
      const res = await fetch(`/api/integrations/${encodeURIComponent(targetVaultSession)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gmail_address: vaultEmail,
          gmail_app_password: vaultAppPass,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          setVaultStatus('VAULTED ✓');
          if (vaultAppPass) setHasVaultPassword(true);
          setVaultAppPass('');
          setTimeout(() => setVaultStatus(''), 2500);
          return;
        }
      }
      setVaultStatus('Workspace vault unavailable');
      setTimeout(() => setVaultStatus(''), 2500);
    } catch {
      setVaultStatus('Network error');
      setTimeout(() => setVaultStatus(''), 2500);
    }
  };

  const handleApplyE2ee = async () => {
    setE2eeSecret?.(localE2eeSecret);
    try {
      setE2eeStatus('Updating backend...');
      const res = await fetch('/api/settings/e2ee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ secret: localE2eeSecret }),
      });
      if (res.ok) {
        setE2eeStatus('Synced ✓ Reloading...');
        setTimeout(() => window.location.reload(), 900);
      } else {
        setE2eeStatus('Saved locally (backend sync skipped)');
      }
    } catch {
      setE2eeStatus('Error updating backend');
    }
  };

  const handleRegisterPasskey = async () => {
    try {
      setRegisterStatus('Registering passkey...');
      const result = await registerWebAuthn(apiToken);
      if (result.success) {
        setRegisterStatus('Passkey Registered ✓ FaceID / TouchID / Windows Hello active.');
      } else {
        setRegisterStatus(`Registration failed: ${result.error}`);
      }
    } catch (e) {
      setRegisterStatus(`Error: ${e.message}`);
    }
  };

  const handleInstallClick = async () => {
    if (onTriggerInstallApp) {
      const triggered = await onTriggerInstallApp();
      if (triggered) {
        onClose?.();
        return;
      }
    }
    setPwaHint('Use your browser address-bar Install App icon (or Share -> Add to Home Screen on iOS/Android) to pop out a standalone window.');
  };

  const voiceMacros = (macroLibrary || []).filter((m) => m.voiceTrigger);

  const toggleBool = (setter, storageKey, nextVal) => {
    setter?.(nextVal);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(nextVal));
    }
  };

  return (
    <div className="modal-overlay modal-veil" onClick={onClose}>
      <div className="ld-modal-card wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-bar">
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--accent)', display: 'flex' }}>
                <Icon name="settings" />
              </span>
              <span>SYSTEM SETTINGS &amp; VAULT</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.14em', color: 'var(--accent)', marginTop: '3px' }}>
              100% PARITY: APPEARANCE · KEYBOARD · VOICE/TTS · INTEGRATIONS · 3FA/E2EE
            </div>
          </div>
          <button type="button" className="ghost-btn" style={{ padding: '0 6px' }} onClick={onClose} title="Close Settings">
            <Icon name="close" />
          </button>
        </div>

        <div className="modal-tabs-rail">
          {[
            ['appearance', 'APPEARANCE & APP'],
            ['tmux', 'TMUX & BOOT'],
            ['keyboard', 'KEYBOARD & ALERTS'],
            ['voice', 'VOICE & NEURAL TTS'],
            ['integrations', 'INTEGRATIONS VAULT'],
            ['security', 'SECURITY & 3FA'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`modal-tab-btn ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="modal-body-scroll">
          {activeTab === 'appearance' && (
            <>
              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'rgba(var(--accent-rgb), 0.06)',
                  border: '1px solid rgba(var(--accent-rgb), 0.32)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700 }}>
                    STANDALONE APP MODE (POP-OUT WINDOW)
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Pop A.I.M. Connect out of the browser into a chromeless desktop/mobile app window with pass-through network-only Service Worker.
                  </div>
                  {(currentBuildId || appUpdateAvailable) && (
                    <div
                      style={{
                        fontSize: '10.5px',
                        color: appUpdateAvailable ? '#fbbf24' : 'var(--text-muted)',
                        marginTop: '5px',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {appUpdateAvailable
                        ? `UPDATE READY: ${latestBuildId || 'newer build'} deployed (running ${currentBuildId || 'cached bundle'})`
                        : `Active Bundle: ${currentBuildId}`}
                    </div>
                  )}
                  {pwaHint && (
                    <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                      {pwaHint}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {onRefreshApp && (
                    <button
                      type="button"
                      className={appUpdateAvailable ? 'neon-cta-btn' : 'subbar-util-btn'}
                      style={{ height: '34px', padding: '0 13px', fontSize: '11px' }}
                      onClick={onRefreshApp}
                      title="Clear PWA caches and reload the latest server bundle (mobile equivalent to Ctrl+Shift+R)"
                    >
                      <Icon name="refresh" size={13} />
                      <span>{appUpdateAvailable ? 'UPDATE & REFRESH' : 'REFRESH APP'}</span>
                    </button>
                  )}
                  <button type="button" className="neon-cta-btn" style={{ height: '34px', padding: '0 14px' }} onClick={handleInstallClick}>
                    <Icon name="download" />
                    <span>{deferredInstallPrompt ? 'INSTALL APP NOW' : 'INSTALL APP'}</span>
                  </button>
                </div>
              </div>

              <div className="settings-group-card">
                <div className="settings-group-title">UI COLOR SCHEME (SYNCED ACROSS UI, TERMINAL &amp; MONACO)</div>
                <div className="theme-swatch-grid">
                  {[
                    ['emerald', 'Emerald Matrix', 'Obsidian #050505 + #00FFA3', '#050505', '#00FFA3'],
                    ['oled', 'Pure OLED Black', 'Zero-glow #000000 high contrast', '#000000', '#00FFA3'],
                    ['light', 'Daylight Crisp', 'Clean #FFFFFF light workspace', '#ffffff', '#047857'],
                    ['navy', 'Classic AIM Navy', 'Heritage #0B162C + #FF5722', '#0b162c', '#ff5722'],
                  ].map(([id, title, sub, bg, acc]) => (
                    <button
                      key={id}
                      type="button"
                      className={`theme-option-card ${theme === id ? 'selected' : ''}`}
                      onClick={() => setTheme?.(id)}
                    >
                      <span
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: bg,
                          border: `2px solid ${acc}`,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '12.5px' }}>{title}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-group-card">
                <div className="settings-group-title">OPERATOR REPLIES (COLOR HIGHLIGHT &amp; CHAT-BOX DOT SIDE)</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Make your prompts stand out in History &amp; Forensics transcripts and choose whether your status dot sits on the left or right like a chat box.
                </div>
                <div className="theme-swatch-grid">
                  {[
                    ['cyan', 'Cyber Cyan Highlight', 'Crisp #00B8FF chat tint + bright text', '#00b8ff'],
                    ['gold', 'Command Gold Highlight', 'Warm #F59E0B amber tint + bright text', '#f59e0b'],
                    ['emerald', 'Emerald Mint Highlight', 'Neon #00FFA3 tint + bright text', '#00ffa3'],
                    ['grey', 'Default Muted Grey', 'Classic subtle unhighlighted log style', '#6b7280'],
                  ].map(([id, title, sub, hex]) => (
                    <button
                      key={id}
                      type="button"
                      className={`theme-option-card ${operatorStyle === id ? 'selected' : ''}`}
                      style={{ padding: '9px 11px' }}
                      onClick={() => setOperatorStyle?.(id)}
                    >
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: hex,
                          boxShadow: `0 0 8px ${hex}`,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '12px' }}>{title}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--border-hairline)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    OPERATOR DOT &amp; BUBBLE ALIGNMENT
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className={`subbar-util-btn ${operatorSide === 'left' ? 'active' : ''}`}
                      onClick={() => setOperatorSide?.('left')}
                    >
                      ● LEFT (CLI STREAM)
                    </button>
                    <button
                      type="button"
                      className={`subbar-util-btn ${operatorSide === 'right' ? 'active' : ''}`}
                      onClick={() => setOperatorSide?.('right')}
                    >
                      RIGHT (CHAT BOX) ●
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-group-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="settings-group-title">TERMINAL FONT SIZE</span>
                  <span className="mono-kbd">{termFontSize}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="24"
                  step="1"
                  value={termFontSize}
                  className="ld-range"
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setTermFontSize?.(v);
                    localStorage.setItem('aim-term-fontsize', String(v));
                  }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>Terminal Palette Override</div>
                    <select
                      className="ld-select"
                      value={termTheme}
                      onChange={(e) => {
                        setTermTheme?.(e.target.value);
                        localStorage.setItem('aim-term-theme', e.target.value);
                      }}
                    >
                      <option value="match">Match Active UI Theme</option>
                      <option value="standard">Standard Navy / Slate</option>
                      <option value="hacker">Hacker Matrix Green</option>
                      <option value="high-contrast">High Contrast B&amp;W</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: `${termFontSize}px`,
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: 'var(--bg-term)',
                        border: '1px solid var(--border-hairline)',
                        width: '100%',
                      }}
                    >
                      $ joshua --status ✓
                    </div>
                  </div>
                </div>
              </div>

              <div className="settings-group-card">
                <div className="settings-group-title">WORKSPACE &amp; EDITOR (FILES TREE, STAGE VIEW &amp; SPLIT PRESETS)</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Keep Left for classic Windows Explorer muscle memory, or flip the File Tree to the Right outer edge so Chat View and Code sit directly side-by-side in Split Screen.
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--border-hairline)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    FILE EXPLORER TREE SIDE
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className={`subbar-util-btn ${filesTreeSide === 'left' ? 'active' : ''}`}
                      onClick={() => {
                        setFilesTreeSide?.('left');
                        localStorage.setItem('aim-files-tree-side', 'left');
                      }}
                    >
                      <Icon name="sidebar" size={12} />
                      <span>LEFT (WINDOWS DEFAULT)</span>
                    </button>
                    <button
                      type="button"
                      className={`subbar-util-btn ${filesTreeSide === 'right' ? 'active' : ''}`}
                      onClick={() => {
                        setFilesTreeSide?.('right');
                        localStorage.setItem('aim-files-tree-side', 'right');
                      }}
                    >
                      <Icon name="panelRight" size={12} />
                      <span>RIGHT (OUTER EDGE)</span>
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--border-hairline)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    DEFAULT AGENT SESSION STAGE
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className={`subbar-util-btn ${agentStageMode === 'chat' ? 'active' : ''}`}
                      onClick={() => setAgentStageMode?.('chat')}
                    >
                      <Icon name="message" size={12} />
                      <span>CHAT VIEW (MARKDOWN)</span>
                    </button>
                    <button
                      type="button"
                      className={`subbar-util-btn ${agentStageMode === 'pty' ? 'active' : ''}`}
                      onClick={() => setAgentStageMode?.('pty')}
                    >
                      <Icon name="terminal" size={12} />
                      <span>RAW TERMINAL (XTERM)</span>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '6px', borderTop: '1px solid var(--border-hairline)' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      <span>Editor &amp; Preview Font Size</span>
                      <span className="mono-kbd">{editorFontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="11"
                      max="20"
                      step="1"
                      value={editorFontSize}
                      className="ld-range"
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setEditorFontSize?.(v);
                        localStorage.setItem('aim-editor-fontsize', String(v));
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Split-Pane Width Preset ({Math.round(100 - splitWidthPct)}/{Math.round(splitWidthPct)})
                    </div>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {[
                        [48, '50 / 50'],
                        [38, '60 / 40 TERM'],
                        [58, '40 / 60 PANE'],
                      ].map(([pctVal, lbl]) => (
                        <button
                          key={pctVal}
                          type="button"
                          className={`subbar-util-btn ${Math.abs(splitWidthPct - pctVal) <= 3 ? 'active' : ''}`}
                          onClick={() => onSetSplitPreset?.(pctVal)}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '6px', borderTop: '1px solid var(--border-hairline)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                    <span>Hide Dotfiles &amp; Cache (`.git`, `.pytest_cache`)</span>
                    <input
                      type="checkbox"
                      checked={Boolean(filesHideDotfiles)}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setFilesHideDotfiles?.(next);
                        localStorage.setItem('aim-files-hide-dotfiles', JSON.stringify(next));
                      }}
                    />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                    <span>Monaco Editor Word Wrap</span>
                    <input
                      type="checkbox"
                      checked={Boolean(editorWordWrap)}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setEditorWordWrap?.(next);
                        localStorage.setItem('aim-editor-wordwrap', JSON.stringify(next));
                      }}
                    />
                  </label>
                </div>

                <div style={{ paddingTop: '6px', borderTop: '1px solid var(--border-hairline)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '12px', cursor: 'pointer' }}>
                    <div>
                      <div>Project Docs Single-Tab Website Reader (Optional Test-Drive)</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Navigate README, HANDOFF, AGENTS &amp; memory-wiki in place inside one reusable tab with Back/Forward history instead of opening a new tab per doc.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(docsSingleTabMode)}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setDocsSingleTabMode?.(next);
                        localStorage.setItem('aim-docs-single-tab', String(next));
                      }}
                    />
                  </label>
                </div>

                <div style={{ paddingTop: '6px', borderTop: '1px solid var(--border-hairline)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '12px', cursor: 'pointer' }}>
                    <div>
                      <div>Auto-Scroll Session Stream to Latest Reply (Optional)</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        OFF by default so tall replies never yank your reading position; pair with the floating ↓ Hop-to-Bottom button.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(sessionAutoScroll)}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setSessionAutoScroll?.(next);
                        localStorage.setItem('aim-session-autoscroll', String(next));
                      }}
                    />
                  </label>
                </div>

                <div style={{ paddingTop: '6px', borderTop: '1px solid var(--border-hairline)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <div>Workspace Pane Memory Across Sessions</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Per-Session remembers Terminal / Files / Browser &amp; active file per project with zero background mounts.
                      </div>
                    </div>
                    <select
                      className="ld-select"
                      style={{ width: 'auto', minWidth: '175px' }}
                      value={sessionLayoutMode}
                      onChange={(e) => {
                        const next = e.target.value === 'global' ? 'global' : 'per-session';
                        setSessionLayoutMode?.(next);
                        localStorage.setItem('aim-session-layout-mode', next);
                      }}
                    >
                      <option value="per-session">Per-Session Memory</option>
                      <option value="global">Global (Follow Me)</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'tmux' && (
            <>
              {tmuxCfgStatus && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(var(--accent-rgb), 0.1)',
                    border: '1px solid var(--accent)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11.5px',
                    color: 'var(--accent)',
                  }}
                >
                  {tmuxCfgStatus}
                </div>
              )}

              <div className="settings-group-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div className="settings-group-title">1. DEFAULT AGENT HARNESS, AUTO-RESUME (-C) &amp; PERMISSIONS</div>
                  <button
                    type="button"
                    className="subbar-util-btn"
                    onClick={() => persistTmuxSettingsPatch({}, true, 'SYNCED TO ~/.TMUX.CONF ✓')}
                    title="Write matching @resurrect-processes (-c) translation rules to ~/.tmux.conf"
                  >
                    <Icon name="refresh" size={11} />
                    <span>SYNC TO ~/.TMUX.CONF</span>
                  </button>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Controls which CLI agent launches when opening a repository or invoking Fast Resume, whether it reopens your last folder conversation (<code>-c</code>), and whether Antigravity bypasses tool approval prompts.
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>Default Spawn / Fast-Resume CLI</div>
                  <select
                    className="ld-select"
                    value={localTmuxCfg.default_agent || 'agy'}
                    onChange={(e) => persistTmuxSettingsPatch({ default_agent: e.target.value })}
                  >
                    <option value="agy">Antigravity (agy)</option>
                    <option value="grok">Grok CLI (grok)</option>
                    <option value="opencode">OpenCode (opencode)</option>
                    <option value="codex">Codex CLI (codex)</option>
                    <option value="shell">Bash Shell Only (No Auto-Agent)</option>
                  </select>
                </div>
                <label className="setting-check-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>Auto-Resume Previous Folder Session (-c)</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Turn OFF when you want newly launched or restored sessions to start a blank conversation
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(localTmuxCfg.auto_resume_c)}
                    onChange={(e) => persistTmuxSettingsPatch({ auto_resume_c: e.target.checked })}
                  />
                </label>
                <label className="setting-check-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>Autonomous Skip-Permissions Mode (--dangerously-skip-permissions)</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Appends <code>--dangerously-skip-permissions</code> when launching <code>agy</code>; turn OFF on untrusted repos
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(localTmuxCfg.skip_permissions)}
                    onChange={(e) => persistTmuxSettingsPatch({ skip_permissions: e.target.checked })}
                  />
                </label>
              </div>

              <div className="settings-group-card">
                <div className="settings-group-title">2. COLD-BOOT AUTO-RESTORE (TMUX-RESURRECT ON REBOOT)</div>
                <label className="setting-check-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>Auto-Restore Saved Tmux Fleet on OS / WSL Reboot</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      When ON, <code>boot-restore.sh</code> reloads your saved snapshot and resumes all agents automatically. Turn OFF for a clean boot that starts only AIM-Connect (<code>:8000</code> + tunnel) without relaunching heavy agents.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(localTmuxCfg.auto_restore_on_boot)}
                    onChange={(e) => persistTmuxSettingsPatch({ auto_restore_on_boot: e.target.checked })}
                  />
                </label>
              </div>

              <div className="settings-group-card">
                <div className="settings-group-title">3. HEADLESS WSL2 KEEPALIVE &amp; LINUX SYSTEMD BOOT UNIT</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Keep WSL2 and <code>tmux</code> awake with zero open Windows Terminal windows—or revert 100% back to default Windows idle shutdown in 1 click or via CLI.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                      padding: '10px 12px',
                      borderRadius: '9px',
                      background: hostBootStatus?.wsl_always_on_enabled
                        ? 'rgba(var(--accent-rgb), 0.07)'
                        : 'var(--bg-input)',
                      border: hostBootStatus?.wsl_always_on_enabled
                        ? '1px solid rgba(var(--accent-rgb), 0.35)'
                        : '1px solid var(--border-hairline)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>
                        WSL2 Always-On Mode (Survive Closing Windows Terminal)
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        Mode: {hostBootStatus?.wsl_always_on_enabled ? 'ENABLED ✓' : 'OFF (Windows Default)'} · Startup VBS:{' '}
                        {hostBootStatus?.windows_startup_installed ? 'INSTALLED ✓' : 'OFF'} · .wslconfig vmIdleTimeout=-1:{' '}
                        {hostBootStatus?.wsl_idle_timeout_configured ? 'SET ✓' : 'OFF'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={hostBootStatus?.wsl_always_on_enabled ? 'subbar-util-btn active' : 'neon-cta-btn'}
                      style={{ height: '30px', padding: '0 11px', fontSize: '10.5px' }}
                      disabled={hostActionBusy}
                      onClick={() =>
                        handleHostControl(
                          hostBootStatus?.wsl_always_on_enabled ? 'disable_wsl_always_on' : 'enable_wsl_always_on'
                        )
                      }
                      title={
                        hostBootStatus?.wsl_always_on_enabled
                          ? 'Stop keepalive handle, remove Windows Startup VBS, and strip vmIdleTimeout=-1 from .wslconfig'
                          : 'Configure .wslconfig vmIdleTimeout=-1, install hidden Windows Startup VBS, and launch wscript keepalive handle'
                      }
                    >
                      {hostBootStatus?.wsl_always_on_enabled ? 'TURN OFF & REVERT ALWAYS-ON' : 'ENABLE WSL ALWAYS-ON'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>Linux Cold-Boot Recovery Unit (aim-connect-boot.service)</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Status: {hostBootStatus?.systemd_boot_unit_installed ? 'INSTALLED ✓' : 'NOT INSTALLED'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="subbar-util-btn"
                      disabled={hostActionBusy}
                      onClick={() =>
                        handleHostControl(
                          hostBootStatus?.systemd_boot_unit_installed ? 'uninstall_boot_unit' : 'install_boot_unit'
                        )
                      }
                    >
                      {hostBootStatus?.systemd_boot_unit_installed ? 'DISABLE BOOT UNIT' : 'ENABLE BOOT UNIT'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid var(--border-hairline)' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>Background Keepalive Handle (Temporary Battery Pause)</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Handle: {hostBootStatus?.wsl_keepalive_running ? 'ACTIVE ✓' : 'PAUSED'} · .wslconfig vmIdleTimeout=-1:{' '}
                        {hostBootStatus?.wsl_idle_timeout_configured ? 'SET ✓' : 'NOT SET'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="subbar-util-btn"
                      disabled={hostActionBusy}
                      onClick={() =>
                        handleHostControl(
                          hostBootStatus?.wsl_keepalive_running ? 'stop_keepalive' : 'start_keepalive'
                        )
                      }
                    >
                      {hostBootStatus?.wsl_keepalive_running ? 'PAUSE KEEPALIVE' : 'START KEEPALIVE'}
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                      paddingTop: '6px',
                      borderTop: '1px solid var(--border-hairline)',
                      fontSize: '10.5px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>
                      CLI Toggle: <code>./scripts/wsl-keepalive.sh on</code> · Revert:{' '}
                      <code>{hostBootStatus?.cli_disable_cmd || './scripts/wsl-keepalive.sh off'}</code>
                    </span>
                    <button
                      type="button"
                      className="subbar-util-btn"
                      onClick={() => {
                        const cmd = hostBootStatus?.cli_disable_cmd || './scripts/wsl-keepalive.sh off';
                        navigator.clipboard?.writeText?.(cmd);
                        setTmuxCfgStatus('COPIED OFF CMD ✓');
                        setTimeout(() => setTmuxCfgStatus(''), 2200);
                      }}
                    >
                      <span>COPY OFF CMD</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-group-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div className="settings-group-title">4. EMPTY-SAVE GUARDRAIL &amp; SIDEBAR WORKSPACE BAR</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="subbar-util-btn"
                      onClick={() => onSaveWorkspaceState?.()}
                    >
                      <Icon name="upload" size={11} />
                      <span>SAVE NOW</span>
                    </button>
                    <button
                      type="button"
                      className="subbar-util-btn"
                      onClick={() => onRestoreWorkspaceState?.()}
                    >
                      <Icon name="refresh" size={11} />
                      <span>RESTORE -C</span>
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {resurrectMeta
                    ? `tmux-resurrect: ${resurrectMeta.installed ? 'INSTALLED' : 'MISSING'} · Saved Backup: ${resurrectMeta.saved_session_count} sessions · Active: ${resurrectMeta.active_session_count}${
                        resurrectMeta.last_saved_at
                          ? ` · ${new Date(resurrectMeta.last_saved_at * 1000).toLocaleString()}`
                          : ''
                      }`
                    : 'Inspecting tmux-resurrect snapshot state...'}
                </div>
                <label className="setting-check-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>Empty-Save Guardrail Confirmation Prompt</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Warn before overwriting a multi-session backup when active session count is 1 or drops by 50%+
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(localTmuxCfg.empty_save_guardrail)}
                    onChange={(e) => persistTmuxSettingsPatch({ empty_save_guardrail: e.target.checked })}
                  />
                </label>
                <label className="setting-check-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>Show SAVE STATE / RESTORE -C Footer in Fleet Sidebar</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Turn OFF on compact mobile screens to prevent accidental taps (Save/Restore stay in Cmd+K &amp; Settings)
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(localTmuxCfg.show_sidebar_resurrect_bar)}
                    onChange={(e) => persistTmuxSettingsPatch({ show_sidebar_resurrect_bar: e.target.checked })}
                  />
                </label>
              </div>

              <div className="settings-group-card">
                <div className="settings-group-title">5. GIT REPO LAUNCHER SCAN FOLDERS (~/.aim_dashboard.json)</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Your home folder (<code>~</code> up to 2 levels deep) is scanned automatically. Add extra parent folders (one path per line, e.g. <code>/mnt/d/projects</code>)—shared directly with <code>aim-dash</code>.
                </div>
                <textarea
                  className="ld-text-input"
                  rows={3}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', resize: 'vertical' }}
                  placeholder="/mnt/d/projects&#10;~/work/clients"
                  value={searchPathsText}
                  onChange={(e) => setSearchPathsText(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="neon-cta-btn" style={{ height: '32px' }} onClick={handleSaveScanPaths}>
                    <Icon name="folder" size={12} />
                    <span>SAVE SCAN FOLDERS</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'keyboard' && (
            <>
              <div className="settings-group-card">
                <div className="settings-group-title">SOVEREIGN ON-SCREEN KEYBOARD</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>Default Keyboard Mode</div>
                    <select
                      className="ld-select"
                      value={keyboardMode}
                      onChange={(e) => {
                        setKeyboardMode?.(e.target.value);
                        localStorage.setItem('aim-kb-mode', e.target.value);
                      }}
                    >
                      <option value="standard">Standard Alpha (ABC / ?123 / Fn)</option>
                      <option value="hacker">Hacker Terminal (Esc / Tab / Arrows)</option>
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>Keypress Tactile Feedback</div>
                    <select
                      className="ld-select"
                      value={keyboardFeedback}
                      onChange={(e) => {
                        setKeyboardFeedback?.(e.target.value);
                        localStorage.setItem('aim-kb-feedback', e.target.value);
                      }}
                    >
                      <option value="audio">Subtle Audio Ticks</option>
                      <option value="haptic">Haptic Vibration (Mobile)</option>
                      <option value="off">Silent / Off</option>
                    </select>
                  </div>
                </div>
                <label className="setting-check-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>Auto-Capitalize Sentences</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Automatically shift first letter on Standard mobile keyboard
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(autoCaps)}
                    onChange={(e) => toggleBool(setAutoCaps, 'aim-kb-autocaps', e.target.checked)}
                  />
                </label>
                <label className="setting-check-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>Auto-Hide In-House Keyboard (Android Mode)</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Hide automatically when tapping outside, pressing Enter to send, or opening modals, and suppress the OS keyboard while KB is active
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(keyboardAutoHide)}
                    onChange={(e) => toggleBool(setKeyboardAutoHide, 'aim-kb-autohide', e.target.checked)}
                  />
                </label>
              </div>

              <div className="settings-group-card">
                <div className="settings-group-title">FLEET AUDIO ALERTS</div>
                <label className="setting-check-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>Agent Completion &amp; Approval Gate Chime</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Play alert chime when a background session completes a turn (NEW) or pauses at WAITING
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(alertChime)}
                    onChange={(e) => toggleBool(setAlertChime, 'aim-alert-chime', e.target.checked)}
                  />
                </label>
              </div>
            </>
          )}

          {activeTab === 'voice' && (
            <>
              <div className="settings-group-card">
                <div className="settings-group-title">NEURAL TEXT-TO-SPEECH (SPOKEN SUMMARY 🔊)</div>
                <label className="setting-check-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>Auto-Playback Agent Spoken Summary</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Automatically read aloud the final 🔊 block when an agent turn finishes
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(voiceAutoRead)}
                    onChange={(e) => toggleBool(setVoiceAutoRead, 'aim-voice-autoread', e.target.checked)}
                  />
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    className="ld-select"
                    style={{ flex: 1 }}
                    value={ttsVoice || 'piper:en_GB-alan-medium'}
                    onChange={(e) => {
                      setTtsVoice?.(e.target.value);
                      localStorage.setItem('aim-voice-tts-voice', e.target.value);
                    }}
                  >
                    {TTS_VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="neon-cta-btn"
                    style={{ height: '34px' }}
                    onClick={() => onPreviewVoice?.(ttsVoice)}
                  >
                    <Icon name="play" /> <span>TEST VOICE</span>
                  </button>
                </div>
              </div>

              <div
                className="settings-group-card"
                style={{ background: 'rgba(var(--accent-rgb), 0.05)', borderColor: 'rgba(var(--accent-rgb), 0.36)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div className="settings-group-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="zap" />
                      <span>CUSTOM VOICE MACROS (SPOKEN COMMAND ENGINE)</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.55, marginTop: '4px' }}>
                      Any custom macro can be bound to a spoken trigger phrase—say your phrase into the mic to fire bash scripts, agent skills (<code>/aim-handoff</code>, <code>/aim-memory-wiki</code>), or terminal keys hands-free at will.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="neon-cta-btn"
                    style={{ height: '34px', padding: '0 14px' }}
                    onClick={() => onOpenVoiceMacros?.()}
                  >
                    <Icon name="settings" />
                    <span>MACRO SETTINGS ({voiceMacros.length} VOICE ACTIVE)</span>
                  </button>
                </div>
                {voiceMacros.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '4px', borderTop: '1px solid var(--border-hairline)' }}>
                    {voiceMacros.map((m) => (
                      <span
                        key={m.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-hairline)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                        }}
                      >
                        <strong style={{ color: 'var(--accent)' }}>&quot;{m.voiceTrigger}&quot;</strong>
                        <span style={{ color: 'var(--text-muted)' }}>-&gt; {m.label}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="settings-group-card">
                <div className="settings-group-title">VOICE DICTATION &amp; HANDS-FREE TRIGGERS</div>
                {[
                  [voiceContinuous, setVoiceContinuous, 'aim-voice-continuous', 'Continuous Listening Loop', 'Keep microphone active across turns until manually toggled off'],
                  [voiceAutoEnter, setVoiceAutoEnter, 'aim-voice-enter', 'Say "Enter" to Submit (\\r)', 'Speaking the word "enter" dispatches prompt immediately'],
                  [voiceAutoSend, setVoiceAutoSend, 'aim-voice-send', 'Say "Send" to Submit (\\r)', 'Speaking the word "send" dispatches prompt immediately'],
                  [voiceAutoExecute, setVoiceAutoExecute, 'aim-voice-execute', 'Say "Execute" to Submit (\\r)', 'Speaking the word "execute" dispatches prompt immediately'],
                  [voiceAutoCapitalize, setVoiceAutoCapitalize, 'aim-voice-autocap', 'Auto-Capitalize Dictated Sentences', 'Clean punctuation and sentence casing on speech transcripts'],
                  [voiceSlashes, setVoiceSlashes, 'aim-voice-slashes', 'Verbal Slash Conversion (/ \\)', 'Convert spoken "slash" and "backslash" for CLI skill commands'],
                ].map(([val, setter, key, title, sub]) => (
                  <label key={key} className="setting-check-row">
                    <div>
                      <div style={{ fontWeight: 600 }}>{title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(val)}
                      onChange={(e) => toggleBool(setter, key, e.target.checked)}
                    />
                  </label>
                ))}
              </div>
            </>
          )}

          {activeTab === 'integrations' && (
            <div className="settings-group-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div className="settings-group-title">ZERO-OAUTH OUTBOUND EMAIL VAULT</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Scoped to active node: <strong>{targetVaultSession}</strong> (encrypted local credential store)
                  </div>
                </div>
                {hasVaultPassword && (
                  <span className="e2ee-status-chip">
                    <Icon name="check" /> VAULTED
                  </span>
                )}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>Gmail / Workspace Address</div>
                <input
                  type="email"
                  className="ld-text-input"
                  placeholder="e.g. joshua@yourdomain.com"
                  value={vaultEmail}
                  onChange={(e) => setVaultEmail(e.target.value)}
                />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>Google 16-Character App Password</div>
                <input
                  type="password"
                  className="ld-text-input"
                  placeholder={hasVaultPassword ? '•••••••••••••••• (Leave blank to keep existing)' : '16-character app password'}
                  value={vaultAppPass}
                  onChange={(e) => setVaultAppPass(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="neon-cta-btn" onClick={handleSaveVault}>
                  <Icon name="plug" /> <span>{vaultStatus || 'SAVE CREDENTIALS'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <>
              <div className="settings-group-card">
                <div className="settings-group-title">END-TO-END WEBSOCKET ENCRYPTION (PBKDF2 + AES-256-GCM)</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Shared secret derives your per-frame WebSocket cipher key locally—never transmitted in plaintext.
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="ld-text-input"
                    type={showE2eeSecret ? 'text' : 'password'}
                    placeholder="Leave blank for plaintext"
                    value={localE2eeSecret}
                    onChange={(e) => setLocalE2eeSecret(e.target.value)}
                  />
                  <button
                    type="button"
                    className="subbar-util-btn"
                    style={{ height: '34px', padding: '0 12px' }}
                    onClick={() => setShowE2eeSecret(!showE2eeSecret)}
                  >
                    <Icon name={showE2eeSecret ? 'eyeOff' : 'eye'} />
                    <span>{showE2eeSecret ? 'HIDE' : 'SHOW'}</span>
                  </button>
                  <button type="button" className="neon-cta-btn" style={{ height: '34px' }} onClick={handleApplyE2ee}>
                    APPLY E2EE
                  </button>
                </div>
                {e2eeStatus && (
                  <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{e2eeStatus}</div>
                )}
              </div>

              <div className="settings-group-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div className="settings-group-title">HARDWARE BIOMETRICS &amp; WEBAUTHN PASSKEYS</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Unlock A.I.M. Connect via FaceID, TouchID, or Windows Hello
                    </div>
                  </div>
                  <button type="button" className="subbar-util-btn active" style={{ height: '30px' }} onClick={handleRegisterPasskey}>
                    <Icon name="fingerprint" /> <span>+ REGISTER PASSKEY</span>
                  </button>
                </div>
                {registerStatus && (
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: registerStatus.includes('Error') || registerStatus.includes('failed') ? '#f87171' : 'var(--accent)',
                    }}
                  >
                    {registerStatus}
                  </div>
                )}
              </div>

              <div className="settings-group-card" style={{ borderColor: 'rgba(239, 68, 68, 0.35)' }}>
                <div className="settings-group-title" style={{ color: '#f87171' }}>
                  SESSION LOCK &amp; TOKEN REVOCATION
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Revoke active session token and return to the Emerald Matrix 3FA Lock Screen.
                  </span>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => {
                      onClose?.();
                      onLogout?.();
                    }}
                  >
                    <Icon name="lock" /> <span>LOGOUT / LOCK 3FA SCREEN</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer-bar">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)' }}>
            4h sliding active-user session · Zero-cache HTML
          </span>
          <button type="button" className="neon-cta-btn" onClick={onClose} style={{ height: '34px', padding: '0 18px' }}>
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}
