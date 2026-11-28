from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional
import sqlite3
import os
import logging
from main import AGENT_WORKSPACES_DIR, AIM_CONNECT_ROOT
from dashboard_jwt import verify_dashboard_jwt

router = APIRouter(prefix="/api/v1", tags=["api"])
logger = logging.getLogger("aim-connect")


def verify_vercel_jwt(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Bearer token")

    token = authorization[len("Bearer "):].strip()
    payload = verify_dashboard_jwt(token)
    return payload["e"]

def get_operator_db_path(email: str) -> str:
    from ws_handler import resolve_workspace_id_for_email
    workspace_id = resolve_workspace_id_for_email(email)
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

