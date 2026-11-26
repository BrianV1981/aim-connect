// Crisp Lucide 1.85px Geometric Line Icons (Zero Cartoon Emojis — Emerald Matrix V4 #269)
const ICONS = {
  aimMark: `<svg class="lucide" style="width:18px;height:18px;" viewBox="0 0 24 24"><line x1="15.1" y1="6.9" x2="18.3" y2="10.6" stroke="var(--accent)" stroke-width="1.9"/><line x1="15.1" y1="17.1" x2="18.3" y2="13.4" stroke="var(--accent)" stroke-width="1.9"/><path d="M 7.8 9.4 C 10.6 9.7, 13.8 9.2, 13.8 7.3" stroke="var(--accent)" stroke-width="1.9"/><path d="M 8.1 14.2 C 10.9 12, 14.3 12, 17.5 12" stroke="var(--accent)" stroke-width="1.9"/><path d="M 11.2 12.5 C 13.1 13, 13.8 14.6, 13.8 16.7" stroke="var(--accent)" stroke-width="1.8"/><polyline points="4.6 6.2 10.2 12 4.6 17.8" stroke="var(--accent-secondary)" stroke-width="2.2"/><circle cx="13.8" cy="5.4" r="1.85" fill="var(--bg-canvas)" stroke="var(--accent)" stroke-width="1.9"/><circle cx="19.4" cy="12" r="1.85" fill="var(--bg-canvas)" stroke="var(--accent)" stroke-width="1.9"/><circle cx="13.8" cy="18.6" r="1.85" fill="var(--bg-canvas)" stroke="var(--accent)" stroke-width="1.9"/></svg>`,
  terminal: `<svg class="lucide" viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  sidebar: `<svg class="lucide" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`,
  panelRight: `<svg class="lucide" style="width:12px;height:12px;" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
  menu: `<svg class="lucide" style="width:14px;height:14px;" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`,
  globe: `<svg class="lucide" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  files: `<svg class="lucide" viewBox="0 0 24 24"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`,
  folder: `<svg class="lucide" style="width:12px;height:12px;" viewBox="0 0 24 24"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`,
  bookOpen: `<svg class="lucide" style="width:12px;height:12px;" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  pin: `<svg class="lucide" style="width:11px;height:11px;" viewBox="0 0 24 24"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`,
  code: `<svg class="lucide" style="width:11px;height:11px;" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  image: `<svg class="lucide" style="width:12px;height:12px;" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
  audio: `<svg class="lucide" style="width:16px;height:16px;" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  video: `<svg class="lucide" style="width:14px;height:14px;" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect width="15" height="14" x="1" y="5" rx="2"/></svg>`,
  fileBinary: `<svg class="lucide" style="width:16px;height:16px;" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12h4v6h-4z"/></svg>`,
  message: `<svg class="lucide" style="width:12px;height:12px;" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  grid: `<svg class="lucide" style="width:12px;height:12px;" viewBox="0 0 24 24"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
  arrowUp: `<svg class="lucide" style="width:11px;height:11px;" viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`,
  arrowDown: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`,
  arrowDownToLine: `<svg class="lucide" style="width:12px;height:12px;" viewBox="0 0 24 24"><path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/></svg>`,
  chevronRight: `<svg class="lucide" style="width:11px;height:11px;" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>`,
  eyeOff: `<svg class="lucide" style="width:12px;height:12px;" viewBox="0 0 24 24"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`,
  alert: `<svg class="lucide" style="width:13px;height:13px;" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
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
    preview: 'Gen #10 active · 255/255 pytest · #260–#282 live',
    priorTurns: [
      {
        user: 'Picked up from Gen #09 (d94b8c7f). Verify baseline services and run full pytest before opening worktrees.',
        tools: [
          'Read(HANDOFF.md) · loaded Gen #09 baton in 12ms',
          'pytest -q -> 255 passed · 0 oxlint errors · master @ f67ea00',
        ],
        body: 'Baseline verified on `master @ f67ea00` (**255/255 pytest**, `0` `oxlint` warnings). Loaded [HANDOFF.md](file:///HANDOFF.md) and [browser_copilot_architecture.md](file:///memory-wiki/pages/browser_copilot_architecture.md).',
        spoken: 'Loaded the handoff cleanly. All 255 backend tests and shareability checks are green on master.',
      },
      {
        user: 'Ship the 2-column flippable/resizable FILES IDE with DOCS 1-TAB reader (#262, #266, #267) and inline Audio/Video media player (#270).',
        tools: [
          './aim fix 262 && ./aim fix 270 -> workspace/issue-262, workspace/issue-270',
          'Edit(frontend/src/components/FileExplorer.jsx, backend/routes_files.py) · HTTP 206 Range + 1-TAB docs',
          'aim promote (#262, #266, #267, #270) -> 243 passed · 0 oxlint errors',
        ],
        body: 'Shipped the collapsible **Left/Right `FILES` Explorer** (`RIGHT →` / `← LEFT`), `📖 DOCS` **`1-TAB: ON/OFF`** reader, and `250 MB` HTML5 Audio/Video Range player in [App.jsx](file:///frontend/src/App.jsx).',
        spoken: 'Shipped the flippable two-column Files IDE, single-tab Project Docs reader, and inline audio and video Range player.',
      },
      {
        user: 'Add the <canvas> Visual Markup Studio (#273/#276) with ①②③ callout pins + WHITE/BLACK contrast halos, Discord Hop-to-Bottom ↓ (#277), and 6-pill THINKING/NEW Fleet filters (#281).',
        tools: [
          'Edit(ShotMarkupModal.jsx, LiveTranscriptStage.jsx, FleetSidebar.jsx) · 6 inks + Hop-to-Bottom FAB + THINKING/NEW pills',
          'pytest -q -> 251 passed · verified contrast halos on dark & light screenshots',
        ],
        body: 'Wired **Visual Markup Studio** (`① PIN`, `⭕ CIRCLE`, `▢ BOX`, `↘ ARROW`, `🖍 PEN` across `FIX`, `KEEP`, `INFO`, `MOVE`, `WHITE`, `BLACK`), OFF-by-default Auto-Scroll + floating **`↓` Hop-to-Bottom**, and Fleet `THINKING` / `NEW` pills.',
        spoken: 'Added the Visual Markup Studio with six halo-guarded inks, the Discord-style hop-to-bottom button, and Thinking and New Fleet filters.',
      },
      {
        user: 'Lock Split View to widescreen (>900px) so mobile stays 100% Full View (#279/#280), fix Browser punctuation VKs (#278), and wire waitingForHuman into 1-click TAKE CONTROL & 2FA / RESUME AGENT (#274/#275).',
        tools: [
          'Edit(BrowserPane.jsx, routes_browser.py, routes_sessions.py) · .leases.lock + hud.byTarget + clear-human',
          'aim promote (#274, #275, #278–#282) -> master @ f67ea00 · 255/255 passed',
        ],
        body: 'Promoted `#274`–`#282` to `master @ f67ea00`:\n- **Browser Handoff (`#275`):** `waitingForHuman` pulses the leased tab amber, elevates Fleet to `WAITING` (`BROWSER 2FA / LOGIN`), and surfaces **`TAKE CONTROL & 2FA`** + **`RESUME AGENT`**.\n- **Mobile Full-View (`#279`/`#280`):** `effectiveSplitMode` (`>900px`) keeps mobile `100%` Full View with zero header overlap.\n- **Analyst Engine (`#268`):** Native zero-`tmux` Python JOSHUA engine live in [routes_joshua_analyst.py](file:///backend/routes_joshua_analyst.py).',
        spoken: 'Promoted issues 274 through 282 to master with 255 passing tests, full mobile ergonomics, and one-click 2FA browser takeover and resume.',
      },
    ],
    userPrompt: 'Verify all 12 Fleet nodes, confirm [CHAT VIEW | RAW TERM], DOCS 1-TAB, Visual Markup Studio, and 1-click 2FA Takeover all match live master @ f67ea00.',
    tools: [
      'pytest -q -> 255 passed in 2.41s · 0 oxlint errors · 0 moat/PII leaks',
    ],
    body: '### Live System Sync Complete (`master @ f67ea00`)\n- **Test Suite:** `255 passed, 0 failed` (`0` `oxlint` warnings)\n- **Try Live Controls:** Click any `[file](file:///...)` pill like [HANDOFF.md](file:///HANDOFF.md) or [call_727_555_0194_harper.wav](file:///recordings/call_727_555_0194_harper.wav) to preview Markdown or play audio in `FILES`, click **`✏️`** on the staged screenshot chip below to open **Visual Markup Studio**, or test **`TAKE CONTROL & 2FA`** in the Browser pane.',
    spoken:
      'Generation 10 is live on master with all 255 backend tests green, structured Markdown chat view, two-column Files IDE, Visual Markup Studio, and one-click browser 2FA handoff.',
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
    browserTabId: null,
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
    browserTabId: null,
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
          '-rw-r--r-- 1 operator operator 4.8M Nov 22 09:42 hero_pipeline_cutaway_60fps.webm',
          '-rw-r--r-- 1 operator operator 2.9M Nov 22 09:43 entity_graph_zoom_60fps.webm',
          '-rw-r--r-- 1 operator operator 3.4M Nov 22 09:44 mcp_sse_terminal_demo_60fps.webm',
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
    id: 'tab-user-google',
    title: 'Google',
    url: 'https://www.google.com/',
    agentKey: '',
    sublabel: '',
    color: null,
    isWorking: false,
    waitingForHuman: null,
    kind: 'screenshot',
    screenSrc: './screens/google.webp',
  },
  {
    id: 'tab-user-youtube',
    title: 'YouTube',
    url: 'https://www.youtube.com/results?search_query=ai+coding+agents',
    agentKey: '',
    sublabel: '',
    color: null,
    isWorking: false,
    waitingForHuman: null,
    kind: 'screenshot',
    screenSrc: './screens/youtube.webp',
  },
  {
    id: 'tab-ld',
    title: 'LeadDeeds // Day-Zero Commercial Intelligence',
    url: 'https://www.leaddeeds.com',
    agentKey: 'aim-ld',
    sublabel: 'map-record',
    hudBadge: 'MAPPING · 3.2ms ZERO-VLM',
    hudCursor: { x: '44%', y: '56%', label: 'mapping figCutaway · 3.2ms' },
    color: { hex: '#00FFA3', rgb: '0, 255, 163' },
    isWorking: true,
    kind: 'screenshot',
    screenSrc: './screens/leaddeeds.webp',
  },
  {
    id: 'tab-tb',
    title: 'Tampa Bay Soft Wash // Staging & 2FA Gate',
    url: 'https://tbsoftwash.com',
    agentKey: 'aim-tbsoftwash',
    sublabel: '2fa-hold',
    hudBadge: 'WAITING · BROWSER 2FA / DEPLOY GATE',
    color: { hex: '#ef4444', rgb: '239, 68, 68' },
    isWorking: false,
    waitingForHuman: {
      reason: 'Complete Cloudflare Access 2FA code before promoting fix/issue-231',
      requestedAt: Date.now() - 45000,
    },
    kind: 'screenshot',
    screenSrc: './screens/tbsoftwash.webp',
  },
  {
    id: 'tab-joshua',
    title: 'BrianV1981/aim-joshua // Shared Brain OS',
    url: 'https://github.com/BrianV1981/aim-joshua',
    agentKey: 'aim-joshua',
    sublabel: 'shared-brain',
    hudBadge: 'READING · LANCEDB RECALL (3.6ms)',
    hudCursor: { x: '34%', y: '44%', label: 'inspecting AGENTS.md + tests' },
    color: { hex: '#00B8FF', rgb: '0, 184, 255' },
    isWorking: true,
    kind: 'screenshot',
    screenSrc: './screens/github-joshua.webp',
  },
  {
    id: 'tab-academy',
    title: 'Tampa Bay Soft Wash Academy // Operator SOPs',
    url: 'https://academy.tbsoftwash.com',
    agentKey: 'tbsoftwash-academy',
    sublabel: 'downloading',
    hudBadge: 'DOWNLOADING · PDF STREAM',
    hudCursor: { x: '51%', y: '43%', label: 'downloading Printables BOM PDF' },
    color: { hex: '#3b82f6', rgb: '59, 130, 246' },
    isWorking: true,
    kind: 'screenshot',
    screenSrc: './screens/academy.webp',
  },
  {
    id: 'tab-connect',
    title: 'BrianV1981/aim-connect // Sovereign Cockpit',
    url: 'https://github.com/BrianV1981/aim-connect',
    agentKey: 'aim-connect',
    sublabel: 'idle-lease',
    hudBadge: 'IDLE · LEASE HELD (255/255 PYTEST)',
    color: { hex: '#eab308', rgb: '234, 179, 8' },
    isWorking: false,
    waitingForHuman: null,
    kind: 'screenshot',
    screenSrc: './screens/github-connect.webp',
  },
];

const MARKUP_COLORS = [
  { id: 'red', hex: '#FF3B5C', short: 'FIX', label: 'Fix / Bug / Delete', neutral: false },
  { id: 'emerald', hex: '#00FFA3', short: 'KEEP', label: 'Keep / Match Style', neutral: false },
  { id: 'cyan', hex: '#00B8FF', short: 'INFO', label: 'Question / Inspect', neutral: false },
  { id: 'amber', hex: '#FBBF24', short: 'MOVE', label: 'Move / Resize / Layout', neutral: false },
  { id: 'white', hex: '#FFFFFF', short: 'WHITE', label: 'Neutral White Ink', neutral: true },
  { id: 'black', hex: '#111827', short: 'BLACK', label: 'Neutral Black Ink', neutral: true },
];

const MARKUP_TOOLS = [
  { id: 'pin', label: '① PIN', hint: 'Tap to drop numbered callout (or drag directional arrow)' },
  { id: 'circle', label: '⭕ CIRCLE', hint: 'Drag ellipse around target' },
  { id: 'rect', label: '▢ BOX', hint: 'Drag rectangle around target' },
  { id: 'arrow', label: '↘ ARROW', hint: 'Drag directional pointer arrow' },
  { id: 'pen', label: '🖍 PEN', hint: 'Draw freehand stroke' },
];

const SCROLLBACK_TOKENS = [
  { type: 'url', value: 'https://www.leaddeeds.com', display: 'https://www.leaddeeds.com', redacted: false },
  { type: 'url', value: 'https://tbsoftwash.com', display: 'https://tbsoftwash.com', redacted: false },
  { type: 'url', value: 'https://academy.tbsoftwash.com/course?token=magic_991a', display: 'https://academy.tbsoftwash.com/course?token=***', redacted: true },
  { type: 'url', value: 'https://mcp.leaddeeds.com/sse', display: 'https://mcp.leaddeeds.com/sse', redacted: false },
  { type: 'path', value: 'frontend/src/components/BrowserPane.jsx', display: 'frontend/src/components/BrowserPane.jsx', redacted: false },
  { type: 'path', value: 'backend/routes_joshua_analyst.py', display: 'backend/routes_joshua_analyst.py', redacted: false },
  { type: 'ip', value: '127.0.0.1:9222', display: '127.0.0.1:9222 (CDP Screencast)', redacted: false },
  { type: 'ip', value: '0.0.0.0:8000', display: '0.0.0.0:8000 (FastAPI Orchestrator)', redacted: false },
  { type: 'sha', value: 'f67ea00', display: 'f67ea00 (aim-connect · #274–#282 Browser 2FA & Fleet Filters)', redacted: false },
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
        args: 'aim-browser --tab v2-live --open "https://www.leaddeeds.com" --snapshot --json',
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
    prompt: 'Verify waitingForHuman 2FA takeover (#275), Visual Markup Studio (#273/#276), and full 255-test suite.',
    tools: [
      {
        name: 'run_command (pytest)',
        exit: 0,
        duration: '2.41s',
        args: '~/aim-connect/backend/venv/bin/pytest -q',
        stdout: '255 passed in 2.41s (commit f67ea00 · 0 oxlint errors)',
      },
    ],
  },
];

const FTS5_HITS = [
  { source: 'fts5', session: 'aim-connect', when: 'Today · 18:13', snippet: 'Promoted #274, #275, #278–#282 to master @ f67ea00 (255/255 pytest): 1-click TAKE CONTROL & 2FA, THINKING/NEW Fleet filters, Mobile Full-View.' },
  { source: 'fts5', session: 'aim-ld', when: 'Today · 01:03', snippet: 'Promoted Website v2 (#539 / PR #540) to www.leaddeeds.com · 14/14 routes HTTP 200 · 726/726 pytest.' },
  { source: 'brain', session: 'aim-connect', when: 'memory-wiki/pages/browser_copilot_architecture.md', snippet: 'Stale-PID .leases.lock + per-target hud.byTarget[targetId] + waitingForHuman -> Fleet WAITING chimes (#274/#275).' },
  { source: 'brain', session: 'tbsoftwash-academy', when: 'memory-wiki/academy_architecture.md', snippet: '16 Core & Springboard quizzes, 186-SKU rig builder, and /verify/TBSA-2026 live on Vercel.' },
];

const INITIAL_SWARM_FEED = [
  { from: 'aim-joshua', to: 'aim-ld', time: '01:01:14', msg: 'LanceDB hybrid index refreshed (312 chunks). SEC EDGAR & Slot 13 vectors ready.' },
  { from: 'aim-auditor', to: 'aim-connect', time: '00:54:09', msg: 'Verified 255/255 pytest + 0 oxlint errors + Option 1A /analyst SQLite C-level set_authorizer (#268).' },
];

// Exact 8 Production TTS Voices from SettingsModal.jsx (#222–#224)
const TTS_VOICES = [
  { id: 'piper:en_GB-alan-medium', label: 'Offline Piper — Alan (UK J.O.S.H.U.A. / JARVIS)' },
  { id: 'piper:en_US-ryan-medium', label: 'Offline Piper — Ryan (US Male)' },
  { id: 'piper:en_US-lessac-medium', label: 'Offline Piper — Lessac (US Female)' },
  { id: 'edge:en-GB-RyanNeural', label: 'Edge Neural — Ryan (UK J.O.S.H.U.A. / JARVIS)' },
  { id: 'edge:en-US-BrianNeural', label: 'Edge Neural — Brian (US Male)' },
  { id: 'edge:en-US-AndrewNeural', label: 'Edge Neural — Andrew (US Warm Male)' },
  { id: 'edge:en-US-AvaNeural', label: 'Edge Neural — Ava (US Female)' },
  { id: 'browser:default', label: 'Browser Native Speech API' },
];

const FILES_DB = {
  'HANDOFF.md': {
    type: 'file',
    isDoc: true,
    coreDoc: 'HANDOFF',
    status: 'M',
    code: `# AIM-CONNECT — Engineering Handoff

> **Updated:** 2026-11-23 · **Master:** \`f67ea00\` (\`255 passed\`, \`0\` \`oxlint\` errors)

## 0. COMPLETED WORK
- **\`#274\`, \`#275\`, \`#278\`–\`#282\`:** Browser \`.leases.lock\` + \`hud.byTarget\`, \`waitingForHuman\` -> **\`TAKE CONTROL & 2FA\`** / **\`RESUME AGENT\`**, widescreen \`effectiveSplitMode\` (\`>900px\`), & \`THINKING\`/\`NEW\` Fleet filters.
- **\`#262\`, \`#270\`–\`#273\`, \`#276\`, \`#277\`:** \`DOCS\` \`1-TAB\` reader, inline Audio/Video Range player, \`<canvas>\` Visual Markup Studio (6 inks), & Discord \`↓\` Hop-to-Bottom.
- **\`#268\`:** Native Zero-\`tmux\` Python \`/analyst\` JOSHUA Engine ([routes_joshua_analyst.py](file:///backend/routes_joshua_analyst.py)).

## 1. KNOWLEDGE BASE LINKS
- Read [AGENTS.md](file:///AGENTS.md) or [browser_copilot_architecture.md](file:///memory-wiki/pages/browser_copilot_architecture.md) in place via \`1-TAB: ON\`.`,
    oldDiff: `- Master @ 7d923ee (195 passed)
- Flat 1-column Files viewer
- 4 Fleet filter chips`,
    newDiff: `+ Master @ f67ea00 (255 passed, 0 oxlint errors)
+ 2-column Left/Right Files IDE + DOCS 1-TAB + Audio/Video Range player
+ 6 Fleet filter pills (ALL · THINKING · NEW · RECENT · TMUX · CTX >=30%)`,
  },
  'README.md': {
    type: 'file',
    isDoc: true,
    coreDoc: 'README',
    status: 'M',
    code: `# AIM-Connect — Own your stack. Don't rent a seat.

**A Clientless, Sovereign Web Terminal, Co-Pilot Browser & AI Agent Fleet Cockpit.**

- **Emerald Matrix V4 (\`4\` Synced Color Schemes):** Obsidian \`#050505\` + \`#00FFA3\`, Pure OLED, Daylight Crisp, & Classic AIM Navy.
- **Co-Pilot Browser (\`--headless=new\` CDP \`:9222\`):** Multi-subagent \`--tab\` leasing, \`<5ms\` zero-VLM Site Maps, **\`TAKE CONTROL & 2FA\`** handoffs, and \`<canvas>\` **Visual Markup Studio**.
- **2-Column Web IDE & Media Suite:** Left/Right flippable tree, \`DOCS\` \`1-TAB\` reader, Monaco \`DiffEditor\`, and \`250 MB\` Audio/Video Range streaming.`,
    oldDiff: `- Legacy single-tab terminal README`,
    newDiff: `+ Full Emerald Matrix V4 + Co-Pilot Browser + Visual Markup Studio guide`,
  },
  'AGENTS.md': {
    type: 'file',
    isDoc: true,
    coreDoc: 'AGENTS',
    status: '',
    code: `# J.O.S.H.U.A. — Sovereign Operating System Mandates

1. **Identity:** J.O.S.H.U.A. operating on behalf of Operator Brian Vasquez (\`@BrianV1981\`).
2. **GitOps Worktrees:** Never code on \`master\`; isolate every ticket via \`./aim fix <id>\` and TDD first.
3. **30% Context Baton Pass:** Seal session blackbox and hand off cleanly via \`/aim-handoff\` well before the \`512k\` AGY cliff.
4. **Spoken Summary (\`🔊\`):** End every turn with a plain-English \`🔊\` summary for Piper / Edge Neural TTS.`,
    oldDiff: `- Context cliff: 30% flat`,
    newDiff: `+ Dual AGY 30% Save/Handoff + 51.2% (512k) Compaction Cliff`,
  },
  'memory-wiki/index.md': {
    type: 'file',
    isDoc: true,
    wikiDoc: true,
    status: '',
    code: `# Project Memory Wiki Index (Local-Only Sovereign Knowledge)

- [browser_copilot_architecture.md](file:///memory-wiki/pages/browser_copilot_architecture.md) — CDP \`:9222\` split-pane, \`.leases.lock\`, \`hud.byTarget\`, & \`waitingForHuman\` 2FA takeover (\`#240\`–\`#278\`)
- [Frontend Cockpit App.jsx](file:///frontend/src/App.jsx) — \`[CHAT VIEW | RAW TERM]\`, \`effectiveSplitMode\`, & Hop-to-Bottom \`↓\`
- [Native Analyst Engine](file:///backend/routes_joshua_analyst.py) — Zero-\`tmux\` Python SSE + C-level \`sqlite3.set_authorizer\` (\`#268\`)`,
    oldDiff: `- Last indexed: 298 chunks`,
    newDiff: `+ Last indexed: 312 chunks (BM25 + LanceDB vector)`,
  },
  'memory-wiki/pages/browser_copilot_architecture.md': {
    type: 'file',
    isDoc: true,
    wikiDoc: true,
    status: 'M',
    code: `# Co-Pilot Browser Split-Pane & Zero-VLM Self-Healing Site Maps

## 1. Multi-Subagent \`targetId\` Leasing & Per-Target HUD (\`#274\`)
- Subagents pass \`--tab <lease>\` (\`stealFocus: false\`) so parallel workers never hijack the Operator's active tab.
- \`hud.byTarget[activeTargetId]\` isolates live cursor pills per tab while \`.leases.lock\` prevents concurrent write clobbers.

## 2. Human-in-the-Loop 2FA Takeover (\`#275\`)
- \`--request-human "<reason>"\` flags \`waitingForHuman\` in \`leases.json\`, fires Fleet \`WAITING\` chimes, and renders **\`TAKE CONTROL & 2FA\`** + **\`RESUME AGENT\`**.`,
    oldDiff: `- Single global hud.json slot`,
    newDiff: `+ Stale-PID .leases.lock + per-target hud.byTarget + clear-human 3FA route`,
  },
  'frontend/src/App.jsx': {
    type: 'file',
    status: 'M',
    code: `// Emerald Matrix V4 Cockpit Shell (#256–#281)
const isWidescreen = window.innerWidth > 900;
const effectiveSplitMode = splitMode && isWidescreen;

// Reconcile background unread queue when agent resumes THINKING (#281)
const nextUnread = reconcileUnreadSessions(prevUnread, fleet, activeSession);

// Discord-style parked reading mode: Auto-Scroll OFF by default (#277)
const [sessionAutoScroll, setSessionAutoScroll] = useState(false);`,
    oldDiff: `- const effectiveSplitMode = splitMode;`,
    newDiff: `+ const effectiveSplitMode = splitMode && window.innerWidth > 900;`,
  },
  'backend/routes_joshua_analyst.py': {
    type: 'file',
    status: 'A',
    code: `# Option 1A Native Zero-tmux Python JOSHUA Engine (#268)
SAFE_MASTER_COLUMNS = frozenset({
    "folio", "site_address", "city", "zip", "owner_name", "officer_phone"
})

def _install_ro_authorizer(conn: sqlite3.Connection) -> None:
    """Enforce C-level SQLITE_READ / SQLITE_IGNORE column allowlist."""
    conn.set_authorizer(_master_db_authorizer)`,
    oldDiff: `# New native /analyst engine`,
    newDiff: `+ Streaming SSE /api/joshua/chat + 11 workspace tools + 250/mo quota metering`,
  },
  'docs/screenshots/emerald-matrix-arch.svg': {
    type: 'image',
    dims: '1280 × 720',
    size: '48.2 KB',
    status: '',
    code: '',
    oldDiff: '',
    newDiff: '',
  },
  'recordings/call_727_555_0194_harper.wav': {
    type: 'audio',
    mimeType: 'audio/wav',
    duration: '00:04',
    size: '176.4 KB',
    status: '',
    code: '',
    oldDiff: '',
    newDiff: '',
  },
  'artifacts/copilot_hud_demo.mp4': {
    type: 'video',
    mimeType: 'video/mp4',
    dims: '1440 × 900',
    duration: '00:15',
    size: '4.80 MB',
    status: '',
    code: '',
    oldDiff: '',
    newDiff: '',
  },
  'engrams/joshua_core.engram': {
    type: 'binary',
    mimeType: 'application/octet-stream',
    size: '4.20 MB',
    errorReason: 'Portable Datajack Parquet Cartridge (312 hybrid BM25 + vector chunks, SHA-256 sealed). Binary/non-UTF-8 bytes cannot be edited as plain text in Monaco — download or copy path below.',
    status: '',
    code: '',
    oldDiff: '',
    newDiff: '',
  },
  '.env.example': {
    type: 'file',
    dotfile: true,
    status: '',
    code: `# Sovereign Environment Template (Hidden when Dotfile Filter is ON)
AIM_PUBLIC_URL=https://localhost:8000
ALLOWED_IPS=127.0.0.1,198.51.100.42`,
    oldDiff: '',
    newDiff: '',
  },
};

const PORTAL_TYPE_PHRASES = [
  'search_lancedb("30% context handoff rule")',
  'aim export-cartridge --out core.engram',
  'search_lancedb("cross-harness Grok + AGY")',
];

const SCRAMBLE_CHARS = '01ABCDEF/>_#$%&*+=?AIM';
const MATRIX_SCRAMBLE_TICK_MS = 22;
const MATRIX_SCRAMBLE_STEP = 0.62;
const ACTIVE_SCRAMBLE_TIMERS = new Set();
const MARKUP_IMAGE_CACHE = new Map();

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
    title: 'Emerald Matrix V4, 2-Column Files/Media IDE, Visual Markup Studio & 1-Click 2FA Handoff (#256–#282)',
    logPath: '~/.gemini/antigravity-cli/brain/1f1f1dbb-0324-4f49-94e4-e6952cc9e3c1/.system_generated/logs/transcript.jsonl',
    sampleTurns: [
      { role: 'OPERATOR', text: 'Ship the 2-column Files IDE, DOCS 1-TAB reader, Visual Markup Studio, Discord Hop-to-Bottom, and 1-click Browser 2FA Takeover.' },
      { role: 'J.O.S.H.U.A.', text: 'Promoted #256–#282 to master @ f67ea00 (255/255 pytest, 0 oxlint errors) with full Desktop & 390px Full-View Mobile parity.' },
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
    { id: 'fav-1', title: 'Google', url: 'https://www.google.com/', tabId: 'tab-user-google' },
    { id: 'fav-2', title: 'YouTube', url: 'https://www.youtube.com/results?search_query=ai+coding+agents', tabId: 'tab-user-youtube' },
    { id: 'fav-3', title: 'LeadDeeds', url: 'https://www.leaddeeds.com', tabId: 'tab-ld' },
    { id: 'fav-4', title: 'TBSoftWash', url: 'https://tbsoftwash.com', tabId: 'tab-tb' },
    { id: 'fav-5', title: 'aim-joshua', url: 'https://github.com/BrianV1981/aim-joshua', tabId: 'tab-joshua' },
    { id: 'fav-6', title: 'SoftWash Academy', url: 'https://academy.tbsoftwash.com', tabId: 'tab-academy' },
    { id: 'fav-7', title: 'aim-connect', url: 'https://github.com/BrianV1981/aim-connect', tabId: 'tab-connect' },
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
  recentSessions: ['aim-ld', 'aim-joshua', 'aim-connect'],
  skillFlash: {},

  // Operator Reply Visibility & Chat-Box Dot Alignment
  operatorStyle: localStorage.getItem('proto-op-style') || 'cyan', // 'cyan' | 'gold' | 'emerald' | 'grey'
  operatorSide: localStorage.getItem('proto-op-side') || 'right',  // 'right' | 'left'

  // Live Cockpit Stage & Scroll State (#260, #272, #277)
  agentStageMode: 'chat', // 'chat' | 'pty'
  sessionAutoScroll: false, // OFF by default (#277)
  chatScrolledUp: false,
  chatUnseenBelow: false,

  // All SettingsModal.jsx + IntegrationsModal.jsx + TMUX & BOOT (#299/#300) state
  settingsTab: 'appearance', // 'appearance' | 'tmux' | 'keyboard' | 'voice' | 'integrations' | 'security'
  spawnTab: 'repo',          // 'repo' | 'custom'
  repoSearch: '',
  defaultAgent: 'agy',       // 'agy' | 'grok' | 'opencode' | 'codex' | 'shell'
  autoResumeC: true,
  skipPermissions: true,
  autoRestoreOnBoot: true,
  emptySaveGuardrail: true,
  showSidebarResurrectBar: true,
  bootUnitInstalled: true,
  wslKeepaliveRunning: true,
  wslIdleConfigured: true,
  wslAlwaysOnEnabled: true,
  wslStartupVbsInstalled: true,
  activeBundleId: 'index-B9T_UA9z.js',
  activeServerId: 'srv-ws',
  showLockAddServer: false,
  nodeIdentityToast: '',
  servers: [
    { id: 'srv-ws', label: 'PRIMARY WORKSTATION', monogram: 'WS', url: 'https://aim.example.com', host: 'aim.example.com', color: '#00FFA3' },
    { id: 'srv-vps', label: 'CLOUD VPS-01', monogram: 'VPS', url: 'https://vps.example.com', host: 'vps.example.com', color: '#38BDF8' },
    { id: 'srv-lab', label: 'EDGE LAB NODE', monogram: 'LAB', url: 'https://lab.example.com', host: 'lab.example.com', color: '#A855F7' },
  ],
  savedSnapshotCount: 14,
  repoScanPaths: '~/aim-agents\n/mnt/d/projects',
  tmuxSettingsToast: '',
  workspaceToast: '',
  termFontSize: 13,
  termPalette: 'match',      // 'match' | 'standard' | 'hacker' | 'contrast'
  editorFontSize: 13,
  editorWordWrap: true,
  autoCaps: true,
  alertChime: true,
  kbFeedback: 'ticks',       // 'ticks' | 'haptic' | 'off'
  voiceAutoRead: true,
  ttsVoice: 'piper:en_GB-alan-medium',
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

  // 2-Column Files IDE, DOCS 1-TAB Reader & Media Player State (#262, #266, #267, #270)
  filesNavMode: 'files', // 'files' | 'git'
  filesTreeSide: 'left', // 'left' | 'right'
  filesTreeCollapsed: false,
  filesTreeWidth: 226,
  filesShowMobileTree: false,
  filesHideDotfiles: true,
  docsSingleTabMode: false,
  docsHistory: { entries: ['HANDOFF.md'], index: 0 },
  fileTabs: [
    { id: 'ftab-handoff', path: 'HANDOFF.md', isDocsReader: false },
    { id: 'ftab-app', path: 'frontend/src/App.jsx', isDocsReader: false },
    { id: 'ftab-audio', path: 'recordings/call_727_555_0194_harper.wav', isDocsReader: false },
  ],
  activeFile: 'HANDOFF.md',
  mdViewMode: 'preview', // 'preview' | 'code'
  imageZoomMode: 'fit',  // 'fit' | 'actual'
  fileSelectMode: false,
  audioPlaybackRate: 1,
  expandedDirs: {
    docs: true,
    'frontend/src': true,
    backend: true,
    recordings: true,
    artifacts: true,
    engrams: true,
    'memory-wiki': true,
  },
  fileConflictBanner: false,
  fileSavedBadge: '',
  fileCopyBadge: '',

  // Cmd+K Search, Browser 2FA Handoff & Visual Markup Studio (#273, #275, #276)
  cmdkQuery: '',
  sessionToDelete: '',
  popover: null, // 'bolt' | 'browser-dl' | null
  modal: null,   // 'cmdk' | 'settings' | 'macros' | 'grab' | 'forensics' | 'delete-sess' | 'spawn-sess' | 'shot-markup' | null
  hudStep: 0,
  deferredPrompt: null,
  composerDraft: '',
  composerCustomHeight: null,
  composerActionsLayout: 'row',
  sentMessages: {},
  stagedAttachments: {
    'aim-connect': [
      {
        id: 'shot-seed-1',
        filename: 'screenshot-leaddeeds-v4.png',
        path: 'docs/screenshots/emerald-matrix-arch.svg',
        screenSrc: './screens/leaddeeds.webp',
        dims: '1280×713 WEBP',
        url: 'https://www.leaddeeds.com',
        annotated: false,
        annotations: [],
      },
    ],
  },
  shotFlash: false,
  shotFullPage: false,
  sendContinueOnResume: true,
  editingShot: null, // { sessionKey, shotId }
  markupTool: 'pin',
  markupColor: '#FF3B5C',
  markupAnns: [],
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
  if (state.modal === 'shot-markup' && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    state.markupAnns = state.markupAnns.slice(0, -1);
    render();
    return;
  }
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

function clearActiveScrambles() {
  ACTIVE_SCRAMBLE_TIMERS.forEach((id) => clearInterval(id));
  ACTIVE_SCRAMBLE_TIMERS.clear();
}

function attachScramble(el, originalText, triggerEl = el) {
  if (!el || !triggerEl || !originalText || el.dataset.scrambleElBound === '1') return;
  el.dataset.scrambleElBound = '1';
  triggerEl.dataset.scrambleBound = '1';
  let timer = null;
  triggerEl.addEventListener('mouseenter', () => {
    if (timer) {
      clearInterval(timer);
      ACTIVE_SCRAMBLE_TIMERS.delete(timer);
    }
    let step = 0;
    timer = setInterval(() => {
      step += MATRIX_SCRAMBLE_STEP;
      const done = Math.floor(step);
      if (done >= originalText.length) {
        el.textContent = originalText;
        clearInterval(timer);
        ACTIVE_SCRAMBLE_TIMERS.delete(timer);
        timer = null;
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
    }, MATRIX_SCRAMBLE_TICK_MS);
    ACTIVE_SCRAMBLE_TIMERS.add(timer);
  });
  triggerEl.addEventListener('mouseleave', () => {
    if (timer) {
      clearInterval(timer);
      ACTIVE_SCRAMBLE_TIMERS.delete(timer);
      timer = null;
    }
    el.textContent = originalText;
  });
}

function pickScrambleTargetSpan(btn) {
  const skipSpanClasses = ['seg-expand-badge', 'cp-dl-badge', 'fleet-header-unread-dot', 'mono-kbd'];
  const spans = [...btn.querySelectorAll('span')].filter(
    (sp) =>
      !skipSpanClasses.some((cls) => sp.classList.contains(cls)) &&
      sp.children.length === 0 &&
      /[A-Za-z0-9]{2}/.test((sp.textContent || '').trim())
  );
  if (spans.length) return spans[spans.length - 1];
  const directTextNodes = [...btn.childNodes].filter(
    (n) => n.nodeType === Node.TEXT_NODE && /[A-Za-z0-9]{2}/.test((n.nodeValue || '').trim())
  );
  if (directTextNodes.length === 1) {
    const tn = directTextNodes[0];
    const span = document.createElement('span');
    span.textContent = tn.nodeValue;
    btn.replaceChild(span, tn);
    return span;
  }
  return null;
}

function bindStandaloneButtonScrambles() {
  const excludedSelectors = [
    '.spotlight-card',
    '.fleet-del-btn',
    '.totp-keypad',
    '.kb-grid',
    '.ctrl-key-grid',
    '.pop-item',
    '.cp-tab',
    '.tree-file-btn',
    '.md-file-link',
    '.shot-link-btn',
    '[data-open-fav]',
  ];
  document
    .querySelectorAll('button, .lab-pill, .wait-alert-pill, .new-reply-pill, a.coffee-cta-btn, a.subbar-util-btn')
    .forEach((btn) => {
      if (btn.dataset.scrambleBound === '1' || btn.disabled) return;
      if (excludedSelectors.some((sel) => btn.closest(sel))) return;
      const target = pickScrambleTargetSpan(btn);
      if (!target) return;
      const rawText = target.textContent || '';
      const trimmed = rawText.trim();
      if (trimmed.length < 2 || trimmed.length > 28) return;
      attachScramble(target, rawText, btn);
    });
}

function getActiveShowcaseServer() {
  return state.servers.find((s) => s.id === state.activeServerId) || state.servers[0];
}

function renderLockScreen() {
  const activeSrv = getActiveShowcaseServer();
  return `
    <div class="auth-lock-stage">
      <div class="auth-card ld-mask-glass">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="ld-brand-box">${ICONS.aimMark}</div>
            <div>
              <div style="font-family:var(--font-mono);font-weight:700;font-size:15px;">AIM<span style="color:var(--accent);">CONNECT</span> // 3FA GATE</div>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);letter-spacing:0.12em;">ZERO-TRUST TOTP · WEBAUTHN · E2EE</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <button type="button" class="ghost-btn" style="height:28px;padding:0 8px;font-size:10px;" data-act="hard-refresh-app" title="Reload latest frontend bundle (mobile PWA equivalent to Ctrl+Shift+R)">
              ${ICONS.refresh} <span>REFRESH</span>
            </button>
            <button class="subbar-util-btn active" data-act="unlock-cockpit" title="Return to Unlocked Cockpit">UNLOCK</button>
          </div>
        </div>

        <div style="width:100%;padding:9px 11px;border-radius:10px;background:rgba(255,255,255,0.025);border:1px solid ${activeSrv.color};display:flex;flex-direction:column;gap:7px;text-align:left;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:7px;min-width:0;">
              <span style="width:8px;height:8px;border-radius:50%;background:${activeSrv.color};box-shadow:0 0 8px ${activeSrv.color};flex-shrink:0;"></span>
              <span style="font-family:var(--font-mono);font-size:11.5px;font-weight:700;color:var(--text-primary);">${escapeHtml(activeSrv.label)}</span>
              <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);">· ${escapeHtml(activeSrv.host)}</span>
            </div>
            <button type="button" class="ghost-btn" style="height:23px;padding:0 7px;font-size:9.5px;" data-act="toggle-lock-add-srv">
              ${state.showLockAddServer ? ICONS.close : ICONS.plus} <span>${state.showLockAddServer ? 'CANCEL' : 'SERVERS'}</span>
            </button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;">
            ${state.servers
              .map((srv) => {
                const isCurr = srv.id === activeSrv.id;
                return `
                  <button
                    type="button"
                    data-switch-srv="${srv.id}"
                    ${isCurr ? 'disabled' : ''}
                    style="border-radius:7px;border:${isCurr ? `1px solid ${srv.color}` : '1px solid var(--border-hairline)'};background:${isCurr ? 'rgba(255,255,255,0.07)' : 'var(--bg-input)'};color:${isCurr ? 'var(--text-primary)' : 'var(--text-secondary)'};font-family:var(--font-mono);font-size:10px;font-weight:${isCurr ? 700 : 500};padding:4px 8px;display:inline-flex;align-items:center;gap:5px;cursor:${isCurr ? 'default' : 'pointer'};"
                    title="${isCurr ? `Active node: ${srv.url}` : `Switch login screen to ${srv.label} (${srv.url})`}"
                  >
                    <span style="width:6px;height:6px;border-radius:50%;background:${srv.color};"></span>
                    <span>${escapeHtml(srv.label)}</span>
                    ${!isCurr ? ICONS.externalLink : ''}
                  </button>
                `;
              })
              .join('')}
          </div>
          ${
            state.showLockAddServer
              ? `
            <div style="display:flex;flex-direction:column;gap:6px;padding-top:4px;border-top:1px solid var(--border-hairline);">
              <div style="display:flex;gap:5px;flex-wrap:wrap;">
                <input id="lock-new-srv-label" class="ld-text-input" style="flex:1 1 100px;height:30px;font-size:11.5px;" placeholder="Label (e.g. GPU Box)" />
                <input id="lock-new-srv-url" class="ld-text-input" style="flex:2 1 160px;height:30px;font-size:11.5px;" placeholder="https://gpu.example.com" />
              </div>
              <div style="display:flex;justify-content:flex-end;gap:6px;">
                <button type="button" class="subbar-util-btn" data-act="lock-save-srv"><span>SAVE TO LIST</span></button>
                <button type="button" class="neon-cta-btn" style="height:26px;padding:0 10px;font-size:10px;" data-act="lock-save-switch-srv"><span>SAVE &amp; SWITCH</span></button>
              </div>
            </div>
          `
              : ''
          }
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

function resolveScreenForUrl(url) {
  const u = String(url || '').toLowerCase();
  if (u.includes('youtube.com')) return './screens/youtube.webp';
  if (u.includes('google.com')) return './screens/google.webp';
  if (u.includes('academy.tbsoftwash')) return './screens/academy.webp';
  if (u.includes('tbsoftwash.com')) return './screens/tbsoftwash.webp';
  if (u.includes('aim-joshua')) return './screens/github-joshua.webp';
  if (u.includes('aim-connect')) return './screens/github-connect.webp';
  return './screens/leaddeeds.webp';
}

function renderMockWebpage(tab) {
  const screenSrc = tab.screenSrc || resolveScreenForUrl(tab.url);
  const mb = ((24 * state.dlProgress) / 100).toFixed(1);
  const hudCursorHtml =
    tab.color && tab.isWorking && tab.hudCursor
      ? `
        <div class="browser-agent-hud-cursor" style="left:${tab.hudCursor.x};top:${tab.hudCursor.y};--agent-color:${tab.color.hex};--agent-rgb:${tab.color.rgb};">
          <span class="browser-agent-hud-dot"></span>
          <span class="browser-agent-hud-pill">${escapeHtml(tab.agentKey)} // ${escapeHtml(tab.hudCursor.label)}</span>
        </div>
      `
      : '';

  const stageHtml = `
    <div class="web-canvas real-shot-canvas">
      <div class="real-shot-stage">
        <img src="${escapeHtml(screenSrc)}" alt="${escapeHtml(tab.title)}" class="real-browser-shot" draggable="false" />
        ${hudCursorHtml}
      </div>
    </div>
  `;

  if (tab.id === 'tab-academy') {
    return `
      <div style="flex:1;min-height:0;display:flex;flex-direction:column;background:#050708;">
        ${stageHtml}
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

  return stageHtml;
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

let _cachedWavUrl = '';
function getSyntheticWavUrl() {
  if (_cachedWavUrl) return _cachedWavUrl;
  const sampleRate = 8000;
  const seconds = 4;
  const numSamples = sampleRate * seconds;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeStr = (off, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = Math.sin(Math.min(1, t * 4) * Math.PI * 0.5) * Math.exp(-t * 0.45);
    const freq = t < 1.2 ? 523.25 : t < 2.4 ? 659.25 : 783.99;
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.25 * env;
    view.setInt16(44 + i * 2, Math.max(-32767, Math.min(32767, Math.round(sample * 32767))), true);
  }
  _cachedWavUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  return _cachedWavUrl;
}

function renderInlineMarkdown(rawLine) {
  let s = escapeHtml(rawLine);
  s = s.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\(file:\/\/\/?([^)]+)\)/g, (_m, lbl, fpath) => {
    const cleanPath = fpath.replace(/^\/+/, '');
    return `<button type="button" class="md-file-link" data-md-file="${cleanPath}" title="Open ${cleanPath} in Files IDE">${ICONS.files} <span>${lbl}</span></button>`;
  });
  return s;
}

function renderMarkdownHtml(mdText) {
  const src = String(mdText || '');
  const parts = src.split(/```(\w*)\n([\s\S]*?)```/g);
  const blocks = [];
  for (let i = 0; i < parts.length; i += 3) {
    const prose = parts[i] || '';
    const lines = prose.split('\n');
    let listBuf = [];
    const flushList = () => {
      if (listBuf.length) {
        blocks.push(`<ul>${listBuf.map((li) => `<li>${renderInlineMarkdown(li)}</li>`).join('')}</ul>`);
        listBuf = [];
      }
    };
    for (const raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed) {
        flushList();
        continue;
      }
      if (trimmed.startsWith('- ')) {
        listBuf.push(trimmed.slice(2));
      } else {
        flushList();
        if (trimmed.startsWith('### ')) blocks.push(`<h3>${renderInlineMarkdown(trimmed.slice(4))}</h3>`);
        else if (trimmed.startsWith('## ')) blocks.push(`<h2>${renderInlineMarkdown(trimmed.slice(3))}</h2>`);
        else if (trimmed.startsWith('# ')) blocks.push(`<h1>${renderInlineMarkdown(trimmed.slice(2))}</h1>`);
        else if (trimmed.startsWith('> ')) {
          blocks.push(
            `<blockquote style="margin:0;padding:6px 11px;border-left:3px solid var(--accent);background:var(--bg-subtle);border-radius:0 7px 7px 0;color:var(--text-secondary);">${renderInlineMarkdown(trimmed.slice(2))}</blockquote>`
          );
        } else {
          blocks.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
        }
      }
    }
    flushList();
    if (i + 2 < parts.length) {
      const lang = (parts[i + 1] || 'code').toUpperCase();
      const codeBody = escapeHtml(parts[i + 2] || '');
      blocks.push(
        `<div class="md-code-card"><div class="md-code-hdr"><span>${lang}</span></div><pre class="md-code-pre">${codeBody}</pre></div>`
      );
    }
  }
  return `<div class="ld-markdown-body">${blocks.join('')}</div>`;
}

function openShowcaseFile(filePath, opts = {}) {
  const clean = FILES_DB[filePath] ? filePath : 'HANDOFF.md';
  const entry = FILES_DB[clean];
  const inPlaceDocs = Boolean(opts.viaDocsHub && state.docsSingleTabMode && entry?.isDoc);

  if (inPlaceDocs) {
    const existingDocIdx = state.fileTabs.findIndex((t) => t.isDocsReader);
    if (existingDocIdx >= 0) {
      state.fileTabs[existingDocIdx] = { ...state.fileTabs[existingDocIdx], path: clean, isDocsReader: true };
    } else {
      state.fileTabs.push({ id: 'docs-reader-tab', path: clean, isDocsReader: true });
    }
    if (!opts.skipHistory) {
      const sliced = state.docsHistory.entries.slice(0, state.docsHistory.index + 1);
      if (sliced[sliced.length - 1] !== clean) sliced.push(clean);
      state.docsHistory = { entries: sliced, index: sliced.length - 1 };
    }
    state.mdViewMode = 'preview';
  } else {
    const existing = state.fileTabs.find((t) => t.path === clean && !t.isDocsReader);
    if (!existing) {
      state.fileTabs.push({ id: `ftab-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, path: clean, isDocsReader: false });
    }
    if (clean.endsWith('.md')) state.mdViewMode = 'preview';
  }
  state.activeFile = clean;
  state.filesNavMode = 'files';
  state.filesShowMobileTree = false;
  if (opts.openPane) {
    state.activeTool = 'files';
  }
}

function renderFilesView(isFull) {
  const activeKey = FILES_DB[state.activeFile] ? state.activeFile : 'HANDOFF.md';
  const entry = FILES_DB[activeKey];
  const activeTabRecord =
    state.fileTabs.find((t) => t.path === activeKey) ||
    state.fileTabs[0] || { id: 'ftab-handoff', path: activeKey, isDocsReader: false };
  const isMarkdown = activeKey.endsWith('.md');
  const isMediaOrBin = ['image', 'audio', 'video', 'binary'].includes(entry.type);

  const allPaths = Object.keys(FILES_DB).filter((p) => (state.filesHideDotfiles ? !FILES_DB[p].dotfile : true));
  const coreDocs = ['README.md', 'HANDOFF.md', 'AGENTS.md'];
  const wikiDocs = ['memory-wiki/index.md', 'memory-wiki/pages/browser_copilot_architecture.md'];
  const gitChanged = Object.keys(FILES_DB).filter((k) => Boolean(FILES_DB[k].status));

  const folderGroups = {};
  const rootFiles = [];
  allPaths.forEach((p) => {
    const slash = p.indexOf('/');
    if (slash === -1) rootFiles.push(p);
    else {
      const topDir = p.slice(0, p.lastIndexOf('/'));
      folderGroups[topDir] = folderGroups[topDir] || [];
      folderGroups[topDir].push(p);
    }
  });

  const segments = activeKey.split('/');

  return `
    <div class="copilot-top-bar files-top-bar">
      <div class="copilot-top-left">
        <button class="subbar-util-btn ${state.filesNavMode === 'files' ? 'active' : ''}" data-fnav="files">
          ${ICONS.files} <span>FILES</span>
        </button>
        <button class="subbar-util-btn ${state.filesNavMode === 'git' ? 'active' : ''}" data-fnav="git">
          ${ICONS.gitBranch} <span>GIT DIFF (${gitChanged.length})</span>
        </button>

        <div class="project-docs-hub-bar" role="group" aria-label="Project Docs Hub">
          <span class="project-docs-hub-badge" title="Project Docs &amp; Memory Wiki Hub">
            ${ICONS.bookOpen}
            <span>DOCS</span>
          </span>
          ${
            state.docsSingleTabMode
              ? `
            <button type="button" class="docs-nav-arrow-btn" data-act="docs-back" ${state.docsHistory.index <= 0 ? 'disabled' : ''} title="Back to previous Project Doc">←</button>
            <button type="button" class="docs-nav-arrow-btn" data-act="docs-fwd" ${state.docsHistory.index >= state.docsHistory.entries.length - 1 ? 'disabled' : ''} title="Forward to next Project Doc">→</button>
          `
              : ''
          }
          ${coreDocs
            .map((docKey) => {
              const shortLbl = docKey.replace('.md', '');
              return `<button type="button" class="fav-chip ${activeKey === docKey ? 'active' : ''}" data-doc-hub="${docKey}" title="${docKey}">${shortLbl}</button>`;
            })
            .join('')}
          <select class="ld-select" id="wiki-hub-sel" style="width:auto;height:22px;padding:0 6px;font-size:10px;">
            <option value="">memory-wiki/ (${wikiDocs.length})</option>
            ${wikiDocs
              .map((w) => `<option value="${w}">${w.split('/').pop().replace('.md', '')}</option>`)
              .join('')}
          </select>
          <button
            type="button"
            class="docs-webnav-toggle ${state.docsSingleTabMode ? 'active' : ''}"
            data-act="toggle-docs-1tab"
            title="Toggle Single-Tab Website Navigation (navigate Project Docs &amp; Wiki in 1 reusable tab with Back/Forward vs opening a new tab per page)"
          >
            <span>${state.docsSingleTabMode ? '1-TAB: ON' : '1-TAB: OFF'}</span>
          </button>
        </div>
      </div>

      <div class="copilot-top-right">
        ${
          entry.type === 'file' && (!isMarkdown || state.mdViewMode === 'code')
            ? `<button class="subbar-util-btn active" data-act="save-file">${ICONS.check} <span>${state.fileSavedBadge || 'SAVE'}</span></button>`
            : ''
        }
        <button class="subbar-util-btn" data-act="copy-file">
          ${ICONS.copyText}
          <span>${state.fileCopyBadge || (isMediaOrBin ? 'COPY PATH' : 'COPY ALL')}</span>
        </button>
        <button
          class="pane-full-upgrade-btn desktop-only desktop-split-only ${isFull ? 'is-full' : ''}"
          data-act="toggle-full"
          title="${isFull ? 'Return Files to Split Screen' : 'Upgrade Files to Full View'}"
        >
          ${isFull ? ICONS.split : ICONS.maximize}
          <span>${isFull ? 'SPLIT VIEW' : 'FULL VIEW'}</span>
        </button>
        <button
          type="button"
          class="ghost-btn ${!state.filesTreeCollapsed ? 'active' : ''}"
          style="height:26px;padding:0 7px;"
          data-act="collapse-files-tree"
          title="${state.filesTreeCollapsed ? 'Show File Explorer Sidebar' : 'Collapse File Explorer Sidebar'}"
        >
          ${ICONS.menu}
        </button>
        <button class="ghost-btn" style="height:26px;padding:0 6px;" data-act="close-tool" title="Close Files">${ICONS.close}</button>
      </div>
    </div>

    ${
      state.fileConflictBanner
        ? `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:7px 14px;background:rgba(245,158,11,0.14);border-bottom:1px solid rgba(245,158,11,0.45);font-family:var(--font-mono);font-size:11px;color:#fbbf24;">
        <span style="display:inline-flex;align-items:center;gap:6px;">${ICONS.alert} <span>HTTP 409 MTIME GUARD // Agent modified ${escapeHtml(activeKey)} on disk since opened.</span></span>
        <div style="display:flex;gap:6px;">
          <button class="fav-chip" data-act="toggle-conflict">RELOAD DISK</button>
          <button class="danger-btn" style="height:24px;padding:0 9px;font-size:10px;" data-act="toggle-conflict">FORCE OVERWRITE</button>
        </div>
      </div>
    `
        : ''
    }

    <div
      class="files-split-body ${state.filesTreeSide === 'right' ? 'tree-right' : 'tree-left'}"
      id="files-split-body"
      style="--files-tree-width:${state.filesTreeWidth}px;"
    >
      <aside class="files-tree-rail ${state.filesTreeCollapsed ? 'rail-collapsed' : ''} ${!state.filesShowMobileTree ? 'mobile-rail-hidden' : ''}">
        <div class="files-tree-folder-row">
          <span style="color:var(--accent);display:inline-flex;">${state.filesNavMode === 'git' ? ICONS.gitBranch : ICONS.folder}</span>
          <span class="files-tree-folder-title">${state.filesNavMode === 'git' ? 'CHANGES (MASTER)' : 'AIM-CONNECT'}</span>
        </div>

        <div class="files-tree-actions-row">
          <button
            type="button"
            class="fav-chip tree-side-flip-btn"
            data-act="flip-files-tree"
            title="${state.filesTreeSide === 'right' ? 'Move File Explorer to Left side' : 'Move File Explorer to Right side'}"
          >
            ${state.filesTreeSide === 'right' ? ICONS.sidebar : ICONS.panelRight}
            <span>${state.filesTreeSide === 'right' ? '← LEFT' : 'RIGHT →'}</span>
          </button>
          <div style="display:flex;align-items:center;gap:3px;">
            <button
              type="button"
              class="fav-chip ${!state.filesHideDotfiles ? 'active' : ''}"
              style="padding:0 5px;"
              data-act="toggle-dotfiles"
              title="${state.filesHideDotfiles ? 'Dotfiles hidden — click to show .env.example' : 'Showing dotfiles — click to filter'}"
            >
              ${state.filesHideDotfiles ? ICONS.eyeOff : ICONS.eye}
            </button>
            <button type="button" class="fav-chip" style="padding:0 5px;" data-act="toggle-conflict" title="Test HTTP 409 mtime conflict banner">409</button>
          </div>
        </div>

        <div class="files-tree-scroll">
          ${
            state.filesNavMode === 'git'
              ? gitChanged
                  .map(
                    (gk) => `
                  <button class="tree-file-btn ${activeKey === gk ? 'active' : ''}" data-file="${gk}">
                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${gk}</span>
                    <span style="color:${FILES_DB[gk].status === 'M' ? '#fbbf24' : 'var(--accent)'};font-size:9.5px;font-weight:700;">${FILES_DB[gk].status}</span>
                  </button>
                `
                  )
                  .join('')
              : `
                ${Object.keys(folderGroups)
                  .map((dir) => {
                    const isExp = state.expandedDirs[dir] !== false;
                    return `
                      <div>
                        <button type="button" class="tree-file-btn" style="width:100%;font-weight:600;color:var(--text-primary);" data-toggle-dir="${dir}">
                          <span style="display:inline-flex;align-items:center;gap:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            <span style="font-size:9px;opacity:0.7;">${isExp ? '▾' : '▸'}</span>
                            <span style="color:var(--accent);display:inline-flex;">${ICONS.folder}</span>
                            <span>${dir}/</span>
                          </span>
                        </button>
                        ${
                          isExp
                            ? folderGroups[dir]
                                .map((fp) => {
                                  const meta = FILES_DB[fp];
                                  const leaf = fp.split('/').pop();
                                  return `
                                    <button type="button" class="tree-file-btn ${activeKey === fp ? 'active' : ''}" style="width:100%;padding-left:20px;" data-file="${fp}">
                                      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${leaf}</span>
                                      ${meta.status ? `<span style="color:${meta.status === 'M' ? '#fbbf24' : 'var(--accent)'};font-size:9.5px;font-weight:700;">${meta.status}</span>` : ''}
                                    </button>
                                  `;
                                })
                                .join('')
                            : ''
                        }
                      </div>
                    `;
                  })
                  .join('')}
                ${rootFiles
                  .map((rf) => {
                    const meta = FILES_DB[rf];
                    return `
                      <button type="button" class="tree-file-btn ${activeKey === rf ? 'active' : ''}" style="width:100%;" data-file="${rf}">
                        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${rf}</span>
                        ${meta.status ? `<span style="color:${meta.status === 'M' ? '#fbbf24' : 'var(--accent)'};font-size:9.5px;font-weight:700;">${meta.status}</span>` : ''}
                      </button>
                    `;
                  })
                  .join('')}
              `
          }
        </div>
      </aside>

      ${
        !state.filesTreeCollapsed
          ? `<div class="files-tree-resizer desktop-only" id="files-tree-resizer" title="Drag to resize folder explorer · Double-click to reset width"></div>`
          : ''
      }

      <div class="files-editor-column">
        <div class="copilot-tabs-row" style="padding:5px 10px;">
          <button type="button" class="fav-chip mobile-tree-toggle" data-act="toggle-mobile-tree">
            ${state.filesShowMobileTree ? 'HIDE TREE' : 'TREE'}
          </button>
          ${state.fileTabs
            .map((ft) => {
              const isSel = ft.path === activeKey;
              const base = ft.path.split('/').pop();
              const label = ft.isDocsReader ? `DOCS · ${base}` : base;
              return `
                <div class="cp-tab ${isSel ? 'active' : ''}" data-file="${ft.path}" title="${ft.path}">
                  <span>${escapeHtml(label)}</span>
                  ${
                    state.fileTabs.length > 1
                      ? `<span style="opacity:0.65;padding-left:3px;" data-close-ftab="${ft.id}" title="Close tab">×</span>`
                      : ''
                  }
                </div>
              `;
            })
            .join('')}
        </div>

        <div class="files-breadcrumb-bar">
          <div class="files-breadcrumb-trail">
            <span class="breadcrumb-seg-btn">aim-connect</span>
            ${segments
              .map((seg, idx) => {
                const isLeaf = idx === segments.length - 1;
                return `
                  <span style="display:inline-flex;align-items:center;gap:4px;">
                    <span style="opacity:0.4;display:inline-flex;">${ICONS.chevronRight}</span>
                    ${
                      isLeaf
                        ? `<span class="breadcrumb-leaf">${escapeHtml(seg)}</span>`
                        : `<span class="breadcrumb-seg-btn">${escapeHtml(seg)}</span>`
                    }
                  </span>
                `;
              })
              .join('')}
          </div>

          <div class="files-breadcrumb-actions">
            ${
              activeTabRecord.isDocsReader
                ? `<button type="button" class="fav-chip" data-act="pin-docs-tab" title="Pin current doc as its own standalone tab">${ICONS.pin} <span style="margin-left:3px;">PIN TAB</span></button>`
                : ''
            }
            ${
              isMarkdown && state.filesNavMode !== 'git'
                ? `<button type="button" class="fav-chip ${state.mdViewMode === 'preview' ? 'active' : ''}" data-act="toggle-md-mode">${state.mdViewMode === 'preview' ? ICONS.code : ICONS.eye} <span style="margin-left:3px;">${state.mdViewMode === 'preview' ? 'EDIT CODE' : 'PREVIEW'}</span></button>`
                : ''
            }
            ${entry.dims ? `<span class="mono-kbd" style="font-size:9.5px;">${entry.dims}</span>` : ''}
            ${entry.duration ? `<span class="mono-kbd" style="font-size:9.5px;">${entry.duration}</span>` : ''}
            ${entry.size ? `<span class="mono-kbd" style="font-size:9.5px;">${entry.size}</span>` : ''}
            ${
              entry.type === 'image'
                ? `<button type="button" class="fav-chip ${state.imageZoomMode === 'actual' ? 'active' : ''}" data-act="toggle-img-zoom">${state.imageZoomMode === 'fit' ? '1:1 ZOOM' : 'FIT PANE'}</button>`
                : ''
            }
            ${
              !isMediaOrBin && state.filesNavMode !== 'git'
                ? `<button type="button" class="fav-chip ${state.fileSelectMode ? 'active' : ''}" data-act="toggle-file-select">${state.fileSelectMode ? 'EDITOR MODE' : 'SELECT TEXT'}</button>`
                : ''
            }
            ${
              entry.type === 'file'
                ? `<button type="button" class="fav-chip ${state.filesNavMode === 'git' ? 'active' : ''}" data-fnav="${state.filesNavMode === 'git' ? 'files' : 'git'}">DIFF VS HEAD</button>`
                : ''
            }
          </div>
        </div>

        <div style="flex:1;min-height:0;display:flex;overflow:hidden;">
          ${
            state.filesNavMode === 'git' && entry.type === 'file'
              ? `
            <div class="git-diff-grid" style="flex:1;">
              <div class="diff-col">
                <div style="font-size:10px;color:var(--text-muted);margin-bottom:8px;">HEAD // ${escapeHtml(activeKey)}</div>
                ${(entry.oldDiff || '// clean')
                  .split('\n')
                  .map((l) => `<div class="diff-del">${escapeHtml(l)}</div>`)
                  .join('')}
              </div>
              <div class="diff-col">
                <div style="font-size:10px;color:var(--accent);margin-bottom:8px;">WORKING TREE // ${escapeHtml(activeKey)}</div>
                ${(entry.newDiff || '// clean')
                  .split('\n')
                  .map((l) => `<div class="diff-add">${escapeHtml(l)}</div>`)
                  .join('')}
              </div>
            </div>
          `
              : entry.type === 'image'
              ? `
            <div class="files-image-stage">
              <svg viewBox="0 0 640 360" style="${state.imageZoomMode === 'actual' ? 'width:900px;height:506px;' : 'max-width:100%;max-height:100%;'}border-radius:10px;border:1px solid var(--border-hairline);background:#050807;box-shadow:0 14px 36px rgba(0,0,0,0.5);">
                <rect width="640" height="360" fill="#050807"/>
                <rect x="24" y="24" width="176" height="312" rx="10" fill="#0b1311" stroke="#00ffa3" stroke-opacity="0.45"/>
                <text x="40" y="52" fill="#00ffa3" font-family="monospace" font-size="12" font-weight="bold">FLEET // 12 NODES</text>
                <rect x="40" y="68" width="144" height="34" rx="6" fill="#10211c" stroke="#00ffa3"/>
                <text x="50" y="90" fill="#ecfdf5" font-family="monospace" font-size="11">● aim-connect (AGY)</text>
                <rect x="40" y="112" width="144" height="34" rx="6" fill="#18140c" stroke="#f59e0b"/>
                <text x="50" y="134" fill="#fde68a" font-family="monospace" font-size="11">✋ aim-tbsoftwash</text>
                <rect x="216" y="24" width="196" height="312" rx="10" fill="#090f14" stroke="#00b8ff" stroke-opacity="0.45"/>
                <text x="232" y="52" fill="#38bdf8" font-family="monospace" font-size="12" font-weight="bold">CHAT VIEW // GFM</text>
                <rect x="232" y="72" width="164" height="58" rx="8" fill="rgba(0,184,255,0.12)" stroke="#00b8ff"/>
                <text x="244" y="104" fill="#e0f2fe" font-family="monospace" font-size="10">[OPERATOR // RIGHT ●]</text>
                <circle cx="384" cy="306" r="14" fill="#0c1714" stroke="#00ffa3"/>
                <text x="380" y="310" fill="#00ffa3" font-family="monospace" font-size="12">↓</text>
                <rect x="428" y="24" width="188" height="312" rx="10" fill="#0b1110" stroke="#eab308" stroke-opacity="0.6"/>
                <text x="444" y="52" fill="#fde047" font-family="monospace" font-size="12" font-weight="bold">CDP :9222 // 2FA</text>
                <rect x="444" y="68" width="156" height="32" rx="6" fill="rgba(245,158,11,0.2)" stroke="#f59e0b"/>
                <text x="454" y="88" fill="#fde68a" font-family="monospace" font-size="9.5">TAKE CONTROL &amp; 2FA</text>
              </svg>
            </div>
          `
              : entry.type === 'audio'
              ? `
            <div class="files-media-stage">
              <div class="files-media-card">
                <div class="files-media-card-header">
                  <span class="files-media-icon-box" style="color:#38bdf8;">${ICONS.audio}</span>
                  <div style="min-width:0;flex:1;">
                    <div class="files-media-title">${escapeHtml(activeKey.split('/').pop())}</div>
                    <div class="files-media-subpath">Diarized Repeat-Caller Recording · Evelyn Harper · Clearwater Lot 214</div>
                  </div>
                  <span class="mono-kbd" style="font-size:9.5px;">WAV · HTTP 206 RANGE</span>
                </div>
                <audio id="showcase-audio-el" class="files-audio-player" controls preload="metadata" src="${getSyntheticWavUrl()}"></audio>
                <div class="files-media-meta-row">
                  <div class="files-speed-pills">
                    <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-right:3px;">SPEED</span>
                    ${[1, 1.25, 1.5, 2]
                      .map(
                        (r) => `<button type="button" class="fav-chip ${state.audioPlaybackRate === r ? 'active' : ''}" data-audio-rate="${r}">${r}x</button>`
                      )
                      .join('')}
                  </div>
                  <button type="button" class="fav-chip" data-act="dl-active-file">${ICONS.downloadSm} <span style="margin-left:4px;">SAVE AUDIO</span></button>
                </div>
              </div>
            </div>
          `
              : entry.type === 'video'
              ? `
            <div class="files-media-stage">
              <div class="files-media-card" style="width:min(680px,100%);">
                <div style="border-radius:10px;overflow:hidden;border:1px solid var(--border-hairline);background:#040807;padding:24px;text-align:center;">
                  <div style="font-family:var(--font-mono);font-size:11px;color:var(--accent);margin-bottom:8px;">INLINE HTML5 VIDEO RANGE STREAM (#270 · 250 MB CAP)</div>
                  <div style="font-size:14px;font-weight:700;color:#f8fafc;">Co-Pilot Browser Multi-Tab Subagent Screencast</div>
                  <div style="font-family:var(--font-mono);font-size:10.5px;color:#94a3b8;margin-top:6px;">1440 × 900 · 60fps VP9 · 00:15 · Zero-VLM Landmark Lock</div>
                </div>
                <div class="files-media-meta-row">
                  <div class="files-speed-pills">
                    <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-right:3px;">SPEED</span>
                    ${[1, 1.25, 1.5, 2]
                      .map(
                        (r) => `<button type="button" class="fav-chip ${state.audioPlaybackRate === r ? 'active' : ''}" data-audio-rate="${r}">${r}x</button>`
                      )
                      .join('')}
                  </div>
                  <button type="button" class="fav-chip" data-act="dl-active-file">${ICONS.downloadSm} <span style="margin-left:4px;">SAVE VIDEO</span></button>
                </div>
              </div>
            </div>
          `
              : entry.type === 'binary'
              ? `
            <div class="files-media-stage">
              <div class="files-media-card">
                <div class="files-media-card-header">
                  <span class="files-media-icon-box" style="color:#fbbf24;background:rgba(245,158,11,0.1);">${ICONS.fileBinary}</span>
                  <div style="min-width:0;flex:1;">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                      <span class="files-binary-badge">BINARY / NON-UTF-8</span>
                      <span class="mono-kbd" style="font-size:9.5px;">${entry.mimeType}</span>
                      <span class="mono-kbd" style="font-size:9.5px;">${entry.size}</span>
                    </div>
                    <div class="files-media-title">${escapeHtml(activeKey.split('/').pop())}</div>
                    <div class="files-media-subpath">${escapeHtml(activeKey)}</div>
                  </div>
                </div>
                <div style="font-family:var(--font-mono);font-size:11.5px;color:var(--text-secondary);line-height:1.55;">
                  ${escapeHtml(entry.errorReason)}
                </div>
                <div class="files-media-meta-row">
                  <div style="display:inline-flex;align-items:center;gap:8px;">
                    <button type="button" class="subbar-util-btn active" data-act="dl-active-file">${ICONS.downloadSm} <span>DOWNLOAD FILE</span></button>
                    <button type="button" class="fav-chip" data-act="copy-file">${ICONS.copyText} <span style="margin-left:4px;">${state.fileCopyBadge || 'COPY PATH'}</span></button>
                  </div>
                </div>
              </div>
            </div>
          `
              : isMarkdown && state.mdViewMode === 'preview' && !state.fileSelectMode
              ? `<div class="files-md-preview" style="font-size:${state.editorFontSize + 1}px;">${renderMarkdownHtml(entry.code)}</div>`
              : state.fileSelectMode
              ? `<pre style="flex:1;margin:0;padding:16px 20px;background:var(--bg-term);font-family:var(--font-mono);font-size:${state.editorFontSize}px;line-height:1.7;color:var(--text-primary);overflow:auto;user-select:text;">${escapeHtml(entry.code)}</pre>`
              : `
            <textarea
              id="showcase-code-editor"
              spellcheck="false"
              style="flex:1;width:100%;height:100%;border:none;outline:none;resize:none;padding:16px 20px;background:var(--bg-term);color:var(--text-primary);font-family:var(--font-mono);font-size:${state.editorFontSize}px;line-height:1.68;${state.editorWordWrap ? 'white-space:pre-wrap;' : 'white-space:pre;overflow-x:auto;'}"
            >${escapeHtml(entry.code)}</textarea>
          `
          }
        </div>
      </div>
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
            ['tmux', 'TMUX & BOOT'],
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
              <div style="flex:1;min-width:220px;">
                <div style="font-family:var(--font-mono);font-size:12px;font-weight:700;">STANDALONE APP MODE (POP-OUT WINDOW)</div>
                <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">
                  Pop AIM Connect out of the browser into a chromeless desktop/mobile app window with pass-through network-only Service Worker.
                </div>
                <div style="font-size:10.5px;color:var(--text-muted);margin-top:5px;font-family:var(--font-mono);">
                  Active Bundle: ${escapeHtml(state.activeBundleId)} (piggybacked zero-poll freshness check)
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <button type="button" class="subbar-util-btn" style="height:34px;padding:0 13px;font-size:11px;" data-act="hard-refresh-app" title="Clear PWA caches and reload the latest server bundle (mobile equivalent to Ctrl+Shift+R)">
                  ${ICONS.refresh}
                  <span>REFRESH APP</span>
                </button>
                <button class="neon-cta-btn" id="confirm-pwa-btn" style="height:34px;padding:0 14px;">
                  ${ICONS.download}
                  <span>${state.deferredPrompt ? 'INSTALL APP NOW' : 'INSTALL APP'}</span>
                </button>
              </div>
            </div>

            <div class="settings-group-card">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                <div>
                  <div class="settings-group-title">SERVER IDENTITY &amp; MULTI-SERVER SWITCHER</div>
                  <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">
                    Customize this machine's badge/Home-Screen icon monogram so phone apps are unmistakable, and switch between AIM-Connect servers in 1 tap.
                  </div>
                </div>
                ${state.nodeIdentityToast ? `<span class="e2ee-status-chip">${escapeHtml(state.nodeIdentityToast)}</span>` : ''}
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;">
                ${state.servers
                  .map((srv) => {
                    const isCurr = srv.id === state.activeServerId;
                    return `
                      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 11px;border-radius:9px;background:${isCurr ? 'rgba(var(--accent-rgb),0.08)' : 'var(--bg-input)'};border:${isCurr ? `1px solid ${srv.color}` : '1px solid var(--border-hairline)'};">
                        <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                          <span style="width:9px;height:9px;border-radius:50%;background:${srv.color};box-shadow:0 0 8px ${srv.color};flex-shrink:0;"></span>
                          <div>
                            <div style="font-size:12px;font-weight:700;font-family:var(--font-mono);">
                              ${escapeHtml(srv.label)} <span style="color:var(--text-muted);font-weight:500;">[${escapeHtml(srv.monogram)}]</span>
                              ${isCurr ? '<span style="color:var(--accent);font-size:10px;">· ACTIVE SERVER</span>' : ''}
                            </div>
                            <div style="font-size:10.5px;color:var(--text-muted);font-family:var(--font-mono);">${escapeHtml(srv.url)}</div>
                          </div>
                        </div>
                        ${
                          !isCurr
                            ? `
                          <div style="display:flex;gap:6px;align-items:center;">
                            <button type="button" class="neon-cta-btn" style="height:28px;padding:0 10px;font-size:10.5px;" data-logout-switch-srv="${srv.id}">
                              ${ICONS.externalLink} <span>LOGOUT &amp; SWITCH</span>
                            </button>
                            ${state.servers.length > 1 ? `<button type="button" class="ghost-btn" style="height:28px;padding:0 7px;" data-del-srv="${srv.id}" title="Remove server">${ICONS.trash}</button>` : ''}
                          </div>
                        `
                            : ''
                        }
                      </div>
                    `;
                  })
                  .join('')}
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding-top:4px;border-top:1px solid var(--border-hairline);">
                <input id="peer-srv-label-inp" class="ld-text-input" style="flex:1 1 120px;height:32px;" placeholder="Peer Label (e.g. GPU Server)" />
                <input id="peer-srv-url-inp" class="ld-text-input" style="flex:2 1 190px;height:32px;" placeholder="https://gpu.example.com" />
                <button type="button" class="subbar-util-btn active" style="height:32px;padding:0 11px;" data-act="settings-add-srv">
                  ${ICONS.plus} <span>ADD SERVER</span>
                </button>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px;padding-top:8px;border-top:1px solid var(--border-hairline);">
                <div style="font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);">
                  THIS SERVER'S BADGE &amp; PHONE HOME-SCREEN ICON MONOGRAM
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                  <input id="curr-srv-label-inp" class="ld-text-input" style="flex:2 1 150px;height:32px;" value="${escapeHtml(getActiveShowcaseServer().label)}" />
                  <input id="curr-srv-mono-inp" class="ld-text-input" style="flex:0 1 92px;height:32px;font-family:var(--font-mono);text-transform:uppercase;" maxlength="4" value="${escapeHtml(getActiveShowcaseServer().monogram)}" />
                  <div style="display:inline-flex;gap:4px;align-items:center;">
                    ${['#00FFA3', '#38BDF8', '#F59E0B', '#A855F7', '#F43F5E', '#FF5722']
                      .map(
                        (hex) => `
                      <button type="button" data-srv-color="${hex}" style="width:22px;height:22px;border-radius:6px;background:${hex};border:${getActiveShowcaseServer().color.toUpperCase() === hex ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)'};cursor:pointer;"></button>
                    `
                      )
                      .join('')}
                  </div>
                  <button type="button" class="subbar-util-btn" style="height:32px;padding:0 12px;" data-act="save-node-identity">
                    <span>SAVE SERVER IDENTITY</span>
                  </button>
                </div>
              </div>
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

            <div class="settings-group-card">
              <div class="settings-group-title">WORKSPACE &amp; EDITOR (FILES TREE, STAGE VIEW &amp; SPLIT PRESETS)</div>
              <div style="font-size:11.5px;color:var(--text-secondary);">
                Keep Left for classic Windows Explorer muscle memory, or flip the File Tree to the Right outer edge so Chat View and Code sit directly side-by-side in Split Screen.
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:6px;border-top:1px solid var(--border-hairline);flex-wrap:wrap;">
                <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);">FILE EXPLORER TREE SIDE</span>
                <div style="display:flex;gap:6px;">
                  <button type="button" class="subbar-util-btn ${state.filesTreeSide === 'left' ? 'active' : ''}" data-tree-side="left">${ICONS.sidebar} <span>LEFT (WINDOWS DEFAULT)</span></button>
                  <button type="button" class="subbar-util-btn ${state.filesTreeSide === 'right' ? 'active' : ''}" data-tree-side="right">${ICONS.panelRight} <span>RIGHT (OUTER EDGE)</span></button>
                </div>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:6px;border-top:1px solid var(--border-hairline);flex-wrap:wrap;">
                <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);">DEFAULT AGENT SESSION STAGE</span>
                <div style="display:flex;gap:6px;">
                  <button type="button" class="subbar-util-btn ${state.agentStageMode === 'chat' ? 'active' : ''}" data-stage-mode="chat">${ICONS.message} <span>CHAT VIEW (MARKDOWN)</span></button>
                  <button type="button" class="subbar-util-btn ${state.agentStageMode === 'pty' ? 'active' : ''}" data-stage-mode="pty">${ICONS.terminal} <span>RAW TERMINAL (XTERM)</span></button>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-top:6px;border-top:1px solid var(--border-hairline);">
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-secondary);margin-bottom:5px;">
                    <span>Editor &amp; Preview Font Size</span>
                    <span class="mono-kbd">${state.editorFontSize}px</span>
                  </div>
                  <input type="range" min="11" max="20" step="1" value="${state.editorFontSize}" class="ld-range" id="editor-fontsize-range" />
                </div>
                <div>
                  <div style="font-size:11px;color:var(--text-secondary);margin-bottom:5px;">
                    Split-Pane Width Preset (${Math.round(100 - state.splitPct)}/${Math.round(state.splitPct)})
                  </div>
                  <div style="display:flex;gap:5px;flex-wrap:wrap;">
                    ${[
                      [48, '50 / 50'],
                      [38, '60 / 40 TERM'],
                      [58, '40 / 60 PANE'],
                    ]
                      .map(
                        ([pctVal, lbl]) =>
                          `<button type="button" class="subbar-util-btn ${Math.abs(state.splitPct - pctVal) <= 3 ? 'active' : ''}" data-split-preset="${pctVal}">${lbl}</button>`
                      )
                      .join('')}
                  </div>
                </div>
              </div>
              <label class="setting-check-row">
                <div>
                  <div style="font-weight:600;">Project Docs Single-Tab Website Reader (1-TAB)</div>
                  <div style="font-size:11px;color:var(--text-muted);">Navigate README, HANDOFF, AGENTS &amp; memory-wiki in place inside one reusable tab with Back/Forward history</div>
                </div>
                <input type="checkbox" data-bool-set="docsSingleTabMode" ${state.docsSingleTabMode ? 'checked' : ''} />
              </label>
              <label class="setting-check-row">
                <div>
                  <div style="font-weight:600;">Auto-Scroll Session Stream to Latest Reply (Optional)</div>
                  <div style="font-size:11px;color:var(--text-muted);">OFF by default so tall replies never yank your reading position; pair with the floating ↓ Hop-to-Bottom button</div>
                </div>
                <input type="checkbox" data-bool-set="sessionAutoScroll" ${state.sessionAutoScroll ? 'checked' : ''} />
              </label>
            </div>
          `
              : state.settingsTab === 'tmux'
              ? `
            ${
              state.tmuxSettingsToast
                ? `<div style="padding:8px 12px;border-radius:8px;background:rgba(var(--accent-rgb),0.1);border:1px solid var(--accent);font-family:var(--font-mono);font-size:11.5px;color:var(--accent);">${escapeHtml(state.tmuxSettingsToast)}</div>`
                : ''
            }
            <div class="settings-group-card">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                <div class="settings-group-title">1. DEFAULT AGENT HARNESS, AUTO-RESUME (-C) &amp; PERMISSIONS</div>
                <button type="button" class="subbar-util-btn" data-act="sync-tmux-conf">
                  ${ICONS.refresh} <span>SYNC TO ~/.TMUX.CONF</span>
                </button>
              </div>
              <div style="font-size:11.5px;color:var(--text-secondary);">
                Controls which CLI agent launches when opening a repository or invoking Fast Resume, whether it reopens your last folder conversation (<code>-c</code>), and whether Antigravity bypasses tool approval prompts.
              </div>
              <div>
                <div style="font-size:11px;color:var(--text-secondary);margin-bottom:5px;">Default Spawn / Fast-Resume CLI</div>
                <select class="ld-select" id="set-default-agent">
                  <option value="agy" ${state.defaultAgent === 'agy' ? 'selected' : ''}>Antigravity (agy)</option>
                  <option value="grok" ${state.defaultAgent === 'grok' ? 'selected' : ''}>Grok CLI (grok)</option>
                  <option value="opencode" ${state.defaultAgent === 'opencode' ? 'selected' : ''}>OpenCode (opencode)</option>
                  <option value="codex" ${state.defaultAgent === 'codex' ? 'selected' : ''}>Codex CLI (codex)</option>
                  <option value="shell" ${state.defaultAgent === 'shell' ? 'selected' : ''}>Bash Shell Only (No Auto-Agent)</option>
                </select>
              </div>
              <label class="setting-check-row">
                <div>
                  <div style="font-weight:600;">Auto-Resume Previous Folder Session (-c)</div>
                  <div style="font-size:11px;color:var(--text-muted);">Turn OFF when you want newly launched or restored sessions to start a blank conversation</div>
                </div>
                <input type="checkbox" data-bool-set="autoResumeC" ${state.autoResumeC ? 'checked' : ''} />
              </label>
              <label class="setting-check-row">
                <div>
                  <div style="font-weight:600;">Autonomous Skip-Permissions Mode (--dangerously-skip-permissions)</div>
                  <div style="font-size:11px;color:var(--text-muted);">Appends <code>--dangerously-skip-permissions</code> when launching <code>agy</code>; turn OFF on untrusted repos</div>
                </div>
                <input type="checkbox" data-bool-set="skipPermissions" ${state.skipPermissions ? 'checked' : ''} />
              </label>
            </div>

            <div class="settings-group-card">
              <div class="settings-group-title">2. COLD-BOOT AUTO-RESTORE (TMUX-RESURRECT ON REBOOT)</div>
              <label class="setting-check-row">
                <div>
                  <div style="font-weight:600;">Auto-Restore Saved Tmux Fleet on OS / WSL Reboot</div>
                  <div style="font-size:11px;color:var(--text-muted);">When ON, <code>boot-restore.sh</code> reloads your saved snapshot and resumes all agents automatically. Turn OFF for a clean boot that starts only AIM-Connect (<code>:8000</code> + tunnel) without relaunching heavy agents.</div>
                </div>
                <input type="checkbox" data-bool-set="autoRestoreOnBoot" ${state.autoRestoreOnBoot ? 'checked' : ''} />
              </label>
            </div>

            <div class="settings-group-card">
              <div class="settings-group-title">3. HEADLESS WSL2 KEEPALIVE &amp; LINUX SYSTEMD BOOT UNIT</div>
              <div style="font-size:11.5px;color:var(--text-secondary);">
                Keep WSL2 and <code>tmux</code> awake with zero open Windows Terminal windows—or revert 100% back to default Windows idle shutdown in 1 click or via CLI.
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;border-radius:9px;background:${state.wslAlwaysOnEnabled ? 'rgba(var(--accent-rgb),0.07)' : 'var(--bg-input)'};border:${state.wslAlwaysOnEnabled ? '1px solid rgba(var(--accent-rgb),0.35)' : '1px solid var(--border-hairline)'};">
                <div>
                  <div style="font-size:12px;font-weight:700;">WSL2 Always-On Mode (Survive Closing Windows Terminal)</div>
                  <div style="font-size:10.5px;color:var(--text-muted);font-family:var(--font-mono);margin-top:2px;">
                    Mode: ${state.wslAlwaysOnEnabled ? 'ENABLED ✓' : 'OFF (Windows Default)'} · Startup VBS: ${state.wslStartupVbsInstalled ? 'INSTALLED ✓' : 'OFF'} · .wslconfig vmIdleTimeout=-1: ${state.wslIdleConfigured ? 'SET ✓' : 'OFF'}
                  </div>
                </div>
                <button type="button" class="${state.wslAlwaysOnEnabled ? 'subbar-util-btn active' : 'neon-cta-btn'}" style="height:30px;padding:0 11px;font-size:10.5px;" data-act="toggle-wsl-always-on">
                  ${state.wslAlwaysOnEnabled ? 'TURN OFF & REVERT ALWAYS-ON' : 'ENABLE WSL ALWAYS-ON'}
                </button>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding-top:4px;">
                <div>
                  <div style="font-size:12px;font-weight:600;">Linux Cold-Boot Recovery Unit (aim-connect-boot.service)</div>
                  <div style="font-size:10.5px;color:var(--text-muted);font-family:var(--font-mono);">Status: ${state.bootUnitInstalled ? 'INSTALLED ✓' : 'NOT INSTALLED'}</div>
                </div>
                <button type="button" class="subbar-util-btn" data-act="toggle-boot-unit">
                  ${state.bootUnitInstalled ? 'DISABLE BOOT UNIT' : 'ENABLE BOOT UNIT'}
                </button>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding-top:6px;border-top:1px solid var(--border-hairline);">
                <div>
                  <div style="font-size:12px;font-weight:600;">Background Keepalive Handle (Temporary Battery Pause)</div>
                  <div style="font-size:10.5px;color:var(--text-muted);font-family:var(--font-mono);">Handle: ${state.wslKeepaliveRunning ? 'ACTIVE ✓' : 'PAUSED'} · .wslconfig vmIdleTimeout=-1: ${state.wslIdleConfigured ? 'SET ✓' : 'NOT SET'}</div>
                </div>
                <button type="button" class="subbar-util-btn" data-act="toggle-wsl-keepalive">
                  ${state.wslKeepaliveRunning ? 'PAUSE KEEPALIVE' : 'START KEEPALIVE'}
                </button>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding-top:6px;border-top:1px solid var(--border-hairline);font-size:10.5px;font-family:var(--font-mono);color:var(--text-muted);">
                <span>CLI Toggle: <code>./scripts/wsl-keepalive.sh on</code> · Revert: <code>./scripts/wsl-keepalive.sh off</code></span>
                <button type="button" class="subbar-util-btn" data-act="copy-wsl-off-cmd"><span>COPY OFF CMD</span></button>
              </div>
            </div>

            <div class="settings-group-card">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                <div class="settings-group-title">4. EMPTY-SAVE GUARDRAIL &amp; SIDEBAR WORKSPACE BAR</div>
                <div style="display:flex;gap:6px;">
                  <button type="button" class="subbar-util-btn" data-act="save-tmux-state">${ICONS.upload} <span>SAVE NOW</span></button>
                  <button type="button" class="subbar-util-btn" data-act="restore-tmux-state">${ICONS.refresh} <span>RESTORE -C</span></button>
                </div>
              </div>
              <div style="font-size:11px;font-family:var(--font-mono);color:var(--text-muted);">
                tmux-resurrect: INSTALLED · Saved Backup: ${state.savedSnapshotCount} sessions · Active: ${state.sessions.length}
              </div>
              <label class="setting-check-row">
                <div>
                  <div style="font-weight:600;">Empty-Save Guardrail Confirmation Prompt</div>
                  <div style="font-size:11px;color:var(--text-muted);">Warn before overwriting a multi-session backup when active session count is 1 or drops by 50%+</div>
                </div>
                <input type="checkbox" data-bool-set="emptySaveGuardrail" ${state.emptySaveGuardrail ? 'checked' : ''} />
              </label>
              <label class="setting-check-row">
                <div>
                  <div style="font-weight:600;">Show SAVE STATE / RESTORE -C Footer in Fleet Sidebar</div>
                  <div style="font-size:11px;color:var(--text-muted);">Turn OFF on compact mobile screens to prevent accidental taps (Save/Restore stay in Cmd+K &amp; Settings)</div>
                </div>
                <input type="checkbox" data-bool-set="showSidebarResurrectBar" ${state.showSidebarResurrectBar ? 'checked' : ''} />
              </label>
            </div>

            <div class="settings-group-card">
              <div class="settings-group-title">5. GIT REPO LAUNCHER SCAN FOLDERS (~/.aim_dashboard.json)</div>
              <div style="font-size:11.5px;color:var(--text-secondary);">
                Your home folder (<code>~</code> up to 2 levels deep) is scanned automatically. Add extra parent folders (one path per line)—shared directly with <code>aim-dash</code>.
              </div>
              <textarea id="repo-scan-paths-inp" class="ld-text-input" rows="3" style="font-family:var(--font-mono);font-size:11.5px;resize:vertical;">${escapeHtml(state.repoScanPaths)}</textarea>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <button type="button" class="fav-chip" data-act="preview-guardrail">TEST EMPTY-SAVE GUARDRAIL</button>
                <button type="button" class="neon-cta-btn" style="height:32px;" data-act="save-scan-paths">${ICONS.folder} <span>SAVE SCAN FOLDERS</span></button>
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
          <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" class="subbar-util-btn" style="height:34px;padding:0 12px;border-color:rgba(239,68,68,0.45);color:#f87171;" data-act="lock-session">
              ${ICONS.lock} <span>LOCK / SWITCH SERVER</span>
            </button>
            <button class="neon-cta-btn" data-act="close-modal" style="height:34px;padding:0 18px;">DONE</button>
          </div>
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

function showShowcaseToast(msg) {
  state.workspaceToast = msg || '';
  render();
  if (msg) {
    setTimeout(() => {
      if (state.workspaceToast === msg) {
        state.workspaceToast = '';
        render();
      }
    }, 3200);
  }
}

function triggerMockSaveWorkspace(force = false) {
  const activeCnt = state.sessions.length;
  const savedCnt = state.savedSnapshotCount || 14;
  const lowState = activeCnt <= 1 || (savedCnt >= 2 && activeCnt * 2 <= savedCnt);
  if (state.emptySaveGuardrail && lowState && !force) {
    state.modal = 'resurrect-guard';
    render();
    return;
  }
  state.savedSnapshotCount = activeCnt;
  state.modal = null;
  showShowcaseToast(`Saving ${activeCnt} tmux session(s) via tmux-resurrect...`);
}

function renderCommandPalette() {
  const q = state.cmdkQuery.trim().toLowerCase();
  const entries = [
    ...state.servers
      .filter((srv) => srv.id !== state.activeServerId)
      .map((srv) => ({
        cat: 'SESSIONS',
        label: `Switch AIM-Connect Server -> ${srv.label} (${srv.host})`,
        badge: 'SWITCH NODE',
        run: () => {
          state.activeServerId = srv.id;
          state.isLocked = true;
          showShowcaseToast(`Logged out & switched 3FA Gate -> ${srv.label} (${srv.url})`);
        },
      })),
    ...state.sessions.map((s) => ({
      cat: 'SESSIONS',
      label: `Switch Node // ${s.name}`,
      badge: `${s.vessel} · ${s.pct}%`,
      run: () => {
        state.activeSession = s.name;
        state.unreadSessions = state.unreadSessions.filter((u) => u !== s.name);
      },
    })),
    { cat: 'SESSIONS', label: 'Project: Open Local Git Repo... (Active & Offline)', badge: 'REPO · -C', run: () => { state.spawnTab = 'repo'; state.modal = 'spawn-sess'; return true; } },
    { cat: 'SESSIONS', label: '+ Spawn New Isolated Tmux Session...', badge: 'TMUX', run: () => { state.spawnTab = 'custom'; state.modal = 'spawn-sess'; return true; } },
    ...(state.activeSession ? [{ cat: 'SESSIONS', label: `Agent: Fast Resume (-c) in ${state.activeSession}`, badge: 'RESUME -C', run: () => { showShowcaseToast(`Resumed ${state.defaultAgent === 'shell' ? 'agy' : state.defaultAgent} -c in ${state.activeSession}`); } }] : []),
    { cat: 'SESSIONS', label: 'Workspace: Save Tmux State (tmux-resurrect)', badge: 'SAVE STATE', run: () => { triggerMockSaveWorkspace(false); return state.modal === 'resurrect-guard'; } },
    { cat: 'SESSIONS', label: 'Workspace: Restore Tmux State (tmux-resurrect)', badge: 'RESTORE -C', run: () => { showShowcaseToast('Restoring saved tmux workspace & resuming agents (-c)...'); } },
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
    { cat: 'SETTINGS & SECURITY', label: 'Open Tmux, Fast-Resume (-c) & WSL Boot Settings', badge: 'TMUX & BOOT', run: () => { state.settingsTab = 'tmux'; state.modal = 'settings'; return true; } },
    { cat: 'SETTINGS & SECURITY', label: 'App: Hard Refresh & Reload Bundle (PWA Ctrl+Shift+R)', badge: 'REFRESH APP', run: () => { showShowcaseToast(`Cleared PWA cache & reloaded active bundle (${state.activeBundleId})`); } },
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

function isDarkInkHex(hex) {
  const c = String(hex || '').replace('#', '');
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 64;
}

function drawMarkupAnn(ctx, ann, baseW = 960) {
  if (!ctx || !ann) return;
  const scale = Math.max(0.85, baseW / 960);
  const strokeW = 3.4 * scale;
  const col = ann.color || '#FF3B5C';
  const dark = isDarkInkHex(col);
  const halo = dark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.72)';

  const drawArrowSeg = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (Math.hypot(dx, dy) < 4) return;
    const ang = Math.atan2(dy, dx);
    const hLen = 14 * scale;
    for (const [sc, boost] of [[halo, 3], [col, 0]]) {
      ctx.save();
      ctx.strokeStyle = sc;
      ctx.fillStyle = sc;
      ctx.lineWidth = strokeW + boost;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2 - Math.cos(ang) * hLen * 0.5, y2 - Math.sin(ang) * hLen * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - hLen * Math.cos(ang - Math.PI / 6.2), y2 - hLen * Math.sin(ang - Math.PI / 6.2));
      ctx.lineTo(x2 - hLen * Math.cos(ang + Math.PI / 6.2), y2 - hLen * Math.sin(ang + Math.PI / 6.2));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  };

  if (ann.type === 'pin') {
    const r = 14 * scale;
    if (typeof ann.x2 === 'number' && Math.hypot(ann.x2 - ann.x, ann.y2 - ann.y) > r + 8) {
      drawArrowSeg(ann.x, ann.y, ann.x2, ann.y2);
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(ann.x, ann.y, r, 0, Math.PI * 2);
    ctx.fillStyle = dark ? '#F8FAFC' : '#07090c';
    ctx.fill();
    ctx.lineWidth = 2.8 * scale;
    ctx.strokeStyle = col;
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.font = `800 ${Math.round(13 * scale)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(ann.num || 1), ann.x, ann.y + 0.5);
    ctx.restore();
  } else if (ann.type === 'arrow') {
    drawArrowSeg(ann.x1, ann.y1, ann.x2, ann.y2);
  } else if (ann.type === 'circle') {
    const cx = (ann.x1 + ann.x2) / 2;
    const cy = (ann.y1 + ann.y2) / 2;
    const rx = Math.max(4, Math.abs(ann.x2 - ann.x1) / 2);
    const ry = Math.max(4, Math.abs(ann.y2 - ann.y1) / 2);
    for (const [sc, boost] of [[halo, 3], [col, 0]]) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = sc;
      ctx.lineWidth = strokeW + boost;
      ctx.stroke();
      ctx.restore();
    }
  } else if (ann.type === 'rect') {
    const x = Math.min(ann.x1, ann.x2);
    const y = Math.min(ann.y1, ann.y2);
    const w = Math.max(4, Math.abs(ann.x2 - ann.x1));
    const h = Math.max(4, Math.abs(ann.y2 - ann.y1));
    for (const [sc, boost] of [[halo, 3], [col, 0]]) {
      ctx.save();
      ctx.strokeStyle = sc;
      ctx.lineWidth = strokeW + boost;
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }
  } else if (ann.type === 'pen' && Array.isArray(ann.points) && ann.points.length) {
    for (const [sc, boost] of [[halo, 2.8], [col, 0]]) {
      ctx.save();
      ctx.strokeStyle = sc;
      ctx.lineWidth = strokeW + boost;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(ann.points[0].x, ann.points[0].y);
      for (let i = 1; i < ann.points.length; i++) ctx.lineTo(ann.points[i].x, ann.points[i].y);
      if (ann.points.length === 1) ctx.lineTo(ann.points[0].x + 0.5, ann.points[0].y + 0.5);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function paintMarkupBaseScene(ctx, w, h, att, onImageReady) {
  ctx.fillStyle = '#050807';
  ctx.fillRect(0, 0, w, h);

  const imgSrc = att?.screenSrc || resolveScreenForUrl(att?.url);
  if (imgSrc) {
    let cached = MARKUP_IMAGE_CACHE.get(imgSrc);
    if (!cached) {
      cached = new Image();
      cached.onload = () => {
        if (typeof onImageReady === 'function') onImageReady();
      };
      cached.src = imgSrc;
      MARKUP_IMAGE_CACHE.set(imgSrc, cached);
    }
    if (cached.complete && cached.naturalWidth > 0) {
      ctx.drawImage(cached, 0, 0, w, h);
      return;
    }
  }

  ctx.fillStyle = '#0b1411';
  ctx.fillRect(0, 0, w, 46);
  ctx.fillStyle = '#00ffa3';
  ctx.font = 'bold 15px "JetBrains Mono", monospace';
  ctx.fillText(`CDP SNAPSHOT // ${att?.filename || 'screenshot.png'} (${att?.dims || '1280×713'})`, 24, 29);
}

function renderShotMarkupModal() {
  if (state.modal !== 'shot-markup' || !state.editingShot) return '';
  const list = state.stagedAttachments[state.editingShot.sessionKey] || [];
  const att = list.find((a) => a.id === state.editingShot.shotId);
  if (!att) return '';
  const nextPin =
    state.markupAnns.reduce((mx, a) => (a.type === 'pin' && a.num > mx ? a.num : mx), 0) + 1;

  return `
    <div class="modal-veil" data-act="close-modal" style="z-index:2300;padding-top:4vh;">
      <div class="ld-modal-card shot-markup-modal" onclick="event.stopPropagation()">
        <div class="shot-markup-header">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="color:var(--accent);display:inline-flex;">${ICONS.edit}</span>
            <span style="font-family:var(--font-mono);font-size:12px;font-weight:700;letter-spacing:0.08em;">
              VISUAL MARKUP STUDIO // ${escapeHtml(att.filename)}
            </span>
            <span class="mono-kbd" style="font-size:9.5px;">${escapeHtml(att.dims || '1440×900 PNG')}</span>
          </div>
          <button type="button" class="ghost-btn" data-act="close-modal">${ICONS.close}</button>
        </div>

        <div class="shot-markup-toolbar">
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
            ${MARKUP_TOOLS.map(
              (t) => `
              <button type="button" class="subbar-util-btn ${state.markupTool === t.id ? 'active' : ''}" data-mtool="${t.id}" title="${t.hint}">
                <span>${t.id === 'pin' ? `① PIN (#${nextPin})` : t.label}</span>
              </button>
            `
            ).join('')}
          </div>

          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
            ${MARKUP_COLORS.map(
              (c) => `
              <button
                type="button"
                class="fav-chip ${state.markupColor === c.hex ? 'active' : ''}"
                style="display:inline-flex;align-items:center;gap:5px;${state.markupColor === c.hex ? `border-color:${c.hex};` : ''}"
                data-mcol="${c.hex}"
                title="${c.label}"
              >
                <span style="width:10px;height:10px;border-radius:50%;background:${c.hex};border:1px solid rgba(255,255,255,0.5);"></span>
                <span>${c.short}</span>
              </button>
            `
            ).join('')}
          </div>

          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
            <button type="button" class="fav-chip" data-act="markup-undo" ${state.markupAnns.length === 0 ? 'disabled' : ''}>UNDO</button>
            <button type="button" class="fav-chip" data-act="markup-clear" ${state.markupAnns.length === 0 ? 'disabled' : ''}>CLEAR</button>
            <button type="button" class="subbar-util-btn" data-act="markup-download">${ICONS.downloadSm} <span>DOWNLOAD PNG</span></button>
            <button type="button" class="neon-cta-btn" style="height:28px;padding:0 12px;" data-act="markup-apply">${ICONS.check} <span>APPLY &amp; ATTACH</span></button>
          </div>
        </div>

        <div class="shot-markup-stage">
          <canvas id="shot-markup-canvas" class="shot-markup-canvas" width="920" height="512"></canvas>
        </div>

        <div class="shot-markup-footer">
          <span>6 Semantic &amp; Neutral Contrast-Halo Inks (#273/#276): Red=FIX · Emerald=KEEP · Cyan=INFO · Amber=MOVE · White/Black</span>
          <span>Annotations: ${state.markupAnns.length} · Ctrl+Z to Undo</span>
        </div>
      </div>
    </div>
  `;
}

function renderRawTermStage(sess, extraMsgs) {
  const turns = [
    ...(sess.priorTurns || []),
    { user: sess.userPrompt, tools: sess.tools, spoken: sess.spoken },
  ];
  const lines = [
    `\x1b[32m╭─ J.O.S.H.U.A. SOVEREIGN PTY // ${sess.name} (${sess.vessel} · ${sess.branch}) ─╮\x1b[0m`
      .replace(/\x1b\[[0-9;]*m/g, ''),
    ...turns.flatMap((t, idx) => [
      ``,
      `operator@sovereign-node:~/aim-connect$ # Turn ${idx + 1}`,
      `> ${t.user}`,
      ...(t.tools || []).map((tl) => `  • ${tl}`),
      `🔊 ${t.spoken}`,
    ]),
    ...extraMsgs.map((m) => `> ${typeof m === 'string' ? m : m.text || '[attachment]'}`),
    ``,
    `operator@sovereign-node:~/aim-connect$ █`,
  ];
  return `
    <div class="terminal-stage-pad">
      <pre class="terminal-container-mock" id="live-stream-scroll" style="font-size:${state.termFontSize}px;">${escapeHtml(lines.join('\n'))}</pre>
      <div class="tmux-f10-bar">
        <span>[0] 0:${escapeHtml(sess.vessel.toLowerCase())}*  1:zsh-  (${escapeHtml(sess.name)})</span>
        <span>F10 Menu · padding:0 FitAddon (#272 unclipped) · 255/255 pytest</span>
      </div>
    </div>
  `;
}

function render() {
  clearActiveScrambles();
  document.documentElement.setAttribute('data-theme', state.theme);
  const root = document.getElementById('proto-root');
  if (!root) return;

  const prevTabsLeft = document.querySelector('.copilot-tabs-row')?.scrollLeft || 0;
  const prevFavLeft = document.querySelector('.cp-fav-bar')?.scrollLeft || 0;
  const prevFleetTop = document.querySelector('.fleet-scroll-list')?.scrollTop || 0;
  const prevStreamTop = document.getElementById('live-stream-scroll')?.scrollTop || 0;
  const prevWebShotTop = document.querySelector('.real-shot-canvas')?.scrollTop || 0;
  const prevScrollCopyTop = document.getElementById('scrollcopy-pre')?.scrollTop || 0;

  const isHome = !state.activeSession;
  const sess = state.sessions.find((s) => s.name === state.activeSession) || state.sessions[0];

  const tabWaitByAgent = new Map();
  state.browserTabs.forEach((t) => {
    if (t.waitingForHuman && t.agentKey) tabWaitByAgent.set(t.agentKey, t.waitingForHuman);
  });

  const effectiveStatus = (s) => (tabWaitByAgent.has(s.name) ? 'WAITING' : s.status);

  const waiting = state.sessions.filter((s) => effectiveStatus(s) === 'WAITING');
  const thinkingList = state.sessions.filter((s) => s.isAgent !== false && effectiveStatus(s) === 'THINKING');
  const unreadList = state.sessions.filter(
    (s) => state.unreadSessions.includes(s.name) && effectiveStatus(s) !== 'THINKING'
  );

  const serverCount = state.sessions.filter((s) => s.isAgent === false).length;
  const recentCount = state.sessions.filter((s) => state.recentSessions.includes(s.name)).length;
  const highCtxCount = state.sessions.filter(
    (s) => s.isAgent !== false && (s.tier !== 'normal' || s.compacted > 0)
  ).length;

  let filtered = state.sessions.filter((s) => {
    const stNow = effectiveStatus(s);
    const isUnread = state.unreadSessions.includes(s.name) && stNow !== 'THINKING';
    if (state.filter === 'thinking' && (s.isAgent === false || stNow !== 'THINKING')) return false;
    if (state.filter === 'new' && !isUnread) return false;
    if (state.filter === 'servers' && s.isAgent !== false) return false;
    if (state.filter === 'recent' && !state.recentSessions.includes(s.name)) return false;
    if (state.filter === 'ctx' && (s.isAgent === false || (s.tier === 'normal' && !s.compacted))) return false;
    if (state.search && !`${s.name} ${s.branch} ${s.vessel}`.toLowerCase().includes(state.search.toLowerCase())) return false;
    return true;
  });

  // Widescreen-only Split View (>900px) — Mobile (<=900px or phone-mode) stays 100% Full View (#279, #280)
  const isWidescreen = state.device !== 'phone' && window.innerWidth > 900;
  const isFull = !isWidescreen || state.layoutMode === 'full';
  const showRight = state.activeTool === 'browser' || state.activeTool === 'files';
  const showCenter = !showRight || !isFull;
  const isSplit = showRight && !isFull;
  const rightType = state.activeTool;

  const bTab = state.browserTabs.find((t) => t.id === state.activeBrowserTab) || state.browserTabs[0];
  const waitingBrowserTab =
    (bTab?.waitingForHuman ? bTab : null) ||
    state.browserTabs.find((t) => Boolean(t.waitingForHuman)) ||
    null;
  const isStarred = state.browserFavorites.some((f) => f.url === bTab.url);
  const extraMsgs = state.sentMessages[sess.name] || [];

  const pinnedKeys = state.macros.filter((m) => m.pinned && m.kind === 'key');
  const pinnedCmds = state.macros.filter((m) => m.pinned && m.kind !== 'key');

  root.innerHTML = `
    <!-- Top Prototype Evaluation Strip -->
    <div class="lab-bar">
      <div class="lab-group">
        <span class="pulse-led"></span>
        <span style="color:#00ffa3;font-weight:700;letter-spacing:0.12em;">EMERALD MATRIX V4 // LIVE #260–#306 PARITY (290+ PYTEST)</span>
      </div>
      <div class="lab-group">
        <button class="lab-pill ${isHome && !state.isLocked ? 'active' : ''}" data-act="reset-home">HOMEPAGE</button>
        <button class="lab-pill" data-act="open-markup-demo" title="Open <canvas> Visual Markup Studio (#273/#276)">MARKUP STUDIO</button>
        <button class="lab-pill ${waitingBrowserTab ? 'active' : ''}" data-act="sim-2fa-gate" title="Trigger or inspect Human-in-the-Loop Browser 2FA Takeover (#275)">2FA GATE</button>
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
        <!-- Frosted Glass Header (Mobile De-Duplicated — #279, #280) -->
        <header class="ld-header">
          <div class="hdr-cluster">
            <button class="ghost-btn desktop-only ${state.showSidebar ? 'active' : ''}" data-act="toggle-sidebar" title="Toggle Fleet Telemetry Rail">
              ${ICONS.sidebar}
            </button>

            <div class="ld-brand" id="brand-logo-btn" data-act="reset-home" title="Return to Sovereign Homepage">
              <div class="ld-brand-box">${ICONS.aimMark}</div>
              <div class="ld-brand-word"><span id="scramble-brand-aim" style="color:var(--text-primary);">AIM</span><span id="scramble-brand-conn">CONNECT</span></div>
            </div>

            <button
              type="button"
              class="subbar-util-btn"
              style="height:24px;padding:0 8px;border-color:${getActiveShowcaseServer().color};color:var(--text-primary);"
              data-act="open-server-switcher"
              title="Connected to ${escapeHtml(getActiveShowcaseServer().label)} (${escapeHtml(getActiveShowcaseServer().url)}) — click to manage or switch AIM-Connect servers"
            >
              <span style="width:6px;height:6px;border-radius:50%;background:${getActiveShowcaseServer().color};box-shadow:0 0 6px ${getActiveShowcaseServer().color};"></span>
              <span>${escapeHtml(getActiveShowcaseServer().label)}</span>
            </button>

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
                ? `<button class="wait-alert-pill hide-halfscreen" data-pick-sess="${waiting[0].name}" title="Jump straight to session waiting for approval or 2FA">
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
                  state.activeTool === 'browser' && isWidescreen
                    ? `<span class="seg-expand-badge ${state.layoutMode === 'full' ? 'is-full' : ''}">${state.layoutMode === 'full' ? 'SPLIT' : 'FULL'}</span>`
                    : ''
                }
              </button>
              <button class="seg-item ${state.activeTool === 'files' ? 'active' : ''}" id="btn-tool-files" data-tool="files">
                ${ICONS.files}
                <span id="scramble-files">FILES</span>
                ${
                  state.activeTool === 'files' && isWidescreen
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
              id="btn-top-kb"
              class="ghost-btn ${state.showOnScreenKeyboard ? 'active' : ''}"
              data-act="toggle-os-kb"
              title="Toggle On-Screen Sovereign Keyboard (${state.showOnScreenKeyboard ? 'ON' : 'OFF'})"
            >
              ${ICONS.keyboard}
              <span id="scramble-kb" class="hide-halfscreen">${state.showOnScreenKeyboard ? 'KB ON' : 'KB OFF'}</span>
            </button>
            <button
              class="ghost-btn desktop-only ${state.modal === 'settings' ? 'active' : ''}"
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
                <div style="display:flex;gap:4px;">
                  <button class="ghost-btn" style="height:24px;padding:0 7px;" data-act="open-repo-launcher" title="Open local Git repository in tmux (with -c fast resume)">
                    ${ICONS.gitBranch} REPOS
                  </button>
                  <button class="ghost-btn" style="height:24px;padding:0 7px;" data-act="open-spawn-sess" title="Spawn New Isolated Tmux Session">
                    ${ICONS.plus} NEW
                  </button>
                  <button class="ghost-btn mobile-only-close" style="height:24px;padding:0 6px;" data-act="toggle-sidebar" title="Close Fleet Sidebar">
                    ${ICONS.close}
                  </button>
                </div>
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
                  <button class="filter-chip ${state.filter === 'thinking' ? 'active' : ''} ${thinkingList.length ? 'has-thinking' : ''}" data-flt="thinking" title="Actively working / thinking AI agent sessions">THINKING (${thinkingList.length})</button>
                  <button class="filter-chip ${state.filter === 'new' ? 'active' : ''} ${unreadList.length ? 'has-new' : ''}" data-flt="new" title="Agents that finished a turn while in the background">NEW (${unreadList.length})</button>
                  <button class="filter-chip ${state.filter === 'recent' ? 'active' : ''}" data-flt="recent" title="Sessions you opened most recently, newest first (shared across your devices)">RECENT (${recentCount})</button>
                  <button class="filter-chip ${state.filter === 'servers' ? 'active' : ''}" data-flt="servers" title="Non-Agent Split-Pane Tmux Server &amp; Worker Sessions">TMUX (${serverCount})</button>
                  <button class="filter-chip ${state.filter === 'ctx' ? 'active' : ''}" data-flt="ctx">CTX ≥30% (${highCtxCount})</button>
                </div>
              </div>

              <div class="fleet-scroll-list">
                ${filtered
                  .map((s) => {
                    const isRawTmux = s.isAgent === false;
                    const stNow = effectiveStatus(s);
                    const has2faHold = tabWaitByAgent.has(s.name);
                    const chipKind = has2faHold ? 'gate' : s.taskKind || 'idle';
                    const chipLabel = has2faHold ? 'BROWSER 2FA / LOGIN' : s.taskLabel || stNow;
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
                            <span class="state-indicator ${stNow.toLowerCase()}"></span>
                            <span class="project-pill" style="--agent-color:${s.color.hex};--agent-rgb:${s.color.rgb};">${s.name}</span>
                            ${state.unreadSessions.includes(s.name) && stNow !== 'THINKING' ? '<span class="card-new-badge">NEW</span>' : ''}
                          </div>
                          <div style="display:flex;align-items:center;gap:4px;">
                            ${
                              s.browserTabId
                                ? `<span class="vessel-pill" style="color:var(--accent);border-color:rgba(var(--accent-rgb),0.4);display:inline-flex;align-items:center;" title="Leased Co-Pilot Browser Tab Open"><span style="width:11px;height:11px;display:inline-flex;">${ICONS.globe}</span></span>`
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
                          <span class="task-mode-chip ${chipKind}">${escapeHtml(chipLabel)}</span>
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

                        <div class="card-preview">${escapeHtml(has2faHold ? tabWaitByAgent.get(s.name).reason : s.preview)}</div>

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
              ${
                state.showSidebarResurrectBar
                  ? `
                <div style="padding:7px 10px;border-top:1px solid var(--border-hairline);display:flex;gap:6px;flex-shrink:0;">
                  <button type="button" class="ghost-btn" style="flex:1;justify-content:center;height:26px;font-size:10.5px;" data-act="save-tmux-state" title="Snapshot all tmux sessions via tmux-resurrect (Protected by Empty-Save Guardrail)">
                    ${ICONS.upload} <span>SAVE STATE</span>
                  </button>
                  <button type="button" class="ghost-btn" style="flex:1;justify-content:center;height:26px;font-size:10.5px;" data-act="restore-tmux-state" title="Restore saved tmux sessions &amp; resume agents (-c) via tmux-resurrect">
                    ${ICONS.refresh} <span>RESTORE -C</span>
                  </button>
                </div>
              `
                  : ''
              }
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
              <!-- Workspace Utility Subbar ([CHAT VIEW | RAW TERM], Auto-Scroll ↓, Paste, Scroll/Copy, Grab, Forensics, History) -->
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
                  ${
                    sess.isAgent === false
                      ? `
                    <button type="button" class="subbar-util-btn ${state.tmuxGridMode ? 'active' : ''}" data-act="toggle-tmux-grid" title="Toggle Simultaneous Multi-Window Tmux Split Grid vs Interactive Raw Term">
                      ${state.tmuxGridMode ? ICONS.grid : ICONS.terminal}
                      <span>${state.tmuxGridMode ? 'SPLIT GRID' : 'RAW TERM'}</span>
                    </button>
                  `
                      : `
                    <button type="button" class="subbar-util-btn ${state.agentStageMode === 'chat' ? 'active' : ''}" data-act="toggle-stage-mode" title="Toggle Live Structured GFM Markdown Chat Bubbles vs Raw Interactive Xterm">
                      ${state.agentStageMode === 'chat' ? ICONS.message : ICONS.terminal}
                      <span>${state.agentStageMode === 'chat' ? 'CHAT VIEW' : 'RAW TERM'}</span>
                    </button>
                    <button
                      type="button"
                      class="subbar-util-btn ${state.sessionAutoScroll ? 'active' : ''}"
                      style="padding:0 6px;"
                      data-act="toggle-autoscroll"
                      title="Auto-Scroll to Latest Reply: ${state.sessionAutoScroll ? 'ON (click to turn OFF)' : 'OFF (parked reading mode — click to follow new replies)'}"
                    >
                      ${ICONS.arrowDownToLine}
                    </button>
                  `
                  }
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

              <div style="position:relative;flex:1;min-height:0;display:flex;flex-direction:column;">
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
                    : state.agentStageMode === 'pty'
                    ? renderRawTermStage(sess, extraMsgs)
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
                    { user: sess.userPrompt, tools: sess.tools, body: sess.body, spoken: sess.spoken },
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
                        ${
                          turn.body
                            ? `<div style="font-size:${state.termFontSize}px;">${renderMarkdownHtml(turn.body)}</div>`
                            : ''
                        }
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
                      const msgAgentReply = typeof m === 'object' ? m.agentReply : '';
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
                            <button type="button" class="shot-link-btn" data-md-file="${att.path || 'docs/screenshots/emerald-matrix-arch.svg'}">${escapeHtml(att.filename)}</button>
                            ${att.annotated ? `<span class="mono-kbd" style="font-size:8.5px;color:var(--accent);">MARKED</span>` : ''}
                            <span>· ${escapeHtml(att.dims)}</span>
                          </div>
                        `
                          )
                          .join('')}
                      </div>
                    </div>
                    ${
                      msgAgentReply
                        ? `
                      <div class="transmission-block">
                        <div class="transmission-header" style="color:var(--accent);">
                          <span style="width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent);"></span>
                          <span>[J.O.S.H.U.A. // LIVE REPLY]</span>
                          <div class="transmission-rule"></div>
                        </div>
                        <div class="transmission-body-agent">
                          <div class="spoken-brief-card" style="font-size:${state.termFontSize}px;">
                            <span style="color:var(--accent-secondary);margin-top:2px;">${ICONS.volume}</span>
                            <div>${escapeHtml(msgAgentReply)}</div>
                          </div>
                        </div>
                      </div>
                    `
                        : ''
                    }
                  `;
                    })
                    .join('')}
                </div>
                `
                }

                ${
                  !state.showHistory && !state.showScrollCopy && sess.isAgent !== false
                    ? `
                  <button
                    type="button"
                    id="hop-bottom-fab"
                    class="hop-bottom-fab ${state.chatUnseenBelow ? 'has-unseen' : ''}"
                    style="${state.chatScrolledUp ? '' : 'display:none;'}"
                    data-act="hop-to-bottom"
                    title="${state.chatUnseenBelow ? 'New reply below — hop to bottom' : 'Hop to bottom of session'}"
                  >
                    ${ICONS.arrowDown}
                    ${state.chatUnseenBelow ? '<span>NEW</span>' : ''}
                  </button>
                `
                    : ''
                }
              </div>

              ${
                sess.isAgent !== false || state.showHistory || state.showScrollCopy
                  ? `
              <!-- LeadDeeds Signature Composer + Docked Keybar (#263) + Visual Markup Chips (#273/#276) -->
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
                      <span>MACRO STUDIO // CREATE, EDIT &amp; SYNC (${state.macros.length})</span>
                    </button>
                  </div>
                `
                    : ''
                }

                ${
                  state.showTouchKeys && !state.showOnScreenKeyboard
                    ? `
                  <div class="composer-keybar" title="Right-click any macro chip to unpin">
                    ${state.macros
                      .filter((m) => m.pinned)
                      .map(
                        (m) => `
                      <button type="button" class="fav-chip" data-macro="${escapeHtml(m.cmd)}" data-rclick-unpin="${m.id}">
                        ${m.isServer ? '☁ ' : ''}${escapeHtml(m.label)}
                      </button>
                    `
                      )
                      .join('')}
                    <button type="button" class="fav-chip" data-act="open-macro-mgr" title="Open Macro Studio">${ICONS.settings}</button>
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
                      <span class="staged-shot-chip" title="Click filename to preview in Files · Click pencil to annotate in Visual Markup Studio">
                        <span style="color:var(--accent);display:inline-flex;">${ICONS.camera}</span>
                        <button type="button" class="shot-link-btn" data-md-file="${att.path || 'docs/screenshots/emerald-matrix-arch.svg'}">${escapeHtml(att.filename)}</button>
                        ${att.annotated ? `<span class="mono-kbd" style="font-size:8.5px;color:var(--accent);">MARKED</span>` : ''}
                        <span style="color:var(--text-muted);">${escapeHtml(att.dims)}</span>
                        <button type="button" class="shot-chip-icon-btn" data-edit-shot="${sess.name}|${att.id}" title="Open Visual Markup Studio (drop ① ② ③ pins, circles, or arrows)">${ICONS.edit}</button>
                        <button type="button" class="shot-chip-icon-btn" data-dl-shot="${sess.name}|${att.id}" title="Download screenshot PNG">${ICONS.downloadSm}</button>
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
                  <div class="ld-input-box" id="ld-input-box">
                    <div
                      class="composer-resize-handle"
                      id="composer-resize-handle"
                      role="separator"
                      aria-orientation="horizontal"
                      aria-label="Drag top-right corner to resize prompt box"
                      title="Drag up/down to resize · Double-click to reset"
                    ></div>
                    <textarea
                      id="node-input"
                      rows="1"
                      class="ld-prompt-field"
                      placeholder="${
                        state.micEnabled
                          ? `Listening on mic — speak directive for ${sess.name}...`
                          : `Transmit directive to ${sess.name}... (Enter send · Shift+Enter newline · Ctrl+V image)`
                      }"
                      autocomplete="off"
                    >${escapeHtml(state.composerDraft || '')}</textarea>
                    <div
                      class="composer-actions-group"
                      id="composer-actions-group"
                      data-actions-layout="${state.composerActionsLayout || 'row'}"
                    >
                      <button
                        type="button"
                        class="composer-icon-btn composer-mic-btn ${state.micEnabled ? 'mic-on' : ''}"
                        data-act="toggle-mic"
                        title="${state.micEnabled ? 'Voice Dictation ACTIVE (Click to Stop Mic)' : 'Voice Dictation OFF (Click to Start Mic)'}"
                      >
                        ${state.micEnabled ? ICONS.mic : ICONS.micOff}
                      </button>
                      <button
                        type="button"
                        class="composer-icon-btn composer-speak-btn ${state.speakEnabled ? 'speak-on' : ''}"
                        data-act="toggle-speak"
                        title="${state.speakEnabled ? 'Voice Spoken Summary ON (Click to Mute)' : 'Voice Spoken Summary OFF (Click to Enable & Speak)'}"
                      >
                        ${state.speakEnabled ? ICONS.volume : ICONS.volumeOff}
                      </button>
                      <button type="submit" class="ld-send-btn" title="Send Directive (Enter)">
                        ${ICONS.send}
                      </button>
                    </div>
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
                  <div class="copilot-top-left">
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
                      title="Add ${state.shotFullPage ? 'Full-Page' : 'Visible Pane'} Screenshot to Conversation (${escapeHtml(sess && sess.isAgent !== false && state.activeSession ? sess.name : bTab.agentKey || 'aim-connect')})"
                    >
                      ${state.shotFlash ? ICONS.check : ICONS.cameraPlus}
                    </button>
                    <button
                      type="button"
                      class="fav-chip ${state.shotFullPage ? 'active' : ''}"
                      style="height:24px;padding:0 6px;font-size:9px;"
                      data-act="toggle-shot-scope"
                      title="Toggle Screenshot Scope: Visible Split-Pane Viewport vs Full Scrolling Page"
                    >
                      ${state.shotFullPage ? 'FULL' : 'PANE'}
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
                    <span class="desktop-only desktop-split-only" style="opacity:0.22;margin:0 1px;">|</span>
                    <button
                      class="pane-full-upgrade-btn desktop-only desktop-split-only ${isFull ? 'is-full' : ''}"
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
                      DIR: ~/Downloads/aim-browser (--headless=new CDP)
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
                      const isWaitingHuman = Boolean(t.waitingForHuman);
                      const st = t.color ? `--agent-color:${t.color.hex};--agent-rgb:${t.color.rgb};` : '';
                      return `
                        <div
                          class="cp-tab ${active ? 'active' : ''} ${t.color ? 'agent-tab' : ''} ${isWaitingHuman ? 'waiting-human-tab' : ''}"
                          style="${st}"
                          data-btab="${t.id}"
                        >
                          ${
                            isWaitingHuman
                              ? `<span title="Waiting for Operator sign-in / 2FA">✋</span>`
                              : t.color
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

                ${
                  waitingBrowserTab
                    ? (() => {
                        const takeoverActive =
                          waitingBrowserTab.id === state.activeBrowserTab &&
                          state.controlMode &&
                          state.showBrowser2faBar;
                        return `
                  <div class="browser-human-gate-banner" role="alert">
                    <div style="display:flex;align-items:center;gap:7px;min-width:0;flex:1 1 auto;">
                      <span>✋</span>
                      <span style="font-weight:700;letter-spacing:0.05em;">${escapeHtml((waitingBrowserTab.agentKey || 'AGENT').toUpperCase())} NEEDS LOGIN / 2FA:</span>
                      <span style="color:var(--text-primary);overflow-wrap:anywhere;">${escapeHtml(waitingBrowserTab.waitingForHuman.reason)}</span>
                    </div>
                    <div class="browser-human-gate-actions">
                      <button
                        type="button"
                        class="browser-takeover-cta ${takeoverActive ? 'active' : ''}"
                        data-act="takeover-2fa"
                        title="Focus blocked tab, enable interactive pointer/keyboard Control ON, and open the 2FA injection bar"
                      >
                        ${ICONS.gamepad}
                        <span>${takeoverActive ? 'IN CONTROL · 2FA READY' : 'TAKE CONTROL & 2FA'}</span>
                      </button>
                      <button
                        type="button"
                        class="fav-chip ${state.sendContinueOnResume ? 'active' : ''}"
                        data-act="toggle-autocontinue"
                      >
                        ${state.sendContinueOnResume ? 'AUTO-CONTINUE: ON' : 'AUTO-CONTINUE: OFF'}
                      </button>
                      <button
                        type="button"
                        class="browser-resume-cta"
                        data-act="resume-2fa"
                        title="Clear waitingForHuman hold, restore Watch-Only mode, and resume the agent"
                      >
                        ${ICONS.check}
                        <span>RESUME AGENT</span>
                      </button>
                    </div>
                  </div>
                `;
                      })()
                    : ''
                }

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
                      <span style="color:${bTab.color.hex};">${escapeHtml(bTab.waitingForHuman ? 'WAITING FOR HUMAN 2FA' : bTab.hudBadge || (bTab.isWorking ? 'WORKING' : 'IDLE'))}</span>
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

        <!-- Mobile Frosted Glass Bottom Dock (100% Full-View Tabs + Unread Dot — #280) -->
        <nav class="ld-mobile-dock">
          <button class="m-dock-tab ${state.showSidebar ? 'active' : ''}" data-act="toggle-sidebar">
            ${ICONS.cpu}
            <span>FLEET</span>
            ${unreadList.length ? `<span class="fleet-header-unread-dot">${unreadList.length}</span>` : ''}
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
        ${state.modal === 'shot-markup' ? renderShotMarkupModal() : ''}

        ${
          state.workspaceToast
            ? `<div role="status" style="position:fixed;bottom:18px;right:18px;z-index:9600;padding:9px 14px;border-radius:10px;background:rgba(5,10,14,0.94);border:1px solid var(--accent);color:var(--text-primary);font-family:var(--font-mono);font-size:11.5px;box-shadow:0 10px 28px rgba(0,0,0,0.55);max-width:min(420px,90vw);">${escapeHtml(state.workspaceToast)}</div>`
            : ''
        }

        ${
          state.modal === 'resurrect-guard'
            ? `
          <div class="modal-veil" data-act="close-modal">
            <div class="ld-modal-card" style="padding:22px;border-color:rgba(245,158,11,0.55);width:min(480px,94vw);" onclick="event.stopPropagation()">
              <div style="font-family:var(--font-mono);font-size:14.5px;font-weight:700;color:#fbbf24;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <span style="display:inline-flex;align-items:center;gap:8px;">${ICONS.alert} <span>EMPTY-SAVE GUARDRAIL // TMUX-RESURRECT</span></span>
                <button class="ghost-btn" style="padding:0 6px;" data-act="close-modal">${ICONS.close}</button>
              </div>
              <p style="margin-top:12px;font-size:12.5px;color:var(--text-secondary);line-height:1.6;">
                Only ${state.sessions.length} active session(s) running compared to ${state.savedSnapshotCount} in your last snapshot. Overwrite saved workspace state?
              </p>
              <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.28);font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);display:flex;justify-content:space-between;">
                <span>ACTIVE NODES: ${state.sessions.length}</span>
                <span>LAST BACKUP: ${state.savedSnapshotCount}</span>
              </div>
              <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px;">
                <button type="button" class="ghost-btn" data-act="close-modal">CANCEL</button>
                <button type="button" class="neon-cta-btn" style="background:rgba(245,158,11,0.18);border-color:rgba(245,158,11,0.65);color:#fde68a;" data-act="force-save-tmux-state">
                  ${ICONS.upload} <span>OVERWRITE BACKUP</span>
                </button>
              </div>
            </div>
          </div>
        `
            : ''
        }

        <!-- Spawn New Isolated Session / Git Repo Launcher Modal (#300) -->
        ${
          state.modal === 'spawn-sess'
            ? (() => {
                const mockRepos = [
                  { name: 'aim-auditor', path: '~/aim-agents/aim-auditor', vessel: 'GROK' },
                  { name: 'aim-connect', path: '~/aim-connect', vessel: 'AGY' },
                  { name: 'aim-joshua', path: '~/aim-joshua', vessel: 'AGY' },
                  { name: 'aim-ld', path: '~/aim-ld', vessel: 'AGY' },
                  { name: 'aim-tmux-dashboard', path: '~/aim-tmux-dashboard', vessel: 'AGY' },
                  { name: 'aim-cron-dashboard', path: '~/aim-cron-dashboard', vessel: 'AGY' },
                  { name: 'aim-skill-library', path: '~/aim-skill-library', vessel: 'GROK' },
                ].map((r) => ({ ...r, active: state.sessions.some((s) => s.name === r.name) }))
                  .sort((a, b) => (a.active === b.active ? a.name.localeCompare(b.name) : a.active ? -1 : 1));
                const rq = state.repoSearch.trim().toLowerCase();
                const visRepos = mockRepos.filter((r) => !rq || `${r.active ? 'active' : 'offline'} ${r.name} ${r.path}`.toLowerCase().includes(rq));
                return `
          <div class="modal-veil" data-act="close-modal">
            <div class="ld-modal-card" style="padding:20px;width:min(520px,94vw);" onclick="event.stopPropagation()">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-family:var(--font-mono);font-size:14px;font-weight:700;color:var(--accent);display:flex;align-items:center;gap:8px;">
                    ${state.spawnTab === 'repo' ? ICONS.gitBranch : ICONS.plus}
                    <span>${state.spawnTab === 'repo' ? 'GIT PROJECT LAUNCHER' : 'SPAWN ISOLATED TMUX NODE'}</span>
                  </div>
                  <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.14em;color:var(--accent);margin-top:3px;">
                    FAST RESUME (-C) · STRICT ALPHABETICAL FLEET RAIL
                  </div>
                </div>
                <button class="ghost-btn" style="padding:0 6px;" data-act="close-modal">${ICONS.close}</button>
              </div>

              <div style="display:flex;gap:6px;margin-top:12px;">
                <button type="button" class="filter-chip ${state.spawnTab === 'repo' ? 'active' : ''}" style="flex:1;justify-content:center;padding:6px 10px;" data-act="spawn-tab-repo">GIT REPOS (${mockRepos.length})</button>
                <button type="button" class="filter-chip ${state.spawnTab === 'custom' ? 'active' : ''}" style="flex:1;justify-content:center;padding:6px 10px;" data-act="spawn-tab-custom">CUSTOM NODE</button>
              </div>

              <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,0.025);border:1px solid var(--border-hairline);display:flex;flex-direction:column;gap:6px;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                  <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--text-secondary);">AUTO-LAUNCH HARNESS</span>
                  ${
                    state.defaultAgent !== 'shell'
                      ? `<div style="display:flex;gap:10px;align-items:center;font-family:var(--font-mono);font-size:10.5px;">
                          ${state.defaultAgent === 'agy' ? `<label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;color:var(--text-secondary);"><input type="checkbox" data-bool-set="skipPermissions" ${state.skipPermissions ? 'checked' : ''} /> Skip perms</label>` : ''}
                          <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;color:var(--accent);"><input type="checkbox" data-bool-set="autoResumeC" ${state.autoResumeC ? 'checked' : ''} /> Resume (-c)</label>
                        </div>`
                      : ''
                  }
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:5px;">
                  ${[
                    ['agy', 'AGY (-c)'],
                    ['grok', 'GROK (-c)'],
                    ['opencode', 'OPENCODE (-c)'],
                    ['codex', 'CODEX (-c)'],
                    ['shell', 'SHELL ONLY'],
                  ]
                    .map(
                      ([id, lbl]) =>
                        `<button type="button" class="filter-chip ${state.defaultAgent === id ? 'active' : ''}" data-pick-agent="${id}">${id === 'shell' ? lbl : state.autoResumeC ? lbl : id.toUpperCase()}</button>`
                    )
                    .join('')}
                </div>
              </div>

              ${
                state.spawnTab === 'repo'
                  ? `
                <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
                  <input class="ld-text-input" id="repo-launcher-search" placeholder="Filter local Git repositories (active or offline)..." value="${escapeHtml(state.repoSearch)}" />
                  <div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;border:1px solid var(--border-hairline);border-radius:8px;padding:6px;">
                    ${visRepos
                      .map(
                        (r) => `
                      <button type="button" class="pop-item" style="width:100%;justify-content:space-between;gap:8px;" data-launch-repo="${r.name}|${r.path}">
                        <span style="display:flex;flex-direction:column;align-items:flex-start;text-align:left;">
                          <span style="font-weight:600;font-size:12px;">${escapeHtml(r.name)}</span>
                          <span style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono);">${escapeHtml(r.path)}</span>
                        </span>
                        <span class="mono-kbd" style="${r.active ? 'border-color:var(--accent);color:var(--accent);' : ''}">${r.active ? 'ACTIVE · ATTACH' : 'OFFLINE · LAUNCH'}</span>
                      </button>
                    `
                      )
                      .join('')}
                  </div>
                </div>
              `
                  : `
                <form id="spawn-sess-form" style="margin-top:12px;display:flex;flex-direction:column;gap:10px;">
                  <input class="ld-text-input" id="spawn-name-inp" placeholder="Session name (e.g. aim-research)" required />
                  <input class="ld-text-input" id="spawn-cwd-inp" placeholder="Working directory (optional, e.g. ~/my-project)" />
                  <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px;">
                    <button type="button" class="ghost-btn" data-act="close-modal">CANCEL</button>
                    <button type="submit" class="neon-cta-btn">SPAWN &amp; ATTACH</button>
                  </div>
                </form>
              `
              }
            </div>
          </div>
        `;
              })()
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

  const nextTabsRow = document.querySelector('.copilot-tabs-row');
  if (nextTabsRow && prevTabsLeft) nextTabsRow.scrollLeft = prevTabsLeft;
  const nextFavBar = document.querySelector('.cp-fav-bar');
  if (nextFavBar && prevFavLeft) nextFavBar.scrollLeft = prevFavLeft;
  const nextFleetList = document.querySelector('.fleet-scroll-list');
  if (nextFleetList && prevFleetTop) nextFleetList.scrollTop = prevFleetTop;
  const nextStreamEl = document.getElementById('live-stream-scroll');
  if (nextStreamEl && state.lastScrolledSession === state.activeSession && prevStreamTop) {
    nextStreamEl.scrollTop = prevStreamTop;
  }
  const nextWebShot = document.querySelector('.real-shot-canvas');
  if (nextWebShot && prevWebShotTop) nextWebShot.scrollTop = prevWebShotTop;
  const nextScrollCopy = document.getElementById('scrollcopy-pre');
  if (nextScrollCopy && prevScrollCopyTop) nextScrollCopy.scrollTop = prevScrollCopyTop;

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
    ['scramble-kb', state.showOnScreenKeyboard ? 'KB ON' : 'KB OFF', 'btn-top-kb'],
  ].forEach(([spanId, label, btnId]) => {
    const sp = document.getElementById(spanId);
    const bt = document.getElementById(btnId);
    if (sp && bt) attachScramble(sp, label, bt);
  });
  bindStandaloneButtonScrambles();

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
        state.composerDraft = inp.value;
        syncMockComposerHeight(inp);
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
        state.composerDraft = inp.value;
        syncMockComposerHeight(inp);
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
        state.composerDraft = inp.value;
        syncMockComposerHeight(inp);
        inp.focus();
      } else if (key.length === 1 && !state.kbCtrl && inp) {
        inp.value += key;
        state.composerDraft = inp.value;
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
    b.onclick = () => {
      openShowcaseFile(b.dataset.file);
      render();
    };
  });

  document.querySelectorAll('[data-doc-hub]').forEach((b) => {
    b.onclick = (e) => {
      openShowcaseFile(b.dataset.docHub, { viaDocsHub: !(e.ctrlKey || e.metaKey) });
      render();
    };
  });

  const wikiSel = document.getElementById('wiki-hub-sel');
  if (wikiSel) {
    wikiSel.onchange = (e) => {
      if (e.target.value) {
        openShowcaseFile(e.target.value, { viaDocsHub: true });
        render();
      }
    };
  }

  document.querySelectorAll('[data-close-ftab]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const id = b.dataset.closeFtab;
      state.fileTabs = state.fileTabs.filter((t) => t.id !== id);
      if (!state.fileTabs.some((t) => t.path === state.activeFile) && state.fileTabs[0]) {
        state.activeFile = state.fileTabs[0].path;
      }
      render();
    };
  });

  document.querySelectorAll('[data-toggle-dir]').forEach((b) => {
    b.onclick = () => {
      const dir = b.dataset.toggleDir;
      state.expandedDirs[dir] = state.expandedDirs[dir] === false;
      render();
    };
  });

  document.querySelectorAll('[data-md-file]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      openShowcaseFile(b.dataset.mdFile, { openPane: true, viaDocsHub: state.docsSingleTabMode });
      render();
    };
  });

  document.querySelectorAll('[data-audio-rate]').forEach((b) => {
    b.onclick = () => {
      const rate = Number(b.dataset.audioRate) || 1;
      state.audioPlaybackRate = rate;
      render();
      const aud = document.getElementById('showcase-audio-el');
      if (aud) aud.playbackRate = rate;
    };
  });

  const audEl = document.getElementById('showcase-audio-el');
  if (audEl) audEl.playbackRate = state.audioPlaybackRate || 1;

  const codeEd = document.getElementById('showcase-code-editor');
  if (codeEd) {
    codeEd.oninput = (e) => {
      if (FILES_DB[state.activeFile]) {
        FILES_DB[state.activeFile].code = e.target.value;
        FILES_DB[state.activeFile].status = 'M';
      }
    };
  }

  document.querySelectorAll('[data-tree-side]').forEach((b) => {
    b.onclick = () => {
      state.filesTreeSide = b.dataset.treeSide;
      render();
    };
  });

  document.querySelectorAll('[data-stage-mode]').forEach((b) => {
    b.onclick = () => {
      state.agentStageMode = b.dataset.stageMode;
      render();
    };
  });

  document.querySelectorAll('[data-split-preset]').forEach((b) => {
    b.onclick = () => {
      state.splitPct = Number(b.dataset.splitPreset) || 48;
      render();
    };
  });

  const edFontRange = document.getElementById('editor-fontsize-range');
  if (edFontRange) {
    edFontRange.oninput = (e) => {
      state.editorFontSize = Number(e.target.value) || 13;
      render();
    };
  }

  document.querySelectorAll('[data-edit-shot]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const [sKey, shotId] = b.dataset.editShot.split('|');
      const found = (state.stagedAttachments[sKey] || []).find((a) => a.id === shotId);
      if (!found) return;
      state.editingShot = { sessionKey: sKey, shotId };
      state.markupAnns = [...(found.annotations || [])];
      state.modal = 'shot-markup';
      render();
    };
  });

  document.querySelectorAll('[data-dl-shot]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const [sKey, shotId] = b.dataset.dlShot.split('|');
      const found = (state.stagedAttachments[sKey] || []).find((a) => a.id === shotId);
      if (!found) return;
      const off = document.createElement('canvas');
      off.width = 920;
      off.height = 512;
      const ctx = off.getContext('2d');
      paintMarkupBaseScene(ctx, 920, 512, found);
      (found.annotations || []).forEach((ann) => drawMarkupAnn(ctx, ann, 920));
      const a = document.createElement('a');
      a.href = off.toDataURL('image/png');
      a.download = found.filename;
      a.click();
    };
  });

  document.querySelectorAll('[data-mtool]').forEach((b) => {
    b.onclick = () => {
      state.markupTool = b.dataset.mtool;
      render();
    };
  });

  document.querySelectorAll('[data-mcol]').forEach((b) => {
    b.onclick = () => {
      state.markupColor = b.dataset.mcol;
      render();
    };
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

  document.querySelectorAll('[data-switch-srv]').forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.switchSrv;
      const target = state.servers.find((s) => s.id === id);
      if (target && target.id !== state.activeServerId) {
        state.activeServerId = target.id;
        showShowcaseToast(`Switched 3FA Gate -> ${target.label} (${target.url})`);
      }
    };
  });

  document.querySelectorAll('[data-logout-switch-srv]').forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.logoutSwitchSrv;
      const target = state.servers.find((s) => s.id === id);
      if (target) {
        state.activeServerId = target.id;
        state.modal = null;
        state.isLocked = true;
        showShowcaseToast(`Signed out & switched -> ${target.label} (${target.url})`);
      }
    };
  });

  document.querySelectorAll('[data-del-srv]').forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.delSrv;
      state.servers = state.servers.filter((s) => s.id !== id);
      render();
    };
  });

  document.querySelectorAll('[data-srv-color]').forEach((b) => {
    b.onclick = () => {
      const activeSrv = getActiveShowcaseServer();
      activeSrv.color = b.dataset.srvColor;
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

  const defAgentSel = document.getElementById('set-default-agent');
  if (defAgentSel) {
    defAgentSel.onchange = (e) => {
      state.defaultAgent = e.target.value;
      state.tmuxSettingsToast = 'SAVED ✓';
      render();
      setTimeout(() => { state.tmuxSettingsToast = ''; render(); }, 2000);
    };
  }

  document.querySelectorAll('[data-pick-agent]').forEach((b) => {
    b.onclick = () => {
      state.defaultAgent = b.dataset.pickAgent;
      render();
    };
  });

  document.querySelectorAll('[data-launch-repo]').forEach((b) => {
    b.onclick = () => {
      const [repoName, repoPath] = b.dataset.launchRepo.split('|');
      const mapVessel = { agy: 'AGY', grok: 'GROK', opencode: 'OC', codex: 'CDX', shell: 'SH' };
      const vessel = mapVessel[state.defaultAgent] || 'AGY';
      const resumeCmd = state.defaultAgent === 'shell' ? 'bash' : `${state.defaultAgent}${state.defaultAgent === 'agy' && state.skipPermissions ? ' --dangerously-skip-permissions' : ''}${state.autoResumeC ? ' -c' : ''}`;
      if (!state.sessions.some((s) => s.name === repoName)) {
        state.sessions = [
          {
            name: repoName,
            vessel,
            isAgent: vessel !== 'SH',
            status: 'IDLE',
            branch: 'master',
            isWorktree: false,
            panes: 1,
            pct: 8.4,
            used: '84k',
            limit: vessel === 'AGY' ? '1M' : '200k',
            tier: 'normal',
            compacted: 0,
            browserTabId: null,
            color: { hex: '#14b8a6', rgb: '20, 184, 166', label: 'Teal' },
            preview: `Resumed via ${resumeCmd} in ${repoPath}`,
            priorTurns: [],
            userPrompt: `Attached to ${repoPath} (${resumeCmd})`,
            tools: [`tmux new-session -d -s ${repoName} -c ${repoPath}`, resumeCmd],
            spoken: `Opened ${repoName} and resumed ${vessel} context.`,
          },
          ...state.sessions,
        ].sort((a, b) => a.name.localeCompare(b.name));
        showShowcaseToast(`Spawned ${repoName} · ${resumeCmd}`);
      }
      state.activeSession = repoName;
      state.modal = null;
      render();
    };
  });

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
      else if (act === 'toggle-stage-mode') {
        state.agentStageMode = state.agentStageMode === 'chat' ? 'pty' : 'chat';
        state.lastScrolledSession = '';
      }
      else if (act === 'toggle-autoscroll') {
        state.sessionAutoScroll = !state.sessionAutoScroll;
      }
      else if (act === 'hop-to-bottom') {
        const sc = document.getElementById('live-stream-scroll');
        if (sc) sc.scrollTop = sc.scrollHeight;
        state.chatScrolledUp = false;
        state.chatUnseenBelow = false;
        const fab = document.getElementById('hop-bottom-fab');
        if (fab) {
          fab.style.display = 'none';
          fab.classList.remove('has-unseen');
        }
        return;
      }
      else if (act === 'flip-files-tree') {
        state.filesTreeSide = state.filesTreeSide === 'right' ? 'left' : 'right';
      }
      else if (act === 'collapse-files-tree') {
        if (state.device === 'phone' || window.innerWidth <= 768) {
          state.filesShowMobileTree = !state.filesShowMobileTree;
        } else {
          state.filesTreeCollapsed = !state.filesTreeCollapsed;
        }
      }
      else if (act === 'toggle-mobile-tree') {
        state.filesShowMobileTree = !state.filesShowMobileTree;
      }
      else if (act === 'toggle-dotfiles') {
        state.filesHideDotfiles = !state.filesHideDotfiles;
      }
      else if (act === 'toggle-docs-1tab') {
        state.docsSingleTabMode = !state.docsSingleTabMode;
        if (state.docsSingleTabMode && FILES_DB[state.activeFile]?.isDoc) {
          openShowcaseFile(state.activeFile, { viaDocsHub: true });
        }
      }
      else if (act === 'docs-back') {
        if (state.docsHistory.index > 0) {
          state.docsHistory.index -= 1;
          openShowcaseFile(state.docsHistory.entries[state.docsHistory.index], { viaDocsHub: true, skipHistory: true });
        }
      }
      else if (act === 'docs-fwd') {
        if (state.docsHistory.index < state.docsHistory.entries.length - 1) {
          state.docsHistory.index += 1;
          openShowcaseFile(state.docsHistory.entries[state.docsHistory.index], { viaDocsHub: true, skipHistory: true });
        }
      }
      else if (act === 'pin-docs-tab') {
        state.fileTabs = state.fileTabs.map((t) =>
          t.isDocsReader ? { ...t, id: `pinned-${Date.now()}`, isDocsReader: false } : t
        );
      }
      else if (act === 'toggle-md-mode') {
        state.mdViewMode = state.mdViewMode === 'preview' ? 'code' : 'preview';
      }
      else if (act === 'toggle-img-zoom') {
        state.imageZoomMode = state.imageZoomMode === 'fit' ? 'actual' : 'fit';
      }
      else if (act === 'toggle-file-select') {
        state.fileSelectMode = !state.fileSelectMode;
      }
      else if (act === 'dl-active-file') {
        const entry = FILES_DB[state.activeFile];
        if (entry?.type === 'audio') {
          const a = document.createElement('a');
          a.href = getSyntheticWavUrl();
          a.download = state.activeFile.split('/').pop();
          a.click();
        } else {
          const blob = new Blob([entry?.code || `AIM Sovereign Artifact: ${state.activeFile}\n`], { type: 'application/octet-stream' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = state.activeFile.split('/').pop();
          a.click();
        }
        return;
      }
      else if (act === 'open-markup-demo') {
        const target = state.activeSession && state.sessions.find((s) => s.name === state.activeSession)?.isAgent !== false
          ? state.activeSession
          : 'aim-connect';
        state.activeSession = target;
        let list = state.stagedAttachments[target] || [];
        if (!list.length) {
          const activeTab = state.browserTabs.find((t) => t.id === state.activeBrowserTab) || state.browserTabs[0];
          const seed = {
            id: `shot-${Date.now()}`,
            filename: `screenshot-${(activeTab?.agentKey || 'browser')}.png`,
            path: 'docs/screenshots/emerald-matrix-arch.svg',
            screenSrc: activeTab?.screenSrc || resolveScreenForUrl(activeTab?.url),
            dims: '1280×713 PNG',
            url: activeTab?.url || 'https://www.leaddeeds.com',
            annotated: false,
            annotations: [],
          };
          list = [seed];
          state.stagedAttachments[target] = list;
        }
        state.editingShot = { sessionKey: target, shotId: list[0].id };
        state.markupAnns = [...(list[0].annotations || [])];
        state.modal = 'shot-markup';
      }
      else if (act === 'markup-undo') {
        state.markupAnns = state.markupAnns.slice(0, -1);
      }
      else if (act === 'markup-clear') {
        state.markupAnns = [];
      }
      else if (act === 'markup-download') {
        const cv = document.getElementById('shot-markup-canvas');
        if (cv) {
          const a = document.createElement('a');
          a.href = cv.toDataURL('image/png');
          a.download = 'marked-screenshot.png';
          a.click();
        }
        return;
      }
      else if (act === 'markup-apply') {
        if (state.editingShot) {
          const { sessionKey, shotId } = state.editingShot;
          state.stagedAttachments[sessionKey] = (state.stagedAttachments[sessionKey] || []).map((att) =>
            att.id === shotId
              ? {
                  ...att,
                  annotated: state.markupAnns.length > 0,
                  annotations: [...state.markupAnns],
                  filename: att.filename.startsWith('marked-') || state.markupAnns.length === 0 ? att.filename : `marked-${att.filename}`,
                }
              : att
          );
        }
        state.modal = null;
        state.editingShot = null;
      }
      else if (act === 'toggle-shot-scope') {
        state.shotFullPage = !state.shotFullPage;
      }
      else if (act === 'sim-2fa-gate') {
        state.activeTool = 'browser';
        const existingWait = state.browserTabs.find((t) => Boolean(t.waitingForHuman));
        if (existingWait) {
          state.activeBrowserTab = existingWait.id;
        } else {
          const targetTab = state.browserTabs.find((t) => t.id === 'tab-tb') || state.browserTabs[0];
          if (targetTab) {
            targetTab.waitingForHuman = {
              reason: 'Complete Cloudflare Access 2FA code before promoting fix/issue-231',
              requestedAt: Date.now(),
            };
            state.activeBrowserTab = targetTab.id;
          }
        }
      }
      else if (act === 'takeover-2fa') {
        const wTab = state.browserTabs.find((t) => Boolean(t.waitingForHuman));
        if (wTab) state.activeBrowserTab = wTab.id;
        state.controlMode = true;
        state.showBrowser2faBar = true;
        render();
        document.getElementById('b2fa-inp')?.focus();
        return;
      }
      else if (act === 'toggle-autocontinue') {
        state.sendContinueOnResume = !state.sendContinueOnResume;
      }
      else if (act === 'resume-2fa') {
        const wTab = state.browserTabs.find((t) => Boolean(t.waitingForHuman));
        if (wTab) {
          const owner = wTab.agentKey || 'aim-tbsoftwash';
          wTab.waitingForHuman = null;
          wTab.hudBadge = 'RESUMED · SESSION AUTHENTICATED';
          const sessObj = state.sessions.find((s) => s.name === owner);
          if (sessObj) {
            sessObj.status = 'IDLE';
            sessObj.taskKind = 'mapping';
            sessObj.taskLabel = '2FA VERIFIED ✓';
          }
          if (state.sendContinueOnResume) {
            state.sentMessages[owner] = [
              ...(state.sentMessages[owner] || []),
              {
                text: 'continue',
                agentReply: '2FA cookie session verified on the leased tab. Resuming deployment pipeline cleanly.',
              },
            ];
          }
        }
        state.controlMode = false;
        state.showBrowser2faBar = false;
      }
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
      else if (act === 'open-repo-launcher') { state.spawnTab = 'repo'; state.modal = 'spawn-sess'; state.popover = null; }
      else if (act === 'open-spawn-sess') { state.spawnTab = 'custom'; state.modal = 'spawn-sess'; state.popover = null; }
      else if (act === 'spawn-tab-repo') { state.spawnTab = 'repo'; }
      else if (act === 'spawn-tab-custom') { state.spawnTab = 'custom'; }
      else if (act === 'save-tmux-state') { triggerMockSaveWorkspace(false); return; }
      else if (act === 'force-save-tmux-state') { triggerMockSaveWorkspace(true); return; }
      else if (act === 'preview-guardrail') { state.modal = 'resurrect-guard'; }
      else if (act === 'restore-tmux-state') { showShowcaseToast('Restoring saved tmux workspace & resuming agents (-c)...'); return; }
      else if (act === 'toggle-boot-unit') { state.bootUnitInstalled = !state.bootUnitInstalled; state.tmuxSettingsToast = 'HOST UPDATED ✓'; setTimeout(() => { state.tmuxSettingsToast = ''; render(); }, 1800); }
      else if (act === 'toggle-wsl-keepalive') { state.wslKeepaliveRunning = !state.wslKeepaliveRunning; state.tmuxSettingsToast = 'HOST UPDATED ✓'; setTimeout(() => { state.tmuxSettingsToast = ''; render(); }, 1800); }
      else if (act === 'toggle-wsl-always-on') {
        const next = !state.wslAlwaysOnEnabled;
        state.wslAlwaysOnEnabled = next;
        state.wslStartupVbsInstalled = next;
        state.wslIdleConfigured = next;
        state.wslKeepaliveRunning = next;
        state.tmuxSettingsToast = next ? 'WSL ALWAYS-ON ENABLED ✓' : 'REVERTED TO WINDOWS DEFAULT ✓';
        setTimeout(() => { state.tmuxSettingsToast = ''; render(); }, 2000);
      }
      else if (act === 'copy-wsl-off-cmd') {
        navigator.clipboard?.writeText?.('./scripts/wsl-keepalive.sh off');
        state.tmuxSettingsToast = 'COPIED OFF CMD ✓';
        setTimeout(() => { state.tmuxSettingsToast = ''; render(); }, 1800);
      }
      else if (act === 'hard-refresh-app') {
        showShowcaseToast(`Cleared PWA Cache & Reloaded Latest Bundle (${state.activeBundleId})`);
        return;
      }
      else if (act === 'open-server-switcher') {
        state.settingsTab = 'appearance';
        state.modal = 'settings';
        state.popover = null;
      }
      else if (act === 'toggle-lock-add-srv') {
        state.showLockAddServer = !state.showLockAddServer;
      }
      else if (act === 'lock-save-srv' || act === 'lock-save-switch-srv') {
        const lbl = document.getElementById('lock-new-srv-label')?.value.trim() || 'NEW NODE';
        const rawUrl = document.getElementById('lock-new-srv-url')?.value.trim() || 'https://node.example.com';
        const cleanUrl = rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`;
        let host = 'node.example.com';
        try { host = new URL(cleanUrl).host; } catch {}
        const id = `srv-${Date.now().toString(36)}`;
        state.servers = [...state.servers, { id, label: lbl.toUpperCase(), monogram: lbl.slice(0, 3).toUpperCase(), url: cleanUrl, host, color: '#F59E0B' }];
        state.showLockAddServer = false;
        if (act === 'lock-save-switch-srv') {
          state.activeServerId = id;
          showShowcaseToast(`Switched 3FA Gate -> ${lbl.toUpperCase()} (${cleanUrl})`);
        }
      }
      else if (act === 'settings-add-srv') {
        const lbl = document.getElementById('peer-srv-label-inp')?.value.trim() || 'PEER SERVER';
        const rawUrl = document.getElementById('peer-srv-url-inp')?.value.trim() || 'https://peer.example.com';
        const cleanUrl = rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`;
        let host = 'peer.example.com';
        try { host = new URL(cleanUrl).host; } catch {}
        state.servers = [...state.servers, { id: `srv-${Date.now().toString(36)}`, label: lbl.toUpperCase(), monogram: lbl.slice(0, 3).toUpperCase(), url: cleanUrl, host, color: '#38BDF8' }];
        state.nodeIdentityToast = 'SERVER ADDED ✓';
        setTimeout(() => { state.nodeIdentityToast = ''; render(); }, 1800);
      }
      else if (act === 'save-node-identity') {
        const activeSrv = getActiveShowcaseServer();
        const nextLbl = document.getElementById('curr-srv-label-inp')?.value.trim();
        const nextMono = document.getElementById('curr-srv-mono-inp')?.value.trim().toUpperCase();
        if (nextLbl) activeSrv.label = nextLbl;
        if (nextMono) activeSrv.monogram = nextMono.slice(0, 4);
        state.nodeIdentityToast = 'IDENTITY SAVED ✓';
        setTimeout(() => { state.nodeIdentityToast = ''; render(); }, 1800);
      }
      else if (act === 'sync-tmux-conf') { state.tmuxSettingsToast = 'SYNCED TO ~/.TMUX.CONF ✓'; setTimeout(() => { state.tmuxSettingsToast = ''; render(); }, 2000); }
      else if (act === 'save-scan-paths') {
        state.repoScanPaths = document.getElementById('repo-scan-paths-inp')?.value || state.repoScanPaths;
        state.tmuxSettingsToast = 'SCAN PATHS SYNCED ✓';
        setTimeout(() => { state.tmuxSettingsToast = ''; render(); }, 2000);
      }
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
        const isMedia = entry && ['image', 'audio', 'video', 'binary'].includes(entry.type);
        const payload = isMedia ? state.activeFile : entry?.code || state.activeFile;
        navigator.clipboard?.writeText(payload).catch(() => {});
        state.fileCopyBadge = 'COPIED ✓';
        setTimeout(() => { state.fileCopyBadge = ''; render(); }, 1400);
      }
      else if (act === 'toggle-conflict') state.fileConflictBanner = !state.fileConflictBanner;
      else if (act === 'new-btab') {
        const id = `tab-${Date.now()}`;
        state.browserTabs.push({
          id,
          title: 'Google',
          url: 'https://www.google.com/',
          agentKey: '',
          sublabel: '',
          color: null,
          isWorking: false,
          waitingForHuman: null,
          kind: 'screenshot',
          screenSrc: './screens/google.webp',
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
          path: 'docs/screenshots/emerald-matrix-arch.svg',
          screenSrc: cur?.screenSrc || resolveScreenForUrl(cur?.url),
          dims: state.shotFullPage ? '1280×1600 FULL PNG' : '1280×713 PANE PNG',
          url: cur?.url || '',
          annotated: false,
          annotations: [],
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
  bindLiveInput('repo-launcher-search', 'repoSearch');

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
      const cwd = document.getElementById('spawn-cwd-inp')?.value.trim() || `~/${name}`;
      const mapVessel = { agy: 'AGY', grok: 'GROK', opencode: 'OC', codex: 'CDX', shell: 'SH' };
      const vessel = mapVessel[state.defaultAgent] || 'AGY';
      const resumeCmd = state.defaultAgent === 'shell' ? 'bash' : `${state.defaultAgent}${state.autoResumeC ? ' -c' : ''}`;
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
            preview: `Launched ${resumeCmd} in ${cwd}`,
            priorTurns: [],
            userPrompt: `Session ${name} initialized in ${cwd}.`,
            tools: [`tmux new-session -d -s ${name} -c ${cwd}`, resumeCmd],
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
        cur.screenSrc = resolveScreenForUrl(cur.url);
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

  const resolveMockActionsLayout = (heightPx, cur = 'row') => {
    if (heightPx >= 116 || (cur === 'stacked' && heightPx >= 104)) return 'stacked';
    if (heightPx >= 76 || ((cur === 'two-tier' || cur === 'stacked') && heightPx >= 66)) return 'two-tier';
    return 'row';
  };

  const syncMockComposerHeight = (el) => {
    if (!el) return;
    const minPx = 34;
    const autoMaxPx = 140;
    const maxPx = 260;
    let appliedHeight = minPx;
    if (typeof state.composerCustomHeight === 'number' && Number.isFinite(state.composerCustomHeight)) {
      const clamped = Math.max(minPx, Math.min(maxPx, Math.round(state.composerCustomHeight)));
      el.style.height = `${clamped}px`;
      el.style.overflowY = 'auto';
      appliedHeight = clamped;
    } else {
      el.style.height = '0px';
      const measured = el.scrollHeight || minPx;
      const next = Math.max(minPx, Math.min(autoMaxPx, measured));
      el.style.height = `${next}px`;
      el.style.overflowY = measured > autoMaxPx ? 'auto' : 'hidden';
      appliedHeight = next;
    }
    const nextLayout = resolveMockActionsLayout(appliedHeight, state.composerActionsLayout || 'row');
    state.composerActionsLayout = nextLayout;
    const actGroup = document.getElementById('composer-actions-group');
    if (actGroup) actGroup.dataset.actionsLayout = nextLayout;
  };

  const promptInp = document.getElementById('node-input');
  if (promptInp) {
    syncMockComposerHeight(promptInp);
    promptInp.oninput = () => {
      state.composerDraft = promptInp.value;
      syncMockComposerHeight(promptInp);
    };
    promptInp.onkeydown = (ev) => {
      if (
        ev.key === 'Enter' &&
        !ev.shiftKey &&
        !ev.ctrlKey &&
        !ev.metaKey &&
        !ev.altKey &&
        !ev.isComposing
      ) {
        ev.preventDefault();
        document.getElementById('node-composer')?.requestSubmit();
      }
    };
    promptInp.onpaste = (ev) => {
      const items = ev.clipboardData?.items || [];
      for (const it of items) {
        if (it.type && it.type.startsWith('image/')) {
          ev.preventDefault();
          const target = state.activeSession || 'aim-connect';
          const stamp = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
          const curTab = state.browserTabs.find((t) => t.id === state.activeBrowserTab);
          const pasted = {
            id: `paste-${Date.now()}`,
            filename: `clipboard-${stamp}.png`,
            path: 'docs/screenshots/emerald-matrix-arch.svg',
            screenSrc: curTab?.screenSrc || './screens/leaddeeds.webp',
            dims: 'CLIPBOARD PNG',
            url: curTab?.url || 'https://www.leaddeeds.com',
            annotated: false,
            annotations: [],
          };
          state.stagedAttachments[target] = [...(state.stagedAttachments[target] || []), pasted];
          render();
          document.getElementById('node-input')?.focus();
          return;
        }
      }
    };
  }

  const resizeHandle = document.getElementById('composer-resize-handle');
  const inputBox = document.getElementById('ld-input-box');
  if (resizeHandle && promptInp) {
    resizeHandle.onpointerdown = (ev) => {
      if (ev.button !== undefined && ev.button !== 0) return;
      ev.preventDefault();
      const startH = promptInp.getBoundingClientRect().height || promptInp.offsetHeight || 34;
      const startY = ev.clientY;
      inputBox?.classList.add('is-resizing');
      const onMove = (mv) => {
        const next = Math.max(34, Math.min(260, Math.round(startH + (startY - mv.clientY))));
        state.composerCustomHeight = next;
        syncMockComposerHeight(promptInp);
      };
      const onUp = () => {
        inputBox?.classList.remove('is-resizing');
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    };
    resizeHandle.ondblclick = (ev) => {
      ev.preventDefault();
      state.composerCustomHeight = null;
      syncMockComposerHeight(promptInp);
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
          {
            text: txt,
            attachments: staged,
            agentReply: `Acknowledged directive${staged.length ? ` with ${staged.length} screenshot attachment(s)` : ''}. Executing inside isolated GitOps worktree.`,
          },
        ];
        state.stagedAttachments[target] = [];
        state.composerDraft = '';
        if (state.sessionAutoScroll || !state.chatScrolledUp) {
          state.lastScrolledSession = '';
          state.chatUnseenBelow = false;
        } else {
          state.chatUnseenBelow = true;
        }
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
            ? 'python3 629630 operator 6u IPv4 TCP *:8000 (LISTEN) · python3 3316 TCP *:8001 (LISTEN)'
            : cmd.includes('startup')
            ? '[startup.sh] :8000 OK · :8001 OK · cloudflared QUIC OK · 0 services needed restart'
            : `[ok] executed '${cmd}' (exit=0)`;
        state.tmuxPaneLogs[key] = [...(state.tmuxPaneLogs[key] || []), `$ ${cmd}`, reply];
        render();
        document.getElementById('tmux-shell-inp')?.focus();
      }
    };
  }

  // Keep live multi-turn stream scrolled to active bottom turn on session switch, and track Discord Hop-to-Bottom (#277)!
  const streamEl = document.getElementById('live-stream-scroll');
  if (streamEl) {
    if (state.lastScrolledSession !== state.activeSession) {
      streamEl.scrollTop = streamEl.scrollHeight;
      state.lastScrolledSession = state.activeSession;
      state.chatScrolledUp = false;
      state.chatUnseenBelow = false;
    }
    streamEl.onscroll = () => {
      const dist = streamEl.scrollHeight - streamEl.scrollTop - streamEl.clientHeight;
      const isUp = dist > 60;
      if (!isUp && state.chatUnseenBelow) state.chatUnseenBelow = false;
      if (isUp !== state.chatScrolledUp) {
        state.chatScrolledUp = isUp;
        const fab = document.getElementById('hop-bottom-fab');
        if (fab) {
          fab.style.display = isUp ? 'inline-flex' : 'none';
          fab.classList.toggle('has-unseen', Boolean(state.chatUnseenBelow));
        }
      }
    };
  }

  // Draggable 2-Column Files Folder Tree Resizer (#266, #267)
  const treeResizer = document.getElementById('files-tree-resizer');
  const filesSplitBody = document.getElementById('files-split-body');
  if (treeResizer && filesSplitBody) {
    treeResizer.onpointerdown = (ev) => {
      ev.preventDefault();
      treeResizer.classList.add('dragging');
      filesSplitBody.classList.add('is-resizing-tree');
      const onMove = (mv) => {
        const rect = filesSplitBody.getBoundingClientRect();
        const raw = state.filesTreeSide === 'right' ? rect.right - mv.clientX : mv.clientX - rect.left;
        const clamped = Math.max(150, Math.min(440, Math.round(raw)));
        state.filesTreeWidth = clamped;
        filesSplitBody.style.setProperty('--files-tree-width', `${clamped}px`);
      };
      const onUp = () => {
        treeResizer.classList.remove('dragging');
        filesSplitBody.classList.remove('is-resizing-tree');
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
    treeResizer.ondblclick = () => {
      state.filesTreeWidth = 226;
      render();
    };
  }

  // Interactive <canvas> Visual Markup Studio (#273, #276)
  const markupCv = document.getElementById('shot-markup-canvas');
  if (markupCv && state.editingShot) {
    const list = state.stagedAttachments[state.editingShot.sessionKey] || [];
    const att = list.find((a) => a.id === state.editingShot.shotId);
    const ctx = markupCv.getContext('2d');
    let draft = null;
    const repaint = () => {
      if (!ctx) return;
      paintMarkupBaseScene(ctx, markupCv.width, markupCv.height, att, repaint);
      state.markupAnns.forEach((ann) => drawMarkupAnn(ctx, ann, markupCv.width));
      if (draft) drawMarkupAnn(ctx, draft, markupCv.width);
    };
    repaint();

    const toPt = (ev) => {
      const r = markupCv.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(markupCv.width, ((ev.clientX - r.left) * markupCv.width) / Math.max(1, r.width))),
        y: Math.max(0, Math.min(markupCv.height, ((ev.clientY - r.top) * markupCv.height) / Math.max(1, r.height))),
      };
    };

    markupCv.onpointerdown = (ev) => {
      ev.preventDefault();
      const pt = toPt(ev);
      if (state.markupTool === 'pin') {
        const nextNum = state.markupAnns.reduce((mx, a) => (a.type === 'pin' && a.num > mx ? a.num : mx), 0) + 1;
        draft = { type: 'pin', num: nextNum, color: state.markupColor, x: pt.x, y: pt.y, x2: pt.x, y2: pt.y };
      } else if (state.markupTool === 'pen') {
        draft = { type: 'pen', color: state.markupColor, points: [pt] };
      } else {
        draft = { type: state.markupTool, color: state.markupColor, x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
      }
      repaint();
    };

    markupCv.onpointermove = (ev) => {
      if (!draft) return;
      const pt = toPt(ev);
      if (draft.type === 'pen') draft.points.push(pt);
      else {
        draft.x2 = pt.x;
        draft.y2 = pt.y;
      }
      repaint();
    };

    const finishStroke = () => {
      if (!draft) return;
      state.markupAnns = [...state.markupAnns, draft];
      draft = null;
      render();
    };
    markupCv.onpointerup = finishStroke;
    markupCv.onpointerleave = finishStroke;
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
