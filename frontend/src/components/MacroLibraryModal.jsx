import { useState } from 'react';

export default function MacroLibraryModal({ 
  macroLibrary, onToggleMacroPin, onSaveMacro, onDeleteMacro, onClose
}) {
  const [showMacroModal, setShowMacroModal] = useState(false);
  const [editingMacroId, setEditingMacroId] = useState(null);
  const [newMacroLabel, setNewMacroLabel] = useState('');
  const [newMacroCmd, setNewMacroCmd] = useState('');
  const [newMacroIsServer, setNewMacroIsServer] = useState(false);

  const handleSave = () => {
    if (!newMacroLabel || !newMacroCmd) return;
    const processedCmd = newMacroCmd.replace(/\\r/g, '\r').replace(/\\n/g, '\n');
    onSaveMacro(editingMacroId, newMacroLabel, processedCmd, newMacroIsServer);
    setShowMacroModal(false);
    setNewMacroLabel('');
    setNewMacroCmd('');
    setNewMacroIsServer(false);
    setEditingMacroId(null);
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: '#e2e8f0', margin: 0 }}>Macro Library</h3>
            <button className="macro-btn action add-macro" onClick={() => { setEditingMacroId(null); setNewMacroLabel(''); setNewMacroCmd(''); setNewMacroIsServer(false); setShowMacroModal(true); }}>+ New</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '60vh', overflowY: 'auto' }}>
            {macroLibrary.map(macro => (
              <div key={macro.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1c305c', padding: '8px 12px', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input 
                    type="checkbox" 
                    checked={macro.isPinned} 
                    onChange={() => onToggleMacroPin(macro.id)}
                    style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
                  />
                  <div>
                    <div style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '14px' }}>{macro.isServer ? "☁️ " : "📱 "}{macro.label}</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>{macro.cmd.replace(/\r/g, '\\r').replace(/\x0c/g, '\\x0c')}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="macro-btn" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => {
                    setEditingMacroId(macro.id);
                    setNewMacroLabel(macro.label);
                    setNewMacroCmd(macro.cmd.replace(/\r/g, '\\r').replace(/\n/g, '\\n'));
                    setNewMacroIsServer(!!macro.isServer);
                    setShowMacroModal(true);
                  }}>✏️</button>
                  <button className="macro-btn" style={{ padding: '4px 8px', fontSize: '12px', color: '#f87171' }} onClick={() => onDeleteMacro(macro.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button className="macro-btn action" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>

      {showMacroModal && (
        <div className="modal-overlay" onClick={() => setShowMacroModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#e2e8f0', marginBottom: '16px' }}>{editingMacroId ? 'Edit Macro' : 'Add Custom Macro'}</h3>
            <input 
              className="modal-input" 
              placeholder="Button Label (e.g. logs)" 
              value={newMacroLabel} 
              onChange={e => setNewMacroLabel(e.target.value)} 
            />
            <input 
              className="modal-input" 
              placeholder="Bash Command (e.g. pm2 logs\r)" 
              value={newMacroCmd} 
              onChange={e => setNewMacroCmd(e.target.value)} 
            />
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '12px' }}>
              Hint: Add \r to the end to auto-press Enter.
            </p>
            <div style={{marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px'}}>
              <input 
                type="checkbox" 
                checked={newMacroIsServer} 
                onChange={e => setNewMacroIsServer(e.target.checked)}
                style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }}
              />
              <label style={{color: '#e2e8f0', margin: 0}}>☁️ Sync to Server (Global)</label>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="macro-btn" onClick={() => setShowMacroModal(false)}>Cancel</button>
              <button className="macro-btn action" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
