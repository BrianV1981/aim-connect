# 📖 The Sovereign Wiki

Welcome to the **aim-connect** knowledge base. 

While the root `README.md` is designed to get you up and running as quickly as possible, this local Wiki is designed for deep dives. This is where we document the philosophy, the architectural decisions, security hardening, and the raw cypherpunk ethos behind sovereign computing.

By keeping this Wiki inside the `docs/` folder instead of a separate GitHub Wiki repository, we ensure that the documentation stays perfectly synced with the codebase and remains instantly accessible to any autonomous AI agents operating within this environment.

---

## 🏛️ Architecture & Engineering

Deep dives into the technical stack, how the WebSocket-to-PTY bridge works, agent sandboxing, and the modular backend structure.

*   [**Agent Architecture & Handoff Guide**](./AGENT_ARCHITECTURE.md) - The master reference for new agents: module structure, 4-layer auth, bwrap sandboxing, env vars.
*   [**Sandbox Model (bwrap)**](./SANDBOX_MODEL.md) - Technical spec for Bubblewrap filesystem isolation per agent.
*   [**Multi-Server Architecture**](./MULTI_SERVER_ARCHITECTURE.md) - Hub & Spoke design for managing remote server fleets.

## 🌐 Deployment & Networking

Advanced configuration guides for exposing your sovereign terminal to the outside world safely.

*   [**Startup Guide (Ngrok)**](./STARTUP_GUIDE_NGROK.md) - Manual startup with Ngrok tunneling.
*   [**Startup Guide (Cloudflare)**](./STARTUP_GUIDE_CLOUDFLARE.md) - Alternative tunneling with Cloudflare.

## 🔧 Operations

*   [**Wiring New Clients**](./WIRING_NEW_CLIENTS_SOP.md) - SOP for onboarding new operators into the Joshua Matrix.

## 📁 Archive

Completed sprint dispatches, historical audit reports, and session transcripts are preserved in `docs/archive/`.

---
*Knowledge is power. Hosted knowledge is a dependency. Local knowledge is sovereignty.*
