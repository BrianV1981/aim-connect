# AIM-Connect: Future Roadmap

This document outlines potential future enhancements and feature ideas for AIM-Connect. These concepts are designed to push the boundaries of what a Sovereign Mobile Web Terminal can do, prioritizing mobile developer experience (DX), security, and seamless server management.

Many of these ideas are inspired by analyzing cutting-edge remote mirroring tools and identifying friction points in mobile-first coding.

## 🎯 Proposed Features & Enhancements

### 1. Touch-Friendly Git GUI Panel
*   **The Problem:** Executing complex `git add`, `git commit`, and `git push` workflows on a mobile on-screen keyboard is prone to typos and frustration.
*   **The Vision:** Introduce a dedicated "Git" tab next to the File Explorer. It will provide a visual interface showing modified, staged, and untracked files. Users can tap checkboxes to stage files, view inline diffs, and type commit messages into a standard input field before hitting a large "Commit & Push" button.

### 2. Telegram / Push Notification Integration
*   **The Problem:** Users often kick off long-running compile tasks, AI scripts, or server updates in a Tmux session, but have no way of knowing when they finish without constantly checking their phone.
*   **The Vision:** Integrate a Telegram Bot (or standard web push notifications). The backend could monitor specific Tmux sessions or allow the user to append a command like `&& alert_me` which will fire a push notification to their phone when the task completes or if it crashes.

### 3. QR Code "Magic Handoff" Launcher
*   **The Problem:** Booting up the server and then manually typing a local IP address or a long Cloudflare Tunnel URL into a mobile browser is tedious.
*   **The Vision:** Enhance the `startup.sh` script to automatically orchestrate the backend, frontend, and tunnel (ngrok/Cloudflare). Once running, the terminal will print a massive ASCII QR code containing the live secure URL. The user simply points their phone camera at their monitor to instantly transfer their session to mobile.

### 4. Real-Time System Metrics Dashboard (Stats Panel)
*   **The Problem:** Server administration currently requires running `htop` or `top` in the terminal, which can look cluttered and be difficult to read on a small mobile screen.
*   **The Vision:** Add a "Metrics" or "Stats" tab to the UI. This panel would poll the backend for system data and render beautiful, touch-friendly gauges and line charts for CPU usage, RAM allocation, Disk Space, and Server Uptime. 

### 5. Advanced Zero-Trust Security Hardening (CSP & Headers)
*   **The Problem:** Exposing a root-level terminal to the internet requires absolute paranoia regarding XSS and CSRF attacks.
*   **The Vision:** Implement strict Content Security Policy (CSP) headers in the FastAPI backend. We will completely ban inline JavaScript on the frontend, enforcing a rigid asset-loading policy to ensure the web application is cryptographically hardened against injection attacks.

### 6. Terminal Output Timeline / History Buffer
*   **The Problem:** If the WebSocket connection drops, or if the user scrolls too far up, mobile terminal interfaces can struggle with infinite scrollback history.
*   **The Vision:** Implement an intelligent buffer that allows users to seamlessly scroll back through thousands of lines of previous Tmux output without bogging down the DOM.

---
*Note: This roadmap is a living document. Ideas may be re-prioritized, dropped, or expanded upon as the project evolves.*
