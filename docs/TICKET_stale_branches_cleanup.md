# TICKET: Workspace Branch Cleanup & Submit Logic Port

**Date:** 2026-08-08

## Overview
We investigated two stale workspace branches (`fix/issue-119` and `fix/issue-149`) that have diverged significantly from `master` since July.

### 1. `fix/issue-119` (Workspace Isolation)
- **Status**: Redundant / Fully Superseded.
- **Action**: Trash/Prune.
- **Reasoning**: The `/tmp` isolation logic and bubblewrap mounts introduced in this branch have already been fully integrated and superseded by subsequent architecture refactors on `master` (e.g. PR #184).

### 2. `fix/issue-149` (WebSocket Submit & Deadlock Fix)
- **Status**: Save Logic / Branch Prune.
- **Action**: Manually port the `submit` payload logic into `master`, then trash the branch.
- **Reasoning**: This branch contains the critical fix for the Uvicorn deadlock. It replaces the blocking synchronous `subprocess.run` calls with `asyncio.create_subprocess_exec` inside a background `asyncio.create_task()`. It also introduces the `submit` event type for the frontend to safely send multi-line blocks into the agent UI via bracketed paste. Because the branch is missing thousands of lines of updates from `master`, it cannot be merged directly.

## Execution Plan
1. Prune `fix/issue-119` using `./aim prune-remote` (or manual git delete).
2. Surgically implement the async `submit` logic from `fix/issue-149` into `backend/main.py` on `master`.
3. Prune `fix/issue-149`.
