import { useState } from 'react';
import { registerWebAuthn } from '../webauthn';

export default function SettingsModal({ 
  onClose, 
  autoCaps, setAutoCaps,
  keyboardMode, setKeyboardMode,
  theme, setTheme,
  keyboardFeedback, setKeyboardFeedback,
  alertChime, setAlertChime,
  termFontSize, setTermFontSize,
  termTheme, setTermTheme,
  voiceAutoRead, setVoiceAutoRead,
  ttsVoice, setTtsVoice,
  onPreviewVoice,
  voiceContinuous, setVoiceContinuous,
  voiceAutoEnter, setVoiceAutoEnter,
  voiceAutoSend, setVoiceAutoSend,
  voiceAutoExecute, setVoiceAutoExecute,
  voiceAutoCapitalize, setVoiceAutoCapitalize,
  voiceSlashes, setVoiceSlashes,
  apiToken,
  e2eeSecret, setE2eeSecret
}) {
  const [registerStatus, setRegisterStatus] = useState('');
  const [showE2eeSecret, setShowE2eeSecret] = useState(false);
  const [e2eeStatus, setE2eeStatus] = useState('');

  // Local buffered state
  const [localAutoCaps, setLocalAutoCaps] = useState(autoCaps);
  const [localKeyboardMode, setLocalKeyboardMode] = useState(keyboardMode);
  const [localTheme, setLocalTheme] = useState(theme);
  const [localKeyboardFeedback, setLocalKeyboardFeedback] = useState(keyboardFeedback);
  const [localAlertChime, setLocalAlertChime] = useState(alertChime ?? true);
  const [localTermFontSize, setLocalTermFontSize] = useState(termFontSize);
  const [localTermTheme, setLocalTermTheme] = useState(termTheme);
  const [localVoiceAutoRead, setLocalVoiceAutoRead] = useState(voiceAutoRead ?? false);
  const [localTtsVoice, setLocalTtsVoice] = useState(ttsVoice || 'piper:en_GB-alan-medium');
  const [localVoiceContinuous, setLocalVoiceContinuous] = useState(voiceContinuous);
  const [localVoiceAutoEnter, setLocalVoiceAutoEnter] = useState(voiceAutoEnter);
  const [localVoiceAutoSend, setLocalVoiceAutoSend] = useState(voiceAutoSend);
  const [localVoiceAutoExecute, setLocalVoiceAutoExecute] = useState(voiceAutoExecute);
  const [localVoiceAutoCapitalize, setLocalVoiceAutoCapitalize] = useState(voiceAutoCapitalize);
  const [localVoiceSlashes, setLocalVoiceSlashes] = useState(voiceSlashes);
  const [localE2eeSecret, setLocalE2eeSecret] = useState(e2eeSecret);

  const handleSave = () => {
    setAutoCaps(localAutoCaps);
    localStorage.setItem('aim-kb-autocaps', JSON.stringify(localAutoCaps));
    setKeyboardMode(localKeyboardMode);
    localStorage.setItem('aim-kb-mode', localKeyboardMode);
    setTheme(localTheme);
    setKeyboardFeedback(localKeyboardFeedback);
    localStorage.setItem('aim-kb-feedback', localKeyboardFeedback);
    if (setAlertChime) {
      setAlertChime(localAlertChime);
      localStorage.setItem('aim-alert-chime', JSON.stringify(localAlertChime));
    }
    setTermFontSize(localTermFontSize);
    localStorage.setItem('aim-term-fontsize', localTermFontSize);
    setTermTheme(localTermTheme);
    localStorage.setItem('aim-term-theme', localTermTheme);
    if (setVoiceAutoRead) {
      setVoiceAutoRead(localVoiceAutoRead);
      localStorage.setItem('aim-voice-autoread', JSON.stringify(localVoiceAutoRead));
    }
    if (setTtsVoice) {
      setTtsVoice(localTtsVoice);
      localStorage.setItem('aim-voice-tts-voice', localTtsVoice);
    }
    setVoiceContinuous(localVoiceContinuous);
    localStorage.setItem('aim-voice-continuous', JSON.stringify(localVoiceContinuous));
    setVoiceAutoEnter(localVoiceAutoEnter);
    localStorage.setItem('aim-voice-enter', JSON.stringify(localVoiceAutoEnter));
    setVoiceAutoSend(localVoiceAutoSend);
    localStorage.setItem('aim-voice-send', JSON.stringify(localVoiceAutoSend));
    setVoiceAutoExecute(localVoiceAutoExecute);
    localStorage.setItem('aim-voice-execute', JSON.stringify(localVoiceAutoExecute));
    setVoiceAutoCapitalize(localVoiceAutoCapitalize);
    localStorage.setItem('aim-voice-autocap', JSON.stringify(localVoiceAutoCapitalize));
    setVoiceSlashes(localVoiceSlashes);
    localStorage.setItem('aim-voice-slashes', JSON.stringify(localVoiceSlashes));
    
    // Check if E2EE secret changed
    if (localE2eeSecret !== e2eeSecret) {
      setE2eeSecret(localE2eeSecret);
      handleApplyE2ee(localE2eeSecret);
    } else {
      onClose();
    }
  };

  const handleApplyE2ee = async (secretToApply) => {
    try {
      setE2eeStatus('Updating backend...');
      const res = await fetch('/api/settings/e2ee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({ secret: secretToApply })
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
            checked={localAutoCaps} 
            onChange={e => setLocalAutoCaps(e.target.checked)}
            style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
          />
          <label style={{color: '#e2e8f0', margin: 0}}>Auto-Capitalization</label>
        </div>
        <div style={{marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px'}}>
          <input 
            type="checkbox" 
            checked={localAlertChime} 
            onChange={e => setLocalAlertChime(e.target.checked)}
            style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
          />
          <label style={{color: '#e2e8f0', margin: 0}}>🔔 Agent Alert Chime (Needs Input / Turn Complete)</label>
        </div>
        <div style={{marginBottom: '16px'}}>
          <label style={{display: 'block', marginBottom: '8px', color: '#e2e8f0'}}>Keyboard Layout</label>
          <select 
            className="modal-input" 
            value={localKeyboardMode}
            onChange={e => setLocalKeyboardMode(e.target.value)}
          >
            <option value="standard">Standard (Alpha)</option>
            <option value="hacker">Hacker (Terminal Keys)</option>
          </select>
        </div>
        <div style={{marginBottom: '16px'}}>
          <label style={{display: 'block', marginBottom: '8px', color: '#e2e8f0'}}>Theme</label>
          <select 
            className="modal-input" 
            value={localTheme}
            onChange={e => setLocalTheme(e.target.value)}
          >
            <option value="dark">Dark</option>
            <option value="light">Light (Coming Soon)</option>
          </select>
        </div>
        <div style={{marginBottom: '16px'}}>
          <label style={{display: 'block', marginBottom: '8px', color: '#e2e8f0'}}>Keyboard Feedback</label>
          <select 
            className="modal-input" 
            value={localKeyboardFeedback}
            onChange={e => setLocalKeyboardFeedback(e.target.value)}
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
              <span>{localTermFontSize}px</span>
            </label>
            <input 
              type="range" 
              min="10" max="24" 
              value={localTermFontSize}
              onChange={e => setLocalTermFontSize(parseInt(e.target.value, 10))}
              style={{width: '100%'}}
            />
          </div>
          <div style={{marginBottom: '12px'}}>
            <label style={{display: 'block', marginBottom: '8px', color: '#e2e8f0'}}>Terminal Theme</label>
            <select 
              className="modal-input" 
              value={localTermTheme}
              onChange={e => setLocalTermTheme(e.target.value)}
            >
              <option value="standard">Standard Dark</option>
              <option value="high-contrast">High Contrast (B&W)</option>
              <option value="hacker">Hacker Green</option>
            </select>
          </div>
        </div>
        <div style={{marginBottom: '16px', borderTop: '1px solid #1c305c', paddingTop: '16px'}}>
          <label style={{display: 'block', marginBottom: '4px', color: '#e2e8f0', fontWeight: 'bold'}}>Voice & Speech Settings</label>
          <div style={{fontSize: '12px', color: '#94a3b8', marginBottom: '12px'}}>Voice uses the browser Speech API (Chrome/Edge recommended; Brave often unsupported).</div>

          <div style={{marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px'}}>
            <input 
              type="checkbox" 
              checked={localVoiceAutoRead} 
              onChange={e => setLocalVoiceAutoRead(e.target.checked)}
              style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
            />
            <label style={{color: '#e2e8f0', margin: 0}}>🔊 Auto-Playback Agent Spoken Summary (🔊 Line)</label>
          </div>

          <div style={{marginBottom: '12px'}}>
            <label style={{display: 'block', marginBottom: '6px', color: '#e2e8f0'}}>TTS Voice & Engine (Offline Piper / Cloud Edge)</label>
            <div style={{display: 'flex', gap: '8px'}}>
              <select
                className="modal-input"
                style={{ flex: 1, marginBottom: 0 }}
                value={localTtsVoice}
                onChange={e => setLocalTtsVoice(e.target.value)}
              >
                <option value="piper:en_GB-alan-medium">⚡ Offline Piper — Alan (UK J.O.S.H.U.A. / JARVIS)</option>
                <option value="piper:en_US-ryan-medium">⚡ Offline Piper — Ryan (US Male)</option>
                <option value="piper:en_US-lessac-medium">⚡ Offline Piper — Lessac (US Female)</option>
                <option value="edge:en-GB-RyanNeural">☁️ Edge Neural — Ryan (UK J.O.S.H.U.A. / JARVIS)</option>
                <option value="edge:en-US-BrianNeural">☁️ Edge Neural — Brian (US Male)</option>
                <option value="edge:en-US-AndrewNeural">☁️ Edge Neural — Andrew (US Warm Male)</option>
                <option value="edge:en-US-AvaNeural">☁️ Edge Neural — Ava (US Female)</option>
                <option value="browser:default">🌐 Browser Native Speech API</option>
              </select>
              <button
                type="button"
                className="macro-btn action"
                onClick={() => onPreviewVoice?.(localTtsVoice)}
                title="Preview selected TTS voice"
                style={{ whiteSpace: 'nowrap', padding: '0 12px' }}
              >
                ▶️ Test
              </button>
            </div>
          </div>
          
          <div style={{marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px'}}>
            <input 
              type="checkbox" 
              checked={localVoiceContinuous} 
              onChange={e => setLocalVoiceContinuous(e.target.checked)}
              style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
            />
            <label style={{color: '#e2e8f0', margin: 0}}>Continuous Loop (Causes Android Beeps)</label>
          </div>

          <div style={{marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px'}}>
            <input 
              type="checkbox" 
              checked={localVoiceAutoEnter} 
              onChange={e => setLocalVoiceAutoEnter(e.target.checked)}
              style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
            />
            <label style={{color: '#e2e8f0', margin: 0}}>Verbal Command: "Enter"</label>
          </div>

          <div style={{marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px'}}>
            <input 
              type="checkbox" 
              checked={localVoiceAutoSend} 
              onChange={e => setLocalVoiceAutoSend(e.target.checked)}
              style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
            />
            <label style={{color: '#e2e8f0', margin: 0}}>Verbal Command: "Send"</label>
          </div>

          <div style={{marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px'}}>
            <input 
              type="checkbox" 
              checked={localVoiceAutoExecute} 
              onChange={e => setLocalVoiceAutoExecute(e.target.checked)}
              style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
            />
            <label style={{color: '#e2e8f0', margin: 0}}>Verbal Command: "Execute"</label>
          </div>

          <div style={{marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px'}}>
            <input 
              type="checkbox" 
              checked={localVoiceAutoCapitalize} 
              onChange={e => setLocalVoiceAutoCapitalize(e.target.checked)}
              style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
            />
            <label style={{color: '#e2e8f0', margin: 0}}>Auto Capitalize Sentences</label>
          </div>

          <div style={{marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px'}}>
            <input 
              type="checkbox" 
              checked={localVoiceSlashes} 
              onChange={e => setLocalVoiceSlashes(e.target.checked)}
              style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
            />
            <label style={{color: '#e2e8f0', margin: 0}}>Verbal Slashes (/ \)</label>
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
                style={{ paddingRight: '40px' }}
                placeholder="Leave blank for plaintext"
                value={localE2eeSecret}
                onChange={e => setLocalE2eeSecret(e.target.value)}
              />
              <button 
                onClick={() => setShowE2eeSecret(!showE2eeSecret)}
                style={{
                  position: 'absolute',
                  right: '10px',
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
            </div>
            <p style={{fontSize: '12px', color: '#94a3b8', marginTop: '4px'}}>
              {e2eeStatus || "If changed, the app will auto-reload to sync with the backend."}
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
          <button className="macro-btn" onClick={onClose} style={{background: '#334155'}}>Cancel</button>
          <button className="macro-btn action" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
