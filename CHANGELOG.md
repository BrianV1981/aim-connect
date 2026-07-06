# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-07-06

### Added
- **Sovereign Web Terminal:** Full browser-based terminal emulator using `xterm.js`.
- **Tmux Integration (`pty.fork()`):** Persistent background sessions that survive browser disconnects.
- **Session Manager GUI:** Create, attach, and kill isolated tmux workspaces directly from the web header dropdown.
- **Web IDE (File Explorer):** A built-in visual file browser with full CRUD (Create, Rename, Delete, Save) capabilities.
- **Sovereign Mobile Keyboard:** A custom on-screen HTML developer keyboard that bypasses native mobile OS predictive text bugs.
- **Commander Toolbar:** A customizable macro execution bar that saves user-defined bash snippets to local storage.
- **Mobile Touch-Scroll Adapter:** Synthesizes mobile swipes into native tmux mouse-wheel events for smooth paging in `vim`/`less`.
- **Zero-Trust Security:** Strict Google Authenticator (TOTP) pin-pad lockscreen guarding the WebSocket and API endpoints.
- **Deployment Architecture:** Fully Dockerized setup, `.env` file configuration, and a portable `startup.sh` script that natively serves the built frontend from FastAPI.

### Security
- Implemented `secure_path()` wrapper to prevent Path Traversal attacks on all file I/O endpoints.
- Isolated all secrets to an uncommitted `.env` file and strictly ignored `totp.secret`.
- Configurable CORS origins via `CORS_ORIGINS` environment variable.

### Changed
- Refactored frontend theme to use a high-contrast Navy Blue and Burnt Orange palette.
- Replaced raw print statements in the backend with structured Python `logging`.
- Added strict Python type hints and targeted docstrings for maintainability.
