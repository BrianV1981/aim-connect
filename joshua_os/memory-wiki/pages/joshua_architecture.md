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

## 4b. Joshua pre-chat gate (#189 / aim-ld #220)
Customers: OpenCode or Grok only (`admin-cli` is allowlisted — Brian + temp testers). Last harness (`leaddeed_joshua_harness`) is restored, then a **verification homepage** runs before the input unlocks.

**Oliveira vs Willvas (2026-08-13):** folder names did **not** block send. `mikeywillvas2018` (`op_a562`) ingested on OpenCode with no Grok account (API only). `michaeloliveira84` (`op_761e`) hung because (1) Grok device-auth ran in tmux and never appeared in Joshua, (2) `/oauth/init` wrote a real token to `agent-michaeloliveira84_icloud_com/grok_data/` while the CLI mounts `agent-op_761e…/grok_data/`, (3) spawn minted a **0-byte** `auth.json` that Grok treats as “need login”, (4) AGY later *did* reply (`Hi` same-second; zip tools ~2m51s) but the spinner only clears on non-JSON agent text.

**Rules:**
- **Grok:** API key **or** `grok_data/auth.json` &gt; 100 bytes (`AUTH_MIN_BYTES`) on the **registry `op_*` seat**. Else device-auth popup (URL + `XXXX-XXXX`). Never mint a 0-byte `auth.json`. Never delete a good token unless `force=1`. Do not reauth every visit.
- `/api/joshua/ready?token=&harness=` — JWT `e` → `resolve_workspace_id_for_email`. Grok `ready` iff disk state `ok`. OpenCode/admin-cli: disk `ready=true`; process gate is WS `auth_success`.
- `/api/grok/oauth/init` and `/status` use the same JWT → `op_*` path. Status is **disk-first** (survives uvicorn restart), then in-memory `grok_oauth_processes`. Log `GROK_DEVICE_AUTH seat=op_…`.
- Gate is auth/process ready, **not** “the model already answered.” Long AGY/Grok tool work can still look idle — that is a later ⏳ ticket, not this gate.

**Live closeout (Operator `brianv1981`, 2026-08-13):** Grok OAuth + Grok chat worked. Then two *different* failures:

1. **AGY first submit after harness switch is a lie.** Switch Grok → `admin-cli`, type `hello`: Joshua paints the bubble + spinner; tmux does **not** have the line. Leave `/analyst` and come back → resend works. Cause: `ws_handler` sends `auth_success` as soon as the JWT verifies, **before** `kill_all_user_sessions` + tmux spawn. Public `ingest_task` pastes immediately. The admin PTY path waits ~4s on `is_new_session`; the Joshua path does not. UI `Connected` ≠ “AGY is at a prompt.” Reload is a workaround, not a fix. Track a follow-up; do not treat this as a folder-name or gate-auth bug.
2. **OpenCode `hello` did reach tmux.** The free Gemini key stalled. That is provider quality, not a dropped `submit`. Next product slice is aim-ld **#163**: persist one Gemini key + one DeepSeek key, bind model → provider. Do not open a duplicate ticket.

## 4a. Customer sandbox mail (#186)
bwrap does **not** inherit host mail secrets. SoT is aim-connect `.env` (`LEADDEED_SMTP_HOST/PORT/USER/PASS/SECURE`, `LEADDEED_MAIL_FROM`) — same LeadDeed Bluehost mailer as Vercel. `sandbox_smtp.bwrap_smtp_setenv()` adds quoted `--setenv` on **every** harness (opencode / grok / agy / admin-cli). `/tmp/bwrap_cmd.log` is redacted.

- Send **to** `OPERATOR_EMAIL` in the workspace `.env` / AGENTS.md.
- **Never** ask the customer for SMTP host/user/password. **Never** print `LEADDEED_SMTP_PASS`. If vars are missing, say the sandbox was not injected and stop.
- Existing tmux/bwrap sessions do **not** pick up new env — recycle the harness session after a deploy.
- SMS is not wired.

## 4. Live egress is not History
`/history` and the live `/analyst` spinner are different readers. Grok live output lives in `grok_data/sessions/**/chat_history.jsonl`, not AGY `transcript.jsonl`. Stream **every** visible assistant turn (preview + later real answer). Full map: [harness_live_egress.md](harness_live_egress.md) (#183).
