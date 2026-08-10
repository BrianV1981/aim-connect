import os
import shutil
import json
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from main import verify_token, require_admin, DEFAULT_WORKSPACE

router = APIRouter()

def secure_path(p: str, base_dir: str = DEFAULT_WORKSPACE) -> str:
    base = os.path.realpath(base_dir)
    abs_path = os.path.realpath(os.path.join(base, p) if not os.path.isabs(p) else p)
    if abs_path != base and not abs_path.startswith(base + os.sep):
        raise ValueError(f"Access denied: Path traversal detected outside of workspace ({base_dir}).")
    return abs_path

@router.get("/api/files", dependencies=[Depends(verify_token), Depends(require_admin)])
def list_files(path: str = DEFAULT_WORKSPACE) -> dict:
    try:
        safe_path = secure_path(path)
        items = []
        for entry in os.scandir(safe_path):
            try:
                is_dir = entry.is_dir(follow_symlinks=False)
            except OSError:
                is_dir = False
            items.append({
                "name": entry.name,
                "is_dir": is_dir,
                "path": entry.path
            })
        # Sort directories first, then files
        items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
        return {"path": safe_path, "items": items}
    except Exception as e:
        return {"error": str(e)}

@router.get("/api/file", dependencies=[Depends(verify_token), Depends(require_admin)])
def read_file(path: str):
    try:
        safe_path = secure_path(path)
        with open(safe_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"content": content}
    except Exception as e:
        return {"error": str(e)}

class FileSaveRequest(BaseModel):
    path: str
    content: str

@router.put("/api/file", dependencies=[Depends(verify_token), Depends(require_admin)])
def save_file(req: FileSaveRequest):
    try:
        safe_path = secure_path(req.path)
        with open(safe_path, "w", encoding="utf-8") as f:
            f.write(req.content)
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}

class FileCreateRequest(BaseModel):
    path: str
    is_dir: bool

@router.post("/api/file", dependencies=[Depends(verify_token), Depends(require_admin)])
def create_file_or_dir(req: FileCreateRequest):
    try:
        safe_path = secure_path(req.path)
        if req.is_dir:
            os.makedirs(safe_path, exist_ok=True)
        else:
            with open(safe_path, "w", encoding="utf-8") as f:
                pass
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}

@router.delete("/api/file", dependencies=[Depends(verify_token), Depends(require_admin)])
def delete_file(path: str):
    import shutil
    try:
        safe_path = secure_path(path)
        if os.path.isdir(safe_path):
            shutil.rmtree(safe_path)
        else:
            os.remove(safe_path)
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}

MACROS_FILE = "macros.json"

@router.get("/api/macros", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_macros():
    try:
        if os.path.exists(MACROS_FILE):
            with open(MACROS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        return []
    except Exception as e:
        return {"error": str(e)}

class MacroSaveRequest(BaseModel):
    macros: list

@router.post("/api/macros", dependencies=[Depends(verify_token), Depends(require_admin)])
def save_macros(req: MacroSaveRequest):
    try:
        with open(MACROS_FILE, "w", encoding="utf-8") as f:
            json.dump(req.macros, f)
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}
