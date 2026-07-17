I Run Grok, Claude, and Gemini From My Phone. No App. No SSH. Just a Browser.

Right now, from my phone, I can spin up a Grok CLI session, pivot to a Claude agent, kick off a Gemini task, or load a local LLM — all with full tool access, full terminal control, zero restrictions. No special app installed. No SSH keys stored on my device. Just a web browser pointed at my own hardware.

That is not a demo. That is my daily workflow. And the feeling of pulling your entire infrastructure out of your pocket — and actually being productive with it — is genuinely electric.

The tool that makes it possible is called AIM-Connect.


What Is AIM-Connect?

AIM-Connect is a self-hosted, open-source web terminal that turns any browser into a root-level control panel for a Linux server. Think of it as SSH without the client — no terminal app, no key management, no corporate lockouts. You open a URL, authenticate, and you are staring at a live terminal session with full execution rights.

It wraps tmux sessions in a secure WebSocket and serves them through a FastAPI + React bridge. That architecture gives you something SSH alone never could: session persistence across devices, a visual file editor, macro automation, voice dictation, and a mobile-first UI — all from a single browser tab.


The "Immortality" Protocol

Every session runs on tmux. Close your browser, put your phone in your pocket, fly to another country. Your scripts keep running. Open the URL again from any device, re-authenticate, and you are instantly re-attached to the live terminal stream. Nothing was lost. Nothing restarted. The session was alive the entire time.

This is not "reconnect." This is continuity. Your terminal never dies.


Three-Factor Authentication (Zero Trust)

AIM-Connect does not use passwords alone. It does not use OAuth. It does not delegate to any cloud identity provider. The auth chain is:

Factor 1: A stealth passphrase (disguised as a "Name" field on the login screen).
Factor 2: An admin password (generated on first boot, never stored in plaintext).
Factor 3: A time-based one-time code from Google Authenticator or Authy.

All three must pass. On top of that:

- TOTP codes are single-use (replay protection).
- Failed attempts trigger rate limiting and lockout.
- IP allowlisting restricts access to trusted networks.
- HTTPS is enforced via middleware — plaintext HTTP connections are rejected.
- Content-Security-Policy, X-Frame-Options, and X-Content-Type-Options headers are set on every response.

WebSocket connections require a valid API token within 10 seconds or the connection is dropped. Idle connections auto-close after 15 minutes of inactivity.

You own every byte of the auth chain. No third-party IdP. No cloud accounts. No biometrics. Sovereign authentication.


Multi-User Support

The latest release adds optional per-user authentication. Drop a users.json file next to the backend, and each user gets their own independent three-factor credentials and their own TOTP secret. Session namespacing ensures users only see their own tmux sessions. Admins see everything.

No seat licenses. No subscription tiers. You want to share your server with a collaborator? Give them credentials. They authenticate with their own passphrase, their own password, their own authenticator code. Done.


The Sovereign Web IDE

AIM-Connect is not just a terminal. The built-in file explorer lets you navigate directories, open any text file in a full-screen editor, modify it, and save it directly to the server. You can create new files, create directories, and delete items — all from a tap interface on your phone.

That means I can edit a Python script, a YAML config, a systemd unit file, or an agent prompt — all from Safari on my iPhone while standing in line at the grocery store.


Custom Macro Commander

The Commander Toolbar sits above the terminal. You can create custom macro buttons on the fly — each one fires a bash command when tapped. Add \r to auto-press Enter. Pin your most-used macros to the toolbar. Edit or delete them anytime.

Macros can be local (stored in your browser) or server-synced (shared across every device that connects). You can also export your entire macro library as a JSON file and import it on another instance.

AIM-Connect ships with 13 preset macros out of the box — Ctrl+C, Escape, Tab, Page Up/Down, arrow keys, clear screen, top, ls -la, and tmux copy mode. You can edit or delete any of these and add your own. I have macros for tailing logs, restarting services, attaching to specific tmux sessions, checking disk usage, and launching AI agents — all one tap away.


The Sovereign Keyboard

Native mobile keyboards are hostile to terminal work. Autocorrect inserts garbage. Predictive text swallows keystrokes. The viewport jumps around unpredictably.

AIM-Connect ships with a custom on-screen HTML keyboard that suppresses the native keyboard entirely. It includes dedicated keys for Tab, Escape, Ctrl, pipes, brackets, semicolons, and other characters that mobile keyboards either hide or make impossible to type. Two layouts are available: Standard (alphabetic) and Hacker (terminal-optimized).

The Ctrl key is a sticky modifier. Tap it once, it highlights and waits. Tap any letter next, and it sends the raw ASCII control sequence. Ctrl+C to kill a process. Ctrl+W to delete a word. Ctrl+Z to suspend. From your phone.

A touch-scroll adapter translates finger swipes into scroll events, so you can swipe through vim, less, and tmux panes the way you would expect on a touch device. This one detail changes the entire experience of using a terminal on mobile.

Keyboard feedback is configurable: audio ticks, haptic vibration, or silent.


Voice Dictation

Tap the microphone button and start talking. AIM-Connect includes a full speech recognition engine that converts your voice directly into terminal input.

Verbal commands:
- Say "Enter" to press Enter.
- Say "Send" to submit.
- Say "Execute" to run.

Verbal punctuation:
- Say "comma" to type a comma.
- Say "period" to type a period.
- Say "question mark" to type a question mark.

Continuous listening mode keeps the mic hot between utterances. You can dictate entire commands hands-free. I have used this while cooking dinner to check on a deployment.


In-Terminal Search and Clipboard Integration

Press the Find button to open a search bar overlay. Type a query and hit Enter to jump to the next match. Shift+Enter goes backward. Escape closes.

A dedicated Paste button reads from the system clipboard and sends the content directly to the terminal — no long-press gymnastics. On the login screen, the paste button and a global paste listener auto-extract 6-digit TOTP codes from your clipboard for instant entry.


Scrollback and Copy Mode

Mobile browsers make it nearly impossible to scroll through terminal output and select text. AIM-Connect solves this with a dedicated Scroll/Copy mode that captures the full terminal scrollback buffer and renders it in a native-scroll overlay.

Toggle between Color View (rendered ANSI escape codes) and Select Text mode (plain text with native text selection). Scroll to the bottom to auto-exit back to the live terminal.


WebSocket Reconnection

If the connection drops, AIM-Connect does not just die. It retries with exponential backoff (1 second, 2 seconds, 4, 8, 16) for up to 5 attempts. A live status indicator in the header shows connection health:

Green = connected.
Yellow (pulsing) = reconnecting.
Red = disconnected.

If all retries fail, it gracefully returns you to the login screen.


Mobile-First PWA

AIM-Connect is a Progressive Web App. Tap "Add to Home Screen" and it installs as a native-looking app icon on your phone. Full-screen, no browser chrome, instant launch.

Running multiple servers? Each instance can have its own app name and theme color via environment variables. My phone has three AIM-Connect icons: one for my workstation, one for a Raspberry Pi, one for a cloud VPS. Each has a different color so I know which is which at a glance.

The viewport handler is specifically tuned for iOS Safari — debounced resize events, orientation change detection with delayed refit, and CSS dvh fallback to prevent the address bar from eating your terminal.


Docker Deployment

AIM-Connect ships with a hardened, multi-stage Dockerfile:

Stage 1 builds the React frontend (Node.js is not in the final image).
Stage 2 runs the Python backend as a non-root user.
A HEALTHCHECK directive pings /api/health.
Volume mounts are restricted to workspace/ only — no source code or secrets exposed.

docker-compose up -d --build. That is it.


Test Suite

18 pytest tests cover three-factor auth, individual factor rejection, TOTP replay, rate limiting, path traversal prevention, token expiry, and HTTPS enforcement. GitHub Actions CI runs them on every push.


The Bigger Picture

AIM-Connect is one piece of a larger ecosystem called A.I.M. — Actual Intelligent Memory. It is a collection of open-source tools built around a simple idea: you should own your stack.

The active fleet includes aim-agy (the core engine on Antigravity CLI), aim-grok (Grok CLI vessel), aim-opencode (OpenCode CLI), aim-codex, aim-browser (headless Chromium for agents), aim-google (Gmail, Drive, Calendar CLI), aim-tmux-dashboard, aim-flight-recorder, aim-boardroom (multi-agent orchestration), and aim-skills (a shared skills registry across all vessels).

Every one of these tools runs on hardware I own. No paywalled platforms. No gated APIs deciding what I can or cannot do with my own machines. The philosophy is simple: if you built it, you should be able to control it from anywhere, on any device, without asking permission.

AIM-Connect is the front door to all of it.


It is open source. It is MIT licensed. And it is free.

GitHub: github.com/BrianV1981/aim-connect
