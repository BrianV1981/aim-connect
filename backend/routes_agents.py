import os
import json
import re
import asyncio
import subprocess
import time
import glob
import base64
import hmac
import hashlib
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Query
from fastapi.responses import HTMLResponse, FileResponse
from main import (
    verify_token, require_admin, AGENT_WORKSPACES_DIR, HOME_DIR
)
from ws_handler import resolve_workspace_id_for_email, legacy_sanitize_email
import logging

router = APIRouter()
logger = logging.getLogger("aim-connect")

grok_oauth_processes = {}

def _verify_dashboard_jwt(token: str):
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        import base64, hmac, hashlib, time as _time
        parts = token.split(".")
        if len(parts) != 2:
            raise HTTPException(status_code=401, detail="Invalid Token Format")
        payload_b64, signature_b64 = parts
        secret = os.environ.get("LEADDEED_DOWNLOAD_SIGNING_SECRET", "")
        if not secret:
            raise HTTPException(status_code=500, detail="Missing Secret")
        expected_mac = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).digest()
        expected_b64 = base64.urlsafe_b64encode(expected_mac).decode().rstrip("=")
        if signature_b64.rstrip("=") != expected_b64:
            raise HTTPException(status_code=401, detail="Unauthorized")
        # Enforce exp claim (#161)
        def _pad_b64(data):
            return data + "=" * (-len(data) % 4)
        payload_json = base64.urlsafe_b64decode(_pad_b64(payload_b64)).decode()
        payload_data = json.loads(payload_json)
        exp = payload_data.get("exp")
        if exp is not None and _time.time() > float(exp):
            raise HTTPException(status_code=401, detail="Token Expired")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token Verification Failed")

@router.post("/api/sync_csv/{agent_id}", dependencies=[Depends(verify_token), Depends(require_admin)])
async def sync_csv(agent_id: str, file: UploadFile = File(...)):
    """
    Multi-Tenant Database Ingestion:
    Receives a CSV/Data file and drops it into the agent's insulated _ingest folder,
    then triggers the Subconscious Daemon to vectorize and chunk the data into the Engram DB.
    """
    base_agent_name = agent_id.replace('@', '_').replace('.', '_')
    workspace_dir = f"{AGENT_WORKSPACES_DIR}/agent-{base_agent_name}"
    
    if not os.path.exists(workspace_dir):
        raise HTTPException(status_code=404, detail=f"Sovereign workspace for {agent_id} not found.")
        
    ingest_dir = os.path.join(workspace_dir, "brain", "memory-wiki", "_ingest")
    os.makedirs(ingest_dir, exist_ok=True)
    
    # Save the raw file to the _ingest folder
    safe_filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', file.filename)
    file_path = os.path.join(ingest_dir, safe_filename)
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
        
    try:
        # Run in background so we don't block the API response
        subprocess.Popen(
            [os.path.join(HOME_DIR, ".local", "bin", "agy"), "wiki", "process"],
            cwd=workspace_dir
        )
    except Exception as e:
        logger.error(f"Failed to trigger Subconscious Daemon for {agent_id}: {e}")
        
    return {
        "status": "success",
        "message": f"Successfully dropped {safe_filename} into {agent_id}'s _ingest folder. The Subconscious Daemon is now vectorizing it into the Engram DB.",
        "file": file_path
    }

class IntegrationRequest(BaseModel):
    gmail_address: str
    gmail_app_password: str

@router.get("/api/integrations/{agent_id}", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_integrations(agent_id: str):
    base_agent_name = agent_id.replace('@', '_').replace('.', '_')
    if not base_agent_name.startswith("agent-"):
        base_agent_name = "agent-" + base_agent_name
    env_path = f"{AGENT_WORKSPACES_DIR}/{base_agent_name}/.env"
    
    data = {"gmail_address": "", "has_password": False}
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("GMAIL_ADDRESS="):
                    data["gmail_address"] = line.split("=", 1)[1].strip().strip('"\'')
                elif line.startswith("GMAIL_APP_PASSWORD="):
                    val = line.split("=", 1)[1].strip().strip('"\'')
                    if val:
                        data["has_password"] = True
    return data

@router.post("/api/integrations/{agent_id}", dependencies=[Depends(verify_token), Depends(require_admin)])
def save_integrations(agent_id: str, req: IntegrationRequest):
    base_agent_name = agent_id.replace('@', '_').replace('.', '_')
    if not base_agent_name.startswith("agent-"):
        base_agent_name = "agent-" + base_agent_name
    workspace_dir = f"{AGENT_WORKSPACES_DIR}/{base_agent_name}"
    
    if not os.path.exists(workspace_dir):
        raise HTTPException(status_code=404, detail="Agent workspace not found")
        
    env_path = os.path.join(workspace_dir, ".env")
    
    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
    new_lines = []
    found_email = False
    found_pass = False
    
    for line in lines:
        if line.startswith("GMAIL_ADDRESS="):
            sanitized_addr = req.gmail_address.replace('"', '').replace("'", '').replace('\n', '').replace('\r', '').replace('\\', '')
            new_lines.append(f'GMAIL_ADDRESS="{sanitized_addr}"\n')
            found_email = True
        elif line.startswith("GMAIL_APP_PASSWORD="):
            if req.gmail_app_password: # Only update if provided
                sanitized_pass = req.gmail_app_password.replace('"', '').replace("'", '').replace('\n', '').replace('\r', '').replace('\\', '')
                new_lines.append(f'GMAIL_APP_PASSWORD="{sanitized_pass}"\n')
            else:
                new_lines.append(line)
            found_pass = True
        else:
            new_lines.append(line)
            
    if not found_email:
        sanitized_addr = req.gmail_address.replace('"', '').replace("'", '').replace('\n', '').replace('\r', '').replace('\\', '')
        new_lines.append(f'GMAIL_ADDRESS="{sanitized_addr}"\n')
    if not found_pass and req.gmail_app_password:
        sanitized_pass = req.gmail_app_password.replace('"', '').replace("'", '').replace('\n', '').replace('\r', '').replace('\\', '')
        new_lines.append(f'GMAIL_APP_PASSWORD="{sanitized_pass}"\n')
        
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
        
    return {"status": "success"}

@router.post("/api/grok/oauth/init")
async def init_grok_oauth(agent_id: str, token: str = ""):
    _verify_dashboard_jwt(token)
    
    parts = agent_id.split('-')
    if len(parts) >= 3 and parts[0] == 'agent':
        base_agent_name = f"agent-{parts[1]}"
        # Unified workspace: workspace_dir IS the user root (no harness- subdirs)
        workspace_dir = f"{AGENT_WORKSPACES_DIR}/{base_agent_name}"
    else:
        base_agent_name = agent_id.replace('@', '_').replace('.', '_')
        if not base_agent_name.startswith("agent-"):
            base_agent_name = "agent-" + base_agent_name
        workspace_dir = f"{AGENT_WORKSPACES_DIR}/{base_agent_name}"

    os.makedirs(os.path.join(workspace_dir, "grok_data"), exist_ok=True)
    auth_file = os.path.join(workspace_dir, "grok_data", "auth.json")
    if os.path.exists(auth_file):
        try:
            os.remove(auth_file)
        except Exception:
            pass
    
    bwrap_cmd = (
        f"script -e -q -c 'bwrap --ro-bind / / --dev /dev --proc /proc --bind /tmp /tmp "
        f"--tmpfs {HOME_DIR} "
        f"--ro-bind {HOME_DIR}/.local {HOME_DIR}/.local "
        f"--bind {workspace_dir}/grok_data {HOME_DIR}/.grok "
        f"--ro-bind {HOME_DIR}/.grok/bin {HOME_DIR}/.grok/bin "
        f"--ro-bind {HOME_DIR}/.grok/downloads {HOME_DIR}/.grok/downloads "
        f"--bind {workspace_dir} {workspace_dir} "
        f"--chdir {workspace_dir} {HOME_DIR}/.grok/bin/grok login --device-auth' /dev/null"
    )

    try:
        proc = await asyncio.create_subprocess_shell(
            bwrap_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
    except Exception as e:
        logger.error(f"Failed to spawn grok login: {e}")
        return {"error": str(e)}
        
    grok_oauth_processes[agent_id] = {"process": proc, "status": "pending"}
    
    url = None
    code = None
    captured_output = []
    
    start_time = time.time()
    while time.time() - start_time < 15.0:
        try:
            line_bytes = await asyncio.wait_for(proc.stdout.readline(), timeout=1.0)
            if not line_bytes:
                break
            line = line_bytes.decode('utf-8', errors='ignore').strip()
            if line:
                captured_output.append(line)
            
            if "https://" in line:
                url_match = re.search(r'(https://[^\s]+)', line)
                if url_match:
                    url = url_match.group(1)
            
            code_match = re.search(r'\b([A-Z0-9]{4}-[A-Z0-9]{4})\b', line)
            if code_match:
                code = code_match.group(1)
                
            if url and code:
                break
        except asyncio.TimeoutError:
            continue

    async def wait_for_auth():
        auth_file = os.path.join(workspace_dir, "grok_data", "auth.json")
        start_wait = time.time()
        success = False
        while time.time() - start_wait < 300: # Wait up to 5 minutes
            if os.path.exists(auth_file) and os.path.getsize(auth_file) > 100:
                success = True
                break
            try:
                await asyncio.wait_for(proc.wait(), timeout=2.0)
                if proc.returncode == 0:
                    success = True
                break
            except asyncio.TimeoutError:
                pass

        if success:
            grok_oauth_processes[agent_id]["status"] = "success"
        else:
            grok_oauth_processes[agent_id]["status"] = "failed"
            
        try:
            proc.terminate()
        except:
            pass
            
    asyncio.create_task(wait_for_auth())
    
    if url and code:
        return {"url": url, "code": code}
    else:
        return {"error": "Failed to parse device code from Grok CLI.", "output": "\n".join(captured_output)}

@router.get("/api/grok/oauth/status")
async def get_grok_oauth_status(agent_id: str, token: str = ""):
    _verify_dashboard_jwt(token)
    if agent_id not in grok_oauth_processes:
        return {"status": "not_found"}
    return {"status": grok_oauth_processes[agent_id]["status"]}

@router.get("/history/{agent_id}")
async def get_history(agent_id: str, token: str = Query(None), limit: int = Query(3, description="Number of reincarnations to show")):
    if not token:
        return HTMLResponse("<h1 style='color:red; font-family:monospace; text-align:center; padding: 50px;'>401 UNAUTHORIZED: Access Denied.</h1>", status_code=401)
        
    try:
        import base64
        import hmac
        import hashlib
        import re
        import json
        
        parts = token.split(".")
        if len(parts) != 2:
            return HTMLResponse("<h1 style='color:red; font-family:monospace; text-align:center; padding: 50px;'>401 UNAUTHORIZED: Invalid Token Format.</h1>", status_code=401)
            
        payload_b64, signature_b64 = parts
        secret = os.environ.get("LEADDEED_DOWNLOAD_SIGNING_SECRET", "")
        if not secret:
            return HTMLResponse("<h1 style='color:red; font-family:monospace; text-align:center; padding: 50px;'>500 INTERNAL ERROR: Missing Secret.</h1>", status_code=500)
            
        def pad_b64(data):
            return data + "=" * (-len(data) % 4)
            
        expected_mac = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).digest()
        expected_b64 = base64.urlsafe_b64encode(expected_mac).decode().rstrip("=")
        
        if signature_b64.rstrip("=") != expected_b64:
            return HTMLResponse("<h1 style='color:red; font-family:monospace; text-align:center; padding: 50px;'>401 UNAUTHORIZED: Invalid Signature.</h1>", status_code=401)
            
        payload = json.loads(base64.urlsafe_b64decode(pad_b64(payload_b64)).decode())
        email = payload.get("e")
        if not email:
            return HTMLResponse("<h1 style='color:red; font-family:monospace; text-align:center; padding: 50px;'>401 UNAUTHORIZED: Missing Email.</h1>", status_code=401)

        # #184: filesystem seat id is op_* (registry). Dashboard still builds
        # agent-{sanitized_email}-* for history/fleet. Accept either form for auth,
        # but always open the registry-resolved workspace on disk.
        workspace_id = resolve_workspace_id_for_email(email)
        legacy_id = legacy_sanitize_email(email)
        expected_bases = [f"agent-{workspace_id}", f"agent-{legacy_id}"]
        # de-dupe if registry falls back to sanitize
        expected_bases = list(dict.fromkeys(expected_bases))

        if not any(agent_id == b or agent_id.startswith(b + "-") for b in expected_bases):
            return HTMLResponse("<h1 style='color:red; font-family:monospace; text-align:center; padding: 50px;'>403 FORBIDDEN: Agent ID Mismatch.</h1>", status_code=403)

        workspace_dir = f"{AGENT_WORKSPACES_DIR}/agent-{workspace_id}"
        agent_brain_dir = os.path.join(workspace_dir, "brain")

        # Harness / fleet suffix after whichever base matched (email slug or op_*)
        sub_id = None
        for base in expected_bases:
            if agent_id == base:
                sub_id = None
                break
            if agent_id.startswith(base + "-"):
                sub_id = agent_id[len(base) + 1 :] or None
                break
            
    except Exception as e:
        return HTMLResponse(f"<h1 style='color:red; font-family:monospace; text-align:center; padding: 50px;'>401 UNAUTHORIZED: Token Parsing Failed.</h1>", status_code=401)

    html = f"<html><head><title>A.I.M. History: {agent_id}</title><style>body{{font-family: 'Courier New', Courier, monospace; background: #080c0a; color: #e0f2e9; padding: 2rem; max-width: 900px; margin: 0 auto; line-height: 1.6;}} h2{{color: #00ff88; text-transform: uppercase; border-bottom: 1px solid #00ff88; padding-bottom: 10px; letter-spacing: 2px; text-shadow: 0 0 5px rgba(0,255,136,0.5);}} .user{{background: #111a15; padding: 1.5rem; border-radius: 4px; margin-bottom: 1rem; border-left: 3px solid #0088ff; color: #a0c4ff;}} .agent{{background: #0d1410; padding: 1.5rem; border-radius: 4px; margin-bottom: 2rem; border-left: 3px solid #00ff88; white-space: pre-wrap; box-shadow: -2px 0 10px rgba(0, 255, 136, 0.1);}} strong{{color: #fff; text-transform: uppercase; letter-spacing: 1px;}} .meta{{font-size: 0.8rem; color: #00ff88; margin-bottom: 15px; opacity: 0.7;}} .boundary{{text-align: center; color: #00ff88; padding: 15px 0; border-top: 1px dashed #00FFA3; border-bottom: 1px dashed #00FFA3; margin: 40px 0; letter-spacing: 3px; font-size: 0.9rem; opacity: 0.6;}}</style></head><body><h2>A.I.M. Sovereign Data Core</h2><div class='meta'>TARGET IDENTIFIER: {agent_id}<br/>WORKSPACE: agent-{workspace_id}<br/>ACCESS LEVEL: ADMINISTRATOR</div>"
    
    opencode_db_path = None
    grok_chat_path = None

    # Normalize harness: primary sessions use "opencode" | "grok" | "admin-cli"
    harness_key = (sub_id or "opencode").split("-")[0] if sub_id else "opencode"
    if harness_key in ("opencode", "chat") or (sub_id and sub_id.startswith("opencode")):
        harness_key = "opencode"
    elif harness_key == "grok" or (sub_id and sub_id.startswith("grok")):
        harness_key = "grok"
    elif harness_key in ("admin-cli", "agy") or (sub_id and ("admin-cli" in sub_id or sub_id.startswith("chat"))):
        harness_key = "admin-cli"

    if harness_key == "grok":
        # Unified workspace: grok_data is at workspace root level
        grok_sessions = glob.glob(os.path.join(workspace_dir, "grok_data", "sessions", "*", "*", "chat_history.jsonl"))
        if grok_sessions:
            grok_chat_path = max(grok_sessions, key=os.path.getmtime)
    elif harness_key == "opencode":
        # Unified workspace: opencode_data is at workspace root level
        opencode_db_path_candidate = os.path.join(workspace_dir, "opencode_data", "opencode.db")
        if os.path.exists(opencode_db_path_candidate):
            opencode_db_path = opencode_db_path_candidate

    import html as escape_html
    if grok_chat_path:
        with open(grok_chat_path, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip(): continue
                try:
                    data = json.loads(line)
                    
                    if data.get("synthetic_reason") == "system_reminder" or data.get("type") == "system":
                        continue
                        
                    role = data.get("type", data.get("role"))
                    content_blocks = data.get("content", [])
                    if not content_blocks: continue
                    text = ""
                    if isinstance(content_blocks, str):
                        text = content_blocks + "\n"
                    elif isinstance(content_blocks, list):
                        for b in content_blocks:
                            if isinstance(b, dict) and b.get("type") == "text":
                                text += b.get("text", "") + "\n"
                    
                    import re
                    text = re.sub(r'</?user_query>', '', text)
                    text = re.sub(r'<system-reminder>.*?</system-reminder>', '', text, flags=re.DOTALL)
                    
                    if not text.strip(): continue
                    safe_content = escape_html.escape(text.strip())
                    
                    if role == "user":
                        html += f"<div class='user'><strong>[OPERATOR INPUT]</strong><br/><br/>{safe_content}</div>"
                    elif role in ["assistant", "model"]:
                        html += f"<div class='agent'><strong>[A.I.M. SYSTEM RESPONSE]</strong><br/><br/>{safe_content}</div>"
                except Exception:
                    pass
    elif opencode_db_path:
        import sqlite3
        conn = sqlite3.connect(f"file:{opencode_db_path}?mode=ro", uri=True)
        cursor = conn.cursor()
        query = """
        SELECT m.data, p.data, m.time_created
        FROM message m
        JOIN part p ON m.id = p.message_id
        ORDER BY m.time_created ASC, p.time_created ASC
        """
        rows = cursor.execute(query).fetchall()
        for msg_data, part_data, time_created in rows:
            try:
                m_json = json.loads(msg_data)
                p_json = json.loads(part_data)
                
                if p_json.get("type") == "text" and "text" in p_json:
                    role = m_json.get("role")
                    content = p_json.get("text")
                    safe_content = escape_html.escape(content)
                    
                    if role == "user":
                        html += f"<div class='user'><strong>[OPERATOR INPUT]</strong><br/><br/>{safe_content}</div>"
                    elif role == "assistant":
                        html += f"<div class='agent'><strong>[A.I.M. SYSTEM RESPONSE]</strong><br/><br/>{safe_content}</div>"
            except Exception:
                pass
        conn.close()
    else:
        if not os.path.exists(agent_brain_dir):
            return HTMLResponse(f"<html><head><title>A.I.M. History: {agent_id}</title><style>body{{font-family: 'Courier New', Courier, monospace; background: #080c0a; color: #e0f2e9; padding: 2rem; max-width: 900px; margin: 0 auto; line-height: 1.6;}}</style></head><body><h2>A.I.M. Sovereign Data Core</h2><h1 style='color:#00ff88; text-align:center; padding: 50px; font-weight: normal; font-size: 1.2rem; border: 1px dashed #00ff88; border-radius: 4px; background: rgba(0,255,136,0.05);'>NO DATA CORE ESTABLISHED YET.</h1></body></html>", status_code=404)
            
        log_files = glob.glob(os.path.join(agent_brain_dir, "*", ".system_generated", "logs", "transcript.jsonl"))
        if not log_files:
            return HTMLResponse("<h1>Agent brain is empty.</h1>", status_code=404)
            
        # Sort by modification time of the actual transcript files descending (newest first)
        log_files.sort(key=os.path.getmtime, reverse=True)
        
        # Take the top N (limit) and reverse it back to chronological (oldest to newest)
        target_files = log_files[:limit]
        target_files.reverse()
            
        for i, log_file in enumerate(target_files):
            import datetime
            mtime = os.path.getmtime(log_file)
            dt_str = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')
            
            if i > 0:
                html += f"<div class='boundary'>--- SYSTEM REBOOT: CONTEXT DROPPED ---<br/>REINCARNATION INITIATED: {dt_str}</div>"
            else:
                html += f"<div style='text-align: center; color: #00ff88; padding: 10px 0; margin-bottom: 30px; letter-spacing: 3px; font-size: 0.9rem; opacity: 0.5;'>--- BEGIN SESSION ARCHIVE: {dt_str} ---</div>"
                
            with open(log_file, "r") as f:
                for line in f:
                    try:
                        entry = json.loads(line)
                        if entry.get("type") == "USER_INPUT":
                            content = entry.get("content", "")
                            html += f"<div class='user'><strong>[OPERATOR INPUT]</strong><br/><br/>{content}</div>"
                        elif entry.get("source") == "MODEL" and entry.get("type") == "PLANNER_RESPONSE":
                            content = entry.get("content")
                            tool_calls = entry.get("tool_calls")
                            if content and not tool_calls:
                                html += f"<div class='agent'><strong>[A.I.M. SYSTEM RESPONSE]</strong><br/><br/>{content}</div>"
                    except Exception:
                        pass
                
    html += "<script>window.scrollTo(0, document.body.scrollHeight);</script></body></html>"
    return HTMLResponse(html)

@router.get("/download/{agent_id}")
async def download_file(agent_id: str, filepath: str = Query(...), token: str = Query(None)):
    if not token:
        return HTMLResponse("<h1>401 UNAUTHORIZED: Access Denied.</h1>", status_code=401)
        
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return HTMLResponse("<h1>401 UNAUTHORIZED: Invalid Token Format.</h1>", status_code=401)
            
        payload_b64, signature_b64 = parts
        secret = os.environ.get("LEADDEED_DOWNLOAD_SIGNING_SECRET", "")
        if not secret:
            return HTMLResponse("<h1>500 INTERNAL ERROR: Missing Secret.</h1>", status_code=500)
            
        def pad_b64(data):
            return data + "=" * (-len(data) % 4)
            
        expected_mac = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).digest()
        expected_b64 = base64.urlsafe_b64encode(expected_mac).decode().rstrip("=")
        
        if signature_b64.rstrip("=") != expected_b64:
            return HTMLResponse("<h1>401 UNAUTHORIZED: Invalid Signature.</h1>", status_code=401)
            
        payload = json.loads(base64.urlsafe_b64decode(pad_b64(payload_b64)).decode())
        email = payload.get("e")
        if not email:
            return HTMLResponse("<h1>401 UNAUTHORIZED: Missing Email.</h1>", status_code=401)
            
        workspace_id = resolve_workspace_id_for_email(email)
        legacy_id = legacy_sanitize_email(email)
        allowed = list(dict.fromkeys([f"agent-{workspace_id}", f"agent-{legacy_id}"]))
        if not any(agent_id == b or agent_id.startswith(b + "-") for b in allowed):
            return HTMLResponse("<h1>403 FORBIDDEN: Agent ID Mismatch.</h1>", status_code=403)

        # Always open registry-resolved workspace on disk
        workspace_dir = f"{AGENT_WORKSPACES_DIR}/agent-{workspace_id}"
            
    except Exception as e:
        return HTMLResponse("<h1>401 UNAUTHORIZED: Token Parsing Failed.</h1>", status_code=401)
    
    # Security: Ensure the requested filepath is an absolute path within the workspace
    if not filepath.startswith("/"):
        # If relative, assume it's relative to workspace
        target_path = os.path.abspath(os.path.join(workspace_dir, filepath))
    else:
        target_path = os.path.abspath(filepath)
        
    if not target_path.startswith(os.path.abspath(workspace_dir)):
        return HTMLResponse("<h1>403 FORBIDDEN: Path Traversal Detected.</h1>", status_code=403)
        
    if not os.path.isfile(target_path):
        return HTMLResponse("<h1>404 NOT FOUND: File does not exist.</h1>", status_code=404)
        
    filename = os.path.basename(target_path)
    return FileResponse(target_path, filename=filename)
