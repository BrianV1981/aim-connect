# J.O.S.H.U.A. Architecture & Sandboxing

J.O.S.H.U.A. is a sovereign AI orchestrator designed to run headless LLM agent instances (using the OpenCode CLI) securely. It enforces strict boundary constraints via OS-level sandboxing while maintaining real-time communication bridges to web frontends.

## 1. Fleet Agents & Boundary Sandboxing (`bwrap`)
JOSHUA spawns distinct instances of OpenCode within isolated bubblewrap (`bwrap`) environments.
- **Primary Node:** Has broader access (`harness-opencode`).
- **Fleet Agents:** Restricted sub-sessions. They operate strictly within `fleet_workspaces/<sub_id>`.
- The `bwrap` container mounts the host filesystem as read-only (`--ro-bind / /`), meaning any attempt by a sandboxed agent to modify files outside its explicitly bound workspace directory (`--bind`) will physically fail at the OS level with a `Read-only file system` error.

## 2. Interactive Permission Bypassing (`--auto`)
Because OpenCode is an interactive CLI tool, it natively pauses execution to present permission modals (e.g., `△ Permission required: Access external directory`) when an agent attempts to violate its directory constraints. 
- In a headless setup running over `tmux`, these UI modals block execution indefinitely and cause the backend WebSocket bridging to hit inactivity timeouts (120 seconds).
- **The Solution:** The OpenCode process is launched with the `--auto` flag. This automatically approves permissions, bypassing the modal. Because the agent is encased in `bwrap`, it does not grant actual file access; instead, the action hits the OS wall and immediately fails, allowing the agent to see the failure and continue chatting without hanging the connection.

## 3. Real-Time SQLite WAL Polling
The JOSHUA backend natively intercepts the conversation history in real-time by polling the active SQLite database (`opencode.db`) produced by the sandboxed OpenCode process.
- **The Challenge:** OpenCode uses SQLite in Write-Ahead Log (WAL) mode. When the Python backend queries the database, standard connections can inadvertently unlink or delete the `-wal` and `-shm` files upon closure (`conn.close()`), destroying the open file descriptors of the sandboxed OpenCode process and crashing it ("Connection closed by remote node").
- **The Solution:** The backend MUST connect to the SQLite database strictly using URI parameters `?mode=ro`. A read-only SQLite connection (`mode=ro`) correctly bypasses acquiring disruptive locks and inherently avoids checkpointing or deleting the `-wal` file when the connection is closed.
- **Warning:** Do *not* use `nolock=1` in the connection string. While it prevents lock collisions, `nolock=1` entirely disables SQLite's ability to read `-wal` files. This causes complex `JOIN` queries against the live database to fail with an `unable to open database file` error.

## 4a. Customer sandbox mail
bwrap does **not** inherit host mail secrets. `LEADDEED_SMTP_*` + `LEADDEED_MAIL_FROM` must live in aim-connect `.env` and be `--setenv` into every harness (#186). Agents must use those vars and `OPERATOR_EMAIL` as the To: address. Never ask the customer for SMTP host/password; never print `LEADDEED_SMTP_PASS`. Existing tmux sessions need a reconnect to pick up env.

## 4. Live egress is not History
`/history` and the live `/analyst` spinner are different readers. Grok live output lives in `grok_data/sessions/**/chat_history.jsonl`, not AGY `transcript.jsonl`. Stream **every** visible assistant turn (preview + later real answer). Full map: [harness_live_egress.md](harness_live_egress.md) (#183).
