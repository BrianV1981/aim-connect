import { useState } from 'react';
import { registerWebAuthn } from '../webauthn';

export default function SettingsModal({ 
  onClose, 
  autoCaps, setAutoCaps,
  keyboardMode, setKeyboardMode,
  theme, setTheme,
  keyboardFeedback, setKeyboardFeedback,
  termFontSize, setTermFontSize,
  termTheme, setTermTheme,
  voiceContinuous, setVoiceContinuous,
  voiceAutoEnter, setVoiceAutoEnter,
  voiceAutoSend, setVoiceAutoSend,
  voiceAutoExecute, setVoiceAutoExecute,
  apiToken,
  e2eeSecret, setE2eeSecret
}) {
  const [registerStatus, setRegisterStatus] = useState('');
  const [showE2eeSecret, setShowE2eeSecret] = useState(false);
  const [e2eeStatus, setE2eeStatus] = useState('');

  const handleApplyE2ee = async () => {
    try {
      setE2eeStatus('Updating backend...');
      const res = await fetch('/api/settings/e2ee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({ secret: e2eeSecret })
      });
      if (res.ok) {
        setE2eeStatus('Success! Reloading...');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setE2eeStatus('Failed to update backend');
      }
    } catch(e) {
      setE2eeStatus('Error updating backend');
    }
  };

  const handleRegister = async () => {
    try {
      setRegisterStatus('Registering...');
      const result = await registerWebAuthn(apiToken);
      if (result.success) {
        setRegisterStatus('Registered Successfully! You can now use FaceID/TouchID to log in.');
      } else {
        setRegisterStatus(`Registration failed: ${result.error}`);
      }
    } catch (e) {
      setRegisterStatus('Error: ' + e.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h3 style={{color: '#c83803', marginBottom: '16px'}}>Settings</h3>
        <div style={{marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px'}}>
          <input 
            type="checkbox" 
            checked={autoCaps} 
            onChange={e => {
              setAutoCaps(e.target.checked);
              localStorage.setItem('aim-kb-autocaps', JSON.stringify(e.target.checked));
            }}
            style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
          />
          <label style={{color: '#e2e8f0', margin: 0}}>Auto-Capitalization</label>
        </div>
        <div style={{marginBottom: '16px'}}>
          <label style={{display: 'block', marginBottom: '8px', color: '#e2e8f0'}}>Keyboard Layout</label>
          <select 
            className="modal-input" 
            value={keyboardMode}
            onChange={e => {
              setKeyboardMode(e.target.value);
              localStorage.setItem('aim-kb-mode', e.target.value);
            }}
          >
            <option value="standard">Standard (Alpha)</option>
            <option value="hacker">Hacker (Terminal Keys)</option>
          </select>
        </div>
        <div style={{marginBottom: '16px'}}>
          <label style={{display: 'block', marginBottom: '8px', color: '#e2e8f0'}}>Theme</label>
          <select 
            className="modal-input" 
            value={theme}
            onChange={e => setTheme(e.target.value)}
          >
            <option value="dark">Dark</option>
            <option value="light">Light (Coming Soon)</option>
          </select>
        </div>
        <div style={{marginBottom: '16px'}}>
          <label style={{display: 'block', marginBottom: '8px', color: '#e2e8f0'}}>Keyboard Feedback</label>
          <select 
            className="modal-input" 
            value={keyboardFeedback}
            onChange={e => {
              setKeyboardFeedback(e.target.value);
              localStorage.setItem('aim-kb-feedback', e.target.value);
            }}
          >
            <option value="audio">Audio (Ticks)</option>
            <option value="haptic">Haptic (Vibration)</option>
            <option value="off">Off (Silent)</option>
          </select>
        </div>
        <div style={{marginBottom: '16px', borderTop: '1px solid #1c305c', paddingTop: '16px'}}>
          <label style={{display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: 'bold'}}>Terminal Settings</label>
          <div style={{marginBottom: '12px'}}>
            <label style={{display: 'flex', justifyContent: 'space-between', color: '#e2e8f0', marginBottom: '4px'}}>
              <span>Font Size</span>
              <span>{termFontSize}px</span>
            </label>
            <input 
              type="range" 
              min="10" max="24" 
              value={termFontSize}
              onChange={e => {
                const val = parseInt(e.target.value, 10);
                setTermFontSize(val);
                localStorage.setItem('aim-term-fontsize', val);
              }}
              style={{width: '100%'}}
            />
          </div>
          <div style={{marginBottom: '12px'}}>
            <label style={{display: 'block', marginBottom: '8px', color: '#e2e8f0'}}>Terminal Theme</label>
            <select 
              className="modal-input" 
              value={termTheme}
              onChange={e => {
                setTermTheme(e.target.value);
                localStorage.setItem('aim-term-theme', e.target.value);
              }}
            >
              <option value="standard">Standard Dark</option>
              <option value="high-contrast">High Contrast (B&W)</option>
              <option value="hacker">Hacker Green</option>
            </select>
          </div>
        </div>
        <div style={{marginBottom: '16px', borderTop: '1px solid #1c305c', paddingTop: '16px'}}>
          <label style={{display: 'block', marginBottom: '12px', color: '#e2e8f0', fontWeight: 'bold'}}>Voice Dictation Settings</label>
          
          <div style={{marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px'}}>
            <input 
              type="checkbox" 
              checked={voiceContinuous} 
              onChange={e => {
                setVoiceContinuous(e.target.checked);
                localStorage.setItem('aim-voice-continuous', JSON.stringify(e.target.checked));
              }}
              style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
            />
            <label style={{color: '#e2e8f0', margin: 0}}>Continuous Loop (Causes Android Beeps)</label>
          </div>

          <div style={{marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px'}}>
            <input 
              type="checkbox" 
              checked={voiceAutoEnter} 
              onChange={e => {
                setVoiceAutoEnter(e.target.checked);
                localStorage.setItem('aim-voice-enter', JSON.stringify(e.target.checked));
              }}
              style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
            />
            <label style={{color: '#e2e8f0', margin: 0}}>Verbal Command: "Enter"</label>
          </div>

          <div style={{marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px'}}>
            <input 
              type="checkbox" 
              checked={voiceAutoSend} 
              onChange={e => {
                setVoiceAutoSend(e.target.checked);
                localStorage.setItem('aim-voice-send', JSON.stringify(e.target.checked));
              }}
              style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
            />
            <label style={{color: '#e2e8f0', margin: 0}}>Verbal Command: "Send"</label>
          </div>

          <div style={{marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px'}}>
            <input 
              type="checkbox" 
              checked={voiceAutoExecute} 
              onChange={e => {
                setVoiceAutoExecute(e.target.checked);
                localStorage.setItem('aim-voice-execute', JSON.stringify(e.target.checked));
              }}
              style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
            />
            <label style={{color: '#e2e8f0', margin: 0}}>Verbal Command: "Execute"</label>
          </div>
        </div>

        <div style={{marginBottom: '16px', borderTop: '1px solid #1c305c', paddingTop: '16px'}}>
          <label style={{display: 'block', marginBottom: '8px', color: '#e2e8f0', fontWeight: 'bold'}}>End-to-End Encryption</label>
          <div style={{marginBottom: '12px'}}>
            <label style={{display: 'block', marginBottom: '8px', color: '#e2e8f0'}}>E2EE Secret Phrase</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showE2eeSecret ? "text" : "password"} 
                className="modal-input" 
                style={{ paddingRight: '120px' }}
                placeholder="Leave blank for plaintext"
                value={e2eeSecret}
                onChange={e => setE2eeSecret(e.target.value)}
              />
              <button 
                onClick={() => setShowE2eeSecret(!showE2eeSecret)}
                style={{
                  position: 'absolute',
                  right: '90px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                {showE2eeSecret ? '👁️' : '🙈'}
              </button>
              <button 
                onClick={handleApplyE2ee}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Apply
              </button>
            </div>
            <p style={{fontSize: '12px', color: '#94a3b8', marginTop: '4px'}}>
              {e2eeStatus || "Syncs the new encryption phrase to the server and reloads."}
            </p>
          </div>
        </div>

        <div style={{marginBottom: '24px', padding: '16px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155'}}>
          <h4 style={{marginTop: 0, color: '#e2e8f0', marginBottom: '12px'}}>Biometrics</h4>
          <button 
            onClick={handleRegister}
            style={{
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              width: '100%'
            }}
          >
            Register FaceID / TouchID
          </button>
          {registerStatus && (
            <p style={{ color: registerStatus.includes('Error') || registerStatus.includes('failed') ? '#ef4444' : '#10b981', fontSize: '14px', marginTop: '8px', textAlign: 'center' }}>
              {registerStatus}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button className="macro-btn action" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
