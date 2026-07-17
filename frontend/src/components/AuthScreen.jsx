export default function AuthScreen({
  passphrase, setPassphrase,
  password, setPassword,
  showPassword, setShowPassword,
  pin, authError, e2eeSecret, setE2eeSecret,
  onPinInput, onBackspace, onPasteClick, onWebAuthnLogin
}) {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/aim-icon.jpg" alt="A.I.M. Logo" style={{ width: '80px', height: '80px', borderRadius: '16px', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0, 255, 170, 0.2)' }} />
          <h2>A.I.M. SECURE</h2>
          <p>Enter Name, Password & Authenticator Code</p>
        </div>
        
        <div style={{ marginBottom: '12px', width: '100%', padding: '0 20px', boxSizing: 'border-box' }}>
          <input 
            type="text" 
            className="modal-input" 
            style={{ width: '100%', textAlign: 'center', letterSpacing: '1px', padding: '12px' }}
            placeholder="Name"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoComplete="username"
          />
        </div>
        
        <div style={{ marginBottom: '20px', width: '100%', padding: '0 20px', boxSizing: 'border-box', position: 'relative' }}>
          <input 
            type={showPassword ? "text" : "password"} 
            className="modal-input" 
            style={{ width: '100%', textAlign: 'center', letterSpacing: '2px', padding: '12px' }}
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button 
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '30px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px'
            }}
          >
            {showPassword ? '🫣' : '👁️'}
          </button>
        </div>

        <div style={{ marginBottom: '20px', width: '100%', padding: '0 20px', boxSizing: 'border-box' }}>
          <input 
            type="password" 
            className="modal-input" 
            style={{ width: '100%', textAlign: 'center', letterSpacing: '1px', padding: '12px', background: '#0f172a', borderColor: '#334155' }}
            placeholder="E2EE Secret (Optional)"
            value={e2eeSecret}
            onChange={(e) => setE2eeSecret(e.target.value)}
          />
        </div>

        <div className="pin-display">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`}></div>
          ))}
        </div>
        
        {authError && <div className="auth-error">{authError}</div>}

        <div className="keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} className="key" onClick={() => onPinInput(num.toString())}>
              {num}
            </button>
          ))}
          <button className="key action" style={{ fontSize: '24px' }} onClick={onPasteClick}>📋</button>
          <button className="key" onClick={() => onPinInput('0')}>0</button>
          <button className="key action" onClick={onBackspace}>⌫</button>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: '10px', right: '10px', color: '#64748b', fontSize: '10px', zIndex: 10 }}>v1.1.0</div>
    </div>
  );
}
