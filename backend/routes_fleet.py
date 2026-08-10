import os
import json
import asyncio
import subprocess
import base64
import hmac
import hashlib
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from main import AGENT_WORKSPACES_DIR
from routes_agents import _verify_dashboard_jwt
from ws_handler import resolve_workspace_id_for_email, legacy_sanitize_email
import logging

router = APIRouter()
logger = logging.getLogger("aim-connect")

@router.delete("/api/fleet/sessions/{agent_id}")
async def delete_fleet_session(agent_id: str, token: str = Query(None)):
    if not token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
        
    try:
        _verify_dashboard_jwt(token)
        
        parts = token.split(".")
        import base64
        def pad_b64(data): return data + "=" * (-len(data) % 4)
        payload = json.loads(base64.urlsafe_b64decode(pad_b64(parts[0])).decode())
        
        email = payload.get("e")
        if not email:
            return JSONResponse({"error": "Invalid payload"}, status_code=401)

        workspace_id = resolve_workspace_id_for_email(email)
        legacy_id = legacy_sanitize_email(email)
        allowed = list(dict.fromkeys([f"agent-{workspace_id}", f"agent-{legacy_id}"]))
        if not any(agent_id == b or agent_id.startswith(b + "-") for b in allowed):
            return JSONResponse({"error": "Unauthorized access to this agent"}, status_code=403)

        # Map frontend legacy agent_id → live tmux session prefix (op_*)
        kill_target = agent_id
        for leg, real in ((f"agent-{legacy_id}", f"agent-{workspace_id}"),):
            if leg != real and (agent_id == leg or agent_id.startswith(leg + "-")):
                kill_target = real + agent_id[len(leg):]
                break

        proc = await asyncio.create_subprocess_exec("tmux", "kill-session", "-t", kill_target)
        await proc.wait()
        # Also try the raw id if different (belt and suspenders)
        if kill_target != agent_id:
            await asyncio.create_subprocess_exec("tmux", "kill-session", "-t", agent_id)
        return {"status": "killed", "agent_id": kill_target}
        
    except Exception as e:
        logger.error(f"Fleet delete error: {e}")
        return JSONResponse({"error": "Token parsing failed"}, status_code=401)

@router.get("/api/fleet/sessions/{agent_id}")
async def get_fleet_sessions(agent_id: str, token: str = Query(None)):
    if not token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
        
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return JSONResponse({"error": "Invalid Token Format"}, status_code=401)
            
        payload_b64, signature_b64 = parts
        secret = os.environ.get("LEADDEED_DOWNLOAD_SIGNING_SECRET", "")
        if not secret:
            return JSONResponse({"error": "Missing Secret"}, status_code=500)
            
        def pad_b64(data):
            return data + "=" * (-len(data) % 4)
            
        expected_mac = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).digest()
        expected_b64 = base64.urlsafe_b64encode(expected_mac).decode().rstrip("=")
        
        if signature_b64.rstrip("=") != expected_b64:
            return JSONResponse({"error": "Invalid Signature"}, status_code=401)
            
        payload = json.loads(base64.urlsafe_b64decode(pad_b64(payload_b64)).decode())
        email = payload.get("e")
        if not email:
            return JSONResponse({"error": "Missing Email"}, status_code=401)

        workspace_id = resolve_workspace_id_for_email(email)
        legacy_id = legacy_sanitize_email(email)
        allowed = list(dict.fromkeys([f"agent-{workspace_id}", f"agent-{legacy_id}"]))
        if agent_id not in allowed:
            return JSONResponse({"error": "Agent ID Mismatch"}, status_code=403)

        # Prefer registry workspace for live tmux naming
        session_prefix = f"agent-{workspace_id}"
            
    except Exception as e:
        return JSONResponse({"error": "Token Parsing Failed"}, status_code=401)


    result = subprocess.run(["tmux", "ls", "-F", "#{session_name}"], capture_output=True, text=True)
    sessions = []
    if result.returncode == 0:
        for line in result.stdout.splitlines():
            # Match only sub-sessions like agent-{id}-chat-123, exclude primary harness session
            if line and line.startswith(f"{session_prefix}-"):
                sub_id_part = line[len(f"{session_prefix}-"):]
                # A regular session is just 'harness' (no hyphens). A sub-session is 'harness-subid' (has hyphen).
                if "-" in sub_id_part and sub_id_part not in ["admin-cli", "google-ai", "google-news", "google-web"]:
                    sessions.append({"id": sub_id_part, "full_name": line})
                
    return {"sessions": sessions}
