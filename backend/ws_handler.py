import json
import os
import sys
import re
import time
import asyncio
import struct
import fcntl
import termios
import subprocess
import pty
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from main import (
    AIM_CONNECT_ROOT, ENABLE_E2EE, E2EE_SECRET, ALLOWED_IPS, 
    auth_attempts, LOCKOUT_TIME, MAX_AUTH_ATTEMPTS, VALID_API_TOKENS,
    AGENT_WORKSPACES_DIR, HOME_DIR
)
from e2ee import encrypt_bytes, decrypt_message
from routes_sessions import kill_all_user_sessions
import logging

router = APIRouter()
logger = logging.getLogger("aim-connect")

def resolve_workspace_id_for_email(email: str) -> str:
    """Map login email → agent_workspaces/agent-{id}/ (#184).

    Prefer LeadDeed operators registry (opaque op_* ids). Fallback: sanitize email
    for seats not yet migrated. Magic-link entitlement remains email-only on the
    dashboard; this only picks the filesystem workspace.
    """
    try:
        aim_ld_scripts = os.environ.get("AIM_LD_SCRIPTS", os.path.join(os.path.dirname(AIM_CONNECT_ROOT), "aim-ld", "scripts"))
        if aim_ld_scripts not in sys.path:
            sys.path.insert(0, aim_ld_scripts)
        from core.identity import resolve_workspace_id_for_email as _resolve

        return _resolve(email)
    except Exception as e:
        logger.warning(f"operator registry resolve failed for {email!r}: {e}; using sanitize fallback")
        return re.sub(r"[^a-zA-Z0-9]", "_", (email or "").strip().lower())


def legacy_sanitize_email(email: str) -> str:
    """Pre-#184 path form used by the dashboard for agent IDs (email slug)."""
    return re.sub(r"[^a-zA-Z0-9]", "_", (email or "").strip().lower())


async def ws_send_app_text(websocket: WebSocket, text: str) -> bool:
    """Send application text (optionally E2EE). Returns False if the socket is dead."""
    try:
        if ENABLE_E2EE and E2EE_SECRET:
            await websocket.send_bytes(encrypt_bytes(text.encode("utf-8"), E2EE_SECRET))
        else:
            await websocket.send_text(text)
        return True
    except Exception as e:
        logger.warning(f"ws_send_app_text failed: {e}")
        return False

async def ws_drain_client_or_sleep(websocket: WebSocket, timeout: float = 2.0):
    """Await inbound client frame up to timeout so pings are drained during long waits.

    Returns:
      None — timeout or drained ping/noise
      dict — parsed JSON message (caller may ignore mid-wait submits)
    Raises WebSocketDisconnect if the client closed.
    """
    try:
        message = await asyncio.wait_for(websocket.receive_text(), timeout=timeout)
    except asyncio.TimeoutError:
        return None
    try:
        if ENABLE_E2EE and E2EE_SECRET and not str(message).strip().startswith("{"):
            message = decrypt_message(message, E2EE_SECRET)
        data = json.loads(message)
        if isinstance(data, dict) and data.get("type") == "ping":
            return None
        return data if isinstance(data, dict) else None
    except WebSocketDisconnect:
        raise
    except Exception:
        return None


def set_pty_size(fd: int, rows: int, cols: int) -> None:
    """Resizes the underlying pseudo-terminal using an ioctl syscall."""
    winsize = struct.pack("HHHH", rows, cols, 0, 0)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """
    Primary WebSocket handler for streaming terminal I/O.
    Enforces a strict 10-second API Token authentication window on connection.
    If the client does not send a valid token within 10s, the socket is dropped.
    Spawns a PTY (pseudo-terminal) via os.fork() to bridge the WebSocket 
    into a native tmux session, allowing persistent background execution.
    """
    client_ip = websocket.client.host
    if ALLOWED_IPS:
        allowed = [ip.strip() for ip in ALLOWED_IPS.split(",")]
        if client_ip not in allowed:
            logger.warning(f"Rejected connection from unauthorized IP: {client_ip}")
            await websocket.close(code=1008, reason="IP not allowed")
            return

    # Rate limiting check
    now = time.time()
    if client_ip in auth_attempts:
        attempts, lock_time = auth_attempts[client_ip]
        if lock_time and now < lock_time:
            logger.warning(f"Rate limited IP: {client_ip}")
            await websocket.close(code=1008, reason="Too many attempts. Try again later.")
            return
        elif lock_time and now >= lock_time:
            auth_attempts[client_ip] = (0, None)

    await websocket.accept()

    # Step 1: Enforce authentication
    authenticated = False
    target_session_override = None
    client_gemini_api_key = None
    client_gemini_model = None
    client_grok_thinking = None
    client_harness = "opencode"
    try:
        auth_message = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
        data = json.loads(auth_message)
        if data.get("type") == "auth":
            token = data.get("token", "")
            sub_session_id = data.get("sub_session_id")
            client_gemini_api_key = data.get("gemini_api_key")
            client_gemini_model = data.get("gemini_model")
            client_grok_thinking = data.get("grok_thinking")
            client_harness = data.get("harness", "opencode")
            
            if token in VALID_API_TOKENS:
                token_data = VALID_API_TOKENS[token]
                expires = token_data if isinstance(token_data, (int, float)) else token_data.get("expires", 0)
                if time.time() > expires:
                    del VALID_API_TOKENS[token]
                else:
                    authenticated = True
                    auth_attempts[client_ip] = (0, None)
            elif "." in token:
                import base64
                import hmac
                import hashlib
                import re
                parts = token.split(".")
                if len(parts) == 2:
                    payload_b64, signature_b64 = parts

                    secret = os.environ.get("LEADDEED_DOWNLOAD_SIGNING_SECRET", "")
                    if secret:
                        def pad_b64(data):
                            return data + "=" * (-len(data) % 4)
                        try:
                            expected_mac = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).digest()
                            expected_b64 = base64.urlsafe_b64encode(expected_mac).decode().rstrip("=")
                            if signature_b64.rstrip("=") == expected_b64:
                                payload = json.loads(base64.urlsafe_b64decode(pad_b64(payload_b64)).decode())
                                email = payload.get("e")
                                exp = payload.get("exp")
                                # Require email and exp (#161)
                                if email and exp is not None and time.time() <= float(exp):
                                    authenticated = True
                                    auth_attempts[client_ip] = (0, None)
                                    sanitized_email = resolve_workspace_id_for_email(email)
                                    if sub_session_id and re.match(r'^[a-zA-Z0-9_-]+$', sub_session_id):
                                        target_session_override = f"agent-{sanitized_email}-{sub_session_id}"
                                    else:
                                        target_session_override = f"agent-{sanitized_email}-{client_harness}"
                                elif email and exp is None:
                                    logger.warning(f"WS magic-link JWT missing exp for {email}")
                        except Exception as e:
                            logger.error(f"Failed to parse LeadDeed token: {e}")
            
            if not authenticated:
                attempts, _ = auth_attempts.get(client_ip, (0, None))
                attempts += 1
                lock = now + LOCKOUT_TIME if attempts >= MAX_AUTH_ATTEMPTS else None
                auth_attempts[client_ip] = (attempts, lock)
                
        if not authenticated:
            await websocket.close(code=1008, reason="Invalid API Token")
            return
        
        await websocket.send_text(json.dumps({"type": "auth_success"}))
    except Exception as e:
        logger.error(f"Auth failed: {e}")
        await websocket.close(code=1008, reason="Auth Timeout or Error")
        return

    is_admin_connection = token in VALID_API_TOKENS

    if target_session_override and target_session_override.startswith("agent-"):
        # =====================================================================
        # PUBLIC AGENT CONNECTIONS (HEADLESS CHAT API MODE)
        # =====================================================================
        import tempfile
        import shlex
        
        parts = target_session_override.split('-')
        base_agent_name = parts[1] # The sanitized email part
        
        remainder = "-".join(parts[2:]) if len(parts) > 2 else "opencode"
        current_harness = "opencode"
        is_sub_session = False
        sub_id = ""
        
        if remainder in ["opencode", "chat", "google-ai", "google-news", "google-web", "admin-cli"]:
            current_harness = remainder
        else:
            for h in ["opencode", "chat", "google-ai", "google-news", "google-web", "admin-cli"]:
                if remainder.startswith(h + "-"):
                    current_harness = h
                    is_sub_session = True
                    sub_id = remainder[len(h)+1:]
                    break
            if not is_sub_session:
                current_harness = remainder
        
        user_root_dir = f"{AGENT_WORKSPACES_DIR}/agent-{base_agent_name}"
        shared_data_dir = os.path.join(user_root_dir, "shared_database")
        os.makedirs(shared_data_dir, exist_ok=True)
        
        if is_sub_session:
            # ── UNIFIED FLEET MODEL ──────────────────────────────────────
            # Fleet sub-agents SHARE the primary workspace. They get their
            # own conversation isolation under fleet_sessions/ but access
            # the same shared_database/, AGENTS.md, memory-wiki, etc.
            workspace_dir = user_root_dir  # Same workspace as primary
            fleet_session_dir = os.path.join(user_root_dir, "fleet_sessions", f"{current_harness}-{sub_id}")
            os.makedirs(fleet_session_dir, exist_ok=True)
            
            # Fleet sub-agents use the primary workspace's brain and conversations
            agent_brain_dir = os.path.join(user_root_dir, "brain")
            agent_conv_dir = os.path.join(user_root_dir, "conversations")
        else:
            # ── UNIFIED WORKSPACE (1-per-customer) ───────────────────────
            # No more harness-{harness} subdirs. workspace_dir IS user_root_dir.
            workspace_dir = user_root_dir
            # The workspace must be pre-built by scaffold_customer_workspace.py
            if not os.path.exists(user_root_dir):
                logger.error(f"User root {user_root_dir} does not exist. Rejecting connection.")
                await websocket.send_text("**System Error:** Your Sovereign Workspace has not been provisioned by the Administrator.")
                await websocket.close()
                return
            
            agent_brain_dir = os.path.join(workspace_dir, "brain")
            agent_conv_dir = os.path.join(workspace_dir, "conversations")

        os.makedirs(agent_brain_dir, exist_ok=True)
        os.makedirs(agent_conv_dir, exist_ok=True)
        os.makedirs(os.path.join(workspace_dir, "opencode_data"), exist_ok=True)
        grok_data_dir = os.path.join(workspace_dir, "grok_data")
        os.makedirs(grok_data_dir, exist_ok=True)
        os.makedirs(os.path.join(grok_data_dir, "bin"), exist_ok=True)
        os.makedirs(os.path.join(grok_data_dir, "downloads"), exist_ok=True)
        if not os.path.exists(os.path.join(grok_data_dir, "config.toml")):
            open(os.path.join(grok_data_dir, "config.toml"), 'a').close()
        if not os.path.exists(os.path.join(grok_data_dir, "auth.json")):
            open(os.path.join(grok_data_dir, "auth.json"), 'a').close()
        os.makedirs(os.path.join(agent_brain_dir, ".system_generated", "logs"), exist_ok=True)
        os.makedirs(os.path.join(agent_brain_dir, ".system_generated", "crashes"), exist_ok=True)
        os.makedirs(os.path.join(agent_brain_dir, ".system_generated", "implicit"), exist_ok=True)
        open(os.path.join(agent_brain_dir, "summary_store.db"), "a").close()
        # CRITICAL SECURITY FIX: Never copy the master OAuth token!
        # Write a dummy valid JSON payload to bypass the agy interactive login prompt when using BYOK API keys
        if client_harness != "admin-cli":
            with open(os.path.join(agent_brain_dir, "antigravity-oauth-token"), "w") as f:
                f.write('{"access_token": "ya29.dummy", "token_type": "Bearer", "refresh_token": "1//dummy", "expiry": "2099-01-01T00:00:00Z"}')
        
        # ── HARNESS SWITCH SAFETY NET ──────────────────────────────────
        # Enforce 1-email-1-session: kill ALL existing sessions for this
        # email before checking/spawning. This prevents ghost sessions
        # from harness switches, browser crashes, or failed DELETE calls.
        # The new session (target_session_override) will be created fresh.
        await kill_all_user_sessions(base_agent_name, exclude_session=target_session_override)
        # ──────────────────────────────────────────────────────────────────

        proc = await asyncio.create_subprocess_exec(
            "tmux", "has-session", "-t", target_session_override,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await proc.wait()
        
        needs_reboot = False
        if proc.returncode == 0 and client_gemini_api_key:
            env_proc = await asyncio.create_subprocess_exec(
                "tmux", "show-environment", "-t", target_session_override, "BYOK_API_KEY",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await env_proc.communicate()
            existing_key = stdout.decode().strip()
            if existing_key != f"BYOK_API_KEY={client_gemini_api_key}":
                logger.info(f"API key changed for {target_session_override}. Killing old session.")
                await asyncio.create_subprocess_exec("tmux", "kill-session", "-t", target_session_override)
                needs_reboot = True
                
        if proc.returncode != 0 or needs_reboot:
            logger.info(f"Starting TMUX session for {target_session_override}...")
            
            # Completely decoupled execution pipelines for each harness
            if client_harness == "opencode":
                cli_args = f"{HOME_DIR}/.opencode/bin/opencode --auto"
                if client_gemini_model:
                    model_mapping = {
                        "gemini-3.5-flash-lite": "gemini-flash-lite-latest",
                        "gemini-3.5-flash": "gemini-flash-latest",
                        "gemini-3.1-pro": "gemini-2.5-pro",
                        "opencode": "gemini-flash-lite-latest",
                        "admin-cli": "gemini-flash-lite-latest",
                        "grok": "gemini-flash-lite-latest"
                    }
                    mapped_model = model_mapping.get(client_gemini_model, "gemini-flash-lite-latest")
                    if "/" not in mapped_model:
                        cli_args += f" --model google/{mapped_model}"
                    else:
                        cli_args += f" --model {mapped_model}"
                
                env_injections = f"--setenv AIM_VESSEL_CLI 'opencode' "
                if client_gemini_api_key:
                    env_injections += f"--setenv GEMINI_API_KEY '{client_gemini_api_key}' --setenv GOOGLE_GENERATIVE_AI_API_KEY '{client_gemini_api_key}' "
                
                oauth_binds = (
                    f"--bind {agent_brain_dir}/antigravity-oauth-token {HOME_DIR}/.gemini/antigravity-cli/antigravity-oauth-token "
                    f"--bind {agent_brain_dir}/antigravity-oauth-token {HOME_DIR}/.opencode/opencode-oauth-token "
                )
                
                bwrap_cmd = (
                    f"bwrap --ro-bind / / --dev /dev --proc /proc --bind /tmp /tmp "
                    f"--tmpfs {HOME_DIR} "
                    f"{env_injections}"
                    f"--ro-bind {HOME_DIR}/.local {HOME_DIR}/.local "
                    f"--ro-bind {HOME_DIR}/.gemini {HOME_DIR}/.gemini "
                    f"--ro-bind {HOME_DIR}/.opencode {HOME_DIR}/.opencode "
                    f"--bind {workspace_dir}/opencode_data {HOME_DIR}/.local/share/opencode "
                    f"--bind {HOME_DIR}/.gemini/antigravity-cli/bin {HOME_DIR}/.gemini/antigravity-cli/bin "
                    f"--bind {workspace_dir} {workspace_dir} "
                    f"--bind {shared_data_dir} {workspace_dir}/shared_database "
                    f"--bind {agent_brain_dir} {HOME_DIR}/.gemini/antigravity-cli/brain "
                    f"--bind {agent_conv_dir} {HOME_DIR}/.gemini/antigravity-cli/conversations "
                    f"--bind {HOME_DIR}/.gemini/trustedFolders.json {HOME_DIR}/.gemini/trustedFolders.json "
                    f"--bind {agent_brain_dir}/.system_generated/logs {HOME_DIR}/.gemini/antigravity-cli/log "
                    f"--bind {agent_brain_dir}/.system_generated/crashes {HOME_DIR}/.gemini/antigravity-cli/crashes "
                    f"--bind {agent_brain_dir}/.system_generated/implicit {HOME_DIR}/.gemini/antigravity-cli/implicit "
                    f"--bind {agent_brain_dir}/summary_store.db {HOME_DIR}/.gemini/antigravity-cli/summary_store.db "
                    f"{oauth_binds}"
                    f"--chdir {workspace_dir} {cli_args}"
                )

            elif client_harness == "grok":
                cli_args = f"{HOME_DIR}/.grok/bin/grok --always-approve --disallowed-tools ask_question"
                if client_gemini_model:
                    model_mapping = {
                        "grok-4.5": "grok-4.5",
                        "grok-4.3": "grok-4.3",
                        "grok-beta": "grok-beta"
                    }
                    mapped_model = model_mapping.get(client_gemini_model, "grok-4.5")
                    cli_args += f" --model {mapped_model}"
                
                env_injections = f"--setenv AIM_VESSEL_CLI 'grok' "
                if client_gemini_api_key:
                    env_injections += f"--setenv XAI_API_KEY '{client_gemini_api_key}' "
                if client_grok_thinking:
                    cli_args += f" --reasoning-effort {client_grok_thinking}"
                
                bwrap_cmd = (
                    f"bwrap --ro-bind / / --dev /dev --proc /proc --bind /tmp /tmp "
                    f"--tmpfs {HOME_DIR} "
                    f"{env_injections}"
                    f"--ro-bind {HOME_DIR}/.local {HOME_DIR}/.local "
                    f"--bind {workspace_dir}/grok_data {HOME_DIR}/.grok "
                    f"--ro-bind {HOME_DIR}/.grok/bin {HOME_DIR}/.grok/bin "
                    f"--ro-bind {HOME_DIR}/.grok/downloads {HOME_DIR}/.grok/downloads "
                    f"--bind {workspace_dir} {workspace_dir} "
                    f"--bind {shared_data_dir} {workspace_dir}/shared_database "
                    f"--chdir {workspace_dir} {cli_args}"
                )

            elif client_harness == "admin-cli":
                cli_args = f"{HOME_DIR}/.local/bin/agy --dangerously-skip-permissions --log-file /dev/null"
                if client_gemini_model:
                    model_mapping = {
                        "gemini-3.5-flash-lite": "gemini-flash-lite-latest",
                        "gemini-3.5-flash": "gemini-flash-latest",
                        "gemini-3.1-pro": "gemini-2.5-pro",
                        "opencode": "gemini-flash-lite-latest",
                        "admin-cli": "gemini-flash-lite-latest",
                        "grok": "gemini-flash-lite-latest"
                    }
                    mapped_model = model_mapping.get(client_gemini_model, "gemini-flash-lite-latest")
                    cli_args += f" --model {mapped_model}"
                
                env_injections = f"--setenv AIM_VESSEL_CLI 'admin-cli' "
                if client_gemini_api_key:
                    env_injections += f"--setenv GEMINI_API_KEY '{client_gemini_api_key}' --setenv GOOGLE_GENERATIVE_AI_API_KEY '{client_gemini_api_key}' "
                
                bwrap_cmd = (
                    f"bwrap --ro-bind / / --dev /dev --proc /proc --bind /tmp /tmp "
                    f"--tmpfs {HOME_DIR} "
                    f"{env_injections}"
                    f"--ro-bind {HOME_DIR}/.local {HOME_DIR}/.local "
                    f"--ro-bind {HOME_DIR}/.gemini {HOME_DIR}/.gemini "
                    f"--bind {HOME_DIR}/.gemini/antigravity-cli/bin {HOME_DIR}/.gemini/antigravity-cli/bin "
                    f"--bind {workspace_dir} {workspace_dir} "
                    f"--bind {shared_data_dir} {workspace_dir}/shared_database "
                    f"--bind {agent_brain_dir} {HOME_DIR}/.gemini/antigravity-cli/brain "
                    f"--bind {agent_conv_dir} {HOME_DIR}/.gemini/antigravity-cli/conversations "
                    f"--bind {HOME_DIR}/.gemini/trustedFolders.json {HOME_DIR}/.gemini/trustedFolders.json "
                    f"--bind {agent_brain_dir}/.system_generated/logs {HOME_DIR}/.gemini/antigravity-cli/log "
                    f"--bind {agent_brain_dir}/.system_generated/crashes {HOME_DIR}/.gemini/antigravity-cli/crashes "
                    f"--bind {agent_brain_dir}/.system_generated/implicit {HOME_DIR}/.gemini/antigravity-cli/implicit "
                    f"--bind {agent_brain_dir}/summary_store.db {HOME_DIR}/.gemini/antigravity-cli/summary_store.db "
                    f"--chdir {workspace_dir} {cli_args}"
                )
                
            else:
                # Default AGY Harness
                cli_args = f"{HOME_DIR}/.local/bin/agy --log-file /dev/null"
                if client_gemini_model:
                    model_mapping = {
                        "gemini-3.5-flash-lite": "gemini-flash-lite-latest",
                        "gemini-3.5-flash": "gemini-flash-latest",
                        "gemini-3.1-pro": "gemini-2.5-pro",
                        "opencode": "gemini-flash-lite-latest",
                        "admin-cli": "gemini-flash-lite-latest",
                        "grok": "gemini-flash-lite-latest"
                    }
                    mapped_model = model_mapping.get(client_gemini_model, "gemini-flash-lite-latest")
                    cli_args += f" --model {mapped_model}"
                
                env_injections = f"--setenv AIM_VESSEL_CLI '{client_harness}' "
                if client_gemini_api_key:
                    env_injections += f"--setenv GEMINI_API_KEY '{client_gemini_api_key}' "
                
                oauth_binds = (
                    f"--bind {agent_brain_dir}/antigravity-oauth-token {HOME_DIR}/.gemini/antigravity-cli/antigravity-oauth-token "
                )
                
                bwrap_cmd = (
                    f"bwrap --ro-bind / / --dev /dev --proc /proc --bind /tmp /tmp "
                    f"--tmpfs {HOME_DIR} "
                    f"{env_injections}"
                    f"--ro-bind {HOME_DIR}/.local {HOME_DIR}/.local "
                    f"--ro-bind {HOME_DIR}/.gemini {HOME_DIR}/.gemini "
                    f"--bind {HOME_DIR}/.gemini/antigravity-cli/bin {HOME_DIR}/.gemini/antigravity-cli/bin "
                    f"--bind {workspace_dir} {workspace_dir} "
                    f"--bind {shared_data_dir} {workspace_dir}/shared_database "
                    f"--bind {agent_brain_dir} {HOME_DIR}/.gemini/antigravity-cli/brain "
                    f"--bind {agent_conv_dir} {HOME_DIR}/.gemini/antigravity-cli/conversations "
                    f"--bind {HOME_DIR}/.gemini/trustedFolders.json {HOME_DIR}/.gemini/trustedFolders.json "
                    f"--bind {agent_brain_dir}/.system_generated/logs {HOME_DIR}/.gemini/antigravity-cli/log "
                    f"--bind {agent_brain_dir}/.system_generated/crashes {HOME_DIR}/.gemini/antigravity-cli/crashes "
                    f"--bind {agent_brain_dir}/.system_generated/implicit {HOME_DIR}/.gemini/antigravity-cli/implicit "
                    f"--bind {agent_brain_dir}/summary_store.db {HOME_DIR}/.gemini/antigravity-cli/summary_store.db "
                    f"{oauth_binds}"
                    f"--chdir {workspace_dir} {cli_args}"
                )
            with open("/tmp/bwrap_cmd.log", "w") as f: f.write(bwrap_cmd)

            start_proc = await asyncio.create_subprocess_exec(
                "tmux", "new-session", "-d", "-s", target_session_override, bwrap_cmd,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await start_proc.communicate()
            if start_proc.returncode != 0:
                logger.error(f"Failed to create TMUX session. stdout: {stdout.decode()} stderr: {stderr.decode()}")
            else:
                logger.info(f"TMUX session {target_session_override} created successfully.")
                if client_gemini_api_key:
                    subprocess.run(["tmux", "set-environment", "-t", target_session_override, "BYOK_API_KEY", client_gemini_api_key])

            # Give the CLI a moment to initialize the UI and block on the Trust prompt
            await asyncio.sleep(5)

            # Send Enter to auto-accept "Do you trust this folder?"
            subprocess.run(["tmux", "send-keys", "-t", target_session_override, "Enter"])
            await asyncio.sleep(2)


        if client_harness in ("opencode", "grok"):
            while True:
                try:
                    message = await websocket.receive_text()
                    if ENABLE_E2EE and E2EE_SECRET and not message.strip().startswith("{"):
                        message = decrypt_message(message, E2EE_SECRET)

                    data = json.loads(message)
                    
                    if data.get("type") in ("input", "submit"):
                        prompt = data["payload"].strip()
                        if not prompt:
                            continue
                            
                        try:
                            max_time_db = 0
                            grok_file_state = (None, 0)
                            
                            try:
                                opencode_db_path = None
                                if client_harness == "grok":
                                    g_files = glob.glob(os.path.join(workspace_dir, "grok_data", "sessions", "*", "*", "chat_history.jsonl"))
                                    if g_files:
                                        g_latest = max(g_files, key=os.path.getmtime)
                                        with open(g_latest, 'r', encoding='utf-8') as f:
                                            grok_file_state = (g_latest, sum(1 for _ in f))
                                else:
                                    db_path_base = os.path.join(workspace_dir, "opencode_data", "opencode.db")
                                    if os.path.exists(db_path_base):
                                        opencode_db_path = db_path_base
                                        
                                    if opencode_db_path:
                                        import sqlite3
                                        conn = sqlite3.connect(f"file:{opencode_db_path}?mode=ro", uri=True)
                                        res = conn.execute("SELECT MAX(time_created) FROM message").fetchone()
                                        if res and res[0]:
                                            max_time_db = res[0]
                                        conn.close()
                            except Exception as e:
                                logger.error(f"Failed to get max time from db: {e}")
                                
                            subprocess.run(["tmux", "set-buffer", prompt])
                            subprocess.run(["tmux", "paste-buffer", "-p", "-t", target_session_override])
                            await asyncio.sleep(0.5)
                            subprocess.run(["tmux", "send-keys", "-t", target_session_override, "Enter"])
                            
                            clean_output = ""
                            timeout = False
                            ws_lost = False
                            start_time = time.time()
                            last_data_activity = time.time()
                            error_checked = False
                            last_status_sent = 0.0
                            last_keepalive = 0.0
                            
                            # ── EVENT-DRIVEN RESPONSE DETECTION ─────────────────────
                            # Poll data files for deterministic "done" signals:
                            #   OpenCode: step-finish part with reason=stop in SQLite
                            #   Grok: type=assistant line in chat_history.jsonl
                            # Drain client pings each cycle (prevents half-open sockets)
                            # and send reliable 15s keepalives (Cloudflare/tunnel idle).
                            while True:
                                try:
                                    await ws_drain_client_or_sleep(websocket, timeout=2.0)
                                except WebSocketDisconnect:
                                    logger.warning(
                                        f"WebSocket disconnected during {client_harness} wait "
                                        f"for {target_session_override} (agent may still be running)"
                                    )
                                    ws_lost = True
                                    break

                                now = time.time()
                                elapsed = now - start_time

                                # Keepalive every 15s wall-clock (not fragile modulo)
                                if now - last_keepalive >= 15.0:
                                    last_keepalive = now
                                    if not await ws_send_app_text(websocket, "keepalive_ping"):
                                        logger.warning(
                                            f"Keepalive send failed for {target_session_override}; "
                                            "treating socket as dead"
                                        )
                                        ws_lost = True
                                        break

                                # ── DATA SOURCE: GROK (chat_history.jsonl) ────────
                                if client_harness == "grok":
                                    g_files = glob.glob(os.path.join(workspace_dir, "grok_data", "sessions", "*", "*", "chat_history.jsonl"))
                                    if g_files:
                                        g_latest = max(g_files, key=os.path.getmtime)
                                        # Track file activity for error detection
                                        try:
                                            fmtime = os.path.getmtime(g_latest)
                                            if fmtime > last_data_activity:
                                                last_data_activity = time.time()
                                        except Exception:
                                            pass
                                        lines_to_skip = grok_file_state[1] if g_latest == grok_file_state[0] else 0
                                        texts = []
                                        try:
                                            with open(g_latest, 'r', encoding='utf-8') as f:
                                                for i, line in enumerate(f):
                                                    if i < lines_to_skip: continue
                                                    if not line.strip(): continue
                                                    try:
                                                        data = json.loads(line)
                                                        role = data.get("type", data.get("role"))
                                                        content_blocks = data.get("content", [])
                                                        if role in ["assistant", "model"] and content_blocks:
                                                            if isinstance(content_blocks, str):
                                                                texts.append(content_blocks)
                                                            elif isinstance(content_blocks, list):
                                                                for b in content_blocks:
                                                                    if isinstance(b, dict) and b.get("type") == "text":
                                                                        texts.append(b.get("text", ""))
                                                    except Exception:
                                                        pass
                                            # DONE SIGNAL: assistant line exists in JSONL
                                            if texts:
                                                clean_output = "\n\n".join(texts).strip()
                                                break
                                        except Exception as e:
                                            logger.error(f"Failed to read grok chat history: {e}")
                                
                                # ── DATA SOURCE: OPENCODE (SQLite DB) ─────────────
                                elif opencode_db_path and os.path.exists(opencode_db_path):
                                    # Track file activity for error detection
                                    try:
                                        fmtime = os.path.getmtime(opencode_db_path)
                                        if fmtime > last_data_activity:
                                            last_data_activity = time.time()
                                    except Exception:
                                        pass
                                    try:
                                        def _poll_opencode(db_path, min_time):
                                            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
                                            try:
                                                query = '''
                                                SELECT m.data, p.data
                                                FROM message m
                                                JOIN part p ON m.id = p.message_id
                                                WHERE m.time_created > ?
                                                ORDER BY m.time_created ASC, p.time_created ASC
                                                '''
                                                return conn.execute(query, (min_time,)).fetchall()
                                            finally:
                                                conn.close()

                                        rows = await asyncio.to_thread(
                                            _poll_opencode, opencode_db_path, max_time_db
                                        )
                                        texts = []
                                        has_step_finish = False
                                        for r in rows:
                                            m_data = json.loads(r[0])
                                            p_data = json.loads(r[1])
                                            if m_data.get("role") == "assistant":
                                                if p_data.get("type") == "text" and p_data.get("text"):
                                                    texts.append(p_data.get("text"))
                                                elif p_data.get("type") == "step-finish" and p_data.get("reason") == "stop":
                                                    has_step_finish = True
                                        
                                        # DONE SIGNAL: text parts exist AND step-finish confirms completion
                                        if texts and has_step_finish:
                                            clean_output = "\n\n".join(texts).strip()
                                            break
                                    except Exception as e:
                                        logger.error(f"Failed to extract text from opencode db: {e} PATH WAS: {opencode_db_path}")
                                
                                # ── ERROR DETECTION FALLBACK ──────────────────────
                                # If data file hasn't been touched in 10s, something
                                # is likely wrong. Check the tmux pane ONCE for error
                                # messages (bad API key, auth failure, etc).
                                if time.time() - last_data_activity > 10 and not error_checked:
                                    error_checked = True
                                    try:
                                        p_err = await asyncio.create_subprocess_exec(
                                            "tmux", "capture-pane", "-p", "-S", "-200", "-t", target_session_override,
                                            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                                        )
                                        err_stdout, _ = await p_err.communicate()
                                        pane_out = err_stdout.decode().strip()
                                        error_patterns = [
                                            "invalid api key", "api key not valid", "permission_denied",
                                            "quota exceeded", "resource_exhausted", "could not authenticate",
                                            "authentication failed", "unauthorized", "rate limit",
                                            "could not connect", "login required", "unauthenticated",
                                            "error:", "fatal:", "connection refused", "network error",
                                            "exceeded your current quota", "billing",
                                        ]
                                        pane_lower = pane_out.lower()
                                        for pattern in error_patterns:
                                            if pattern in pane_lower:
                                                # Extract lines near the error, not the bottom of the TUI
                                                all_lines = [l for l in pane_out.split('\n') if l.strip()]
                                                error_context = []
                                                for idx, line in enumerate(all_lines):
                                                    if pattern in line.lower():
                                                        # Grab 2 lines before and 4 lines after the match
                                                        start = max(0, idx - 2)
                                                        end = min(len(all_lines), idx + 5)
                                                        error_context = all_lines[start:end]
                                                        break
                                                if not error_context:
                                                    error_context = all_lines[-8:]
                                                clean_output = (
                                                    f"**\u26a0\ufe0f {client_harness.upper()} Error Detected:**\n\n"
                                                    f"```\n" + "\n".join(error_context) + f"\n```\n\n"
                                                    f"**Tip:** Check your API key in the BYOK Panel and ensure it is valid."
                                                )
                                                break
                                    except Exception as e:
                                        logger.warning(f"Error detection pane capture failed: {e}")
                                    if clean_output:
                                        break
                                
                                # ── "STILL WORKING" FEEDBACK (structured status) ──
                                if elapsed > 30 and elapsed - last_status_sent > 45:
                                    last_status_sent = elapsed
                                    status_payload = json.dumps({
                                        "type": "status",
                                        "message": f"⏳ Agent is still working... ({int(elapsed)}s elapsed)",
                                    })
                                    if not await ws_send_app_text(websocket, status_payload):
                                        ws_lost = True
                                        break
                                
                                # ── HARD TIMEOUT: 600s (10 minutes) ──────────────
                                if elapsed > 600:
                                    timeout = True
                                    break

                            if ws_lost:
                                # Agent keeps running in tmux; do not pretend a response arrived
                                continue
                                        
                            if timeout or not clean_output:
                                clean_output = f"**System:** Sent to {client_harness.capitalize()} terminal, but timed out waiting for stable output.\n\n⚠️ **If this is your first request or you recently changed models, please check your BYOK Panel and ensure your API Key is valid and saved.**"
                                
                            try:
                                if ENABLE_E2EE and E2EE_SECRET:
                                    encrypted = encrypt_bytes(clean_output.encode(), E2EE_SECRET)
                                    logger.info(f"Sending E2EE bytes back to frontend: {clean_output[:100]}...")
                                    await websocket.send_bytes(encrypted)
                                else:
                                    logger.info(f"Sending response back to frontend: {clean_output}")
                                    await websocket.send_text(clean_output)
                            except RuntimeError:
                                logger.warning("WebSocket already closed, could not deliver response.")
                                
                        except Exception as e:
                            error_msg = f"**Tmux Bridge Error:** {str(e)}"
                            logger.error(error_msg)
                            try:
                                if ENABLE_E2EE and E2EE_SECRET:
                                    await websocket.send_bytes(encrypt_bytes(error_msg.encode(), E2EE_SECRET))
                                else:
                                    await websocket.send_text(error_msg)
                            except RuntimeError:
                                logger.warning("WebSocket already closed, could not deliver error message.")
                            
                except WebSocketDisconnect:
                    logger.info("WebSocket disconnected (opencode/grok chat loop)")
                    break
                except Exception as e:
                    logger.error(f"Chat API loop error: {e}", exc_info=True)
                    break
        elif client_harness == "admin-cli":
            while True:
                try:
                    message = await websocket.receive_text()
                    if ENABLE_E2EE and E2EE_SECRET and not message.strip().startswith("{"):
                        message = decrypt_message(message, E2EE_SECRET)

                    data = json.loads(message)
                    
                    if data.get("type") in ("input", "submit"):
                        prompt = data["payload"].strip()
                        if not prompt:
                            continue
                            
                        try:
                            log_files = glob.glob(os.path.join(agent_brain_dir, "*", ".system_generated", "logs", "transcript.jsonl"))
                            log_file = None
                            last_pos = 0
                            if log_files:
                                log_file = max(log_files, key=os.path.getmtime)
                                if os.path.exists(log_file):
                                    with open(log_file, "r") as f:
                                        f.seek(0, 2)
                                        last_pos = f.tell()
                            
                            subprocess.run(["tmux", "set-buffer", prompt])
                            subprocess.run(["tmux", "paste-buffer", "-p", "-t", target_session_override])
                            sleep_time = max(0.5, len(prompt) / 20000.0)
                            await asyncio.sleep(sleep_time)
                            subprocess.run(["tmux", "send-keys", "-t", target_session_override, "Enter"])
                            
                            clean_output = "**Error:** Agent timed out or failed to write transcript."
                            start_time = time.time()
                            last_status_sent = 0.0
                            last_keepalive = 0.0
                            ws_lost = False
                            found_response = False
                            while time.time() - start_time < 600:
                                try:
                                    await ws_drain_client_or_sleep(websocket, timeout=2.0)
                                except WebSocketDisconnect:
                                    ws_lost = True
                                    break

                                now = time.time()
                                elapsed = now - start_time

                                if now - last_keepalive >= 15.0:
                                    last_keepalive = now
                                    if not await ws_send_app_text(websocket, "keepalive_ping"):
                                        ws_lost = True
                                        break

                                if elapsed > 30 and elapsed - last_status_sent > 45:
                                    last_status_sent = elapsed
                                    status_payload = json.dumps({
                                        "type": "status",
                                        "message": f"⏳ Agent is still working... ({int(elapsed)}s elapsed)",
                                    })
                                    if not await ws_send_app_text(websocket, status_payload):
                                        ws_lost = True
                                        break
                                
                                current_log_files = glob.glob(os.path.join(agent_brain_dir, "*", ".system_generated", "logs", "transcript.jsonl"))
                                if current_log_files:
                                    current_newest = max(current_log_files, key=os.path.getmtime)
                                    if current_newest != log_file:
                                        log_file = current_newest
                                        last_pos = 0
                                        
                                if log_file and os.path.exists(log_file):
                                    with open(log_file, "r") as f:
                                        f.seek(last_pos)
                                        lines = f.readlines()
                                        
                                        for line in lines:
                                            if not line.endswith("\n"):
                                                break
                                            last_pos += len(line)
                                            try:
                                                log_data = json.loads(line)
                                                if log_data.get("source") == "MODEL" and log_data.get("type") == "PLANNER_RESPONSE":
                                                    content = log_data.get("content")
                                                    tool_calls = log_data.get("tool_calls")
                                                    if content and not tool_calls:
                                                        clean_output = content
                                                        found_response = True
                                            except Exception:
                                                pass
                                                
                                        if found_response:
                                            break
                                if found_response:
                                    break

                            if ws_lost:
                                continue
                                
                            if ENABLE_E2EE and E2EE_SECRET:
                                encrypted = encrypt_bytes(clean_output.encode(), E2EE_SECRET)
                                logger.info(f"Sending E2EE bytes back to frontend: {clean_output[:100]}...")
                                await websocket.send_bytes(encrypted)
                            else:
                                logger.info(f"Sending response back to frontend: {clean_output}")
                                await websocket.send_text(clean_output)
                        except Exception as e:
                            error_msg = f"**Tmux Bridge Error:** {str(e)}"
                            logger.error(error_msg)
                            if ENABLE_E2EE and E2EE_SECRET:
                                await websocket.send_bytes(encrypt_bytes(error_msg.encode(), E2EE_SECRET))
                            else:
                                await websocket.send_text(error_msg)
                            
                except WebSocketDisconnect:
                    logger.info("WebSocket disconnected (admin-cli chat loop)")
                    break
                except Exception as e:
                    logger.error(f"Chat API loop error: {e}")
                    break
        else:  # agy
            while True:
                try:
                    message = await websocket.receive_text()
                    if ENABLE_E2EE and E2EE_SECRET and not message.strip().startswith("{"):
                        message = decrypt_message(message, E2EE_SECRET)

                    data = json.loads(message)
                    
                    if data.get("type") in ("input", "submit"):
                        prompt = data["payload"].strip()
                        if not prompt:
                            continue
                            
                        try:
                            log_files = glob.glob(os.path.join(agent_brain_dir, "*", ".system_generated", "logs", "transcript.jsonl"))
                            log_file = None
                            last_pos = 0
                            if log_files:
                                log_file = max(log_files, key=os.path.getmtime)
                                if os.path.exists(log_file):
                                    with open(log_file, "r") as f:
                                        f.seek(0, 2)
                                        last_pos = f.tell()
                            
                            subprocess.run(["tmux", "set-buffer", prompt])
                            subprocess.run(["tmux", "paste-buffer", "-p", "-t", target_session_override])
                            sleep_time = max(0.5, len(prompt) / 20000.0)
                            await asyncio.sleep(sleep_time)
                            subprocess.run(["tmux", "send-keys", "-t", target_session_override, "Enter"])
                            
                            clean_output = "**Error:** Agent timed out or failed to write transcript."
                            start_time = time.time()
                            last_status_sent = 0.0
                            last_keepalive = 0.0
                            ws_lost = False
                            found_response = False
                            while time.time() - start_time < 600:
                                try:
                                    await ws_drain_client_or_sleep(websocket, timeout=2.0)
                                except WebSocketDisconnect:
                                    ws_lost = True
                                    break

                                now = time.time()
                                elapsed = now - start_time

                                if now - last_keepalive >= 15.0:
                                    last_keepalive = now
                                    if not await ws_send_app_text(websocket, "keepalive_ping"):
                                        ws_lost = True
                                        break

                                if elapsed > 30 and elapsed - last_status_sent > 45:
                                    last_status_sent = elapsed
                                    status_payload = json.dumps({
                                        "type": "status",
                                        "message": f"⏳ Agent is still working... ({int(elapsed)}s elapsed)",
                                    })
                                    if not await ws_send_app_text(websocket, status_payload):
                                        ws_lost = True
                                        break
                                
                                current_log_files = glob.glob(os.path.join(agent_brain_dir, "*", ".system_generated", "logs", "transcript.jsonl"))
                                if current_log_files:
                                    current_newest = max(current_log_files, key=os.path.getmtime)
                                    if current_newest != log_file:
                                        log_file = current_newest
                                        last_pos = 0
                                        
                                if log_file and os.path.exists(log_file):
                                    with open(log_file, "r") as f:
                                        f.seek(last_pos)
                                        lines = f.readlines()
                                        
                                        for line in lines:
                                            if not line.endswith("\n"):
                                                break
                                            last_pos += len(line)
                                            try:
                                                log_data = json.loads(line)
                                                if log_data.get("source") == "MODEL" and log_data.get("type") == "PLANNER_RESPONSE":
                                                    content = log_data.get("content")
                                                    tool_calls = log_data.get("tool_calls")
                                                    if content and not tool_calls:
                                                        clean_output = content
                                                        found_response = True
                                            except Exception:
                                                pass
                                                
                                        if found_response:
                                            break
                                if found_response:
                                    break

                            if ws_lost:
                                continue
                                
                            if ENABLE_E2EE and E2EE_SECRET:
                                encrypted = encrypt_bytes(clean_output.encode(), E2EE_SECRET)
                                logger.info(f"Sending E2EE bytes back to frontend: {clean_output[:100]}...")
                                await websocket.send_bytes(encrypted)
                            else:
                                logger.info(f"Sending response back to frontend: {clean_output}")
                                await websocket.send_text(clean_output)
                                
                        except Exception as e:
                            error_msg = f"**Tmux Bridge Error:** {str(e)}"
                            logger.error(error_msg)
                            if ENABLE_E2EE and E2EE_SECRET:
                                await websocket.send_bytes(encrypt_bytes(error_msg.encode(), E2EE_SECRET))
                            else:
                                await websocket.send_text(error_msg)
                            
                except WebSocketDisconnect:
                    logger.info("WebSocket disconnected (agy chat loop)")
                    break
                except Exception as e:
                    logger.error(f"Chat API loop error: {e}")
                    break
        return

    # ADMIN CONNECTIONS (RAW PTY & TMUX MODE)
    # =====================================================================
    # Resolve target_session BEFORE forking so both parent and child processes know the session name
    target_session = target_session_override
    if not target_session:
        # Find a tmux session that isn't one of our internal aim-* services
        result = subprocess.run(["tmux", "ls", "-F", "#{session_name}"], capture_output=True, text=True)
        if result.returncode == 0:
            for line in result.stdout.splitlines():
                if line and not line.startswith("aim-"):
                    target_session = line
                    break
        if not target_session:
            target_session = "aim-connect-main"

    is_new_session = False
    result = subprocess.run(["tmux", "has-session", "-t", target_session], capture_output=True)
    if result.returncode != 0:
        is_new_session = True
        
    pid, fd = pty.fork()
    if pid == 0:
        
        # Ensure a valid terminal type for tmux
        os.environ["TERM"] = "xterm-256color"
        
        # Unset TMUX to avoid nesting errors
        if "TMUX" in os.environ:
            del os.environ["TMUX"]
        
        # Set standard terminal size
        def set_winsize(fd, row, col):
            winsize = struct.pack("HHHH", row, col, 0, 0)
            fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)
        
        set_winsize(sys.stdout.fileno(), 24, 80)
            
        # Ensure mouse support is enabled globally for mobile scroll sync
        subprocess.run(["tmux", "set-option", "-g", "mouse", "on"])
            
        result = subprocess.run(["tmux", "new-session", "-d", "-s", target_session], capture_output=True)
        if result.returncode == 0:
            admin_cli = f"export AIM_VESSEL_CLI={client_harness} && agy --log-file /dev/null"
            subprocess.run(["tmux", "send-keys", "-t", target_session, admin_cli, "Enter"])
        os.execvp("tmux", ["tmux", "attach", "-t", target_session])
    
    # Parent process
    loop = asyncio.get_event_loop()
    
    last_activity = time.time()
    INACTIVITY_TIMEOUT = 86400 # 24 hours

    async def read_from_pty():
        nonlocal last_activity
        loop = asyncio.get_running_loop()
        while True:
            try:
                data = await loop.run_in_executor(None, os.read, fd, 1024)
                if not data:
                    break
                if ENABLE_E2EE and E2EE_SECRET:
                    data = encrypt_bytes(data, E2EE_SECRET)
                await websocket.send_bytes(data)
                last_activity = time.time()
            except Exception as e:
                logger.error(f"PTY read error: {e}")
                break

    async def write_to_pty():
        nonlocal last_activity
        while True:
            try:
                message = await websocket.receive_text()
                last_activity = time.time()
                try:
                    if ENABLE_E2EE and E2EE_SECRET and not message.strip().startswith("{"):
                        message = decrypt_message(message, E2EE_SECRET)
                    data = json.loads(message)
                    if data.get("type") == "input":
                        os.write(fd, data["payload"].encode("utf-8"))
                    elif data.get("type") == "submit":
                        import asyncio
                        text = data.get("payload", "")
                        logger.info(f"Executing aim-communicate for {target_session} with {text}")
                        async def execute_aim_communicate(session_name, msg_text):
                            nonlocal is_new_session
                            if is_new_session:
                                # Wait 4 seconds for agy to finish booting
                                await asyncio.sleep(4)
                                is_new_session = False
                                
                            # 1. Load into buffer
                            proc1 = await asyncio.create_subprocess_exec("tmux", "set-buffer", msg_text)
                            await proc1.wait()
                            # 2. Paste buffer with bracketed paste (-p)
                            proc2 = await asyncio.create_subprocess_exec("tmux", "paste-buffer", "-p", "-t", session_name)
                            await proc2.wait()
                            # 3. Sleep 1 second
                            await asyncio.sleep(1)
                            # 4. Send Escape then Enter to submit multi-line blocks in Textual
                            proc3 = await asyncio.create_subprocess_exec("tmux", "send-keys", "-t", session_name, "Escape")
                            await proc3.wait()
                            proc4 = await asyncio.create_subprocess_exec("tmux", "send-keys", "-t", session_name, "Enter")
                            await proc4.wait()
                        
                        # Run it in the background so it doesn't block other messages
                        asyncio.create_task(execute_aim_communicate(target_session, text))
                    elif data.get("type") == "resize":
                        set_pty_size(fd, data["rows"], data["cols"])
                    elif data.get("type") == "switch_session":
                        # We must find the client tty attached to this specific pid

                        result = subprocess.run(["tmux", "list-clients", "-F", "#{client_tty} #{client_pid}"], capture_output=True, text=True)
                        client_tty = None
                        for line in result.stdout.strip().split('\n'):
                            if line:
                                parts = line.split()
                                if len(parts) >= 2 and parts[1] == str(pid):
                                    client_tty = parts[0]
                                    break
                        
                        if client_tty:
                            subprocess.run(["tmux", "switch-client", "-c", client_tty, "-t", data["session"]])
                        else:
                            logger.warning(f"Could not find tmux client for pid {pid}")
                except json.JSONDecodeError:
                    os.write(fd, message.encode("utf-8"))
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected")
                break
            except Exception as e:
                logger.error(f"PTY write error: {e}")
                break

    async def inactivity_monitor():
        while True:
            await asyncio.sleep(10)
            if time.time() - last_activity > INACTIVITY_TIMEOUT:
                logger.warning(f"Closing websocket due to inactivity timeout ({INACTIVITY_TIMEOUT}s)")
                await websocket.close(code=1008, reason="Inactivity timeout")
                break

    task1 = asyncio.create_task(read_from_pty())
    task2 = asyncio.create_task(write_to_pty())
    task3 = asyncio.create_task(inactivity_monitor())

    done, pending = await asyncio.wait(
        [task1, task2, task3],
        return_when=asyncio.FIRST_COMPLETED
    )
    
    for task in pending:
        task.cancel()

