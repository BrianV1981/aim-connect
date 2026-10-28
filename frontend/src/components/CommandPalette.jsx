import { useEffect, useMemo, useRef, useState } from 'react';

function fuzzyMatch(query, text) {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = (text || '').toLowerCase();
  if (t.includes(q)) return true;
  // Subsequence match
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export default function CommandPalette({
  isOpen,
  onClose,
  sessions = [],
  fleet = [],
  activeSession = '',
  macroLibrary = [],
  onSelectSession,
  onCreateSession,
  onKillSession,
  onSendSessionCommand,
  onSendRawCommand,
  onToggleFiles,
  onToggleFleetSidebar,
  onOpenTokenGrabber,
  onOpenForensics,
  onEnterScrollMode,
  onOpenSearch,
  onToggleKeyboard,
  onToggleVoice,
  onSpeakSummary,
  onToggleVoiceAutoRead,
  onOpenSettings,
  onOpenIntegrations,
  onSetTermTheme,
  onChangeFontSize,
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const commands = useMemo(() => {
    const items = [];
    const fleetByName = new Map();
    fleet.forEach((f) => {
      if (f && f.session_name) fleetByName.set(f.session_name, f);
    });

    // 1. SESSIONS
    sessions.forEach((s) => {
      const meta = fleetByName.get(s);
      const badge = meta
        ? `${(meta.vessel || 'sh').toUpperCase()}${meta.branch ? ` • ${meta.branch}` : ''}${
            meta.tokens_used > 0 ? ` • ${meta.context_pct}% ctx` : ''
          }`
        : 'Session';
      items.push({
        id: `session:${s}`,
        category: 'SESSIONS',
        label: `Switch to ${s}`,
        keywords: `${s} ${meta?.vessel || ''} ${meta?.branch || ''} session switch`,
        badge: s === activeSession ? `ACTIVE • ${badge}` : badge,
        action: () => onSelectSession?.(s),
      });
    });

    items.push({
      id: 'session:create',
      category: 'SESSIONS',
      label: '➕ Spawn New Tmux Session...',
      keywords: 'new create spawn session tmux',
      badge: 'Session',
      action: () => onCreateSession?.(),
    });

    if (activeSession) {
      items.push({
        id: 'session:kill',
        category: 'SESSIONS',
        label: `🗑️ Terminate Session (${activeSession})`,
        keywords: 'kill delete terminate session close',
        badge: 'Danger',
        action: () => onKillSession?.(),
      });
    }

    // 2. JOSHUA ACTIONS
    if (activeSession) {
      items.push({
        id: 'joshua:wiki',
        category: 'JOSHUA ACTIONS',
        label: `🧠 Inject /aim-memory-wiki into ${activeSession}`,
        keywords: 'wiki memory ingest checkpoint joshua skill',
        badge: '30% Rule',
        action: () => onSendSessionCommand?.(activeSession, '/aim-memory-wiki'),
      });
      items.push({
        id: 'joshua:handoff',
        category: 'JOSHUA ACTIONS',
        label: `🤝 Inject /aim-handoff into ${activeSession}`,
        keywords: 'handoff baton pass relay amnesia joshua skill',
        badge: '30% Rule',
        action: () => onSendSessionCommand?.(activeSession, '/aim-handoff'),
      });
      items.push({
        id: 'joshua:board',
        category: 'JOSHUA ACTIONS',
        label: `📊 Run ./aim projects board in ${activeSession}`,
        keywords: 'projects board kanban github issues',
        badge: 'GitOps',
        action: () => onSendSessionCommand?.(activeSession, './aim projects board'),
      });
    }

    items.push({
      id: 'joshua:token-grabber',
      category: 'JOSHUA ACTIONS',
      label: '🔗 Open Scrollback Token & URL Grabber',
      keywords: 'token url path ip sha grabber copy extract scrollback',
      badge: 'Grabber',
      action: () => onOpenTokenGrabber?.(),
    });

    items.push({
      id: 'joshua:forensics',
      category: 'JOSHUA ACTIONS',
      label: '🔬 Open Forensic Tool Inspector, SQLite FTS5 Search & Swarm Feed',
      keywords: 'forensics tool call fts5 search lancedb swarm aim-communicate',
      badge: 'Forensics',
      action: () => onOpenForensics?.(),
    });

    items.push({
      id: 'joshua:toggle-fleet',
      category: 'JOSHUA ACTIONS',
      label: '🧭 Toggle Multi-Session Fleet Sidebar',
      keywords: 'fleet sidebar sessions toggle drawer',
      badge: 'Layout',
      action: () => onToggleFleetSidebar?.(),
    });

    // 3. BRAIN & FILES
    items.push({
      id: 'files:toggle',
      category: 'BRAIN & FILES',
      label: '📁 Toggle File Explorer / Terminal View',
      keywords: 'files explorer editor monaco handoff memory wiki',
      badge: 'Workspace',
      action: () => onToggleFiles?.(),
    });
    items.push({
      id: 'files:scrollback',
      category: 'BRAIN & FILES',
      label: '🔍 Open Native Scroll / Copy Overlay',
      keywords: 'scroll copy history ansi overlay',
      badge: 'Scrollback',
      action: () => onEnterScrollMode?.(),
    });
    items.push({
      id: 'files:find',
      category: 'BRAIN & FILES',
      label: '🔎 Find Text in Active Terminal',
      keywords: 'find search terminal xterm',
      badge: 'Search',
      action: () => onOpenSearch?.(),
    });

    // 4. MACROS
    macroLibrary.forEach((m) => {
      items.push({
        id: `macro:${m.id}`,
        category: 'MACROS',
        label: `⚡ Run Macro: ${m.label}`,
        keywords: `macro ${m.label} ${m.voiceTrigger || ''}`,
        badge: m.isServer ? '☁️ Server Macro' : '📱 Local Macro',
        action: () => onSendRawCommand?.(m.cmd),
      });
    });

    // 5. LAYOUT & THEME
    items.push(
      {
        id: 'theme:standard',
        category: 'LAYOUT & THEME',
        label: '🎨 Terminal Theme: Standard Navy',
        keywords: 'theme standard navy dark',
        badge: 'Theme',
        action: () => onSetTermTheme?.('standard'),
      },
      {
        id: 'theme:hacker',
        category: 'LAYOUT & THEME',
        label: '🎨 Terminal Theme: Hacker Matrix Green',
        keywords: 'theme hacker matrix green',
        badge: 'Theme',
        action: () => onSetTermTheme?.('hacker'),
      },
      {
        id: 'theme:contrast',
        category: 'LAYOUT & THEME',
        label: '🎨 Terminal Theme: High Contrast',
        keywords: 'theme high contrast white',
        badge: 'Theme',
        action: () => onSetTermTheme?.('high-contrast'),
      },
      {
        id: 'font:inc',
        category: 'LAYOUT & THEME',
        label: '🔤 Increase Terminal Font Size (+2px)',
        keywords: 'font size zoom in bigger',
        badge: 'Font',
        action: () => onChangeFontSize?.(2),
      },
      {
        id: 'font:dec',
        category: 'LAYOUT & THEME',
        label: '🔡 Decrease Terminal Font Size (-2px)',
        keywords: 'font size zoom out smaller',
        badge: 'Font',
        action: () => onChangeFontSize?.(-2),
      },
      {
        id: 'ui:keyboard',
        category: 'LAYOUT & THEME',
        label: '⌨️ Toggle Sovereign On-Screen Keyboard',
        keywords: 'keyboard mobile touch keys',
        badge: 'Input',
        action: () => onToggleKeyboard?.(),
      },
      {
        id: 'ui:voice',
        category: 'LAYOUT & THEME',
        label: '🎤 Toggle Voice Dictation',
        keywords: 'voice dictation speech microphone',
        badge: 'Voice',
        action: () => onToggleVoice?.(),
      },
      {
        id: 'ui:speak',
        category: 'LAYOUT & THEME',
        label: '🔊 Speak Latest Agent Summary',
        keywords: 'speak readback tts voice summary speaker',
        badge: 'TTS',
        action: () => onSpeakSummary?.(),
      },
      {
        id: 'ui:voice-autoread',
        category: 'LAYOUT & THEME',
        label: '🗣️ Toggle Voice Auto-Playback',
        keywords: 'voice auto playback readback tts spoken summary',
        badge: 'TTS',
        action: () => onToggleVoiceAutoRead?.(),
      },
      {
        id: 'ui:integrations',
        category: 'LAYOUT & THEME',
        label: '🔌 Open Integrations Vault',
        keywords: 'integrations vault api keys secrets',
        badge: 'Vault',
        action: () => onOpenIntegrations?.(),
      },
      {
        id: 'ui:settings',
        category: 'LAYOUT & THEME',
        label: '⚙️ Open Settings Modal',
        keywords: 'settings preferences e2ee',
        badge: 'Config',
        action: () => onOpenSettings?.(),
      }
    );

    return items;
  }, [
    sessions,
    fleet,
    activeSession,
    macroLibrary,
    onSelectSession,
    onCreateSession,
    onKillSession,
    onSendSessionCommand,
    onSendRawCommand,
    onToggleFiles,
    onToggleFleetSidebar,
    onOpenTokenGrabber,
    onEnterScrollMode,
    onOpenSearch,
    onToggleKeyboard,
    onToggleVoice,
    onOpenSettings,
    onOpenIntegrations,
    onSetTermTheme,
    onChangeFontSize,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return commands;
    return commands.filter((cmd) =>
      fuzzyMatch(q, `${cmd.category} ${cmd.label} ${cmd.keywords || ''} ${cmd.badge || ''}`)
    );
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeItem = (item) => {
    if (!item) return;
    onClose?.();
    item.action?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        executeItem(filtered[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay command-palette-overlay" onClick={onClose}>
      <div
        className="modal-card command-palette-card"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="command-palette-search-row">
          <span style={{ fontSize: '16px', color: '#60a5fa' }}>⌘</span>
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Type a command, session name, /wiki, /handoff, or macro..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="command-palette-kbd">ESC</span>
        </div>

        <div className="command-palette-list" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="fleet-empty-state">No matching commands</div>
          ) : (
            filtered.map((item, idx) => {
              const prevCategory = idx > 0 ? filtered[idx - 1].category : null;
              const showCategoryHeader = item.category !== prevCategory;
              const isSelected = idx === selectedIndex;

              return (
                <div key={item.id}>
                  {showCategoryHeader && (
                    <div className="command-palette-category">{item.category}</div>
                  )}
                  <div
                    className={`command-palette-item ${isSelected ? 'selected' : ''}`}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => executeItem(item)}
                  >
                    <span className="command-palette-label">{item.label}</span>
                    {item.badge && <span className="command-palette-badge">{item.badge}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="command-palette-footer">
          <span>↑↓ Navigate</span>
          <span>↵ Execute</span>
          <span>⌘K / Ctrl+K Toggle</span>
        </div>
      </div>
    </div>
  );
}
