import os
import glob
import shutil
import json
import subprocess
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Header
from fastapi.responses import JSONResponse
from main import verify_token, require_admin, DEFAULT_WORKSPACE, AIM_CONNECT_ROOT, HOME_DIR
from routes_sessions import _get_git_branch

router = APIRouter()

PROTECTED_HOME_SUBDIRS = (".ssh", ".gnupg", ".aws", ".kube")

LANGUAGE_BY_EXT = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".md": "markdown",
    ".json": "json",
    ".css": "css",
    ".html": "html",
    ".sh": "shell",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".toml": "ini",
    ".sql": "sql",
}


def _infer_language(path: str) -> str:
    _, ext = os.path.splitext((path or "").lower())
    return LANGUAGE_BY_EXT.get(ext, "plaintext")


def secure_path(p: str, base_dir: str = DEFAULT_WORKSPACE, allow_home: bool = False) -> str:
    base = os.path.realpath(base_dir)
    if not os.path.isabs(p):
        abs_path = os.path.realpath(os.path.join(base, p))
        if abs_path != base and not abs_path.startswith(base + os.sep):
            raise ValueError(f"Access denied: Path traversal detected outside of workspace ({base_dir}).")
        return abs_path

    abs_path = os.path.realpath(p)
    allowed_roots = [base]
    if allow_home:
        allowed_roots.extend([
            os.path.realpath(AIM_CONNECT_ROOT),
            os.path.realpath(HOME_DIR),
        ])
        extra_root = os.environ.get("AIM_EXTRA_ALLOWED_ROOT", "").strip()
        if extra_root:
            allowed_roots.append(os.path.realpath(extra_root))

    if not any(abs_path == r or abs_path.startswith(r + os.sep) for r in allowed_roots):
        raise ValueError(f"Access denied: Path traversal detected outside of workspace ({base_dir}).")

    if allow_home:
        real_home = os.path.realpath(HOME_DIR)
        for sub in PROTECTED_HOME_SUBDIRS:
            prot = os.path.join(real_home, sub)
            if abs_path == prot or abs_path.startswith(prot + os.sep):
                raise ValueError(f"Access denied: Path traversal into protected directory ({sub}).")

    return abs_path


def handle_file_error(e: Exception) -> JSONResponse:
    err_str = str(e)
    status = 500
    if isinstance(e, ValueError) and "Path traversal" in err_str:
        status = 403
    elif isinstance(e, FileNotFoundError):
        status = 404
    elif isinstance(e, PermissionError):
        status = 403
    elif isinstance(e, IsADirectoryError):
        status = 400
    elif isinstance(e, NotADirectoryError):
        status = 400
    elif isinstance(e, OSError):
        status = 400
    return JSONResponse(status_code=status, content={"error": err_str})

def _resolve_session_cwd(session: str = "", explicit_path: str = "") -> str:
    """Resolve active working directory for a tmux session or explicit path (#211)."""
    if explicit_path:
        return secure_path(explicit_path, allow_home=True)
    if session:
        res = subprocess.run(
            ["tmux", "display-message", "-p", "-t", session, "#{pane_current_path}"],
            capture_output=True,
            text=True,
        )
        if res.returncode == 0 and res.stdout.strip():
            cand = res.stdout.strip()
            if os.path.isdir(cand):
                try:
                    return secure_path(cand, allow_home=True)
                except ValueError:
                    pass
    return os.path.realpath(AIM_CONNECT_ROOT)


def _find_repo_roots(start_dir: str) -> tuple[str, str]:
    """Return (repo_root, main_repo_root) for start_dir, handling /workspace/issue-* worktrees (#211)."""
    curr = os.path.realpath(start_dir)
    repo_root = curr
    for _ in range(6):
        if os.path.exists(os.path.join(curr, ".git")) or os.path.exists(os.path.join(curr, "HANDOFF.md")):
            repo_root = curr
            break
        parent = os.path.dirname(curr)
        if parent == curr:
            break
        curr = parent

    main_repo_root = repo_root
    # If inside <main_repo>/workspace/issue-XYZ, resolve parent <main_repo> where memory-wiki/ & HANDOFF.md live
    parts = repo_root.split(os.sep)
    if len(parts) >= 3 and parts[-2] == "workspace" and parts[-1].startswith("issue-"):
        candidate_main = os.sep.join(parts[:-2]) or os.sep
        if os.path.isdir(candidate_main):
            main_repo_root = candidate_main

    return repo_root, main_repo_root


@router.get("/api/workspace/context", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_workspace_context(session: str = "", path: str = ""):
    """Return session-scoped Brain files (HANDOFF.md, AGENTS.md, memory-wiki/) and active worktrees (#211)."""
    try:
        pane_path = _resolve_session_cwd(session=session, explicit_path=path)
        repo_root, main_repo_root = _find_repo_roots(pane_path)
        branch = _get_git_branch(pane_path)

        brain_candidates = [
            ("HANDOFF.md", "handoff", os.path.join(main_repo_root, "HANDOFF.md")),
            ("AGENTS.md", "agents", os.path.join(main_repo_root, "AGENTS.md")),
            ("wiki/index.md", "wiki", os.path.join(main_repo_root, "memory-wiki", "index.md")),
            ("wiki/log.md", "wiki", os.path.join(main_repo_root, "memory-wiki", "log.md")),
            ("README.md", "readme", os.path.join(repo_root, "README.md")),
        ]
        # Also include memory-wiki/pages/*.md
        pages_dir = os.path.join(main_repo_root, "memory-wiki", "pages")
        if os.path.isdir(pages_dir):
            for page_path in sorted(glob.glob(os.path.join(pages_dir, "*.md"))):
                base_name = os.path.basename(page_path)
                brain_candidates.append((f"pages/{base_name}", "wiki_page", page_path))

        brain_files = []
        for label, category, fpath in brain_candidates:
            exists = os.path.isfile(fpath)
            mtime = os.path.getmtime(fpath) if exists else None
            brain_files.append({
                "label": label,
                "category": category,
                "path": fpath,
                "exists": exists,
                "mtime": mtime,
            })

        worktrees = []
        wt_parent = os.path.join(main_repo_root, "workspace")
        if os.path.isdir(wt_parent):
            for entry in sorted(os.listdir(wt_parent)):
                full_wt = os.path.join(wt_parent, entry)
                if entry.startswith("issue-") and os.path.isdir(full_wt):
                    worktrees.append({
                        "name": entry,
                        "path": full_wt,
                        "branch": _get_git_branch(full_wt),
                    })

        return {
            "session": session,
            "pane_path": pane_path,
            "repo_root": repo_root,
            "main_repo_root": main_repo_root,
            "branch": branch,
            "brain_files": brain_files,
            "worktrees": worktrees,
        }
    except Exception as e:
        return handle_file_error(e)


@router.get("/api/git/status", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_git_status(session: str = "", path: str = ""):
    """Return git status --porcelain modified/untracked files for the session's active repository (#211)."""
    try:
        target_dir = _resolve_session_cwd(session=session, explicit_path=path)
        top_res = subprocess.run(
            ["git", "-C", target_dir, "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            timeout=3,
        )
        if top_res.returncode != 0:
            return {"repo_path": target_dir, "branch": "", "files": [], "is_git_repo": False}

        repo_path = top_res.stdout.strip()
        branch = _get_git_branch(repo_path)
        st_res = subprocess.run(
            ["git", "-C", repo_path, "status", "--porcelain=v1", "-uall"],
            capture_output=True,
            text=True,
            timeout=3,
        )
        files = []
        if st_res.returncode == 0:
            for line in st_res.stdout.splitlines():
                if len(line) < 4:
                    continue
                status_code = line[:2].strip() or "M"
                rel_path = line[3:].strip().strip('"')
                if " -> " in rel_path:
                    rel_path = rel_path.split(" -> ", 1)[1].strip()
                abs_file = os.path.join(repo_path, rel_path)
                files.append({
                    "status": status_code,
                    "rel_path": rel_path,
                    "path": abs_file,
                })
        return {
            "repo_path": repo_path,
            "branch": branch,
            "files": files,
            "is_git_repo": True,
        }
    except Exception as e:
        return handle_file_error(e)


@router.get("/api/git/diff", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_git_diff(path: str, session: str = ""):
    """Return HEAD ('original') and working-tree ('modified') content for Monaco DiffEditor (#211)."""
    try:
        safe_path = secure_path(path, allow_home=True)
        file_dir = os.path.dirname(safe_path) if not os.path.isdir(safe_path) else safe_path
        top_res = subprocess.run(
            ["git", "-C", file_dir, "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            timeout=3,
        )
        repo_root = top_res.stdout.strip() if top_res.returncode == 0 else file_dir
        rel_path = os.path.relpath(safe_path, repo_root)

        original = ""
        if top_res.returncode == 0:
            show_res = subprocess.run(
                ["git", "-C", repo_root, "show", f"HEAD:{rel_path}"],
                capture_output=True,
                text=True,
                timeout=3,
            )
            if show_res.returncode == 0:
                original = show_res.stdout

        modified = ""
        if os.path.isfile(safe_path):
            with open(safe_path, "r", encoding="utf-8", errors="replace") as f:
                modified = f.read()

        return {
            "path": safe_path,
            "rel_path": rel_path,
            "original": original,
            "modified": modified,
            "language": _infer_language(safe_path),
        }
    except Exception as e:
        return handle_file_error(e)


@router.get("/api/files", dependencies=[Depends(verify_token), Depends(require_admin)])
def list_files(path: str = DEFAULT_WORKSPACE) -> dict:
    try:
        safe_path = secure_path(path or DEFAULT_WORKSPACE, allow_home=True)
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
        return handle_file_error(e)

@router.get("/api/file", dependencies=[Depends(verify_token), Depends(require_admin)])
def read_file(path: str):
    try:
        safe_path = secure_path(path, allow_home=True)
        with open(safe_path, "r", encoding="utf-8") as f:
            content = f.read()
        mtime = os.path.getmtime(safe_path)
        return {
            "content": content,
            "path": safe_path,
            "mtime": mtime,
            "language": _infer_language(safe_path),
        }
    except Exception as e:
        return handle_file_error(e)

class FileSaveRequest(BaseModel):
    path: str
    content: str
    expected_mtime: Optional[float] = None

@router.put("/api/file", dependencies=[Depends(verify_token), Depends(require_admin)])
def save_file(req: FileSaveRequest):
    try:
        safe_path = secure_path(req.path, allow_home=True)
        if req.expected_mtime is not None and os.path.exists(safe_path):
            current_mtime = os.path.getmtime(safe_path)
            if abs(current_mtime - req.expected_mtime) > 0.001:
                return JSONResponse(
                    status_code=409,
                    content={
                        "error": "Conflict: file was modified on disk by another agent/process.",
                        "current_mtime": current_mtime,
                    },
                )
        os.makedirs(os.path.dirname(safe_path), exist_ok=True)
        with open(safe_path, "w", encoding="utf-8") as f:
            f.write(req.content)
        new_mtime = os.path.getmtime(safe_path)
        return {"status": "success", "mtime": new_mtime}
    except Exception as e:
        return handle_file_error(e)

class FileCreateRequest(BaseModel):
    path: str
    is_dir: bool

@router.post("/api/file", dependencies=[Depends(verify_token), Depends(require_admin)])
def create_file_or_dir(req: FileCreateRequest):
    try:
        safe_path = secure_path(req.path, allow_home=True)
        if req.is_dir:
            os.makedirs(safe_path, exist_ok=True)
        else:
            with open(safe_path, "w", encoding="utf-8") as f:
                pass
        return {"status": "success"}
    except Exception as e:
        return handle_file_error(e)

@router.delete("/api/file", dependencies=[Depends(verify_token), Depends(require_admin)])
def delete_file(path: str):
    import shutil
    try:
        safe_path = secure_path(path, allow_home=True)
        if os.path.isdir(safe_path):
            shutil.rmtree(safe_path)
        else:
            os.remove(safe_path)
        return {"status": "success"}
    except Exception as e:
        return handle_file_error(e)

MACROS_FILE = "macros.json"

@router.get("/api/macros", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_macros():
    try:
        if os.path.exists(MACROS_FILE):
            with open(MACROS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        return []
    except Exception as e:
        return handle_file_error(e)

class MacroSaveRequest(BaseModel):
    macros: list

@router.post("/api/macros", dependencies=[Depends(verify_token), Depends(require_admin)])
def save_macros(req: MacroSaveRequest):
    try:
        with open(MACROS_FILE, "w", encoding="utf-8") as f:
            json.dump(req.macros, f)
        return {"status": "success"}
    except Exception as e:
        return handle_file_error(e)


def verify_upload_webhook_secret(aim_connect_webhook_secret: str = Header(None)):
    expected_secret = os.environ.get("UPLOAD_WEBHOOK_SECRET")
    if not expected_secret or aim_connect_webhook_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Unauthorized Webhook Access")

@router.post("/api/upload", dependencies=[Depends(verify_upload_webhook_secret)])
async def upload_file(file: UploadFile = File(...), path: str = ""):
    try:
        target = secure_path(path or file.filename)
        with open(target, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"status": "success", "path": target}
    except Exception as e:
        return handle_file_error(e)
