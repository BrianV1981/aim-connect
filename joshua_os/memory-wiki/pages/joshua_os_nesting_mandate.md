# J.O.S.H.U.A. OS Directory Nesting Mandate

## 1. Migration from Legacy OS
The `aim-connect` repository previously relied on a deprecated, legacy operating system architecture (`aim-agy_os`). This has been entirely purged and replaced by the newly standardized `joshua_os` engine, which serves as the core CLI orchestrator and subagent manager.

## 2. The Nesting Mandate (Clean Repository Pattern)
To maintain a professional, unpolluted repository root, all agent-generated runtime directories and historical operational artifacts **MUST be strictly nested inside the `joshua_os/` directory**.

These nested directories include:
- `workspace/`: The GitOps sandbox for `git worktree` bug fixing.
- `scratch/`: The directory for all temporary scripts (e.g., `test_*.py`, `prove_*.py`).
- `archive/`: Old historical sessions or non-foundational scripts.
- `planning-artifacts/`: LLM-generated tactical state or design docs.
- `memory-wiki/`: The persistent agent RAG wiki.

These directories should NEVER exist loose in the root of the `aim-connect` repository. If an agent creates a scratch script, it must clean it up or store it in `joshua_os/scratch/`.

**`workspace/` at repo root is the `aim fix` worktree floor** (`workspace/issue-N`). Do **not** drop marketing binaries or scratch there — they collide with GitOps. Product screenshots live in **`docs/screenshots/`** and are linked from the README (#187).

**Wiki markdown is tracked** under `joshua_os/memory-wiki/` (index, log, pages). The ignore list below is for *runtime* dirs (`workspace/`, `scratch/`, `venv/`, `.aim_core/`). Do not treat the wiki as disposable.

## 3. Git Ignore Rules
To prevent bloating the git repository with heavy runtime dependencies or agent garbage, the `.gitignore` explicitly ignores these nested structures:
- `joshua_os/workspace/`
- `joshua_os/scratch/`
- `joshua_os/planning-artifacts/`
- `joshua_os/memory-wiki/`
- `joshua_os/archive/`
- `joshua_os/venv/`
- `joshua_os/.aim_core/`

**Important:** Because `venv/` and `.aim_core/` are ignored by git, any structural migration of the `joshua_os/` directory via a git pull or worktree promotion will DROP the binaries and Python dependencies. The environment must be manually rebuilt (via `joshua_os/setup.sh`) and the core binaries manually copied over from the parent J.O.S.H.U.A. repository after a cold clone.
