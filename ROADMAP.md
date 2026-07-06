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

### 7. "Quick-Action" Prompt Pills
*   **The Problem:** While the Commander Toolbar provides single-character macros (like `^C`), users still have to type out long, repetitive commands like `git status` or `npm run dev` on a mobile keyboard.
*   **The Vision:** Add a horizontally scrolling drawer of sleek "Pills" at the bottom of the screen. These would be fully customizable, allowing users to tap a pill to instantly execute full string commands.

### 8. OS-Level Context Menus
*   **The Problem:** To launch the server, a user must open a terminal, CD into the project folder, and run `./startup.sh`.
*   **The Vision:** Include an installation script that adds an OS-level right-click context menu (e.g., for Nautilus on Linux or Explorer on Windows). A user can simply right-click any folder on their machine and select "Start AIM-Connect Here" to instantly spawn a session in that directory.

### 9. The Unkillable Watchdog (Auto-Recovery & Updates)
*   **The Problem:** If the server crashes, or if the user pushes new code from their phone, they have to manually restart the backend or run `git pull`.
*   **The Vision:** Provide a background daemon (cron job) that acts as a watchdog. Every 5 minutes, it checks if the server is running. If it crashed, it resurrects it. Furthermore, if it detects a new git commit on the active branch, it automatically pulls the code and gracefully restarts the server, enabling self-healing deployments.

### 10. Auto-Generated SSL for Progressive Web App (PWA) Support
*   **The Problem:** Mobile browsers like Safari enforce strict security restrictions. Without `https://`, we cannot utilize advanced mobile features like Push Notifications, Voice Dictation, or adding the web app to the home screen.
*   **The Vision:** The backend will automatically generate self-signed SSL certificates on its very first run. This allows the user to tap "Add to Home Screen" on iOS/Android, turning AIM-Connect into a full-screen, native-feeling app that bypasses the App Store entirely.

### 11. Visual "Unified Diffs" for Code Review
*   **The Problem:** Running `git diff` in a mobile terminal emulator is visually noisy and difficult to read when reviewing large files.
*   **The Vision:** In our upcoming Git GUI panel, integrate a dedicated Code Review modal. This view will render syntax-highlighted, unified diffs (with green additions and red deletions) mimicking the beautiful UI of a GitHub Pull Request, directly on your phone.

---

## 💎 Monetization Strategy (Sovereignty First)

AIM-Connect is built on the absolute philosophy of zero paywalls. Every feature, including the advanced server dashboard, metrics, and IDE, will always remain 100% free and open-source. We will never lock core functionality behind a subscription.

To build a sustainable project without compromising these ideals, our monetization strategy focuses strictly on convenience and enterprise-level consulting:

### 1. Managed Zero-Config Tunnels
*   **The Concept:** Setting up secure remote access (like Cloudflare Tunnels, Ngrok, or Reverse Proxies) requires technical know-how and maintenance. We plan to offer an official, lightning-fast, highly secure relay hosting service. Users simply pay a small subscription for the absolute convenience of a secure, instant URL without ever touching DNS records or configuring their router. 

### 2. Consulting & Custom Development
*   **The Concept:** As adoption grows, businesses and power-users will inevitably require bespoke integrations or custom deployments tailored to their specific infrastructure. We will leave the door open to be hired as lead advisors or developers to implement and support custom, enterprise-scale features on an independent contract basis.

---
*Note: This roadmap is a living document. Ideas may be re-prioritized, dropped, or expanded upon as the project evolves.*
