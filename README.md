# 🛸 AIM-Connect

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://buymeacoffee.com/brianv1981)

**A Clientless, Sovereign, Web-Based Terminal Multiplexer.**

AIM-Connect transforms any web browser on any device into a secure, root-level control panel for your Linux server. No SSH keys to carry, no terminal apps to download, and no corporate bouncers. Just raw, unrestricted access to your machine from anywhere on Earth.

---

## ⚡ The Philosophy

Standard SSH requires you to have a dedicated terminal emulator app and your private keys stored on your physical device. If you are on a locked-down corporate laptop, a friend's iPad, or a public library computer, you are locked out of your own server.

**AIM-Connect changes the paradigm.**
By wrapping standard `tmux` sessions in a secure WebSocket and serving them through a FastAPI React bridge, you can securely access your running server scripts using nothing but a web browser.

## 🚀 Key Features

*   **Clientless SSH Alternative:** Access your terminal from Safari, Chrome, or Firefox. No App Store downloads required.
*   **The "Immortality" Protocol:** Built on top of `tmux`. Close your browser, put your phone in your pocket, and your scripts keep running. Log back in and instantly re-attach to the live terminal stream.
*   **The Web IDE (Full File Management):** The visual file explorer isn't just read-only. It is a fully functional Sovereign Web IDE. Tap a script to edit its code in a full-screen text area, then hit "Save" to instantly overwrite the file on your Linux server. You can visually create, rename, and delete files/folders right from your phone.
*   **Three-Factor Auth (Zero-Trust):** Secured by three-layer authentication (Stealth Passphrase + Admin Password + Google Authenticator TOTP), strict API token TTLs, TOTP replay protection, Rate Limiting, and IP Allowlisting. No cloud IdP, no accounts — you own every byte of the auth chain.
*   **WebAuthn Biometrics (TouchID/FaceID):** Optionally bypass the TOTP pipeline by registering your device's secure enclave (FaceID/TouchID/YubiKey) for cryptographic passwordless logins.
*   **Optional End-to-End Encryption (E2EE):** Enter a pre-shared 256-bit AES-GCM secret on the login screen. Your keystrokes and terminal outputs are encrypted in the browser using the Web Crypto API *before* they hit the WebSocket, ensuring that even if your SSL reverse proxy is compromised, the traffic remains opaque.
*   **Dynamic Custom Macros:** Build your own interface. Using the "Commander Toolbar", you can add custom macro buttons (e.g. `pm2 logs\r`) on the fly. The app persists your macros securely in your browser's local storage.
*   **Sovereign Mobile Keyboard:** Native iOS and Android keyboards notoriously ruin mobile coding by hijacking the viewport and inserting ghost characters via predictive text. AIM-Connect features a custom, on-screen HTML keyboard with specialized developer keys (`[`, `]`, `|`, `\`) that automatically shrinks the terminal to fit.
*   **Tmux GUI Session Control:** Never lose your place. AIM-Connect features a built-in session manager. Use the native UI dropdown to create new isolated `tmux` workspaces, instantly teleport between running tasks, or permanently destroy environments when you are finished.
*   **Voice Dictation (Speech-to-Terminal):** Talk to your terminal. AIM-Connect includes a full voice recognition engine with verbal action commands ("Enter", "Send", "Execute"), automatic verbal punctuation ("comma", "period", "question mark"), continuous listening mode, and smart spacing. Dictate entire commands hands-free from your phone.
*   **Scrollback & Copy Mode:** Tap "🔍 Scroll/Copy" to capture the full terminal scrollback buffer. Switch between color-rendered ANSI view and a text-selection mode for easy copy-paste on mobile — something native terminal apps struggle with.
*   **Collaborative Sovereignty (Multi-User):** Stop paying for arbitrary "seat licenses" just to share your own hardware. Because `aim-connect` relies on raw OS-level `pty` forks, it natively supports isolated, simultaneous multi-user environments. Share your secure URL and TOTP with a collaborator, and you can both work on the same machine—in the same session or entirely different background sessions—without relying on any third-party account systems or corporate gatekeepers.

---

## 🛠️ Installation & Setup (End-to-End)

### Step 1: Clone and Configure
1. **Clone the repository:**
   ```bash
   git clone https://github.com/BrianV1981/aim-connect.git
   cd aim-connect
   ```
2. **Configure your Environment (`.env`):**
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` to configure your settings:*
   - `NGROK_AUTHTOKEN`: (Required if using ngrok) Your token.
   - `ALLOWED_IPS`: (Optional) A comma-separated list of IPs allowed to access the server (e.g., `192.168.1.5,203.0.113.42`). Leave blank or commented out to allow all IPs.

### Step 2: Build the Frontend
You must compile the React assets before launching the backend.
```bash
cd frontend
npm install
npm run build
cd ..
```

### Step 3: Install Backend Dependencies
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

### Step 4: First-Time Launch & Credential Setup
You must run the startup script directly in your terminal the very first time to capture your credentials.
```bash
./startup.sh
```
**CRITICAL SETUP INSTRUCTION:**
On first launch, AIM-Connect auto-generates three credentials and prints them to the console:

1. **TOTP Secret (QR Code):** A QR code for Google Authenticator / Authy. Scan it with your phone.
2. **Admin Password:** A secure random password. Save it in your password manager.
3. **Stealth Passphrase:** A secret passphrase for the "Name" field on the login screen. Save this too — it's your third auth factor.

> ⚠️ You will **never** see these credentials again after first launch. If you lose them, delete the corresponding `.hash` or `.secret` file and restart to regenerate.
>
> **To reset:** `rm passphrase.hash && ./startup.sh` (or `password.hash` / `totp.secret`)

### Step 5: Accessing the Dashboard
1. Look at your terminal output to find your secure public URL (e.g., `https://random-string.ngrok.app`).
2. Open that URL on your phone or remote browser.
3. You will be greeted by the **AIM Secure** login screen with three fields.
4. Enter your **Stealth Passphrase** in the "Name" field, your **Admin Password**, then your **6-digit TOTP pin** from your authenticator app.
5. You are in!

### Step 6: PWA & Multi-Server Theming (Optional)
AIM-Connect is a Progressive Web App (PWA). You can install it natively on your phone by tapping "Add to Home Screen" in your mobile browser.

If you are running multiple servers (e.g. a Raspberry Pi, a Gaming PC, and a Cloud VPS) and want to have multiple AIM-Connect icons on your phone's home screen, you can easily customize the app name and theme color for each server without modifying any code. 

1. Open your `.env` file on the server.
2. Add the following environment variables:
   ```bash
   AIM_APP_NAME="Gaming Node"
   AIM_APP_COLOR="#8b0000"
   ```
3. Restart the server using `./startup.sh`. The backend will dynamically rewrite the PWA manifest so your phone treats it as a completely unique application!

---

## 🛠️ Development & Hacking Setup

If you want to actively modify the UI, use this split-terminal setup:

1. **Terminal 1 (Backend):**
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. **Terminal 2 (Frontend Dev Server):**
   ```bash
   cd frontend
   npm run dev -- --host
   ```
3. **Terminal 3 (The Tunnel):**
   You must expose the frontend over HTTPS to use secure features. You have two options:
   
   **Option A (Permanent URL - Requires Ngrok Account):**
   ```bash
   ngrok http --url=your-static-domain.ngrok-free.dev 5173
   ```
   **Option B (Quick Temporary URL - No Account Needed):**
   ```bash
   npx -y cloudflared tunnel --url http://localhost:5173
   ```

---

## 🐳 Deployment (Docker)

AIM-Connect ships with a hardened, multi-stage Dockerfile:
- **Stage 1** builds the React frontend (no Node.js in the final image)
- **Stage 2** runs the Python backend as a **non-root user** (`appuser`)
- Includes a `HEALTHCHECK` endpoint at `/api/health`
- Volume mounts are restricted to `workspace/` only — no source code or secrets exposed to the container

**Quick start:**
1. `cp .env.example .env` and fill in your `NGROK_AUTHTOKEN` and `ALLOWED_IPS`.
2. Run `docker-compose up -d --build`.
3. Check the logs (`docker logs aim-connect -f`) to capture your initial TOTP QR Code, admin password, and stealth passphrase.

---

## 🌐 Networking & Tunneling Alternatives (Fully Self-Hosted)

By default, AIM-Connect uses Ngrok or Cloudflare Tunnels to easily bypass home NAT firewalls and provide HTTPS out of the box. However, if you want a **100% self-hosted, sovereign** setup without relying on third-party tunnel providers, you have three excellent options:

### 1. Mesh VPN (Highest Security, No Exposure)
Instead of exposing AIM-Connect to the public internet, install a mesh VPN like **Tailscale** or **WireGuard** on both your server and your phone.
* **Setup:** Bind AIM-Connect to `0.0.0.0` or your Tailscale IP. Access it on your phone via the VPN IP (e.g., `http://100.x.x.x:8000`).
* **Pros:** Zero public exposure, impossible to port-scan, and HTTPS is technically unnecessary since the VPN tunnel provides native End-to-End Encryption.
* **Cons:** Requires the VPN app to be active on your client device.

### 2. Nginx + Dynamic DNS + Port Forwarding
If you want public browser access from any device (e.g., a library computer) without installing a VPN app.
* **Setup:** Register a free Dynamic DNS domain (like DuckDNS). Forward port `443` on your home router to your server. Use **Nginx** as a reverse proxy with a free Let's Encrypt SSL certificate to terminate HTTPS and forward traffic to `localhost:8000`.
* **Pros:** Completely sovereign, accessible anywhere, no third-party traffic inspection.
* **Cons:** Exposes an open port on your home network (though AIM-Connect's 3FA protects the application layer).

### 3. VPS Reverse Tunnel (FRP or SSH)
If you cannot port-forward (e.g., Carrier-Grade NAT, strict corporate firewalls) but still want a public URL without Ngrok.
* **Setup:** Rent a cheap $5/mo cloud VPS. Run **FRP (Fast Reverse Proxy)** or an SSH reverse tunnel from your home server to the VPS. Point your domain to the VPS.
* **Pros:** Bypasses all firewalls, completely self-hosted infrastructure, hides your true home IP address.

---

## 📖 How to Use the UI

*   **Session Manager (Top Bar):** Use the dropdown to swap between active Tmux sessions. Tap `+` to spawn a new isolated workspace, or `🗑️` to kill the current one.
*   **File Explorer:** Tap `📁 Files` in the header to toggle the full-screen file browser. Navigate directories, tap any text file to open it in the built-in editor, then hit `Save` to write changes directly to the server. Create new files/folders with the `+ File` / `+ Dir` buttons.
*   **Commander Toolbar:** Your custom macro buttons live here. Tap `⚙️` to open the Macro Library where you can create, edit, pin/unpin, and delete macros. Each macro can be local (📱, stored in your browser) or server-synced (☁️, shared across devices). Add `\r` to a command to auto-press Enter.
*   **Sovereign Keyboard:** Tap `⌨️` to toggle the custom on-screen keyboard. It suppresses the native virtual keyboard to prevent autocorrect and ghost characters. Includes specialized keys for `Tab`, `Esc`, `Ctrl`, pipes, brackets, and more. Choose between Standard and Hacker (terminal keys) layouts in Settings.
*   **Voice Dictation:** Tap `🎤 Voice` to start speech-to-terminal input. Say "Enter", "Send", or "Execute" to submit commands verbally. Use verbal punctuation ("comma", "period", "question mark") for natural dictation. Enable Continuous Loop mode in Settings to keep the mic hot.
*   **Scroll/Copy Mode:** Tap `🔍 Scroll/Copy` to capture the terminal scrollback. Switch between Color View (rendered ANSI) and Select Text mode for easy copy-paste on mobile. Scroll to the bottom to auto-exit.
*   **Settings:** Tap `⚙️ Settings` to configure keyboard layout, auto-capitalization, terminal font size, terminal theme (Standard / High Contrast / Hacker Green), keyboard feedback (audio/haptic/off), and voice dictation options.
*   **WebAuthn Biometrics:** Inside the Settings modal, tap "Register FaceID / TouchID" to bind your current device. Once bound, you can simply type your Name on the login screen and tap "Login with FaceID" to bypass the password/TOTP fields entirely.
*   **End-to-End Encryption:** On the login screen, fill out the "E2EE Secret (Optional)" field with a custom string (e.g., `my_secret_key`) *before* logging in. You must export this exact same string on your server as an environment variable (`export E2EE_SECRET="my_secret_key"`) before starting `./startup.sh`. If the secrets match, all WebSocket traffic is locally AES-GCM encrypted. To deactivate it, just leave the field blank and don't export the variable on the server.

---

> [!CAUTION]
> **FULL ROOT-LEVEL TERMINAL ACCESS**
> AIM-Connect grants full, unbridled terminal execution rights to whatever user executes the backend script. This is the equivalent of exposing SSH to the web.
> 
> **MANDATORY SECURITY PROTOCOLS:**
> 1. **HTTPS IS STRICTLY REQUIRED:** You must ALWAYS run this application behind a secure SSL/TLS tunnel (like Ngrok, Cloudflare Tunnels, or an Nginx Reverse Proxy). If you run this over raw HTTP, your keystrokes (and TOTP codes) can be trivially intercepted.
> 2. **IP Allowlisting:** Strongly recommended. Configure `ALLOWED_IPS` in your `.env` to restrict access to trusted networks.
> 3. **Basic Path Traversal Protection:** While the web-UI file endpoints have basic path-traversal blocks to keep navigation scoped, the terminal itself has no such restrictions. 
> 4. **Protect Your Keys:** The `.env` file containing your Ngrok auth tokens and backend secrets must never be committed to source control.

---

## 🧪 Testing

AIM-Connect includes a full pytest test suite covering authentication and security:

```bash
cd backend
source venv/bin/activate
pip install -r requirements-test.txt
python -m pytest tests/ -v
```

**16 tests** covering:
- Three-factor auth flow (passphrase + password + TOTP)
- Individual factor rejection (wrong passphrase, wrong password, wrong TOTP)
- TOTP replay protection
- Rate limiting and lockout
- Session name validation
- Path traversal prevention
- Token expiry and unauthenticated access

Tests also run automatically via GitHub Actions CI on every push and PR to `master`.

---
*Built with sovereignty in mind.*

☕ **Support the project:** [Buy Me a Coffee](https://buymeacoffee.com/brianv1981)

<!-- AIM_ECOSYSTEM_START -->
### 🧬 The A.I.M. Ecosystem

Modular A.I.M. (Actual Intelligent Memory) repositories. **Flagship engine: [aim-agy](https://github.com/BrianV1981/aim-agy).**

**Active vessels (CLI hosts):**
- **[aim-agy](https://github.com/BrianV1981/aim-agy)** — Core engine / *soul* (Antigravity CLI). *Flagship.* Shared nested `aim-agy_os/` ships here first.
- **[aim-grok](https://github.com/BrianV1981/aim-grok)** — Grok CLI vessel (hybrid memory, GitOps, wiki, fleet orchestration tooling).
- **[aim-opencode](https://github.com/BrianV1981/aim-opencode)** — OpenCode CLI vessel.
- **[aim-codex](https://github.com/BrianV1981/aim-codex)** — OpenAI Codex CLI vessel (greenfield nested soul + Codex overlays; primary `main`).

**Tools & workspaces:**
- **[aim-connect](https://github.com/BrianV1981/aim-connect)** — Self-hosted remote workspace web UI.
- **[aim-tmux-dashboard](https://github.com/BrianV1981/aim-tmux-dashboard)** — Terminal multi-session monitor.
- **[aim-browser](https://github.com/BrianV1981/aim-browser)** — Headed Chromium CDP engine + browser **skill suite**.
- **[aim-google](https://github.com/BrianV1981/aim-google)** — Google Workspace CLI (Gmail, Drive, Calendar, …).
- **[aim-flight-recorder](https://github.com/BrianV1981/aim-flight-recorder)** — Forensic Markdown session extractor.
- **[aim-boardroom](https://github.com/BrianV1981/aim-boardroom)** — Multi-agent orchestration room (OS multiplexing + artifacts).
- **[aim-skills](https://github.com/BrianV1981/aim-skills)** — **Skills index / multi-CLI install registry** (agy, grok, opencode, codex).

**DNA, comms & lore:**
- **[aim-coagents](https://github.com/BrianV1981/aim-coagents)** — DNA bank for sovereign co-agent blueprints.
- **[aim-knowledge](https://github.com/BrianV1981/aim-knowledge)** — Public Obsidian vault / deep-lore archive.
- **[aim-chalkboard](https://github.com/BrianV1981/aim-chalkboard)** — Optional cross-host async git mailbox (PoC; default same-host comms = **aim-communicate** skill).

**Deprecated / not maintained:**
- **[aim](https://github.com/BrianV1981/aim)** — Original **Gemini CLI** framework. Deprecated after loss of practical subscription access; **Great Migration → aim-agy**.
- **[aim-swarm](https://github.com/BrianV1981/aim-swarm)** — Legacy Python swarm factory → use **aim-coagents** + aim-agy spawn.
- **aim-claude / Anthropic-line vessels** — **Done.** Operator does not develop against Anthropic. Use **aim-agy / aim-grok / aim-opencode / aim-codex**.

Full map: see **aim-skills** `docs/AIM_ECOSYSTEM_MAP.md` or Operator artifact `AIM_ECOSYSTEM_MAP.md`.
<!-- AIM_ECOSYSTEM_END -->

