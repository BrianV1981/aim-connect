import json
import os
import sys
import re
import time
import asyncio
import base64
import hashlib
import hmac
import struct
import fcntl
import termios
import subprocess
import pty
import signal
import errno
import select
import uuid
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from main import (
    AIM_CONNECT_ROOT, BACKEND_DIR, ENABLE_E2EE, E2EE_SECRET, ALLOWED_IPS, 
    auth_attempts, LOCKOUT_TIME, MAX_AUTH_ATTEMPTS, VALID_API_TOKENS,
    AGENT_WORKSPACES_DIR, HOME_DIR, is_token_valid, touch_api_token
)
from e2ee import encrypt_bytes, encrypt_message, decrypt_message, derive_session_transport_key
from harness_transcript import (
    extract_live_agent_text,
    iter_new_opencode_assistant_texts,
    opencode_max_part_ts,
)
from sandbox_smtp import (
    bwrap_smtp_setenv,
    get_gateway_signing_secret,
    redact_bwrap_cmd,
    smtp_configured,
)
from dashboard_jwt import verify_dashboard_jwt
from opencode_providers import (
    map_opencode_cli_model,
    opencode_bwrap_setenv,
    resolve_opencode_auth,
    write_opencode_auth_json,
    write_opencode_user_config,
)
from opencode_skills import (
    build_opencode_bwrap_skill_binds,
    inspect_tmux_pane_context,
    translate_opencode_skill_slash,
)
import logging

router = APIRouter()
logger = logging.getLogger("aim-connect")

# Public ingest must not paste until the CLI can accept it (#191).
# Boot matches the existing trust-folder wait; settle matches the admin
# PTY is_new_session pause. Do not emit auth_success before both finish.
PUBLIC_HARNESS_BOOT_S = 5
PUBLIC_HARNESS_SETTLE_S = 4
ADMIN_KEEPALIVE_INTERVAL_S = 20.0
PTY_READ_CHUNK_BYTES = 16384
PTY_MAX_COALESCED_BYTES = 65536
PTY_COALESCE_WINDOW_S = 0.008

# Track active Plane A PTY children by (api_token, client_id) so same-tab reconnects
# immediately evict and reap their stale zombie tmux client without affecting other tabs (#244).
_ACTIVE_ADMIN_PTY_CLIENTS: dict[tuple[str, str], dict] = {}


def _cleanup_admin_pty_entry(entry: dict) -> None:
    """Idempotently signal eviction, close PTY master fd once, and reap child tmux client (#244)."""
    if not entry or entry.get("cleaned_up"):
        return
    entry["cleaned_up"] = True
    ev = entry.get("evict_event")
    if ev is not None:
        ev.set()
    try:
        os.close(entry["fd"])
    except Exception:
        pass
    try:
        os.kill(entry["pid"], signal.SIGKILL)
        os.waitpid(entry["pid"], 0)
    except Exception:
        pass


def _read_pty_coalesced(
    fd: int,
    chunk_bytes: int = PTY_READ_CHUNK_BYTES,
    max_bytes: int = PTY_MAX_COALESCED_BYTES,
    coalesce_s: float = PTY_COALESCE_WINDOW_S,
) -> bytes:
    """Read and coalesce PTY output bursts while keeping interactive echoes instant (#245).

    - Small echoes (<512B) with no follow-up bytes queued return immediately (0ms delay).
    - Full-screen TUI redraws / scroll bursts coalesce up to `coalesce_s` (8ms) and `max_bytes` (64KB).
    """
    try:
        first = os.read(fd, chunk_bytes)
    except OSError as e:
        if e.errno in (errno.EIO, errno.EBADF):
            return b""
        raise
    if not first:
        return b""

    if len(first) < 512:
        try:
            rlist, _, _ = select.select([fd], [], [], 0.0)
        except (OSError, ValueError):
            return first
        if not rlist:
            return first

    chunks = [first]
    total = len(first)
    deadline = time.monotonic() + coalesce_s
    while total < max_bytes:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        try:
            rlist, _, _ = select.select([fd], [], [], min(0.002, remaining))
        except (OSError, ValueError):
            break
        if not rlist:
            break
        try:
            more = os.read(fd, min(chunk_bytes, max_bytes - total))
        except OSError as e:
            if e.errno in (errno.EIO, errno.EBADF):
                break
            raise
        if not more:
            break
        chunks.append(more)
        total += len(more)

    return b"".join(chunks) if len(chunks) > 1 else first

def resolve_workspace_id_for_email(email: str) -> str:
    """Map login email → agent_workspaces/agent-{id}/ (#184).

    Prefer external operators registry (opaque op_* ids) when AIM_LD_SCRIPTS
    is present on disk. Fallback: sanitize email without warning spam on
    standalone open-source installations (#205).
    """
    aim_ld_scripts = os.environ.get(
        "AIM_LD_SCRIPTS",
        os.path.join(os.path.dirname(AIM_CONNECT_ROOT), "aim-ld", "scripts"),
    )
    if os.path.isdir(aim_ld_scripts):
        try:
            if aim_ld_scripts not in sys.path:
                sys.path.insert(0, aim_ld_scripts)
            from core.identity import resolve_workspace_id_for_email as _resolve

            return _resolve(email)
        except Exception as e:
            logger.warning(f"operator registry resolve failed for {email!r}: {e}; using sanitize fallback")
    return re.sub(r"[^a-zA-Z0-9]", "_", (email or "").strip().lower())


def build_admin_initial_command(
    client_harness: str,
    home_dir: str = HOME_DIR,
    which_fn=None,
) -> str | None:
    """Return initial command to send to a newly created admin tmux session, or None (#205)."""
    import shutil as _shutil

    custom_cmd = os.environ.get("AIM_ADMIN_DEFAULT_CMD", "").strip()
    if custom_cmd:
        return custom_cmd
    checker = which_fn or _shutil.which
    if checker("agy") or os.path.isfile(os.path.join(home_dir, ".local", "bin", "agy")):
        return f"export AIM_VESSEL_CLI={client_harness} && agy --log-file /dev/null"
    return None


def legacy_sanitize_email(email: str) -> str:
    """Pre-#184 path form used by the dashboard for agent IDs (email slug)."""
    return re.sub(r"[^a-zA-Z0-9]", "_", (email or "").strip().lower())


async def ws_send_app_text(
    websocket: WebSocket, text: str, e2ee_secret: str | None = None
) -> bool:
    """Send application text (optionally E2EE). Returns False if the socket is dead."""
    active_secret = E2EE_SECRET if e2ee_secret is None else e2ee_secret
    try:
        if ENABLE_E2EE and active_secret:
            await websocket.send_bytes(encrypt_bytes(text.encode("utf-8"), active_secret))
        else:
            await websocket.send_text(text)
        return True
    except Exception as e:
        logger.warning(f"ws_send_app_text failed: {e}")
        return False


async def ws_send_control_json(
    websocket: WebSocket, payload: dict, e2ee_secret: str | None = None
) -> bool:
    """Send JSON control message (e.g. pong, error) as a text WebSocket frame (#244).

    Uses base64 E2EE text framing (encrypt_message + send_text) when E2EE is enabled so
    E2EESocketWrapper delivers a string to JSON.parse() rather than raw PTY ArrayBuffer bytes.
    """
    active_secret = E2EE_SECRET if e2ee_secret is None else e2ee_secret
    raw = json.dumps(payload, separators=(",", ":"))
    try:
        if ENABLE_E2EE and active_secret:
            await websocket.send_text(encrypt_message(raw, active_secret))
        else:
            await websocket.send_text(raw)
        return True
    except Exception as e:
        logger.debug(f"ws_send_control_json failed: {e}")
        return False

async def ws_drain_client_or_sleep(
    websocket: WebSocket, timeout: float = 2.0, e2ee_secret: str | None = None
):
    """Await inbound client frame up to timeout so pings are drained during long waits.

    Returns:
      None — timeout or drained ping/noise
      dict — parsed JSON message (caller may ignore mid-wait submits)
    Raises WebSocketDisconnect if the client closed.
    """
    active_secret = E2EE_SECRET if e2ee_secret is None else e2ee_secret
    try:
        message = await asyncio.wait_for(websocket.receive_text(), timeout=timeout)
    except asyncio.TimeoutError:
        return None
    try:
        if ENABLE_E2EE and active_secret and not str(message).strip().startswith("{"):
            message = decrypt_message(message, active_secret)
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


_SINGLE_SLASH_CMD_RE = re.compile(r"^/[A-Za-z0-9_.:-]+$")
_AMAIL_AGENT_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$")


def resolve_amail_mailbox_dir(explicit_dir: str | None = None) -> str:
    """Resolve the A-Mail Maildir root ($AIM_MAILBOX_DIR or ~/.aim/mailbox) (#319)."""
    if explicit_dir and str(explicit_dir).strip():
        return os.path.abspath(os.path.expanduser(str(explicit_dir).strip()))
    env_dir = os.environ.get("AIM_MAILBOX_DIR", "").strip()
    if env_dir:
        return os.path.abspath(os.path.expanduser(env_dir))
    return os.path.abspath(os.path.join(HOME_DIR, ".aim", "mailbox"))


def resolve_amail_binary(explicit_bin: str | None = None) -> str | None:
    """Locate the installed `amail` / `aim-mail` CLI binary, or None if unavailable (#319)."""
    import shutil as _shutil

    override = (explicit_bin or os.environ.get("AIM_MAIL_BIN", "")).strip()
    if override:
        expanded = os.path.expanduser(override)
        return expanded if (os.path.isfile(expanded) and os.access(expanded, os.X_OK)) else None

    for name in ("amail", "aim-mail"):
        found = _shutil.which(name)
        if found:
            return found
        local_cand = os.path.join(HOME_DIR, ".local", "bin", name)
        if os.path.isfile(local_cand) and os.access(local_cand, os.X_OK):
            return local_cand
    return None


async def execute_amail_submit(
    session_name: str,
    msg_text: str,
    *,
    sender: str | None = None,
    reply_to: str | None = None,
    subject: str | None = None,
    is_new_session: bool = False,
    mailbox_dir: str | None = None,
    amail_bin: str | None = None,
) -> bool:
    """Dispatch a submit message via A-Mail (`amail` --driver tmux, Enter-only, zero Escape) (#319).

    Falls back to exact `=session:` bracketed paste + Enter-only when `amail` is not installed
    on standalone open-source installations.
    """
    clean_sess = (session_name or "").strip().lstrip("=").rstrip(":")
    clean_text = (msg_text or "").strip()
    if not clean_sess or not clean_text or not _AMAIL_AGENT_ID_RE.match(clean_sess):
        return False

    if is_new_session:
        await asyncio.sleep(4)

    raw_sender = (sender or "aim-connect").strip().lstrip("@")
    from_agent = raw_sender.lower() if _AMAIL_AGENT_ID_RE.match(raw_sender) else "aim-connect"
    raw_reply = (reply_to or from_agent).strip().lstrip("@")
    reply_to_agent = raw_reply.lower() if _AMAIL_AGENT_ID_RE.match(raw_reply) else from_agent
    subj = (subject or "Operator WebSocket Dispatch").strip()[:140]

    bin_path = resolve_amail_binary(amail_bin)
    if not bin_path:
        return await execute_bracketed_paste(f"={clean_sess}:", clean_text, submit_enter=True)

    mb_dir = resolve_amail_mailbox_dir(mailbox_dir)
    target_agent = clean_sess.lower()
    agents_file = os.path.join(mb_dir, "agents.json")
    registered_agents: dict = {}
    if os.path.isfile(agents_file):
        try:
            with open(agents_file, "r", encoding="utf-8") as fh:
                loaded = json.load(fh)
            if isinstance(loaded, dict):
                registered_agents = loaded
        except (OSError, ValueError):
            registered_agents = {}

    if target_agent not in registered_agents:
        reg_proc = await asyncio.create_subprocess_exec(
            bin_path,
            "--mailbox-dir",
            mb_dir,
            "register",
            target_agent,
            "--driver",
            "tmux",
            "--tmux-session",
            clean_sess,
            "--json",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await reg_proc.communicate()

    send_proc = await asyncio.create_subprocess_exec(
        bin_path,
        "--mailbox-dir",
        mb_dir,
        "send",
        "--from",
        from_agent,
        "--to",
        target_agent,
        "--reply-to",
        reply_to_agent,
        "--subject",
        subj,
        "--body",
        clean_text,
        "--operator-approved",
        "--wake",
        "--allow-deferred",
        "--json",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, send_err = await send_proc.communicate()
    if send_proc.returncode != 0:
        logger.warning(
            f"A-Mail send failed for {target_agent} (rc={send_proc.returncode}): "
            f"{(send_err or b'').decode('utf-8', errors='replace').strip()}"
        )
        return False
    return True


def is_single_slash_command(text: str) -> bool:
    """Return True for single-token /slash commands or skills (no arguments)."""
    return bool(_SINGLE_SLASH_CMD_RE.match((text or "").strip()))


def pane_still_holds_slash_command(pane_text: str, slash_cmd: str) -> bool:
    """Return True if the CLI prompt still holds the unsubmitted /slash command after Enter 1."""
    clean_cmd = (slash_cmd or "").strip()
    if not clean_cmd:
        return False
    lines = [ln.rstrip() for ln in (pane_text or "").splitlines() if ln.strip()]
    tail = lines[-8:]
    pat = re.compile(rf"^(?:[>›❯$#]\s*)?{re.escape(clean_cmd)}\s*$")
    return any(pat.match(ln.strip()) for ln in tail)


async def execute_bracketed_paste(
    session_name: str,
    paste_text: str,
    *,
    submit_enter: bool = False,
    settle_s: float = 0.25,
) -> bool:
    """Load text into tmux buffer via stdin and paste with bracketed paste (-p -r).

    When submit_enter=True (#288), uses an isolated named buffer (-b) with auto-delete (-d),
    waits settle_s for the interactive TUI to finish parsing the paste, sends Enter, and
    confirms single-token /slash skills if Enter 1 only closed the CLI slash menu.
    """
    normalized = (paste_text or "").replace("\r\n", "\n").replace("\r", "\n").rstrip("\n")
    if not normalized or not session_name:
        return False

    if not submit_enter:
        proc1 = await asyncio.create_subprocess_exec(
            "tmux",
            "load-buffer",
            "-",
            stdin=asyncio.subprocess.PIPE,
        )
        await proc1.communicate(input=normalized.encode("utf-8"))
        if proc1.returncode != 0:
            return False
        proc2 = await asyncio.create_subprocess_exec(
            "tmux",
            "paste-buffer",
            "-p",
            "-r",
            "-t",
            session_name,
        )
        await proc2.wait()
        return proc2.returncode == 0

    if normalized.startswith("/"):
        det_vessel, pane_cwd, proc_start_ts = inspect_tmux_pane_context(session_name)
        if det_vessel == "opencode":
            normalized = translate_opencode_skill_slash(
                normalized,
                vessel="opencode",
                home_dir=HOME_DIR,
                cwd_path=pane_cwd,
                proc_start_ts=proc_start_ts,
            )

    buf_name = f"aim_ws_{uuid.uuid4().hex[:10]}"
    proc1 = await asyncio.create_subprocess_exec(
        "tmux",
        "load-buffer",
        "-b",
        buf_name,
        "-",
        stdin=asyncio.subprocess.PIPE,
    )
    await proc1.communicate(input=normalized.encode("utf-8"))
    if proc1.returncode != 0:
        return False

    proc2 = await asyncio.create_subprocess_exec(
        "tmux",
        "paste-buffer",
        "-p",
        "-r",
        "-d",
        "-b",
        buf_name,
        "-t",
        session_name,
    )
    await proc2.wait()
    if proc2.returncode != 0:
        return False

    await asyncio.sleep(settle_s)
    proc_enter = await asyncio.create_subprocess_exec(
        "tmux",
        "send-keys",
        "-t",
        session_name,
        "Enter",
    )
    await proc_enter.wait()
    if proc_enter.returncode != 0:
        return False

    if is_single_slash_command(normalized):
        await asyncio.sleep(0.15)
        proc_cap = await asyncio.create_subprocess_exec(
            "tmux",
            "capture-pane",
            "-t",
            session_name,
            "-S",
            "-8",
            "-p",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        cap_out, _ = await proc_cap.communicate()
        if proc_cap.returncode == 0 and pane_still_holds_slash_command(
            (cap_out or b"").decode("utf-8", errors="replace"),
            normalized,
        ):
            proc_enter2 = await asyncio.create_subprocess_exec(
                "tmux",
                "send-keys",
                "-t",
                session_name,
                "Enter",
            )
            await proc_enter2.wait()

    return True


async def _run_tmux_cmd(*tmux_args: str) -> tuple[int, str, str]:
    """Run a short tmux query/control command asynchronously without blocking Uvicorn (#243)."""
    proc = await asyncio.create_subprocess_exec(
        "tmux",
        *tmux_args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout_b, stderr_b = await proc.communicate()
    rc = proc.returncode if proc.returncode is not None else 0
    return (
        rc,
        (stdout_b or b"").decode("utf-8", errors="replace"),
        (stderr_b or b"").decode("utf-8", errors="replace"),
    )


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    try:
        await _websocket_endpoint(websocket)
    except Exception as e:
        print(f"CRASH in websocket_endpoint: {e}", flush=True)
        raise
    finally:
        print("WEBSOCKET_ENDPOINT EXITED!", flush=True)

async def _websocket_endpoint(websocket: WebSocket) -> None:
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
    requested_admin_session = None
    client_instance_id = ""
    client_gemini_api_key = None
    client_gemini_model = None
    client_grok_thinking = None
    client_harness = "opencode"
    client_byok_fingerprint = ""
    client_opencode_cli_model = None
    client_opencode_provider = "google"
    client_opencode_variant = None
    public_session_e2ee_secret = ""
    jwt_operator_email = ""
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
            if client_harness == "opencode":
                resolved = resolve_opencode_auth(data)
                client_gemini_api_key = resolved.api_key
                client_gemini_model = resolved.ui_model
                client_opencode_cli_model = resolved.cli_model
                client_opencode_provider = resolved.provider
                client_opencode_variant = resolved.variant
                client_byok_fingerprint = resolved.byok_fingerprint
            else:
                client_byok_fingerprint = client_gemini_api_key or ""
            
            is_stale_hex_session_token = bool(re.fullmatch(r"[0-9a-f]{64}", token or ""))
            if is_token_valid(token, tokens_store=VALID_API_TOKENS):
                authenticated = True
                auth_attempts[client_ip] = (0, None)
                req_sess = (data.get("session") or "").strip()
                if req_sess and re.match(r"^[a-zA-Z0-9_.-]+$", req_sess):
                    requested_admin_session = req_sess
                raw_cid = str(data.get("client_id") or "").strip()
                if raw_cid and re.match(r"^[a-zA-Z0-9_.:-]{1,128}$", raw_cid):
                    client_instance_id = raw_cid
                    stale_entry = _ACTIVE_ADMIN_PTY_CLIENTS.pop((token, client_instance_id), None)
                    if stale_entry:
                        logger.info(
                            f"Evicting stale admin PTY pid={stale_entry['pid']} on same-tab reconnect"
                        )
                        _cleanup_admin_pty_entry(stale_entry)
            elif "." in token:
                try:
                    payload = verify_dashboard_jwt(token)
                    email = payload["e"]
                    secret = get_gateway_signing_secret()
                    authenticated = True
                    auth_attempts[client_ip] = (0, None)
                    jwt_operator_email = str(email).strip().lower()
                    public_session_e2ee_secret = derive_session_transport_key(token, secret)
                    sanitized_email = resolve_workspace_id_for_email(email)
                    if sub_session_id and re.match(r'^[a-zA-Z0-9_-]+$', sub_session_id):
                        target_session_override = f"agent-{sanitized_email}-{sub_session_id}"
                    else:
                        target_session_override = f"agent-{sanitized_email}-{client_harness}"
                except HTTPException as exc:
                    if exc.detail == "Token Missing Expiry":
                        logger.warning("WS magic-link JWT missing exp")
                    else:
                        logger.debug(f"WS magic-link JWT rejected: {exc.detail}")
            
            if not authenticated and not is_stale_hex_session_token:
                attempts, _ = auth_attempts.get(client_ip, (0, None))
                attempts += 1
                lock = now + LOCKOUT_TIME if attempts >= MAX_AUTH_ATTEMPTS else None
                auth_attempts[client_ip] = (attempts, lock)
                
        if not authenticated:
            await websocket.close(code=1008, reason="Invalid API Token")
            return

        # Public Joshua seats must not unlock on JWT alone (#191).
        # auth_success is emitted after the harness can accept paste.
        is_public_agent = bool(
            target_session_override and str(target_session_override).startswith("agent-")
        )
        if not is_public_agent:
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
        if not os.path.exists(user_root_dir):
            logger.error(f"User root {user_root_dir} does not exist. Rejecting connection.")
            await websocket.send_text("**System Error:** Your Sovereign Workspace has not been provisioned by the Administrator.")
            await websocket.close()
            return

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
        # Do not create a 0-byte auth.json. Grok treats that stub as "need login"
        # and Joshua never shows the device code (#189).
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
        from routes_sessions import kill_all_user_sessions
        await kill_all_user_sessions(base_agent_name, exclude_session=target_session_override)
        # ──────────────────────────────────────────────────────────────────

        proc = await asyncio.create_subprocess_exec(
            "tmux", "has-session", "-t", target_session_override,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await proc.wait()
        
        needs_reboot = False
        if proc.returncode == 0:
            pane_proc = await asyncio.create_subprocess_exec(
                "tmux", "list-panes", "-t", target_session_override, "-F", "#{pane_current_command}",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            pane_stdout, _ = await pane_proc.communicate()
            pane_cmd = pane_stdout.decode().strip().splitlines()[0].strip() if pane_stdout else ""
            if pane_cmd in ("bash", "-bash", "sh", "-sh", "zsh", "-zsh"):
                logger.warning(
                    f"Session {target_session_override} has bare shell pane ({pane_cmd!r}); killing zombie session to respawn bwrap."
                )
                kill_proc = await asyncio.create_subprocess_exec(
                    "tmux", "kill-session", "-t", target_session_override,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                await kill_proc.wait()
                needs_reboot = True

        if proc.returncode == 0 and not needs_reboot and client_byok_fingerprint:
            env_proc = await asyncio.create_subprocess_exec(
                "tmux", "show-environment", "-t", target_session_override, "BYOK_API_KEY",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await env_proc.communicate()
            existing_key = stdout.decode().strip()
            if existing_key != f"BYOK_API_KEY={client_byok_fingerprint}":
                logger.info(f"API key changed for {target_session_override}. Killing old session.")
                await asyncio.create_subprocess_exec("tmux", "kill-session", "-t", target_session_override)
                needs_reboot = True
                
        if proc.returncode != 0 or needs_reboot:
            logger.info(f"Starting TMUX session for {target_session_override}...")
            smtp_flags = bwrap_smtp_setenv(operator_email=jwt_operator_email)
            if smtp_configured():
                logger.info(
                    "Injecting loopback sandbox email relay token into bwrap (SMTP credentials kept on host)."
                )
            else:
                logger.warning("AIM_SMTP_* / LEADDEED_SMTP_* missing on host — customer agents cannot send mail.")
            
            # Completely decoupled execution pipelines for each harness
            if client_harness == "opencode":
                cli_args = f"{HOME_DIR}/.opencode/bin/opencode --auto"
                cli_model = client_opencode_cli_model or map_opencode_cli_model(
                    client_opencode_provider, client_gemini_model
                )
                if cli_model:
                    cli_args += f" --model {cli_model}"
                # TUI rejects --variant (prints help). Set it via sandbox config.
                oc_data_dir = os.path.join(workspace_dir, "opencode_data")
                oc_cfg_dir = os.path.join(oc_data_dir, "joshua_config")
                oc_state_dir = os.path.join(oc_data_dir, "joshua_state")
                os.makedirs(oc_state_dir, exist_ok=True)
                write_opencode_user_config(oc_cfg_dir, cli_model, client_opencode_variant)
                # Match the working host login: auth.json, not env-only.
                write_opencode_auth_json(
                    oc_data_dir, client_opencode_provider, client_gemini_api_key or ""
                )
                
                env_injections = f"--setenv AIM_VESSEL_CLI 'opencode' {smtp_flags}"
                env_injections += opencode_bwrap_setenv(
                    client_opencode_provider, client_gemini_api_key or ""
                )
                
                oauth_binds = (
                    f"--bind {agent_brain_dir}/antigravity-oauth-token {HOME_DIR}/.gemini/antigravity-cli/antigravity-oauth-token "
                    f"--bind {agent_brain_dir}/antigravity-oauth-token {HOME_DIR}/.opencode/opencode-oauth-token "
                )
                
                oc_skill_binds = build_opencode_bwrap_skill_binds(HOME_DIR, oc_cfg_dir)

                bwrap_cmd = (
                    f"bwrap --ro-bind / / --dev /dev --proc /proc --bind /tmp /tmp "
                    f"--tmpfs {HOME_DIR} "
                    f"{env_injections}"
                    f"--dir {HOME_DIR}/.config "
                    f"--bind {oc_cfg_dir} {HOME_DIR}/.config/opencode "
                    f"{oc_skill_binds}"
                    f"--ro-bind {HOME_DIR}/.local {HOME_DIR}/.local "
                    f"--bind {oc_state_dir} {HOME_DIR}/.local/state/opencode "
                    f"--ro-bind {HOME_DIR}/.gemini {HOME_DIR}/.gemini "
                    f"--ro-bind {HOME_DIR}/.opencode {HOME_DIR}/.opencode "
                    f"--bind {oc_data_dir} {HOME_DIR}/.local/share/opencode "
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
                        "grok-4.6": "grok-4.6",
                        "grok-4.5": "grok-4.6",
                        "grok-4.3": "grok-4.3",
                        "grok-beta": "grok-beta"
                    }
                    mapped_model = model_mapping.get(client_gemini_model, "grok-4.6")
                    cli_args += f" --model {mapped_model}"
                
                env_injections = f"--setenv AIM_VESSEL_CLI 'grok' {smtp_flags}"
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
                import glob as _glob
                resume_flag = " -c" if _glob.glob(os.path.join(agent_conv_dir, "*.db")) else ""
                cli_args = f"{HOME_DIR}/.local/bin/agy --dangerously-skip-permissions{resume_flag} --log-file /dev/null"
                if client_gemini_model:
                    model_mapping = {
                        "gemini-3.5-flash-lite": "gemini-3.8-flash-low",
                        "gemini-3.5-flash": "gemini-3.8-flash-medium",
                        "gemini-3.1-pro": "gemini-4-argon-high",
                        "gemini-3.8-flash-low": "gemini-3.8-flash-low",
                        "gemini-3.8-flash-medium": "gemini-3.8-flash-medium",
                        "gemini-3.8-flash-high": "gemini-3.8-flash-high",
                        "gemini-4-argon-low": "gemini-4-argon-low",
                        "gemini-4-argon-medium": "gemini-4-argon-medium",
                        "gemini-4-argon-high": "gemini-4-argon-high",
                    }
                    mapped_model = model_mapping.get(client_gemini_model)
                    if mapped_model:
                        cli_args += f" --model {mapped_model}"
                
                env_injections = f"--setenv AIM_VESSEL_CLI 'admin-cli' {smtp_flags}"
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
                import glob as _glob
                resume_flag = " -c" if _glob.glob(os.path.join(agent_conv_dir, "*.db")) else ""
                cli_args = f"{HOME_DIR}/.local/bin/agy{resume_flag} --log-file /dev/null"
                if client_gemini_model:
                    model_mapping = {
                        "gemini-3.5-flash-lite": "gemini-3.8-flash-low",
                        "gemini-3.5-flash": "gemini-3.8-flash-medium",
                        "gemini-3.1-pro": "gemini-4-argon-high",
                        "gemini-3.8-flash-low": "gemini-3.8-flash-low",
                        "gemini-3.8-flash-medium": "gemini-3.8-flash-medium",
                        "gemini-3.8-flash-high": "gemini-3.8-flash-high",
                        "gemini-4-argon-low": "gemini-4-argon-low",
                        "gemini-4-argon-medium": "gemini-4-argon-medium",
                        "gemini-4-argon-high": "gemini-4-argon-high",
                    }
                    mapped_model = model_mapping.get(client_gemini_model)
                    if mapped_model:
                        cli_args += f" --model {mapped_model}"
                
                env_injections = f"--setenv AIM_VESSEL_CLI '{client_harness}' {smtp_flags}"
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

            bwrap_log_path = os.path.join(BACKEND_DIR, "bwrap_cmd.log")
            os.makedirs(BACKEND_DIR, exist_ok=True)
            log_fd = os.open(bwrap_log_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(log_fd, "w", encoding="utf-8") as f:
                f.write(redact_bwrap_cmd(bwrap_cmd, secrets=[client_gemini_api_key or ""]))
            try:
                os.chmod(bwrap_log_path, 0o600)
            except OSError:
                pass

            start_proc = await asyncio.create_subprocess_exec(
                "tmux", "new-session", "-d", "-s", target_session_override, bwrap_cmd,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await start_proc.communicate()
            if start_proc.returncode != 0:
                logger.error(f"Failed to create TMUX session. stdout: {stdout.decode()} stderr: {stderr.decode()}")
                await websocket.send_text(json.dumps({
                    "type": "ingest_error",
                    "message": "Failed to start the harness session. The CLI is not ready.",
                }))
                await websocket.close(code=1011, reason="Harness spawn failed")
                return
            logger.info(f"TMUX session {target_session_override} created successfully.")
            if client_byok_fingerprint:
                subprocess.run(["tmux", "set-environment", "-t", target_session_override, "BYOK_API_KEY", client_byok_fingerprint])

            # Trust-folder splash, then the same settle the admin PTY uses on
            # is_new_session. Only then is paste safe (#191).
            await asyncio.sleep(PUBLIC_HARNESS_BOOT_S)
            subprocess.run(["tmux", "send-keys", "-t", target_session_override, "Enter"])
            await asyncio.sleep(PUBLIC_HARNESS_SETTLE_S)

        # JWT is already verified. Unlock Joshua only now that tmux can take paste.
        await websocket.send_text(json.dumps({"type": "auth_success"}))

        import watchfiles
            
        async def ingest_task():
            while True:
                try:
                    message = await websocket.receive_text()
                    if ENABLE_E2EE and public_session_e2ee_secret and not message.strip().startswith("{"):
                        try:
                            message = decrypt_message(message, public_session_e2ee_secret)
                        except Exception as dec_err:
                            logger.warning(
                                f"Public E2EE session key mismatch for {target_session_override}: {dec_err}"
                            )
                            await websocket.send_text(json.dumps({
                                "type": "ingest_error",
                                "message": "E2EE session key mismatch — please refresh.",
                            }))
                            continue

                    data = json.loads(message)
                    if data.get("type") in ("input", "submit"):
                        prompt = data["payload"].strip()
                        if not prompt:
                            continue
                        
                        subprocess.run(["tmux", "set-buffer", prompt])
                        paste = subprocess.run(
                            ["tmux", "paste-buffer", "-p", "-t", target_session_override]
                        )
                        if paste.returncode != 0:
                            logger.error(
                                f"tmux paste-buffer failed for {target_session_override} rc={paste.returncode}"
                            )
                            await websocket.send_text(json.dumps({
                                "type": "ingest_error",
                                "message": "Failed to deliver the message to the harness. The CLI was not ready to accept input.",
                            }))
                            continue
                        sleep_time = max(0.5, len(prompt) / 20000.0)
                        await asyncio.sleep(sleep_time)
                        subprocess.run(["tmux", "send-keys", "-t", target_session_override, "Enter"])
                except WebSocketDisconnect:
                    logger.info(f"WebSocket disconnected ({client_harness} ingest)")
                    break
                except Exception as e:
                    print(f"Ingest loop error: {e}", flush=True)
                    break

        async def egress_task():
            try:
                log_dir = os.path.join(agent_brain_dir)
                last_pos_map = {}
                
                # Pre-populate last_pos_map so we don't stream old history
                import glob
                current_log_files = glob.glob(os.path.join(agent_brain_dir, "*", ".system_generated", "logs", "transcript.jsonl"))
                grok_sessions_root = os.path.join(workspace_dir, "grok_data", "sessions")
                if client_harness == "grok":
                    os.makedirs(grok_sessions_root, exist_ok=True)
                    current_log_files.extend(
                        glob.glob(os.path.join(grok_sessions_root, "*", "*", "chat_history.jsonl"))
                    )
                for lf in current_log_files:
                    if os.path.exists(lf):
                        with open(lf, "r") as f:
                            f.seek(0, 2)
                            last_pos_map[lf] = f.tell()
                
                last_keepalive = time.time()
                watch_roots = [log_dir]
                if client_harness == "grok":
                    watch_roots.append(grok_sessions_root)
                opencode_db_path = os.path.join(workspace_dir, "opencode_data", "opencode.db")
                opencode_data_dir = os.path.join(workspace_dir, "opencode_data")
                opencode_last_ts = 0
                if client_harness == "opencode":
                    os.makedirs(opencode_data_dir, exist_ok=True)
                    watch_roots.append(opencode_data_dir)
                    if os.path.exists(opencode_db_path):
                        try:
                            opencode_last_ts = opencode_max_part_ts(opencode_db_path)
                        except Exception as e:
                            logger.warning(f"OpenCode cursor seed failed: {e}")
            except Exception as e:
                print(f"Egress task setup error: {e}", flush=True)
                logger.error(f"Egress task setup error: {e}", exc_info=True)
                return
            try:
                async def drain_opencode():
                    nonlocal opencode_last_ts
                    if client_harness != "opencode" or not os.path.exists(opencode_db_path):
                        return
                    try:
                        new_bits = iter_new_opencode_assistant_texts(opencode_db_path, opencode_last_ts)
                    except Exception as e:
                        logger.warning(f"OpenCode live scrape failed: {e}")
                        return
                    for ts, clean_output in new_bits:
                        opencode_last_ts = max(opencode_last_ts, ts)
                        if ENABLE_E2EE and public_session_e2ee_secret:
                            encrypted = encrypt_bytes(clean_output.encode("utf-8"), public_session_e2ee_secret)
                            logger.info(f"Sending E2EE bytes back to frontend: {clean_output[:100]}...")
                            await websocket.send_bytes(encrypted)
                        else:
                            logger.info(f"Sending response back to frontend: {clean_output}")
                            await websocket.send_text(clean_output)

                async for changes in watchfiles.awatch(*watch_roots, rust_timeout=15000, yield_on_timeout=True):
                    now = time.time()
                    if now - last_keepalive >= 15.0:
                        last_keepalive = now
                        if not await ws_send_app_text(
                            websocket,
                            "keepalive_ping",
                            e2ee_secret=public_session_e2ee_secret,
                        ):
                            break

                    db_touched = False
                    if changes:
                        for change_type, path in changes:
                            if path.endswith("opencode.db") or path.endswith("opencode.db-wal") or path.endswith("opencode.db-shm"):
                                db_touched = True
                    if client_harness == "opencode" and (db_touched or not changes):
                        await drain_opencode()
                    
                    if not changes:
                        continue
                        
                    modified_transcripts = set()
                    for change_type, path in changes:
                        if path.endswith("transcript.jsonl") or path.endswith("chat_history.jsonl"):
                            modified_transcripts.add(path)
                            
                    for lf in modified_transcripts:
                        if not os.path.exists(lf):
                            continue
                        if lf not in last_pos_map:
                            last_pos_map[lf] = 0
                            
                        with open(lf, "r") as f:
                            f.seek(last_pos_map[lf])
                            log_lines = f.readlines()
                            
                            for line in log_lines:
                                if not line.endswith("\n"):
                                    break
                                last_pos_map[lf] += len(line)
                                try:
                                    log_data = json.loads(line)
                                    clean_output = extract_live_agent_text(log_data)
                                    if clean_output:
                                        if ENABLE_E2EE and public_session_e2ee_secret:
                                            encrypted = encrypt_bytes(clean_output.encode("utf-8"), public_session_e2ee_secret)
                                            logger.info(f"Sending E2EE bytes back to frontend: {clean_output[:100]}...")
                                            await websocket.send_bytes(encrypted)
                                        else:
                                            logger.info(f"Sending response back to frontend: {clean_output}")
                                            await websocket.send_text(clean_output)
                                except Exception:
                                    pass
            except asyncio.CancelledError:
                pass
            except Exception as e:
                print(f"Egress loop error: {e}", flush=True)
                logger.error(f"Egress loop error: {e}", exc_info=True)
            print("Egress task finished normally!", flush=True)

        ingest = asyncio.create_task(ingest_task())
        egress = asyncio.create_task(egress_task())
        
        done, pending = await asyncio.wait([ingest, egress], return_when=asyncio.FIRST_COMPLETED)
        print(f"Tasks finished: {[t.get_name() for t in done]}", flush=True)
        for t in done:
            try:
                t.result()
            except Exception as e:
                print(f"Task failed: {e}", flush=True)
        
        for p in pending:
            p.cancel()
        return

    # ADMIN CONNECTIONS (RAW PTY & TMUX MODE)
    # =====================================================================
    # Resolve target_session BEFORE forking so both parent and child processes know the session name (#243)
    target_session = target_session_override or requested_admin_session
    if not target_session:
        # Find a tmux session that isn't aim-connect-workspace or a tenant agent-* bwrap sandbox
        ls_rc, ls_stdout, _ = await _run_tmux_cmd("ls", "-F", "#{session_name}")
        if ls_rc == 0:
            sessions_found = [s.strip() for s in ls_stdout.splitlines() if s.strip()]
            for line in sessions_found:
                if line != "aim-connect-workspace" and not line.startswith("agent-"):
                    target_session = line
                    break
        if not target_session:
            target_session = "aim-connect-main"

    is_new_session = False
    has_rc, _, _ = await _run_tmux_cmd("has-session", "-t", target_session)
    if has_rc != 0:
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
            admin_cli = build_admin_initial_command(client_harness)
            if admin_cli:
                subprocess.run(["tmux", "send-keys", "-t", target_session, admin_cli, "Enter"])
        os.execvp("tmux", ["tmux", "attach", "-t", target_session])
    
    # Parent process
    pty_entry = {
        "pid": pid,
        "fd": fd,
        "evict_event": asyncio.Event(),
        "cleaned_up": False,
    }
    pty_client_key = (token, client_instance_id) if client_instance_id else None
    if pty_client_key:
        prev_entry = _ACTIVE_ADMIN_PTY_CLIENTS.get(pty_client_key)
        if prev_entry is not None and prev_entry is not pty_entry:
            _cleanup_admin_pty_entry(prev_entry)
        _ACTIVE_ADMIN_PTY_CLIENTS[pty_client_key] = pty_entry

    last_activity = time.time()
    last_outbound = time.time()
    INACTIVITY_TIMEOUT = 86400  # 24 hours

    async def read_from_pty():
        nonlocal last_outbound
        loop = asyncio.get_running_loop()
        while not pty_entry["evict_event"].is_set():
            try:
                data = await loop.run_in_executor(None, _read_pty_coalesced, fd)
                if not data:
                    break
                if ENABLE_E2EE and E2EE_SECRET:
                    data = encrypt_bytes(data, E2EE_SECRET)
                await websocket.send_bytes(data)
                last_outbound = time.time()
            except Exception as e:
                if not pty_entry["cleaned_up"]:
                    logger.error(f"PTY read error: {e}")
                break

    async def write_to_pty():
        nonlocal last_activity, last_outbound, target_session
        while not pty_entry["evict_event"].is_set():
            try:
                message = await websocket.receive_text()
                try:
                    if ENABLE_E2EE and E2EE_SECRET and not message.strip().startswith("{"):
                        try:
                            message = decrypt_message(message, E2EE_SECRET)
                        except Exception as dec_err:
                            logger.warning(f"E2EE Decryption failed (Invalid Secret?): {dec_err}")
                            await ws_send_control_json(
                                websocket,
                                {"type": "error", "message": "E2EE Decryption Failed. Check your E2EE Secret."},
                            )
                            continue
                    data = json.loads(message)
                    msg_type = data.get("type")
                    if msg_type in ("ping", "resize"):
                        if not is_token_valid(token, tokens_store=VALID_API_TOKENS):
                            await websocket.close(code=1008, reason="Token Expired")
                            break
                        if msg_type == "ping":
                            pong_payload = {"type": "pong"}
                            if "ts" in data:
                                pong_payload["ts"] = data["ts"]
                            if await ws_send_control_json(websocket, pong_payload):
                                last_outbound = time.time()
                            else:
                                break
                        else:
                            set_pty_size(fd, data["rows"], data["cols"])
                        continue

                    # Active user interaction: validate & slide 4h token TTL forward (#247)
                    if not touch_api_token(token, tokens_store=VALID_API_TOKENS):
                        await websocket.close(code=1008, reason="Token Expired")
                        break
                    last_activity = time.time()

                    if msg_type == "input":
                        os.write(fd, data["payload"].encode("utf-8"))
                    elif msg_type == "paste":
                        text = data.get("payload", "")
                        paste_session = data.get("session") or target_session
                        submit_after = bool(data.get("submit"))
                        if text and paste_session:
                            asyncio.create_task(
                                execute_bracketed_paste(
                                    paste_session,
                                    text,
                                    submit_enter=submit_after,
                                )
                            )
                    elif msg_type == "submit":
                        text = data.get("payload", "")
                        submit_target = (data.get("to") or data.get("session") or target_session or "").strip()
                        submit_sender = data.get("from")
                        submit_reply_to = data.get("reply_to")
                        submit_subject = data.get("subject")
                        wait_for_boot = is_new_session
                        is_new_session = False
                        logger.info(f"Executing A-Mail submit for {submit_target}")
                        asyncio.create_task(
                            execute_amail_submit(
                                submit_target,
                                text,
                                sender=submit_sender,
                                reply_to=submit_reply_to,
                                subject=submit_subject,
                                is_new_session=wait_for_boot,
                            )
                        )
                    elif msg_type == "switch_session":
                        next_sess = (data.get("session") or "").strip()
                        if not next_sess or not re.match(r"^[a-zA-Z0-9_.-]+$", next_sess):
                            continue
                        target_session = next_sess
                        # Find the client tty attached to this specific pid asynchronously (#243)
                        _, clients_out, _ = await _run_tmux_cmd(
                            "list-clients", "-F", "#{client_tty} #{client_pid}"
                        )
                        client_tty = None
                        for line in clients_out.strip().split("\n"):
                            if line:
                                parts = line.split()
                                if len(parts) >= 2 and parts[1] == str(pid):
                                    client_tty = parts[0]
                                    break

                        if client_tty:
                            sw_rc, _, sw_err = await _run_tmux_cmd(
                                "switch-client", "-c", client_tty, "-t", next_sess
                            )
                            if sw_rc != 0:
                                logger.warning(f"[SWITCH_SESSION] Switch failed ({sw_rc}): {sw_err.strip()}")
                        else:
                            logger.warning(f"Could not find tmux client for pid {pid}")
                except json.JSONDecodeError:
                    if not touch_api_token(token, tokens_store=VALID_API_TOKENS):
                        await websocket.close(code=1008, reason="Token Expired")
                        break
                    last_activity = time.time()
                    os.write(fd, message.encode("utf-8"))
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected")
                break
            except Exception as e:
                if not pty_entry["cleaned_up"]:
                    logger.error(f"PTY write error: {e}", exc_info=True)
                break

    async def inactivity_monitor():
        nonlocal last_outbound
        while not pty_entry["evict_event"].is_set():
            sleep_step = min(5.0, max(0.02, float(ADMIN_KEEPALIVE_INTERVAL_S)))
            await asyncio.sleep(sleep_step)
            if not is_token_valid(token, tokens_store=VALID_API_TOKENS):
                logger.info("Closing admin websocket due to expired or revoked API token")
                await websocket.close(code=1008, reason="Token Expired")
                break
            now_ts = time.time()
            if now_ts - last_activity > INACTIVITY_TIMEOUT:
                logger.warning(f"Closing websocket due to inactivity timeout ({INACTIVITY_TIMEOUT}s)")
                await websocket.close(code=1008, reason="Inactivity timeout")
                break
            if now_ts - last_outbound >= float(ADMIN_KEEPALIVE_INTERVAL_S):
                if not await ws_send_control_json(websocket, {"type": "pong", "keepalive": True}):
                    break
                last_outbound = time.time()

    task1 = asyncio.create_task(read_from_pty())
    task2 = asyncio.create_task(write_to_pty())
    task3 = asyncio.create_task(inactivity_monitor())
    task4 = asyncio.create_task(pty_entry["evict_event"].wait())

    try:
        done, pending = await asyncio.wait(
            [task1, task2, task3, task4],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
    finally:
        if pty_client_key and _ACTIVE_ADMIN_PTY_CLIENTS.get(pty_client_key) is pty_entry:
            _ACTIVE_ADMIN_PTY_CLIENTS.pop(pty_client_key, None)
        _cleanup_admin_pty_entry(pty_entry)
        if pty_entry["evict_event"].is_set():
            try:
                await websocket.close(code=1000, reason="Replaced by reconnected tab")
            except Exception:
                pass

