import subprocess
import os
import shutil
import logging
from pydantic import BaseModel
from fastapi import APIRouter, Header, HTTPException, Depends
from main import (
    verify_token, require_admin, _get_user_from_token,
    SESSION_NAME_RE, AGENT_WORKSPACES_DIR, AIM_CONNECT_ROOT,
    ENABLE_E2EE, E2EE_SECRET
)
import asyncio

router = APIRouter()
logger = logging.getLogger("aim-connect")


async def kill_all_user_sessions(sanitized_email: str, exclude_session: str = ""):
    """Kill ALL tmux sessions for this email to enforce 1-email-1-session.
    
    This is the server-side safety net that guarantees no ghost sessions
    persist across harness switches, browser crashes, or failed frontend
    DELETE calls. Called before spawning a new session.
    
    Args:
        sanitized_email: The user's email sanitized for tmux naming
        exclude_session: Optional session name to keep alive (for reconnects)
    """
    try:
        proc = await asyncio.create_subprocess_exec(
            "tmux", "list-sessions", "-F", "#{session_name}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()
        if proc.returncode != 0:
            return  # No tmux server or no sessions — nothing to kill
        
        prefix = f"agent-{sanitized_email}"
        for session_name in stdout.decode().strip().split('\n'):
            session_name = session_name.strip()
            if not session_name:
                continue
            # Match sessions that are exactly the prefix or start with prefix-
            if session_name == prefix or session_name.startswith(f"{prefix}-"):
                if exclude_session and session_name == exclude_session:
                    continue
                logger.info(f"[HARNESS SWITCH] Killing orphan session: {session_name}")
                await asyncio.create_subprocess_exec(
                    "tmux", "kill-session", "-t", session_name
                )
    except Exception as e:
        logger.warning(f"[HARNESS SWITCH] Error during session cleanup for {sanitized_email}: {e}")


@router.get("/api/sessions", dependencies=[Depends(verify_token)])
def get_sessions(x_api_token: str = Header(None)) -> dict:

    result = subprocess.run(["tmux", "ls", "-F", "#{session_name}"], capture_output=True, text=True)
    sessions = []
    role, prefix = _get_user_from_token(x_api_token)
    if result.returncode == 0:
        for line in result.stdout.splitlines():
            if line and not line.startswith("aim-client-"):
                # Non-admin users only see sessions with their prefix (or all if no prefix)
                if role == "admin" or not prefix or line.startswith(prefix):
                    sessions.append(line)
    return {"sessions": sessions}

class SessionRequest(BaseModel):
    name: str

class E2EESettingsRequest(BaseModel):
    secret: str

@router.post("/api/settings/e2ee", dependencies=[Depends(verify_token), Depends(require_admin)])
def update_e2ee_settings(req: E2EESettingsRequest):
    """Updates the backend E2EE_SECRET dynamically and writes it to .env"""
    global ENABLE_E2EE, E2EE_SECRET
    
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
    new_lines = []
    found_enable = False
    found_secret = False
    
    for line in lines:
        if line.startswith("ENABLE_E2EE="):
            new_lines.append("ENABLE_E2EE=true\n" if req.secret else "ENABLE_E2EE=false\n")
            found_enable = True
        elif line.startswith("E2EE_SECRET="):
            new_lines.append(f'E2EE_SECRET="{req.secret}"\n')
            found_secret = True
        else:
            new_lines.append(line)
            
    if not found_enable:
        new_lines.append("ENABLE_E2EE=true\n" if req.secret else "ENABLE_E2EE=false\n")
    if not found_secret:
        new_lines.append(f'E2EE_SECRET="{req.secret}"\n')
        
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
        
    ENABLE_E2EE = bool(req.secret)
    E2EE_SECRET = req.secret
    return {"status": "success", "message": "E2EE settings updated on backend."}


@router.post("/api/sessions", dependencies=[Depends(verify_token), Depends(require_admin)])
def create_session(req: SessionRequest) -> dict:
    """Spawns a new detached tmux session and enables global mouse support."""
    if not SESSION_NAME_RE.match(req.name):
        raise HTTPException(status_code=400, detail="Invalid session name. Use only letters, numbers, hyphens, underscores (max 64 chars).")

    result = subprocess.run(["tmux", "new-session", "-d", "-s", req.name], capture_output=True, text=True)
    if result.returncode == 0:
        subprocess.run(["tmux", "set-option", "-g", "mouse", "on"])
        return {"status": "success"}
    return {"error": result.stderr}

@router.delete("/api/sessions/{name}", dependencies=[Depends(verify_token), Depends(require_admin)])
def kill_session(name: str, delete_workspace: bool = False):

    import shutil
    import re
    result = subprocess.run(["tmux", "kill-session", "-t", name], capture_output=True, text=True)
    
    if delete_workspace:
        # Obliterate the workspace directory for the agent/subagent
        # Unified model: primary sessions use user_root_dir, fleet sub-agents use fleet_sessions/
        workspace_dir = None
        parts = name.split('-')
        if name.startswith('agent-') and len(parts) >= 2:
            base_agent = f"agent-{parts[1]}"
            user_root_dir = f"{AGENT_WORKSPACES_DIR}/{base_agent}"
            if len(parts) > 3:
                # Fleet sub-agent: only delete its conversation isolation dir
                sub_id = '-'.join(parts[2:])
                workspace_dir = f"{user_root_dir}/fleet_sessions/{sub_id}"
            else:
                # Primary session — delete the entire user workspace
                workspace_dir = user_root_dir
        else:
            # Fallback for generic non-agent workspaces
            workspace_dir = f"{AIM_CONNECT_ROOT}/workspace/{name}"
            
        if workspace_dir and os.path.exists(workspace_dir):
            try:
                shutil.rmtree(workspace_dir)
                logger.info(f"Obliterated workspace directory: {workspace_dir}")
            except Exception as e:
                logger.error(f"Failed to delete workspace directory {workspace_dir}: {e}")
                return {"status": "success", "warning": f"Session killed, but failed to delete workspace: {e}"}

    if result.returncode == 0 or "can't find session" in result.stderr:
        return {"status": "success"}
    return {"error": result.stderr}

@router.get("/api/scrollback/{session_name}", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_scrollback(session_name: str):

    try:
        # Capture pane with ANSI colors (-e) and max 1000 lines of history (-S -1000)
        # to prevent mobile DOM lockups from massive buffers
        result = subprocess.run(
            ["tmux", "capture-pane", "-t", session_name, "-S", "-1000", "-e", "-p"],
            capture_output=True,
            text=True,
            check=True
        )
        return {"scrollback": result.stdout}
    except Exception as e:
        return {"error": str(e)}
