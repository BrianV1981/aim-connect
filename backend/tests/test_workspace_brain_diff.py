import os
import subprocess
import time
import pytest
from fastapi.testclient import TestClient

import main  # noqa: F401
import routes_files


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def valid_token():
    tok = "test-admin-token-211"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 3600,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_secure_path_blocks_protected_home_dirs():
    """secure_path(allow_home=True) blocks ~/.ssh and /etc/passwd while allowing HOME_DIR subpaths (#211)."""
    ssh_target = os.path.join(main.HOME_DIR, ".ssh", "id_ed25519")
    with pytest.raises(ValueError, match="protected directory"):
        routes_files.secure_path(ssh_target, allow_home=True)

    with pytest.raises(ValueError, match="Path traversal"):
        routes_files.secure_path("/etc/passwd", allow_home=True)


def test_workspace_context_discovers_brain_files_and_worktrees(client, valid_token, tmp_path, monkeypatch):
    """GET /api/workspace/context resolves main_repo_root Brain files even from inside workspace/issue-* (#211)."""
    monkeypatch.setenv("AIM_EXTRA_ALLOWED_ROOT", str(tmp_path))

    repo = tmp_path / "sample-repo"
    (repo / ".git").mkdir(parents=True)
    (repo / ".git" / "HEAD").write_text("ref: refs/heads/master\n", encoding="utf-8")
    (repo / "HANDOFF.md").write_text("# Handoff\n", encoding="utf-8")
    (repo / "AGENTS.md").write_text("# Agents\n", encoding="utf-8")
    wiki_pages = repo / "memory-wiki" / "pages"
    wiki_pages.mkdir(parents=True)
    (repo / "memory-wiki" / "index.md").write_text("# Index\n", encoding="utf-8")
    (repo / "memory-wiki" / "log.md").write_text("# Log\n", encoding="utf-8")
    (wiki_pages / "architecture.md").write_text("# Arch\n", encoding="utf-8")

    wt = repo / "workspace" / "issue-211"
    (wt / ".git").mkdir(parents=True)
    (wt / ".git" / "HEAD").write_text("ref: refs/heads/fix/issue-211\n", encoding="utf-8")

    resp = client.get(
        f"/api/workspace/context?path={wt}",
        headers={"x-api-token": valid_token},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["main_repo_root"] == str(repo.resolve())
    assert data["branch"] == "fix/issue-211"
    labels = {bf["label"]: bf for bf in data["brain_files"]}
    assert labels["HANDOFF.md"]["exists"] is True
    assert labels["wiki/index.md"]["exists"] is True
    assert labels["pages/architecture.md"]["exists"] is True
    assert any(w["name"] == "issue-211" and w["branch"] == "fix/issue-211" for w in data["worktrees"])


def test_file_read_and_save_mtime_conflict_guard(client, valid_token, tmp_path, monkeypatch):
    """PUT /api/file returns 409 Conflict when expected_mtime is stale, and 200 when current (#211)."""
    monkeypatch.setenv("AIM_EXTRA_ALLOWED_ROOT", str(tmp_path))
    target = tmp_path / "HANDOFF.md"
    target.write_text("v1 content\n", encoding="utf-8")

    r_get = client.get(f"/api/file?path={target}", headers={"x-api-token": valid_token})
    assert r_get.status_code == 200
    mtime_1 = r_get.json()["mtime"]
    assert isinstance(mtime_1, float)

    # Simulate external edit on disk advancing mtime
    os.utime(target, (mtime_1 + 10.0, mtime_1 + 10.0))

    r_conflict = client.put(
        "/api/file",
        headers={"x-api-token": valid_token},
        json={"path": str(target), "content": "stale overwrite", "expected_mtime": mtime_1},
    )
    assert r_conflict.status_code == 409
    assert "Conflict" in r_conflict.json()["error"]

    # Now save with updated mtime -> 200 OK
    current_mtime = r_conflict.json()["current_mtime"]
    r_ok = client.put(
        "/api/file",
        headers={"x-api-token": valid_token},
        json={"path": str(target), "content": "fresh overwrite\n", "expected_mtime": current_mtime},
    )
    assert r_ok.status_code == 200
    assert target.read_text(encoding="utf-8") == "fresh overwrite\n"


def test_git_status_and_diff_endpoints(client, valid_token, tmp_path, monkeypatch):
    """GET /api/git/status and GET /api/git/diff return HEAD vs working-tree content (#211)."""
    monkeypatch.setenv("AIM_EXTRA_ALLOWED_ROOT", str(tmp_path))
    repo = tmp_path / "git-repo"
    repo.mkdir()
    subprocess.run(["git", "init"], cwd=str(repo), check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=str(repo), check=True)
    subprocess.run(["git", "config", "user.name", "Tester"], cwd=str(repo), check=True)

    tracked = repo / "app.py"
    tracked.write_text("print('v1')\n", encoding="utf-8")
    subprocess.run(["git", "add", "app.py"], cwd=str(repo), check=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=str(repo), check=True, capture_output=True)

    # Modify tracked file and create untracked file
    tracked.write_text("print('v2')\n", encoding="utf-8")
    untracked = repo / "new_module.py"
    untracked.write_text("x = 42\n", encoding="utf-8")

    st_resp = client.get(f"/api/git/status?path={repo}", headers={"x-api-token": valid_token})
    assert st_resp.status_code == 200
    st_data = st_resp.json()
    assert st_data["is_git_repo"] is True
    rel_paths = {f["rel_path"]: f["status"] for f in st_data["files"]}
    assert "app.py" in rel_paths
    assert "new_module.py" in rel_paths

    diff_resp = client.get(f"/api/git/diff?path={tracked}", headers={"x-api-token": valid_token})
    assert diff_resp.status_code == 200
    diff_data = diff_resp.json()
    assert diff_data["original"] == "print('v1')\n"
    assert diff_data["modified"] == "print('v2')\n"
    assert diff_data["language"] == "python"
