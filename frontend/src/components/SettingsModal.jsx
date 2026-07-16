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
  voiceAutoExecute, setVoiceAutoExecute
}) {
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

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button className="macro-btn action" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
