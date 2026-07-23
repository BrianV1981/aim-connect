# Changelog

## [v1.7.2] - 2026-07-20
- Fix: Refactored workspace isolation to use persistent root directories (Closes #119)


## [v1.7.1] - 2026-07-20
- fix: revert LeadDeed integration per user request (Closes #114)


## [v1.7.0] - 2026-07-20
- feat: add LeadDeed magic-link JWT validation and dynamic session spawning (Closes #112)


## [v1.6.3] - 2026-07-20
- fix: add placeholder to session select dropdown to prevent visual desync (Closes #110)


## [v1.6.2] - 2026-07-20
- fix: correct dictation spacing for quotation marks and update README (Closes #108)


## [v1.6.1] - 2026-07-20
- fix: add WS keep-alive and default text macros (Closes #106)


## [v1.6.0] - 2026-07-20
- feat: add Voice Triggers to Macro Library (Closes #104)


## [v1.5.0] - 2026-07-20
- feat: add verbal punctuation for dashes and parentheses, strip slash padding (Closes #102)


## [v1.4.2] - 2026-07-20
- fix: reset capitalization state memory when toggling microphone on (Closes #100)


## [v1.4.1] - 2026-07-20
- fix: strip native transcript spacing to prevent double spaces during continuous dictation (Closes #98)


## [v1.4.0] - 2026-07-20
- feat: add aim-ecosystem and support footer to welcome screen (Closes #96)


## [v1.3.1] - 2026-07-20
- fix: resolve xterm rendering glitch by replacing display:none with absolute overlay (Closes #94)


## [v1.3.0] - 2026-07-20
- feat: add stylized welcome screen and disable auto-session attach on login (Closes #93)


## [v1.2.2] - 2026-07-20
- fix: improve voice dictation regex pipeline for quotes, slashes, spacing, and autocaps (Closes #91)


## [v1.2.1] - 2026-07-20
- fix: surface hard speech recognition errors and halt continuous loops (Closes #89)


## [v1.2.0] - 2026-07-17
- Feature: Monaco Editor Integration (Closes #82)


All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-07-15

### Added
- **Three-Factor Auth:** Added stealth passphrase field ("Name") as third authentication factor. Login flow is now Passphrase + Password + TOTP — three-factor without biometrics.
- **TOTP Replay Protection:** Same TOTP code cannot be reused within its validity window.
- **Session Name Validation:** tmux session names are validated against `^[a-zA-Z0-9_-]{1,64}$` to prevent unexpected behavior.
- **Auth Attempts TTL Cleanup:** Rate-limiting entries are now evicted after the lockout window expires, preventing unbounded memory growth.
- **Token File Permissions:** `tokens.json` is now created with `0o600` permissions, matching `totp.secret` and `password.hash`.

### Security
- **CRITICAL:** Removed debug prints that leaked TOTP tokens and password lengths to stdout on auth failure.
- Added `tokens.json`, `passphrase.hash`, and `macros.json` to `.gitignore` and CI secret guard.
- Auth error messages are now generic ("Invalid credentials") to prevent information leakage.
- All auth failures logged via structured `logger.warning()` with IP only — no sensitive data.

### Fixed
- **Scrollback Auth Bypass:** Fixed `window.fetch` → `fetch` in scrollback endpoint call, which was bypassing the API token injection and silently breaking the feature in production.
- **Keyboard Infinite Recursion:** Fixed `triggerFeedback()` calling itself recursively instead of `playClickSound()`, which crashed the browser tab on desktop.
- **TOTP Provisioning Name:** Changed from "aim-agy" to "aim-connect" for correct branding in authenticator apps.
- **Duplicate Import:** Removed duplicate `import json` statement.

### Changed
- Version aligned across VERSION file, frontend, and CHANGELOG (was 1.0.1/1.0.2/1.0.0).
- Upgraded auth from two-factor to three-factor with backward-compatible passphrase field.
- **Macro Library Manager:** A unified persistent state manager for all keyboard macros and hardcoded actions, accessible via a new ⚙️ settings modal.
- **Sticky Ctrl Modifier:** A dedicated `Ctrl` key on the Sovereign Keyboard that natively translates alpha inputs to raw ASCII control sequences (e.g., `Ctrl+W` -> `\x17`).
- **Auto-Capitalization:** The keyboard now natively detects punctuation (`.`, `!`, `?`) followed by a space and automatically engages the Shift modifier.

### Fixed
- **Scrollback Auth Bypass:** Fixed `window.fetch` → `fetch` in scrollback endpoint call, which was bypassing the API token injection and silently breaking the feature in production.
- **Keyboard Infinite Recursion:** Fixed `triggerFeedback()` calling itself recursively instead of `playClickSound()`, which crashed the browser tab on desktop.
- **TOTP Provisioning Name:** Changed from "aim-agy" to "aim-connect" for correct branding in authenticator apps.
- **Duplicate Import:** Removed duplicate `import json` statement.
- **Mobile PWA Rendering:** Fixed a critical bug on Android devices where the OS navigation bar clipped the bottom of the Progressive Web App. Implemented dynamic `window.innerHeight` binding to a CSS `--vh` variable.
- **Mobile Touch-Scroll Lock:** Fixed an issue where opening the Sovereign Keyboard completely disabled terminal touch-scrolling. Replaced the aggressive `disableStdin` hack with a passive `textarea.readOnly` state, perfectly blocking the native virtual keyboard while allowing raw finger-swipe pass-through to `xterm.js`.

## [Unreleased]

## [1.0.0] - 2026-07-06

### Added
- **Sovereign Web Terminal:** Full browser-based terminal emulator using `xterm.js`.
- **Tmux Integration (`pty.fork()`):** Persistent background sessions that survive browser disconnects.
- **Session Manager GUI:** Create, attach, and kill isolated tmux workspaces directly from the web header dropdown.
- **Web IDE (File Explorer):** A built-in visual file browser with full CRUD (Create, Rename, Delete, Save) capabilities.
- **Sovereign Mobile Keyboard:** A custom on-screen HTML developer keyboard that bypasses native mobile OS predictive text bugs.
- **Commander Toolbar:** A customizable macro execution bar that saves user-defined bash snippets to local storage.
- **Mobile Touch-Scroll Adapter:** Synthesizes mobile swipes into native tmux mouse-wheel events for smooth paging in `vim`/`less`.
- **Zero-Trust Security:** Dual-layer auth (Admin Password + Google Authenticator TOTP) guarding the WebSocket and API endpoints.
- **Deployment Architecture:** Fully Dockerized setup, `.env` file configuration, and a portable `startup.sh` script that natively serves the built frontend from FastAPI.

### Security
- Implemented `secure_path()` wrapper to prevent Path Traversal attacks on all file I/O endpoints.
- Isolated all secrets and explicitly untracked `totp.secret` and `password.hash` from git.
- Configurable CORS origins via `CORS_ORIGINS` environment variable.

### Changed
- Refactored frontend theme to use a high-contrast Navy Blue and Burnt Orange palette.
- Replaced raw print statements in the backend with structured Python `logging`.
- Added strict Python type hints and targeted docstrings for maintainability.
