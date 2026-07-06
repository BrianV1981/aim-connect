# 🛸 AIM-Connect

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
*   **Zero-Trust Security:** Secured by a hardened Google Authenticator (TOTP) pin-pad. No passwords to brute-force.
*   **Dynamic Custom Macros:** Build your own interface. Using the "Commander Toolbar", you can add custom macro buttons (e.g. `pm2 logs\r`) on the fly. The app persists your macros securely in your browser's local storage so your personal toolbelt is always ready.
*   **Sovereign Mobile Keyboard:** Native iOS and Android keyboards notoriously ruin mobile coding by hijacking the viewport and inserting ghost characters via predictive text. AIM-Connect features a custom, on-screen HTML keyboard with specialized developer keys (`[`, `]`, `|`, `\`) that automatically shrinks the terminal to fit, completely bypassing mobile keyboard bugs.
*   **Tmux GUI Session Control:** Never lose your place. AIM-Connect features a built-in session manager. Use the native UI dropdown to create new isolated `tmux` workspaces, instantly teleport between running tasks, or permanently destroy environments when you are finished.

## 🏗️ Architecture

AIM-Connect is built for speed and simplicity:
*   **Backend:** Python `FastAPI` (Handling TOTP Auth, File System I/O, and WebSocket routing).
*   **Terminal Engine:** `tmux` (Providing session detachment and persistence).
*   **Frontend:** `React` + `Vite` + `xterm.js` (Rendering a pixel-perfect terminal in the DOM).

## 🛠️ Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/BrianV1981/aim-connect.git
   cd aim-connect
   ```
2. **Install Backend Dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
3. **Install Frontend Dependencies:**
   ```bash
   cd frontend
   npm install
   ```
4. **Generate your Secret Key & Setup TOTP:**
   (Run the setup script to generate your QR code for Google Authenticator)
5. **Launch the Bridge:**
   ```bash
   ./startup.sh
   ```

## 🛡️ Security Warning
AIM-Connect grants full, unbridled terminal access to the user executing the backend script. It is **highly recommended** to route AIM-Connect through a secure tunnel (like Ngrok or Cloudflare Tunnels) with HTTPS enabled, and ensure your TOTP secret is kept strictly confidential.

---
*Built with sovereignty in mind.*
