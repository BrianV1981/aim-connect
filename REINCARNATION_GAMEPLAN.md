# Reincarnation Gameplan: aim-connect

## 1. Commander's Summary
We have been working on the `aim-connect` repository, a sovereign, web-based mobile terminal that proxies directly into tmux sessions. 
Recently, we accomplished major architectural planning and implementation:
- Drafted a "Hub and Spoke" Multi-Server Dashboard architecture.
- Wrote two definitive markdown guides (`docs/MULTI_SERVER_ARCHITECTURE.md` and `docs/SELF_HOSTED_PROXY_ARCHITECTURE.md`) documenting how to use Ngrok, Cloudflare, Tailscale, or a Self-Hosted Reverse Proxy (Caddy) for sovereign fleet management.
- Completely implemented **Hybrid Macro Storage (Local + Server-Side)** (Issue #21). The React frontend now supports saving Prompt Pills locally (`localStorage`) or globally (synced to the FastAPI backend at `backend/macros.json`), complete with visual indicators (`☁️` vs `📱`) and syncing logic.
- The user took a long break and requested a reincarnation.

## 2. Tactical State
- **Current Repo:** `/home/kingb/aim-connect`
- **Active Branches:** `master`
- **Recent Commits:** The Hybrid Macro Storage was successfully pushed to `master` and the backend uvicorn server was restarted inside the `aim_backend` tmux session.
- **Outstanding Roadmap:** The `ROADMAP.md` has 13 major technical features. The remaining high-priority features discussed were: 
  1. Multi-Server Dropdown Selector (UI for Hub & Spoke)
  2. PWA Auto-SSL (Add to Home Screen)
- **WebAuthn** was explicitly rejected by the user for privacy/sovereignty concerns.

## 3. Localized Directory Map
- `/home/kingb/aim-connect/ROADMAP.md`: Master list of 13 upcoming features.
- `/home/kingb/aim-connect/frontend/src/App.jsx`: The core React UI logic (recently modified for Macro syncing).
- `/home/kingb/aim-connect/backend/main.py`: The FastAPI server logic (recently modified with `/api/macros`).
- `/home/kingb/aim-connect/docs/`: Contains the architecture guides.

## 4. Epistemic Warnings
- **DO NOT** suggest or implement biometrics (WebAuthn/FaceID/TouchID). The user explicitly vetoed this due to sovereignty and privacy concerns. Stick to TOTP (Google Authenticator).
- **Architecture Priority:** The user values true sovereignty. They prefer setups where they control the hardware, domain, and data (e.g., self-hosted reverse proxies over third-party tunnels).
- **Macros:** If touching macros, remember the `macroLibrary` state contains both local and server macros. Server macros have the `isServer: true` property.

## 5. Immediate Next Action
- Greet the user upon waking up.
- Ask the user which feature they want to tackle next from the `ROADMAP.md`. Highly recommend the **Multi-Server UI Dropdown** (Hub & Spoke), or the **PWA Auto-SSL (Add to Home screen)** feature as the next step.
