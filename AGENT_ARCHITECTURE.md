# A.I.M. Connect - Agent Architecture & Handoff Guide

> **MANDATE:** If you are a new AI agent assigned to this repository, read this document carefully before making any code changes. This project relies on a deeply integrated, stateful architecture bridging a Python FastAPI backend, a React/Vite frontend, and raw system `tmux` and `pty` processes.

## 1. Core Architecture
AIM-Connect is a "Sovereign Web Terminal". It uses WebSockets to pipe raw byte streams from system pseudo-terminals (PTYs) directly into an `xterm.js` canvas in a React web app.

*   **Backend (`/backend`):** A Python FastAPI server (`main.py`) running via `uvicorn`. It handles Time-based One-Time Password (TOTP) authentication, WebSocket binary streams, and OS-level `pty.fork()` calls to interface with `tmux`.
*   **Frontend (`/frontend`):** A React app built with Vite. It heavily utilizes `xterm.js` and custom DOM manipulation (like Visual Viewport listeners) to defeat mobile keyboard bugs.

## 2. Infrastructure & Process Management
This application is designed to run persistently using `tmux` sessions. **Do not use standard backgrounding (`&`) to run the core services.**

There are three primary persistent `tmux` sessions you must be aware of:

1.  **`aim-backend`:** Runs the Python FastAPI server.
    *   *Path:* `/home/kingb/aim-connect/backend`
    *   *Command:* `source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000`
2.  **`aim-frontend`:** Runs the Vite development server.
    *   *Path:* `/home/kingb/aim-connect/frontend`
    *   *Command:* `npm run dev -- --host`
3.  **`aim-ngrok` / `cloudflared`:** Runs the secure tunnel exposing the local port to the internet.

### How to Restart the Infrastructure
If you make changes to `backend/main.py`, you **MUST** restart the backend process for changes to take effect. Do this via `tmux`:
```bash
# Safely kill the existing backend session
tmux kill-session -t aim-backend

# Recreate and start the backend
tmux new-session -d -s aim-backend "cd /home/kingb/aim-connect/backend && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000"
```

## 3. High-Risk Components & Nuances

### The WebSocket Bridge (`backend/main.py` -> `App.jsx`)
*   The WebSocket transports **raw array buffers**. Do not attempt to stringify the primary terminal data stream, or you will corrupt ANSI escape codes.
*   The backend spawns `tmux attach` inside a `pty.fork()`. If the user deletes a session from the UI, the backend `tmux attach` client will crash, breaking the WebSocket. **The frontend handles this** by explicitly sending a `switch_session` command *before* issuing the `DELETE` API call, ensuring the PTY process stays alive. Do not alter this execution order.

### The Mobile Keyboard Bug (`App.jsx` -> `Keyboard.jsx`)
*   Native mobile OS keyboards (iOS/Android) use predictive text buffers that duplicate and ghost characters inside the `xterm.js` hidden textarea. 
*   **The Fix:** We built a Sovereign HTML Keyboard (`Keyboard.jsx`) that explicitly injects bytes straight into the WebSocket via a custom React UI, entirely bypassing the native DOM inputs. 
*   **Do not remove the `disableStdin` dynamic toggle** in `App.jsx`. It is required to prevent the native keyboard from popping up while the custom keyboard is open.

## 4. Current State & Immediate Next Steps
*   **Completed:** Core WebSocket bridge, Sovereign Keyboard, Dynamic LocalStorage Macros, and Tmux Session Control.
*   **Next Objective (Issue #9):** Build the Web IDE. We need to convert the read-only File Explorer into an editable text area capable of reading/writing back to the backend.
