import json
import subprocess
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import main


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
PARSER_JS = FRONTEND_SRC / "markdownParser.js"


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def admin_token():
    tok = "test-admin-token-266"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_raw_media_preview_endpoint_streams_images_and_enforces_secure_path(
    client, admin_token, tmp_path, monkeypatch
):
    """#266: GET /api/file/raw streams allowlisted image/media assets and blocks path traversal or non-media files."""
    monkeypatch.setenv("AIM_EXTRA_ALLOWED_ROOT", str(tmp_path))

    # Minimal valid 1x1 PNG
    png_bytes = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
        "0000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082"
    )
    img_path = tmp_path / "preview_asset.png"
    img_path.write_bytes(png_bytes)

    resp = client.get(
        f"/api/file/raw?path={img_path}",
        headers={"x-api-token": admin_token},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/png"
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.content == png_bytes

    # Non-image text/env files must not be served via /api/file/raw
    sec_file = tmp_path / ".env"
    sec_file.write_text("SECRET=1\n", encoding="utf-8")
    bad_ext = client.get(
        f"/api/file/raw?path={sec_file}",
        headers={"x-api-token": admin_token},
    )
    assert bad_ext.status_code == 415

    # Traversal outside allowed roots must return 403
    trav = client.get(
        "/api/file/raw?path=/etc/passwd",
        headers={"x-api-token": admin_token},
    )
    assert trav.status_code == 403


def test_relative_markdown_link_resolution_in_node():
    """#266: Relative links inside memory-wiki/index.md resolve cleanly to absolute sibling paths."""
    script = f"""
import {{ resolveRelativeFileHref, tokenizeInlineMarkdown }} from {json.dumps(PARSER_JS.as_uri())};

const resolved = resolveRelativeFileHref(
  "pages/backend_architecture.md#L12",
  "/workspace/aim-connect/memory-wiki/index.md"
);
const parentResolved = resolveRelativeFileHref(
  "../README.md",
  "/workspace/aim-connect/memory-wiki/index.md"
);
const unsafeBlocked = resolveRelativeFileHref(
  "javascript:alert(1)",
  "/workspace/aim-connect/memory-wiki/index.md"
);
const tokens = tokenizeInlineMarkdown("Read [Backend Architecture](pages/backend_architecture.md) next.");
console.log(JSON.stringify({{ resolved, parentResolved, unsafeBlocked, relToken: tokens.find((t) => t.type === "rel_link") }}));
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        capture_output=True,
        text=True,
        timeout=3.0,
    )
    assert proc.returncode == 0, proc.stderr
    data = json.loads(proc.stdout.strip())
    assert data["resolved"] == {
        "path": "/workspace/aim-connect/memory-wiki/pages/backend_architecture.md",
        "line": 12,
        "endLine": None,
    }
    assert data["parentResolved"] == {
        "path": "/workspace/aim-connect/README.md",
        "line": None,
        "endLine": None,
    }
    assert data["unsafeBlocked"] is None
    assert data["relToken"] == {
        "type": "rel_link",
        "label": "Backend Architecture",
        "href": "pages/backend_architecture.md",
    }


def test_issue_266_all_five_workspace_and_file_explorer_contracts():
    """#266: Verify all 5 FileExplorer & Workspace Settings contracts."""
    explorer_jsx = (FRONTEND_SRC / "components" / "FileExplorer.jsx").read_text(encoding="utf-8")
    settings_jsx = (FRONTEND_SRC / "components" / "SettingsModal.jsx").read_text(encoding="utf-8")
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    css = (FRONTEND_SRC / "App.css").read_text(encoding="utf-8")

    # 1. Collapsible tree toggle (☰) + Left/Right tree side support
    assert "treeCollapsed" in explorer_jsx
    assert "treeSide === 'right'" in explorer_jsx or "tree-right" in explorer_jsx
    assert ".files-split-body.tree-right" in css
    assert ".files-tree-rail.rail-collapsed" in css

    # 2. Hide dotfiles & cache noise toggle
    assert "hideDotfiles" in explorer_jsx
    assert ".pytest_cache" in explorer_jsx

    # 3. Inline expandable folder tree + clickable breadcrumbs
    assert "expandedDirs" in explorer_jsx
    assert "files-breadcrumb-bar" in explorer_jsx

    # 4. Native image preview (/api/file/raw) + Markdown [PREVIEW | CODE] toggle
    assert "/api/file/raw" in explorer_jsx
    assert "files-image-stage" in explorer_jsx
    assert "<MarkdownBody" in explorer_jsx
    assert "PREVIEW" in explorer_jsx

    # 5. Unified WORKSPACE & EDITOR card inside SettingsModal Appearance tab (no extra 6th tab)
    assert "WORKSPACE &amp; EDITOR" in settings_jsx or "WORKSPACE & EDITOR" in settings_jsx
    assert "filesTreeSide" in app_jsx
    assert "filesHideDotfiles" in app_jsx
    assert "editorFontSize" in app_jsx
    assert "editorWordWrap" in app_jsx
