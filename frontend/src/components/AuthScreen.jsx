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
}) {
  const [webAuthnError, setWebAuthnError] = useState('');
  const [isWebAuthnLoading, setIsWebAuthnLoading] = useState(false);
  const [showE2eeSecret, setShowE2eeSecret] = useState(false);

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
        onWebAuthnLogin(result.token, e2eeSecret);
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
            <span className="pulse-led" title="Zero-Trust 3FA Gate Active" />
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
