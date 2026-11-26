// Plain-English help for every control in Settings (#314).
// `summary` is shown under the setting at all times; `details` opens in the tap-friendly ⓘ bubble.
// Rule: summaries avoid jargon entirely. Details may name a technical term once, in parentheses, after explaining it.

export const SETTINGS_HELP = {
  // ---------------------------------------------------------------- APPEARANCE & APP
  installApp: {
    summary: 'Run AIM-Connect in its own window or as a phone home-screen app, without browser tabs and address bars.',
    details:
      'INSTALL APP adds AIM-Connect to your desktop or phone home screen so it opens like a normal app. REFRESH APP throws away any old copy your device saved and loads the newest version from your server. Use it if something looks out of date after an update.',
  },
  serverIdentity: {
    summary: 'Name this computer, give it a color and short icon code, and jump between your other AIM-Connect computers.',
    details:
      'If you run AIM-Connect on more than one computer (for example a home PC and a cloud server), each one can get its own name, color, and 2-4 letter code. The code is drawn onto the app icon, so on your phone you can tell them apart at a glance. Add your other computers here to switch between them in one tap. Switching signs you out of this one first.',
  },
  addServer: {
    summary: 'Add another computer running AIM-Connect so you can switch to it from here.',
    details:
      'Enter a friendly name, the web address of the other computer (for example https://vps.yourdomain.com), and pick a color. It then appears in the list above with a LOGOUT & SWITCH button. Nothing is installed on the other computer; this only saves a shortcut.',
  },
  thisServerBadge: {
    summary: 'The name, 2-4 letter code, and color used for THIS computer on badges and the phone app icon.',
    details:
      'Pick something you will recognize, like "Home PC" with the code "HOME". After changing the icon code or color, remove the app from your phone home screen and add it again so the new icon shows up.',
  },
  colorScheme: {
    summary: 'Choose the overall color look. It applies to the whole app, the terminal, and the code editor.',
    details:
      'Purely visual; nothing about how the app works changes. Pure OLED Black saves battery on phones with OLED screens. Daylight Crisp is easiest to read in bright rooms.',
  },
  operatorReplies: {
    summary: 'Pick a highlight color for YOUR messages so they stand out from the AI agent’s replies.',
    details:
      'In the chat-style history views, your own messages get this color. LEFT keeps everything lined up like a log. RIGHT puts your messages on the right side like a texting app. Visual only.',
  },
  terminalFont: {
    summary: 'How big the text is in the terminal (the black command window), and its color palette.',
    details:
      'Bigger text is easier to read on a phone. Smaller text fits more lines on screen. "Match Active UI Theme" keeps the terminal colors in sync with the color look you picked above.',
  },
  workspaceEditor: {
    summary: 'Layout choices for the file browser, code editor, and side-by-side split screen.',
    details:
      'These only change how things are arranged on your screen. Nothing on your computer’s files changes.',
  },
  filesTreeSide: {
    summary: 'Which side of the screen the folder list appears on when you open Files.',
    details:
      'LEFT matches Windows File Explorer. RIGHT puts the folder list on the outer edge so the chat and the code you are reading sit right next to each other.',
  },
  agentStage: {
    summary: 'What you see first when you open an AI agent session: a clean chat, or the raw terminal.',
    details:
      'CHAT VIEW shows the conversation like a messaging app, with formatting and without terminal clutter. RAW TERMINAL shows exactly what the agent’s command window shows. You can switch at any time inside a session; this only sets the default.',
  },
  editorFont: {
    summary: 'Text size in the code editor and the document preview.',
    details: 'Visual only. Larger is easier on the eyes; smaller shows more of the file at once.',
  },
  splitPreset: {
    summary: 'How the screen is divided when the terminal and a second panel (files or browser) are open side by side.',
    details:
      '50/50 splits evenly. 60/40 TERM gives the terminal more room. 40/60 PANE gives the files or browser panel more room. You can also drag the divider by hand.',
  },
  hideDotfiles: {
    summary: 'Hide hidden system folders and clutter (like .git) in the file list.',
    details:
      'Projects contain hidden housekeeping folders that you almost never need to open. Turning this on hides them so the list only shows your real files. Nothing is deleted.',
  },
  wordWrap: {
    summary: 'Wrap long lines in the code editor so you don’t have to scroll sideways.',
    details: 'Visual only. The file itself is not changed. Turn it off if you prefer each line of code on exactly one line.',
  },
  docsSingleTab: {
    summary: 'Open project documents one at a time in a single reusable tab, with Back and Forward buttons.',
    details:
      'Normally every document you click opens in a new tab. With this on, links between documents (README, notes, the project wiki) open in the same tab, like browsing a website.',
  },
  autoScroll: {
    summary: 'Automatically jump to the newest message when the AI agent replies.',
    details:
      'Off by default so a long reply never yanks you away from what you are reading. When it is off, tap the floating ↓ button to jump to the bottom whenever you want.',
  },
  paneMemory: {
    summary: 'Whether each project remembers its own open panels, or one layout follows you everywhere.',
    details:
      'Per-Session: each project remembers whether you had the terminal, files, or browser open, and which file you were looking at. Global: one layout follows you no matter which project you switch to.',
  },

  // ---------------------------------------------------------------- TMUX & BOOT (sessions & restart)
  agentDefaults: {
    summary: 'Which AI agent starts by default, whether it continues its previous conversation, and whether it may act without asking you.',
    details:
      'These settings decide what happens when you open a project from the REPOS list, press RESUME, or restore your saved workspace after a restart. After changing them, press SYNC so the restore system uses your new choices.',
  },
  syncConf: {
    summary: 'Apply these choices to the restore system. Press once after an update or after changing the settings in this card.',
    details:
      'Writes your choices into the settings file of tmux (the program that keeps your sessions running in the background) so a restore or restart relaunches each agent in its own saved conversation. Your original file is backed up once to ~/.tmux.conf.aim-bak.',
  },
  defaultAgent: {
    summary: 'The AI agent that starts when you open a project or press RESUME.',
    details:
      'Pick the agent you use most. "Shell Only" opens a plain command window with no AI agent. Saved workspaces always restore whichever agent was actually running in each window, regardless of this choice.',
  },
  autoResume: {
    summary: 'Bring each agent back into the exact conversation it was in, instead of starting a blank one.',
    details:
      'When ON, restoring your workspace, or opening a project, continues where you left off. When two agents were working in the same project, each gets its own conversation back. Turn OFF if you prefer every restored agent to start fresh.',
  },
  skipPermissions: {
    summary: 'Let Antigravity run commands and edit files without stopping to ask you first.',
    details:
      'Saves time because the agent never waits for your approval. The risk: it can change or delete files and run programs on its own. Only use it on projects you trust and have backed up. (Technical name: --dangerously-skip-permissions.)',
  },
  autoRestoreOnBoot: {
    summary: 'When your computer restarts, automatically reopen your saved sessions and AI agents.',
    details:
      'ON: after a reboot, everything you last saved comes back on its own. OFF: only AIM-Connect itself starts, and you press RESTORE when you are ready. OFF is useful if reopening many agents at once slows your computer down.',
  },
  keepAwake: {
    summary: 'Keep everything running in the background, even with no windows open, so you can reach it from your phone.',
    details:
      'On Windows, the Linux side (WSL) normally shuts down a few seconds after you close the last terminal window, which stops your agents and remote access. These switches keep it awake, or set it to start by itself after a reboot. Everything here can be turned off again with one click.',
  },
  wslAlwaysOn: {
    summary: 'Windows only: keep your agents running after you close every terminal window, including after a restart.',
    details:
      'Turns on three things together: tells Windows not to put Linux to sleep, starts a small hidden helper when you sign in to Windows, and starts that helper now. It uses a little more memory and battery because Linux stays on. TURN OFF & REVERT undoes all three.',
  },
  bootUnit: {
    summary: 'Linux only: start AIM-Connect and restore your sessions automatically when the computer boots.',
    details:
      'Installs a small start-up task (a systemd service) for your user account. DISABLE removes it. On Windows, use WSL2 Always-On above instead.',
  },
  keepaliveHandle: {
    summary: 'Temporarily pause or resume the background helper that keeps Linux awake, for example to save laptop battery.',
    details:
      'PAUSE lets Windows put Linux to sleep as usual until you START it again or restart. It does not undo Always-On mode; your start-up settings stay in place.',
  },
  keepaliveCli: {
    summary: 'The same on/off switch as a command you can paste into a terminal.',
    details: 'Handy if you can’t open this screen. COPY OFF CMD copies the command that turns Always-On mode off.',
  },
  saveGuardrail: {
    summary: 'Save or restore your whole workspace, with a safety check so you don’t overwrite a good backup by accident.',
    details:
      'SAVE NOW takes a snapshot of every open session and records which conversation each AI agent is in. RESTORE brings it all back. You can have only one saved snapshot, so saving with almost nothing open would replace a full backup. The safety check catches that.',
  },
  guardrailToggle: {
    summary: 'Ask before saving when far fewer sessions are open than in your last backup.',
    details:
      'Example: your backup has 12 sessions but only 1 is open right now. Saving would replace the 12 with 1. With this ON you get a warning first. Leave it ON unless the prompt annoys you.',
  },
  sidebarBar: {
    summary: 'Show the SAVE STATE and RESTORE buttons at the bottom of the session list.',
    details:
      'Turn OFF on small phone screens to avoid tapping them by accident. You can still save and restore from this screen and from the Cmd+K command menu.',
  },
  scanFolders: {
    summary: 'Extra folders to look in when listing your projects in the REPOS launcher.',
    details:
      'Your home folder is always checked (two folders deep). If you keep projects somewhere else, like a second drive, add that folder here, one per line, for example /mnt/d/projects. These folders are only looked at; nothing in them is changed.',
  },

  // ---------------------------------------------------------------- KEYBOARD & ALERTS
  keyboard: {
    summary: 'The built-in on-screen keyboard, designed for typing commands on a phone.',
    details:
      'Phone keyboards lack keys like Esc, Tab, Ctrl, and arrows, and they autocorrect commands. This keyboard has those keys and never autocorrects.',
  },
  keyboardMode: {
    summary: 'Which keyboard layout opens first.',
    details:
      'Standard looks like a normal phone keyboard (letters, numbers, symbols). Hacker Terminal puts Esc, Tab, Ctrl, and arrow keys up front for working in the terminal.',
  },
  keyboardFeedback: {
    summary: 'What you feel or hear on each key press: a soft click sound, a vibration (phones), or nothing.',
    details: 'Purely a comfort setting. Vibration only works on phones that support it.',
  },
  autoCaps: {
    summary: 'Capitalize the first letter of each sentence automatically.',
    details: 'Only affects the Standard layout. Turn OFF if you mostly type commands, which are usually lowercase.',
  },
  keyboardAutoHide: {
    summary: 'Hide the on-screen keyboard by itself when you tap elsewhere, press Enter to send, or open a menu.',
    details:
      'Also stops your phone’s own keyboard from popping up on top of it while it is open. Turn OFF if you want the keyboard to stay up until you close it yourself.',
  },
  alertChime: {
    summary: 'Play a sound when an AI agent in another session finishes, or stops to wait for your approval.',
    details:
      'Useful when several agents are working at once: you hear when one is done (NEW) or needs you (WAITING) without watching the screen.',
  },

  // ---------------------------------------------------------------- VOICE
  spokenSummary: {
    summary: 'Have the agent’s short spoken summary (the 🔊 part at the end of a reply) read out loud.',
    details:
      'Agents finish each reply with a plain-English 🔊 summary. With auto-playback ON it is read aloud automatically, so you can follow along hands-free. Use TEST VOICE to hear the selected voice.',
  },
  ttsVoice: {
    summary: 'Which voice reads summaries aloud.',
    details:
      'Offline Piper voices run entirely on your own computer: private, and they work without internet. Edge Neural voices sound more natural but send the text to Microsoft’s online service to be spoken. Browser Native uses your device’s built-in voice.',
  },
  voiceMacros: {
    summary: 'Say a phrase you choose to trigger a saved action, like running a command, hands-free.',
    details:
      'In MACRO SETTINGS, give any saved macro a "voice trigger" phrase. When the microphone hears that phrase, the macro runs as if you had tapped it.',
  },
  dictation: {
    summary: 'Speak instead of typing, and choose spoken words that send your message.',
    details:
      'These control how the microphone turns your speech into text in the message box. Each switch is independent.',
  },
  voiceContinuous: {
    summary: 'Keep the microphone listening after each message, until you turn it off.',
    details: 'Handy for a back-and-forth spoken conversation. Remember to turn the mic off when you are done.',
  },
  voiceAutoEnter: {
    summary: 'Saying the word "enter" sends your message.',
    details: 'The word itself is not typed; it acts like pressing the Send button.',
  },
  voiceAutoSend: {
    summary: 'Saying the word "send" sends your message.',
    details: 'The word itself is not typed; it acts like pressing the Send button.',
  },
  voiceAutoExecute: {
    summary: 'Saying the word "execute" sends your message.',
    details: 'The word itself is not typed; it acts like pressing the Send button.',
  },
  voiceAutoCapitalize: {
    summary: 'Tidy up dictated text with capital letters and punctuation.',
    details: 'Turn OFF if you are dictating commands, which should stay exactly as spoken.',
  },
  voiceSlashes: {
    summary: 'Turn the spoken words "slash" and "backslash" into the / and \\ characters.',
    details: 'Useful for agent commands that start with a slash, such as /help.',
  },

  // ---------------------------------------------------------------- INTEGRATIONS
  emailVault: {
    summary: 'Let AI agents in this session send email from your Gmail or Google Workspace account.',
    details:
      'Store your email address and a Google "App Password" (a special 16-character password Google gives you for apps, separate from your normal password; create one in your Google Account under Security). It is kept on your own computer and only used by agents in this session to send mail. Leave the password blank to keep the one already saved.',
  },

  // ---------------------------------------------------------------- SECURITY
  e2ee: {
    summary: 'Add an extra lock on everything sent between this browser and your computer, using a passphrase only you know.',
    details:
      'Normally your connection is already protected by HTTPS. This adds a second layer: your typing and terminal output are scrambled in the browser with your passphrase before they leave the device. Every device you sign in from must have the same passphrase entered here, or the terminal will not display. Leave blank to turn it off.',
  },
  passkey: {
    summary: 'Sign in with your face, fingerprint, or Windows Hello instead of typing your codes.',
    details:
      'Registers this device as a trusted key (a "passkey"). Next time you can unlock with FaceID, TouchID, Windows Hello, or a security key. Register each device you use separately.',
  },
  logout: {
    summary: 'Sign out of this computer now and return to the login screen.',
    details: 'Anything running keeps running; you only need to sign in again to see it. Use this on shared or public devices.',
  },
};

// Words that must never appear in a visible summary (tests enforce this).
export const SUMMARY_JARGON = [
  'tmux',
  'resurrect',
  'websocket',
  'pbkdf2',
  'aes',
  'webauthn',
  'systemd',
  '.wslconfig',
  'vbs',
  'pwa',
  'monaco',
  'xterm',
  'cdp',
  ' -c',
  '(-c)',
  'cli',
  'pty',
  'oauth',
];
