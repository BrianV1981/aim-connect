import subprocess
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import main
import routes_files


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
EXPLORER_JSX = WORKTREE_ROOT / "frontend" / "src" / "components" / "FileExplorer.jsx"


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def admin_token():
    tok = "test-admin-token-310"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_git_status_uses_unormal_for_untracked_directories_and_normalizes_tree_paths(
    client, admin_token, tmp_path, monkeypatch
):
    """#310: /api/git/status collapses untracked directories via -unormal instead of flooding 5,000+ child files."""
    monkeypatch.setenv("AIM_EXTRA_ALLOWED_ROOT", str(tmp_path))
    repo = tmp_path / "large-untracked-repo"
    repo.mkdir()
    subprocess.run(["git", "init"], cwd=str(repo), check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=str(repo), check=True)
    subprocess.run(["git", "config", "user.name", "Tester"], cwd=str(repo), check=True)

    tracked = repo / "README.md"
    tracked.write_text("# Tracked\n", encoding="utf-8")
    subprocess.run(["git", "add", "README.md"], cwd=str(repo), check=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=str(repo), check=True, capture_output=True)

    tracked.write_text("# Tracked modified\n", encoding="utf-8")

    # Create an untracked directory with 120 nested files
    untracked_dir = repo / "scratch_exports" / "batch_01"
    untracked_dir.mkdir(parents=True)
    for idx in range(120):
        (untracked_dir / f"item_{idx:03d}.json").write_text("{}\n", encoding="utf-8")

    resp = client.get(
        f"/api/git/status?path={repo}",
        headers={"x-api-token": admin_token},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["is_git_repo"] is True
    assert len(body["files"]) == 2

    by_rel = {entry["rel_path"]: entry for entry in body["files"]}
    assert "README.md" in by_rel
    assert by_rel["README.md"]["is_dir"] is False

    assert "scratch_exports/" in by_rel
    dir_entry = by_rel["scratch_exports/"]
    assert dir_entry["status"] == "??"
    assert dir_entry["is_dir"] is True
    # Path has no trailing slash so it matches os.scandir() entry.path in FileExplorer gitByPath
    assert dir_entry["path"] == str((repo / "scratch_exports").resolve())


def test_git_status_enforces_max_files_cap(client, admin_token, tmp_path, monkeypatch):
    """#310: /api/git/status caps returned entries at MAX_GIT_STATUS_FILES and reports total_files + truncated."""
    monkeypatch.setenv("AIM_EXTRA_ALLOWED_ROOT", str(tmp_path))
    monkeypatch.setattr(routes_files, "MAX_GIT_STATUS_FILES", 5)

    repo = tmp_path / "capped-repo"
    repo.mkdir()
    subprocess.run(["git", "init"], cwd=str(repo), check=True, capture_output=True)
    for idx in range(12):
        (repo / f"untracked_{idx:02d}.txt").write_text("x\n", encoding="utf-8")

    resp = client.get(
        f"/api/git/status?path={repo}",
        headers={"x-api-token": admin_token},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["files"]) == 5
    assert body["total_files"] == 12
    assert body["truncated"] is True


def test_read_file_and_git_diff_guard_oversized_utf8_files(
    client, admin_token, tmp_path, monkeypatch
):
    """#310: /api/file and /api/git/diff reject UTF-8 files exceeding MAX_TEXT_EDITOR_BYTES cleanly (413)."""
    monkeypatch.setenv("AIM_EXTRA_ALLOWED_ROOT", str(tmp_path))
    monkeypatch.setattr(routes_files, "MAX_TEXT_EDITOR_BYTES", 64)

    repo = tmp_path / "oversized-repo"
    repo.mkdir()
    subprocess.run(["git", "init"], cwd=str(repo), check=True, capture_output=True)

    huge_log = repo / "daily_master.log"
    huge_log.write_text("A" * 256, encoding="utf-8")

    file_resp = client.get(
        f"/api/file?path={huge_log}",
        headers={"x-api-token": admin_token},
    )
    assert file_resp.status_code == 413
    f_body = file_resp.json()
    assert f_body["is_binary"] is True
    assert f_body["size_bytes"] == 256
    assert "exceeds" in f_body["error"].lower()

    diff_resp = client.get(
        f"/api/git/diff?path={huge_log}",
        headers={"x-api-token": admin_token},
    )
    assert diff_resp.status_code == 413
    assert "exceeds" in diff_resp.json()["error"].lower()


def test_file_explorer_memoizes_git_by_path_and_handles_untracked_dirs():
    """#310: FileExplorer.jsx memoizes gitByPath with useMemo and handles directory entries in Git mode."""
    jsx = EXPLORER_JSX.read_text(encoding="utf-8")
    assert "const gitByPath = useMemo(" in jsx
    # Ensure gitByPath hook sits before the early `if (!isOpen) return null;` guard
    assert jsx.index("const gitByPath = useMemo(") < jsx.index("if (!isOpen) return null;")
    assert "res.status === 413" in jsx
