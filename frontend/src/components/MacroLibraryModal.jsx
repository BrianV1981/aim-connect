import { useMemo, useRef, useState } from 'react';
import Icon from './Icons';

function formatCmdDisplay(cmd) {
  return String(cmd || '')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u0003/g, '^C')
    .replace(/\u000c/g, '^L')
    .replace(/\u0017/g, '^W')
    .replace(/\u001b/g, '\\x1b')
    .replace(/\u007f/g, '\\x7f');
}

export default function MacroLibraryModal({
  macroLibrary = [],
  onToggleMacroPin,
  onSaveMacro,
  onDeleteMacro,
  onImportMacros,
  onRunMacro,
  onClose,
  returnToVoice = false,
  onBackToVoice,
}) {
  const [filterTab, setFilterTab] = useState('all'); // all | pinned | voice | server
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMacroId, setEditingMacroId] = useState(null);
  const [label, setLabel] = useState('');
  const [cmd, setCmd] = useState('');
  const [voiceTrigger, setVoiceTrigger] = useState('');
  const [isServer, setIsServer] = useState(true);
  const fileInputRef = useRef(null);

  const counts = useMemo(
    () => ({
      all: macroLibrary.length,
      pinned: macroLibrary.filter((m) => m.isPinned).length,
      voice: macroLibrary.filter((m) => m.voiceTrigger).length,
      server: macroLibrary.filter((m) => m.isServer).length,
    }),
    [macroLibrary]
  );

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return macroLibrary.filter((m) => {
      if (filterTab === 'pinned' && !m.isPinned) return false;
      if (filterTab === 'voice' && !m.voiceTrigger) return false;
      if (filterTab === 'server' && !m.isServer) return false;
      if (q && !`${m.label} ${formatCmdDisplay(m.cmd)} ${m.voiceTrigger || ''}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [macroLibrary, filterTab, searchQuery]);

  const resetForm = () => {
    setEditingMacroId(null);
    setLabel('');
    setCmd('');
    setVoiceTrigger('');
    setIsServer(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim() || !cmd) return;
    const processedCmd = cmd.replace(/\\r/g, '\r').replace(/\\n/g, '\n');
    onSaveMacro(editingMacroId, label.trim(), processedCmd, voiceTrigger.trim(), isServer);
    resetForm();
  };

  const handleExport = () => {
    const data = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      macros: macroLibrary,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aim-macros.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        const macros = data.macros || data;
        if (!Array.isArray(macros)) {
          alert('Invalid macro file: expected an array of macros.');
          return;
        }
        const mode = window.confirm(
          `Import ${macros.length} macros.\n\nOK = Merge with existing\nCancel = Replace all`
        )
          ? 'merge'
          : 'replace';
        onImportMacros(macros, mode);
      } catch (err) {
        alert('Failed to parse macro file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card ld-mask-glass"
        style={{ width: 'min(700px, 95vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--accent)', display: 'flex' }}>
                <Icon name="zap" />
              </span>
              <span>MACRO STUDIO // ALL {counts.all} MACROS</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.14em', color: 'var(--accent)', marginTop: '3px' }}>
              TERMINAL CONTROL KEYS + GLOBAL SERVER SYNC + VOICE TRIGGERS + JSON BACKUP
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button type="button" className="subbar-util-btn" onClick={handleExport} title="Download macros.json backup">
              <Icon name="download" size={13} />
              <span>EXPORT JSON</span>
            </button>
            <button type="button" className="subbar-util-btn" onClick={() => fileInputRef.current?.click()} title="Import macros.json">
              <Icon name="upload" size={13} />
              <span>IMPORT JSON</span>
            </button>
            <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            <button type="button" className="ghost-btn" style={{ padding: '0 6px' }} onClick={onClose} aria-label="Close Macro Studio">
              <Icon name="close" />
            </button>
          </div>
        </div>

        <div className="settings-tabs-rail">
          {[
            ['all', `ALL (${counts.all})`],
            ['pinned', `PINNED (${counts.pinned})`],
            ['voice', `VOICE TRIGGERS (${counts.voice})`],
            ['server', `SERVER GLOBAL (${counts.server})`],
          ].map(([id, lbl]) => (
            <button
              key={id}
              type="button"
              className={`settings-tab-btn ${filterTab === id ? 'active' : ''}`}
              onClick={() => setFilterTab(id)}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          <form onSubmit={handleSubmit} className="settings-group-card" style={{ gap: '9px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <span className="settings-group-title">
                {editingMacroId ? 'EDIT EXISTING MACRO' : 'CREATE NEW MACRO'}
              </span>
              {editingMacroId ? (
                <button type="button" className="subbar-util-btn" onClick={resetForm}>
                  Cancel Edit
                </button>
              ) : (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                  Hint: Append \r to auto-press Enter
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
              <input
                type="text"
                className="ld-text-input"
                placeholder="Label (e.g. Handoff)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
              <input
                type="text"
                className="ld-text-input"
                placeholder="Command (e.g. /aim-handoff\r)"
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                required
              />
              <input
                type="text"
                className="ld-text-input"
                placeholder="Voice Trigger (optional)"
                value={voiceTrigger}
                onChange={(e) => setVoiceTrigger(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isServer}
                  onChange={(e) => setIsServer(e.target.checked)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span>Sync to Server (Global across devices)</span>
              </label>

              <button type="submit" className="neon-cta-btn" style={{ height: '32px' }}>
                <Icon name={editingMacroId ? 'check' : 'plus'} size={13} />
                <span>{editingMacroId ? 'UPDATE MACRO' : 'SAVE MACRO'}</span>
              </button>
            </div>
          </form>

          <input
            type="text"
            className="ld-text-input"
            placeholder="Search macros by label, ANSI sequence, or spoken voice phrase..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredList.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '8px 11px',
                  borderRadius: '9px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-hairline)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(m.isPinned)}
                    onChange={() => onToggleMacroPin(m.id)}
                    style={{ width: '15px', height: '15px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                    title="Pin / Unpin to Bolt Pad & Keybar"
                  />
                  <span className="mono-kbd" title={m.isServer ? 'Synced globally on server' : 'Saved locally on device'}>
                    {m.isServer ? 'SERVER' : 'LOCAL'}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{m.label}</strong>
                      {m.voiceTrigger && (
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9.5px',
                            padding: '1px 6px',
                            borderRadius: '999px',
                            background: 'rgba(0, 184, 255, 0.12)',
                            border: '1px solid rgba(0, 184, 255, 0.4)',
                            color: '#38bdf8',
                          }}
                        >
                          mic: &quot;{m.voiceTrigger}&quot;
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10.5px',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatCmdDisplay(m.cmd)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                  {onRunMacro && (
                    <button
                      type="button"
                      className="subbar-util-btn"
                      onClick={() => onRunMacro(m.cmd)}
                      title="Dispatch macro now"
                    >
                      <Icon name="play" size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="subbar-util-btn"
                    onClick={() => {
                      setEditingMacroId(m.id);
                      setLabel(m.label);
                      setCmd(String(m.cmd || '').replace(/\r/g, '\\r').replace(/\n/g, '\\n'));
                      setVoiceTrigger(m.voiceTrigger || '');
                      setIsServer(Boolean(m.isServer));
                    }}
                    title="Edit macro"
                  >
                    <Icon name="edit" size={12} />
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    style={{ height: '26px', padding: '0 6px', color: '#ef4444' }}
                    onClick={() => onDeleteMacro(m.id)}
                    title="Delete macro"
                  >
                    <Icon name="trash" size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)' }}>
            Tip: Right-click any chip on the Keybar to unpin instantly.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {returnToVoice && onBackToVoice && (
              <button type="button" className="subbar-util-btn active" style={{ height: '32px', padding: '0 12px' }} onClick={onBackToVoice}>
                ← BACK TO VOICE SETTINGS
              </button>
            )}
            <button type="button" className="neon-cta-btn" style={{ height: '32px', padding: '0 18px' }} onClick={onClose}>
              DONE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
