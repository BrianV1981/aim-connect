# 🛸 AIM-Connect

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
*   **Zero-Trust Security:** Secured by dual-layer authentication (Admin Password + Google Authenticator TOTP), strict API token TTLs, Rate Limiting, and IP Allowlisting.
*   **Dynamic Custom Macros:** Build your own interface. Using the "Commander Toolbar", you can add custom macro buttons (e.g. `pm2 logs\r`) on the fly. The app persists your macros securely in your browser's local storage.
*   **Sovereign Mobile Keyboard:** Native iOS and Android keyboards notoriously ruin mobile coding by hijacking the viewport and inserting ghost characters via predictive text. AIM-Connect features a custom, on-screen HTML keyboard with specialized developer keys (`[`, `]`, `|`, `\`) that automatically shrinks the terminal to fit.
*   **Tmux GUI Session Control:** Never lose your place. AIM-Connect features a built-in session manager. Use the native UI dropdown to create new isolated `tmux` workspaces, instantly teleport between running tasks, or permanently destroy environments when you are finished.
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

### Step 4: First-Time Launch & Google Authenticator Setup
You must run the startup script directly in your terminal the very first time to capture your TOTP QR Code.
```bash
./startup.sh
```
**CRITICAL SETUP INSTRUCTION:**
1. Look at your server terminal window. AIM-Connect will generate and print a massive **QR Code** directly in the console.
2. Open **Google Authenticator** or **Authy** on your phone.
3. Scan the QR code. You will see a new entry labeled `AIM-Connect`.
4. (The system will securely save your secret token locally. You will never see the QR code again.)

### Step 5: Accessing the Dashboard
1. Look at your terminal output to find your secure public URL (e.g., `https://random-string.ngrok.app`).
2. Open that URL on your phone or remote browser.
3. You will be greeted by the **AIM Secure Pad**.
4. Check your authenticator app, type your Admin Password and your 6-digit pin into the pad, or use the convenient **Clipboard Icon (📋)** on mobile to paste the code.
5. You are in!

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

AIM-Connect is fully containerized. For a production deployment on a VPS:
1. `cp .env.example .env` and fill in your `NGROK_AUTHTOKEN` and `ALLOWED_IPS`.
2. Run `docker-compose up -d --build`.
3. Check the logs (`docker logs aim-connect -f`) to scan your initial TOTP QR Code!

---

## 📖 How to Use the UI

*   **Session Manager (Top Bar):** Use the dropdown menu to swap between active Tmux sessions. Type a name and click "Create" to spawn a new isolated workspace.
*   **File Explorer (Left Sidebar):** Navigate your server's filesystem. Click on any text file to open it in the Web IDE. Click the 💾 icon in the IDE to save changes directly to the server.
*   **Commander Toolbar (Bottom Bar):** Click the `+` icon to create a new Macro Pill. Give it a name (e.g., "Deploy") and a command (e.g., `npm run deploy\r`). The `\r` sends the Enter key. Tap the pill anytime to instantly execute the command in your active terminal.
*   **Virtual Keyboard:** If you are on mobile, tap the keyboard icon to open the custom developer keyboard. It protects you from autocorrect bugs and provides quick access to brackets, pipes, and slash keys.

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
*Built with sovereignty in mind.*

☕ **Support the project:** [Buy Me a Coffee](https://buymeacoffee.com/brianv1981)
