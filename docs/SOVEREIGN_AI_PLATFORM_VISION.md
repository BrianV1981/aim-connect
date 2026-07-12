# Sovereign A.I. Hosting Platform: The Vision

## 1. Executive Summary
The ultimate goal of this project is to evolve beyond a simple remote server management tool into a **Self-Hosted, Multi-Tenant A.I. Platform**. 

Instead of relying on commercial platforms like OpenAI or Google Gemini, this architecture allows the Operator (Admin) to build, orchestrate, and host specialized autonomous agents on personal sovereign hardware. Crucially, it provides a safe, sandboxed, and highly polished web interface for family members, friends, or employees to interact with these specialized agents without exposing the underlying Linux operating system or file structures.

---

## 2. The "Two-Faced" Architecture
The system will run on a single FastAPI backend, but will serve two entirely distinct web interfaces based on the user's authentication level.

### Face A: The Admin Dashboard (God-Mode)
This is the current `aim-connect` interface. It is strictly reserved for the Architect/Admin.
* **Full Root Access:** Unrestricted terminal emulation via `xterm.js`.
* **File Explorer:** Direct access to read, write, and execute files on the host system.
* **Agent Orchestration:** The ability to spin up new `tmux` sessions, kill run-away processes, and monitor the raw matrix of backend activities.
* **Multi-Server Hub:** The ability to connect to remote Linux nodes (Spokes) to manage distributed hardware.

### Face B: The Client Portal (User Sandbox)
This will be a new, separate React frontend (e.g., `aim-chat`). It mimics the clean, approachable UX of modern chat applications (like ChatGPT) but is secretly powered by raw terminal sessions.
* **Agent Selector:** A dropdown menu where the user selects a specialized agent (e.g., "HOA Assistant", "College Prep Mentor").
* **Chat-Like Interface:** The raw terminal output is stylized to look like a conversational chat log. Input is handled via a standard message text box rather than a raw bash prompt.
* **Strict Containment:** No file explorer. No macro buttons. No ability to spawn new terminals or execute arbitrary bash commands. 
* **Session Isolation:** The user is strictly locked into the specific `tmux` session assigned to their chosen agent.

---

## 3. Security & Role-Based Access Control (RBAC)
To achieve this without running two completely separate backends, the FastAPI server will implement strict Role-Based Access Control.

1. **Dual PIN System:** 
   - The Admin logs in with a Master PIN (granting a Master API Token).
   - Clients log in with a distinct User PIN (granting a restricted User API Token).
2. **API Firewalls:**
   - If a User Token attempts to hit the `/api/files` endpoint, the backend immediately rejects it with a `403 Forbidden`.
   - If a User Token attempts to fetch the list of `tmux` sessions, the backend filters the list and *only* returns sessions that match a specific naming convention (e.g., `agent-hoa-*` or `agent-college-*`).
3. **Chroot / Jail Environments (Optional Future):** For absolute security, client-facing agent scripts can be run inside isolated Docker containers or restricted Linux users, ensuring that even if an A.I. agent hallucinates a destructive command, it has no privileges to harm the host system.

---

## 4. Specialized Use Cases
This architecture allows the Architect to build bespoke solutions for specific users:

* **The Business & HOA Manager:** An agent tailored for the Operator's wife. It has access to specific local databases or RAG (Retrieval-Augmented Generation) documents containing HOA bylaws, business ledgers, or operational guidelines. It can draft emails and summarize financial reports.
* **The Academic Mentor:** An agent tailored for the Operator's daughter preparing for college. It acts as a strict tutor, programmed with specific system prompts to help with SAT prep, essay review, and application deadlines, without doing the work for her.
* **The Media Server Assistant:** An agent for friends/family to easily request new movies or TV shows to be downloaded to a sovereign Plex server, translating natural language into backend automation scripts.

---

## 5. Implementation Roadmap

### Phase 1: Backend Security Hardening (RBAC)
* Introduce a dual-password system in the backend `.env`.
* Update FastAPI routes to require scope-specific API tokens.
* Enforce strict filtering on WebSocket connections (preventing Users from attaching to Admin `tmux` sessions).

### Phase 2: The Client Frontend Scaffold
* Spin up a new React project (or a new route within the existing frontend) designed specifically for the chat experience.
* Implement a simplified login screen.
* Build the "Agent Selector" dropdown.

### Phase 3: Terminal-to-Chat UX Translation
* Modify the frontend parsing logic. Instead of rendering an `xterm.js` canvas, parse the incoming ANSI terminal streams and render them as native HTML chat bubbles.
* Build a seamless input interceptor that takes a user's chat message and securely pipes it into the standard input (stdin) of the underlying `tmux` agent.

### Phase 4: Multi-Tenant Expansion
* Allow the Admin to define distinct profiles (Wife, Daughter) so that logging in with a specific PIN automatically loads a personalized suite of agents.
