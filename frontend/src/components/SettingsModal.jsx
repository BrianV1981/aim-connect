import { useEffect, useState } from 'react';
import { registerWebAuthn } from '../webauthn';
import Icon from './Icons';
import InfoBubble from './InfoBubble';
import { SETTINGS_HELP } from '../settingsHelp';

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

const NODE_BADGE_SWATCHES = ['#00FFA3', '#38BDF8', '#F59E0B', '#A855F7', '#F43F5E', '#FF5722'];

// #314: every setting gets an always-visible plain-English line (Summary) and a tap-friendly ? bubble (Help).
function Help({ k }) {
  return <InfoBubble text={SETTINGS_HELP[k]?.details} />;
}

function Summary({ k, style }) {
  return (
    <div className="setting-help" style={style}>
      {SETTINGS_HELP[k]?.summary}
    </div>
  );
}

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
  recentSessionsLimit = 8,
  setRecentSessionsLimit,
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
  nodeInfo = null,
  onNodeInfoUpdated,
  serverDirectory = [],
  onSwitchServer,
  onAddLocalServer,
  onRemoveLocalServer,
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

  // Multi-Server Node Identity & Peer Switcher (#306)
  const [nodeLabelInput, setNodeLabelInput] = useState(() => nodeInfo?.node_label || '');
  const [nodeMonogramInput, setNodeMonogramInput] = useState(() => nodeInfo?.monogram || '');
  const [nodeColorInput, setNodeColorInput] = useState(() => nodeInfo?.app_color || '#00FFA3');
  const [peerLabelInput, setPeerLabelInput] = useState('');
  const [peerUrlInput, setPeerUrlInput] = useState('');
  const [peerColorInput, setPeerColorInput] = useState('#38BDF8');
  const [nodeSaveStatus, setNodeSaveStatus] = useState('');

  useEffect(() => {
    if (!nodeInfo) return;
    setNodeLabelInput(nodeInfo.node_label || '');
    setNodeMonogramInput(nodeInfo.monogram || '');
    setNodeColorInput(nodeInfo.app_color || '#00FFA3');
  }, [nodeInfo]);

  const handleSaveNodeIdentity = async (overridePeers = null) => {
    const peersPayload =
      overridePeers !== null
        ? overridePeers
        : Array.isArray(nodeInfo?.peer_servers)
          ? nodeInfo.peer_servers
          : [];
    try {
      const res = await fetch('/api/node-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_label: nodeLabelInput.trim(),
          monogram: nodeMonogramInput.trim().toUpperCase(),
          app_color: nodeColorInput.trim(),
          peer_servers: peersPayload,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onNodeInfoUpdated?.(data);
        setNodeSaveStatus('IDENTITY SAVED ✓');
      } else {
        setNodeSaveStatus(data.detail || 'Save failed');
      }
    } catch {
      setNodeSaveStatus('Network error');
    }
    setTimeout(() => setNodeSaveStatus(''), 2800);
  };

  const handleAddPeerServerInSettings = async () => {
    if (!peerUrlInput.trim()) return;
    const localRes = onAddLocalServer?.({
      label: peerLabelInput,
      url: peerUrlInput,
      color: peerColorInput,
    });
    if (localRes && !localRes.ok) {
      setNodeSaveStatus(localRes.error || 'Invalid URL');
      setTimeout(() => setNodeSaveStatus(''), 2800);
      return;
    }
    const existingPeers = Array.isArray(nodeInfo?.peer_servers) ? nodeInfo.peer_servers : [];
    const nextEntry = localRes?.entry || {
      label: peerLabelInput.trim(),
      url: peerUrlInput.trim(),
      color: peerColorInput,
    };
    const mergedPeers = [
      ...existingPeers.filter((p) => String(p.url).toLowerCase() !== String(nextEntry.url).toLowerCase()),
      { label: nextEntry.label, url: nextEntry.url, color: nextEntry.color },
    ];
    setPeerLabelInput('');
    setPeerUrlInput('');
    await handleSaveNodeIdentity(mergedPeers);
  };

  const handleRemoveServerFromDirectory = async (srv) => {
    onRemoveLocalServer?.(srv.url);
    const existingPeers = Array.isArray(nodeInfo?.peer_servers) ? nodeInfo.peer_servers : [];
    if (existingPeers.some((p) => String(p.url).toLowerCase() === String(srv.url).toLowerCase())) {
      const filtered = existingPeers.filter((p) => String(p.url).toLowerCase() !== String(srv.url).toLowerCase());
      await handleSaveNodeIdentity(filtered);
    }
  };

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
              TAP ANY ? FOR A PLAIN-ENGLISH EXPLANATION
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
                    INSTALL AS AN APP
                    <Help k="installApp" />
                  </div>
                  <Summary k="installApp" style={{ marginTop: '2px' }} />
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
                      title="Load the newest version of the app from your server (like a hard refresh)"
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div>
                    <div className="settings-group-title">
                      SERVER IDENTITY &amp; MULTI-SERVER SWITCHER
                      <Help k="serverIdentity" />
                    </div>
                    <Summary k="serverIdentity" style={{ marginTop: '2px' }} />
                  </div>
                  {nodeSaveStatus && (
                    <span className="e2ee-status-chip">{nodeSaveStatus}</span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {serverDirectory.map((srv) => (
                    <div
                      key={srv.id || srv.url}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                        padding: '8px 11px',
                        borderRadius: '9px',
                        background: srv.isCurrent ? 'rgba(var(--accent-rgb), 0.08)' : 'var(--bg-input)',
                        border: srv.isCurrent ? `1px solid ${srv.color}` : '1px solid var(--border-hairline)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span
                          style={{
                            width: '9px',
                            height: '9px',
                            borderRadius: '50%',
                            background: srv.color,
                            boxShadow: `0 0 8px ${srv.color}`,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            {srv.label}{' '}
                            {srv.isCurrent && (
                              <span style={{ color: 'var(--accent)', fontSize: '10px' }}>· ACTIVE SERVER</span>
                            )}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {srv.url}
                          </div>
                        </div>
                      </div>
                      {!srv.isCurrent && (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="neon-cta-btn"
                            style={{ height: '28px', padding: '0 10px', fontSize: '10.5px' }}
                            onClick={() => onSwitchServer?.(srv.url, { logoutFirst: true })}
                            title={`Sign out of this server and open ${srv.label} (${srv.url})`}
                          >
                            <Icon name="externalLink" size={11} />
                            <span>LOGOUT &amp; SWITCH</span>
                          </button>
                          <button
                            type="button"
                            className="ghost-btn"
                            style={{ height: '28px', padding: '0 7px' }}
                            onClick={() => handleRemoveServerFromDirectory(srv)}
                            title={`Remove ${srv.label}`}
                          >
                            <Icon name="trash" size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="setting-help" style={{ paddingTop: '6px', borderTop: '1px solid var(--border-hairline)' }}>
                  <strong>Add another computer:</strong> {SETTINGS_HELP.addServer.summary}
                  <Help k="addServer" />
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="ld-text-input"
                    style={{ flex: '1 1 120px', height: '32px' }}
                    placeholder="Peer Label (e.g. Cloud VPS)"
                    value={peerLabelInput}
                    onChange={(e) => setPeerLabelInput(e.target.value)}
                  />
                  <input
                    type="url"
                    className="ld-text-input"
                    style={{ flex: '2 1 200px', height: '32px' }}
                    placeholder="https://vps.yourdomain.com"
                    value={peerUrlInput}
                    onChange={(e) => setPeerUrlInput(e.target.value)}
                  />
                  <input
                    type="color"
                    value={peerColorInput}
                    onChange={(e) => setPeerColorInput(e.target.value)}
                    title="Badge color for the other computer"
                    style={{ width: '34px', height: '32px', padding: '2px', borderRadius: '7px', border: '1px solid var(--border-hairline)', background: 'var(--bg-input)', cursor: 'pointer' }}
                  />
                  <button
                    type="button"
                    className="subbar-util-btn active"
                    style={{ height: '32px', padding: '0 11px' }}
                    onClick={handleAddPeerServerInSettings}
                  >
                    <Icon name="plus" size={11} />
                    <span>ADD SERVER</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-hairline)' }}>
                  <div className="setting-help">
                    <strong>This computer:</strong> {SETTINGS_HELP.thisServerBadge.summary}
                    <Help k="thisServerBadge" />
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="ld-text-input"
                      style={{ flex: '2 1 150px', height: '32px' }}
                      placeholder="This Server Name (e.g. 9800X3D)"
                      value={nodeLabelInput}
                      onChange={(e) => setNodeLabelInput(e.target.value)}
                    />
                    <input
                      type="text"
                      className="ld-text-input"
                      style={{ flex: '0 1 92px', height: '32px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                      maxLength={4}
                      placeholder="Icon (98X)"
                      value={nodeMonogramInput}
                      onChange={(e) => setNodeMonogramInput(e.target.value.toUpperCase())}
                      title="2-4 letters drawn onto this computer's app icon"
                    />
                    <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                      {NODE_BADGE_SWATCHES.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => setNodeColorInput(hex)}
                          title={`Select badge color ${hex}`}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '6px',
                            background: hex,
                            border: nodeColorInput.toUpperCase() === hex ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="subbar-util-btn"
                      style={{ height: '32px', padding: '0 12px' }}
                      onClick={() => handleSaveNodeIdentity(null)}
                    >
                      <span>SAVE SERVER IDENTITY</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-group-card">
                <div className="settings-group-title">
                  COLOR THEME
                  <Help k="colorScheme" />
                </div>
                <Summary k="colorScheme" />
                <div className="theme-swatch-grid">
                  {[
                    ['emerald', 'Emerald Matrix', 'Black with neon green (default)', '#050505', '#00FFA3'],
                    ['oled', 'Pure OLED Black', 'True black; saves battery on OLED phones', '#000000', '#00FFA3'],
                    ['light', 'Daylight Crisp', 'Light background for bright rooms', '#ffffff', '#047857'],
                    ['navy', 'Classic AIM Navy', 'Dark navy with orange accents', '#0b162c', '#ff5722'],
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
                <div className="settings-group-title">
                  YOUR MESSAGES (HIGHLIGHT COLOR &amp; SIDE)
                  <Help k="operatorReplies" />
                </div>
                <Summary k="operatorReplies" />
                <div className="theme-swatch-grid">
                  {[
                    ['cyan', 'Cyber Cyan Highlight', 'Blue highlight', '#00b8ff'],
                    ['gold', 'Command Gold Highlight', 'Amber highlight', '#f59e0b'],
                    ['emerald', 'Emerald Mint Highlight', 'Green highlight', '#00ffa3'],
                    ['grey', 'Default Muted Grey', 'No highlight', '#6b7280'],
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
                    WHICH SIDE YOUR MESSAGES APPEAR ON
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
                  <span className="settings-group-title">
                    TERMINAL TEXT SIZE &amp; COLORS
                    <Help k="terminalFont" />
                  </span>
                  <span className="mono-kbd">{termFontSize}px</span>
                </div>
                <Summary k="terminalFont" />
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
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>Terminal Colors</div>
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
                <div className="settings-group-title">
                  WORKSPACE &amp; EDITOR LAYOUT
                  <Help k="workspaceEditor" />
                </div>
                <Summary k="workspaceEditor" />

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
                  <span className="setting-help" style={{ flex: '1 1 220px' }}>
                    <strong>Folder list side.</strong> {SETTINGS_HELP.filesTreeSide.summary}
                    <Help k="filesTreeSide" />
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
                  <span className="setting-help" style={{ flex: '1 1 220px' }}>
                    <strong>Default session view.</strong> {SETTINGS_HELP.agentStage.summary}
                    <Help k="agentStage" />
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
                      <span>
                        Editor Text Size
                        <Help k="editorFont" />
                      </span>
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
                      Split-Screen Sizes ({Math.round(100 - splitWidthPct)}/{Math.round(splitWidthPct)})
                      <Help k="splitPreset" />
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
                    <span>
                      Hide Hidden System Folders
                      <Help k="hideDotfiles" />
                    </span>
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
                    <span>
                      Wrap Long Lines in Editor
                      <Help k="wordWrap" />
                    </span>
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
                      <div>
                        Open Documents in One Tab
                        <Help k="docsSingleTab" />
                      </div>
                      <Summary k="docsSingleTab" style={{ marginTop: '2px' }} />
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
                      <div>
                        Jump to Newest Reply Automatically
                        <Help k="autoScroll" />
                      </div>
                      <Summary k="autoScroll" style={{ marginTop: '2px' }} />
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
                      <div>
                        Remember Layout Per Project
                        <Help k="paneMemory" />
                      </div>
                      <Summary k="paneMemory" style={{ marginTop: '2px' }} />
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

                <div style={{ paddingTop: '6px', borderTop: '1px solid var(--border-hairline)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <div>
                        Recent Sessions to Keep
                        <Help k="recentSessions" />
                      </div>
                      <Summary k="recentSessions" style={{ marginTop: '2px' }} />
                    </div>
                    <select
                      className="ld-select"
                      style={{ width: 'auto', minWidth: '90px' }}
                      value={String(recentSessionsLimit)}
                      onChange={(e) => setRecentSessionsLimit?.(Number(e.target.value))}
                    >
                      {[3, 5, 8, 10, 15, 20, 30].map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
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
                  <div className="settings-group-title">
                    1. DEFAULT AI AGENT, RESUME &amp; PERMISSIONS
                    <Help k="agentDefaults" />
                  </div>
                  <button
                    type="button"
                    className="subbar-util-btn"
                    onClick={() => persistTmuxSettingsPatch({}, true, 'SYNCED TO ~/.TMUX.CONF ✓')}
                    title={SETTINGS_HELP.syncConf.summary}
                  >
                    <Icon name="refresh" size={11} />
                    <span>SYNC SETTINGS</span>
                  </button>
                </div>
                <Summary k="agentDefaults" />
                <div className="setting-help">
                  <strong>SYNC SETTINGS:</strong> {SETTINGS_HELP.syncConf.summary}
                  <Help k="syncConf" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Default AI Agent
                    <Help k="defaultAgent" />
                  </div>
                  <select
                    className="ld-select"
                    value={localTmuxCfg.default_agent || 'agy'}
                    onChange={(e) => persistTmuxSettingsPatch({ default_agent: e.target.value })}
                  >
                    <option value="agy">Antigravity (agy)</option>
                    <option value="grok">Grok CLI (grok)</option>
                    <option value="opencode">OpenCode (opencode)</option>
                    <option value="codex">Codex CLI (codex)</option>
                    <option value="claude">Claude Code (claude)</option>
                    <option value="shell">Plain Shell Only (No AI Agent)</option>
                  </select>
                </div>
                <label className="setting-check-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      Continue Each Agent&apos;s Saved Conversation
                      <Help k="autoResume" />
                    </div>
                    <Summary k="autoResume" />
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(localTmuxCfg.auto_resume_c)}
                    onChange={(e) => persistTmuxSettingsPatch({ auto_resume_c: e.target.checked })}
                  />
                </label>
                <label className="setting-check-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      Let Antigravity Act Without Asking
                      <Help k="skipPermissions" />
                    </div>
                    <div className="setting-help">
                      {SETTINGS_HELP.skipPermissions.summary}{' '}
                      <strong style={{ color: '#fbbf24' }}>Only use on projects you trust.</strong>
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
                <div className="settings-group-title">2. REOPEN EVERYTHING AFTER A RESTART</div>
                <label className="setting-check-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      Auto-Restore After Restart
                      <Help k="autoRestoreOnBoot" />
                    </div>
                    <Summary k="autoRestoreOnBoot" />
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(localTmuxCfg.auto_restore_on_boot)}
                    onChange={(e) => persistTmuxSettingsPatch({ auto_restore_on_boot: e.target.checked })}
                  />
                </label>
              </div>

              <div className="settings-group-card">
                <div className="settings-group-title">
                  3. KEEP RUNNING IN THE BACKGROUND
                  <Help k="keepAwake" />
                </div>
                <Summary k="keepAwake" />
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
                        WSL2 Always-On (Windows)
                        <Help k="wslAlwaysOn" />
                      </div>
                      <Summary k="wslAlwaysOn" style={{ marginTop: '2px' }} />
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        Status: {hostBootStatus?.wsl_always_on_enabled ? 'ON ✓' : 'OFF (Windows default)'} · Starts with Windows:{' '}
                        {hostBootStatus?.windows_startup_installed ? 'YES ✓' : 'NO'} · Sleep prevention:{' '}
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
                          ? 'Undo everything: let Windows put Linux to sleep again and stop the hidden helper from starting at sign-in'
                          : 'Keep Linux awake, start a small hidden helper whenever you sign in to Windows, and start it now'
                      }
                    >
                      {hostBootStatus?.wsl_always_on_enabled ? 'TURN OFF & REVERT ALWAYS-ON' : 'ENABLE WSL ALWAYS-ON'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>
                        Start Automatically on Boot (Linux)
                        <Help k="bootUnit" />
                      </div>
                      <Summary k="bootUnit" />
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Status: {hostBootStatus?.systemd_boot_unit_installed ? 'ON ✓' : 'OFF'}
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
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>
                        Background Helper (Pause to Save Battery)
                        <Help k="keepaliveHandle" />
                      </div>
                      <Summary k="keepaliveHandle" />
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Helper: {hostBootStatus?.wsl_keepalive_running ? 'RUNNING ✓' : 'PAUSED'} · Sleep prevention:{' '}
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
                      Terminal command · on: <code>./scripts/wsl-keepalive.sh on</code> · off:{' '}
                      <code>{hostBootStatus?.cli_disable_cmd || './scripts/wsl-keepalive.sh off'}</code>
                      <Help k="keepaliveCli" />
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
                  <div className="settings-group-title">
                    4. SAVE &amp; RESTORE YOUR WORKSPACE
                    <Help k="saveGuardrail" />
                  </div>
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
                      <span>RESTORE</span>
                    </button>
                  </div>
                </div>
                <Summary k="saveGuardrail" />
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {resurrectMeta
                    ? resurrectMeta.installed
                      ? `Last backup: ${resurrectMeta.saved_session_count} sessions${
                          resurrectMeta.last_saved_at
                            ? ` (${new Date(resurrectMeta.last_saved_at * 1000).toLocaleString()})`
                            : ''
                        } · Open now: ${resurrectMeta.active_session_count}`
                      : 'Save/Restore is unavailable: the restore tool (tmux-resurrect) is not installed. See the README for the one-time setup.'
                    : 'Checking your saved backup...'}
                </div>
                <label className="setting-check-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      Warn Before Overwriting a Bigger Backup
                      <Help k="guardrailToggle" />
                    </div>
                    <Summary k="guardrailToggle" />
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(localTmuxCfg.empty_save_guardrail)}
                    onChange={(e) => persistTmuxSettingsPatch({ empty_save_guardrail: e.target.checked })}
                  />
                </label>
                <label className="setting-check-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      Show Save/Restore Buttons in Session List
                      <Help k="sidebarBar" />
                    </div>
                    <Summary k="sidebarBar" />
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(localTmuxCfg.show_sidebar_resurrect_bar)}
                    onChange={(e) => persistTmuxSettingsPatch({ show_sidebar_resurrect_bar: e.target.checked })}
                  />
                </label>
              </div>

              <div className="settings-group-card">
                <div className="settings-group-title">
                  5. WHERE TO LOOK FOR YOUR PROJECTS
                  <Help k="scanFolders" />
                </div>
                <Summary k="scanFolders" />
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
                <div className="settings-group-title">
                  ON-SCREEN KEYBOARD
                  <Help k="keyboard" />
                </div>
                <Summary k="keyboard" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Starting Layout
                      <Help k="keyboardMode" />
                    </div>
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
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Key Press Feedback
                      <Help k="keyboardFeedback" />
                    </div>
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
                    <div style={{ fontWeight: 600 }}>
                      Auto-Capitalize Sentences
                      <Help k="autoCaps" />
                    </div>
                    <Summary k="autoCaps" />
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(autoCaps)}
                    onChange={(e) => toggleBool(setAutoCaps, 'aim-kb-autocaps', e.target.checked)}
                  />
                </label>
                <label className="setting-check-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      Auto-Hide In-House Keyboard
                      <Help k="keyboardAutoHide" />
                    </div>
                    <Summary k="keyboardAutoHide" />
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(keyboardAutoHide)}
                    onChange={(e) => toggleBool(setKeyboardAutoHide, 'aim-kb-autohide', e.target.checked)}
                  />
                </label>
              </div>

              <div className="settings-group-card">
                <div className="settings-group-title">SOUND ALERTS</div>
                <label className="setting-check-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      Chime When an Agent Finishes or Needs You
                      <Help k="alertChime" />
                    </div>
                    <Summary k="alertChime" />
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
                <div className="settings-group-title">READ SUMMARIES ALOUD (🔊)</div>
                <label className="setting-check-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      Read Each Summary Aloud Automatically
                      <Help k="spokenSummary" />
                    </div>
                    <Summary k="spokenSummary" />
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(voiceAutoRead)}
                    onChange={(e) => toggleBool(setVoiceAutoRead, 'aim-voice-autoread', e.target.checked)}
                  />
                </label>
                <div className="setting-help">
                  <strong>Voice:</strong> {SETTINGS_HELP.ttsVoice.summary}
                  <Help k="ttsVoice" />
                </div>
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
                      <span>CUSTOM VOICE MACROS (SPOKEN SHORTCUTS)</span>
                      <Help k="voiceMacros" />
                    </div>
                    <Summary k="voiceMacros" style={{ marginTop: '4px' }} />
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
                <div className="settings-group-title">
                  VOICE TYPING
                  <Help k="dictation" />
                </div>
                <Summary k="dictation" />
                {[
                  [voiceContinuous, setVoiceContinuous, 'aim-voice-continuous', 'Keep Listening', 'voiceContinuous'],
                  [voiceAutoEnter, setVoiceAutoEnter, 'aim-voice-enter', 'Say "Enter" to Send', 'voiceAutoEnter'],
                  [voiceAutoSend, setVoiceAutoSend, 'aim-voice-send', 'Say "Send" to Send', 'voiceAutoSend'],
                  [voiceAutoExecute, setVoiceAutoExecute, 'aim-voice-execute', 'Say "Execute" to Send', 'voiceAutoExecute'],
                  [voiceAutoCapitalize, setVoiceAutoCapitalize, 'aim-voice-autocap', 'Tidy Capitals & Punctuation', 'voiceAutoCapitalize'],
                  [voiceSlashes, setVoiceSlashes, 'aim-voice-slashes', 'Spoken "Slash" Becomes /', 'voiceSlashes'],
                ].map(([val, setter, key, title, helpKey]) => (
                  <label key={key} className="setting-check-row">
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {title}
                        <Help k={helpKey} />
                      </div>
                      <Summary k={helpKey} />
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
                  <div className="settings-group-title">
                    LET AGENTS SEND EMAIL (ZERO-OAUTH OUTBOUND EMAIL VAULT)
                    <Help k="emailVault" />
                  </div>
                  <Summary k="emailVault" style={{ marginTop: '2px' }} />
                  <div className="setting-help" style={{ marginTop: '2px' }}>
                    Saved for session: <strong>{targetVaultSession}</strong>
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
                <div className="settings-group-title">
                  EXTRA ENCRYPTION PASSPHRASE (OPTIONAL)
                  <Help k="e2ee" />
                </div>
                <Summary k="e2ee" />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="ld-text-input"
                    type={showE2eeSecret ? 'text' : 'password'}
                    placeholder="Leave blank to turn off"
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
                    APPLY PASSPHRASE
                  </button>
                </div>
                {e2eeStatus && (
                  <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{e2eeStatus}</div>
                )}
              </div>

              <div className="settings-group-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div className="settings-group-title">
                      FACE / FINGERPRINT SIGN-IN (PASSKEYS)
                      <Help k="passkey" />
                    </div>
                    <Summary k="passkey" style={{ marginTop: '2px' }} />
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
                  SIGN OUT
                  <Help k="logout" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <span className="setting-help">{SETTINGS_HELP.logout.summary}</span>
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
            You stay signed in while active · after 4 hours without activity you sign in again
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onLogout && (
              <button
                type="button"
                className="subbar-util-btn"
                style={{ height: '34px', padding: '0 12px', borderColor: 'rgba(239, 68, 68, 0.45)', color: '#f87171' }}
                onClick={() => {
                  onClose?.();
                  onLogout?.();
                }}
                title="Sign out of this computer and go back to the login screen (where you can also switch computers)"
              >
                <Icon name="lock" size={12} />
                <span>{serverDirectory.length > 1 ? 'LOCK / SWITCH SERVER' : 'LOCK 3FA'}</span>
              </button>
            )}
            <button type="button" className="neon-cta-btn" onClick={onClose} style={{ height: '34px', padding: '0 18px' }}>
              DONE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
