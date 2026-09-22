from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional
import sqlite3
import os
import json
import logging
import base64
import hmac
import hashlib
import time
from main import AGENT_WORKSPACES_DIR

router = APIRouter(prefix="/api/v1", tags=["api"])
logger = logging.getLogger("aim-connect")

SECRET = os.environ.get("LEADDEED_DOWNLOAD_SIGNING_SECRET", "CccWVy6URQiMYS-UO0uSmWmNZ_fyUoxkW-njr7G6-PJ_gWlT45thhGsWtKuC0A53")

def b64url_decode(s: str) -> bytes:
    padded = s.replace("-", "+").replace("_", "/")
    padded += "=" * ((4 - len(padded) % 4) % 4)
    return base64.b64decode(padded)

def verify_vercel_jwt(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Bearer token")
    
    token = authorization.replace("Bearer ", "").strip()
    try:
        if "." not in token:
            raise HTTPException(status_code=401, detail="Invalid token format")
            
        body_b64, sig_b64 = token.split(".", 1)
        expected_sig = base64.urlsafe_b64encode(
            hmac.new(SECRET.encode(), body_b64.encode(), hashlib.sha256).digest()
        ).decode().rstrip("=")
        
        if not hmac.compare_digest(sig_b64, expected_sig):
            raise HTTPException(status_code=401, detail="Invalid token signature")
            
        payload = json.loads(b64url_decode(body_b64).decode("utf-8"))
        if not payload.get("e") or not payload.get("exp"):
            raise HTTPException(status_code=401, detail="Invalid token payload")
            
        if int(time.time()) > payload["exp"]:
            raise HTTPException(status_code=401, detail="Token Expired")
            
        return payload["e"]
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

def get_operator_db_path(email: str) -> str:
    import re
    try:
        import sys
        if '/home/kingb/aim-ld/scripts' not in sys.path:
            sys.path.insert(0, '/home/kingb/aim-ld/scripts')
        from core.identity import resolve_workspace_id_for_email
        workspace_id = resolve_workspace_id_for_email(email)
    except Exception as e:
        workspace_id = re.sub(r'[^a-zA-Z0-9]', '_', email.lower())
    
    return os.path.join(AGENT_WORKSPACES_DIR, f"agent-{workspace_id}", "shared_database", "joshua.db")

@router.get("/leads")
def get_leads(
    limit: int = Query(100, ge=1, le=1000),
    priority_class: Optional[str] = Query(None, description="Filter by priority class (e.g., 'MULTI_HIT:%')"),
    operator_email: str = Depends(verify_vercel_jwt)
):
    """
    Returns a raw JSON array of leads directly from the live JOSHUA database.
    """
    db_path = get_operator_db_path(operator_email)
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="Database not found for this operator")
        
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        query = "SELECT * FROM master_leads"
        params = []
        if priority_class:
            if '%' in priority_class:
                query += " WHERE priority_class LIKE ?"
            else:
                query += " WHERE priority_class = ?"
            params.append(priority_class)
            
        query += " ORDER BY pf_target_acquired DESC, date_discovered DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        result = [dict(row) for row in rows]
        conn.close()
        
        return {
            "data": result,
            "meta": {
                "total_returned": len(result),
                "operator": operator_email
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

