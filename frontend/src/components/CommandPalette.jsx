import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icons';

function fuzzyMatch(query, text) {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = (text || '').toLowerCase();
  if (t.includes(q)) return true;
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
  onOpenRepoLauncher,
  onFastResumeSession,
  onSaveWorkspaceState,
  onRestoreWorkspaceState,
  resurrectGate = { disabled: false, title: '' },
  onKillSession,
  onSendSessionCommand,
  onSendRawCommand,
  onToggleFiles,
  onToggleBrowser,
  onToggleFleetSidebar,
  onOpenTokenGrabber,
  onOpenForensics,
  onOpenHistory,
  onToggleChatMode,
  onEnterScrollMode,
  onOpenSearch,
  onToggleKeyboard,
  onToggleVoice,
  onSpeakSummary,
  onToggleVoiceAutoRead,
  onOpenSettings,
  onOpenTmuxSettings,
  onOpenIntegrations,
  onRefreshApp,
  appUpdateAvailable = false,
  serverDirectory = [],
  onSwitchServer,
  onSetUiTheme,
  onSetTermTheme,
  onChangeFontSize,
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

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
      const compCnt = Number(meta?.compaction_count || 0);
      const badge = meta
        ? `${(meta.vessel || 'tmux').toUpperCase()}${meta.branch ? ` · ${meta.branch}` : ''}${
            meta.tokens_used > 0 ? ` · ${meta.context_pct}%` : ''
          }${compCnt > 0 ? ` · COMP ${compCnt}X` : ''}`
        : 'SESSION';
      items.push({
        id: `session:${s}`,
        category: 'SESSIONS',
        label: `Switch Node // ${s}`,
        keywords: `${s} ${meta?.vessel || ''} ${meta?.branch || ''} session switch`,
        badge: s === activeSession ? `ACTIVE · ${badge}` : badge,
        action: () => onSelectSession?.(s),
      });
    });

    (serverDirectory || [])
      .filter((srv) => srv && !srv.isCurrent && srv.url)
      .forEach((srv) => {
        items.push({
          id: `server:switch:${srv.url}`,
          category: 'SESSIONS',
          label: `Switch AIM-Connect Server -> ${srv.label} (${srv.host || srv.url})`,
          keywords: `server switch node fleet logout login ${srv.label} ${srv.url}`,
          badge: 'SWITCH NODE',
          action: () => onSwitchServer?.(srv.url, { logoutFirst: true }),
        });
      });

    items.push({
      id: 'session:repo-launcher',
      category: 'SESSIONS',
      label: 'Project: Open Local Git Repo... (Active & Offline)',
      keywords: 'project open git repo repository launcher folder directory -c continue',
      badge: 'REPO · -C',
      action: () => onOpenRepoLauncher?.(),
    });

    items.push({
      id: 'session:create',
      category: 'SESSIONS',
      label: '+ Spawn New Isolated Tmux Session...',
      keywords: 'new create spawn session tmux',
      badge: 'TMUX',
      action: () => onCreateSession?.(),
    });

    if (activeSession) {
      items.push({
        id: 'session:fast-resume',
        category: 'SESSIONS',
        label: `Agent: Fast Resume (latest) in ${activeSession}`,
        keywords: 'agent fast resume continue -c agy grok opencode codex claude previous session',
        badge: 'RESUME',
        action: () => onFastResumeSession?.(activeSession),
      });
    }

    items.push({
      id: 'workspace:save-resurrect',
      category: 'SESSIONS',
      label: 'Workspace: Save Tmux State (tmux-resurrect)',
      keywords: 'workspace save tmux state snapshot backup resurrect guardrail exact conversation',
      badge: resurrectGate.disabled ? 'NOT INSTALLED' : 'SAVE STATE',
      action: () => onSaveWorkspaceState?.(),
    });

    items.push({
      id: 'workspace:restore-resurrect',
      category: 'SESSIONS',
      label: 'Workspace: Restore Tmux State (tmux-resurrect)',
      keywords: 'workspace restore load tmux state snapshot resurrect cold boot resume exact conversation',
      badge: resurrectGate.disabled ? 'NOT INSTALLED' : 'RESTORE',
      action: () => onRestoreWorkspaceState?.(),
    });

    if (activeSession) {
      items.push({
        id: 'session:kill',
        category: 'SESSIONS',
        label: `Terminate Session // ${activeSession}`,
        keywords: 'kill delete terminate session close',
        badge: 'DANGER',
        action: () => onKillSession?.(),
      });
    }

    // 2. JOSHUA ACTIONS
    if (activeSession) {
      items.push({
        id: 'joshua:wiki',
        category: 'JOSHUA ACTIONS',
        label: `Inject /aim-memory-wiki into ${activeSession}`,
        keywords: 'wiki memory ingest checkpoint joshua skill',
        badge: '30% RULE',
        action: () => onSendSessionCommand?.(activeSession, '/aim-memory-wiki'),
      });
      items.push({
        id: 'joshua:handoff',
        category: 'JOSHUA ACTIONS',
        label: `Inject /aim-handoff into ${activeSession}`,
        keywords: 'handoff baton pass relay amnesia joshua skill',
        badge: '30% RULE',
        action: () => onSendSessionCommand?.(activeSession, '/aim-handoff'),
      });
      items.push({
        id: 'joshua:board',
        category: 'JOSHUA ACTIONS',
        label: `Run ./aim projects board in ${activeSession}`,
        keywords: 'projects board kanban github issues',
        badge: 'GITOPS',
        action: () => onSendSessionCommand?.(activeSession, './aim projects board'),
      });
    }

    items.push({
      id: 'joshua:forensics',
      category: 'JOSHUA ACTIONS',
      label: 'Open Forensics, SQLite FTS5 & Swarm Feed',
      keywords: 'forensics tool call fts5 search lancedb swarm aim-communicate',
      badge: 'FORENSICS',
      action: () => onOpenForensics?.(),
    });
    items.push({
      id: 'joshua:token-grabber',
      category: 'JOSHUA ACTIONS',
      label: 'Open Scrollback Token & URL Grabber',
      keywords: 'token url path ip sha grabber copy extract scrollback',
      badge: 'GRAB',
      action: () => onOpenTokenGrabber?.(),
    });
    items.push({
      id: 'joshua:history',
      category: 'JOSHUA ACTIONS',
      label: 'Open Session & Reincarnations History Vault',
      keywords: 'history notebook reincarnations baton flight record',
      badge: 'HISTORY',
      action: () => onOpenHistory?.(),
    });
    items.push({
      id: 'joshua:chat-mode',
      category: 'JOSHUA ACTIONS',
      label: 'Toggle Center Stage: Raw Terminal vs Live Chat Bubbles',
      keywords: 'chat bubbles transcript stream xterm view mode',
      badge: 'STAGE',
      action: () => onToggleChatMode?.(),
    });
    items.push({
      id: 'joshua:toggle-fleet',
      category: 'JOSHUA ACTIONS',
      label: 'Toggle Multi-Session Fleet Sidebar',
      keywords: 'fleet sidebar sessions toggle drawer',
      badge: 'RAIL',
      action: () => onToggleFleetSidebar?.(),
    });

    // 3. BRAIN & WORKSPACE
    items.push({
      id: 'browser:toggle',
      category: 'BRAIN & WORKSPACE',
      label: 'Toggle Co-Pilot Live Browser Split-Pane',
      keywords: 'browser cdp screencast viewport login 2fa tabs subagent',
      badge: 'CDP :9222',
      action: () => onToggleBrowser?.(),
    });
    items.push({
      id: 'files:toggle',
      category: 'BRAIN & WORKSPACE',
      label: 'Toggle Workspace Files & Git Diff Explorer',
      keywords: 'files explorer editor monaco handoff memory wiki',
      badge: 'MONACO',
      action: () => onToggleFiles?.(),
    });
    items.push({
      id: 'files:find',
      category: 'BRAIN & WORKSPACE',
      label: 'Search Full Terminal Scrollback (2,000+ lines in Scroll/Copy)',
      keywords: 'find search terminal xterm scrollback',
      badge: 'CTRL+F',
      action: () => onOpenSearch?.(),
    });
    items.push({
      id: 'files:scrollback',
      category: 'BRAIN & WORKSPACE',
      label: 'Open Full Scroll / Copy Overlay',
      keywords: 'scroll copy history ansi overlay',
      badge: 'SCROLL',
      action: () => onEnterScrollMode?.(),
    });

    // 4. MACROS
    macroLibrary.forEach((m) => {
      items.push({
        id: `macro:${m.id}`,
        category: 'MACROS',
        label: `Run Macro // ${m.label}`,
        keywords: `macro ${m.label} ${m.voiceTrigger || ''}`,
        badge: m.isServer ? 'SERVER' : 'LOCAL',
        action: () => onSendRawCommand?.(m.cmd),
      });
    });

    // 5. SETTINGS & THEME
    items.push(
      {
        id: 'uitheme:emerald',
        category: 'SETTINGS & THEME',
        label: 'UI Scheme // Emerald Matrix (Default)',
        keywords: 'theme emerald matrix mint obsidian dark',
        badge: '#00FFA3',
        action: () => onSetUiTheme?.('emerald'),
      },
      {
        id: 'uitheme:oled',
        category: 'SETTINGS & THEME',
        label: 'UI Scheme // Pure OLED Black',
        keywords: 'theme oled black contrast',
        badge: '#000000',
        action: () => onSetUiTheme?.('oled'),
      },
      {
        id: 'uitheme:light',
        category: 'SETTINGS & THEME',
        label: 'UI Scheme // Daylight Crisp',
        keywords: 'theme light white day outdoor',
        badge: '#F8FAFC',
        action: () => onSetUiTheme?.('light'),
      },
      {
        id: 'uitheme:navy',
        category: 'SETTINGS & THEME',
        label: 'UI Scheme // Classic AIM Navy',
        keywords: 'theme classic aim navy orange',
        badge: '#050A14',
        action: () => onSetUiTheme?.('navy'),
      },
      {
        id: 'theme:standard',
        category: 'SETTINGS & THEME',
        label: 'Terminal Palette // Standard Navy',
        keywords: 'theme standard navy dark',
        badge: 'PALETTE',
        action: () => onSetTermTheme?.('standard'),
      },
      {
        id: 'theme:hacker',
        category: 'SETTINGS & THEME',
        label: 'Terminal Palette // Hacker Matrix Green',
        keywords: 'theme hacker matrix green',
        badge: 'PALETTE',
        action: () => onSetTermTheme?.('hacker'),
      },
      {
        id: 'theme:contrast',
        category: 'SETTINGS & THEME',
        label: 'Terminal Palette // High Contrast',
        keywords: 'theme high contrast white',
        badge: 'PALETTE',
        action: () => onSetTermTheme?.('high-contrast'),
      },
      {
        id: 'font:inc',
        category: 'SETTINGS & THEME',
        label: 'Increase Terminal Font Size (+2px)',
        keywords: 'font size zoom in bigger',
        badge: 'FONT +',
        action: () => onChangeFontSize?.(2),
      },
      {
        id: 'font:dec',
        category: 'SETTINGS & THEME',
        label: 'Decrease Terminal Font Size (-2px)',
        keywords: 'font size zoom out smaller',
        badge: 'FONT -',
        action: () => onChangeFontSize?.(-2),
      },
      {
        id: 'ui:keyboard',
        category: 'SETTINGS & THEME',
        label: 'Toggle Sovereign On-Screen Keyboard',
        keywords: 'keyboard mobile touch keys',
        badge: 'KB',
        action: () => onToggleKeyboard?.(),
      },
      {
        id: 'ui:voice',
        category: 'SETTINGS & THEME',
        label: 'Toggle Voice Dictation',
        keywords: 'voice dictation speech microphone',
        badge: 'MIC',
        action: () => onToggleVoice?.(),
      },
      {
        id: 'ui:speak',
        category: 'SETTINGS & THEME',
        label: 'Speak Latest Agent Summary',
        keywords: 'speak readback tts voice summary speaker',
        badge: 'TTS',
        action: () => onSpeakSummary?.(),
      },
      {
        id: 'ui:voice-autoread',
        category: 'SETTINGS & THEME',
        label: 'Toggle Voice Auto-Playback',
        keywords: 'voice auto playback readback tts spoken summary',
        badge: 'TTS AUTO',
        action: () => onToggleVoiceAutoRead?.(),
      },
      {
        id: 'ui:integrations',
        category: 'SETTINGS & THEME',
        label: 'Open Outbound Email Integrations Vault',
        keywords: 'integrations vault api keys secrets',
        badge: 'VAULT',
        action: () => onOpenIntegrations?.(),
      },
      {
        id: 'ui:tmux-settings',
        category: 'SETTINGS & THEME',
        label: 'Open Tmux, Fast-Resume & WSL Boot Settings',
        keywords: 'tmux resurrect boot wsl keepalive fast resume -c skip permissions repo scan paths guardrail',
        badge: 'TMUX & BOOT',
        action: () => onOpenTmuxSettings?.(),
      },
      {
        id: 'app:hard-refresh',
        category: 'SETTINGS & THEME',
        label: appUpdateAvailable
          ? 'App: Update & Hard Refresh Latest Bundle'
          : 'App: Hard Refresh & Reload Bundle (PWA Ctrl+Shift+R)',
        keywords: 'refresh reload update bundle cache pwa mobile version',
        badge: appUpdateAvailable ? 'UPDATE READY' : 'REFRESH APP',
        action: () => onRefreshApp?.(),
      },
      {
        id: 'ui:settings',
        category: 'SETTINGS & THEME',
        label: 'Open System Settings (Themes, Voice, Passkeys)',
        keywords: 'settings preferences e2ee',
        badge: 'CONFIG',
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
    onOpenRepoLauncher,
    onFastResumeSession,
    onSaveWorkspaceState,
    onRestoreWorkspaceState,
    resurrectGate.disabled,
    onKillSession,
    onSendSessionCommand,
    onSendRawCommand,
    onToggleFiles,
    onToggleBrowser,
    onToggleFleetSidebar,
    onOpenTokenGrabber,
    onOpenForensics,
    onOpenHistory,
    onToggleChatMode,
    onEnterScrollMode,
    onOpenSearch,
    onToggleKeyboard,
    onToggleVoice,
    onSpeakSummary,
    onToggleVoiceAutoRead,
    onOpenSettings,
    onOpenTmuxSettings,
    onOpenIntegrations,
    onRefreshApp,
    appUpdateAvailable,
    serverDirectory,
    onSwitchServer,
    onSetUiTheme,
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
    <div className="modal-veil" onClick={onClose}>
      <div
        className="ld-modal-card wide"
        style={{ width: 'min(620px, 94%)' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ color: 'var(--accent)', display: 'flex' }}>
            <Icon name="search" size={15} />
          </span>
          <input
            ref={inputRef}
            type="text"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12.5px',
            }}
            placeholder="Search sessions, /wiki, /handoff, forensics, macros, settings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="mono-kbd">ESC</span>
        </div>

        <div
          style={{
            padding: '8px',
            maxHeight: '58vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {filtered.length === 0 ? (
            <div className="fleet-empty-state">No matching commands</div>
          ) : (
            filtered.map((item, idx) => {
              const showCat = idx === 0 || filtered[idx - 1].category !== item.category;
              const isSelected = idx === selectedIndex;

              return (
                <div key={item.id}>
                  {showCat && (
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        color: 'var(--accent)',
                        padding: '8px 10px 3px',
                      }}
                    >
                      {item.category}
                    </div>
                  )}
                  <button
                    type="button"
                    className={`pop-item ${isSelected ? 'selected' : ''}`}
                    style={{ width: '100%' }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => executeItem(item)}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                    {item.badge && <span className="mono-kbd">{item.badge}</span>}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="modal-footer-bar" style={{ padding: '8px 16px', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          <span>↑↓ NAVIGATE</span>
          <span>↵ EXECUTE</span>
          <span>⌘K / CTRL+K TOGGLE</span>
        </div>
      </div>
    </div>
  );
}
