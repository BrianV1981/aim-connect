# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Added
- **Macro Library Manager:** A unified persistent state manager for all keyboard macros and hardcoded actions, accessible via a new ⚙️ settings modal.
- **Sticky Ctrl Modifier:** A dedicated `Ctrl` key on the Sovereign Keyboard that natively translates alpha inputs to raw ASCII control sequences (e.g., `Ctrl+W` -> `\x17`).
- **Auto-Capitalization:** The keyboard now natively detects punctuation (`.`, `!`, `?`) followed by a space and automatically engages the Shift modifier.

### Fixed
- **Mobile PWA Rendering:** Fixed a critical bug on Android devices where the OS navigation bar clipped the bottom of the Progressive Web App. Implemented dynamic `window.innerHeight` binding to a CSS `--vh` variable.
- **Mobile Touch-Scroll Lock:** Fixed an issue where opening the Sovereign Keyboard completely disabled terminal touch-scrolling. Replaced the aggressive `disableStdin` hack with a passive `textarea.readOnly` state, perfectly blocking the native virtual keyboard while allowing raw finger-swipe pass-through to `xterm.js`.

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
