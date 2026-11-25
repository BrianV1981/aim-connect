import { useEffect, useState } from 'react';
import { authenticateWebAuthn } from '../webauthn';
import Icon from './Icons';

export default function AuthScreen({
  passphrase,
  setPassphrase,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  pin,
  authError,
  e2eeSecret,
  setE2eeSecret,
  onPinInput,
  onBackspace,
  onPasteClick,
  onWebAuthnLogin,
  onRefreshApp,
  nodeInfo = null,
  serverDirectory = [],
  onSwitchServer,
  onAddLocalServer,
  onRemoveLocalServer,
}) {
  const [webAuthnError, setWebAuthnError] = useState('');
  const [isWebAuthnLoading, setIsWebAuthnLoading] = useState(false);
  const [showE2eeSecret, setShowE2eeSecret] = useState(false);
  const [showAddServer, setShowAddServer] = useState(false);
  const [newServerLabel, setNewServerLabel] = useState('');
  const [newServerUrl, setNewServerUrl] = useState('');
  const [serverFormError, setServerFormError] = useState('');

  const activeNodeColor = nodeInfo?.app_color || 'var(--accent)';
  const activeNodeLabel =
    nodeInfo?.node_label ||
    (nodeInfo?.app_name && nodeInfo.app_name !== 'A.I.M. Connect' ? nodeInfo.app_name : '') ||
    (typeof window !== 'undefined' ? window.location.host : 'LOCAL NODE');
  const activeHostDisplay =
    nodeInfo?.host || (typeof window !== 'undefined' ? window.location.host : '');

  const handleSaveNewServer = (switchImmediately = false) => {
    if (!onAddLocalServer) return;
    const res = onAddLocalServer({ label: newServerLabel, url: newServerUrl });
    if (!res?.ok) {
      setServerFormError(res?.error || 'Invalid server URL');
      return;
    }
    setServerFormError('');
    setNewServerLabel('');
    setNewServerUrl('');
    setShowAddServer(false);
    if (switchImmediately && res.entry?.url) {
      onSwitchServer?.(res.entry.url);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key >= '0' && e.key <= '9') {
        onPinInput(e.key);
      } else if (e.key === 'Backspace') {
        onBackspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPinInput, onBackspace]);

  const handleWebAuthnLogin = async (e) => {
    e.preventDefault();
    if (!passphrase) {
      setWebAuthnError('Please enter your Name (Stealth Passphrase) first.');
      return;
    }

    setIsWebAuthnLoading(true);
    setWebAuthnError('');

    try {
      const result = await authenticateWebAuthn(passphrase);
      if (result.success) {
        onWebAuthnLogin(result.token, e2eeSecret, result.buildId);
      } else {
        setWebAuthnError(`WebAuthn Error: ${result.error}`);
      }
    } catch (err) {
      setWebAuthnError(err.message);
    } finally {
      setIsWebAuthnLoading(false);
    }
  };

  return (
    <div className="cockpit-shell">
      <div className="ld-grid-backdrop" />
      <div className="ld-aurora-wash" />
      <div className="auth-lock-stage">
        <div className="auth-card ld-mask-glass">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="ld-brand-box">
                <Icon name="aimMark" size={18} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                  AIM<span style={{ color: 'var(--accent)' }}>CONNECT</span> // 3FA GATE
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
                  ZERO-TRUST TOTP · WEBAUTHN · E2EE
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {onRefreshApp && (
                <button
                  type="button"
                  className="ghost-btn"
                  style={{ height: '28px', padding: '0 8px', fontSize: '10px' }}
                  onClick={onRefreshApp}
                  title="Reload latest frontend bundle (useful in standalone mobile PWA)"
                >
                  <Icon name="refresh" size={12} />
                  <span>REFRESH</span>
                </button>
              )}
              <span className="pulse-led" title="Zero-Trust 3FA Gate Active" />
            </div>
          </div>

          <div
            style={{
              width: '100%',
              padding: '9px 11px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.025)',
              border: `1px solid ${activeNodeColor}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '7px',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: activeNodeColor,
                    boxShadow: `0 0 8px ${activeNodeColor}`,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {activeNodeLabel}
                </span>
                {activeHostDisplay && activeHostDisplay.toLowerCase() !== activeNodeLabel.toLowerCase() && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                    · {activeHostDisplay}
                  </span>
                )}
              </div>
              {onAddLocalServer && (
                <button
                  type="button"
                  className="ghost-btn"
                  style={{ height: '23px', padding: '0 7px', fontSize: '9.5px' }}
                  onClick={() => {
                    setShowAddServer((prev) => !prev);
                    setServerFormError('');
                  }}
                  title="Add another AIM-Connect server URL to switch between servers from this login screen"
                >
                  <Icon name={showAddServer ? 'close' : 'plus'} size={10} />
                  <span>{showAddServer ? 'CANCEL' : 'SERVERS'}</span>
                </button>
              )}
            </div>

            {serverDirectory.length > 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {serverDirectory.map((srv) => (
                  <div
                    key={srv.id || srv.url}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderRadius: '7px',
                      border: srv.isCurrent ? `1px solid ${srv.color}` : '1px solid var(--border-hairline)',
                      background: srv.isCurrent ? 'rgba(255, 255, 255, 0.07)' : 'var(--bg-input)',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!srv.isCurrent) onSwitchServer?.(srv.url);
                      }}
                      disabled={srv.isCurrent}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: srv.isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        fontWeight: srv.isCurrent ? 700 : 500,
                        padding: '4px 8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: srv.isCurrent ? 'default' : 'pointer',
                      }}
                      title={srv.isCurrent ? `Currently on ${srv.url}` : `Switch to ${srv.label} (${srv.url})`}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: srv.color,
                          flexShrink: 0,
                        }}
                      />
                      <span>{srv.label}</span>
                      {!srv.isCurrent && <Icon name="externalLink" size={10} />}
                    </button>
                    {!srv.isCurrent && srv.source === 'local' && onRemoveLocalServer && (
                      <button
                        type="button"
                        onClick={() => onRemoveLocalServer(srv.url)}
                        style={{
                          border: 'none',
                          borderLeft: '1px solid var(--border-hairline)',
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          padding: '4px 5px',
                          cursor: 'pointer',
                          fontSize: '10px',
                          lineHeight: 1,
                        }}
                        title={`Remove ${srv.label} from saved servers`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showAddServer && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px', borderTop: '1px solid var(--border-hairline)' }}>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="ld-text-input"
                    style={{ flex: '1 1 100px', height: '30px', fontSize: '11.5px' }}
                    placeholder="Label (e.g. Cloud VPS)"
                    value={newServerLabel}
                    onChange={(e) => setNewServerLabel(e.target.value)}
                  />
                  <input
                    type="url"
                    className="ld-text-input"
                    style={{ flex: '2 1 160px', height: '30px', fontSize: '11.5px' }}
                    placeholder="https://vps.yourdomain.com"
                    value={newServerUrl}
                    onChange={(e) => setNewServerUrl(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                  <button
                    type="button"
                    className="subbar-util-btn"
                    onClick={() => handleSaveNewServer(false)}
                  >
                    <span>SAVE TO LIST</span>
                  </button>
                  <button
                    type="button"
                    className="neon-cta-btn"
                    style={{ height: '26px', padding: '0 10px', fontSize: '10px' }}
                    onClick={() => handleSaveNewServer(true)}
                  >
                    <span>SAVE &amp; SWITCH</span>
                  </button>
                </div>
                {serverFormError && (
                  <div style={{ color: '#f87171', fontSize: '10.5px', fontFamily: 'var(--font-mono)' }}>
                    {serverFormError}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <input
              type="text"
              className="ld-text-input"
              placeholder="Operator Stealth Name / Passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              autoComplete="username"
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="ld-text-input"
                style={{ flex: 1 }}
                placeholder="Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="subbar-util-btn"
                style={{ height: '34px', padding: '0 10px' }}
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type={showE2eeSecret ? 'text' : 'password'}
                className="ld-text-input"
                style={{ flex: 1 }}
                placeholder="Optional E2EE Secret (PBKDF2 AES-GCM)"
                value={e2eeSecret}
                onChange={(e) => setE2eeSecret(e.target.value)}
              />
              <button
                type="button"
                className="subbar-util-btn"
                style={{ height: '34px', padding: '0 10px' }}
                onClick={() => setShowE2eeSecret(!showE2eeSecret)}
                title={showE2eeSecret ? 'Hide E2EE Secret' : 'Show E2EE Secret'}
              >
                <Icon name={showE2eeSecret ? 'eyeOff' : 'lock'} />
              </button>
            </div>
          </div>

          <button
            type="button"
            className="neon-cta-btn"
            style={{ width: '100%', justifyContent: 'center', height: '38px' }}
            onClick={handleWebAuthnLogin}
            disabled={isWebAuthnLoading}
          >
            <Icon name="fingerprint" />
            <span>{isWebAuthnLoading ? 'AUTHENTICATING PASSKEY...' : 'LOGIN WITH FACEID / TOUCHID PASSKEY'}</span>
          </button>

          {webAuthnError && (
            <div style={{ color: '#f87171', fontSize: '11.5px', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
              {webAuthnError}
            </div>
          )}

          <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.16em' }}>
            OR ENTER 6-DIGIT HARDWARE / TOTP PIN
          </div>

          <div className="pin-dots-row">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
            ))}
          </div>

          {authError && <div className="auth-error">{authError}</div>}

          <div className="totp-keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button key={num} type="button" className="totp-key" onClick={() => onPinInput(num)}>
                {num}
              </button>
            ))}
            <button type="button" className="totp-key" onClick={onPasteClick} title="Paste 6-digit TOTP code">
              PASTE
            </button>
            <button type="button" className="totp-key" onClick={() => onPinInput('0')}>
              0
            </button>
            <button type="button" className="totp-key" onClick={onBackspace} title="Backspace">
              ⌫
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
