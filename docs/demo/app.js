// Crisp Lucide 1.85px Geometric Line Icons (Zero Cartoon Emojis)
const ICONS = {
  terminal: `<svg class="lucide" viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  sidebar: `<svg class="lucide" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`,
  globe: `<svg class="lucide" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  files: `<svg class="lucide" viewBox="0 0 24 24"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`,
  split: `<svg class="lucide" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`,
  search: `<svg class="lucide" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  zap: `<svg class="lucide" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  mic: `<svg class="lucide" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`,
  micOff: `<svg class="lucide" viewBox="0 0 24 24"><line x1="2" y1="2" x2="22" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`,
  volume: `<svg class="lucide" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  volumeOff: `<svg class="lucide" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
  trash: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  edit: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  clipboard: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`,
  copyText: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  link: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  history: `<svg class="lucide" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`,
  microscope: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></svg>`,
  plug: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/></svg>`,
  lock: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  fingerprint: `<svg class="lucide" style="width:14px;height:14px;" viewBox="0 0 24 24"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/></svg>`,
  upload: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  cloud: `<svg class="lucide" style="width:12px;height:12px;" viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`,
  smartphone: `<svg class="lucide" style="width:12px;height:12px;" viewBox="0 0 24 24"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`,
  refresh: `<svg class="lucide" style="width:12px;height:12px;" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`,
  camera: `<svg class="lucide" style="width:12px;height:12px;" viewBox="0 0 24 24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  cameraPlus: `<svg class="lucide" style="width:13.5px;height:13.5px;" viewBox="0 0 24 24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9"/><circle cx="11" cy="13" r="3"/><line x1="19" y1="14" x2="19" y2="20"/><line x1="16" y1="17" x2="22" y2="17"/></svg>`,
  externalLink: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  downloadSm: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  coffee: `<svg class="lucide" style="width:15px;height:15px;" viewBox="0 0 24 24"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`,
  check: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  download: `<svg class="lucide" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  send: `<svg class="lucide" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  cpu: `<svg class="lucide" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>`,
  gitBranch: `<svg class="lucide" style="width:12px;height:12px;" viewBox="0 0 24 24"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>`,
  eye: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  gamepad: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/></svg>`,
  key: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>`,
  star: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  close: `<svg class="lucide" style="width:14px;height:14px;" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  plus: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  shield: `<svg class="lucide" style="width:14px;height:14px;" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  keyboard: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/></svg>`,
  maximize: `<svg class="lucide" style="width:12px;height:12px;" viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
  play: `<svg class="lucide" style="width:12px;height:12px;" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  settings: `<svg class="lucide" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
};

// Exact 18 Production Default Macros (App.jsx lines 356-375) + Sovereign Skill Macros
const INITIAL_MACROS = [
  { id: 'def-ctrlc', label: '^C', cmd: '\\x03', kind: 'key', pinned: true, isServer: false, voiceTrigger: '' },
  { id: 'def-esc', label: 'Esc', cmd: '\\x1b', kind: 'key', pinned: true, isServer: false, voiceTrigger: '' },
  { id: 'def-tab', label: 'Tab', cmd: '\\x09', kind: 'key', pinned: true, isServer: false, voiceTrigger: '' },
  { id: 'def-bksp', label: 'Bksp', cmd: '\\x7f', kind: 'key', pinned: true, isServer: false, voiceTrigger: 'backspace' },
  { id: 'def-delw', label: 'Del Word', cmd: '\\x17', kind: 'key', pinned: true, isServer: false, voiceTrigger: 'delete word' },
  { id: 'def-pgup', label: 'PgUp', cmd: '\\x1b[5~', kind: 'key', pinned: true, isServer: false, voiceTrigger: '' },
  { id: 'def-pgdn', label: 'PgDn', cmd: '\\x1b[6~', kind: 'key', pinned: true, isServer: false, voiceTrigger: '' },
  { id: 'def-up', label: '↑', cmd: '\\x1b[A', kind: 'key', pinned: true, isServer: false, voiceTrigger: '' },
  { id: 'def-down', label: '↓', cmd: '\\x1b[B', kind: 'key', pinned: true, isServer: false, voiceTrigger: '' },
  { id: 'def-left', label: '←', cmd: '\\x1b[D', kind: 'key', pinned: true, isServer: false, voiceTrigger: '' },
  { id: 'def-right', label: '→', cmd: '\\x1b[C', kind: 'key', pinned: true, isServer: false, voiceTrigger: '' },
  { id: 'def-drop', label: 'Drop Down', cmd: '\\\\\\r', kind: 'key', pinned: true, isServer: false, voiceTrigger: 'drop down' },
  { id: 'def-submit', label: 'Submit', cmd: '\\r', kind: 'key', pinned: true, isServer: false, voiceTrigger: 'submit' },
  { id: 'def-clear', label: 'Clear', cmd: '\\x0c', kind: 'key', pinned: true, isServer: false, voiceTrigger: '' },
  { id: 'def-scrollmode', label: 'Copy Mode', cmd: '\\x02[', kind: 'key', pinned: true, isServer: false, voiceTrigger: '' },
  { id: 'def-top', label: 'top', cmd: 'top\\r', kind: 'cmd', pinned: true, isServer: false, voiceTrigger: '' },
  { id: 'def-ls', label: 'ls -la', cmd: 'ls -la\\r', kind: 'cmd', pinned: true, isServer: false, voiceTrigger: '' },
  { id: 'def-mini', label: 'Mini Mode', cmd: 'opencode --mini\\r', kind: 'cmd', pinned: false, isServer: false, voiceTrigger: '' },
  { id: 'srv-handoff', label: 'Baton Pass (/aim-handoff)', cmd: '/aim-handoff\\r', kind: 'cmd', pinned: true, isServer: true, voiceTrigger: 'handoff' },
  { id: 'srv-wiki', label: 'Sync Memory Wiki', cmd: '/aim-memory-wiki\\r', kind: 'cmd', pinned: true, isServer: true, voiceTrigger: 'memory wiki' },
  { id: 'srv-board', label: 'GitHub Kanban Board', cmd: './aim projects board\\r', kind: 'cmd', pinned: true, isServer: true, voiceTrigger: 'project board' },
  { id: 'srv-pytest', label: 'Run Backend Pytest', cmd: 'pytest -q\\r', kind: 'cmd', pinned: true, isServer: true, voiceTrigger: 'run tests' },
];

const INITIAL_SESSIONS = [
  {
    name: 'aim-connect',
    vessel: 'AGY',
    isAgent: true,
    status: 'IDLE',
    taskKind: 'idle',
    taskLabel: 'IDLE · 10 SESS',
    branch: 'master',
    isWorktree: false,
    panes: 1,
    pct: 18.4,
    used: '184k',
    limit: '1M',
    tier: 'normal',
    compacted: 0,
    browserTabId: 'tab-connect',
    color: { hex: '#eab308', rgb: '234, 179, 8', label: 'Gold' },
    preview: 'Gen #10 active · 195/195 pytest · 3FA + CDP live',
    priorTurns: [
      {
        user: 'Picked up from Gen #09 (d94b8c7f). First check git status and confirm 193/193 backend tests pass before we open worktrees for #253 and #254.',
        tools: [
          'Read(HANDOFF.md) · loaded Gen #09 baton in 12ms',
          'pytest -q -> 193 passed in 2.18s · clean master @ 409d12a',
        ],
        spoken: 'Loaded the Generation 9 handoff cleanly. All 193 backend tests are green on master and ready for isolated worktrees.',
      },
      {
        user: 'Spawn ./aim fix 253 and ./aim fix 254. Every leased browser tab needs its owning agent color border, and the split-pane divider needs smooth pointer drag.',
        tools: [
          './aim fix 253 && ./aim fix 254 -> workspace/issue-253, workspace/issue-254',
          'Edit(frontend/src/components/BrowserPane.jsx, App.jsx) · session color borders + col-resize divider',
          'aim promote (#253, #254, #255) -> master @ 7d923ee · 195 passed in 2.31s',
        ],
        spoken: 'Shipped and promoted issues 253, 254, and 255 to master with 195 passing tests and colored browser lease borders.',
      },
      {
        user: 'Is the find button the same as the command palette or do they serve 2 different purposes? I tested find and when I scroll up a page or 2 it misses off-screen words.',
        tools: [
          'Read(frontend/src/components/TerminalPane.jsx, App.jsx) · verified xterm-addon-search vs tmux server scrollback',
        ],
        spoken: 'They serve different jobs: Command Palette jumps across sessions and commands, while Find only searched the visible 45 xterm rows because tmux holds scrollback server-side. Moving search into Scroll/Copy searches all 2,000 off-screen lines.',
      },
      {
        user: 'Put the Macro Settings button on the Voice & Neural TTS tab too with a note about custom spoken voice macros, and let me highlight my operator replies in cyan/gold and move my dot to the right.',
        tools: [
          'Edit(scratch/facelift-prototype/app.js, styles.css) · added Custom Voice Macros card + Operator Cyan/Right chat alignment',
        ],
        spoken: 'Added the Custom Voice Macros spotlight card inside Voice settings and wired the Operator reply highlight and right-aligned chat dot.',
      },
      {
        user: 'Add sessions without an open browser, non-agent split tmux server sessions like aim-connect-workspace and leaddeeds-motion-vault, and make History render every single turn cleanly.',
        tools: [
          'tmux list-sessions · inspected live 4-window aim-connect-workspace & leaddeeds-motion-vault topology',
          'Wired 12-node fleet (7 browser-leased, 3 CLI-only agents, 2 split-tmux server nodes) + 100% full-turn History viewer',
        ],
        spoken: 'Added non-browser CLI agents, live split-pane tmux server workspaces, and full turn-by-turn transcripts across all History generations.',
      },
    ],
    userPrompt: 'Verify all 12 Fleet nodes, confirm non-browser sessions open cleanly in full terminal/tmux view, and check that every History card expands 100% of its recorded turns.',
    tools: [
      'node --check app.js · verified 39 sealed/live generations + 4-pane tmux server grid + 0 moat/PII leaks',
    ],
    spoken:
      'Generation 10 is idle at 18.4 percent context with all twelve fleet nodes—including non-browser CLI agents and split-pane tmux server sessions—verified.',
  },
  {
    name: 'aim-connect-workspace',
    vessel: 'TMUX',
    isAgent: false,
    status: 'IDLE',
    taskKind: 'server',
    taskLabel: '4W · 4P DAEMONS',
    branch: '4 windows · :8000/:8001',
    isWorktree: false,
    panes: 4,
    uptime: 'UP 2d 01h 40m',
    portsLabel: ':8000 · :8001 · :9222 · EDGE',
    pct: 100,
    used: '4/4',
    limit: 'HEALTHY',
    tier: 'normal',
    compacted: 0,
    browserTabId: null,
    color: { hex: '#10b981', rgb: '16, 185, 129', label: 'Matrix' },
    preview: '0:servers(:8000) · 1:mcp(:8001) · 2:cloudflared · 3:office',
    tmuxWindows: [
      {
        id: '0:servers',
        title: '0:servers* (uvicorn :8000)',
        cmd: 'uvicorn main:app --host 0.0.0.0 --port 8000',
        cwd: '~/aim-connect/backend',
        pid: '629630',
        lines: [
          '[startup.sh] Scoped LISTEN check green -> FastAPI Orchestrator bound on 0.0.0.0:8000 (PID 629630)',
          'INFO:     Started server process [629630] · uvloop + httptools active',
          'INFO:     Application startup complete · E2EE Plane B AES-256-GCM ready',
          'INFO:     127.0.0.1:49812 - "GET /api/sessions HTTP/1.1" 200 OK (12 tmux sessions, 1.8ms)',
          'INFO:     198.51.100.42:0 - "WebSocket /ws/aim-connect" [accepted · 3FA JWT + per-session GCM]',
          'INFO:     127.0.0.1:49830 - "GET /api/browser/tabs HTTP/1.1" 200 OK (7 active CDP leases)',
          'INFO:     198.51.100.42:0 - "GET /api/sessions/history?project=aim-connect HTTP/1.1" 200 OK',
        ],
      },
      {
        id: '1:mcp',
        title: '1:mcp (aim-mcp :8001)',
        cmd: './start_mcp.sh --port 8001',
        cwd: '~/aim-mcp',
        pid: '3316',
        lines: [
          '[aim-mcp] Multi-Tenant SSE Server listening on 0.0.0.0:8001 (PID 3316)',
          '[lancedb] Mounted hybrid BM25 + vector pools (aim-connect: 312, aim-youtube: 1444, aim-ld: 890)',
          'INFO:     127.0.0.1:52104 - "POST /mcp/search_lancedb HTTP/1.1" 200 OK (3.6ms · 8 chunks)',
          'INFO:     203.0.113.88:0 - "GET /sse HTTP/1.1" 401 Unauthorized (blocked unauthenticated probe)',
          'INFO:     127.0.0.1:52119 - "POST /mcp/search_lancedb HTTP/1.1" 200 OK (4.1ms · caller dossier)',
        ],
      },
      {
        id: '2:cloudflared',
        title: '2:cloudflared (Zero-Trust Edge)',
        cmd: 'cloudflared tunnel --config ~/.cloudflared/config.yml run',
        cwd: '~/aim-connect',
        pid: '3466',
        lines: [
          '2026-11-22T09:14:02Z INF Starting tunnel tunnelID=8f3c91a0-sovereign-edge (PID 3466)',
          '2026-11-22T09:14:02Z INF Version 2026.10.1 · GOOS=linux GOARCH=amd64 (Ryzen 7 sovereign-node)',
          '2026-11-22T09:14:03Z INF Registered tunnel connection connIndex=0 location=mia04 protocol=quic',
          '2026-11-22T09:14:03Z INF Registered tunnel connection connIndex=1 location=atl02 protocol=quic',
          '2026-11-22T09:14:04Z INF Registered tunnel connection connIndex=2 location=iad06 protocol=quic',
          '2026-11-22T09:14:04Z INF Registered tunnel connection connIndex=3 location=ord03 protocol=quic',
        ],
      },
      {
        id: '3:office',
        title: '3:office (node + :9222 CDP)',
        cmd: 'node server.js --port 3080 && aim-browser --check',
        cwd: '~/aim-office',
        pid: '133883',
        lines: [
          '[aim-office] Live telemetry & spatial agent monitor ready on 127.0.0.1:3080',
          '[aim-browser] Shared Chromium CDP daemon healthy on 127.0.0.1:9222 (PID 133883 · 7 leased tabs)',
          '[sovereign-node] load avg: 0.42, 0.38, 0.31 · RAM: 14.2G / 64.0G · NVMe: 412 GB free',
          'operator@sovereign-node:~/aim-office$ ./startup.sh --status -> ALL 4 WORKSPACE WINDOWS GREEN',
        ],
      },
    ],
    priorTurns: [],
    userPrompt: './startup.sh --status',
    tools: ['All 4 tmux daemon windows healthy (:8000, :8001, cloudflared, office)'],
    spoken: 'Raw split-pane tmux server workspace hosting FastAPI, MCP SSE, and Cloudflare Zero-Trust edge tunnel.',
  },
  {
    name: 'aim-calendar',
    vessel: 'AGY',
    isAgent: true,
    status: 'IDLE',
    taskKind: 'mapping',
    taskLabel: 'CALL & MMS RECALL',
    branch: 'main',
    isWorktree: false,
    panes: 1,
    pct: 10.8,
    used: '108k',
    limit: '1M',
    tier: 'normal',
    compacted: 0,
    browserTabId: 'tab-calendar',
    color: { hex: '#14b8a6', rgb: '20, 184, 166', label: 'Teal' },
    preview: 'Matched repeat caller (727) 555-0194 -> $300 + 20 MMS',
    priorTurns: [
      {
        user: 'Check who we had on the schedule in Safety Harbor last November for the 3-car travertine driveway + pool cage soft wash, and what sealer SKU we put on their invoice.',
        tools: [
          'mcp_search_lancedb("Safety Harbor travertine pool cage November") · 3 hits in 3.9ms',
          'Read(conversations/daily_notes/2025-11-14.md) · Marcus Vance · 918 Philippe Pkwy · $1,450 paid',
        ],
        spoken: 'That was Marcus Vance at 918 Philippe Parkway in Safety Harbor on November 14. We cleaned the pool enclosure and sealed 1,380 square feet of travertine with two coats of Trident Cat-5 urethane for 1,450 dollars.',
      },
      {
        user: 'Did he ever text us follow-up pictures after the rainstorm that week?',
        tools: [
          'Grep("555-0148|Philippe", conversations/mms_index.json) · 4 inbound MMS on 2025-11-18',
        ],
        spoken: 'Yes—four days later on November 18 he texted four photos of water beading on the driveway and wrote that the joint sand locked up rock solid.',
      },
      {
        user: 'Awesome. Also pull any open estimates from Tuesday afternoon where the homeowner still owes us gate width measurements.',
        tools: [
          'mcp_search_lancedb("gate width measurements pending estimate Tuesday") · 1 open quote found',
        ],
        spoken: 'One match: Greg Morales in Dunedin on Pinehurst Road—quoted 425 dollars for fence and back patio soft wash, waiting on side-gate clearance for the hose reel.',
      },
      {
        user: 'Now who just called from (727) 555-0194? Pull their past quote history, address, MMS photos, and what we charged them.',
        tools: [
          'mcp_search_lancedb("727-555-0194 diarized calls daily_notes mms") · matched Oct–Nov 2024 + today',
          'Read(conversations/daily_notes/2024-10-28.md, 2024-11-11.md) · 2 calls + 20 MMS photos verified',
        ],
        spoken: 'Found her full dossier. That is Evelyn Harper at Bayview RV Estates, 12400 US Highway 19 North, Lot 214 in Clearwater—we charged 300 dollars paid by check in November 2024.',
      },
    ],
    userPrompt: 'Pop her full Oct–Nov 2024 photo & call timeline open in our browser tab so I can reference all 20 before/after MMS shots while I call her back.',
    tools: [
      'aim-browser --tab caller-lookup --open http://127.0.0.1:8040/dossier/727-555-0194 · 20 MMS + 3 calls rendered',
    ],
    spoken:
      'Evelyn Harper’s complete Clearwater Lot 214 dossier is open in your teal browser tab with both diarized calls, the 300 dollar check record, and all twenty before-and-after MMS photos.',
  },
  {
    name: 'aim-joshua',
    vessel: 'GROK',
    isAgent: true,
    status: 'THINKING',
    taskKind: 'typing',
    taskLabel: 'SHARED BRAIN OS',
    branch: 'main',
    isWorktree: false,
    panes: 1,
    pct: 22.0,
    used: '44k',
    limit: '200k',
    tier: 'warn',
    compacted: 0,
    browserTabId: 'tab-joshua',
    color: { hex: '#00B8FF', rgb: '0, 184, 255', label: 'Cyan' },
    preview: 'Cross-harness LanceDB recall (AGY+Grok+OC+Codex)...',
    priorTurns: [
      {
        user: 'Audit install.sh and install.ps1 to confirm a fresh developer cloning BrianV1981/aim-joshua gets AGENTS.md, ./aim CLI, and LanceDB MCP wired across AGY, Grok, OpenCode, and Codex automatically.',
        tools: [
          'Read(install.sh, install.ps1, joshua_os/.aim_core/mcp_register.py)',
          'pytest tests/test_multi_harness_mcp.py · 64/64 passed (v1.1.4)',
        ],
        spoken: 'Verified all sixty-four installer and MCP registration tests across Linux, WSL2, macOS, and native Windows 11 PowerShell.',
      },
      {
        user: 'Make sure Option B (install-agent.sh) cleanly isolates specialist co-agents under ~/aim-agents/ without polluting the root repo.',
        tools: [
          'Bash(bash tests/smoke_coagent_forge.sh) · verified isolated memory-wiki/ + shared Datajack mount',
        ],
        spoken: 'Confirmed Option B co-agents spin up cleanly under aim-agents with isolated git worktrees and zero root repo pollution.',
      },
      {
        user: 'Export a fresh joshua_core.engram cartridge and verify round-trip import into an empty bwrap sandbox.',
        tools: [
          'aim export-cartridge --out dist/joshua_core.engram · 312 hybrid Parquet chunks sealed (SHA-256 verified)',
          'aim import-cartridge --sandbox /tmp/bwrap-verify dist/joshua_core.engram -> 312/312 chunks recalled',
        ],
        spoken: 'Sealed 312 hybrid chunks into joshua_core.engram and verified lossless round-trip recall inside a clean bubblewrap sandbox.',
      },
    ],
    userPrompt: 'Test live hybrid BM25 + vector recall across our shared project brain and verify sub-5ms query latency.',
    tools: [
      'aim-browser --tab joshua-docs --type "#brain-query" "cross-harness 30% handoff rule" --content-ax',
      'python3 joshua_os/.aim_core/aim_cli.py search "30% handoff rule" · 8 hits in 3.6ms ($0 token burn)',
    ],
    spoken: 'Typing cross-harness recall queries on the J.O.S.H.U.A. hub—what Gemini indexes on Monday, Grok, OpenCode, and local Ollama recall in 3.6 milliseconds on Tuesday.',
  },
  {
    name: 'aim-tbsoftwash-content',
    vessel: 'AGY',
    isAgent: true,
    status: 'IDLE',
    taskKind: 'cli',
    taskLabel: 'CLI · NO BROWSER',
    branch: 'main',
    isWorktree: false,
    panes: 1,
    pct: 15.2,
    used: '152k',
    limit: '1M',
    tier: 'normal',
    compacted: 0,
    browserTabId: null,
    color: { hex: '#f43f5e', rgb: '244, 63, 94', label: 'Rose' },
    preview: 'Queued 3 Mon/Wed/Fri SEO articles (no browser needed)',
    priorTurns: [
      {
        user: 'Pull the latest Florida barrel-tile roof chemistry & surfactant spoke summary from aim-youtube and check which Pinellas cities still need a dedicated Q4 roof guide.',
        tools: [
          'Read(~/aim-agents/aim-youtube/deliverables/tbsoftwash_barrel_tile_sop.md)',
          'python3 scripts/content_gap_matrix.py -> Belleair Bluffs, Seminole, Tierra Verde open',
        ],
        spoken: 'Loaded the verified spoke summary from aim-youtube. Belleair Bluffs, Seminole, and Tierra Verde are next in the Pinellas content matrix.',
      },
      {
        user: 'Draft all three 2,200-word city guides using strict ARMA sodium hypochlorite ratios, internal city-page links, and FAQ JSON-LD schema—pure CLI, no browser needed.',
        tools: [
          'Write(queue/2026-11-23-belleair-bluffs-roof-soft-wash.html, +2 more)',
          'python3 scripts/seo_schema_lint.py queue/*.html -> 3/3 passed (0 competitor mentions, valid FAQPage JSON-LD)',
        ],
        spoken: 'Generated and linted all three 2,200-word HTML guides with ARMA-compliant ratios and validated FAQ schema.',
      },
      {
        user: 'Verify the Mon/Wed/Fri 8:10 AM deterministic cron queue so they publish automatically without waking an LLM.',
        tools: [
          'pytest tests/test_drip_scheduler.py -q -> 29 passed in 0.44s',
        ],
        spoken: 'All twenty-nine drip scheduler tests pass—Monday, Wednesday, and Friday 8:10 AM slots are armed with zero LLM runtime cost.',
      },
    ],
    userPrompt: 'Run final anti-competitor & internal-anchor check across all queued November posts and update memory-wiki/editorial_log.md.',
    tools: [
      'python3 scripts/audit_anchors.py --strict -> 42/42 internal city links HTTP-200 mapped · 0 broken slugs',
      'Edit(memory-wiki/editorial_log.md) + ./aim index -> 198 chunks indexed',
    ],
    spoken:
      'All forty-two internal city links passed strict slug verification in pure CLI mode with zero browser overhead, and the editorial wiki is indexed.',
  },
  {
    name: 'aim-youtube',
    vessel: 'OC',
    isAgent: true,
    status: 'THINKING',
    taskKind: 'downloading',
    taskLabel: '492 VIDEOS · DRY',
    branch: 'main',
    isWorktree: false,
    panes: 1,
    pct: 12.5,
    used: '25k',
    limit: '200k',
    tier: 'normal',
    compacted: 0,
    browserTabId: 'tab-youtube',
    color: { hex: '#f97316', rgb: '249, 115, 22', label: 'Orange' },
    preview: '492 indexed videos · 1,444 LanceDB chunks · 38 spokes',
    priorTurns: [
      {
        user: 'Check how many transcripts we have indexed right now and confirm zero broken symlinks across sibling *-content repositories.',
        tools: [
          'python3 scripts/repo_hygiene_check.py -> 491 videos · 1,438 LanceDB chunks · 0 symlinks',
        ],
        spoken: 'Confirmed 491 indexed videos across 1,438 LanceDB chunks with zero symlinks and clean DRY spoke exports.',
      },
      {
        user: 'Extract chemical dwell-time tables and 12V manifold troubleshooting steps from the last 4 commercial exterior videos for aim-tbsoftwash-content.',
        tools: [
          'mcp_search_lancedb("12V proportioner check valve dwell time") · 11 chunks matched in 3.4ms',
          'Write(deliverables/tbsoftwash_12v_manifold_brief.md) · 100% cited timestamps',
        ],
        spoken: 'Compiled the timestamp-cited 12V manifold and dwell-time brief into deliverables for aim-tbsoftwash-content.',
      },
    ],
    userPrompt: 'Ingest the new 48-minute commercial exterior & AI automation masterclass, index chapters into LanceDB, and publish spoke research summaries for aim-tbsoftwash-content and aim-ld-content.',
    tools: [
      'python3 scripts/ingest_video.py --chapters --reindex · 492 videos (1,444 LanceDB fragments)',
      'python3 scripts/lint_deliverable.py --all-active · 82/82 pytest · 38/38 spoke summaries 0 errors',
    ],
    spoken: 'Indexed video 492 into 1,444 searchable LanceDB fragments and verified all thirty-eight spoke summaries for your sibling content agents with zero duplication.',
  },
  {
    name: 'aim-ld',
    vessel: 'AGY',
    isAgent: true,
    status: 'THINKING',
    taskKind: 'mapping',
    taskLabel: 'MAPPING · 3.2ms',
    branch: 'fix/issue-544',
    isWorktree: true,
    panes: 2,
    pct: 34.2,
    used: '342k',
    limit: '1M',
    tier: 'warn',
    compacted: 0,
    browserTabId: 'tab-ld',
    color: { hex: '#00FFA3', rgb: '0, 255, 163', label: 'Emerald' },
    preview: 'Recording zero-VLM site map on leaddeeds.com...',
    priorTurns: [
      {
        user: 'Benchmark our canon_address normalizer across 50,000 commercial parcel rows before we promote #542.',
        tools: [
          'python3 scripts/bench_canon_address.py --rows 50000 -> 0.786s total (63,613 rows/sec) · 726/726 pytest',
        ],
        spoken: 'Canonicalized 50,000 commercial addresses in 0.786 seconds with all 726 unit and integration tests passing.',
      },
      {
        user: 'Promote Website v2 (#539 / PR #540) to www.leaddeeds.com, boost the FIG 1.0 3-color cutaway spotlight to 0.92, and verify the $150 -> $30 Graduated Seat Calculator.',
        tools: [
          'gh pr merge 540 --squash · GHA #44856613210 green · 14/14 public routes HTTP 200',
          'aim-browser --tab v2-live --open https://www.leaddeeds.com · verified FIG 1.0 & /pricing',
        ],
        spoken: 'Website v2 is live on leaddeeds.com across all fourteen public routes and all six industry verticals, with the interactive three-color cutaway and graduated seat calculator verified.',
      },
      {
        user: 'Verify Monday 8:00 AM regional commercial dossiers and confirm the MCP SSE endpoint responds under 25ms.',
        tools: [
          'curl -sI https://mcp.leaddeeds.com/sse -> HTTP/2 200 (18.4ms TTFB) · 27 commercial dossiers queued',
        ],
        spoken: 'Confirmed mcp.leaddeeds.com responds in 18.4 milliseconds with twenty-seven verified commercial dossiers queued.',
      },
    ],
    userPrompt: 'Record self-healing zero-VLM website map landmarks (--map-record) for the Graduated Seat Calculator and FIG 1.0 cutaway on www.leaddeeds.com.',
    tools: [
      'aim-browser --tab v2-live --map-record seatSlider "#seat-range" --map-record figCutaway "#fig-1"',
      'Saved ~/.cache/aim-browser/maps/leaddeeds.com.json · 4 landmarks verified in 3.2ms (0 VLM tokens)',
    ],
    spoken:
      'Recording self-healing DOM landmarks on leaddeeds.com in 3.2 milliseconds with zero vision tokens while verifying the Jacksonville St. Johns dossier.',
  },
  {
    name: 'leaddeeds-motion-vault',
    vessel: 'TMUX',
    isAgent: false,
    status: 'IDLE',
    taskKind: 'server',
    taskLabel: '2P · RENDER IDLE',
    branch: '2 panes · python3 + bash',
    isWorktree: false,
    panes: 2,
    uptime: 'UP 1d 03h 06m',
    portsLabel: 'FFMPEG AVX-512 · VAULT READY',
    pct: 100,
    used: '2/2',
    limit: 'IDLE 0% CPU',
    tier: 'normal',
    compacted: 0,
    browserTabId: null,
    color: { hex: '#06b6d4', rgb: '6, 182, 212', label: 'Vault' },
    preview: '0.0: motion_vault_worker.py · 0.1: bash ~/aim-ld',
    tmuxWindows: [
      {
        id: '0:vault-worker',
        title: '0.0:python3 (motion_vault_worker.py)',
        cmd: 'python3 scripts/motion_vault_worker.py --watch artifacts/motion-vault',
        cwd: '~/aim-ld',
        pid: '418902',
        lines: [
          '[motion-vault] Watching ~/aim-ld/artifacts/motion-vault (poll=2.0s · encoder=libx264/vp9)',
          '[09:42:11] Rendered hero_pipeline_cutaway_60fps.webm (1920x1080 · 4.8 MB · 6.1s on sovereign-node)',
          '[09:44:05] Rendered seat_ladder_loop_60fps.mp4 (1440x900 · 3.1 MB · SHA256=9f81c20e...)',
          '[09:45:19] Asset manifest synced -> public/media/vault_manifest.json (12/12 clips verified)',
          '[14:30:00] Queue empty · worker sleeping at 0.0% CPU awaiting next scene spec...',
        ],
      },
      {
        id: '1:vault-shell',
        title: '0.1:bash (~/aim-ld/artifacts)',
        cmd: 'bash',
        cwd: '~/aim-ld',
        pid: '418940',
        lines: [
          'operator@sovereign-node:~/aim-ld$ ls -lh artifacts/motion-vault/*.webm',
          '-rw-r--r-- 1 kingb kingb 4.8M Nov 22 09:42 hero_pipeline_cutaway_60fps.webm',
          '-rw-r--r-- 1 kingb kingb 2.9M Nov 22 09:43 entity_graph_zoom_60fps.webm',
          '-rw-r--r-- 1 kingb kingb 3.4M Nov 22 09:44 mcp_sse_terminal_demo_60fps.webm',
          'operator@sovereign-node:~/aim-ld$ sha256sum -c artifacts/motion-vault/SHA256SUMS',
          'hero_pipeline_cutaway_60fps.webm: OK · entity_graph_zoom_60fps.webm: OK · mcp_sse_terminal_demo_60fps.webm: OK',
        ],
      },
    ],
    priorTurns: [],
    userPrompt: 'sha256sum -c artifacts/motion-vault/SHA256SUMS',
    tools: ['2-pane split tmux render session idle at 0.0% CPU'],
    spoken: 'Non-agent split tmux render vault watching motion graphic assets on Ryzen sovereign-node.',
  },
  {
    name: 'aim-tbsoftwash',
    vessel: 'AGY',
    isAgent: true,
    status: 'WAITING',
    taskKind: 'gate',
    taskLabel: 'GATE HOLD [y/n]',
    branch: 'fix/issue-231',
    isWorktree: true,
    panes: 1,
    pct: 14.1,
    used: '141k',
    limit: '1M',
    tier: 'normal',
    compacted: 0,
    browserTabId: 'tab-tb',
    color: { hex: '#ef4444', rgb: '239, 68, 68', label: 'Crimson' },
    preview: 'Paused at Bluehost deploy approval gate [y/n]',
    priorTurns: [
      {
        user: 'Scope body > nav and .site-nav in page-components.css so none of the 40 city landing pages inherit blog article list spacing (#207).',
        tools: [
          './aim fix 207 -> workspace/issue-207',
          'Edit(assets/css/page-components.css, functions.php) · verified across Clearwater, Palm Harbor & St. Pete',
        ],
        spoken: 'Scoped navbar rules cleanly across all forty Pinellas and Hillsborough city pages with zero style bleed.',
      },
      {
        user: 'Close all 11 audit items across the 40 Pinellas/Hillsborough city pages and set roof_wash + Trident paver_sealing recall cadence to 36 months (#224).',
        tools: [
          'Edit(includes/recall-cadence.php) · roof_wash=36m, paver_sealing=36m, house_wash=12m',
          'Audit Pass 5 verified -> Grade A+ (11/11 TBS findings closed · 88/88 PHPUnit + pytest green)',
        ],
        spoken: 'All eleven audit findings are closed at Grade A Plus across all forty Tampa Bay city pages, and thirty-six-month recall rules are active for roof soft washing and Trident paver sealing.',
      },
      {
        user: 'Check the interactive quote builder math on 2,800 sq ft barrel-tile roofs before we stage #231.',
        tools: [
          'node tests/quote_calculator_test.js -> $0.28/sqft tier + gutter guard check verified',
        ],
        spoken: 'Verified barrel-tile roof tier calculations and multi-service bundle discounts in quote_calculator_test.js.',
      },
    ],
    userPrompt: 'Open tbsoftwash.com in our leased tab, verify the interactive quote builder + Pinellas barrel-tile roof slider, and pause before promoting fix/issue-231.',
    tools: [
      'aim-browser --tab issue-231 --open https://tbsoftwash.com · quote builder & slider verified',
      'APPROVAL GATE: Promote fix/issue-231 to production Bluehost? [y/n]',
    ],
    spoken:
      'Tampa Bay Soft Wash homepage, interactive quote builder, and Pinellas barrel-tile roof slider all passed inspection in your steady crimson tab. Standing by for your approval.',
  },
  {
    name: 'tbsoftwash-ai-book',
    vessel: 'OC',
    isAgent: true,
    status: 'IDLE',
    taskKind: 'cli',
    taskLabel: 'CLI · MANUSCRIPT',
    branch: 'main',
    isWorktree: false,
    panes: 1,
    pct: 19.5,
    used: '39k',
    limit: '200k',
    tier: 'normal',
    compacted: 0,
    browserTabId: null,
    color: { hex: '#84cc16', rgb: '132, 204, 22', label: 'Lime' },
    preview: '11/12 chapters typeset (68,420 words · CLI pandoc)',
    priorTurns: [
      {
        user: 'Check total word count across Chapters 01–10 and flag any repeated stories or inconsistent terminology.',
        tools: [
          'python3 scripts/manuscript_lint.py chapters/*.md -> 61,890 words · 2 duplicate anecdotes flagged in Ch04/Ch08',
        ],
        spoken: 'Audited Chapters 1 through 10 at 61,890 words and caught two overlapping anecdotes between Chapters 4 and 8.',
      },
      {
        user: 'Deduplicate Ch08 so it focuses strictly on repeat-caller phone & MMS memory lookup, then draft Chapter 11 on Sovereign Local AI Agents.',
        tools: [
          'Edit(chapters/08-customer-recall.md) + Write(chapters/11-sovereign-local-agents.md · 6,530 words)',
          'python3 scripts/manuscript_lint.py -> 68,420 words · 0 duplicate blocks · reading grade 9.4',
        ],
        spoken: 'Tightened Chapter 8 around instant customer dossier recall and completed Chapter 11, bringing the manuscript to 68,420 clean words.',
      },
    ],
    userPrompt: 'Compile the print-ready 6x9 PDF and EPUB3 build via pandoc/XeLaTeX in artifacts/ and verify zero overfull hboxes.',
    tools: [
      'bash scripts/build_book.sh --pdf --epub -> dist/Blue_Collar_AI_OS_v0.9.pdf (248 pages · 0 LaTeX warnings)',
    ],
    spoken:
      'Built the 248-page 6-by-9 print PDF and EPUB3 cleanly in CLI mode with zero LaTeX overfull boxes.',
  },
  {
    name: 'tbsoftwash-academy',
    vessel: 'AGY',
    isAgent: true,
    status: 'THINKING',
    taskKind: 'downloading',
    taskLabel: 'DOWNLOADING',
    branch: 'master',
    isWorktree: false,
    panes: 1,
    pct: 16.8,
    used: '168k',
    limit: '1M',
    tier: 'normal',
    compacted: 0,
    browserTabId: 'tab-academy',
    color: { hex: '#3b82f6', rgb: '59, 130, 246', label: 'Blue' },
    preview: 'Downloading TBSA_186_SKU_Rig_BOM_v2.pdf...',
    priorTurns: [
      {
        user: 'Verify all 16 Core & Springboard module quizzes sync progress via passwordless magic link and that /verify/TBSA-2026 resolves technician certificates.',
        tools: [
          'npm test -> 74/74 Vitest assertions passed · /verify/TBSA-2026-0042 HTTP 200',
        ],
        spoken: 'All seventy-four quiz, cloud sync, and public certificate verification tests are green.',
      },
      {
        user: 'Check the Viton vs EPDM seal chemical compatibility warnings inside the 186-SKU Rig Builder before generating the PDF BOM.',
        tools: [
          'Read(src/data/rig_skus_186.json) · verified Viton FKM seals enforced on all SH/surfactant lines',
        ],
        spoken: 'Confirmed Viton FKM seals are enforced across every sodium hypochlorite line in the 186-SKU rig dataset.',
      },
    ],
    userPrompt: 'Open academy.tbsoftwash.com, verify the 12V vs AODD manifold mix calculator, and download the printable 186-SKU Rig BOM Proof Pack PDF to artifacts/.',
    tools: [
      'aim-browser --tab academy-dl --open https://academy.tbsoftwash.com/course --dlpath ./artifacts',
      'CDP Page.setDownloadBehavior -> streaming TBSA_186_SKU_Rig_BOM_v2.pdf (24.0 MB)',
    ],
    spoken:
      'Verified Module 4 audio SOPs and the proportioner mix gauges on Soft Wash Academy, and actively downloading the 186-SKU Rig Bill of Materials PDF into artifacts.',
  },
  {
    name: 'aim-auditor',
    vessel: 'AGY',
    isAgent: true,
    status: 'IDLE',
    taskKind: 'cli',
    taskLabel: 'CLI · 512K SOON',
    branch: 'master',
    isWorktree: false,
    panes: 1,
    pct: 47.8,
    used: '478k',
    limit: '1M',
    tier: 'crit',
    compacted: 0,
    browserTabId: null,
    color: { hex: '#a855f7', rgb: '168, 85, 247', label: 'Violet' },
    preview: 'Pass 36 verified -> Grade A (CLI only · near 512k)',
    priorTurns: [
      {
        user: 'Audit aim-joshua v1.1.4 against every line of its README—installers, MCP auto-registration, and Datajack .engram claims.',
        tools: [
          'pytest ~/aim-joshua/tests -q -> 64/64 passed · verified 0 undocumented flags',
          'Edit(artifacts/AUDIT_AIM_JOSHUA.md) · Pass 14 -> Grade A+',
        ],
        spoken: 'Completed hostile product-truth Pass 14 on aim-joshua at Grade A Plus—every README flag and installer path matches live code.',
      },
      {
        user: 'Now audit aim-youtube for symlink leaks, duplicate transcripts, or stale spoke summaries.',
        tools: [
          'pytest ~/aim-agents/aim-youtube/tests -q -> 82/82 passed · 38/38 spokes fresh',
          'Edit(artifacts/AUDIT_AIM_YOUTUBE.md) · Pass 9 -> Grade A+',
        ],
        spoken: 'Verified aim-youtube at Grade A Plus with 82 passing tests, zero symlinks, and all 38 spoke deliverables current.',
      },
      {
        user: 'Run hostile product-truth audit Pass 36 on aim-connect—check 3FA, Plane B E2EE, test_repo_shareability.py, and session history vault.',
        tools: [
          'pytest ~/aim-connect/backend/tests -q -> 195/195 passed (test_repo_shareability.py green)',
          'npx oxlint ~/aim-connect/frontend/src -> 0 warnings, 0 errors',
        ],
        spoken: 'Verified all 195 backend security and shareability tests plus zero frontend lint warnings on aim-connect.',
      },
    ],
    userPrompt: 'Update artifacts/AUDIT_AIM_CONNECT.md in place for Pass 36 and tell me if we need a baton pass before Pass 37.',
    tools: ['Edit(artifacts/AUDIT_AIM_CONNECT.md) · Pass 36 -> Grade A (0 open P0/P1 · ctx 478k/1M)'],
    spoken: 'Adversarial Audit Pass 36 is recorded in place at Grade A in pure CLI mode. Context is at 47.8 percent approaching the 512k cliff—trigger handoff before Pass 37.',
  },
].sort((a, b) => a.name.localeCompare(b.name));

const INITIAL_BROWSER_TABS = [
  {
    id: 'tab-ld',
    title: 'LeadDeeds // Day-Zero Commercial Intelligence',
    url: 'https://www.leaddeeds.com',
    agentKey: 'aim-ld',
    sublabel: 'map-record',
    hudBadge: 'MAPPING · 3.2ms ZERO-VLM',
    color: { hex: '#00FFA3', rgb: '0, 255, 163' },
    isWorking: true,
    kind: 'leaddeeds',
  },
  {
    id: 'tab-tb',
    title: 'Tampa Bay Soft Wash // Clearwater & Tampa FL',
    url: 'https://tbsoftwash.com',
    agentKey: 'aim-tbsoftwash',
    sublabel: 'gate-hold',
    hudBadge: 'WAITING · APPROVAL GATE [y/n]',
    color: { hex: '#ef4444', rgb: '239, 68, 68' },
    isWorking: false,
    kind: 'tbsoftwash',
  },
  {
    id: 'tab-calendar',
    title: 'aim-calendar // Caller & MMS Dossier Recall',
    url: 'http://127.0.0.1:8040/dossier/727-555-0194',
    agentKey: 'aim-calendar',
    sublabel: 'caller-lookup',
    hudBadge: 'VERIFIED · 2 CALLS + 20 MMS',
    color: { hex: '#14b8a6', rgb: '20, 184, 166' },
    isWorking: false,
    kind: 'calendar',
  },
  {
    id: 'tab-joshua',
    title: 'BrianV1981/aim-joshua // Shared Brain OS',
    url: 'https://github.com/BrianV1981/aim-joshua',
    agentKey: 'aim-joshua',
    sublabel: 'shared-brain',
    hudBadge: 'TYPING · LANCEDB RECALL (3.6ms)',
    color: { hex: '#00B8FF', rgb: '0, 184, 255' },
    isWorking: true,
    kind: 'joshua',
  },
  {
    id: 'tab-youtube',
    title: 'aim-youtube // 492-Video Spoke Knowledge Hub',
    url: 'http://127.0.0.1:8055/library/spokes',
    agentKey: 'aim-youtube',
    sublabel: 'spoke-sync',
    hudBadge: 'INDEXING · 1,444 LANCEDB CHUNKS',
    color: { hex: '#f97316', rgb: '249, 115, 22' },
    isWorking: true,
    kind: 'youtube',
  },
  {
    id: 'tab-academy',
    title: 'Tampa Bay Soft Wash Academy // Rig BOM & SOPs',
    url: 'https://academy.tbsoftwash.com/course',
    agentKey: 'tbsoftwash-academy',
    sublabel: 'downloading',
    hudBadge: 'DOWNLOADING · PDF STREAM',
    color: { hex: '#3b82f6', rgb: '59, 130, 246' },
    isWorking: true,
    kind: 'academy',
  },
  {
    id: 'tab-connect',
    title: 'BrianV1981/aim-connect // Sovereign Cockpit',
    url: 'https://github.com/BrianV1981/aim-connect',
    agentKey: 'aim-connect',
    sublabel: 'idle-lease',
    hudBadge: 'IDLE · LEASE HELD (0% CPU)',
    color: { hex: '#eab308', rgb: '234, 179, 8' },
    isWorking: false,
    kind: 'github-connect',
  },
];

const SCROLLBACK_TOKENS = [
  { type: 'url', value: 'https://www.leaddeeds.com', display: 'https://www.leaddeeds.com', redacted: false },
  { type: 'url', value: 'https://tbsoftwash.com', display: 'https://tbsoftwash.com', redacted: false },
  { type: 'url', value: 'https://academy.tbsoftwash.com/course?token=magic_991a', display: 'https://academy.tbsoftwash.com/course?token=***', redacted: true },
  { type: 'url', value: 'https://mcp.leaddeeds.com/sse', display: 'https://mcp.leaddeeds.com/sse', redacted: false },
  { type: 'path', value: 'frontend/src/components/BrowserPane.jsx', display: 'frontend/src/components/BrowserPane.jsx', redacted: false },
  { type: 'path', value: 'backend/routes_browser.py', display: 'backend/routes_browser.py', redacted: false },
  { type: 'ip', value: '127.0.0.1:9222', display: '127.0.0.1:9222 (CDP Screencast)', redacted: false },
  { type: 'ip', value: '0.0.0.0:8000', display: '0.0.0.0:8000 (FastAPI Orchestrator)', redacted: false },
  { type: 'sha', value: '7d923ee', display: '7d923ee (aim-connect · #255 colored session pills)', redacted: false },
  { type: 'sha', value: 'a6d8ea67', display: 'a6d8ea67 (aim-ld · Website v2 Emerald Matrix launch)', redacted: false },
];

const FORENSIC_TURNS = [
  {
    id: 'turn-19',
    step: 'STEP 19 · 01:04:12',
    prompt: 'Verify Website v2 (#539) on www.leaddeeds.com + Slot 13 Jacksonville commercial dossier.',
    tools: [
      {
        name: 'run_command (aim-browser)',
        exit: 0,
        duration: '384ms',
        args: 'aim-browser --tab v2-live --open "https://www.leaddeeds.com" --ax-tree',
        stdout: 'targetId=9F2B1104 · lease=aim-ld/v2-live · 14/14 routes HTTP 200 · FIG 1.0 + $150->$30 Seat Ladder verified',
      },
      {
        name: 'mcp_search_lancedb',
        exit: 0,
        duration: '3.8ms',
        args: '{"query": "commercial expansion dossiers Q4", "limit": 15}',
        stdout: '27 verified regional dossiers · 4,852 decision-maker contacts · 0 pending',
      },
    ],
  },
  {
    id: 'turn-18',
    step: 'STEP 18 · 00:56:40',
    prompt: 'Verify tbsoftwash.com quote builder + 36m recall cadence and aim-connect pytest suite.',
    tools: [
      {
        name: 'run_command (pytest)',
        exit: 0,
        duration: '2.31s',
        args: '~/aim-connect/backend/venv/bin/pytest -q',
        stdout: '195 passed in 2.31s (commit 7d923ee)',
      },
    ],
  },
];

const FTS5_HITS = [
  { source: 'fts5', session: 'aim-ld', when: 'Today · 01:03', snippet: 'Promoted Website v2 (#539 / PR #540) to www.leaddeeds.com · 14/14 routes HTTP 200 · 726/726 pytest.' },
  { source: 'fts5', session: 'aim-tbsoftwash', when: 'Today · 00:58', snippet: 'Closed 11/11 audit items (Grade A+) across 40 Tampa Bay city pages + 36m roof & Trident paver recall.' },
  { source: 'brain', session: 'aim-connect', when: 'memory-wiki/ui-facelift.md', snippet: 'Emerald Matrix palette (#050505 + #00FFA3 + #00B8FF) unified with leaddeeds.com + embedded CDP.' },
  { source: 'brain', session: 'tbsoftwash-academy', when: 'memory-wiki/academy_architecture.md', snippet: '16 Core & Springboard quizzes, 186-SKU rig builder, and /verify/TBSA-2026 live on Vercel.' },
];

const INITIAL_SWARM_FEED = [
  { from: 'aim-joshua', to: 'aim-ld', time: '01:01:14', msg: 'LanceDB hybrid index refreshed (312 chunks). SEC EDGAR & Slot 13 vectors ready.' },
  { from: 'aim-auditor', to: 'aim-tbsoftwash', time: '00:54:09', msg: 'Audit Pass 5 signed off at Grade A+ across tbsoftwash.com and academy.tbsoftwash.com.' },
];

const TTS_VOICES = [
  { id: 'piper:en_US-lessac-medium', label: 'Offline Piper — Lessac Medium (Local Zero-Cloud)' },
  { id: 'piper:en_US-ryan-high', label: 'Offline Piper — Ryan High (Executive Baritone)' },
  { id: 'piper:en_US-amy-medium', label: 'Offline Piper — Amy Medium (Local Crisp)' },
  { id: 'edge:en-US-ChristopherNeural', label: 'Cloud Edge — Christopher Neural' },
  { id: 'edge:en-US-AriaNeural', label: 'Cloud Edge — Aria Neural' },
  { id: 'edge:en-US-GuyNeural', label: 'Cloud Edge — Guy Neural' },
  { id: 'browser:default', label: 'Browser Native — System Default' },
  { id: 'browser:en-GB', label: 'Browser Native — English (UK)' },
];

const FILES_DB = {
  'HANDOFF.md': {
    brain: true,
    status: 'M',
    code: `# AIM-CONNECT // SOVEREIGN NODE HANDOFF
0. TACTICAL STATE: Master @ 7d923ee (195/195 pytest · 38/38 Jest)
1. UI FACELIFT: LeadDeeds Emerald Matrix V2 prototype at 100% feature parity
2. MACRO ENGINE: All 18 control/command defaults + Global Server Sync + Voice Triggers
3. NEXT GATE: Operator sign-off -> Phased GitOps worktrees (#256+)`,
    oldDiff: `- Header buttons: 16 mixed emoji pills
- Macros: 17 horizontal buttons overlapping split pane
- Theme: Hardcoded Navy #0B162C`,
    newDiff: `+ Frosted 50px LeadDeeds IDE bar (half-screen coherent)
+ Bolt Quick-Actions + Control Keypad + Full Macro Studio
+ 4 Semantic Themes (Emerald, Pure OLED, Daylight Crisp, Navy)`,
  },
  'AGENTS.md': {
    brain: true,
    status: '',
    code: `# J.O.S.H.U.A. — Joint Operational Systems for Heuristic User Automation
- Designation: J.O.S.H.U.A.
- Operator: Brian Vasquez (@BrianV1981)
- Mandates: GitOps Worktrees (./aim fix), TDD First, Local-Only Memory Wiki`,
    oldDiff: `- Context cliff: 30% flat`,
    newDiff: `+ Dual AGY 30% Save/Handoff + 51.2% (512k) Compaction Cliff`,
  },
  'memory-wiki/index.md': {
    brain: true,
    status: 'M',
    code: `# Memory Wiki Index (Local-Only Sovereign Knowledge)
- [architecture/emerald-matrix.md] LeadDeeds #050505 + #00FFA3 design tokens
- [browser/cdp-leasing.md] Multi-subagent targetId isolation & session colors
- [security/3fa-e2ee.md] TOTP + WebAuthn Passkeys + PBKDF2 AES-GCM WebSocket`,
    oldDiff: `- Last indexed: 298 chunks`,
    newDiff: `+ Last indexed: 312 chunks (BM25 + LanceDB vector)`,
  },
  'src/emerald-theme.css': {
    brain: false,
    status: 'A',
    code: `:root[data-theme="emerald"] {
  --bg-canvas: #050505;
  --accent: #00FFA3;           /* LeadDeeds Signature Mint */
  --accent-secondary: #00B8FF; /* Cyber Cyan */
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}`,
    oldDiff: `/* New semantic theme token sheet */`,
    newDiff: `+ :root[data-theme="emerald"] { --bg-canvas: #050505; --accent: #00FFA3; }`,
  },
};

const PORTAL_TYPE_PHRASES = [
  'search_lancedb("30% context handoff rule")',
  'aim export-cartridge --out core.engram',
  'search_lancedb("cross-harness Grok + AGY")',
];

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/_:[]';

// Realistic Multi-Generation Project Reincarnations (10 on aim-connect, 6 on aim-ld, 5 on aim-tbsoftwash, 4 on aim-joshua, 3 on aim-youtube, 2 on academy, 1 on aim-calendar, 1 on aim-auditor = 40 Total!)
const SESSION_HISTORY_REINCARNATIONS = [
  // === AIM-CONNECT (10 SESSIONS — Cross-Harness Relay Race: AGY -> GROK -> OC -> CDX -> AGY) ===
  {
    id: '1f1f1dbb-0324-4f49-94e4-e6952cc9e3c1',
    gen: 'GEN #10',
    session: 'aim-connect',
    vessel: 'AGY',
    when: 'ACTIVE NOW',
    seal: 'LIVE WORKSPACE',
    isCurrent: true,
    turns: 24,
    tokens: '184k (18.4%)',
    title: 'Emerald Matrix Ecosystem Showcase, Colored Browser Pills & Draggable Split Resizer (#253–#255)',
    logPath: '~/.gemini/antigravity-cli/brain/1f1f1dbb-0324-4f49-94e4-e6952cc9e3c1/.system_generated/logs/transcript.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Promote the full A.I.M. Ecosystem—show 10-session project history, custom voice macros, aim-calendar caller recall, aim-joshua, and aim-youtube.' },
      { role: 'J.O.S.H.U.A.', text: 'Shipped #253–#255 (195/195 pytest) and wired 40 multi-generation history records, 120fps sliders, and live ecosystem tabs.' },
    ],
  },
  {
    id: 'd94b8c7f-203e-4d4a-b45d-82281fa884f5',
    gen: 'GEN #09',
    session: 'aim-connect',
    vessel: 'AGY',
    when: '2h ago · Baton Passed @ 29.8%',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 44,
    tokens: '298k (29.8%)',
    title: 'Co-Pilot CDP Browser Split-Pane, Favorites Bar, Tab Leasing & Self-Healing Maps (#240, #249–#251)',
    logPath: '~/.gemini/antigravity-cli/brain/d94b8c7f-203e-4d4a-b45d-82281fa884f5/.system_generated/logs/transcript.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Ship the Co-Pilot Browser split-pane, server-synced 0600 favorites.json bar, and global aim-browser SKILL.md symlinks.' },
      { role: 'J.O.S.H.U.A.', text: 'Shipped #240, #249, #250, #251 (193/193 pytest) and aim-browser#11/#12 (37/37 Jest) across AGY, Grok, and OpenCode.' },
    ],
  },
  {
    id: 'f454ef64-8821-4c09-9f1a-71bc92014c12',
    gen: 'GEN #08',
    session: 'aim-connect',
    vessel: 'GROK',
    when: 'Yesterday · Baton Passed @ 27.4%',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 31,
    tokens: '54.8k (27.4%)',
    title: 'AGY 512k Compaction Cliff Marker & 4h Sliding Active-User Session TTL (#246–#248)',
    logPath: '~/.aim/vault/grok_f454ef64_updates.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Picked up baton in Grok CLI—eliminate split-brain half-logout and add dual 30% + 51.2% cliff markers.' },
      { role: 'J.O.S.H.U.A.', text: 'Shipped touch_api_token() sliding 4h renewal and unified 401/1008 logout (188/188 pytest).' },
    ],
  },
  {
    id: '8debad3f-419c-49e2-9c11-60a911be0821',
    gen: 'GEN #07',
    session: 'aim-connect',
    vessel: 'OC',
    when: '2d ago · Baton Passed @ 28.9%',
    seal: 'BLACKBOX SEALED',
    isCurrent: false,
    turns: 36,
    tokens: '57.8k (28.9%)',
    title: '16KB/8ms PTY Frame Coalescing, uvloop/httptools & Zombie Socket Eviction (#241–#245)',
    logPath: '~/.aim/vault/opencode_8debad3f.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Switch to OpenCode and optimize mobile touch-wheel scrolling + WebSocket PTY throughput.' },
      { role: 'J.O.S.H.U.A.', text: 'Implemented _read_pty_coalesced() and text-framed ws_send_control_json() pong frames.' },
    ],
  },
  {
    id: 'd4bcfae0-7712-4b08-83aa-1904ff82a109',
    gen: 'GEN #06',
    session: 'aim-connect',
    vessel: 'AGY',
    when: '3d ago · Baton Passed @ 30.1%',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 39,
    tokens: '301k (30.1%)',
    title: '64-Char Secret Rotation, X-AIM-Loopback-Token & Scoped lsof LISTEN Health Checks (#234–#239)',
    logPath: '~/.gemini/antigravity-cli/brain/d4bcfae0-7712-4b08-83aa-1904ff82a109/.system_generated/logs/transcript.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Harden startup.sh lsof checks with -sTCP:LISTEN so reboots never kill active client browsers.' },
      { role: 'J.O.S.H.U.A.', text: 'Hardened startup.sh and shipped README v1.8.0 architecture update.' },
    ],
  },
  {
    id: '4beaa7e9-1102-44d9-9b30-7781cc092341',
    gen: 'GEN #05',
    session: 'aim-connect',
    vessel: 'CDX',
    when: '4d ago · Baton Passed @ 26.2%',
    seal: 'BLACKBOX SEALED',
    isCurrent: false,
    turns: 28,
    tokens: '52.4k (26.2%)',
    title: 'Per-JWT Plane B WebSocket AES-256-GCM Key Derivation & Loopback Email Relay (#231–#233)',
    logPath: '~/.aim/vault/codex_4beaa7e9.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Derive per-session transport keys so bwrap sandboxes never hold raw SMTP credentials.' },
      { role: 'J.O.S.H.U.A.', text: 'Shipped derive_session_transport_key() + HMAC loopback /api/sandbox/email-relay.' },
    ],
  },
  {
    id: 'f3d44ef2-9920-41bc-a712-00835d481920',
    gen: 'GEN #04',
    session: 'aim-connect',
    vessel: 'AGY',
    when: '5d ago · Compacted 1x -> Handed Off',
    seal: 'POST-CLIFF RECOVERY',
    isCurrent: false,
    turns: 58,
    tokens: '514k (51.4%)',
    title: 'Offline Piper + Edge Neural TTS Spoken Summaries (🔊) & Sticky-Red Compaction Detector (#222–#228)',
    logPath: '~/.gemini/antigravity-cli/brain/f3d44ef2-9920-41bc-a712-00835d481920/.system_generated/logs/transcript.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Add stat-cached CHECKPOINT compaction detection so we always see if an agent hit 512k.' },
      { role: 'J.O.S.H.U.A.', text: 'Shipped sticky-red .is-compacted badge + offline Piper neural voice synthesis.' },
    ],
  },
  {
    id: '97d9e2c1-5541-4098-b220-04403d388112',
    gen: 'GEN #03',
    session: 'aim-connect',
    vessel: 'GROK',
    when: '6d ago · Baton Passed @ 29.0%',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 41,
    tokens: '58.0k (29.0%)',
    title: 'SQLite WAL FTS5 Forensics Modal, 2-Step Tmux Swarm Dispatcher & WAITING Chimes (#212–#221)',
    logPath: '~/.aim/vault/grok_97d9e2c1.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Build cross-fleet SQLite FTS5 transcript search and aim-communicate swarm chalkboard.' },
      { role: 'J.O.S.H.U.A.', text: 'Shipped ForensicsModal.jsx + delta-cached fleet telemetry.' },
    ],
  },
  {
    id: '5acb30c8-3310-4e91-8812-1190ab442019',
    gen: 'GEN #02',
    session: 'aim-connect',
    vessel: 'AGY',
    when: 'Last Week · Baton Passed @ 29.5%',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 47,
    tokens: '295k (29.5%)',
    title: 'FleetSidebar, Cmd+K Command Palette, Scrollback Token Grabber & Monaco DiffEditor (#208–#211)',
    logPath: '~/.gemini/antigravity-cli/brain/5acb30c8-3310-4e91-8812-1190ab442019/.system_generated/logs/transcript.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Transform single-pane terminal into multi-session Fleet Cockpit with Monaco Git DiffEditor.' },
      { role: 'J.O.S.H.U.A.', text: 'Shipped FleetSidebar + HTTP 409 mtime file conflict guard.' },
    ],
  },
  {
    id: '994f108a-0019-4c77-9201-5acb30c00001',
    gen: 'GEN #01',
    session: 'aim-connect',
    vessel: 'OC',
    when: 'Nov 12 · Genesis Seal',
    seal: 'BLACKBOX SEALED',
    isCurrent: false,
    turns: 34,
    tokens: '51.2k (25.6%)',
    title: '112-File Open-Source Public Scrub, Dynamic WebAuthn RP_ID & 3FA TTY Bootstrap (#201–#207)',
    logPath: '~/.aim/vault/opencode_994f108a.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Decouple private config so BrianV1981/aim-connect ships 100% clean open-source MIT.' },
      { role: 'J.O.S.H.U.A.', text: 'Completed 112-file scrub + test_repo_shareability.py CI gate.' },
    ],
  },

  // === AIM-LD (6 SESSIONS) ===
  {
    id: '91ab44e0-5c12-44d8-a119-0092ff18c304',
    gen: 'GEN #06',
    session: 'aim-ld',
    vessel: 'AGY',
    when: 'ACTIVE NOW',
    seal: 'LIVE WORKSPACE',
    isCurrent: true,
    turns: 27,
    tokens: '342k (34.2%)',
    title: 'Zero-VLM Website Map Landmarks & Slot 13 Jacksonville Commercial Dossier (#544)',
    logPath: '~/.gemini/antigravity-cli/brain/91ab44e0-5c12-44d8-a119-0092ff18c304/.system_generated/logs/transcript.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Record self-healing zero-VLM landmarks on www.leaddeeds.com and verify Slot 13 dossier.' },
      { role: 'J.O.S.H.U.A.', text: '4 landmarks locked in 3.2ms; 27 dossiers queued for Monday 8:00 AM.' },
    ],
  },
  {
    id: 'd8691362-b86b-408d-8e3f-f1587cb3c372',
    gen: 'GEN #05',
    session: 'aim-ld',
    vessel: 'AGY',
    when: 'Yesterday · Baton Passed @ 29.4%',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 42,
    tokens: '294k (29.4%)',
    title: 'Website v2 Emerald Matrix Production Launch, FIG 1.0 Cutaway & $150->$30 Seat Calculator (#539)',
    logPath: '~/.gemini/antigravity-cli/brain/d8691362-b86b-408d-8e3f-f1587cb3c372/.system_generated/logs/transcript.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Merge PR #540 and verify all 14 public routes on www.leaddeeds.com.' }, { role: 'J.O.S.H.U.A.', text: '14/14 routes HTTP 200 · 726/726 pytest green.' }],
  },
  {
    id: 'c3d299e9-4410-4c12-9012-766dfac30004',
    gen: 'GEN #04',
    session: 'aim-ld',
    vessel: 'GROK',
    when: '2d ago · Baton Passed @ 28.1%',
    seal: 'BLACKBOX SEALED',
    isCurrent: false,
    turns: 33,
    tokens: '56.2k (28.1%)',
    title: '50k Address Canonicalizer (0.786s) & -81.4% HANDOFF.md Rolling-Window Compaction (#541–#543)',
    logPath: '~/.aim/vault/grok_c3d299e9.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Speed up canon_address across 50k records under 1 second.' }, { role: 'J.O.S.H.U.A.', text: 'Benchmarked 50,000 rows in 0.786s (726/726 pytest).' }],
  },
  {
    id: 'a5d2c48f-8821-4a09-9911-dff34a810003',
    gen: 'GEN #03',
    session: 'aim-ld',
    vessel: 'AGY',
    when: '3d ago · Baton Passed @ 30.0%',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 45,
    tokens: '300k (30.0%)',
    title: '10-Concept Design Lab Shootout (Concepts A–J) & Graduated Team Seat Pricing Model (#539)',
    logPath: '~/.gemini/antigravity-cli/brain/a5d2c48f/.system_generated/logs/transcript.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Spin up 10 live design concepts on :3099 so we can compare side by side.' }, { role: 'J.O.S.H.U.A.', text: 'Concept Emerald Matrix selected and promoted.' }],
  },
  {
    id: 'c7c2c69e-1029-4f88-8120-8f27184b0002',
    gen: 'GEN #02',
    session: 'aim-ld',
    vessel: 'OC',
    when: '4d ago · Baton Passed @ 24.5%',
    seal: 'BLACKBOX SEALED',
    isCurrent: false,
    turns: 26,
    tokens: '49k (24.5%)',
    title: 'Reboot-Proof 6:00 AM OS Cron Preflight & 6:30 AM Quiet Watchdog (#535–#536)',
    logPath: '~/.aim/vault/opencode_c7c2c69e.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Move morning audit wakeup to reboot-proof OS crontab.' }, { role: 'J.O.S.H.U.A.', text: 'Installed 0 6 * * * preflight + 30 6 * * * quiet watchdog.' }],
  },
  {
    id: '6c09d221-19b4-410e-88ef-5519ab20e771',
    gen: 'GEN #01',
    session: 'aim-ld',
    vessel: 'AGY',
    when: '5d ago · Genesis Seal',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 38,
    tokens: '288k (28.8%)',
    title: 'Subscriber-Gated leaddeeds.com/docs Hub & mcp.leaddeeds.com/sse Launch (#495)',
    logPath: '~/.gemini/antigravity-cli/brain/6c09d221/.system_generated/logs/transcript.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Launch subscriber docs hub and BYOA MCP SSE stream.' }, { role: 'J.O.S.H.U.A.', text: 'Deployed with HMAC gating and 7 live MCP tools.' }],
  },

  // === AIM-TBSOFTWASH (5 SESSIONS) ===
  {
    id: '77a19c05-3310-4b81-9910-61ba32600005',
    gen: 'GEN #05',
    session: 'aim-tbsoftwash',
    vessel: 'AGY',
    when: 'WAITING AT GATE',
    seal: 'LIVE WORKSPACE',
    isCurrent: true,
    turns: 19,
    tokens: '141k (14.1%)',
    title: 'Pinellas Barrel-Tile Roof Slider, Quote Builder QA & Staging Promotion Gate (#231)',
    logPath: '~/.gemini/antigravity-cli/brain/77a19c05/.system_generated/logs/transcript.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Verify Pinellas roof slider + Clearwater quote builder and hold before Bluehost deploy.' }, { role: 'J.O.S.H.U.A.', text: 'All checks green—holding steady at [y/n] gate.' }],
  },
  {
    id: '300cb83f-2219-4d01-8831-6fc666200004',
    gen: 'GEN #04',
    session: 'aim-tbsoftwash',
    vessel: 'AGY',
    when: 'Yesterday · Baton Passed @ 28.6%',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 37,
    tokens: '286k (28.6%)',
    title: 'Pass 5 Grade A+ Security Audit (11/11 Closed) & 36-Month Roof/Paver Recall Engine (#220–#224)',
    logPath: '~/.gemini/antigravity-cli/brain/300cb83f/.system_generated/logs/transcript.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Close all 11 TBS audit items and set roof + Trident paver recall to 36 months.' }, { role: 'J.O.S.H.U.A.', text: '11/11 closed -> Audit Grade A+.' }],
  },
  {
    id: '661883b7-9012-4e11-a120-440e78400003',
    gen: 'GEN #03',
    session: 'aim-tbsoftwash',
    vessel: 'GROK',
    when: '3d ago · Baton Passed @ 26.0%',
    seal: 'BLACKBOX SEALED',
    isCurrent: false,
    turns: 29,
    tokens: '52k (26.0%)',
    title: 'Pull-Only Accounting Safety Lock (#214) & .htaccess Web-Root Hardening (#212)',
    logPath: '~/.aim/vault/grok_661883b7.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Enforce strict pull-only read lock on accounting sync.' }, { role: 'J.O.S.H.U.A.', text: 'Non-GET endpoints locked with HTTP 423 safety guard.' }],
  },
  {
    id: '5bd421f9-1184-4c09-8821-4dcad4300002',
    gen: 'GEN #02',
    session: 'aim-tbsoftwash',
    vessel: 'AGY',
    when: '5d ago · Baton Passed @ 29.9%',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 43,
    tokens: '299k (29.9%)',
    title: 'Scoped Site Navbar CSS Across 40 Pinellas/Hillsborough City Pages & Tap-to-Text (#199–#207)',
    logPath: '~/.gemini/antigravity-cli/brain/5bd421f9/.system_generated/logs/transcript.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Scope body > nav CSS and verify all 40 city landing pages.' }, { role: 'J.O.S.H.U.A.', text: '40/40 city pages verified HTTP 200.' }],
  },
  {
    id: 'b063ad8c-7710-4a12-9001-c4090fe00001',
    gen: 'GEN #01',
    session: 'aim-tbsoftwash',
    vessel: 'OC',
    when: 'Last Week · Genesis Seal',
    seal: 'BLACKBOX SEALED',
    isCurrent: false,
    turns: 31,
    tokens: '48k (24.0%)',
    title: 'Zero-Agent Mon/Wed/Fri 8:10 AM Scheduled Blog Drip & Universal GA4 (#192–#194)',
    logPath: '~/.aim/vault/opencode_b063ad8c.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Automate Mon/Wed/Fri 8:10 AM SEO article drip with zero LLM cron cost.' }, { role: 'J.O.S.H.U.A.', text: 'Shipped deterministic Python drip publisher.' }],
  },

  // === AIM-JOSHUA (4 SESSIONS) ===
  {
    id: 'aa0419e2-8810-4d21-9104-1140ab990004',
    gen: 'GEN #04',
    session: 'aim-joshua',
    vessel: 'GROK',
    when: 'ACTIVE NOW',
    seal: 'LIVE WORKSPACE',
    isCurrent: true,
    turns: 16,
    tokens: '44k (22.0%)',
    title: 'Cross-Harness LanceDB MCP Auto-Registration (AGY, Grok, OpenCode, Codex, Claude) — v1.1.4',
    logPath: '~/.aim/vault/grok_aa0419e2.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Verify 3.6ms hybrid recall across Grok and Antigravity on shared memory_lance.' }, { role: 'J.O.S.H.U.A.', text: '64/64 multi-harness tests passing.' }],
  },
  {
    id: 'aa0319e2-7710-4d21-9104-1140ab990003',
    gen: 'GEN #03',
    session: 'aim-joshua',
    vessel: 'AGY',
    when: '2d ago · Baton Passed @ 27.8%',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 35,
    tokens: '278k (27.8%)',
    title: 'Native Windows 11 PowerShell Installer (install.ps1) & Co-Agent Persona Forge',
    logPath: '~/.gemini/antigravity-cli/brain/aa0319e2/.system_generated/logs/transcript.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Bring 100% parity between install.sh on Linux/WSL and install.ps1 on Windows 11.' }, { role: 'J.O.S.H.U.A.', text: 'Verified clean Option A/B/C installers across OSes.' }],
  },
  {
    id: 'aa0219e2-6610-4d21-9104-1140ab990002',
    gen: 'GEN #02',
    session: 'aim-joshua',
    vessel: 'OC',
    when: '5d ago · Baton Passed @ 25.1%',
    seal: 'BLACKBOX SEALED',
    isCurrent: false,
    turns: 29,
    tokens: '50.2k (25.1%)',
    title: 'Portable Parquet Datajack (.engram) Knowledge Cartridges & Blackbox Seal CLI',
    logPath: '~/.aim/vault/opencode_aa0219e2.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Package domain memory into portable .engram cartridges.' }, { role: 'J.O.S.H.U.A.', text: 'Shipped zero-loss Parquet cartridge export/import.' }],
  },
  {
    id: 'aa0119e2-5510-4d21-9104-1140ab990001',
    gen: 'GEN #01',
    session: 'aim-joshua',
    vessel: 'AGY',
    when: 'Nov 10 · Genesis Seal',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 40,
    tokens: '291k (29.1%)',
    title: '10-Section Sovereign AGENTS.md Exoskeleton, GitOps Worktrees (./aim fix) & 30% Rule',
    logPath: '~/.gemini/antigravity-cli/brain/aa0119e2/.system_generated/logs/transcript.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Codify GitOps worktree isolation and the 30% handoff rule.' }, { role: 'J.O.S.H.U.A.', text: 'v1.0 Exoskeleton shipped.' }],
  },

  // === AIM-YOUTUBE (3 SESSIONS) ===
  {
    id: 'yt0388a1-4410-4c90-8120-9910ff120003',
    gen: 'GEN #03',
    session: 'aim-youtube',
    vessel: 'OC',
    when: 'ACTIVE NOW',
    seal: 'LIVE WORKSPACE',
    isCurrent: true,
    turns: 14,
    tokens: '25k (12.5%)',
    title: '492 Indexed Videos, 1,444 LanceDB Fragments & 38/38 Spoke Summaries Verified (82/82 Pytest)',
    logPath: '~/.aim/vault/opencode_yt0388a1.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Verify spoke summaries feeding aim-tbsoftwash-content and aim-ld-content.' }, { role: 'J.O.S.H.U.A.', text: '38/38 active spoke summaries linted with 0 errors.' }],
  },
  {
    id: 'yt0288a1-3310-4c90-8120-9910ff120002',
    gen: 'GEN #02',
    session: 'aim-youtube',
    vessel: 'AGY',
    when: '3d ago · Baton Passed @ 28.4%',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 33,
    tokens: '284k (28.4%)',
    title: 'Central DRY Research Hub Migration & Zero-Symlink Repo Hygiene Gate',
    logPath: '~/.gemini/antigravity-cli/brain/yt0288a1/.system_generated/logs/transcript.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Consolidate cross-channel research into one DRY source of truth.' }, { role: 'J.O.S.H.U.A.', text: '82/82 hygiene + deliverable tests green.' }],
  },
  {
    id: 'yt0188a1-2210-4c90-8120-9910ff120001',
    gen: 'GEN #01',
    session: 'aim-youtube',
    vessel: 'GROK',
    when: 'Last Week · Genesis Seal',
    seal: 'BLACKBOX SEALED',
    isCurrent: false,
    turns: 27,
    tokens: '46k (23.0%)',
    title: 'Long-Form Transcript Chapter Parser & Automated Mega-Guide SOP Pipeline',
    logPath: '~/.aim/vault/grok_yt0188a1.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Build deterministic chapter & SOP extraction from technical masterclasses.' }, { role: 'J.O.S.H.U.A.', text: 'Pipeline live and indexed into LanceDB.' }],
  },

  // === TBSOFTWASH-ACADEMY (2 SESSIONS) ===
  {
    id: 'ac0299b1-1120-4a80-9001-7712cc000002',
    gen: 'GEN #02',
    session: 'tbsoftwash-academy',
    vessel: 'AGY',
    when: 'ACTIVE NOW',
    seal: 'LIVE WORKSPACE',
    isCurrent: true,
    turns: 18,
    tokens: '168k (16.8%)',
    title: 'Module 04 12V vs. AODD Audio SOPs & Printable 186-SKU Rig BOM PDF Export',
    logPath: '~/.gemini/antigravity-cli/brain/ac0299b1/.system_generated/logs/transcript.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Export printable 186-SKU Rig BOM PDF to artifacts/.' }, { role: 'J.O.S.H.U.A.', text: 'Streaming 24.0 MB PDF via CDP --dlpath.' }],
  },
  {
    id: 'ac0199b1-0010-4a80-9001-7712cc000001',
    gen: 'GEN #01',
    session: 'tbsoftwash-academy',
    vessel: 'AGY',
    when: '4d ago · Genesis Seal',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 36,
    tokens: '290k (29.0%)',
    title: 'Passwordless Magic-Link Cloud Sync, 16 Quizzes & /verify/TBSA-2026 Certificate Lookup',
    logPath: '~/.gemini/antigravity-cli/brain/ac0199b1/.system_generated/logs/transcript.jsonl',
    sampleTurns: [{ role: 'OPERATOR', text: 'Launch headless Next.js Academy with cloud progress sync.' }, { role: 'J.O.S.H.U.A.', text: 'Deployed to academy.tbsoftwash.com.' }],
  },

  // === AIM-TBSOFTWASH-CONTENT (3 SESSIONS — CLI-Only Spoke Agent, Zero Browser) ===
  {
    id: 'tc0391a4-7710-4b22-9180-5510ef110003',
    gen: 'GEN #03',
    session: 'aim-tbsoftwash-content',
    vessel: 'AGY',
    when: 'ACTIVE NOW (CLI)',
    seal: 'LIVE WORKSPACE',
    isCurrent: true,
    turns: 15,
    tokens: '152k (15.2%)',
    title: 'Belleair Bluffs, Seminole & Tierra Verde 2,200-Word ARMA Roof Soft Wash Guides + Drip Queue',
    logPath: '~/.gemini/antigravity-cli/brain/tc0391a4/.system_generated/logs/transcript.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Pull barrel-tile spoke research from aim-youtube and queue Belleair Bluffs, Seminole & Tierra Verde for Mon/Wed/Fri 8:10 AM.' },
      { role: 'J.O.S.H.U.A.', text: 'Generated 3 schema-validated HTML guides and verified 42/42 internal city links in pure CLI mode.' },
    ],
  },
  {
    id: 'tc0291a4-6610-4b22-9180-5510ef110002',
    gen: 'GEN #02',
    session: 'aim-tbsoftwash-content',
    vessel: 'OC',
    when: '3d ago · Baton Passed @ 27.1%',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 22,
    tokens: '54.2k (27.1%)',
    title: 'Trident CAT-5 Urethane Paver Sealing Authority Guides Across 12 North Pinellas Cities',
    logPath: '~/.aim/vault/opencode_tc0291a4.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Build ASTM C-144 joint sand + Trident Cat-5 urethane guides with strict zero-competitor lint.' },
      { role: 'J.O.S.H.U.A.', text: '12/12 city guides linted and scheduled with FAQPage JSON-LD.' },
    ],
  },
  {
    id: 'tc0191a4-5510-4b22-9180-5510ef110001',
    gen: 'GEN #01',
    session: 'aim-tbsoftwash-content',
    vessel: 'AGY',
    when: 'Last Week · Genesis Seal',
    seal: 'BLACKBOX SEALED',
    isCurrent: false,
    turns: 19,
    tokens: '240k (24.0%)',
    title: '40-City Internal Anchor Matrix & Deterministic WordPress REST Drip Publisher',
    logPath: '~/.gemini/antigravity-cli/brain/tc0191a4/.system_generated/logs/transcript.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Map every Pinellas & Hillsborough service/city slug so articles never 404 internal links.' },
      { role: 'J.O.S.H.U.A.', text: 'Built content_gap_matrix.py and verified 100% HTTP-200 internal anchor map.' },
    ],
  },

  // === TBSOFTWASH-AI-BOOK (4 SESSIONS — CLI-Only Manuscript & XeLaTeX Builder) ===
  {
    id: 'bk0412c9-8820-4c11-a012-7721dd000004',
    gen: 'GEN #04',
    session: 'tbsoftwash-ai-book',
    vessel: 'OC',
    when: 'ACTIVE NOW (CLI)',
    seal: 'LIVE WORKSPACE',
    isCurrent: true,
    turns: 17,
    tokens: '39k (19.5%)',
    title: 'Chapter 11 Sovereign Local Agents + 248-Page 6x9 Print PDF & EPUB3 Build (68,420 Words)',
    logPath: '~/.aim/vault/opencode_bk0412c9.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Deduplicate Ch08 caller recall story, finish Ch11, and compile the 6x9 print PDF via XeLaTeX.' },
      { role: 'J.O.S.H.U.A.', text: 'Compiled 248-page PDF + EPUB3 (68,420 words) with 0 LaTeX warnings.' },
    ],
  },
  {
    id: 'bk0312c9-7720-4c11-a012-7721dd000003',
    gen: 'GEN #03',
    session: 'tbsoftwash-ai-book',
    vessel: 'AGY',
    when: '2d ago · Baton Passed @ 28.5%',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 28,
    tokens: '285k (28.5%)',
    title: 'Chapters 07–10: Voice Dictation on the Truck, Repeat-Caller MMS Vault & Automated SEO Drips',
    logPath: '~/.gemini/antigravity-cli/brain/bk0312c9/.system_generated/logs/transcript.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Ground Chapters 7–10 in real field operations from Tampa Bay Soft Wash—no generic AI hype.' },
      { role: 'J.O.S.H.U.A.', text: 'Drafted 24,600 words from verified field logs and daily_notes case studies.' },
    ],
  },
  {
    id: 'bk0212c9-6620-4c11-a012-7721dd000002',
    gen: 'GEN #02',
    session: 'tbsoftwash-ai-book',
    vessel: 'GROK',
    when: '5d ago · Baton Passed @ 26.4%',
    seal: 'BLACKBOX SEALED',
    isCurrent: false,
    turns: 23,
    tokens: '52.8k (26.4%)',
    title: 'Chapters 04–06: Why Context Windows Rot at 30% & The Multi-Harness Baton Pass Pattern',
    logPath: '~/.aim/vault/grok_bk0212c9.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Explain the 30% context rule in plain operator English with real diagrams.' },
      { role: 'J.O.S.H.U.A.', text: 'Completed Chapters 4–6 + ASCII/TikZ context-rot diagrams.' },
    ],
  },
  {
    id: 'bk0112c9-5520-4c11-a012-7721dd000001',
    gen: 'GEN #01',
    session: 'tbsoftwash-ai-book',
    vessel: 'AGY',
    when: 'Nov 11 · Genesis Seal',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 21,
    tokens: '255k (25.5%)',
    title: '12-Chapter Book Architecture, Voice/Style Bible & Automated Duplicate-Story Linter',
    logPath: '~/.gemini/antigravity-cli/brain/bk0112c9/.system_generated/logs/transcript.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Scaffold the 12-chapter outline and build manuscript_lint.py so chapters never repeat stories.' },
      { role: 'J.O.S.H.U.A.', text: 'Created chapters 01–03 + n-gram duplicate story detector.' },
    ],
  },

  // === AIM-CALENDAR (1 SESSION — Single Fresh Generation!) ===
  {
    id: 'ca0177d4-9901-4e12-8821-3310aa880001',
    gen: 'GEN #01',
    session: 'aim-calendar',
    vessel: 'AGY',
    when: 'ACTIVE NOW (1ST GEN)',
    seal: 'LIVE WORKSPACE',
    isCurrent: true,
    turns: 9,
    tokens: '108k (10.8%)',
    title: 'Instant Repeat-Caller Dossier Lookup: Diarized Call Audio + Quote History + 20 MMS Photos',
    logPath: '~/.gemini/antigravity-cli/brain/ca0177d4/.system_generated/logs/transcript.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Who just called from (727) 555-0194? Pull their past quote history, address, MMS photos, and what we charged them.' },
      { role: 'J.O.S.H.U.A.', text: 'Matched Evelyn Harper (Clearwater Lot 214) — $300 check payment on Nov 11, 2024 + 11 Before & 9 After MMS photos.' },
    ],
  },

  // === AIM-AUDITOR (2 SESSIONS — CLI-Only Hostile Truth Auditor) ===
  {
    id: 'au0255f9-4401-4b99-9110-8821cc770002',
    gen: 'GEN #02',
    session: 'aim-auditor',
    vessel: 'AGY',
    when: 'DUE FOR /HANDOFF (47.8%)',
    seal: '512K CLIFF WARNING',
    isCurrent: true,
    turns: 32,
    tokens: '478k (47.8%)',
    title: 'Hostile Product-Truth Audit Pass 36 Across aim-connect, aim-joshua & aim-youtube (Grade A)',
    logPath: '~/.gemini/antigravity-cli/brain/au0255f9/.system_generated/logs/transcript.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Audit aim-connect against every claim in README.md—grade brutally from F to A+.' },
      { role: 'J.O.S.H.U.A.', text: 'Pass 36 verified empirically at Grade A. Context at 47.8%—ready for /aim-handoff.' },
    ],
  },
  {
    id: 'au0155f9-3301-4b99-9110-8821cc770001',
    gen: 'GEN #01',
    session: 'aim-auditor',
    vessel: 'GROK',
    when: '4d ago · Baton Passed @ 29.2%',
    seal: 'BLACKBOX SEALED + WIKI',
    isCurrent: false,
    turns: 25,
    tokens: '58.4k (29.2%)',
    title: 'Passes 1–20 Baseline Truth Matrix & Living Single-File AUDIT_<SLUG>.md Enforcement',
    logPath: '~/.aim/vault/grok_au0155f9.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Enforce living in-place AUDIT_<SLUG>.md files—never dated _AUDIT2 or _REAUDIT clutter.' },
      { role: 'J.O.S.H.U.A.', text: 'Consolidated all repo audits into single living artifacts with empirical pytest gates.' },
    ],
  },
];

// Domain-Specific Engineering Turn Weaver — Guarantees 100% Exact Turn Parity (TURNS (N) === N Full Rendered Exchanges!)
const PROJECT_TURN_WORKFLOWS = {
  'aim-connect': [
    ['Check ./aim projects board and verify backend pytest baseline before touching worktrees.', 'Bash(./aim projects board && pytest -q) -> 195 passed in 2.24s', 'Kanban board synced and all backend security, E2EE, and shareability tests are green on master.'],
    ['Inspect how TerminalPane.jsx and BrowserPane.jsx handle resize events when dragging the split divider.', 'Read(frontend/src/components/BrowserPane.jsx, TerminalPane.jsx)', 'Traced ResizeObserver timing—throttling fitAddon.fit() inside requestAnimationFrame prevents xterm reflow jitter.'],
    ['Spawn an isolated git worktree so we never develop directly on master.', 'Bash(./aim fix -> workspace/issue-worktree)', 'Isolated worktree created cleanly under workspace/ with fresh branch tracking origin/master.'],
    ['Write failing regression tests first per our TDD mandate before editing route handlers.', 'Edit(backend/tests/test_browser_leases.py) · 4 new assertions', 'Added four failing TDD assertions covering session lease colors, 6.0s HUD staleness, and loopback token auth.'],
    ['Wire the implementation across FastAPI and React and verify zero lint warnings.', 'Edit(backend/routes_browser.py, frontend/src/App.jsx) + npx oxlint', 'Implementation wired cleanly with zero oxlint warnings and all new unit tests passing.'],
    ['Check mobile 390px viewport behavior—make sure none of the header pills overflow or wrap awkwardly.', 'aim-browser --tab ui-check --resize 390 844 --check-layout -> 0px overflow', 'Verified zero horizontal overflow on 390px Android viewport and half-screen desktop split mode.'],
    ['Double-check test_repo_shareability.py so no local paths, IPs, or private tokens ever leak to public GitHub.', 'pytest backend/tests/test_repo_shareability.py -q -> 14 passed', 'Shareability gate passed 100 percent—zero private identifiers, hostnames, or secrets in tracked files.'],
    ['Test WebSocket Plane B AES-256-GCM frame coalescing under rapid scrollback burst.', 'pytest backend/tests/test_ws_e2ee.py -q -> 31 passed in 0.62s', 'Confirmed 16KB / 8ms PTY coalescing holds steady at 60fps with per-JWT derived GCM keys.'],
    ['Sync architectural notes into local memory-wiki/ and re-index LanceDB.', 'Edit(memory-wiki/index.md) && ./aim index -> 312 hybrid chunks', 'Updated local memory-wiki and refreshed all 312 BM25 + vector chunks in LanceDB.'],
    ['Run full pre-promote gatekeeper suite and prepare clean HANDOFF.md checkpoint.', 'pytest -q && npm run build -> 195 passed · dist/ bundle clean', 'Full backend and production Vite bundle passed with zero warnings; HANDOFF.md updated in place.'],
  ],
  'aim-ld': [
    ['Check overnight 6:00 AM preflight logs and confirm all public commercial filing collectors finished green.', 'Read(logs/cron_preflight.log) -> 0 errors · 100% counties synced', 'Overnight 6:00 AM preflight completed cleanly across all Florida commercial filing feeds.'],
    ['Query LanceDB for any duplicate entity officer phones before running Monday dossier enrichment.', 'mcp_search_lancedb("entity officer dedupe canonicalizer") · 3.5ms', 'Retrieved entity graph deduplication rules in 3.5ms; phone and registered-agent normalization active.'],
    ['Write benchmark + unit tests for address canonicalization edge cases (suites, BLDG, US Hwy).', 'Edit(tests/test_canon_address.py) + pytest -q -> 726 passed', 'Added suite/highway canonicalization cases—all 726 tests pass and 50k rows complete in 0.786s.'],
    ['Verify all 14 public routes on www.leaddeeds.com including /pricing and the 6 commercial vertical pages.', 'aim-browser --tab ld-qa --open https://www.leaddeeds.com/pricing --check-layout', 'All 14 public routes returned HTTP 200 with zero layout overflow and sub-5ms landmark locks.'],
    ['Make sure zero proprietary pipeline internals appear anywhere in public marketing copy or docs.', 'Grep(public/, templates/) -> 0 moat leaks · public copy 100% clean', 'Audited every public template and route—zero proprietary classifier or internal source leaks.'],
    ['Verify Graduated Team Seat Calculator math ($150, $120, $95, $75, $50, $30+ floor) matches Stripe checkout.', 'pytest tests/test_pricing_ladder.py -q -> 24 passed', 'Confirmed client slider and server billing tiers match to the dollar from 1 to 25+ seats.'],
  ],
  'aim-tbsoftwash': [
    ['Pull open TBS audit items and check git worktree status before editing theme templates.', 'Read(artifacts/AUDIT_TBSOFTWASH.md) · 40 city pages tracked', 'Loaded TBS audit checklist covering navbar scoping, 36m recall cadence, and pull-only accounting lock.'],
    ['Verify ARMA roof soft wash dilution copy and 36-month warranty badge across Pinellas city templates.', 'Grep("36-Month|ARMA", templates/cities/) -> 40/40 city templates aligned', 'Confirmed all 40 Pinellas and Hillsborough city templates display consistent 36-month roof warranty terms.'],
    ['Test pull-only accounting sync lock so no script can ever mutate remote invoice records.', 'pytest tests/test_accounting_lock.py -> HTTP 423 enforced on POST/PUT/DELETE', 'Verified strict read-only lock—every non-GET request is rejected before touching network transport.'],
    ['Inspect mobile tap-to-call and SMS quote drawer on 390px iPhone/Android widths.', 'aim-browser --tab tbs-mobile --resize 390 844 --open https://tbsoftwash.com', 'Verified sticky mobile quote CTA, before/after roof slider, and tap-to-text links at 390px.'],
  ],
  'aim-joshua': [
    ['VerifyAGENTS.md 10-section exoskeleton parity between Linux/WSL bash and Windows 11 PowerShell.', 'pytest tests/test_exoskeleton_parity.py -q -> 64/64 passed', 'Confirmed 100 percent parity across install.sh, install.ps1, and ./aim GitOps wrapper scripts.'],
    ['Test MCP auto-registration across Antigravity, Grok CLI, OpenCode, and Codex config paths.', 'python3 joshua_os/.aim_core/mcp_register.py --dry-run --all', 'All four harnesses resolved identical LanceDB vector + BM25 hybrid tables without path collisions.'],
    ['Benchmark cold vs warm hybrid search latency on 1,500+ markdown & code chunks.', 'python3 joshua_os/.aim_core/aim_cli.py search "worktree mandate" -> 3.6ms', 'Warm hybrid BM25 + vector recall clocked 3.6ms locally at zero API token cost.'],
  ],
  'aim-youtube': [
    ['Scan incoming masterclass chapter markers and strip sponsor read boilerplate before chunking.', 'python3 scripts/clean_transcript.py --strip-sponsors -> 48m clean text', 'Cleaned chapter boundaries and stripped ad segments while preserving exact video timestamps.'],
    ['Re-index LanceDB fragments and lint all 38 downstream spoke research summaries.', 'python3 scripts/lint_deliverable.py --all-active -> 82/82 pytest green', 'All 38 spoke deliverables passed citation, timestamp, and zero-symlink hygiene checks.'],
  ],
  'aim-calendar': [
    ['Search diarized call transcripts and daily_notes for caller phone, street name, or lot number.', 'mcp_search_lancedb("caller phone daily_notes mms") -> 4.1ms match', 'Matched historical call audio, quoted price, check payment date, and inbound/outbound MMS photo filenames.'],
    ['Cross-check MMS attachment folder to verify before-and-after photo counts and timestamps.', 'Read(conversations/mms_manifest.json) -> 11 before + 9 after JPEGs verified', 'Confirmed all twenty high-resolution property photos are intact on local NVMe storage.'],
  ],
};

function getFullSessionTurns(h) {
  if (h._cachedFullTurns && h._cachedFullTurns.length === h.turns) return h._cachedFullTurns;
  const total = Math.max(2, Number(h.turns) || 10);
  const pool = PROJECT_TURN_WORKFLOWS[h.session] || PROJECT_TURN_WORKFLOWS['aim-connect'];
  const basePairs = h.sampleTurns || [];
  const firstOp = basePairs[0]?.text || `Initialize ${h.gen} on ${h.session} (${h.vessel}) for: ${h.title}`;
  const lastAg = basePairs[1]?.text || `Completed ${h.title} and verified clean test suite for ${h.gen}.`;

  const list = [];
  for (let i = 0; i < total; i++) {
    const stepNum = i + 1;
    const mins = 8 + i * 3;
    const hh = String(9 + Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    const ss = String((i * 17 + 11) % 60).padStart(2, '0');
    const stamp = `${hh}:${mm}:${ss}`;

    if (i === 0) {
      list.push({
        idx: stepNum,
        stamp,
        operator: firstOp,
        tool: `Read(HANDOFF.md, AGENTS.md) · attached ${h.vessel} session ${h.id.slice(0, 8)}`,
        agent: `Loaded ${h.session} project brain and prior baton context cleanly. Ready to execute ${h.title}.`,
      });
    } else if (i === total - 1) {
      list.push({
        idx: stepNum,
        stamp,
        operator: h.isCurrent
          ? `Summarize current ${h.gen} status and keep workspace ready for live directives.`
          : `Context is at ${h.tokens}—update memory-wiki/, write HANDOFF.md in place, and seal ${h.gen} to the blackbox vault.`,
        tool: h.isCurrent
          ? `git status -sb · live ${h.vessel} workspace healthy (${h.tokens})`
          : `./aim index && aim blackbox --session-id ${h.id.slice(0, 8)} -> 0600 sealed`,
        agent: lastAg,
      });
    } else {
      const [opTpl, toolTpl, agTpl] = pool[(i - 1) % pool.length];
      const phaseTag = i % 4 === 0 ? ` [Pass ${Math.ceil(i / 4)} check]` : '';
      list.push({
        idx: stepNum,
        stamp,
        operator: `${opTpl}${phaseTag}`,
        tool: toolTpl,
        agent: agTpl,
      });
    }
  }
  h._cachedFullTurns = list;
  return list;
}

const state = {
  isLocked: false,
  lockPin: '',
  lockName: 'Brian Vasquez',
  lockPassVisible: false,
  lockE2eeVisible: false,
  theme: localStorage.getItem('proto-v2-theme') || 'emerald',
  device: 'desktop',
  showSidebar: true,
  sessions: [...INITIAL_SESSIONS],
  activeTool: 'browser', // 'none' | 'browser' | 'files'
  layoutMode: 'split',   // 'split' | 'full'
  splitPct: 48,
  activeSession: 'aim-connect', // Starts on aim-connect (10 sessions!) or '' = Sovereign Homepage
  lastScrolledSession: '',
  tmuxGridMode: true,
  tmuxActivePane: 0,
  tmuxPaneLogs: {},
  showHistory: false,
  historyScope: 'project',
  historyVesselFilter: 'ALL',
  historySearch: '',
  expandedHistoryIds: ['1f1f1dbb-0324-4f49-94e4-e6952cc9e3c1'],
  copiedHistoryId: '',
  exportedFlightId: '',
  showScrollCopy: false,
  scrollPlainMode: false,
  scrollCopyBadge: '',
  scrollSearchQuery: '',
  scrollMatchIdx: 0,
  pasteBadge: '',
  showOnScreenKeyboard: false,
  keyboardMode: 'standard', // 'standard' | 'hacker'
  kbLayer: 'abc',           // 'abc' | 'sym' | 'fn'
  kbShift: 0,               // 0=off, 1=shift, 2=caps
  kbCtrl: false,
  filter: 'all',
  search: '',
  browserDaemon: true,
  browserTabs: [...INITIAL_BROWSER_TABS],
  activeBrowserTab: 'tab-ld',
  browserFavorites: [
    { id: 'fav-1', title: 'LeadDeeds.com', url: 'https://www.leaddeeds.com', tabId: 'tab-ld' },
    { id: 'fav-2', title: 'TBSoftWash.com', url: 'https://tbsoftwash.com', tabId: 'tab-tb' },
    { id: 'fav-3', title: 'Caller Dossier', url: 'http://127.0.0.1:8040/dossier/727-555-0194', tabId: 'tab-calendar' },
    { id: 'fav-4', title: 'aim-joshua OS', url: 'https://github.com/BrianV1981/aim-joshua', tabId: 'tab-joshua' },
    { id: 'fav-5', title: 'aim-youtube Hub', url: 'http://127.0.0.1:8055/library/spokes', tabId: 'tab-youtube' },
    { id: 'fav-6', title: 'SoftWash Academy', url: 'https://academy.tbsoftwash.com/course', tabId: 'tab-academy' },
  ],
  ldSeatCount: 6,
  roofSliderPct: 52,
  dlProgress: 68,
  mapScanIdx: 0,
  portalPhraseIdx: 0,
  portalCharIdx: 12,
  controlMode: false,
  showBrowser2faBar: false,
  showTouchKeys: false,
  micEnabled: false,
  speakEnabled: true,
  unreadSessions: ['aim-auditor', 'aim-calendar'],
  skillFlash: {},

  // Operator Reply Visibility & Chat-Box Dot Alignment
  operatorStyle: localStorage.getItem('proto-op-style') || 'cyan', // 'cyan' | 'gold' | 'emerald' | 'grey'
  operatorSide: localStorage.getItem('proto-op-side') || 'right',  // 'right' | 'left'

  // All SettingsModal.jsx + IntegrationsModal.jsx state
  settingsTab: 'appearance', // 'appearance' | 'keyboard' | 'voice' | 'integrations' | 'security'
  termFontSize: 13,
  termPalette: 'match',      // 'match' | 'standard' | 'hacker' | 'contrast'
  autoCaps: true,
  alertChime: true,
  kbFeedback: 'ticks',       // 'ticks' | 'haptic' | 'off'
  voiceAutoRead: true,
  ttsVoice: 'piper:en_US-lessac-medium',
  voiceContinuous: true,
  voiceAutoEnter: true,
  voiceAutoSend: true,
  voiceAutoExecute: false,
  voiceAutoCapitalize: true,
  voiceSlashes: true,
  e2eeSecret: 'sovereign-mesh-aes256-key',
  showE2eeSecret: false,
  passkeys: ['Windows Hello // Workstation', 'Pixel 9 Pro // Biometric'],
  vaultEmail: 'operator@example.com',
  vaultAppPass: 'xxxx-xxxx-xxxx-xxxx',
  vaultSavedBadge: '',

  // Full 22-Macro Library + Macro Studio State
  macros: [...INITIAL_MACROS],
  macroFilter: 'all', // 'all' | 'pinned' | 'voice' | 'server'
  macroSearch: '',
  macroReturnToVoice: false,
  editingMacroId: null,
  macroForm: { label: '', cmd: '', voiceTrigger: '', isServer: true, pinned: true },

  // Token Grabber State
  grabTab: 'all', // 'all' | 'url' | 'path' | 'ip' | 'sha'
  grabSearch: '',

  // Forensics & Swarm State
  forensicsTab: 'turns', // 'turns' | 'fts5' | 'swarm'
  expandedTurns: ['turn-19'],
  ftsMode: 'fts5', // 'fts5' | 'brain'
  ftsQuery: '',
  swarmFeed: [...INITIAL_SWARM_FEED],
  swarmTarget: 'aim-connect',

  // Files & Git Diff State
  filesNavMode: 'files', // 'files' | 'git'
  activeFile: 'HANDOFF.md',
  fileConflictBanner: false,
  fileSavedBadge: '',

  // Cmd+K Search & Delete / Spawn Session Modals
  cmdkQuery: '',
  sessionToDelete: '',
  popover: null, // 'bolt' | null
  modal: null,   // 'cmdk' | 'settings' | 'macros' | 'grab' | 'forensics' | 'delete-sess' | 'spawn-sess' | null
  hudStep: 0,
  deferredPrompt: null,
  sentMessages: {},
  stagedAttachments: {},
  shotFlash: false,
  extBrowserFlash: false,
  browserDownloads: [
    {
      id: 'dl-1',
      name: 'TBSA_186_SKU_Rig_BOM_v2.pdf',
      agent: 'tbsoftwash-academy',
      size: '24.0 MB',
      status: 'streaming',
      when: 'Streaming now',
      path: '~/Downloads/aim-browser/TBSA_186_SKU_Rig_BOM_v2.pdf',
    },
    {
      id: 'dl-2',
      name: 'Slot13_Jacksonville_Commercial_Dossier.csv',
      agent: 'aim-ld',
      size: '1.8 MB',
      status: 'done',
      when: '4m ago',
      path: '~/Downloads/aim-browser/Slot13_Jacksonville_Commercial_Dossier.csv',
    },
    {
      id: 'dl-3',
      name: 'Clearwater_Lot214_20_MMS_Archive.zip',
      agent: 'aim-calendar',
      size: '18.4 MB',
      status: 'done',
      when: '19m ago',
      path: '~/Downloads/aim-browser/Clearwater_Lot214_20_MMS_Archive.zip',
    },
    {
      id: 'dl-4',
      name: 'Pinellas_40_City_Audit_APlus.pdf',
      agent: 'aim-tbsoftwash',
      size: '940 KB',
      status: 'done',
      when: '1h ago',
      path: '~/Downloads/aim-browser/Pinellas_40_City_Audit_APlus.pdf',
    },
  ],
};

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.deferredPrompt = e;
  render();
});

window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    state.modal = state.modal === 'cmdk' ? null : 'cmdk';
    state.cmdkQuery = '';
    state.popover = null;
    render();
  } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f' && state.activeSession && !state.modal) {
    e.preventDefault();
    state.showScrollCopy = true;
    state.showHistory = false;
    render();
    document.getElementById('scroll-search-inp')?.focus();
  } else if (e.key === 'Escape') {
    if (state.modal || state.popover) {
      state.modal = null;
      state.popover = null;
      render();
    } else if (state.showScrollCopy) {
      state.showScrollCopy = false;
      render();
    }
  }
});

// Distinct per-agent live mechanics (NO repetitive bouncing cursor loop!)
// 1) aim-ld: <5ms DOM landmark scanner highlight
// 2) tbsoftwash-academy: Smooth streaming PDF download progress bar
// 3) aim-joshua: Real-time character-by-character form typing
// 4) aim-tbsoftwash (GATE) & aim-connect (IDLE): 100% stationary
setInterval(() => {
  if (state.isLocked) return;

  // 1. LeadDeeds zero-VLM DOM landmark lock progression
  state.mapScanIdx = (state.mapScanIdx + 1) % 4;
  document.querySelectorAll('[data-map-box]').forEach((el) => {
    el.classList.toggle('scan-locked', Number(el.dataset.mapBox) === state.mapScanIdx);
  });

  // 2. Academy streaming PDF download shelf + Top-Right Downloads Popover live sync
  state.dlProgress = state.dlProgress >= 99 ? 42 : state.dlProgress + 3;
  const mb = ((24 * state.dlProgress) / 100).toFixed(1);
  const dlFill = document.getElementById('live-dl-fill');
  const dlTxt = document.getElementById('live-dl-txt');
  if (dlFill && dlTxt) {
    dlFill.style.width = `${state.dlProgress}%`;
    dlTxt.textContent = `${mb} / 24.0 MB (${state.dlProgress}%) · 5.4 MB/s`;
  }
  const popFill = document.getElementById('pop-dl-fill');
  const popTxt = document.getElementById('pop-dl-txt');
  if (popFill && popTxt) {
    popFill.style.width = `${state.dlProgress}%`;
    popTxt.textContent = `${mb} / 24.0 MB (${state.dlProgress}%) · 5.4 MB/s`;
  }
}, 1400);

setInterval(() => {
  if (state.isLocked) return;
  const phrase = PORTAL_TYPE_PHRASES[state.portalPhraseIdx];
  state.portalCharIdx += 1;
  if (state.portalCharIdx > phrase.length + 8) {
    state.portalCharIdx = 1;
    state.portalPhraseIdx = (state.portalPhraseIdx + 1) % PORTAL_TYPE_PHRASES.length;
  }
  const el = document.getElementById('live-portal-typed');
  if (el) {
    const activePhrase = PORTAL_TYPE_PHRASES[state.portalPhraseIdx];
    el.textContent = activePhrase.slice(0, Math.min(activePhrase.length, state.portalCharIdx));
  }
}, 140);

function setTheme(next) {
  state.theme = next;
  localStorage.setItem('proto-v2-theme', next);
  document.documentElement.setAttribute('data-theme', next);
  const meta = document.getElementById('meta-theme-color');
  const map = { emerald: '#050505', oled: '#000000', light: '#f8fafc', navy: '#050a14' };
  if (meta) meta.setAttribute('content', map[next] || '#050505');
  render();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildFullTmuxScrollback(sess, extraMsgs) {
  return [
    `─── [TMUX CAPTURE-PANE // PAGE -3 · 00:18:04 · ${sess.name}] ───`,
    `$ ./startup.sh`,
    `[OK] :8000 FastAPI orchestrator online · :8001 MCP SSE online · cloudflared tunnel healthy`,
    `$ ~/aim-connect/backend/venv/bin/pytest -q`,
    `195 passed in 2.31s (commit 7d923ee verified)`,
    ``,
    `─── [TMUX CAPTURE-PANE // PAGE -2 · 00:39:19 · ${sess.name}] ───`,
    `[OPERATOR] Verify subagent CDP browser tab leasing and session color pills.`,
    `[J.O.S.H.U.A.] Assigned deterministic palette (${sess.color.label} ${sess.color.hex}) + 6.0s hud.json TTL guard.`,
    `npx jest --runInBand -> 38/38 passed`,
    ``,
    `─── [TMUX CAPTURE-PANE // PAGE -1 · 00:54:42 · ${sess.name}] ───`,
    `$ git status -sb`,
    `## ${sess.branch}...origin/${sess.branch} (clean worktree)`,
    ``,
    `─── [CURRENT VISIBLE VIEWPORT // ${sess.vessel} ENGINE] ───`,
    `[OPERATOR DIRECTIVE]`,
    sess.userPrompt,
    ``,
    `[J.O.S.H.U.A. // ${sess.vessel} ENGINE]`,
    ...sess.tools,
    ``,
    `🔊 ${sess.spoken}`,
    ...(extraMsgs.length ? ['', '[LIVE DISPATCH]', ...extraMsgs] : []),
  ].join('\n');
}

function highlightScrollback(rawText) {
  const safe = escapeHtml(rawText);
  const q = state.scrollSearchQuery.trim();
  if (!q) return { html: safe, count: 0 };
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let count = 0;
  const matches = safe.match(new RegExp(esc, 'gi'));
  const total = matches ? matches.length : 0;
  const activeIdx = total > 0 ? ((state.scrollMatchIdx % total) + total) % total : 0;
  const html = safe.replace(new RegExp(`(${esc})`, 'gi'), (m) => {
    const idx = count++;
    const cls = idx === activeIdx ? 'find-hit-mark active-hit' : 'find-hit-mark';
    return `<mark class="${cls}" id="scroll-hit-${idx}">${m}</mark>`;
  });
  return { html, count: total, activeIdx };
}

function attachScramble(el, originalText, triggerEl = el) {
  let timer = null;
  triggerEl.addEventListener('mouseenter', () => {
    if (timer) clearInterval(timer);
    let step = 0;
    timer = setInterval(() => {
      step += 0.9;
      const done = Math.floor(step);
      if (done >= originalText.length) {
        el.textContent = originalText;
        clearInterval(timer);
        return;
      }
      el.textContent = originalText
        .split('')
        .map((ch, idx) =>
          ch === ' '
            ? ' '
            : idx < done
            ? ch
            : SCRAMBLE_CHARS[(idx * 11 + done * 5) % SCRAMBLE_CHARS.length]
        )
        .join('');
    }, 20);
  });
  triggerEl.addEventListener('mouseleave', () => {
    if (timer) clearInterval(timer);
    el.textContent = originalText;
  });
}

function renderLockScreen() {
  return `
    <div class="auth-lock-stage">
      <div class="auth-card ld-mask-glass">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="ld-brand-box">${ICONS.shield}</div>
            <div>
              <div style="font-family:var(--font-mono);font-weight:700;font-size:15px;">AIM<span style="color:var(--accent);">CONNECT</span> // 3FA GATE</div>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);letter-spacing:0.12em;">ZERO-TRUST TOTP · WEBAUTHN · E2EE</div>
            </div>
          </div>
          <button class="subbar-util-btn active" data-act="unlock-cockpit" title="Return to Unlocked Cockpit">UNLOCK</button>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;">
          <input class="ld-text-input" id="lock-name-inp" placeholder="Operator Stealth Name / Passphrase" value="${escapeHtml(state.lockName)}" />
          <div style="display:flex;gap:6px;">
            <input class="ld-text-input" type="${state.lockPassVisible ? 'text' : 'password'}" value="••••••••••••••" placeholder="Admin Password" />
            <button type="button" class="subbar-util-btn" style="height:34px;padding:0 10px;" data-act="toggle-lock-pass">${ICONS.eye}</button>
          </div>
          <div style="display:flex;gap:6px;">
            <input class="ld-text-input" type="${state.lockE2eeVisible ? 'text' : 'password'}" value="${escapeHtml(state.e2eeSecret)}" placeholder="Optional E2EE Secret (PBKDF2 AES-GCM)" />
            <button type="button" class="subbar-util-btn" style="height:34px;padding:0 10px;" data-act="toggle-lock-e2ee">${ICONS.lock}</button>
          </div>
        </div>

        <button type="button" class="neon-cta-btn" style="width:100%;justify-content:center;height:38px;" data-act="unlock-cockpit">
          ${ICONS.fingerprint}
          <span>LOGIN WITH FACEID / TOUCHID PASSKEY</span>
        </button>

        <div style="text-align:center;font-family:var(--font-mono);font-size:10px;color:var(--text-muted);letter-spacing:0.16em;">
          OR ENTER 6-DIGIT HARDWARE / TOTP PIN
        </div>

        <div class="pin-dots-row">
          ${[0, 1, 2, 3, 4, 5]
            .map((i) => `<span class="pin-dot ${state.lockPin.length > i ? 'filled' : ''}"></span>`)
            .join('')}
        </div>

        <div class="totp-keypad">
          ${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'PASTE', '0', '⌫']
            .map((k) => `<button type="button" class="totp-key" data-pin-key="${k}">${k}</button>`)
            .join('')}
        </div>
      </div>
    </div>
  `;
}

function calcGraduatedTotal(seats) {
  const ladder = [150, 120, 95, 75, 50];
  let total = 0;
  for (let i = 0; i < seats; i++) total += ladder[i] || 30;
  return { total, avg: Math.round(total / seats), marginal: ladder[seats - 1] || 30 };
}

function renderMockWebpage(tab) {
  if (tab.kind === 'leaddeeds') {
    const pricing = calcGraduatedTotal(state.ldSeatCount);
    return `
      <div class="web-canvas" style="background:radial-gradient(90% 180px at 50% 0%,rgba(0,255,163,0.14),rgba(34,184,255,0.05) 55%,transparent),#050505;color:#f3f4f6;">
        <!-- Authentic LeadDeeds v2 Navbar -->
        <div style="height:44px;padding:0 18px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;background:rgba(5,5,5,0.86);position:sticky;top:0;z-index:5;">
          <div style="display:flex;align-items:center;gap:16px;">
            <span style="font-family:var(--font-mono);font-weight:800;font-size:13px;letter-spacing:-0.02em;"><span style="color:#00ffa3;">&gt;_</span> LEAD<span style="color:#00ffa3;">DEEDS</span></span>
            <div style="display:flex;gap:12px;font-size:11.5px;color:#9ca3af;">
              <span style="color:#ffffff;font-weight:600;">Pipeline</span>
              <span>6 Industries</span>
              <span>Pricing</span>
              <span>Docs</span>
            </div>
          </div>
          <span style="padding:5px 11px;border-radius:7px;background:#00ffa3;color:#030705;font-family:var(--font-mono);font-size:10.5px;font-weight:800;">START INTERCEPT -&gt;</span>
        </div>

        <div style="padding:18px 20px;display:flex;flex-direction:column;gap:15px;">
          <!-- Hero -->
          <div>
            <div style="display:inline-flex;align-items:center;gap:8px;padding:3px 10px;border-radius:999px;background:rgba(0,255,163,0.1);border:1px solid rgba(0,255,163,0.35);font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.12em;color:#00ffa3;">
              FLORIDA DAY-ZERO COMMERCIAL FILINGS · LIVE
            </div>
            <div style="font-size:24px;font-weight:800;line-height:1.12;letter-spacing:-0.03em;margin-top:8px;">
              The Paint Isn't Even Dry Yet.<br/>
              <span style="background:linear-gradient(90deg,#00FFA3,#22B8FF 65%,#FF8A1E);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">We Already Have Their Phone Number.</span>
            </div>
          </div>

          <!-- FIG 1.0 Zero-Bleed Responsive 3-Stage Pipeline Grid -->
          <div data-map-box="0" class="ld-map-target ${state.mapScanIdx === 0 ? 'scan-locked' : ''}" style="padding:12px;border-radius:12px;background:rgba(255,255,255,0.025);border:1px solid rgba(0,255,163,0.35);position:relative;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
              <span style="font-family:var(--font-mono);font-size:10px;color:#9ca3af;">FIG 1.0 // THREE-STAGE PUBLIC RECORD INTERCEPT PIPELINE</span>
              <span class="map-anchor-tag">[MAP #0] figCutaway · 2.8ms</span>
            </div>
            <div class="ld-fig-grid">
              <div class="ld-fig-stage-card" style="background:rgba(0,255,163,0.08);border:1px solid #00FFA3;">
                <div style="font-family:var(--font-mono);font-size:9px;font-weight:700;color:#00FFA3;">01 // DAY-ZERO SIGNALS</div>
                <div style="font-size:11.5px;font-weight:700;color:#ffffff;line-height:1.25;">Public Commercial Filings</div>
                <div style="font-family:var(--font-mono);font-size:9.5px;color:#9ca3af;">Statewide Daily Intercept</div>
              </div>
              <div class="ld-fig-stage-card" style="background:rgba(34,184,255,0.08);border:1px solid #22B8FF;">
                <div style="font-family:var(--font-mono);font-size:9px;font-weight:700;color:#22B8FF;">02 // ENTITY GRAPH</div>
                <div style="font-size:11.5px;font-weight:700;color:#ffffff;line-height:1.25;">Owner &amp; Officer Match</div>
                <div style="font-family:var(--font-mono);font-size:9.5px;color:#9ca3af;">4,852 Verified Contacts</div>
              </div>
              <div class="ld-fig-stage-card" style="background:rgba(255,138,30,0.08);border:1px solid #FF8A1E;">
                <div style="font-family:var(--font-mono);font-size:9px;font-weight:700;color:#FF8A1E;">03 // BYOA DELIVERY</div>
                <div style="font-size:11.5px;font-weight:700;color:#ffffff;line-height:1.25;">MCP SSE &amp; Dossiers</div>
                <div style="font-family:var(--font-mono);font-size:9.5px;color:#FF8A1E;overflow:hidden;text-overflow:ellipsis;">mcp.leaddeeds.com/sse</div>
              </div>
            </div>
          </div>

          <!-- Interactive Graduated Seat Calculator ($150 -> $30, 120fps Zero-Re-Render) -->
          <div data-map-box="1" class="ld-map-target ${state.mapScanIdx === 1 ? 'scan-locked' : ''}" style="padding:13px 14px;border-radius:12px;background:#0a0e0d;border:1px solid rgba(34,184,255,0.35);display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
              <div>
                <span style="font-family:var(--font-mono);font-size:10px;color:#22b8ff;font-weight:700;">GRADUATED TEAM SEAT CALCULATOR ($150 -&gt; $30 FLOOR)</span>
                <div id="ld-seat-summary" style="font-size:12px;color:#d1d5db;margin-top:2px;">Team Size: <strong>${state.ldSeatCount} Seats</strong> · Next Seat: <strong style="color:#00ffa3;">$${pricing.marginal}/mo</strong></div>
              </div>
              <div style="text-align:right;">
                <span class="map-anchor-tag">[MAP #1] seatSlider · 3.2ms</span>
                <div id="ld-seat-price" style="font-family:var(--font-mono);font-size:17px;font-weight:800;color:#ffffff;margin-top:3px;">$${pricing.total}<span style="font-size:10.5px;color:#9ca3af;">/mo ($${pricing.avg}/seat avg)</span></div>
              </div>
            </div>
            <input type="range" min="1" max="15" value="${state.ldSeatCount}" id="ld-seat-slider" style="width:100%;accent-color:#00ffa3;cursor:pointer;" />
          </div>

          <!-- Live Florida Dossier Intercept Rows -->
          <div data-map-box="2" class="ld-map-target ${state.mapScanIdx === 2 ? 'scan-locked' : ''}" style="border-radius:10px;border:1px solid rgba(255,255,255,0.09);overflow:hidden;font-family:var(--font-mono);font-size:10.5px;">
            <div style="padding:7px 12px;background:rgba(255,255,255,0.04);display:flex;justify-content:space-between;color:#9ca3af;">
              <span>RECENT FLORIDA COMMERCIAL INTERCEPTS</span>
              <span class="map-anchor-tag">[MAP #2] feedRows</span>
            </div>
            ${[
              ['DUVAL / ST. JOHNS', 'Jacksonville Commercial Tenant Buildout · Slot 13', 'LIVE DOSSIER', '#00ffa3'],
              ['PINELLAS · 33756', 'Clearwater Retail Plaza Roof & Exterior Expansion', 'VERIFIED', '#22b8ff'],
              ['HILLSBOROUGH · 33602', 'Tampa Logistics & Distribution Hub Phase II', 'VERIFIED', '#ff8a1e'],
            ]
              .map(
                ([cnty, desc, badge, col]) => `
              <div style="padding:8px 12px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <div style="min-width:0;">
                  <span style="color:${col};font-weight:700;">${cnty}</span>
                  <span style="color:#d1d5db;margin-left:8px;">${desc}</span>
                </div>
                <span style="padding:2px 7px;border-radius:999px;background:rgba(255,255,255,0.05);color:${col};font-size:9.5px;white-space:nowrap;">${badge}</span>
              </div>
            `
              )
              .join('')}
          </div>

          <!-- 6 Commercial Verticals + BYOA MCP Stream Terminal -->
          <div data-map-box="3" class="ld-map-target ${state.mapScanIdx === 3 ? 'scan-locked' : ''}" style="padding:12px 14px;border-radius:11px;background:#090d0c;border:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-family:var(--font-mono);font-size:10px;color:#ff8a1e;font-weight:700;">BRING YOUR OWN AGENT // MCP SSE STREAM</span>
              <span class="map-anchor-tag">[MAP #3] mcpEndpoint</span>
            </div>
            <div style="font-family:var(--font-mono);font-size:11px;color:#d1d5db;">
              <span style="color:#00ffa3;">$</span> claude mcp add --transport sse leaddeeds https://mcp.leaddeeds.com/sse
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;padding-top:4px;">
              ${['Commercial Roofing', 'Exterior & Paving', 'HVAC & Mechanical', 'Tenant Buildout', 'Solar & Electrical', 'Facility Maintenance']
                .map((v) => `<span style="padding:3px 8px;border-radius:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:10.5px;color:#9ca3af;">${v}</span>`)
                .join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (tab.kind === 'tbsoftwash') {
    return `
      <div class="web-canvas" style="background:#0c0f14;color:#f8fafc;">
        <!-- Top Gold Utility Strip -->
        <div style="padding:5px 16px;background:#151921;border-bottom:1px solid rgba(193,155,108,0.32);display:flex;justify-content:space-between;font-size:10.5px;color:#e5c391;font-weight:600;">
          <span>Clearwater · St. Petersburg · Safety Harbor · Tampa (40 Cities)</span>
          <span>★★★★★ 4.9/5 Google · $1M Insured · (727) 641-1296</span>
        </div>

        <!-- Sticky Brand Header -->
        <div style="height:46px;padding:0 16px;background:rgba(12,15,20,0.96);border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:6;">
          <div style="display:flex;align-items:center;gap:9px;">
            <span style="width:27px;height:27px;border-radius:6px;background:linear-gradient(135deg,#C19B6C,#8e6c42);color:#0b0d10;font-weight:900;font-size:12px;display:inline-flex;align-items:center;justify-content:center;">TB</span>
            <div>
              <div style="font-weight:800;font-size:12.5px;letter-spacing:0.02em;">TAMPA BAY SOFT WASH</div>
              <div style="font-size:9.5px;color:#94a3b8;">Owner-Operated · ARMA &amp; Trident Certified</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;font-size:11px;color:#cbd5e1;">
            <span>Roof Cleaning</span>
            <span>Paver Sealing</span>
            <span>Reviews</span>
            <span style="padding:6px 12px;border-radius:7px;background:#C19B6C;color:#0b0d10;font-weight:800;">Get a Free Quote ↓</span>
          </div>
        </div>

        <div style="padding:16px 18px;display:flex;flex-direction:column;gap:14px;">
          <!-- Stationary Human Gate Notice -->
          <div style="padding:8px 12px;border-radius:9px;background:rgba(245,158,11,0.14);border:1px solid rgba(245,158,11,0.55);display:flex;justify-content:space-between;align-items:center;gap:8px;font-family:var(--font-mono);font-size:10.5px;color:#fde68a;">
            <span>✋ PAUSED AT DEPLOY GATE // Inspect Quote Builder &amp; Sliders, then reply [y/n]</span>
            <span style="color:#fca5a5;font-weight:700;">HOLDING STEADY</span>
          </div>

          <!-- Hero Copy -->
          <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;">
            <div style="max-width:440px;">
              <div style="font-size:22px;font-weight:800;line-height:1.14;">Premium Exterior Cleaning for Tampa Bay.</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px;line-height:1.5;">
                Non-destructive soft wash roof restoration, ASTM C-144 joint sanding, and Trident CAT-5 urethane paver sealing across Pinellas &amp; Hillsborough counties.
              </div>
            </div>
            <div style="display:flex;gap:6px;">
              <span style="padding:4px 9px;border-radius:6px;background:rgba(193,155,108,0.14);border:1px solid rgba(193,155,108,0.4);font-size:10px;color:#e5c391;font-weight:700;">36-Mo Roof Warranty</span>
              <span style="padding:4px 9px;border-radius:6px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);font-size:10px;color:#cbd5e1;">TIA Certified</span>
            </div>
          </div>

          <!-- REAL Pinellas County Barrel-Tile Roof Before/After Photo Slider (120fps GPU clip-path, Zero Re-Render!) -->
          <div style="border-radius:12px;border:1px solid rgba(193,155,108,0.48);overflow:hidden;background:#141820;">
            <div style="padding:7px 12px;display:flex;justify-content:space-between;align-items:center;font-size:10.5px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <strong style="color:#e5c391;">REAL RESULTS // PINELLAS COUNTY BARREL-TILE ROOF (DRAG LEFT / RIGHT)</strong>
              <span id="tb-split-lbl" style="font-family:var(--font-mono);color:#cbd5e1;">${state.roofSliderPct}% SPLIT</span>
            </div>
            <div class="tb-ba-stage">
              <img src="https://tbsoftwash.com/wp-content/uploads/tb_sliders/roof-cleaning-after-pinellas-county.jpg" decoding="async" alt="Clean barrel tile roof after soft wash in Pinellas County" />
              <img
                id="tb-before-img"
                src="https://tbsoftwash.com/wp-content/uploads/tb_sliders/roof-cleaning-before-pinellas-county.jpg"
                decoding="async"
                alt="Dirty barrel tile roof before soft wash"
                style="will-change:clip-path;clip-path:polygon(0 0, ${state.roofSliderPct}% 0, ${state.roofSliderPct}% 100%, 0 100%);"
              />
              <div id="tb-ba-div" class="tb-ba-divider" style="left:${state.roofSliderPct}%;"></div>
              <div id="tb-ba-knob" class="tb-ba-knob" style="left:${state.roofSliderPct}%;">&lt;&gt;</div>
              <span style="position:absolute;top:10px;left:10px;z-index:6;padding:3px 8px;border-radius:5px;background:rgba(0,0,0,0.76);font-family:var(--font-mono);font-size:9.5px;font-weight:700;">BEFORE</span>
              <span style="position:absolute;top:10px;right:10px;z-index:6;padding:3px 8px;border-radius:5px;background:rgba(193,155,108,0.94);color:#0b0d10;font-family:var(--font-mono);font-size:9.5px;font-weight:800;">AFTER SOFT WASH</span>
              <input type="range" min="4" max="96" value="${state.roofSliderPct}" id="tb-roof-slider" style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:ew-resize;z-index:7;" />
            </div>
          </div>

          <!-- Real Secondary Project Photos + Core Services Grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div style="border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);background:#141820;">
              <img src="https://tbsoftwash.com/wp-content/uploads/tb_sliders/roof-cleaning-after-clearwater.jpg" alt="Clearwater Beach Roof Soft Wash" style="width:100%;height:96px;object-fit:cover;display:block;" />
              <div style="padding:8px 10px;">
                <div style="font-weight:700;font-size:11.5px;color:#f8fafc;">Clearwater Beach Mansion Roof</div>
                <div style="font-size:10.5px;color:#94a3b8;">Zero-pressure ARMA sodium hypochlorite treatment</div>
              </div>
            </div>
            <div style="border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);background:#141820;">
              <img src="https://tbsoftwash.com/wp-content/uploads/tb_sliders/house-washing-after-safety-harbor.jpg" alt="Safety Harbor House Wash" style="width:100%;height:96px;object-fit:cover;display:block;" />
              <div style="padding:8px 10px;">
                <div style="font-weight:700;font-size:11.5px;color:#f8fafc;">Safety Harbor Estate Soft Wash</div>
                <div style="font-size:10.5px;color:#94a3b8;">12V stucco, soffit, fascia &amp; lanai sanitizing</div>
              </div>
            </div>
          </div>

          <!-- Instant Quote Builder + 6-Service Matrix -->
          <div style="padding:12px 14px;border-radius:11px;background:#151a23;border:1px solid rgba(193,155,108,0.35);display:grid;grid-template-columns:1fr auto;align-items:center;gap:12px;">
            <div>
              <div style="font-family:var(--font-mono);font-size:10px;color:#C19B6C;font-weight:700;">INTERACTIVE QUOTE BUILDER // CLEARWATER · ST. PETE · TAMPA</div>
              <div style="font-size:12px;color:#e2e8f0;margin-top:3px;">Barrel Tile Roof (2,850 sq ft) + Driveway Trident CAT-5 Urethane Seal</div>
              <div style="font-size:10.5px;color:#94a3b8;margin-top:2px;">Includes 2-coat flood application, ASTM C-144 joint sand &amp; plant rinse</div>
            </div>
            <div style="text-align:right;">
              <div style="font-family:var(--font-mono);font-size:18px;font-weight:800;color:#00ffa3;">$1,140</div>
              <div style="font-size:10px;color:#e5c391;">Multi-Service Bundle</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (tab.kind === 'academy') {
    const mb = ((24 * state.dlProgress) / 100).toFixed(1);
    return `
      <div style="flex:1;min-height:0;display:flex;flex-direction:column;background:radial-gradient(ellipse at top,rgba(59,130,246,0.18),transparent 58%),#070b14;color:#f8fafc;">
        <div class="web-canvas">
          <!-- Academy SaaS Navbar -->
          <div style="height:44px;padding:0 16px;border-bottom:1px solid rgba(255,255,255,0.09);display:flex;align-items:center;justify-content:space-between;background:rgba(7,11,20,0.92);position:sticky;top:0;z-index:5;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="padding:3px 7px;border-radius:6px;background:rgba(59,130,246,0.2);border:1px solid #3b82f6;color:#93c5fd;font-family:var(--font-mono);font-size:10px;font-weight:700;">@TBSOFTWASH</span>
              <span style="font-weight:700;font-size:12.5px;">Tampa Bay Soft Wash Academy</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;font-family:var(--font-mono);font-size:10px;">
              <span style="color:#93c5fd;">88% COMPLETE</span>
              <span style="color:#00ffa3;">CERT #TBSA-2026-0419 ✓</span>
            </div>
          </div>

          <div style="padding:16px 18px;display:flex;flex-direction:column;gap:13px;">
            <!-- Audio / Video SOP Studio Card -->
            <div style="padding:13px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(59,130,246,0.35);display:flex;flex-direction:column;gap:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-family:var(--font-mono);font-size:10px;color:#60a5fa;font-weight:700;">MODULE 04 // PROPORTIONING &amp; PUMP HYDRAULICS</span>
                <span class="mono-kbd">AUDIO SOP · 14:28 / 18:40</span>
              </div>
              <div style="font-size:14.5px;font-weight:700;">12V Dedicated Batch vs. Air-Operated Double Diaphragm (AODD)</div>
              <svg viewBox="0 0 460 30" style="width:100%;height:26px;">
                ${Array.from({ length: 44 })
                  .map((_, i) => {
                    const h = 6 + ((i * 13) % 20);
                    const y = (30 - h) / 2;
                    const active = i < 31;
                    return `<rect x="${i * 10.4}" y="${y}" width="6" height="${h}" rx="2" fill="${active ? '#3b82f6' : 'rgba(255,255,255,0.14)'}"/>`;
                  })
                  .join('')}
              </svg>
            </div>

            <!-- 3-Tank Manifold Proportioner Gauges -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
              ${[
                ['BUFFER WATER', '100 GAL', '82%', '#38bdf8'],
                ['SODIUM HYPO (12.5%)', '55 GAL', '64%', '#facc15'],
                ['SURFACTANT MIX', '7 GAL', '91%', '#00ffa3'],
              ]
                .map(
                  ([lbl, cap, pct, col]) => `
                <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.09);">
                  <div style="font-family:var(--font-mono);font-size:9px;color:#94a3b8;">${lbl}</div>
                  <div style="font-family:var(--font-mono);font-size:13.5px;font-weight:800;margin-top:3px;color:${col};">${cap} · ${pct}</div>
                  <div style="height:4px;border-radius:999px;background:rgba(255,255,255,0.1);margin-top:6px;overflow:hidden;">
                    <div style="width:${pct};height:100%;background:${col};"></div>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>

            <!-- Full 6-Module Operator Track Grid -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              ${[
                ['MOD 01', 'SH Chemistry & Plant Safety', 'PASSED · 100%', '#00ffa3'],
                ['MOD 02', 'ARMA Tile & Shingle Roof SOP', 'PASSED · 96%', '#00ffa3'],
                ['MOD 03', 'Stucco, Hardie & Lanai Wash', 'PASSED · 100%', '#00ffa3'],
                ['MOD 04', '12V vs. AODD Rig Architecture', 'IN PROGRESS', '#60a5fa'],
                ['MOD 05', 'ASTM C-144 & Trident CAT-5', 'UNLOCKED', '#94a3b8'],
                ['MOD 06', 'Proof Packs & HOA Commercial Bids', 'UNLOCKED', '#94a3b8'],
              ]
                .map(
                  ([code, title, st, col]) => `
                <div style="padding:9px 11px;border-radius:9px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center;gap:8px;">
                  <div style="min-width:0;">
                    <div style="font-family:var(--font-mono);font-size:9px;color:${col};font-weight:700;">${code} · ${st}</div>
                    <div style="font-size:11.5px;font-weight:600;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>

            <!-- 186-SKU Rig Bill of Materials Spec Table -->
            <div style="border-radius:10px;border:1px solid rgba(59,130,246,0.35);overflow:hidden;font-family:var(--font-mono);font-size:10.5px;">
              <div style="padding:7px 12px;background:rgba(59,130,246,0.14);display:flex;justify-content:space-between;align-items:center;">
                <strong style="color:#93c5fd;">186-SKU RIG BILL OF MATERIALS (EXPORTING PDF...)</strong>
                <span style="color:#00ffa3;">4 CORE SUBSYSTEMS</span>
              </div>
              ${[
                ['SKU-014', 'Yamada NDP-15 ½" Kynar/Viton AODD Pump', 'PRIMARY ROOF'],
                ['SKU-042', 'Banjo 3-Way Polypropylene Proportioning Manifold', 'METERING'],
                ['SKU-089', 'Hannay 18" Electric 12V Stainless Hose Reel (200ft)', 'DELIVERY'],
                ['SKU-131', 'Deionized Twin-Bed Spot-Free Window Resin Skid', 'PURE WATER'],
              ]
                .map(
                  ([sku, part, role]) => `
                <div style="padding:7px 12px;border-top:1px solid rgba(255,255,255,0.06);display:grid;grid-template-columns:68px 1fr auto;gap:8px;">
                  <span style="color:#60a5fa;">${sku}</span>
                  <span style="color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${part}</span>
                  <span style="color:#94a3b8;">${role}</span>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </div>

        <!-- Pinned Bottom CDP Download Progress Shelf (--dlpath) -->
        <div class="cdp-download-shelf">
          <div style="display:flex;align-items:center;gap:8px;min-width:0;">
            <span style="color:#60a5fa;display:flex;">${ICONS.download}</span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">TBSA_186_SKU_Rig_BOM_v2.pdf -&gt; <strong>artifacts/</strong></span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <div class="cdp-dl-track"><div class="cdp-dl-fill" id="live-dl-fill" style="width:${state.dlProgress}%;"></div></div>
            <span id="live-dl-txt" style="color:#93c5fd;">${mb} / 24.0 MB (${state.dlProgress}%) · 5.4 MB/s</span>
          </div>
        </div>
      </div>
    `;
  }

  if (tab.kind === 'calendar') {
    return `
      <div class="web-canvas" style="background:#071112;color:#f0fdfa;">
        <div style="padding:10px 16px;background:#0a1d1f;border-bottom:1.5px solid #14b8a6;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:5;">
          <div>
            <div style="font-family:var(--font-mono);font-size:9.5px;color:#5eead4;letter-spacing:0.12em;">AIM-CALENDAR // INSTANT CALLER, QUOTE &amp; MMS DOSSIER VAULT</div>
            <div style="font-weight:800;font-size:13px;margin-top:1px;">Repeat Caller Match: Evelyn Harper · (727) 555-0194</div>
          </div>
          <span class="task-mode-chip mapping">2-YR RECALL · 4.4ms</span>
        </div>

        <div style="padding:15px 18px;display:flex;flex-direction:column;gap:12px;">
          <!-- Verified Customer Summary Card -->
          <div style="padding:12px 14px;border-radius:10px;background:rgba(20,184,166,0.08);border:1px solid rgba(20,184,166,0.4);display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;">
            <div>
              <div style="font-family:var(--font-mono);font-size:10px;color:#5eead4;font-weight:700;">VERIFIED PROPERTY &amp; PAST PAYMENT</div>
              <div style="font-size:13px;font-weight:700;margin-top:3px;">12400 US Hwy 19 N, Lot 214 · Clearwater, FL 33764</div>
              <div style="font-size:11.5px;color:#cbd5e1;margin-top:3px;">Park-model home + 2 outbuildings + lattice + awning + carport chlorine soft wash</div>
            </div>
            <div style="text-align:right;">
              <div style="font-family:var(--font-mono);font-size:18px;font-weight:800;color:#00ffa3;">$300.00</div>
              <div style="font-family:var(--font-mono);font-size:9.5px;color:#99f6e4;">PAID BY CHECK · NOV 2024</div>
            </div>
          </div>

          <!-- Chronological Diarized Call & MMS Timeline -->
          <div style="border-radius:10px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;font-family:var(--font-mono);font-size:10.5px;">
            <div style="padding:7px 12px;background:rgba(255,255,255,0.04);display:flex;justify-content:space-between;color:#94a3b8;font-weight:700;">
              <span>CHRONOLOGICAL CALL AUDIO, TRANSCRIPT &amp; MMS LOG</span>
              <span style="color:#5eead4;">20 PHOTOS + 3 CALLS</span>
            </div>
            ${[
              ['OCT 28, 2024 · 3:16 PM', 'Initial Inquiry Call (diarized audio) — Requested photos of Lot 214 awning & lattice', 'AUDIO 02:41'],
              ['OCT 28, 2024 · 3:35 PM', '11 "Before" MMS Photos Received — Park model, 2 sheds, lattice & storm debris', '11 MMS JPG'],
              ['OCT 28, 2024 · 3:44 PM', 'Quote & Booking Call — Quoted $300 all-inclusive · Booked Mon Nov 11 (11am–1pm)', 'QUOTED $300'],
              ['NOV 11, 2024 · 1:52 PM', '9 "After" Completion Photos Sent — Reply: "Looks so much better!" + referral', '9 MMS JPG'],
              ['RECENT CALL · 5:09 PM', 'Incoming 3m 46s Repeat Call — Two years to the day after original wash!', 'REPEAT LEAD'],
            ]
              .map(
                ([dt, desc, pill]) => `
              <div style="padding:8px 12px;border-top:1px solid rgba(255,255,255,0.06);display:grid;grid-template-columns:145px 1fr auto;gap:8px;align-items:center;">
                <span style="color:#5eead4;">${dt}</span>
                <span style="color:#f1f5f9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${desc}</span>
                <span style="padding:2px 7px;border-radius:5px;background:rgba(20,184,166,0.14);color:#99f6e4;font-size:9.5px;">${pill}</span>
              </div>
            `
              )
              .join('')}
          </div>

          <!-- MMS Photo Proof Strip -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div style="padding:10px 12px;border-radius:9px;background:#0b191b;border:1px solid rgba(255,255,255,0.09);">
              <div style="font-family:var(--font-mono);font-size:9.5px;color:#fbbf24;font-weight:700;">BEFORE MMS // OCT 28 (11 PHOTOS)</div>
              <div style="font-size:11.5px;color:#cbd5e1;margin-top:4px;">"This is the awning &amp; carport lattice." · Advise clearing small knickknacks only.</div>
            </div>
            <div style="padding:10px 12px;border-radius:9px;background:#0b191b;border:1px solid rgba(0,255,163,0.3);">
              <div style="font-family:var(--font-mono);font-size:9.5px;color:#00ffa3;font-weight:700;">COMPLETION MMS // NOV 11 (9 PHOTOS)</div>
              <div style="font-size:11.5px;color:#cbd5e1;margin-top:4px;">Full chlorine soft wash + carport slab rinse · Customer: "Looks so much better."</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (tab.kind === 'joshua') {
    const curTyped = PORTAL_TYPE_PHRASES[state.portalPhraseIdx].slice(0, state.portalCharIdx);
    return `
      <div class="web-canvas" style="background:#070d14;color:#e2e8f0;">
        <div style="padding:10px 16px;background:#0c1928;border-bottom:2px solid #00b8ff;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:5;">
          <div>
            <div style="font-family:var(--font-mono);font-size:9.5px;color:#7dd3fc;letter-spacing:0.12em;">BRIANV1981 / AIM-JOSHUA // MODEL-AGNOSTIC EXOSKELETON OS (v1.1.4)</div>
            <div style="font-weight:800;font-size:13px;margin-top:1px;">Any Model. Any Harness. One Shared Short-Term &amp; Long-Term Project Brain.</div>
          </div>
          <span class="task-mode-chip typing">LIVE KEYSTROKE + LANCEDB</span>
        </div>

        <div style="padding:15px 18px;display:flex;flex-direction:column;gap:12px;">
          <!-- Connected Harnesses Grid -->
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-family:var(--font-mono);">
            ${[
              ['HARNESSES', 'AGY·GROK·OC·CDX', '#00ffa3'],
              ['SHARED BRAIN', 'LANCEDB + BM25', '#38bdf8'],
              ['30% RULE', 'HANDOFF > COMPACT', '#facc15'],
              ['RECALL SPEED', '3.6 ms ($0 LLM)', '#00ffa3'],
            ]
              .map(
                ([k, v, c]) => `
              <div style="padding:9px 10px;border-radius:8px;background:#0e1826;border:1px solid rgba(255,255,255,0.09);">
                <div style="font-size:8.5px;color:#94a3b8;">${k}</div>
                <div style="font-size:11.5px;font-weight:800;color:${c};margin-top:3px;">${v}</div>
              </div>
            `
              )
              .join('')}
          </div>

          <!-- Live Agent Keystroke Typing into Shared Brain Sandbox -->
          <div style="padding:12px;border-radius:10px;background:#0e1826;border:1px solid rgba(0,184,255,0.5);box-shadow:0 0 18px rgba(0,184,255,0.1);display:grid;grid-template-columns:130px 1fr auto;gap:8px;align-items:end;">
            <div>
              <div style="font-family:var(--font-mono);font-size:9.5px;color:#94a3b8;margin-bottom:4px;">ACTIVE VESSEL</div>
              <div style="padding:6px 9px;border-radius:6px;background:#070d14;border:1px solid rgba(255,255,255,0.12);font-family:var(--font-mono);font-size:11px;color:#00ffa3;">Grok CLI -&gt; MCP</div>
            </div>
            <div>
              <div style="font-family:var(--font-mono);font-size:9.5px;color:#38bdf8;margin-bottom:4px;">AGENT TYPING INTO #brain-query...</div>
              <div style="padding:6px 9px;border-radius:6px;background:#070d14;border:1.5px solid #00b8ff;font-family:var(--font-mono);font-size:11px;color:#ffffff;min-height:28px;"><span id="live-portal-typed">${escapeHtml(curTyped)}</span><span class="live-type-caret"></span></div>
            </div>
            <span style="padding:7px 12px;border-radius:6px;background:#00b8ff;color:#041019;font-family:var(--font-mono);font-size:10.5px;font-weight:800;">RECALL</span>
          </div>

          <!-- Cross-OS Quickstart + 3 Installer Modes -->
          <div style="border-radius:10px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;font-family:var(--font-mono);font-size:10.5px;">
            <div style="padding:7px 12px;background:#111f31;display:flex;justify-content:space-between;color:#94a3b8;font-weight:700;">
              <span>J.O.S.H.U.A. ARCHITECTURE &amp; INSTALLER MODES (LINUX · WSL · MACOS · WINDOWS 11)</span>
              <span style="color:#00ffa3;">MIT OPEN SOURCE</span>
            </div>
            ${[
              ['Option A · install.sh', 'Clean project exoskeleton: AGENTS.md + ./aim + LanceDB MCP', 'DEFAULT'],
              ['Option B · install-agent.sh', 'Specialist co-agent node under ~/aim-agents/<persona>', 'CO-AGENT'],
              ['Datajack (.engram)', 'Portable Parquet knowledge cartridges for P2P / air-gapped backup', 'CARTRIDGE'],
              ['GitOps Worktrees', './aim fix <issue> isolates every agent in workspace/issue-N', 'GUARDRAIL'],
              ['Blackbox Seal', 'Seals raw transcripts at 0600 before baton pass to fresh vessel', 'AUDITABLE'],
            ]
              .map(
                ([m, desc, tag]) => `
              <div style="padding:8px 12px;border-top:1px solid rgba(255,255,255,0.06);display:grid;grid-template-columns:155px 1fr auto;gap:8px;align-items:center;">
                <span style="color:#7dd3fc;font-weight:700;">${m}</span>
                <span style="color:#f1f5f9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${desc}</span>
                <span style="color:#00ffa3;font-weight:700;">${tag}</span>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  if (tab.kind === 'youtube') {
    return `
      <div class="web-canvas" style="background:#0f0a07;color:#fff7ed;">
        <div style="padding:10px 16px;background:#1c110a;border-bottom:2px solid #f97316;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:5;">
          <div>
            <div style="font-family:var(--font-mono);font-size:9.5px;color:#fdba74;letter-spacing:0.12em;">AIM-YOUTUBE // CENTRAL DRY VIDEO KNOWLEDGE &amp; SPOKE ENGINE</div>
            <div style="font-weight:800;font-size:13px;margin-top:1px;">492 Indexed Videos · 1,444 LanceDB Fragments · 38 Active Spokes</div>
          </div>
          <span class="task-mode-chip" style="color:#fb923c;border-color:rgba(249,115,22,0.5);background:rgba(249,115,22,0.14);">82/82 PYTEST GREEN</span>
        </div>

        <div style="padding:15px 18px;display:flex;flex-direction:column;gap:12px;">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-family:var(--font-mono);">
            <div style="padding:10px;border-radius:9px;background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.35);">
              <div style="font-size:9px;color:#fdba74;">INDEXED LIBRARY</div>
              <div style="font-size:16px;font-weight:800;color:#ffffff;margin-top:3px;">492 Videos</div>
            </div>
            <div style="padding:10px;border-radius:9px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);">
              <div style="font-size:9px;color:#fdba74;">HYBRID VECTORS</div>
              <div style="font-size:16px;font-weight:800;color:#00ffa3;margin-top:3px;">1,444 Chunks</div>
            </div>
            <div style="padding:10px;border-radius:9px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);">
              <div style="font-size:9px;color:#fdba74;">SPOKE DELIVERABLES</div>
              <div style="font-size:16px;font-weight:800;color:#38bdf8;margin-top:3px;">38 / 38 (0 Err)</div>
            </div>
          </div>

          <!-- Spoke Co-Agent Consumers Table -->
          <div style="border-radius:10px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;font-family:var(--font-mono);font-size:10.5px;">
            <div style="padding:7px 12px;background:rgba(249,115,22,0.12);display:flex;justify-content:space-between;color:#fed7aa;font-weight:700;">
              <span>SINGLE DRY SOURCE OF TRUTH -&gt; DOWNSTREAM CONTENT CO-AGENTS</span>
              <span>ZERO DUPLICATION</span>
            </div>
            ${[
              ['aim-tbsoftwash-content', 'Exterior restoration SOPs, chemistry safety & local Tampa Bay guides', 'SYNCED ✓'],
              ['aim-ld-content', 'B2B commercial intent authority articles & Day-Zero case studies', 'SYNCED ✓'],
              ['aim-skorbane-content', 'Technical AI engineering breakdowns & sovereign architecture', 'SYNCED ✓'],
              ['aim-mega-guide', 'Long-form podcast/video -> structured chapter SOP generator', 'READY ✓'],
            ]
              .map(
                ([agent, scope, st]) => `
              <div style="padding:8px 12px;border-top:1px solid rgba(255,255,255,0.06);display:grid;grid-template-columns:162px 1fr auto;gap:8px;align-items:center;">
                <span style="color:#fb923c;font-weight:700;">${agent}</span>
                <span style="color:#f1f5f9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${scope}</span>
                <span style="color:#00ffa3;font-weight:700;">${st}</span>
              </div>
            `
              )
              .join('')}
          </div>

          <div style="padding:11px 13px;border-radius:10px;background:#17100b;border:1px solid rgba(255,255,255,0.09);font-family:var(--font-mono);font-size:10.5px;color:#fed7aa;line-height:1.6;">
            $ python3 scripts/lint_deliverable.py --all-active &amp;&amp; pytest -q<br/>
            <span style="color:#00ffa3;">&gt; 82 passed in 1.42s · 38/38 spoke research summaries verified clean</span>
          </div>
        </div>
      </div>
    `;
  }

  // Authentic Full-Page GitHub Dark-Mode Repository UI (100% IDLE · 0% CPU)
  return `
    <div class="web-canvas" style="background:#0d1117;color:#e6edf3;">
      <div style="padding:10px 16px;background:#161b22;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;font-size:13px;">
          <span style="color:#58a6ff;font-weight:600;">BrianV1981</span>
          <span style="color:#8b949e;">/</span>
          <strong style="color:#f0f6fc;">aim-connect</strong>
          <span style="padding:1px 7px;border-radius:999px;border:1px solid #30363d;font-size:10px;color:#8b949e;">Public</span>
        </div>
        <div style="display:flex;gap:6px;font-family:var(--font-mono);font-size:10.5px;">
          <span style="padding:3px 9px;border-radius:6px;background:#21262d;border:1px solid #30363d;">⊙ Issues 4</span>
          <span style="padding:3px 9px;border-radius:6px;background:#21262d;border:1px solid #30363d;">★ Star 142</span>
          <span style="padding:3px 9px;border-radius:6px;background:#238636;color:#ffffff;font-weight:700;">&lt;&gt; Code ▾</span>
        </div>
      </div>

      <div style="padding:14px 16px;display:flex;flex-direction:column;gap:12px;">
        <!-- GitHub Commit Header + 7-Row File Tree -->
        <div style="border-radius:8px;border:1px solid #30363d;overflow:hidden;font-size:11.5px;">
          <div style="padding:8px 12px;background:#161b22;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10.5px;">
            <span><strong>BrianV1981</strong> fix(#255): wrap session names in colored pills</span>
            <span style="color:#3fb950;">✓ 7d923ee · 195/195 passing</span>
          </div>
          ${[
            ['📁 .github/workflows', 'CI pytest + oxlint + shareability gate', '3d ago'],
            ['📁 backend/', 'FastAPI WebSocket PTY + loopback CDP screencast', '14m ago'],
            ['📁 frontend/src/', 'Emerald Matrix UI + Voice Macros + Split Resizer', '14m ago'],
            ['📁 joshua_os/', 'Hybrid BM25 + LanceDB recall CLI', '5d ago'],
            ['📄 AGENTS.md', 'J.O.S.H.U.A. Sovereign OS & GitOps worktree mandates', '2d ago'],
            ['📄 README.md', 'Own your stack. Don’t rent a seat. (v1.8.0)', 'Yesterday'],
            ['📄 startup.sh', 'Idempotent 3-window tmux launcher (:8000/:8001)', '4d ago'],
          ]
            .map(
              ([f, msg, age]) => `
            <div style="padding:7px 12px;border-top:1px solid #21262d;display:grid;grid-template-columns:155px 1fr auto;gap:8px;align-items:center;">
              <span style="color:#e6edf3;font-family:var(--font-mono);font-size:11px;">${f}</span>
              <span style="color:#8b949e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${msg}</span>
              <span style="color:#8b949e;font-size:10.5px;">${age}</span>
            </div>
          `
            )
            .join('')}
        </div>

        <!-- Rendered README.md Card + Quickstart -->
        <div style="padding:14px 16px;border-radius:8px;border:1px solid #30363d;background:#0d1117;display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-family:var(--font-mono);font-size:10px;color:#8b949e;">README.md</span>
            <span style="font-family:var(--font-mono);font-size:10px;color:#eab308;">💤 IDLE LEASE · 0% CPU · ZERO CURSOR MOTION</span>
          </div>
          <div style="font-size:17px;font-weight:800;">A.I.M. Connect — Own your stack. Don't rent a seat.</div>
          <div style="font-size:12px;color:#8b949e;line-height:1.55;">
            Self-hosted multi-agent workstation cockpit with 3FA (Password + TOTP + WebAuthn Passkeys), PBKDF2 AES-256-GCM WebSocket E2EE, custom spoken voice macros, SQLite FTS5 forensics, and subagent-isolated CDP browser streaming.
          </div>
          <div style="padding:9px 12px;border-radius:6px;background:#161b22;border:1px solid #30363d;font-family:var(--font-mono);font-size:10.5px;color:#c9d1d9;">
            $ git clone https://github.com/BrianV1981/aim-connect.git &amp;&amp; cd aim-connect &amp;&amp; ./startup.sh
          </div>
          <div style="display:flex;height:7px;border-radius:999px;overflow:hidden;">
            <span style="width:52%;background:#3572A5;" title="Python 52%"></span>
            <span style="width:42%;background:#f1e05a;" title="JavaScript 42%"></span>
            <span style="width:6%;background:#563d7c;" title="CSS 6%"></span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderHomepage() {
  return `
    <div class="home-stage">
      <div class="home-hero-badge">
        <span class="pulse-led"></span>
        <span>SOVEREIGN FLEET COCKPIT // 100% OPEN SOURCE</span>
      </div>

      <div>
        <h1 class="home-slogan">
          Own your stack.<br/>
          <span class="home-slogan-grad" id="scramble-home-slogan">Don't rent a seat.</span>
        </h1>
        <p style="max-width:480px;margin:12px auto 0;font-size:13.5px;color:var(--text-secondary);line-height:1.6;">
          You are securely authenticated via 3FA &amp; E2EE, with no active workspace attached to the center viewport.
        </p>
      </div>

      <div class="home-quick-card ld-mask-glass">
        <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:0.16em;color:var(--accent);">
          QUICK LAUNCH // ATTACH WORKSPACE
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:7px;">
          ${state.sessions
            .slice(0, 5)
            .map(
              (s) => `
            <button
              class="project-pill"
              style="--agent-color:${s.color.hex};--agent-rgb:${s.color.rgb};cursor:pointer;padding:5px 12px;"
              data-pick-sess="${s.name}"
            >
              <span class="project-pill-dot"></span>
              ${s.name}
            </button>
          `
            )
            .join('')}
        </div>
        <div style="font-size:12px;color:var(--text-muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-top:6px;border-top:1px solid var(--border-hairline);">
          <span>Press <span class="mono-kbd">⌘K</span> to search sessions, macros &amp; commands</span>
          <span>Click <strong>+ NEW</strong> in the Fleet rail to spawn an isolated node</span>
        </div>
      </div>

      <div class="home-coffee-card">
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.6;max-width:460px;">
          A.I.M. Connect is proudly <strong>100% ad-free and open-source</strong>. If this tool helps you take back control, consider buying me a coffee to keep the servers humming.
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:2px;">
          <a href="https://buymeacoffee.com/brianv1981" target="_blank" rel="noreferrer" class="coffee-cta-btn">
            ${ICONS.coffee}
            <span>BUY ME A COFFEE</span>
          </a>
          <a href="https://github.com/BrianV1981/aim-connect" target="_blank" rel="noreferrer" class="subbar-util-btn" style="height:36px;padding:0 12px;text-decoration:none;">
            [ GITHUB ]
          </a>
          <a href="https://github.com/BrianV1981/aim-ecosystem" target="_blank" rel="noreferrer" class="subbar-util-btn" style="height:36px;padding:0 12px;text-decoration:none;">
            [ A.I.M. ECOSYSTEM ]
          </a>
        </div>
      </div>
    </div>
  `;
}

function renderTmuxServerWorkspace(sess) {
  const wins = sess.tmuxWindows || [];
  const activeIdx = Math.min(wins.length - 1, Math.max(0, state.tmuxActivePane));
  const gridClass = !state.tmuxGridMode || wins.length <= 1 ? 'grid-1' : wins.length === 2 ? 'grid-2' : 'grid-4';
  const visibleWins = state.tmuxGridMode ? wins : [wins[activeIdx]].filter(Boolean);

  return `
    <div class="tmux-server-stage">
      <div class="tmux-status-strip">
        <div class="tmux-win-pills">
          <span style="color:#10b981;font-weight:800;">[tmux: ${escapeHtml(sess.name)}]</span>
          ${wins
            .map(
              (w, idx) => `
            <button
              type="button"
              class="tmux-win-btn ${activeIdx === idx ? 'active' : ''}"
              data-tmux-win="${idx}"
              title="Focus window ${escapeHtml(w.title)}"
            >
              ${escapeHtml(w.id)}${activeIdx === idx ? '*' : ''}
            </button>
          `
            )
            .join('')}
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="color:#94a3b8;font-size:10px;">${escapeHtml(sess.uptime || 'ONLINE')} · NO AGENT / NO BROWSER</span>
          ${
            wins.length > 1
              ? `
            <button type="button" class="tmux-win-btn ${state.tmuxGridMode ? 'active' : ''}" data-act="toggle-tmux-grid">
              ${state.tmuxGridMode ? `⊞ SPLIT (${wins.length} PANES)` : '▢ 1-WINDOW VIEW'}
            </button>
          `
              : ''
          }
        </div>
      </div>

      <div class="tmux-pane-grid ${gridClass}">
        ${visibleWins
          .map((w) => {
            const realIdx = wins.indexOf(w);
            const extra = state.tmuxPaneLogs[`${sess.name}:${realIdx}`] || [];
            const allLines = [...w.lines, ...extra];
            return `
              <div class="tmux-raw-pane ${realIdx === activeIdx ? 'focused-pane' : ''}" data-tmux-pane="${realIdx}">
                <div class="tmux-pane-hdr">
                  <span style="color:${realIdx === activeIdx ? '#00ffa3' : '#94a3b8'};font-weight:700;">
                    ${realIdx === activeIdx ? '● ' : ''}${escapeHtml(w.title)}
                  </span>
                  <span>PID ${escapeHtml(w.pid)} · ${escapeHtml(w.cwd)}</span>
                </div>
                <pre class="tmux-pane-log" style="font-size:${Math.max(11, state.termFontSize - 1)}px;"><span style="color:#6ee7b7;">$ ${escapeHtml(w.cmd)}</span>\n${allLines.map((l) => escapeHtml(l)).join('\n')}</pre>
              </div>
            `;
          })
          .join('')}
      </div>

      <form class="tmux-shell-bar" id="tmux-shell-form">
        <span style="color:#10b981;font-weight:700;white-space:nowrap;">
          operator@sovereign-node:${escapeHtml((wins[activeIdx]?.cwd || '~').replace('~', '~'))}$
        </span>
        <input
          class="tmux-shell-inp"
          id="tmux-shell-inp"
          placeholder="Send raw bash command to pane ${escapeHtml(wins[activeIdx]?.id || '0')} (e.g. ./startup.sh, lsof -i :8000, git status)..."
          autocomplete="off"
        />
        <button type="submit" class="subbar-util-btn active">EXEC ⏎</button>
      </form>
    </div>
  `;
}

function renderHistoryVault(sess) {
  const isRawTmux = sess && sess.isAgent === false;
  const targetName = sess && sess.isAgent !== false ? sess.name : 'aim-connect';
  const projectEntries = SESSION_HISTORY_REINCARNATIONS.filter((h) => h.session === targetName);
  const q = state.historySearch.trim().toLowerCase();
  const baseEntries = state.historyScope === 'project' ? projectEntries : SESSION_HISTORY_REINCARNATIONS;
  const effectiveEntries = baseEntries.filter((h) => {
    if (state.historyVesselFilter !== 'ALL' && h.vessel !== state.historyVesselFilter) return false;
    if (q && !`${h.session} ${h.gen || ''} ${h.id} ${h.title} ${h.vessel}`.toLowerCase().includes(q)) return false;
    return true;
  });

  // Project Session Count Breakdown Pills (Agent projects with 10, 6, 5, 4, 3, 2, 1 sessions!)
  const projectCounts = state.sessions
    .filter((s) => s.isAgent !== false)
    .map((s) => ({
      name: s.name,
      color: s.color,
      cnt: SESSION_HISTORY_REINCARNATIONS.filter((h) => h.session === s.name).length,
    }));

  return `
    <div class="history-vault">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px;padding-bottom:10px;border-bottom:1px solid var(--border-hairline);">
        <div>
          <div style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:var(--accent);letter-spacing:0.1em;">
            PROJECT SESSION NOTEBOOK &amp; BATON-PASS REINCARNATIONS
          </div>
          <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">
            ${
              isRawTmux
                ? `Note: ${escapeHtml(sess.name)} is a raw non-agent tmux server session (0 LLM transcripts) — showing ${escapeHtml(targetName)} notebook below.`
                : 'Switch models/harnesses at ~30% context with zero amnesia—click TURNS (N) on any generation to inspect all N recorded turns.'
            }
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <button class="subbar-util-btn ${state.historyScope === 'project' ? 'active' : ''}" data-hist-scope="project">
            ${targetName.toUpperCase()} (${projectEntries.length} SESSIONS)
          </button>
          <button class="subbar-util-btn ${state.historyScope === 'all' ? 'active' : ''}" data-hist-scope="all">
            ALL FLEET (${SESSION_HISTORY_REINCARNATIONS.length} SESSIONS)
          </button>
          <button class="ghost-btn" style="height:26px;padding:0 8px;" data-act="toggle-history">${ICONS.close}</button>
        </div>
      </div>

      <!-- Jump Between Projects to Compare 10 Sessions vs 6 vs 5 vs 4 vs 3 vs 2 vs 1 -->
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <span style="font-family:var(--font-mono);font-size:9.5px;color:var(--text-muted);letter-spacing:0.1em;">BY PROJECT:</span>
        ${projectCounts
          .map(
            (p) => `
          <button
            type="button"
            class="fav-chip ${state.historyScope === 'project' && targetName === p.name ? 'active' : ''}"
            style="${state.historyScope === 'project' && targetName === p.name ? `border-color:${p.color.hex};color:${p.color.hex};` : ''}"
            data-hist-proj="${p.name}"
          >
            ${p.name} (${p.cnt})
          </button>
        `
          )
          .join('')}
      </div>

      ${
        state.historyScope === 'project' && projectEntries.length > 1
          ? `
        <!-- Cross-Harness Baton-Pass Chain -->
        <div class="baton-chain-bar">
          <span style="color:var(--accent);font-weight:700;white-space:nowrap;">BATON RELAY:</span>
          ${[...projectEntries]
            .reverse()
            .map(
              (h, i) => `
            ${i > 0 ? `<span style="color:var(--text-muted);">-&gt;</span>` : ''}
            <span class="baton-node ${h.isCurrent ? 'current' : ''}" data-expand-hist="${h.id}" title="${escapeHtml(h.title)}">
              <span>${h.gen || `G${i + 1}`}</span>
              <strong>${h.vessel}</strong>
            </span>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }

      <!-- Search + Harness Filter Row -->
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <input
          class="ld-text-input"
          id="hist-search-inp"
          style="flex:1;min-width:200px;height:30px;"
          placeholder="Search ${baseEntries.length} session titles, UUIDs, issues (#253, #539), or harnesses..."
          value="${escapeHtml(state.historySearch)}"
        />
        <div style="display:flex;gap:4px;">
          ${['ALL', 'AGY', 'GROK', 'OC', 'CDX']
            .map(
              (v) => `
            <button type="button" class="fav-chip ${state.historyVesselFilter === v ? 'active' : ''}" data-hist-vessel="${v}">${v}</button>
          `
            )
            .join('')}
        </div>
      </div>

      ${effectiveEntries
        .map((h, idx) => {
          const expanded = state.expandedHistoryIds.includes(h.id);
          const isCopied = state.copiedHistoryId === h.id;
          const isExported = state.exportedFlightId === h.id;
          const sMeta = state.sessions.find((m) => m.name === h.session) || state.sessions[0];
          const fullTurns = expanded ? getFullSessionTurns(h) : null;
          return `
            ${idx > 0 ? `<div class="reincarnation-divider">BATON PASSED FROM PREVIOUS GENERATION</div>` : ''}
            <div class="history-card ${h.isCurrent ? 'is-current' : ''}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">
                  <span class="mono-kbd" style="color:var(--accent);border-color:rgba(var(--accent-rgb),0.4);font-weight:700;">${h.gen || 'GEN'}</span>
                  <span class="project-pill" style="--agent-color:${sMeta.color.hex};--agent-rgb:${sMeta.color.rgb};">
                    <span class="project-pill-dot"></span> ${h.session}
                  </span>
                  <span class="mono-kbd">${h.vessel}</span>
                  <span class="mono-kbd">${escapeHtml(h.seal || 'SEALED')}</span>
                  <span style="font-family:var(--font-mono);font-size:10.5px;color:${h.isCurrent ? 'var(--accent)' : 'var(--text-muted)'};font-weight:700;">
                    ${escapeHtml(h.when)}
                  </span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                  <button type="button" class="subbar-util-btn ${isCopied ? 'active' : ''}" data-copy-hist="${h.id}" title="Copy Session Name + Gen + UUID + Transcript Path">
                    ${isCopied ? ICONS.check : ICONS.copyText}
                    <span>${isCopied ? 'COPIED REF!' : 'COPY ID & REF'}</span>
                  </button>
                  <button type="button" class="subbar-util-btn" data-inject-hist="${h.id}" title="Inject Session UUID & Transcript Path into active agent composer">
                    ${ICONS.send}
                    <span>SEND TO AGENT</span>
                  </button>
                  <button type="button" class="subbar-util-btn ${isExported ? 'active' : ''}" data-flight-hist="${h.id}" title="Download complete ${h.turns}-turn Flight Recorder Markdown">
                    ${ICONS.download}
                    <span>${isExported ? 'SAVED .MD!' : 'FLIGHT RECORD'}</span>
                  </button>
                  <button type="button" class="fav-chip ${expanded ? 'active' : ''}" data-expand-hist="${h.id}">
                    ${expanded ? `HIDE TURNS (${h.turns})` : `TURNS (${h.turns})`}
                  </button>
                </div>
              </div>

              <div style="font-weight:600;font-size:13px;color:var(--text-primary);">${escapeHtml(h.title)}</div>

              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:6px 10px;border-radius:8px;background:var(--bg-input);border:1px solid var(--border-hairline);font-family:var(--font-mono);font-size:10.5px;color:var(--text-secondary);">
                <span>SESSION ID: <strong style="color:var(--text-primary);user-select:all;">${h.id}</strong></span>
                <span style="color:var(--text-muted);">${h.turns} turns (${h.turns * 2} msgs) · ${escapeHtml(h.tokens)} ctx · ${escapeHtml(h.logPath.split('/').slice(-1)[0])}</span>
              </div>

              ${
                expanded && fullTurns
                  ? `
                <div class="history-turns-shell">
                  <div class="history-turns-bar">
                    <span>SHOWING ALL ${fullTurns.length} / ${h.turns} RECORDED TURNS (${fullTurns.length * 2} MESSAGES)</span>
                    <button type="button" class="fav-chip" data-jump-hist-end="hist-vp-${h.id}">JUMP TO TURN #${fullTurns.length} ↓</button>
                  </div>
                  <div class="history-turns-viewport" id="hist-vp-${h.id}">
                    ${fullTurns
                      .map(
                        (t) => `
                      <div class="history-turn-pair">
                        <div class="history-turn-head">
                          <span style="color:var(--text-primary);font-weight:700;">TURN #${String(t.idx).padStart(2, '0')} / ${String(fullTurns.length).padStart(2, '0')}</span>
                          <span>${t.stamp} · ${h.vessel}</span>
                        </div>
                        <div class="history-turn-op">
                          <span style="font-size:9.5px;font-weight:700;color:#38bdf8;letter-spacing:0.1em;">[OPERATOR // BRIAN]</span>
                          <div style="margin-top:2px;">${escapeHtml(t.operator)}</div>
                        </div>
                        <div class="history-turn-ag">
                          <span class="history-turn-tool">&gt;_ ${escapeHtml(t.tool)}</span>
                          <div><strong style="color:var(--accent);font-size:9.5px;letter-spacing:0.08em;">[J.O.S.H.U.A.]</strong> ${escapeHtml(t.agent)}</div>
                        </div>
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                </div>
              `
                  : ''
              }
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderFilesView(isFull) {
  const entry = FILES_DB[state.activeFile] || FILES_DB['HANDOFF.md'];
  const fileKeys = Object.keys(FILES_DB);

  return `
    <div class="copilot-top-bar">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;">
        <button class="subbar-util-btn ${state.filesNavMode === 'files' ? 'active' : ''}" data-fnav="files">
          ${ICONS.files} <span>FILES</span>
        </button>
        <button class="subbar-util-btn ${state.filesNavMode === 'git' ? 'active' : ''}" data-fnav="git">
          ${ICONS.gitBranch} <span>GIT DIFF (3)</span>
        </button>
        <span style="opacity:0.25;">|</span>
        <button class="fav-chip ${state.activeFile === 'HANDOFF.md' ? 'active' : ''}" data-file="HANDOFF.md">HANDOFF.md</button>
        <button class="fav-chip ${state.activeFile === 'AGENTS.md' ? 'active' : ''}" data-file="AGENTS.md">AGENTS.md</button>
        <button class="fav-chip ${state.activeFile === 'memory-wiki/index.md' ? 'active' : ''}" data-file="memory-wiki/index.md">memory-wiki/</button>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
        <button class="subbar-util-btn" data-act="save-file">${ICONS.check} <span>${state.fileSavedBadge || 'SAVE'}</span></button>
        <button class="subbar-util-btn" data-act="copy-file">${ICONS.copyText} <span>COPY ALL</span></button>
        <button
          class="pane-full-upgrade-btn desktop-only ${isFull ? 'is-full' : ''}"
          data-act="toggle-full"
          title="${isFull ? 'Return Files to Split Screen' : 'Upgrade Files to Full View'}"
        >
          ${isFull ? ICONS.split : ICONS.maximize}
          <span>${isFull ? 'SPLIT VIEW' : 'FULL VIEW'}</span>
        </button>
        <button class="ghost-btn" style="height:26px;padding:0 6px;" data-act="close-tool" title="Close Files">${ICONS.close}</button>
      </div>
    </div>

    ${
      state.fileConflictBanner
        ? `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 14px;background:rgba(245,158,11,0.14);border-bottom:1px solid rgba(245,158,11,0.45);font-family:var(--font-mono);font-size:11px;color:#fbbf24;">
        <span>HTTP 409 MTIME GUARD // Agent modified ${state.activeFile} on disk since opened.</span>
        <div style="display:flex;gap:6px;">
          <button class="fav-chip" data-act="toggle-conflict">RELOAD DISK</button>
          <button class="fav-chip" data-act="toggle-conflict">OVERWRITE</button>
        </div>
      </div>
    `
        : ''
    }

    <div class="files-split-body">
      <div class="files-tree-rail desktop-only">
        <div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text-muted);padding:2px 6px 6px;letter-spacing:0.12em;">EXPLORER</div>
        ${fileKeys
          .map((k) => {
            const meta = FILES_DB[k];
            return `
              <button class="tree-file-btn ${state.activeFile === k ? 'active' : ''}" data-file="${k}">
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${k}</span>
                ${meta.status ? `<span style="color:${meta.status === 'M' ? '#fbbf24' : 'var(--accent)'};font-size:10px;">${meta.status}</span>` : ''}
              </button>
            `;
          })
          .join('')}
        <button class="fav-chip" style="margin-top:auto;" data-act="toggle-conflict" title="Preview production HTTP 409 mtime conflict guard">
          Test 409 Guard
        </button>
      </div>

      ${
        state.filesNavMode === 'git'
          ? `
        <div class="git-diff-grid">
          <div class="diff-col">
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:8px;">HEAD // ${state.activeFile}</div>
            ${entry.oldDiff
              .split('\n')
              .map((l) => `<div class="diff-del">${escapeHtml(l)}</div>`)
              .join('')}
          </div>
          <div class="diff-col">
            <div style="font-size:10px;color:var(--accent);margin-bottom:8px;">WORKING TREE // ${state.activeFile}</div>
            ${entry.newDiff
              .split('\n')
              .map((l) => `<div class="diff-add">${escapeHtml(l)}</div>`)
              .join('')}
          </div>
        </div>
      `
          : `
        <pre style="flex:1;margin:10px;padding:16px;border-radius:12px;background:var(--bg-term);border:1px solid var(--border-hairline);font-family:var(--font-mono);font-size:12px;line-height:1.75;color:var(--text-primary);overflow:auto;user-select:text;"><code>${entry.code
          .split('\n')
          .map(
            (line, i) =>
              `<span style="display:inline-block;width:28px;color:var(--text-muted);user-select:none;">${i + 1}</span>${escapeHtml(line)}`
          )
          .join('\n')}</code></pre>
      `
      }
    </div>
  `;
}

function renderSovereignKeyboard() {
  if (!state.showOnScreenKeyboard) return '';

  if (state.keyboardMode === 'hacker') {
    return `
      <div class="sovereign-kb-dock">
        <div class="kb-toolbar">
          <div style="display:flex;gap:5px;align-items:center;">
            <button type="button" class="subbar-util-btn" data-kb-mode="standard">STANDARD ABC</button>
            <button type="button" class="subbar-util-btn active" data-kb-mode="hacker">HACKER KEYS</button>
          </div>
          <button type="button" class="ghost-btn" style="height:24px;padding:0 7px;" data-act="toggle-os-kb">${ICONS.close}</button>
        </div>
        <div class="kb-row">
          ${['ESC', 'TAB', '^C', '^D', '^Z', '^L', 'PGUP', 'PGDN', 'HOME', 'END']
            .map((k) => `<button type="button" class="kb-cap" data-kb-key="${k}">${k}</button>`)
            .join('')}
        </div>
        <div class="kb-row">
          ${['/', '-', '|', '~', '_', ':', ';', '"', "'", 'BKSP']
            .map((k) => `<button type="button" class="kb-cap" data-kb-key="${k}">${k}</button>`)
            .join('')}
        </div>
        <div class="kb-row">
          ${['(', ')', '[', ']', '{', '}', '<', '>', '&&', '↑']
            .map((k) => `<button type="button" class="kb-cap" data-kb-key="${k}">${k}</button>`)
            .join('')}
        </div>
        <div class="kb-row">
          <button type="button" class="kb-cap wide" data-kb-key="/aim-handoff">/handoff</button>
          <button type="button" class="kb-cap space" data-kb-key=" ">SPACE</button>
          <button type="button" class="kb-cap" data-kb-key="←">←</button>
          <button type="button" class="kb-cap" data-kb-key="↓">↓</button>
          <button type="button" class="kb-cap" data-kb-key="→">→</button>
          <button type="button" class="kb-cap wide" data-kb-key="ENTER">ENTER ⏎</button>
        </div>
      </div>
    `;
  }

  const upper = state.kbShift > 0;
  const rows =
    state.kbLayer === 'sym'
      ? [
          ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
          ['@', '#', '$', '%', '&', '-', '+', '(', ')', '/'],
          ['*', '"', "'", ':', ';', '!', '?', '~', '`', '\\'],
        ]
      : state.kbLayer === 'fn'
      ? [
          ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'],
          ['F11', 'F12', 'ESC', 'TAB', 'INS', 'DEL', 'HOME', 'END', 'PGUP', 'PGDN'],
          ['^C', '^V', '^W', '^U', '^R', '←', '↓', '↑', '→', 'BKSP'],
        ]
      : [
          ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].map((c) => (upper ? c.toUpperCase() : c)),
          ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '/'].map((c) => (upper ? c.toUpperCase() : c)),
          ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '-'].map((c) => (upper ? c.toUpperCase() : c)),
        ];

  return `
    <div class="sovereign-kb-dock">
      <div class="kb-toolbar">
        <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;">
          <button type="button" class="subbar-util-btn active" data-kb-mode="standard">STANDARD</button>
          <button type="button" class="subbar-util-btn" data-kb-mode="hacker">HACKER</button>
          <span style="opacity:0.25;">|</span>
          <button type="button" class="fav-chip ${state.kbLayer === 'abc' ? 'active' : ''}" data-kb-layer="abc">ABC</button>
          <button type="button" class="fav-chip ${state.kbLayer === 'sym' ? 'active' : ''}" data-kb-layer="sym">?123</button>
          <button type="button" class="fav-chip ${state.kbLayer === 'fn' ? 'active' : ''}" data-kb-layer="fn">Fn F1–F12</button>
        </div>
        <button type="button" class="ghost-btn" style="height:24px;padding:0 7px;" data-act="toggle-os-kb">${ICONS.close}</button>
      </div>

      ${rows
        .map(
          (r) => `
        <div class="kb-row">
          ${r.map((k) => `<button type="button" class="kb-cap" data-kb-key="${k}">${k}</button>`).join('')}
        </div>
      `
        )
        .join('')}

      <div class="kb-row">
        <button type="button" class="kb-cap ${state.kbShift > 0 ? 'mod-active' : ''}" data-act="kb-shift">
          ${state.kbShift === 2 ? '⇪ CAPS' : state.kbShift === 1 ? '⬆ SHIFT' : '⇧'}
        </button>
        <button type="button" class="kb-cap ${state.kbCtrl ? 'mod-active' : ''}" data-act="kb-ctrl">CTRL</button>
        <button type="button" class="kb-cap space" data-kb-key=" ">SPACE</button>
        <button type="button" class="kb-cap" data-kb-key="BKSP">⌫</button>
        <button type="button" class="kb-cap wide" data-kb-key="ENTER">ENTER ⏎</button>
      </div>
    </div>
  `;
}

function renderSettingsModal(sess) {
  return `
    <div class="modal-veil" data-act="close-modal">
      <div class="ld-modal-card wide" onclick="event.stopPropagation()">
        <div class="modal-header-bar">
          <div>
            <div style="font-family:var(--font-mono);font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;">
              <span style="color:var(--accent);display:flex;">${ICONS.settings}</span>
              <span>SYSTEM SETTINGS &amp; VAULT</span>
            </div>
            <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.14em;color:var(--accent);margin-top:3px;">
              100% PARITY: APPEARANCE · KEYBOARD · VOICE/TTS · INTEGRATIONS · 3FA/E2EE
            </div>
          </div>
          <button class="ghost-btn" style="padding:0 6px;" data-act="close-modal">${ICONS.close}</button>
        </div>

        <div class="modal-tabs-rail">
          ${[
            ['appearance', 'APPEARANCE & APP'],
            ['keyboard', 'KEYBOARD & ALERTS'],
            ['voice', 'VOICE & NEURAL TTS'],
            ['integrations', 'INTEGRATIONS VAULT'],
            ['security', 'SECURITY & 3FA'],
          ]
            .map(
              ([id, label]) => `
            <button type="button" class="modal-tab-btn ${state.settingsTab === id ? 'active' : ''}" data-stab="${id}">
              ${label}
            </button>
          `
            )
            .join('')}
        </div>

        <div class="modal-body-scroll">
          ${
            state.settingsTab === 'appearance'
              ? `
            <div style="padding:14px;border-radius:12px;background:rgba(var(--accent-rgb),0.06);border:1px solid rgba(var(--accent-rgb),0.32);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
              <div>
                <div style="font-family:var(--font-mono);font-size:12px;font-weight:700;">STANDALONE APP MODE (POP-OUT WINDOW)</div>
                <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">
                  Pop AIM Connect out of the browser into a chromeless desktop/mobile app window like LeadDeeds.
                </div>
              </div>
              <button class="neon-cta-btn" id="confirm-pwa-btn" style="height:34px;padding:0 14px;">
                ${ICONS.download}
                <span>${state.deferredPrompt ? 'INSTALL APP NOW' : 'INSTALL APP'}</span>
              </button>
            </div>

            <div class="settings-group-card">
              <div class="settings-group-title">UI COLOR SCHEME (SYNCED ACROSS UI, TERMINAL &amp; MONACO)</div>
              <div class="theme-swatch-grid">
                ${[
                  ['emerald', 'Emerald Matrix', 'LeadDeeds #050505 + #00FFA3', '#050505', '#00FFA3'],
                  ['oled', 'Pure OLED Black', 'Zero-glow #000000 high contrast', '#000000', '#00FFA3'],
                  ['light', 'Daylight Crisp', 'Clean #FFFFFF light workspace', '#ffffff', '#047857'],
                  ['navy', 'Classic AIM Navy', 'Heritage #0B162C + #FF5722', '#0b162c', '#ff5722'],
                ]
                  .map(
                    ([id, title, sub, bg, acc]) => `
                  <button class="theme-option-card ${state.theme === id ? 'selected' : ''}" data-theme-btn="${id}">
                    <span style="width:28px;height:28px;border-radius:8px;background:${bg};border:2px solid ${acc};flex-shrink:0;"></span>
                    <div>
                      <div style="font-weight:600;font-size:12.5px;">${title}</div>
                      <div style="font-size:10.5px;color:var(--text-muted);margin-top:2px;">${sub}</div>
                    </div>
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>

            <div class="settings-group-card">
              <div class="settings-group-title">OPERATOR REPLIES (COLOR HIGHLIGHT &amp; CHAT-BOX DOT SIDE)</div>
              <div style="font-size:11.5px;color:var(--text-secondary);">
                Make your prompts stand out from J.O.S.H.U.A. outputs and choose whether your status dot sits on the left or right like a chat box.
              </div>
              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
                ${[
                  ['cyan', 'Cyber Cyan Highlight', 'Crisp #00B8FF chat tint + bright text', '#00b8ff'],
                  ['gold', 'Command Gold Highlight', 'Warm #F59E0B amber tint + bright text', '#f59e0b'],
                  ['emerald', 'Emerald Mint Highlight', 'Neon #00FFA3 tint + bright text', '#00ffa3'],
                  ['grey', 'Default Muted Grey', 'Classic subtle unhighlighted log style', '#6b7280'],
                ]
                  .map(
                    ([id, title, sub, hex]) => `
                  <button type="button" class="theme-option-card ${state.operatorStyle === id ? 'selected' : ''}" style="padding:9px 11px;" data-op-style="${id}">
                    <span style="width:16px;height:16px;border-radius:50%;background:${hex};box-shadow:0 0 8px ${hex};flex-shrink:0;"></span>
                    <div>
                      <div style="font-weight:600;font-size:12px;">${title}</div>
                      <div style="font-size:10px;color:var(--text-muted);">${sub}</div>
                    </div>
                  </button>
                `
                  )
                  .join('')}
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:6px;border-top:1px solid var(--border-hairline);flex-wrap:wrap;">
                <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);">OPERATOR DOT &amp; BUBBLE ALIGNMENT</span>
                <div style="display:flex;gap:6px;">
                  <button type="button" class="subbar-util-btn ${state.operatorSide === 'left' ? 'active' : ''}" data-op-side="left">● LEFT (CLI STREAM)</button>
                  <button type="button" class="subbar-util-btn ${state.operatorSide === 'right' ? 'active' : ''}" data-op-side="right">RIGHT (CHAT BOX) ●</button>
                </div>
              </div>
            </div>

            <div class="settings-group-card">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span class="settings-group-title">TERMINAL FONT SIZE</span>
                <span class="mono-kbd">${state.termFontSize}px</span>
              </div>
              <input type="range" min="10" max="24" step="1" value="${state.termFontSize}" class="ld-range" id="term-fontsize-range" />
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px;">
                <div>
                  <div style="font-size:11px;color:var(--text-secondary);margin-bottom:5px;">Terminal Palette Override</div>
                  <select class="ld-select" id="term-palette-sel">
                    <option value="match" ${state.termPalette === 'match' ? 'selected' : ''}>Match Active UI Theme</option>
                    <option value="standard" ${state.termPalette === 'standard' ? 'selected' : ''}>Standard Navy / Slate</option>
                    <option value="hacker" ${state.termPalette === 'hacker' ? 'selected' : ''}>Hacker Matrix Green</option>
                    <option value="contrast" ${state.termPalette === 'contrast' ? 'selected' : ''}>High Contrast B&amp;W</option>
                  </select>
                </div>
                <div style="display:flex;align-items:flex-end;">
                  <div style="font-family:var(--font-mono);font-size:${state.termFontSize}px;padding:6px 10px;border-radius:8px;background:var(--bg-term);border:1px solid var(--border-hairline);width:100%;">
                    $ joshua --status ✓
                  </div>
                </div>
              </div>
            </div>
          `
              : state.settingsTab === 'keyboard'
              ? `
            <div class="settings-group-card">
              <div class="settings-group-title">SOVEREIGN ON-SCREEN KEYBOARD</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                  <div style="font-size:11px;color:var(--text-secondary);margin-bottom:5px;">Default Keyboard Mode</div>
                  <select class="ld-select" id="set-kb-mode">
                    <option value="standard" ${state.keyboardMode === 'standard' ? 'selected' : ''}>Standard Alpha (ABC / ?123 / Fn)</option>
                    <option value="hacker" ${state.keyboardMode === 'hacker' ? 'selected' : ''}>Hacker Terminal (Esc / Tab / Arrows)</option>
                  </select>
                </div>
                <div>
                  <div style="font-size:11px;color:var(--text-secondary);margin-bottom:5px;">Keypress Tactile Feedback</div>
                  <select class="ld-select" id="set-kb-feedback">
                    <option value="ticks" ${state.kbFeedback === 'ticks' ? 'selected' : ''}>Subtle Audio Ticks</option>
                    <option value="haptic" ${state.kbFeedback === 'haptic' ? 'selected' : ''}>Haptic Vibration (Mobile)</option>
                    <option value="off" ${state.kbFeedback === 'off' ? 'selected' : ''}>Silent / Off</option>
                  </select>
                </div>
              </div>
              <label class="setting-check-row">
                <div>
                  <div style="font-weight:600;">Auto-Capitalize Sentences</div>
                  <div style="font-size:11px;color:var(--text-muted);">Automatically shift first letter on Standard mobile keyboard</div>
                </div>
                <input type="checkbox" data-bool-set="autoCaps" ${state.autoCaps ? 'checked' : ''} />
              </label>
            </div>

            <div class="settings-group-card">
              <div class="settings-group-title">FLEET AUDIO ALERTS</div>
              <label class="setting-check-row">
                <div>
                  <div style="font-weight:600;">Agent Completion &amp; Approval Gate Chime</div>
                  <div style="font-size:11px;color:var(--text-muted);">Play alert chime when a background session completes a turn (NEW) or pauses at WAITING</div>
                </div>
                <input type="checkbox" data-bool-set="alertChime" ${state.alertChime ? 'checked' : ''} />
              </label>
            </div>
          `
              : state.settingsTab === 'voice'
              ? `
            <div class="settings-group-card">
              <div class="settings-group-title">NEURAL TEXT-TO-SPEECH (SPOKEN SUMMARY 🔊)</div>
              <label class="setting-check-row">
                <div>
                  <div style="font-weight:600;">Auto-Playback Agent Spoken Summary</div>
                  <div style="font-size:11px;color:var(--text-muted);">Automatically read aloud the final 🔊 block when an agent turn finishes</div>
                </div>
                <input type="checkbox" data-bool-set="voiceAutoRead" ${state.voiceAutoRead ? 'checked' : ''} />
              </label>
              <div style="display:flex;gap:8px;align-items:center;">
                <select class="ld-select" id="set-tts-voice" style="flex:1;">
                  ${TTS_VOICES.map(
                    (v) => `<option value="${v.id}" ${state.ttsVoice === v.id ? 'selected' : ''}>${v.label}</option>`
                  ).join('')}
                </select>
                <button type="button" class="neon-cta-btn" style="height:34px;" data-act="test-tts-voice">
                  ${ICONS.play} <span>TEST VOICE</span>
                </button>
              </div>
            </div>

            <div class="settings-group-card" style="background:rgba(var(--accent-rgb),0.05);border-color:rgba(var(--accent-rgb),0.36);">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                <div style="flex:1;min-width:220px;">
                  <div class="settings-group-title" style="display:flex;align-items:center;gap:6px;">
                    ${ICONS.zap}
                    <span>CUSTOM VOICE MACROS (SPOKEN COMMAND ENGINE)</span>
                  </div>
                  <div style="font-size:11.5px;color:var(--text-secondary);line-height:1.55;margin-top:4px;">
                    Any custom macro can be bound to a spoken trigger phrase—say your phrase into the mic to fire bash scripts, agent skills (<code>/aim-handoff</code>, <code>/aim-memory-wiki</code>), or terminal keys hands-free at will.
                  </div>
                </div>
                <button type="button" class="neon-cta-btn" style="height:34px;padding:0 14px;" data-act="open-voice-macros">
                  ${ICONS.settings}
                  <span>MACRO SETTINGS (${state.macros.filter((m) => m.voiceTrigger).length} VOICE ACTIVE)</span>
                </button>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;padding-top:4px;border-top:1px solid var(--border-hairline);">
                ${state.macros
                  .filter((m) => m.voiceTrigger)
                  .map(
                    (m) => `
                  <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:999px;background:var(--bg-input);border:1px solid var(--border-hairline);font-family:var(--font-mono);font-size:10px;">
                    <strong style="color:var(--accent);">"${escapeHtml(m.voiceTrigger)}"</strong>
                    <span style="color:var(--text-muted);">-> ${escapeHtml(m.label)}</span>
                  </span>
                `
                  )
                  .join('')}
              </div>
            </div>

            <div class="settings-group-card">
              <div class="settings-group-title">VOICE DICTATION &amp; HANDS-FREE TRIGGERS</div>
              ${[
                ['voiceContinuous', 'Continuous Listening Loop', 'Keep microphone active across turns until manually toggled off'],
                ['voiceAutoEnter', 'Say "Enter" to Submit (\\r)', 'Speaking the word "enter" dispatches prompt immediately'],
                ['voiceAutoSend', 'Say "Send" to Submit (\\r)', 'Speaking the word "send" dispatches prompt immediately'],
                ['voiceAutoExecute', 'Say "Execute" to Submit (\\r)', 'Speaking the word "execute" dispatches prompt immediately'],
                ['voiceAutoCapitalize', 'Auto-Capitalize Dictated Sentences', 'Clean punctuation and sentence casing on speech transcripts'],
                ['voiceSlashes', 'Verbal Slash Conversion (/ \\)', 'Convert spoken "slash" and "backslash" for CLI skill commands'],
              ]
                .map(
                  ([key, title, sub]) => `
                <label class="setting-check-row">
                  <div>
                    <div style="font-weight:600;">${title}</div>
                    <div style="font-size:11px;color:var(--text-muted);">${sub}</div>
                  </div>
                  <input type="checkbox" data-bool-set="${key}" ${state[key] ? 'checked' : ''} />
                </label>
              `
                )
                .join('')}
            </div>
          `
              : state.settingsTab === 'integrations'
              ? `
            <div class="settings-group-card">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div>
                  <div class="settings-group-title">ZERO-OAUTH OUTBOUND EMAIL VAULT</div>
                  <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">
                    Scoped to active node: <strong>${sess.name}</strong> (encrypted local credential store)
                  </div>
                </div>
                <span class="e2ee-status-chip">${ICONS.check} VAULTED</span>
              </div>
              <div>
                <div style="font-size:11px;color:var(--text-secondary);margin-bottom:5px;">Gmail / Workspace Address</div>
                <input class="ld-text-input" id="vault-email-inp" value="${escapeHtml(state.vaultEmail)}" />
              </div>
              <div>
                <div style="font-size:11px;color:var(--text-secondary);margin-bottom:5px;">Google 16-Character App Password</div>
                <input class="ld-text-input" type="password" id="vault-pass-inp" value="${escapeHtml(state.vaultAppPass)}" />
              </div>
              <div style="display:flex;justify-content:flex-end;">
                <button type="button" class="neon-cta-btn" data-act="save-vault">
                  ${ICONS.plug} <span>${state.vaultSavedBadge || 'SAVE CREDENTIALS'}</span>
                </button>
              </div>
            </div>
          `
              : `
            <div class="settings-group-card">
              <div class="settings-group-title">END-TO-END WEBSOCKET ENCRYPTION (PBKDF2 + AES-256-GCM)</div>
              <div style="font-size:11.5px;color:var(--text-secondary);">
                Shared secret derives your per-frame WebSocket cipher key locally—never transmitted in plaintext.
              </div>
              <div style="display:flex;gap:8px;">
                <input class="ld-text-input" id="e2ee-secret-inp" type="${state.showE2eeSecret ? 'text' : 'password'}" value="${escapeHtml(state.e2eeSecret)}" />
                <button type="button" class="subbar-util-btn" style="height:34px;padding:0 12px;" data-act="toggle-e2ee-vis">
                  ${ICONS.eye} <span>${state.showE2eeSecret ? 'HIDE' : 'SHOW'}</span>
                </button>
              </div>
            </div>

            <div class="settings-group-card">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div>
                  <div class="settings-group-title">HARDWARE BIOMETRICS &amp; WEBAUTHN PASSKEYS</div>
                  <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">Unlock AIM Connect via FaceID, TouchID, or Windows Hello</div>
                </div>
                <button type="button" class="subbar-util-btn active" style="height:30px;" data-act="register-passkey">
                  ${ICONS.fingerprint} <span>+ REGISTER PASSKEY</span>
                </button>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;">
                ${state.passkeys
                  .map(
                    (pk) => `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-radius:8px;background:var(--bg-input);border:1px solid var(--border-hairline);font-family:var(--font-mono);font-size:11px;">
                    <span>${ICONS.shield} ${escapeHtml(pk)}</span>
                    <span style="color:var(--accent);">ACTIVE</span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>

            <div class="settings-group-card" style="border-color:rgba(239,68,68,0.35);">
              <div class="settings-group-title" style="color:#f87171;">SESSION LOCK &amp; TOKEN REVOCATION</div>
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <span style="font-size:11.5px;color:var(--text-secondary);">Preview the Emerald Matrix 3FA Lock Screen or revoke active session token.</span>
                <button type="button" class="danger-btn" data-act="lock-session">
                  ${ICONS.lock} <span>LOGOUT / LOCK 3FA SCREEN</span>
                </button>
              </div>
            </div>
          `
          }
        </div>

        <div class="modal-footer-bar">
          <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--text-muted);">4h sliding active-user session · Zero-cache HTML</span>
          <button class="neon-cta-btn" data-act="close-modal" style="height:34px;padding:0 18px;">DONE</button>
        </div>
      </div>
    </div>
  `;
}

function renderMacroStudioModal() {
  const q = state.macroSearch.trim().toLowerCase();
  const list = state.macros.filter((m) => {
    if (state.macroFilter === 'pinned' && !m.pinned) return false;
    if (state.macroFilter === 'voice' && !m.voiceTrigger) return false;
    if (state.macroFilter === 'server' && !m.isServer) return false;
    if (q && !`${m.label} ${m.cmd} ${m.voiceTrigger || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });

  return `
    <div class="modal-veil" data-act="close-modal">
      <div class="ld-modal-card wide" onclick="event.stopPropagation()">
        <div class="modal-header-bar">
          <div>
            <div style="font-family:var(--font-mono);font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;">
              <span style="color:var(--accent);display:flex;">${ICONS.zap}</span>
              <span>MACRO STUDIO // ALL ${state.macros.length} MACROS</span>
            </div>
            <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.14em;color:var(--accent);margin-top:3px;">
              18 DEFAULT TERMINAL KEYS + GLOBAL SERVER SYNC + VOICE TRIGGERS + JSON BACKUP
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <button type="button" class="subbar-util-btn" data-act="export-macros" title="Download macros.json backup">
              ${ICONS.download} <span>EXPORT JSON</span>
            </button>
            <label class="subbar-util-btn" style="cursor:pointer;" title="Import macros.json">
              ${ICONS.upload} <span>IMPORT JSON</span>
              <input type="file" id="macro-import-file" accept=".json" style="display:none;" />
            </label>
            <button class="ghost-btn" style="padding:0 6px;" data-act="close-modal">${ICONS.close}</button>
          </div>
        </div>

        <div class="modal-tabs-rail">
          ${[
            ['all', `ALL (${state.macros.length})`],
            ['pinned', `PINNED (${state.macros.filter((m) => m.pinned).length})`],
            ['voice', `VOICE TRIGGERS (${state.macros.filter((m) => m.voiceTrigger).length})`],
            ['server', `SERVER GLOBAL (${state.macros.filter((m) => m.isServer).length})`],
          ]
            .map(
              ([id, lbl]) => `
            <button type="button" class="modal-tab-btn ${state.macroFilter === id ? 'active' : ''}" data-mflt="${id}">${lbl}</button>
          `
            )
            .join('')}
        </div>

        <div class="modal-body-scroll">
          <form id="macro-create-form" class="settings-group-card" style="gap:9px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span class="settings-group-title">${state.editingMacroId ? 'EDIT EXISTING MACRO' : 'CREATE NEW MACRO'}</span>
              ${
                state.editingMacroId
                  ? `<button type="button" class="fav-chip" data-act="cancel-edit-macro">Cancel Edit</button>`
                  : `<span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);">Hint: Append \\r to auto-press Enter</span>`
              }
            </div>
            <div style="display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:8px;">
              <input id="new-macro-label" class="ld-text-input" placeholder="Label (e.g. Deploy)" value="${escapeHtml(state.macroForm.label)}" required />
              <input id="new-macro-cmd" class="ld-text-input" placeholder="Command (e.g. ./startup.sh\\r)" value="${escapeHtml(state.macroForm.cmd)}" required />
              <input id="new-macro-voice" class="ld-text-input" placeholder="Voice Trigger (optional)" value="${escapeHtml(state.macroForm.voiceTrigger)}" />
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
              <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                <label style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;cursor:pointer;">
                  <input type="checkbox" id="new-macro-server" ${state.macroForm.isServer ? 'checked' : ''} style="accent-color:var(--accent);" />
                  <span>Sync to Server (Global across devices)</span>
                </label>
                <label style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;cursor:pointer;">
                  <input type="checkbox" id="new-macro-pinned" ${state.macroForm.pinned ? 'checked' : ''} style="accent-color:var(--accent);" />
                  <span>Pin to Bolt Menu &amp; Keybar</span>
                </label>
              </div>
              <button type="submit" class="neon-cta-btn" style="height:32px;">
                ${state.editingMacroId ? ICONS.check : ICONS.plus}
                <span>${state.editingMacroId ? 'UPDATE MACRO' : 'SAVE MACRO'}</span>
              </button>
            </div>
          </form>

          <input class="ld-text-input" id="macro-search-inp" placeholder="Search 22 macros by label, ANSI sequence, or voice phrase..." value="${escapeHtml(state.macroSearch)}" />

          <div style="display:flex;flex-direction:column;gap:6px;">
            ${list
              .map(
                (m) => `
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 11px;border-radius:9px;background:var(--bg-input);border:1px solid var(--border-hairline);">
                <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
                  <input type="checkbox" data-pin-macro="${m.id}" ${m.pinned ? 'checked' : ''} style="width:15px;height:15px;accent-color:var(--accent);cursor:pointer;" title="Pin / Unpin" />
                  <span class="mono-kbd" title="${m.isServer ? 'Synced globally on backend/macros.json' : 'Saved locally on device'}">
                    ${m.isServer ? 'SERVER' : 'LOCAL'}
                  </span>
                  <div style="min-width:0;">
                    <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">
                      <strong style="font-size:12px;">${escapeHtml(m.label)}</strong>
                      ${
                        m.voiceTrigger
                          ? `<span style="font-family:var(--font-mono);font-size:9.5px;padding:1px 6px;border-radius:999px;background:rgba(0,184,255,0.12);border:1px solid rgba(0,184,255,0.4);color:#38bdf8;">mic: "${escapeHtml(m.voiceTrigger)}"</span>`
                          : ''
                      }
                    </div>
                    <div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(m.cmd)}</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">
                  <button type="button" class="subbar-util-btn" data-macro="${escapeHtml(m.cmd)}" title="Dispatch now">${ICONS.play}</button>
                  <button type="button" class="subbar-util-btn" data-edit-macro="${m.id}" title="Edit macro">${ICONS.edit}</button>
                  <button type="button" class="ghost-btn" style="height:25px;padding:0 6px;color:#ef4444;" data-del-macro="${m.id}" title="Delete macro">${ICONS.trash}</button>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <div class="modal-footer-bar">
          <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--text-muted);">Tip: Right-click any chip on the Keybar to unpin instantly.</span>
          <div style="display:flex;align-items:center;gap:8px;">
            ${
              state.macroReturnToVoice
                ? `<button type="button" class="subbar-util-btn active" style="height:34px;padding:0 12px;" data-act="back-to-voice">← BACK TO VOICE SETTINGS</button>`
                : ''
            }
            <button class="neon-cta-btn" data-act="close-modal" style="height:34px;padding:0 18px;">DONE</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderForensicsModal(sess) {
  const q = state.ftsQuery.trim().toLowerCase();
  const hits = FTS5_HITS.filter(
    (h) => h.source === state.ftsMode && (!q || `${h.session} ${h.snippet}`.toLowerCase().includes(q))
  );

  return `
    <div class="modal-veil" data-act="close-modal">
      <div class="ld-modal-card wide" onclick="event.stopPropagation()">
        <div class="modal-header-bar">
          <div>
            <div style="font-family:var(--font-mono);font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;">
              <span style="color:var(--accent);display:flex;">${ICONS.microscope}</span>
              <span>FORENSICS, SQLITE FTS5 &amp; SWARM MATRIX</span>
            </div>
            <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.14em;color:var(--accent);margin-top:3px;">
              ACTIVE NODE: ${sess.name.toUpperCase()} // ON-DEMAND TOOL TRACE &amp; INTER-AGENT COMMS
            </div>
          </div>
          <button class="ghost-btn" style="padding:0 6px;" data-act="close-modal">${ICONS.close}</button>
        </div>

        <div class="modal-tabs-rail">
          <button type="button" class="modal-tab-btn ${state.forensicsTab === 'turns' ? 'active' : ''}" data-ftab="turns">1. TURN &amp; TOOL INSPECTOR</button>
          <button type="button" class="modal-tab-btn ${state.forensicsTab === 'fts5' ? 'active' : ''}" data-ftab="fts5">2. SQLITE FTS5 &amp; BRAIN SEARCH</button>
          <button type="button" class="modal-tab-btn ${state.forensicsTab === 'swarm' ? 'active' : ''}" data-ftab="swarm">3. SWARM (AIM-COMMUNICATE)</button>
        </div>

        <div class="modal-body-scroll">
          ${
            state.forensicsTab === 'turns'
              ? FORENSIC_TURNS.map((t) => {
                  const open = state.expandedTurns.includes(t.id);
                  return `
                    <div class="settings-group-card">
                      <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" data-exp-turn="${t.id}">
                        <div>
                          <span class="settings-group-title">${t.step}</span>
                          <div style="font-weight:600;margin-top:3px;">${escapeHtml(t.prompt)}</div>
                        </div>
                        <span class="mono-kbd">${open ? 'HIDE TOOLS' : `${t.tools.length} TOOLS`}</span>
                      </div>
                      ${
                        open
                          ? t.tools
                              .map(
                                (tl) => `
                            <div style="padding:10px;border-radius:9px;background:var(--bg-term);border:1px solid var(--border-hairline);font-family:var(--font-mono);font-size:11px;display:flex;flex-direction:column;gap:5px;">
                              <div style="display:flex;justify-content:space-between;color:var(--accent);">
                                <strong>${escapeHtml(tl.name)}</strong>
                                <span>EXIT ${tl.exit} · ${tl.duration}</span>
                              </div>
                              <div style="color:var(--text-muted);">$ ${escapeHtml(tl.args)}</div>
                              <div style="color:var(--text-primary);padding-top:4px;border-top:1px dashed var(--border-hairline);">${escapeHtml(tl.stdout)}</div>
                            </div>
                          `
                              )
                              .join('')
                          : ''
                      }
                    </div>
                  `;
                }).join('')
              : state.forensicsTab === 'fts5'
              ? `
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <button type="button" class="subbar-util-btn ${state.ftsMode === 'fts5' ? 'active' : ''}" data-fts-mode="fts5">CROSS-FLEET SQLITE FTS5</button>
              <button type="button" class="subbar-util-btn ${state.ftsMode === 'brain' ? 'active' : ''}" data-fts-mode="brain">DEDUPED SESSION BRAIN</button>
              <input class="ld-text-input" id="fts-query-inp" style="flex:1;min-width:180px;" placeholder="Query transcripts, tool outputs, or memory-wiki..." value="${escapeHtml(state.ftsQuery)}" />
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${hits
                .map(
                  (h) => `
                <div class="settings-group-card" style="gap:6px;">
                  <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10.5px;">
                    <span style="color:var(--accent);font-weight:700;">${h.session}</span>
                    <span style="color:var(--text-muted);">${h.when}</span>
                  </div>
                  <div style="font-family:var(--font-mono);font-size:11.5px;color:var(--text-primary);">${escapeHtml(h.snippet)}</div>
                </div>
              `
                )
                .join('')}
            </div>
          `
              : `
            <form id="swarm-dispatch-form" class="settings-group-card">
              <div class="settings-group-title">2-STEP TMUX BUFFER SWARM DISPATCHER (AIM-COMMUNICATE)</div>
              <div style="display:grid;grid-template-columns:160px 1fr auto;gap:8px;">
                <select class="ld-select" id="swarm-target-sel">
                  ${state.sessions
                    .map((s) => `<option value="${s.name}" ${state.swarmTarget === s.name ? 'selected' : ''}>-> ${s.name}</option>`)
                    .join('')}
                </select>
                <input class="ld-text-input" id="swarm-msg-inp" placeholder="Transmit verified 1-hop agent directive (set-buffer + Enter)..." required />
                <button type="submit" class="neon-cta-btn" style="height:34px;">${ICONS.send} <span>DISPATCH</span></button>
              </div>
            </form>

            <div style="display:flex;flex-direction:column;gap:8px;">
              ${state.swarmFeed
                .map(
                  (f) => `
                <div class="settings-group-card" style="gap:5px;">
                  <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10.5px;">
                    <span><strong style="color:var(--accent);">${f.from}</strong> -> <strong style="color:#38bdf8;">${f.to}</strong></span>
                    <span style="color:var(--text-muted);">${f.time}</span>
                  </div>
                  <div style="font-family:var(--font-mono);font-size:11.5px;">${escapeHtml(f.msg)}</div>
                </div>
              `
                )
                .join('')}
            </div>
          `
          }
        </div>
      </div>
    </div>
  `;
}

function renderTokenGrabberModal(sess) {
  const counts = { all: SCROLLBACK_TOKENS.length, url: 0, path: 0, ip: 0, sha: 0 };
  SCROLLBACK_TOKENS.forEach((t) => {
    counts[t.type] = (counts[t.type] || 0) + 1;
  });
  const q = state.grabSearch.trim().toLowerCase();
  const items = SCROLLBACK_TOKENS.filter(
    (t) =>
      (state.grabTab === 'all' || t.type === state.grabTab) &&
      (!q || t.display.toLowerCase().includes(q) || t.type.includes(q))
  );

  return `
    <div class="modal-veil" data-act="close-modal">
      <div class="ld-modal-card wide" style="width:min(660px,95%);" onclick="event.stopPropagation()">
        <div class="modal-header-bar">
          <div>
            <div style="font-family:var(--font-mono);font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;">
              <span style="color:var(--accent);display:flex;">${ICONS.link}</span>
              <span>SCROLLBACK TOKEN &amp; URL GRABBER</span>
            </div>
            <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.14em;color:var(--accent);margin-top:3px;">
              LAST 2,000 LINES OF ${sess.name.toUpperCase()} // AUTO-MASKS QUERY SECRETS IN PREVIEW
            </div>
          </div>
          <button class="ghost-btn" style="padding:0 6px;" data-act="close-modal">${ICONS.close}</button>
        </div>

        <div class="modal-tabs-rail">
          ${[
            ['all', `ALL (${counts.all})`],
            ['url', `URLS (${counts.url})`],
            ['path', `PATHS (${counts.path})`],
            ['ip', `IPS/PORTS (${counts.ip})`],
            ['sha', `GIT SHAS (${counts.sha})`],
          ]
            .map(
              ([id, lbl]) => `
            <button type="button" class="modal-tab-btn ${state.grabTab === id ? 'active' : ''}" data-gtab="${id}">${lbl}</button>
          `
            )
            .join('')}
        </div>

        <div class="modal-body-scroll">
          <input class="ld-text-input" id="grab-search-inp" placeholder="Filter extracted URLs, file paths, IPs, or Git SHAs..." value="${escapeHtml(state.grabSearch)}" />
          <div style="display:flex;flex-direction:column;gap:7px;">
            ${items
              .map(
                (it) => `
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 11px;border-radius:9px;background:var(--bg-input);border:1px solid var(--border-hairline);">
                <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">
                  <span class="mono-kbd">${it.type.toUpperCase()}</span>
                  <span style="font-family:var(--font-mono);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(it.display)}</span>
                  ${it.redacted ? `<span class="card-new-badge" title="Secret masked in UI; Copy copies full value">MASKED</span>` : ''}
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                  ${
                    it.type === 'url'
                      ? `<a href="${escapeHtml(it.value)}" target="_blank" rel="noreferrer" class="subbar-util-btn" style="text-decoration:none;">OPEN ↗</a>`
                      : ''
                  }
                  <button class="subbar-util-btn" data-grab-copy="${escapeHtml(it.value)}">${ICONS.copyText} COPY</button>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCommandPalette() {
  const q = state.cmdkQuery.trim().toLowerCase();
  const entries = [
    ...state.sessions.map((s) => ({
      cat: 'SESSIONS',
      label: `Switch Node // ${s.name}`,
      badge: `${s.vessel} · ${s.pct}%`,
      run: () => {
        state.activeSession = s.name;
        state.unreadSessions = state.unreadSessions.filter((u) => u !== s.name);
      },
    })),
    { cat: 'SESSIONS', label: '+ Spawn New Isolated Tmux Session...', badge: 'TMUX', run: () => { state.modal = 'spawn-sess'; return true; } },
    { cat: 'JOSHUA ACTIONS', label: 'Open Forensics, SQLite FTS5 & Swarm Feed', badge: 'FORENSICS', run: () => { state.modal = 'forensics'; return true; } },
    { cat: 'JOSHUA ACTIONS', label: 'Open Scrollback Token & URL Grabber', badge: 'GRAB', run: () => { state.modal = 'grab'; return true; } },
    { cat: 'JOSHUA ACTIONS', label: 'Open Session & Reincarnations History Vault', badge: 'HISTORY', run: () => { state.showHistory = true; } },
    { cat: 'BRAIN & WORKSPACE', label: 'Open Co-Pilot Live Browser Split-Pane', badge: 'CDP :9222', run: () => { state.activeTool = 'browser'; state.layoutMode = 'split'; } },
    { cat: 'BRAIN & WORKSPACE', label: 'Open Workspace Files & Git Diff Explorer', badge: 'MONACO', run: () => { state.activeTool = 'files'; state.layoutMode = 'split'; } },
    { cat: 'BRAIN & WORKSPACE', label: 'Search Full Terminal Scrollback (2,000+ lines in Scroll/Copy)', badge: 'CTRL+F', run: () => { state.showScrollCopy = true; state.showHistory = false; setTimeout(() => document.getElementById('scroll-search-inp')?.focus(), 20); } },
    ...state.macros.slice(0, 8).map((m) => ({
      cat: 'MACROS',
      label: `Run Macro // ${m.label}`,
      badge: m.cmd,
      run: () => {
        const target = state.activeSession || 'aim-connect';
        state.sentMessages[target] = [...(state.sentMessages[target] || []), m.cmd];
      },
    })),
    { cat: 'SETTINGS & SECURITY', label: 'Open Macro Studio (Create / Edit / Sync)', badge: `${state.macros.length} MACROS`, run: () => { state.modal = 'macros'; return true; } },
    { cat: 'SETTINGS & SECURITY', label: 'Open Outbound Email Integrations Vault', badge: 'VAULT', run: () => { state.settingsTab = 'integrations'; state.modal = 'settings'; return true; } },
    { cat: 'SETTINGS & SECURITY', label: 'Open System Settings (Themes, Voice, Passkeys)', badge: 'CONFIG', run: () => { state.modal = 'settings'; return true; } },
    { cat: 'SETTINGS & SECURITY', label: 'Preview 3FA Lock Screen', badge: '3FA', run: () => { state.isLocked = true; } },
  ].filter((e) => !q || `${e.cat} ${e.label} ${e.badge}`.toLowerCase().includes(q));

  window.__cmdkEntries = entries;

  return `
    <div class="modal-veil" data-act="close-modal">
      <div class="ld-modal-card wide" style="width:min(600px,94%);" onclick="event.stopPropagation()">
        <div style="padding:14px 16px;border-bottom:1px solid var(--border-hairline);display:flex;align-items:center;gap:10px;">
          <span style="color:var(--accent);display:flex;">${ICONS.search}</span>
          <input id="cmdk-search-inp" style="flex:1;background:transparent;border:none;outline:none;color:var(--text-primary);font-family:var(--font-mono);font-size:12.5px;" placeholder="Search sessions, /wiki, /handoff, forensics, macros, settings..." value="${escapeHtml(state.cmdkQuery)}" autofocus />
          <span class="mono-kbd">ESC</span>
        </div>
        <div style="padding:8px;max-height:58vh;overflow-y:auto;display:flex;flex-direction:column;gap:2px;">
          ${entries
            .map((item, idx) => {
              const showCat = idx === 0 || entries[idx - 1].cat !== item.cat;
              return `
                ${showCat ? `<div style="font-family:var(--font-mono);font-size:9.5px;font-weight:700;letter-spacing:0.14em;color:var(--accent);padding:8px 10px 3px;">${item.cat}</div>` : ''}
                <button class="pop-item" data-cmdk-idx="${idx}">
                  <span>${escapeHtml(item.label)}</span>
                  <span class="mono-kbd">${escapeHtml(item.badge)}</span>
                </button>
              `;
            })
            .join('')}
        </div>
      </div>
    </div>
  `;
}

function render() {
  document.documentElement.setAttribute('data-theme', state.theme);
  const root = document.getElementById('proto-root');
  if (!root) return;

  const isHome = !state.activeSession;
  const sess = state.sessions.find((s) => s.name === state.activeSession) || state.sessions[0];
  const waiting = state.sessions.filter((s) => s.status === 'WAITING');
  const unreadList = state.sessions.filter((s) => state.unreadSessions.includes(s.name));
  const activeCount = state.sessions.filter(
    (s) => s.status === 'THINKING' || s.status === 'WAITING' || state.unreadSessions.includes(s.name)
  ).length;

  const serverCount = state.sessions.filter((s) => s.isAgent === false).length;
  const noBrowserCount = state.sessions.filter((s) => !s.browserTabId).length;

  let filtered = state.sessions.filter((s) => {
    const isUnread = state.unreadSessions.includes(s.name);
    if (state.filter === 'busy' && s.status !== 'THINKING' && s.status !== 'WAITING' && !isUnread) {
      return false;
    }
    if (state.filter === 'servers' && s.isAgent !== false) return false;
    if (state.filter === 'nobrowser' && s.browserTabId) return false;
    if (state.filter === 'ctx' && (s.isAgent === false || (s.tier === 'normal' && !s.compacted))) return false;
    if (state.search && !`${s.name} ${s.branch} ${s.vessel}`.toLowerCase().includes(state.search.toLowerCase())) return false;
    return true;
  });

  if (state.filter === 'busy') {
    const rank = (s) => (s.status === 'WAITING' ? 0 : state.unreadSessions.includes(s.name) ? 1 : 2);
    filtered = [...filtered].sort((a, b) => rank(a) - rank(b));
  }

  const isPhone = state.device === 'phone' || window.innerWidth <= 768;
  const isFull = isPhone || state.layoutMode === 'full';
  const showRight = state.activeTool === 'browser' || state.activeTool === 'files';
  const showCenter = !showRight || !isFull;
  const isSplit = showRight && !isFull;
  const rightType = state.activeTool;

  const bTab = state.browserTabs.find((t) => t.id === state.activeBrowserTab) || state.browserTabs[0];
  const isStarred = state.browserFavorites.some((f) => f.url === bTab.url);
  const extraMsgs = state.sentMessages[sess.name] || [];

  const pinnedKeys = state.macros.filter((m) => m.pinned && m.kind === 'key');
  const pinnedCmds = state.macros.filter((m) => m.pinned && m.kind !== 'key');

  root.innerHTML = `
    <!-- Top Prototype Evaluation Strip -->
    <div class="lab-bar">
      <div class="lab-group">
        <span class="pulse-led"></span>
        <span style="color:#00ffa3;font-weight:700;letter-spacing:0.12em;">EMERALD MATRIX // 100% FEATURE PARITY</span>
      </div>
      <div class="lab-group">
        <button class="lab-pill ${isHome && !state.isLocked ? 'active' : ''}" data-act="reset-home">HOMEPAGE</button>
        <button class="lab-pill" data-act="cycle-op-style" title="Cycle Operator Reply Highlight (Cyan / Gold / Emerald / Grey)">USER COLOR: ${state.operatorStyle.toUpperCase()}</button>
        <button class="lab-pill ${state.operatorSide === 'right' ? 'active' : ''}" data-act="toggle-op-side" title="Toggle Operator Reply Dot Left vs Right Chat Box">
          ${state.operatorSide === 'right' ? 'USER DOT: RIGHT ●' : '● USER DOT: LEFT'}
        </button>
        <button class="lab-pill ${state.isLocked ? 'active' : ''}" data-act="toggle-lock-preview">3FA LOCK</button>
        <button class="lab-pill" data-act="open-settings">SETTINGS</button>
        <span style="opacity:0.25;">|</span>
        <button class="lab-pill ${state.device === 'desktop' ? 'active' : ''}" data-device-btn="desktop">DESKTOP</button>
        <button class="lab-pill ${state.device === 'phone' ? 'active' : ''}" data-device-btn="phone">ANDROID 390PX</button>
      </div>
    </div>

    <div class="stage-wrap ${state.device === 'phone' ? 'phone-mode' : ''}">
      <div class="cockpit-shell">
        <div class="ld-grid-backdrop"></div>
        <div class="ld-aurora-wash"></div>

        ${
          state.isLocked
            ? renderLockScreen()
            : `
        <!-- Frosted Glass Header (Zero Extra Buttons Added — Half-Screen Coherent!) -->
        <header class="ld-header">
          <div class="hdr-cluster">
            <button class="ghost-btn ${state.showSidebar ? 'active' : ''}" data-act="toggle-sidebar" title="Toggle Fleet Telemetry Rail">
              ${ICONS.sidebar}
            </button>

            <div class="ld-brand" id="brand-logo-btn" data-act="reset-home" title="Return to Sovereign Homepage">
              <div class="ld-brand-box">${ICONS.terminal}</div>
              <div class="ld-brand-word"><span id="scramble-brand-aim" style="color:var(--text-primary);">AIM</span><span id="scramble-brand-conn">CONNECT</span></div>
            </div>

            ${
              !isHome
                ? `<span
                    class="project-pill"
                    style="--agent-color:${sess.color.hex};--agent-rgb:${sess.color.rgb};"
                    title="Active Node: ${sess.name}"
                  >
                    <span class="project-pill-dot"></span>
                    ${sess.name}
                  </span>`
                : ''
            }

            ${
              waiting.length
                ? `<button class="wait-alert-pill hide-halfscreen" data-pick-sess="${waiting[0].name}" title="Jump straight to session waiting for approval">
                    GATE // ${waiting.length}
                  </button>`
                : ''
            }
            ${
              unreadList.length
                ? `<button class="new-reply-pill hide-halfscreen" data-pick-sess="${unreadList[0].name}" title="Click to jump straight to next unread completed session">
                    NEW // ${unreadList.length}
                  </button>`
                : ''
            }
          </div>

          <div class="hdr-center desktop-only">
            <div class="cmdk-bar" data-act="open-cmdk" title="Open Command Palette (⌘K)">
              <span class="cmdk-bar-inner">
                ${ICONS.search}
                <span class="cmdk-bar-text">Search nodes, files, commands...</span>
              </span>
              <span class="mono-kbd">⌘K</span>
            </div>

            <div class="seg-rail">
              <button class="seg-item ${state.activeTool === 'none' ? 'active' : ''}" id="btn-tool-term" data-tool="none" title="Terminal Only">
                ${ICONS.terminal} <span id="scramble-term">TERMINAL</span>
              </button>
              <button class="seg-item ${state.activeTool === 'browser' ? 'active' : ''}" id="btn-tool-browser" data-tool="browser">
                ${ICONS.globe}
                <span id="scramble-browser">BROWSER</span>
                ${
                  state.activeTool === 'browser'
                    ? `<span class="seg-expand-badge ${state.layoutMode === 'full' ? 'is-full' : ''}">${state.layoutMode === 'full' ? 'SPLIT' : 'FULL'}</span>`
                    : ''
                }
              </button>
              <button class="seg-item ${state.activeTool === 'files' ? 'active' : ''}" id="btn-tool-files" data-tool="files">
                ${ICONS.files}
                <span id="scramble-files">FILES</span>
                ${
                  state.activeTool === 'files'
                    ? `<span class="seg-expand-badge ${state.layoutMode === 'full' ? 'is-full' : ''}">${state.layoutMode === 'full' ? 'SPLIT' : 'FULL'}</span>`
                    : ''
                }
              </button>
            </div>
          </div>

          <div class="hdr-cluster">
            <button
              class="ghost-btn desktop-only ${state.showHistory ? 'active' : ''}"
              id="btn-top-history"
              data-act="toggle-history"
              title="Session & Past-Reincarnations History Vault"
            >
              ${ICONS.history}
              <span id="scramble-history" class="hide-halfscreen">HISTORY</span>
            </button>
            <button
              class="ghost-btn ${state.showOnScreenKeyboard ? 'active' : ''}"
              data-act="toggle-os-kb"
              title="Toggle On-Screen Sovereign Keyboard (${state.showOnScreenKeyboard ? 'ON' : 'OFF'})"
            >
              ${ICONS.keyboard}
              <span class="hide-halfscreen">${state.showOnScreenKeyboard ? 'KB ON' : 'KB OFF'}</span>
            </button>
            <button
              class="ghost-btn ${state.modal === 'settings' ? 'active' : ''}"
              data-act="open-settings"
              title="System Settings (Themes, Standalone App, Keyboard, Voice, Vault & 3FA)"
            >
              ${ICONS.settings}
            </button>
            <span class="pulse-led" title="Military-Grade E2EE WebSocket Active"></span>
          </div>
        </header>

        <!-- Main 3-Zone Workspace -->
        <div class="cockpit-grid ${isSplit ? 'has-split' : ''}" id="cockpit-grid" style="--split-width:${state.splitPct}%;">
          ${
            state.showSidebar
              ? `
            <aside class="fleet-rail">
              <div class="rail-header">
                <span class="rail-kicker">${ICONS.cpu} FLEET // ${String(state.sessions.length).padStart(2, '0')} NODES</span>
                <button class="ghost-btn" style="height:24px;padding:0 7px;" data-act="open-spawn-sess" title="Spawn New Isolated Tmux Session">
                  ${ICONS.plus} NEW
                </button>
              </div>

              <div class="rail-controls">
                <div style="position:relative;">
                  <span style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--text-muted);display:flex;">
                    ${ICONS.search}
                  </span>
                  <input class="ld-search-input" id="rail-search" placeholder="Filter session, branch, vessel..." value="${escapeHtml(state.search)}" />
                </div>
                <div class="filter-tabs">
                  <button class="filter-chip ${state.filter === 'all' ? 'active' : ''}" data-flt="all">ALL (${state.sessions.length})</button>
                  <button class="filter-chip ${state.filter === 'nobrowser' ? 'active' : ''}" data-flt="nobrowser" title="CLI-Only Agents &amp; Raw Tmux Servers with No Open Browser">NO WEB (${noBrowserCount})</button>
                  <button class="filter-chip ${state.filter === 'servers' ? 'active' : ''}" data-flt="servers" title="Non-Agent Split-Pane Tmux Server &amp; Worker Sessions">TMUX (${serverCount})</button>
                  <button class="filter-chip ${state.filter === 'ctx' ? 'active' : ''}" data-flt="ctx">CTX ≥30%</button>
                </div>
              </div>

              <div class="fleet-scroll-list">
                ${filtered
                  .map((s) => {
                    const isRawTmux = s.isAgent === false;
                    const showQuick = !isRawTmux && (s.name === state.activeSession || s.tier !== 'normal' || s.compacted > 0);
                    const wikiFlash = state.skillFlash[`${s.name}:wiki`];
                    const handoffFlash = state.skillFlash[`${s.name}:handoff`];
                    return `
                      <div
                        class="spotlight-card ${s.name === state.activeSession ? 'selected' : ''}"
                        style="--agent-color:${s.color.hex};--agent-rgb:${s.color.rgb};"
                        data-pick-sess="${s.name}"
                      >
                        <div class="card-top-row">
                          <div style="display:flex;align-items:center;gap:7px;min-width:0;">
                            <span class="state-indicator ${s.status.toLowerCase()}"></span>
                            <span class="project-pill" style="--agent-color:${s.color.hex};--agent-rgb:${s.color.rgb};">${s.name}</span>
                            ${state.unreadSessions.includes(s.name) ? '<span class="card-new-badge">NEW</span>' : ''}
                          </div>
                          <div style="display:flex;align-items:center;gap:4px;">
                            ${
                              s.browserTabId
                                ? `<span class="vessel-pill" style="color:var(--accent);border-color:rgba(var(--accent-rgb),0.4);" title="Leased Co-Pilot Browser Tab Open">🌐</span>`
                                : ''
                            }
                            <span class="vessel-pill" style="${isRawTmux ? 'color:#34d399;border-color:rgba(16,185,129,0.45);' : ''}">${s.vessel}</span>
                            <button type="button" class="fleet-del-btn" data-kill-sess="${s.name}" title="Terminate session ${s.name}">
                              ${ICONS.trash}
                            </button>
                          </div>
                        </div>

                        <div class="card-branch-row">
                          <span style="display:inline-flex;align-items:center;gap:4px;">
                            ${ICONS.gitBranch} ${s.branch}${s.panes > 1 && isRawTmux === false ? ` · ${s.panes}p` : ''}
                          </span>
                          <span class="task-mode-chip ${s.taskKind || 'idle'}">${escapeHtml(s.taskLabel || s.status)}</span>
                        </div>

                        ${
                          isRawTmux
                            ? `
                          <div class="ctx-bar-wrap">
                            <div class="ctx-labels">
                              <span style="color:#34d399;">${escapeHtml(s.uptime || 'DAEMON ONLINE')}</span>
                              <span style="color:var(--text-secondary);">${escapeHtml(s.portsLabel || `${s.panes} PANES`)}</span>
                            </div>
                            <div class="laser-track">
                              <div class="laser-fill normal" style="width:100%;opacity:0.55;"></div>
                            </div>
                          </div>
                        `
                            : `
                          <div class="ctx-bar-wrap">
                            <div class="ctx-labels">
                              <span class="${s.tier === 'crit' ? 'crit' : s.tier === 'warn' ? 'warn' : ''}">
                                ${
                                  s.compacted
                                    ? `COMPACTED ${s.compacted}X`
                                    : s.tier === 'crit'
                                    ? '512K CLIFF ALERT'
                                    : s.tier === 'warn'
                                    ? 'SAVE / HANDOFF'
                                    : 'CONTEXT'
                                }
                              </span>
                              <span class="${s.tier === 'crit' ? 'crit' : s.tier === 'warn' ? 'warn' : ''}">${s.pct}% · ${s.used}/${s.limit}</span>
                            </div>
                            <div class="laser-track ${s.compacted ? 'compacted' : ''}">
                              <div class="laser-fill ${s.tier}" style="width:${Math.max(6, s.pct)}%;"></div>
                              <div class="tick-30"></div>
                              ${s.vessel === 'AGY' ? '<div class="tick-512"></div>' : ''}
                            </div>
                          </div>
                        `
                        }

                        <div class="card-preview">${escapeHtml(s.preview)}</div>

                        ${
                          showQuick
                            ? `
                          <div class="fleet-card-quick-row">
                            <button type="button" class="fleet-skill-btn" data-card-skill="${s.name}|/aim-memory-wiki|wiki">
                              ${wikiFlash || '/wiki'}
                            </button>
                            <button type="button" class="fleet-skill-btn ${s.tier === 'crit' || s.compacted ? 'crit-handoff' : ''}" data-card-skill="${s.name}|/aim-handoff|handoff">
                              ${handoffFlash || '/handoff'}
                            </button>
                          </div>
                        `
                            : ''
                        }
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            </aside>
          `
              : ''
          }

          ${
            showCenter
              ? isHome && !state.showHistory
                ? `<main class="center-node-pane">${renderHomepage()}</main>`
                : `
            <main class="center-node-pane" style="font-size:${state.termFontSize}px;">
              <!-- Workspace Utility Subbar (Home for Paste, Scroll/Copy + Multi-Page Find, Grab, Forensics, History) -->
              <div class="node-subbar">
                <div class="node-title-tag" style="min-width:0;overflow:hidden;" title="${sess.isAgent === false ? 'RAW TMUX WORKSPACE' : 'J.O.S.H.U.A.'} // ${sess.name.toUpperCase()}">
                  ${sess.isAgent === false ? ICONS.terminal : ICONS.shield}
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sess.name}</span>
                  ${
                    !sess.browserTabId
                      ? `<span class="mono-kbd" style="font-size:9px;padding:1px 5px;color:var(--text-muted);">${sess.isAgent === false ? 'SPLIT TMUX' : 'NO BROWSER'}</span>`
                      : ''
                  }
                </div>
                <div class="subbar-tools-row">
                  <button type="button" class="subbar-util-btn ${state.pasteBadge ? 'active' : ''}" data-act="paste-clip" title="Bracketed Paste from Clipboard">
                    ${state.pasteBadge ? ICONS.check : ICONS.clipboard}
                    <span>${state.pasteBadge || 'PASTE'}</span>
                  </button>
                  <button type="button" class="subbar-util-btn ${state.showScrollCopy ? 'active' : ''}" data-act="toggle-scrollcopy" title="Full 2,000-Line Scroll / Copy & Multi-Page Search (Ctrl+F)">
                    ${ICONS.copyText}
                    <span>SCROLL/COPY</span>
                  </button>
                  <button type="button" class="subbar-util-btn ${state.modal === 'grab' ? 'active' : ''}" data-act="open-grab" title="Extract URLs, File Paths, IPs & Git SHAs">
                    ${ICONS.link}
                    <span>GRAB</span>
                  </button>
                  ${
                    sess.isAgent !== false
                      ? `
                    <button type="button" class="subbar-util-btn ${state.modal === 'forensics' ? 'active' : ''}" data-act="open-forensics" title="Forensic Tool Inspector, SQLite FTS5 Search & Swarm Dispatcher">
                      ${ICONS.microscope}
                      <span class="subbar-lbl-collapse">FORENSICS</span>
                    </button>
                    <button type="button" class="subbar-util-btn ${state.showHistory ? 'active' : ''}" data-act="toggle-history" title="Current & Previous Session Reincarnations">
                      <span style="display:flex;width:13px;height:13px;">${ICONS.history}</span>
                      <span class="subbar-lbl-collapse">HISTORY</span>
                      <span>(${SESSION_HISTORY_REINCARNATIONS.filter((h) => h.session === sess.name).length})</span>
                    </button>
                  `
                      : `
                    <button type="button" class="subbar-util-btn ${state.showHistory ? 'active' : ''}" data-act="toggle-history" title="Open Fleet Agent Session History">
                      <span style="display:flex;width:13px;height:13px;">${ICONS.history}</span>
                      <span class="subbar-lbl-collapse">FLEET HISTORY</span>
                    </button>
                  `
                  }
                </div>
              </div>

              ${
                state.showHistory
                  ? renderHistoryVault(sess)
                  : state.showScrollCopy
                  ? (() => {
                      const fullBuf = buildFullTmuxScrollback(sess, extraMsgs);
                      const { html, count, activeIdx } = highlightScrollback(fullBuf);
                      return `
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:8px 16px;background:var(--bg-subtle);border-bottom:1px solid var(--border-hairline);font-family:var(--font-mono);font-size:11px;">
                  <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:220px;">
                    <span style="color:var(--accent);display:flex;">${ICONS.search}</span>
                    <input
                      class="term-find-input"
                      id="scroll-search-inp"
                      style="width:min(230px,100%);border:1px solid var(--border-hairline);"
                      placeholder="Search all 2,000+ tmux lines..."
                      value="${escapeHtml(state.scrollSearchQuery)}"
                    />
                    ${
                      state.scrollSearchQuery.trim()
                        ? `
                      <span class="mono-kbd">${count > 0 ? `${activeIdx + 1} / ${count}` : '0 HITS'}</span>
                      <button type="button" class="fav-chip" data-act="scroll-hit-prev" title="Previous match across pages">▲</button>
                      <button type="button" class="fav-chip" data-act="scroll-hit-next" title="Next match across pages">▼</button>
                    `
                        : ''
                    }
                  </div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button class="subbar-util-btn" data-act="copy-selected-scrollback">${ICONS.copyText} <span>COPY SELECTION</span></button>
                    <button class="subbar-util-btn" data-act="copy-all-scrollback">${ICONS.copyText} <span>${state.scrollCopyBadge || 'COPY ALL'}</span></button>
                    <button class="subbar-util-btn ${state.scrollPlainMode ? 'active' : ''}" data-act="toggle-scroll-plain">
                      <span>${state.scrollPlainMode ? 'ANSI COLOR' : 'PLAIN TEXT'}</span>
                    </button>
                    <button class="subbar-util-btn" data-act="refresh-scrollback" title="Re-capture tmux buffer">${ICONS.refresh}</button>
                    <button class="subbar-util-btn active" data-act="toggle-scrollcopy">EXIT</button>
                  </div>
                </div>
                <pre class="scrollcopy-surface" id="scrollcopy-pre" style="font-size:${state.termFontSize}px;">${html}</pre>
              `;
                    })()
                  : sess.isAgent === false
                  ? renderTmuxServerWorkspace(sess)
                  : `
              <div class="stream-scroll" id="live-stream-scroll" style="${
                state.termPalette === 'hacker'
                  ? 'background:#010802;color:#22c55e;'
                  : state.termPalette === 'contrast'
                  ? 'background:#000000;color:#ffffff;'
                  : ''
              }">
                ${[
                  ...(sess.priorTurns || []),
                  { user: sess.userPrompt, tools: sess.tools, spoken: sess.spoken },
                ]
                  .map(
                    (turn) => `
                  <div class="transmission-block op-style-${state.operatorStyle} op-side-${state.operatorSide}">
                    <div class="transmission-header" style="color:var(--op-accent, var(--text-muted));">
                      ${
                        state.operatorSide === 'right'
                          ? `<div class="transmission-rule"></div><span>[OPERATOR // BRIAN]</span><span class="op-dot-ind"></span>`
                          : `<span class="op-dot-ind"></span><span>[OPERATOR // BRIAN]</span><div class="transmission-rule"></div>`
                      }
                    </div>
                    <div class="transmission-body-operator" style="font-size:${state.termFontSize}px;">${escapeHtml(turn.user)}</div>
                  </div>

                  <div class="transmission-block">
                    <div class="transmission-header" style="color:var(--accent);">
                      <span style="width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent);"></span>
                      <span>[J.O.S.H.U.A. // ${sess.vessel} ENGINE]</span>
                      <div class="transmission-rule"></div>
                    </div>
                    <div class="transmission-body-agent">
                      <div style="display:flex;flex-direction:column;gap:6px;">
                        ${turn.tools
                          .map((t) => `<div class="tool-exec-pill" style="font-size:${Math.max(11, state.termFontSize - 1)}px;">${ICONS.terminal} <span>${escapeHtml(t)}</span></div>`)
                          .join('')}
                      </div>
                      <div class="spoken-brief-card" style="font-size:${state.termFontSize}px;">
                        <span style="color:var(--accent-secondary);margin-top:2px;">${ICONS.volume}</span>
                        <div>${escapeHtml(turn.spoken)}</div>
                      </div>
                    </div>
                  </div>
                `
                  )
                  .join('')}

                ${extraMsgs
                  .map((m) => {
                    const msgText = typeof m === 'string' ? m : m.text;
                    const msgAttachments = typeof m === 'object' && m?.attachments ? m.attachments : [];
                    return `
                  <div class="transmission-block op-style-${state.operatorStyle} op-side-${state.operatorSide}">
                    <div class="transmission-header" style="color:var(--op-accent, var(--text-muted));">
                      ${
                        state.operatorSide === 'right'
                          ? `<div class="transmission-rule"></div><span>[OPERATOR // LIVE]</span><span class="op-dot-ind"></span>`
                          : `<span class="op-dot-ind"></span><span>[OPERATOR // LIVE]</span><div class="transmission-rule"></div>`
                      }
                    </div>
                    <div class="transmission-body-operator" style="font-size:${state.termFontSize}px;">
                      ${msgText ? `<div>${escapeHtml(msgText)}</div>` : ''}
                      ${msgAttachments
                        .map(
                          (att) => `
                        <div class="chat-shot-attachment-card">
                          ${ICONS.camera}
                          <span>${escapeHtml(att.filename)} · ${escapeHtml(att.dims)} (${escapeHtml(att.url)})</span>
                        </div>
                      `
                        )
                        .join('')}
                    </div>
                  </div>
                `;
                  })
                  .join('')}
              </div>
              `
              }

              ${
                state.showTouchKeys && sess.isAgent !== false
                  ? `
                <div class="touch-keys-drawer" title="Right-click any macro chip to unpin">
                  ${state.macros
                    .filter((m) => m.pinned)
                    .map(
                      (m) => `
                    <button class="fav-chip" data-macro="${escapeHtml(m.cmd)}" data-rclick-unpin="${m.id}">
                      ${m.isServer ? '☁ ' : ''}${escapeHtml(m.label)}
                    </button>
                  `
                    )
                    .join('')}
                  <button class="fav-chip" data-act="open-macro-mgr" title="Open Macro Studio">${ICONS.settings}</button>
                </div>
              `
                  : ''
              }

              ${
                sess.isAgent !== false || state.showHistory || state.showScrollCopy
                  ? `
              <!-- LeadDeeds Signature Composer + Lightning Bolt Quick-Actions -->
              <div class="ld-composer-shell">
                ${
                  state.popover === 'bolt'
                    ? `
                  <div class="quick-actions-popover" onclick="event.stopPropagation()">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:6px;border-bottom:1px solid var(--border-hairline);">
                      <span style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:0.14em;color:var(--accent);">MACROS &amp; CONTROL KEYS</span>
                      <button class="fav-chip" data-act="toggle-keys" style="display:inline-flex;align-items:center;gap:4px;">
                        ${ICONS.keyboard} <span>KEYBAR: ${state.showTouchKeys ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>

                    ${
                      pinnedKeys.length
                        ? `
                      <div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text-muted);letter-spacing:0.1em;margin-top:2px;">TERMINAL CONTROL PAD (${pinnedKeys.length})</div>
                      <div class="ctrl-key-grid">
                        ${pinnedKeys
                          .map(
                            (k) => `
                          <button type="button" class="ctrl-mini-key" data-macro="${escapeHtml(k.cmd)}" title="${escapeHtml(k.cmd)}${k.voiceTrigger ? ` · mic: '${k.voiceTrigger}'` : ''}">
                            ${escapeHtml(k.label)}
                          </button>
                        `
                          )
                          .join('')}
                      </div>
                    `
                        : ''
                    }

                    <div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text-muted);letter-spacing:0.1em;margin-top:4px;">PINNED COMMANDS &amp; SKILLS (${pinnedCmds.length})</div>
                    ${pinnedCmds
                      .map(
                        (m) => `
                      <button class="pop-item" data-macro="${escapeHtml(m.cmd)}">
                        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.isServer ? '☁ ' : ''}${escapeHtml(m.label)}</span>
                        <span class="mono-kbd">${escapeHtml(m.cmd)}</span>
                      </button>
                    `
                      )
                      .join('')}

                    <button type="button" class="macro-manage-footer-btn" data-act="open-macro-mgr">
                      ${ICONS.settings}
                      <span>MACRO SETTINGS // CREATE, EDIT &amp; SYNC (${state.macros.length})</span>
                    </button>
                  </div>
                `
                    : ''
                }

                ${
                  (state.stagedAttachments[sess.name] || []).length
                    ? `
                  <div class="staged-attachments-row">
                    ${(state.stagedAttachments[sess.name] || [])
                      .map(
                        (att) => `
                      <span class="staged-shot-chip">
                        <span style="color:var(--accent);display:inline-flex;">${ICONS.camera}</span>
                        <span>${escapeHtml(att.filename)}</span>
                        <span style="color:var(--text-muted);">${escapeHtml(att.dims)}</span>
                        <button type="button" class="ghost-btn" style="height:18px;padding:0 4px;" data-rm-shot="${sess.name}|${att.id}" title="Remove attached screenshot">×</button>
                      </span>
                    `
                      )
                      .join('')}
                  </div>
                `
                    : ''
                }

                <form class="ld-composer-row" id="node-composer">
                  <button
                    type="button"
                    class="ld-bolt-btn ${state.popover === 'bolt' ? 'active' : ''}"
                    data-act="toggle-bolt"
                    title="All 18 Control Keys, Custom Macros & Macro Studio"
                  >
                    ${ICONS.zap}
                  </button>
                  <div class="ld-input-box">
                    <input
                      type="text"
                      id="node-input"
                      class="ld-prompt-field"
                      placeholder="${
                        state.micEnabled
                          ? `Listening on mic — speak directive for ${sess.name}...`
                          : `Transmit directive to ${sess.name}...`
                      }"
                      autocomplete="off"
                    />
                    <button
                      type="button"
                      class="composer-icon-btn ${state.micEnabled ? 'mic-on' : ''}"
                      data-act="toggle-mic"
                      title="${state.micEnabled ? 'Voice Dictation ACTIVE (Click to Stop Mic)' : 'Voice Dictation OFF (Click to Start Mic)'}"
                    >
                      ${state.micEnabled ? ICONS.mic : ICONS.micOff}
                    </button>
                    <button
                      type="button"
                      class="composer-icon-btn ${state.speakEnabled ? 'speak-on' : ''}"
                      data-act="toggle-speak"
                      title="${state.speakEnabled ? 'Voice Spoken Summary ON (Click to Mute)' : 'Voice Spoken Summary OFF (Click to Enable & Speak)'}"
                    >
                      ${state.speakEnabled ? ICONS.volume : ICONS.volumeOff}
                    </button>
                    <button type="submit" class="ld-send-btn" title="Send Directive">
                      ${ICONS.send}
                    </button>
                  </div>
                </form>
              </div>
              `
                  : ''
              }
            </main>
          `
              : ''
          }

          ${
            isSplit
              ? `<div class="laser-divider" id="laser-divider" title="Drag to resize · Double-click to reset"><span class="laser-handle-pill"></span></div>`
              : ''
          }

          ${
            showRight
              ? `
            <section class="copilot-pane ${!isSplit ? 'full-bleed' : ''}" style="position:relative;">
              ${
                rightType === 'files'
                  ? renderFilesView(isFull)
                  : `
                <div class="copilot-top-bar">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;">
                    <span class="pulse-led" style="${!state.browserDaemon ? 'background:#6b7280;box-shadow:none;' : ''}"></span>
                    <span style="font-family:var(--font-mono);font-size:11px;font-weight:700;letter-spacing:0.1em;">CO-PILOT // :9222</span>
                    <button class="fav-chip" data-act="toggle-control" style="display:inline-flex;align-items:center;gap:5px;${state.controlMode ? 'border-color:var(--accent);color:var(--accent);' : ''}">
                      ${state.controlMode ? ICONS.gamepad : ICONS.eye}
                      <span>${state.controlMode ? 'CONTROL ON' : 'WATCH ONLY'}</span>
                    </button>
                    <button class="fav-chip ${state.showBrowser2faBar ? 'active' : ''}" data-act="toggle-b2fa" style="display:inline-flex;align-items:center;gap:4px;">
                      ${ICONS.key} <span>TYPE / 2FA</span>
                    </button>
                  </div>
                  <div class="cp-topright-actions">
                    <button
                      type="button"
                      class="cp-action-icon-btn ${state.extBrowserFlash ? 'flash-ok' : ''}"
                      data-act="open-ext-browser"
                      title="Open in External Browser (${escapeHtml(bTab.url)})"
                    >
                      ${state.extBrowserFlash ? ICONS.check : ICONS.externalLink}
                    </button>
                    <button
                      type="button"
                      class="cp-action-icon-btn ${state.shotFlash ? 'flash-ok' : ''}"
                      data-act="shot-to-chat"
                      title="Add Screenshot to Conversation (${escapeHtml(sess && sess.isAgent !== false && state.activeSession ? sess.name : bTab.agentKey || 'aim-connect')})"
                    >
                      ${state.shotFlash ? ICONS.check : ICONS.cameraPlus}
                    </button>
                    <button
                      type="button"
                      class="cp-action-icon-btn ${state.popover === 'browser-dl' ? 'active' : ''}"
                      data-act="toggle-browser-dl"
                      title="Browser Downloads (${state.browserDownloads.length})"
                    >
                      ${ICONS.downloadSm}
                      ${
                        state.browserDownloads.length
                          ? `<span class="cp-dl-badge ${state.browserDownloads.some((d) => d.status === 'streaming') ? 'is-live' : ''}">${state.browserDownloads.length}</span>`
                          : ''
                      }
                    </button>
                    <span style="opacity:0.22;margin:0 1px;">|</span>
                    <button
                      class="pane-full-upgrade-btn desktop-only ${isFull ? 'is-full' : ''}"
                      data-act="toggle-full"
                      title="${isFull ? 'Return Browser to Split Screen' : 'Upgrade Browser to Full View'}"
                    >
                      ${isFull ? ICONS.split : ICONS.maximize}
                      <span>${isFull ? 'SPLIT VIEW' : 'FULL VIEW'}</span>
                    </button>
                    <button class="ghost-btn" style="height:26px;padding:0 6px;" data-act="close-tool" title="Close Browser">${ICONS.close}</button>
                  </div>
                </div>

                ${
                  state.popover === 'browser-dl'
                    ? `
                  <div class="browser-dl-popover" onclick="event.stopPropagation()">
                    <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid var(--border-hairline);">
                      <span style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:0.12em;color:var(--accent);">
                        BROWSER DOWNLOADS // CDP (${state.browserDownloads.length})
                      </span>
                      <button type="button" class="fav-chip" data-act="clear-done-dl">CLEAR DONE</button>
                    </div>
                    ${state.browserDownloads
                      .map((d) => {
                        const mbNow = ((24 * state.dlProgress) / 100).toFixed(1);
                        return `
                          <div class="dl-item-card">
                            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                              <span style="font-family:var(--font-mono);font-size:11px;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                ${escapeHtml(d.name)}
                              </span>
                              <span class="mono-kbd" style="font-size:9px;">${escapeHtml(d.agent)}</span>
                            </div>
                            ${
                              d.status === 'streaming'
                                ? `
                              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-family:var(--font-mono);font-size:10px;color:#93c5fd;">
                                <span id="pop-dl-txt">${mbNow} / 24.0 MB (${state.dlProgress}%) · 5.4 MB/s</span>
                                <div class="cdp-dl-track" style="width:90px;">
                                  <div class="cdp-dl-fill" id="pop-dl-fill" style="width:${state.dlProgress}%;"></div>
                                </div>
                              </div>
                            `
                                : `
                              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-family:var(--font-mono);font-size:10px;color:var(--text-muted);">
                                <span>${escapeHtml(d.size)} · Completed ${escapeHtml(d.when)}</span>
                                <div style="display:flex;gap:4px;">
                                  <button type="button" class="fav-chip" data-dl-chat="${d.id}" title="Attach file path into active agent chat">+ CHAT</button>
                                  <button type="button" class="fav-chip" data-dl-save="${d.id}" title="Save downloaded file">SAVE</button>
                                </div>
                              </div>
                            `
                            }
                          </div>
                        `;
                      })
                      .join('')}
                    <div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text-muted);padding-top:2px;">
                      DIR: ~/Downloads/aim-browser (CDP Page.setDownloadBehavior)
                    </div>
                  </div>
                `
                    : ''
                }

                ${
                  !isHome && !sess.browserTabId
                    ? `
                  <div style="padding:5px 12px;background:rgba(245,158,11,0.1);border-bottom:1px solid rgba(245,158,11,0.35);font-family:var(--font-mono);font-size:10px;color:#fbbf24;display:flex;justify-content:space-between;align-items:center;">
                    <span>${escapeHtml(sess.name.toUpperCase())} HAS NO OPEN BROWSER LEASE · Showing shared fleet tabs</span>
                    <button type="button" class="fav-chip" data-tool="none">TERMINAL ONLY</button>
                  </div>
                `
                    : ''
                }

                <div class="copilot-tabs-row">
                  ${state.browserTabs
                    .map((t) => {
                      const active = t.id === state.activeBrowserTab;
                      const st = t.color ? `--agent-color:${t.color.hex};--agent-rgb:${t.color.rgb};` : '';
                      return `
                        <div
                          class="cp-tab ${active ? 'active' : ''} ${t.color ? 'agent-tab' : ''}"
                          style="${st}"
                          data-btab="${t.id}"
                        >
                          ${
                            t.color
                              ? `<span class="project-pill-dot" style="background:${t.color.hex};box-shadow:0 0 8px ${t.color.hex};"></span>`
                              : ICONS.globe
                          }
                          <span>${t.color ? `${t.agentKey} // ${t.sublabel}` : escapeHtml(t.title.slice(0, 22))}</span>
                          ${
                            state.browserTabs.length > 1
                              ? `<span style="opacity:0.65;padding-left:3px;" data-close-btab="${t.id}" title="Close tab">×</span>`
                              : ''
                          }
                        </div>
                      `;
                    })
                    .join('')}
                  <button type="button" class="fav-chip" data-act="new-btab" title="Open new isolated browser tab">+ TAB</button>
                </div>

                <form class="cp-url-bar" id="browser-url-form">
                  <button type="button" class="fav-chip" title="Back">←</button>
                  <button type="button" class="fav-chip" title="Forward">→</button>
                  <button type="button" class="fav-chip" title="Reload">${ICONS.refresh}</button>
                  <input class="cp-url-input" id="browser-url-inp" value="${escapeHtml(bTab.url)}" />
                  <button type="button" class="fav-chip" data-act="toggle-fav-star" style="${isStarred ? 'color:#eab308;border-color:#eab308;' : ''}" title="Bookmark URL">
                    ${ICONS.star}
                  </button>
                  <button type="submit" class="subbar-util-btn active">GO</button>
                </form>

                <div class="cp-fav-bar">
                  <span style="color:#eab308;display:inline-flex;">${ICONS.star}</span>
                  ${state.browserFavorites
                    .map(
                      (f) => `
                    <span class="fav-chip" style="display:inline-flex;align-items:center;gap:5px;" data-open-fav="${f.id}">
                      <span>${escapeHtml(f.title)}</span>
                      <span style="opacity:0.55;" data-del-fav="${f.id}">×</span>
                    </span>
                  `
                    )
                    .join('')}
                </div>

                ${
                  state.showBrowser2faBar
                    ? `
                  <form id="b2fa-form" style="display:flex;gap:6px;padding:6px 12px;border-bottom:1px solid var(--border-hairline);background:var(--bg-subtle);">
                    <input class="cp-url-input" id="b2fa-inp" placeholder="Type or paste 2FA code / password into focused browser input..." />
                    <button type="submit" class="subbar-util-btn active">SEND TEXT</button>
                    <button type="button" class="fav-chip" data-act="b2fa-enter">ENTER ⏎</button>
                  </form>
                `
                    : ''
                }

                <div
                  class="cp-viewport-frame ${bTab.color ? 'has-agent' : ''} ${bTab.isWorking ? 'is-working' : ''}"
                  style="${bTab.color ? `--agent-color:${bTab.color.hex};--agent-rgb:${bTab.color.rgb};` : ''}"
                >
                  ${
                    bTab.color
                      ? `
                    <div class="agent-hud-corner">
                      <span style="display:inline-flex;align-items:center;gap:6px;">
                        <span class="project-pill-dot" style="background:${bTab.color.hex};"></span>
                        <span>LEASED TAB // ${bTab.agentKey.toUpperCase()}</span>
                      </span>
                      <span style="color:${bTab.color.hex};">${escapeHtml(bTab.hudBadge || (bTab.isWorking ? 'WORKING' : 'IDLE'))}</span>
                    </div>
                  `
                      : ''
                  }
                  ${renderMockWebpage(bTab)}
                </div>
              `
              }
            </section>
          `
              : ''
          }
        </div>

        ${renderSovereignKeyboard()}

        <!-- Mobile Frosted Glass Bottom Dock (Android / iPhone 1-Tap Browser!) -->
        <nav class="ld-mobile-dock">
          <button class="m-dock-tab ${state.showSidebar ? 'active' : ''}" data-act="toggle-sidebar">
            ${ICONS.cpu}
            <span>FLEET</span>
          </button>
          <button class="m-dock-tab ${state.activeTool === 'none' && !state.showSidebar ? 'active' : ''}" data-mnav="none">
            ${ICONS.terminal}
            <span>TERMINAL</span>
          </button>
          <button class="m-dock-tab ${state.activeTool === 'browser' && !state.showSidebar ? 'active' : ''}" data-mnav="browser">
            ${ICONS.globe}
            <span>BROWSER</span>
          </button>
          <button class="m-dock-tab ${state.activeTool === 'files' && !state.showSidebar ? 'active' : ''}" data-mnav="files">
            ${ICONS.files}
            <span>FILES</span>
          </button>
          <button class="m-dock-tab ${state.micEnabled ? 'active' : ''}" data-act="toggle-mic">
            ${ICONS.mic}
            <span>VOICE</span>
          </button>
          <button class="m-dock-tab ${state.modal === 'settings' ? 'active' : ''}" data-act="open-settings">
            ${ICONS.settings}
            <span>SETTINGS</span>
          </button>
        </nav>

        ${state.modal === 'settings' ? renderSettingsModal(sess) : ''}
        ${state.modal === 'macros' ? renderMacroStudioModal() : ''}
        ${state.modal === 'forensics' ? renderForensicsModal(sess) : ''}
        ${state.modal === 'grab' ? renderTokenGrabberModal(sess) : ''}
        ${state.modal === 'cmdk' ? renderCommandPalette() : ''}

        <!-- Spawn New Isolated Session Modal -->
        ${
          state.modal === 'spawn-sess'
            ? `
          <div class="modal-veil" data-act="close-modal">
            <div class="ld-modal-card" style="padding:22px;" onclick="event.stopPropagation()">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-family:var(--font-mono);font-size:14px;font-weight:700;color:var(--accent);">+ SPAWN NEW SOVEREIGN NODE</div>
                <button class="ghost-btn" style="padding:0 6px;" data-act="close-modal">${ICONS.close}</button>
              </div>
              <form id="spawn-sess-form" style="margin-top:14px;display:flex;flex-direction:column;gap:10px;">
                <input class="ld-text-input" id="spawn-name-inp" placeholder="Session name (e.g. aim-research)" required />
                <select class="ld-select" id="spawn-vessel-sel">
                  <option value="AGY">Antigravity CLI (AGY · 1M Context)</option>
                  <option value="GROK">Grok CLI (200k Context)</option>
                  <option value="OC">OpenCode CLI</option>
                  <option value="SH">Raw Tmux Bash Shell</option>
                </select>
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px;">
                  <button type="button" class="ghost-btn" data-act="close-modal">CANCEL</button>
                  <button type="submit" class="neon-cta-btn">SPAWN &amp; ATTACH</button>
                </div>
              </form>
            </div>
          </div>
        `
            : ''
        }

        <!-- Per-Session Destructive Terminate Modal (DeleteSessionModal.jsx Parity) -->
        ${
          state.modal === 'delete-sess'
            ? `
          <div class="modal-veil" data-act="close-modal">
            <div class="ld-modal-card" style="padding:22px;border-color:rgba(239,68,68,0.5);" onclick="event.stopPropagation()">
              <div style="font-family:var(--font-mono);font-size:15px;font-weight:700;color:#f87171;display:flex;align-items:center;gap:8px;">
                ${ICONS.trash}
                <span>TERMINATE SESSION // ${escapeHtml(state.sessionToDelete)}</span>
              </div>
              <p style="margin-top:12px;font-size:12.5px;color:var(--text-secondary);line-height:1.6;">
                Are you sure you want to kill tmux session <strong style="color:var(--text-primary);">${escapeHtml(state.sessionToDelete)}</strong>? Running shell processes inside this session will stop, while all git worktrees, repository files, and <code>memory-wiki/</code> artifacts remain safely preserved on disk.
              </p>
              <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px;">
                <button type="button" class="ghost-btn" data-act="close-modal">CANCEL</button>
                <button type="button" class="danger-btn" data-act="confirm-kill-sess">${ICONS.trash} <span>TERMINATE SESSION</span></button>
              </div>
            </div>
          </div>
        `
            : ''
        }
        `
        }
      </div>
    </div>
  `;

  bindInteractions();
}

function bindInteractions() {
  const brandBtn = document.getElementById('brand-logo-btn');
  const brandAim = document.getElementById('scramble-brand-aim');
  const brandConn = document.getElementById('scramble-brand-conn');
  if (brandBtn && brandAim && brandConn) {
    attachScramble(brandAim, 'AIM', brandBtn);
    attachScramble(brandConn, 'CONNECT', brandBtn);
  }

  const homeSlogan = document.getElementById('scramble-home-slogan');
  if (homeSlogan) attachScramble(homeSlogan, "Don't rent a seat.", homeSlogan);

  [
    ['scramble-term', 'TERMINAL', 'btn-tool-term'],
    ['scramble-browser', 'BROWSER', 'btn-tool-browser'],
    ['scramble-files', 'FILES', 'btn-tool-files'],
    ['scramble-history', 'HISTORY', 'btn-top-history'],
  ].forEach(([spanId, label, btnId]) => {
    const sp = document.getElementById(spanId);
    const bt = document.getElementById(btnId);
    if (sp && bt) attachScramble(sp, label, bt);
  });

  document.querySelectorAll('.spotlight-card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--spot-x', `${e.clientX - r.left}px`);
      card.style.setProperty('--spot-y', `${e.clientY - r.top}px`);
      card.style.setProperty('--spot-opacity', '1');
    });
    card.addEventListener('pointerleave', () => card.style.setProperty('--spot-opacity', '0'));
  });

  document.querySelectorAll('[data-theme-btn]').forEach((b) => {
    b.onclick = () => setTheme(b.dataset.themeBtn);
  });

  document.querySelectorAll('[data-device-btn]').forEach((b) => {
    b.onclick = () => {
      state.device = b.dataset.deviceBtn;
      state.showSidebar = state.device !== 'phone';
      render();
    };
  });

  document.querySelectorAll('[data-stab]').forEach((b) => {
    b.onclick = () => {
      state.settingsTab = b.dataset.stab;
      render();
    };
  });

  document.querySelectorAll('[data-mflt]').forEach((b) => {
    b.onclick = () => {
      state.macroFilter = b.dataset.mflt;
      render();
    };
  });

  document.querySelectorAll('[data-ftab]').forEach((b) => {
    b.onclick = () => {
      state.forensicsTab = b.dataset.ftab;
      render();
    };
  });

  document.querySelectorAll('[data-gtab]').forEach((b) => {
    b.onclick = () => {
      state.grabTab = b.dataset.gtab;
      render();
    };
  });

  document.querySelectorAll('[data-fnav]').forEach((b) => {
    b.onclick = () => {
      state.filesNavMode = b.dataset.fnav;
      render();
    };
  });

  document.querySelectorAll('[data-fts-mode]').forEach((b) => {
    b.onclick = () => {
      state.ftsMode = b.dataset.ftsMode;
      render();
    };
  });

  document.querySelectorAll('[data-exp-turn]').forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.expTurn;
      state.expandedTurns = state.expandedTurns.includes(id)
        ? state.expandedTurns.filter((x) => x !== id)
        : [...state.expandedTurns, id];
      render();
    };
  });

  document.querySelectorAll('[data-tool]').forEach((b) => {
    b.onclick = () => {
      const target = b.dataset.tool;
      if (target === 'none') {
        state.activeTool = 'none';
        state.layoutMode = 'split';
      } else if (state.activeTool !== target) {
        state.activeTool = target;
        state.layoutMode = 'split';
      } else {
        state.layoutMode = state.layoutMode === 'split' ? 'full' : 'split';
      }
      render();
    };
  });

  document.querySelectorAll('[data-mnav]').forEach((b) => {
    b.onclick = () => {
      state.activeTool = b.dataset.mnav;
      state.showSidebar = false;
      state.popover = null;
      render();
    };
  });

  document.querySelectorAll('[data-op-style]').forEach((b) => {
    b.onclick = () => {
      state.operatorStyle = b.dataset.opStyle;
      localStorage.setItem('proto-op-style', state.operatorStyle);
      render();
    };
  });

  document.querySelectorAll('[data-op-side]').forEach((b) => {
    b.onclick = () => {
      state.operatorSide = b.dataset.opSide;
      localStorage.setItem('proto-op-side', state.operatorSide);
      render();
    };
  });

  document.querySelectorAll('[data-pick-sess]').forEach((b) => {
    b.onclick = () => {
      const picked = b.dataset.pickSess;
      state.activeSession = picked;
      state.tmuxActivePane = 0;
      const found = state.sessions.find((x) => x.name === picked);
      if (found?.browserTabId && state.browserTabs.some((t) => t.id === found.browserTabId)) {
        state.activeBrowserTab = found.browserTabId;
        if (state.activeTool !== 'files') state.activeTool = 'browser';
      } else if (found && !found.browserTabId) {
        // Sessions without an open browser (CLI-only agents & raw split-tmux servers) open cleanly in full terminal view!
        if (state.activeTool === 'browser') {
          state.activeTool = 'none';
          state.layoutMode = 'split';
        }
      }
      state.showHistory = false;
      state.unreadSessions = state.unreadSessions.filter((u) => u !== picked);
      state.modal = null;
      if (state.device === 'phone' || window.innerWidth <= 768) state.showSidebar = false;
      render();
    };
  });

  document.querySelectorAll('[data-kill-sess]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      state.sessionToDelete = b.dataset.killSess;
      state.modal = 'delete-sess';
      render();
    };
  });

  document.querySelectorAll('[data-card-skill]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const [sName, cmd, kind] = b.dataset.cardSkill.split('|');
      state.sentMessages[sName] = [...(state.sentMessages[sName] || []), cmd];
      const key = `${sName}:${kind}`;
      state.skillFlash[key] = '✓ SENT';
      render();
      setTimeout(() => {
        delete state.skillFlash[key];
        render();
      }, 1400);
    };
  });

  document.querySelectorAll('[data-hist-scope]').forEach((b) => {
    b.onclick = () => {
      state.historyScope = b.dataset.histScope;
      render();
    };
  });

  document.querySelectorAll('[data-hist-proj]').forEach((b) => {
    b.onclick = () => {
      state.activeSession = b.dataset.histProj;
      state.historyScope = 'project';
      const found = state.sessions.find((x) => x.name === state.activeSession);
      if (found?.browserTabId && state.browserTabs.some((t) => t.id === found.browserTabId)) {
        state.activeBrowserTab = found.browserTabId;
      }
      render();
    };
  });

  document.querySelectorAll('[data-hist-vessel]').forEach((b) => {
    b.onclick = () => {
      state.historyVesselFilter = b.dataset.histVessel;
      render();
    };
  });

  document.querySelectorAll('[data-flight-hist]').forEach((b) => {
    b.onclick = () => {
      const item = SESSION_HISTORY_REINCARNATIONS.find((h) => h.id === b.dataset.flightHist);
      if (!item) return;
      const fullTurns = getFullSessionTurns(item);
      const md = `# Flight Record — ${item.session} (${item.gen})\n- **Session ID:** ${item.id}\n- **Vessel:** ${item.vessel}\n- **Tokens:** ${item.tokens}\n- **Recorded Turns:** ${fullTurns.length} (${fullTurns.length * 2} messages)\n- **Summary:** ${item.title}\n\n## Complete Session Transcript\n${fullTurns
        .map(
          (t) =>
            `### Turn #${String(t.idx).padStart(2, '0')} (${t.stamp})\n**[OPERATOR]** ${t.operator}\n\n> \`${t.tool}\`\n\n**[J.O.S.H.U.A.]** ${t.agent}`
        )
        .join('\n\n---\n\n')}\n`;
      const blob = new Blob([md], { type: 'text/markdown' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `flight-record-${item.session}-${item.gen?.replace(/\s|#/g, '').toLowerCase() || 'log'}.md`;
      a.click();
      state.exportedFlightId = item.id;
      render();
      setTimeout(() => { state.exportedFlightId = ''; render(); }, 1600);
    };
  });

  document.querySelectorAll('[data-jump-hist-end]').forEach((b) => {
    b.onclick = () => {
      const vp = document.getElementById(b.dataset.jumpHistEnd);
      if (vp) vp.scrollTop = vp.scrollHeight;
    };
  });

  document.querySelectorAll('[data-tmux-win]').forEach((b) => {
    b.onclick = () => {
      state.tmuxActivePane = Number(b.dataset.tmuxWin) || 0;
      render();
    };
  });

  document.querySelectorAll('[data-tmux-pane]').forEach((p) => {
    p.onclick = () => {
      const next = Number(p.dataset.tmuxPane) || 0;
      if (state.tmuxActivePane !== next) {
        state.tmuxActivePane = next;
        render();
      }
    };
  });

  document.querySelectorAll('[data-rm-shot]').forEach((b) => {
    b.onclick = () => {
      const [sName, id] = b.dataset.rmShot.split('|');
      state.stagedAttachments[sName] = (state.stagedAttachments[sName] || []).filter((x) => x.id !== id);
      render();
    };
  });

  document.querySelectorAll('[data-dl-chat]').forEach((b) => {
    b.onclick = () => {
      const item = state.browserDownloads.find((d) => d.id === b.dataset.dlChat);
      if (!item) return;
      const curSess = state.sessions.find((s) => s.name === state.activeSession);
      const target = curSess && curSess.isAgent !== false ? curSess.name : item.agent || 'aim-connect';
      state.activeSession = target;
      state.layoutMode = 'split';
      state.popover = null;
      render();
      const inp = document.getElementById('node-input');
      if (inp) {
        inp.value = `${inp.value ? `${inp.value} ` : ''}@${item.path} `;
        inp.focus();
      }
    };
  });

  document.querySelectorAll('[data-dl-save]').forEach((b) => {
    b.onclick = () => {
      const item = state.browserDownloads.find((d) => d.id === b.dataset.dlSave);
      if (!item) return;
      const blob = new Blob([`AIM Browser Download Artifact: ${item.name}\nSource Agent: ${item.agent}\nSize: ${item.size}\n`], {
        type: 'text/plain',
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = item.name;
      a.click();
    };
  });

  document.querySelectorAll('[data-expand-hist]').forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.expandHist;
      state.expandedHistoryIds = state.expandedHistoryIds.includes(id)
        ? state.expandedHistoryIds.filter((x) => x !== id)
        : [...state.expandedHistoryIds, id];
      render();
    };
  });

  document.querySelectorAll('[data-copy-hist]').forEach((b) => {
    b.onclick = async () => {
      const item = SESSION_HISTORY_REINCARNATIONS.find((h) => h.id === b.dataset.copyHist);
      if (!item) return;
      const refText = `Session: ${item.session} | Session ID: ${item.id} | Title: ${item.title} | Transcript: ${item.logPath}`;
      try { await navigator.clipboard?.writeText(refText); } catch {}
      state.copiedHistoryId = item.id;
      render();
      setTimeout(() => { state.copiedHistoryId = ''; render(); }, 1800);
    };
  });

  document.querySelectorAll('[data-inject-hist]').forEach((b) => {
    b.onclick = () => {
      const item = SESSION_HISTORY_REINCARNATIONS.find((h) => h.id === b.dataset.injectHist);
      if (!item) return;
      if (!state.activeSession) state.activeSession = item.session;
      state.showHistory = false;
      render();
      const inp = document.getElementById('node-input');
      if (inp) {
        inp.value = `Review previous session ${item.id} (${item.session} — "${item.title}") at ${item.logPath}: `;
        inp.focus();
      }
    };
  });

  document.querySelectorAll('[data-grab-copy]').forEach((b) => {
    b.onclick = async () => {
      try { await navigator.clipboard?.writeText(b.dataset.grabCopy); } catch {}
      b.innerHTML = `${ICONS.check} COPIED`;
    };
  });

  document.querySelectorAll('[data-kb-mode]').forEach((b) => {
    b.onclick = () => {
      state.keyboardMode = b.dataset.kbMode;
      render();
    };
  });

  document.querySelectorAll('[data-kb-layer]').forEach((b) => {
    b.onclick = () => {
      state.kbLayer = b.dataset.kbLayer;
      render();
    };
  });

  document.querySelectorAll('[data-kb-key]').forEach((b) => {
    b.onclick = () => {
      const key = b.dataset.kbKey;
      const inp = document.getElementById('node-input');
      if (key === 'ENTER') {
        document.getElementById('node-composer')?.requestSubmit();
      } else if (key === 'BKSP' && inp) {
        inp.value = inp.value.slice(0, -1);
        inp.focus();
      } else if (key.length === 1 && !state.kbCtrl && inp) {
        inp.value += key;
        if (state.kbShift === 1) state.kbShift = 0;
        inp.focus();
        render();
      } else {
        const out = state.kbCtrl && key.length === 1 ? `CTRL+${key.toUpperCase()}` : key;
        state.kbCtrl = false;
        const target = state.activeSession || 'aim-connect';
        state.sentMessages[target] = [...(state.sentMessages[target] || []), `[key] ${out}`];
        render();
      }
    };
  });

  document.querySelectorAll('[data-pin-key]').forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.pinKey;
      if (k === '⌫') state.lockPin = state.lockPin.slice(0, -1);
      else if (k === 'PASTE') { state.lockPin = '482910'; state.isLocked = false; }
      else if (state.lockPin.length < 6) {
        state.lockPin += k;
        if (state.lockPin.length === 6) {
          setTimeout(() => { state.lockPin = ''; state.isLocked = false; render(); }, 180);
        }
      }
      render();
    };
  });

  document.querySelectorAll('[data-flt]').forEach((b) => {
    b.onclick = () => { state.filter = b.dataset.flt; render(); };
  });

  document.querySelectorAll('[data-btab]').forEach((b) => {
    b.onclick = () => { state.activeBrowserTab = b.dataset.btab; render(); };
  });

  document.querySelectorAll('[data-close-btab]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const id = b.dataset.closeBtab;
      state.browserTabs = state.browserTabs.filter((t) => t.id !== id);
      if (state.activeBrowserTab === id && state.browserTabs[0]) {
        state.activeBrowserTab = state.browserTabs[0].id;
      }
      render();
    };
  });

  document.querySelectorAll('[data-open-fav]').forEach((b) => {
    b.onclick = () => {
      const fav = state.browserFavorites.find((f) => f.id === b.dataset.openFav);
      if (!fav) return;
      const match = state.browserTabs.find((t) => t.id === fav.tabId || t.url === fav.url);
      if (match) state.activeBrowserTab = match.id;
      render();
    };
  });

  document.querySelectorAll('[data-del-fav]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      state.browserFavorites = state.browserFavorites.filter((f) => f.id !== b.dataset.delFav);
      render();
    };
  });

  document.querySelectorAll('[data-file]').forEach((b) => {
    b.onclick = () => { state.activeFile = b.dataset.file; render(); };
  });

  document.querySelectorAll('[data-macro]').forEach((b) => {
    b.onclick = () => {
      const cmd = b.dataset.macro;
      const target = state.activeSession || 'aim-connect';
      state.sentMessages[target] = [...(state.sentMessages[target] || []), `[macro] ${cmd}`];
      state.popover = null;
      render();
    };
  });

  document.querySelectorAll('[data-rclick-unpin]').forEach((b) => {
    b.oncontextmenu = (e) => {
      e.preventDefault();
      const m = state.macros.find((x) => x.id === b.dataset.rclickUnpin);
      if (m) m.pinned = false;
      render();
    };
  });

  document.querySelectorAll('[data-bool-set]').forEach((chk) => {
    chk.onchange = () => {
      state[chk.dataset.boolSet] = chk.checked;
      render();
    };
  });

  document.querySelectorAll('[data-cmdk-idx]').forEach((b) => {
    b.onclick = () => {
      const item = window.__cmdkEntries?.[Number(b.dataset.cmdkIdx)];
      if (!item) return;
      const keepModal = item.run();
      if (!keepModal) state.modal = null;
      render();
    };
  });

  const fontRange = document.getElementById('term-fontsize-range');
  if (fontRange) {
    fontRange.oninput = (e) => {
      state.termFontSize = Number(e.target.value);
      render();
    };
  }

  // 120fps Zero-Re-Render DOM Sliders (NO full-app render() on drag!)
  const ldSlider = document.getElementById('ld-seat-slider');
  if (ldSlider) {
    ldSlider.oninput = (e) => {
      const n = Number(e.target.value);
      state.ldSeatCount = n;
      const p = calcGraduatedTotal(n);
      const sumEl = document.getElementById('ld-seat-summary');
      const prEl = document.getElementById('ld-seat-price');
      if (sumEl) {
        sumEl.innerHTML = `Team Size: <strong>${n} Seat${n > 1 ? 's' : ''}</strong> · Next Seat: <strong style="color:#00ffa3;">$${p.marginal}/mo</strong>`;
      }
      if (prEl) {
        prEl.innerHTML = `$${p.total}<span style="font-size:10.5px;color:#9ca3af;">/mo ($${p.avg}/seat avg)</span>`;
      }
    };
  }

  const roofSlider = document.getElementById('tb-roof-slider');
  if (roofSlider) {
    roofSlider.oninput = (e) => {
      const pct = Number(e.target.value);
      state.roofSliderPct = pct;
      const bImg = document.getElementById('tb-before-img');
      const div = document.getElementById('tb-ba-div');
      const knob = document.getElementById('tb-ba-knob');
      const lbl = document.getElementById('tb-split-lbl');
      if (bImg) bImg.style.clipPath = `polygon(0 0, ${pct}% 0, ${pct}% 100%, 0 100%)`;
      if (div) div.style.left = `${pct}%`;
      if (knob) knob.style.left = `${pct}%`;
      if (lbl) lbl.textContent = `${pct}% SPLIT`;
    };
  }

  const palSel = document.getElementById('term-palette-sel');
  if (palSel) palSel.onchange = (e) => { state.termPalette = e.target.value; render(); };

  const setKbMode = document.getElementById('set-kb-mode');
  if (setKbMode) setKbMode.onchange = (e) => { state.keyboardMode = e.target.value; render(); };

  const setKbFb = document.getElementById('set-kb-feedback');
  if (setKbFb) setKbFb.onchange = (e) => { state.kbFeedback = e.target.value; render(); };

  const ttsSel = document.getElementById('set-tts-voice');
  if (ttsSel) ttsSel.onchange = (e) => { state.ttsVoice = e.target.value; };

  document.querySelectorAll('[data-act]').forEach((el) => {
    el.onclick = (e) => {
      e.stopPropagation();
      const act = el.dataset.act;
      if (act === 'toggle-sidebar') state.showSidebar = !state.showSidebar;
      else if (act === 'cycle-op-style') {
        const order = ['cyan', 'gold', 'emerald', 'grey'];
        state.operatorStyle = order[(order.indexOf(state.operatorStyle) + 1) % order.length];
        localStorage.setItem('proto-op-style', state.operatorStyle);
      }
      else if (act === 'toggle-op-side') {
        state.operatorSide = state.operatorSide === 'right' ? 'left' : 'right';
        localStorage.setItem('proto-op-side', state.operatorSide);
      }
      else if (act === 'reset-home') { state.isLocked = false; state.activeSession = ''; state.showHistory = false; state.showScrollCopy = false; }
      else if (act === 'toggle-lock-preview') state.isLocked = !state.isLocked;
      else if (act === 'unlock-cockpit') { state.isLocked = false; state.lockPin = ''; }
      else if (act === 'lock-session') { state.modal = null; state.isLocked = true; }
      else if (act === 'toggle-lock-pass') state.lockPassVisible = !state.lockPassVisible;
      else if (act === 'toggle-lock-e2ee') state.lockE2eeVisible = !state.lockE2eeVisible;
      else if (act === 'toggle-history') { state.showHistory = !state.showHistory; state.showScrollCopy = false; }
      else if (act === 'toggle-tmux-grid') { state.tmuxGridMode = !state.tmuxGridMode; }
      else if (act === 'toggle-os-kb') state.showOnScreenKeyboard = !state.showOnScreenKeyboard;
      else if (act === 'kb-shift') state.kbShift = (state.kbShift + 1) % 3;
      else if (act === 'kb-ctrl') state.kbCtrl = !state.kbCtrl;
      else if (act === 'toggle-scrollcopy') {
        state.showScrollCopy = !state.showScrollCopy;
        state.showHistory = false;
        render();
        if (state.showScrollCopy) document.getElementById('scroll-search-inp')?.focus();
        return;
      }
      else if (act === 'scroll-hit-prev' || act === 'scroll-hit-next') {
        state.scrollMatchIdx += act === 'scroll-hit-next' ? 1 : -1;
        render();
        document.querySelector('.find-hit-mark.active-hit')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      else if (act === 'toggle-scroll-plain') state.scrollPlainMode = !state.scrollPlainMode;
      else if (act === 'refresh-scrollback') state.scrollCopyBadge = 'REFRESHED';
      else if (act === 'copy-selected-scrollback') {
        const sel = window.getSelection?.()?.toString() || '';
        if (sel) navigator.clipboard?.writeText(sel).catch(() => {});
        state.scrollCopyBadge = sel ? `COPIED (${sel.length}c)` : 'SELECT TEXT FIRST';
        setTimeout(() => { state.scrollCopyBadge = ''; render(); }, 1500);
      }
      else if (act === 'copy-all-scrollback') {
        const pre = document.getElementById('scrollcopy-pre')?.innerText || '';
        navigator.clipboard?.writeText(pre).catch(() => {});
        state.scrollCopyBadge = 'COPIED ALL!';
        setTimeout(() => { state.scrollCopyBadge = ''; render(); }, 1500);
      }
      else if (act === 'paste-clip') {
        (async () => {
          let txt = '[clipboard bracketed paste]';
          try {
            const clip = await navigator.clipboard?.readText();
            if (clip) txt = clip.slice(0, 120);
          } catch {}
          const target = state.activeSession || 'aim-connect';
          state.sentMessages[target] = [...(state.sentMessages[target] || []), `[pasted] ${txt}`];
          state.pasteBadge = 'PASTED!';
          render();
          setTimeout(() => { state.pasteBadge = ''; render(); }, 1400);
        })();
        return;
      }
      else if (act === 'open-grab') { state.modal = 'grab'; state.popover = null; }
      else if (act === 'open-forensics') { state.modal = 'forensics'; state.popover = null; }
      else if (act === 'open-spawn-sess') { state.modal = 'spawn-sess'; state.popover = null; }
      else if (act === 'confirm-kill-sess') {
        state.sessions = state.sessions.filter((s) => s.name !== state.sessionToDelete);
        if (state.activeSession === state.sessionToDelete) {
          state.activeSession = state.sessions[0]?.name || '';
        }
        state.sessionToDelete = '';
        state.modal = null;
      }
      else if (act === 'toggle-bolt') state.popover = state.popover === 'bolt' ? null : 'bolt';
      else if (act === 'open-cmdk') { state.modal = 'cmdk'; state.cmdkQuery = ''; state.popover = null; }
      else if (act === 'open-settings') { state.modal = 'settings'; state.popover = null; }
      else if (act === 'open-macro-mgr') { state.macroReturnToVoice = false; state.modal = 'macros'; state.popover = null; }
      else if (act === 'open-voice-macros') {
        state.macroReturnToVoice = true;
        state.macroFilter = 'all';
        state.modal = 'macros';
        state.popover = null;
        render();
        document.getElementById('new-macro-voice')?.focus();
        return;
      }
      else if (act === 'back-to-voice') {
        state.macroReturnToVoice = false;
        state.settingsTab = 'voice';
        state.modal = 'settings';
      }
      else if (act === 'cancel-edit-macro') {
        state.editingMacroId = null;
        state.macroForm = { label: '', cmd: '', voiceTrigger: '', isServer: true, pinned: true };
      }
      else if (act === 'export-macros') {
        const blob = new Blob([JSON.stringify(state.macros, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'aim-connect-macros.json';
        a.click();
        return;
      }
      else if (act === 'save-vault') {
        state.vaultEmail = document.getElementById('vault-email-inp')?.value || state.vaultEmail;
        state.vaultAppPass = document.getElementById('vault-pass-inp')?.value || state.vaultAppPass;
        state.vaultSavedBadge = 'VAULTED ✓';
        setTimeout(() => { state.vaultSavedBadge = ''; render(); }, 1500);
      }
      else if (act === 'toggle-e2ee-vis') state.showE2eeSecret = !state.showE2eeSecret;
      else if (act === 'register-passkey') {
        state.passkeys = [...state.passkeys, `Passkey #${state.passkeys.length + 1} // Verified`];
      }
      else if (act === 'test-tts-voice') {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(new SpeechSynthesisUtterance('All systems online. Neural voice synthesis verified.'));
        }
        return;
      }
      else if (act === 'save-file') {
        state.fileSavedBadge = 'SAVED ✓';
        setTimeout(() => { state.fileSavedBadge = ''; render(); }, 1400);
      }
      else if (act === 'copy-file') {
        const entry = FILES_DB[state.activeFile];
        if (entry) navigator.clipboard?.writeText(entry.code).catch(() => {});
        state.fileSavedBadge = 'COPIED ✓';
        setTimeout(() => { state.fileSavedBadge = ''; render(); }, 1400);
      }
      else if (act === 'toggle-conflict') state.fileConflictBanner = !state.fileConflictBanner;
      else if (act === 'new-btab') {
        const id = `tab-${Date.now()}`;
        state.browserTabs.push({
          id,
          title: 'New Operator Tab',
          url: 'https://www.leaddeeds.com',
          agentKey: '',
          sublabel: '',
          color: null,
          isWorking: false,
          kind: 'ld',
        });
        state.activeBrowserTab = id;
      }
      else if (act === 'toggle-fav-star') {
        const cur = state.browserTabs.find((t) => t.id === state.activeBrowserTab);
        if (cur) {
          const exists = state.browserFavorites.some((f) => f.url === cur.url);
          state.browserFavorites = exists
            ? state.browserFavorites.filter((f) => f.url !== cur.url)
            : [...state.browserFavorites, { id: `fav-${Date.now()}`, title: cur.title.split('//')[0].trim(), url: cur.url, tabId: cur.id }];
        }
      }
      else if (act === 'toggle-b2fa') state.showBrowser2faBar = !state.showBrowser2faBar;
      else if (act === 'b2fa-enter') state.showBrowser2faBar = false;
      else if (act === 'open-ext-browser') {
        const cur = state.browserTabs.find((t) => t.id === state.activeBrowserTab) || state.browserTabs[0];
        if (cur?.url) window.open(cur.url, '_blank', 'noopener,noreferrer');
        state.extBrowserFlash = true;
        render();
        setTimeout(() => { state.extBrowserFlash = false; render(); }, 1100);
        return;
      }
      else if (act === 'shot-to-chat') {
        const cur = state.browserTabs.find((t) => t.id === state.activeBrowserTab) || state.browserTabs[0];
        const curSess = state.sessions.find((s) => s.name === state.activeSession);
        const target = curSess && curSess.isAgent !== false ? curSess.name : cur?.agentKey || 'aim-connect';
        state.activeSession = target;
        state.showHistory = false;
        state.showScrollCopy = false;
        if (state.layoutMode === 'full') state.layoutMode = 'split';
        let host = 'page';
        try { host = new URL(cur.url).hostname.replace(/^www\./, ''); } catch {}
        const stamp = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
        const shot = {
          id: `shot-${Date.now()}`,
          filename: `screenshot-${host}-${stamp}.png`,
          dims: '1440×900 PNG',
          url: cur?.url || '',
        };
        state.stagedAttachments[target] = [...(state.stagedAttachments[target] || []), shot];
        state.shotFlash = true;
        state.popover = null;
        render();
        document.getElementById('node-input')?.focus();
        setTimeout(() => { state.shotFlash = false; render(); }, 1200);
        return;
      }
      else if (act === 'toggle-browser-dl') {
        state.popover = state.popover === 'browser-dl' ? null : 'browser-dl';
      }
      else if (act === 'clear-done-dl') {
        state.browserDownloads = state.browserDownloads.filter((d) => d.status === 'streaming');
      }
      else if (act === 'snap-browser') {
        const target = state.activeSession || 'aim-connect';
        state.sentMessages[target] = [...(state.sentMessages[target] || []), '[browser] Saved PNG proof snapshot to artifacts/'];
      }
      else if (act === 'close-modal') state.modal = null;
      else if (act === 'toggle-full') state.layoutMode = state.layoutMode === 'split' ? 'full' : 'split';
      else if (act === 'close-tool') { state.activeTool = 'none'; state.layoutMode = 'split'; }
      else if (act === 'toggle-control') state.controlMode = !state.controlMode;
      else if (act === 'toggle-keys') state.showTouchKeys = !state.showTouchKeys;
      else if (act === 'toggle-mic') state.micEnabled = !state.micEnabled;
      else if (act === 'toggle-speak') {
        state.speakEnabled = !state.speakEnabled;
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          if (state.speakEnabled) {
            const cur = state.sessions.find((s) => s.name === state.activeSession);
            if (cur) window.speechSynthesis.speak(new SpeechSynthesisUtterance(cur.spoken));
          }
        }
      }
      render();
    };
  });

  const pwaConfirm = document.getElementById('confirm-pwa-btn');
  if (pwaConfirm) {
    pwaConfirm.onclick = async () => {
      if (state.deferredPrompt) {
        state.deferredPrompt.prompt();
        await state.deferredPrompt.userChoice.catch(() => {});
        state.deferredPrompt = null;
      }
      state.modal = null;
      render();
    };
  }

  const bindLiveInput = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.oninput = (e) => {
      state[key] = e.target.value;
      render();
      const next = document.getElementById(id);
      if (next) {
        next.focus();
        next.setSelectionRange(next.value.length, next.value.length);
      }
    };
  };
  bindLiveInput('rail-search', 'search');
  bindLiveInput('hist-search-inp', 'historySearch');
  bindLiveInput('macro-search-inp', 'macroSearch');
  bindLiveInput('grab-search-inp', 'grabSearch');
  bindLiveInput('fts-query-inp', 'ftsQuery');
  bindLiveInput('cmdk-search-inp', 'cmdkQuery');

  const scrollSearchEl = document.getElementById('scroll-search-inp');
  if (scrollSearchEl) {
    scrollSearchEl.oninput = (e) => {
      state.scrollSearchQuery = e.target.value;
      state.scrollMatchIdx = 0;
      render();
      const next = document.getElementById('scroll-search-inp');
      if (next) {
        next.focus();
        next.setSelectionRange(next.value.length, next.value.length);
      }
      document.querySelector('.find-hit-mark.active-hit')?.scrollIntoView({ block: 'center' });
    };
    scrollSearchEl.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        state.scrollMatchIdx += e.shiftKey ? -1 : 1;
        render();
        document.getElementById('scroll-search-inp')?.focus();
        document.querySelector('.find-hit-mark.active-hit')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    };
  }

  const macroForm = document.getElementById('macro-create-form');
  if (macroForm) {
    macroForm.onsubmit = (e) => {
      e.preventDefault();
      const label = document.getElementById('new-macro-label')?.value.trim();
      const cmd = document.getElementById('new-macro-cmd')?.value.trim();
      const voiceTrigger = document.getElementById('new-macro-voice')?.value.trim() || '';
      const isServer = !!document.getElementById('new-macro-server')?.checked;
      const pinned = !!document.getElementById('new-macro-pinned')?.checked;
      if (!label || !cmd) return;
      if (state.editingMacroId) {
        state.macros = state.macros.map((m) =>
          m.id === state.editingMacroId ? { ...m, label, cmd, voiceTrigger, isServer, pinned } : m
        );
        state.editingMacroId = null;
      } else {
        state.macros.push({ id: `m-${Date.now()}`, label, cmd, kind: 'cmd', voiceTrigger, isServer, pinned });
      }
      state.macroForm = { label: '', cmd: '', voiceTrigger: '', isServer: true, pinned: true };
      render();
    };
  }

  const importFile = document.getElementById('macro-import-file');
  if (importFile) {
    importFile.onchange = async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        const parsed = JSON.parse(await f.text());
        if (Array.isArray(parsed)) {
          state.macros = parsed.map((m, i) => ({
            id: m.id || `imp-${i}`,
            label: m.label || 'Macro',
            cmd: m.cmd || '',
            kind: m.kind || 'cmd',
            pinned: m.pinned ?? m.isPinned ?? true,
            isServer: !!m.isServer,
            voiceTrigger: m.voiceTrigger || '',
          }));
          render();
        }
      } catch {}
    };
  }

  document.querySelectorAll('[data-pin-macro]').forEach((b) => {
    b.onchange = () => {
      const m = state.macros.find((x) => x.id === b.dataset.pinMacro);
      if (m) m.pinned = !m.pinned;
      render();
    };
  });

  document.querySelectorAll('[data-edit-macro]').forEach((b) => {
    b.onclick = () => {
      const m = state.macros.find((x) => x.id === b.dataset.editMacro);
      if (!m) return;
      state.editingMacroId = m.id;
      state.macroForm = { label: m.label, cmd: m.cmd, voiceTrigger: m.voiceTrigger || '', isServer: !!m.isServer, pinned: !!m.pinned };
      render();
    };
  });

  document.querySelectorAll('[data-del-macro]').forEach((b) => {
    b.onclick = () => {
      state.macros = state.macros.filter((x) => x.id !== b.dataset.delMacro);
      render();
    };
  });

  const swarmForm = document.getElementById('swarm-dispatch-form');
  if (swarmForm) {
    swarmForm.onsubmit = (e) => {
      e.preventDefault();
      const target = document.getElementById('swarm-target-sel')?.value || 'aim-connect';
      const msg = document.getElementById('swarm-msg-inp')?.value.trim();
      if (!msg) return;
      state.swarmTarget = target;
      state.swarmFeed = [{ from: 'operator // 2-step', to: target, time: 'JUST NOW', msg }, ...state.swarmFeed];
      state.sentMessages[target] = [...(state.sentMessages[target] || []), `[swarm] ${msg}`];
      render();
    };
  }

  const spawnForm = document.getElementById('spawn-sess-form');
  if (spawnForm) {
    spawnForm.onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById('spawn-name-inp')?.value.trim().toLowerCase().replace(/\s+/g, '-');
      const vessel = document.getElementById('spawn-vessel-sel')?.value || 'AGY';
      if (!name) return;
      if (!state.sessions.some((s) => s.name === name)) {
        state.sessions = [
          {
            name,
            vessel,
            isAgent: vessel !== 'SH',
            status: 'IDLE',
            branch: 'master',
            isWorktree: false,
            panes: 1,
            pct: 4.0,
            used: '40k',
            limit: vessel === 'AGY' ? '1M' : '200k',
            tier: 'normal',
            compacted: 0,
            browserTabId: null,
            color: { hex: '#14b8a6', rgb: '20, 184, 166', label: 'Teal' },
            preview: 'Fresh sovereign session online',
            priorTurns: [],
            userPrompt: `Session ${name} initialized.`,
            tools: [`tmux new-session -d -s ${name}`],
            spoken: `Fresh ${vessel} workspace ${name} is ready for directives.`,
          },
          ...state.sessions,
        ].sort((a, b) => a.name.localeCompare(b.name));
      }
      state.activeSession = name;
      state.modal = null;
      render();
    };
  }

  const urlForm = document.getElementById('browser-url-form');
  if (urlForm) {
    urlForm.onsubmit = (e) => {
      e.preventDefault();
      const val = document.getElementById('browser-url-inp')?.value.trim();
      const cur = state.browserTabs.find((t) => t.id === state.activeBrowserTab);
      if (val && cur) {
        cur.url = val.startsWith('http') ? val : `https://${val}`;
        render();
      }
    };
  }

  const b2faForm = document.getElementById('b2fa-form');
  if (b2faForm) {
    b2faForm.onsubmit = (e) => {
      e.preventDefault();
      state.showBrowser2faBar = false;
      render();
    };
  }

  const form = document.getElementById('node-composer');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const inp = document.getElementById('node-input');
      const target = state.activeSession || 'aim-connect';
      const staged = state.stagedAttachments[target] || [];
      const txt = inp ? inp.value.trim() : '';
      if (txt || staged.length) {
        state.sentMessages[target] = [
          ...(state.sentMessages[target] || []),
          staged.length ? { text: txt, attachments: staged } : txt,
        ];
        state.stagedAttachments[target] = [];
        state.lastScrolledSession = '';
        render();
        document.getElementById('node-input')?.focus();
      }
    };
  }

  const tmuxForm = document.getElementById('tmux-shell-form');
  if (tmuxForm) {
    tmuxForm.onsubmit = (e) => {
      e.preventDefault();
      const inp = document.getElementById('tmux-shell-inp');
      const cmd = inp?.value.trim();
      if (cmd && state.activeSession) {
        const key = `${state.activeSession}:${state.tmuxActivePane}`;
        const reply =
          cmd.includes('lsof')
            ? 'python3 629630 kingb 6u IPv4 TCP *:8000 (LISTEN) · python3 3316 TCP *:8001 (LISTEN)'
            : cmd.includes('startup')
            ? '[startup.sh] :8000 OK · :8001 OK · cloudflared QUIC OK · 0 services needed restart'
            : `[ok] executed '${cmd}' (exit=0)`;
        state.tmuxPaneLogs[key] = [...(state.tmuxPaneLogs[key] || []), `$ ${cmd}`, reply];
        render();
        document.getElementById('tmux-shell-inp')?.focus();
      }
    };
  }

  // Keep live multi-turn stream scrolled to active bottom turn on session switch while allowing full upward scroll!
  const streamEl = document.getElementById('live-stream-scroll');
  if (streamEl && state.lastScrolledSession !== state.activeSession) {
    streamEl.scrollTop = streamEl.scrollHeight;
    state.lastScrolledSession = state.activeSession;
  }

  const divider = document.getElementById('laser-divider');
  const grid = document.getElementById('cockpit-grid');
  if (divider && grid) {
    divider.onpointerdown = (e) => {
      e.preventDefault();
      divider.classList.add('dragging');
      const onMove = (ev) => {
        const r = grid.getBoundingClientRect();
        const pct = Math.max(26, Math.min(70, ((r.right - ev.clientX) / r.width) * 100));
        state.splitPct = Number(pct.toFixed(1));
        grid.style.setProperty('--split-width', `${state.splitPct}%`);
      };
      const onUp = () => {
        divider.classList.remove('dragging');
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
    divider.ondblclick = () => {
      state.splitPct = 48;
      render();
    };
  }
}

render();

window.addEventListener('resize', () => render());
