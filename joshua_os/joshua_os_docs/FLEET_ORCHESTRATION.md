# Fleet Orchestration Playbook

**Audience:** The Prime Agent or Orchestrator tasked with coordinating parallel sub-agents and ensuring conflict-free code execution.

---

## 1. The Native OS Framework (CLI-Agnostic)
J.O.S.H.U.A. is a CLI-agnostic Operating System for autonomous agents. It does not rely on rigid, multi-repository "CLI vessels" (like aim-grok or aim-opencode). Instead, it relies on universal skills and native Git capabilities to provide a standard orchestration layer for agents.

*   **Sandboxing as an Option:** By default, agent actions are sandboxed using dynamic Git Worktrees. If system-level isolation is required, `bwrap` is supported as an optional security feature to restrict network or filesystem access, but it is not mandatory.

---

## 2. Parallel Execution via Git Worktrees (`aim fix`)

The core of Fleet Orchestration relies on highly parallel, isolated agent workspaces generated via Git Worktrees.

### Spawning the Sandbox
When an agent or orchestrator begins a task, it must NOT execute on the `main` branch. 
*   Run `aim fix <issue_id>` to generate a clean, isolated worktree branch under `workspace/issue-<id>`.
*   The orchestrator can delegate specific tasks to sub-agents, directing each to operate within its designated `workspace/` directory.

### The Multi-Agent Workflow
1.  **Triage:** Orchestrator reads issues and breaks down tasks.
2.  **Dispatch:** Orchestrator calls `aim fix <issue>` and delegates sub-agents to those worktrees.
3.  **Audit:** Sub-agents report back upon task completion. Orchestrator can inspect the worktree via `git diff` or running tests in that isolated directory.
4.  **Merge:** Orchestrator instructs sub-agents (or acts itself) to run `aim promote` inside the worktree, which safely merges to `main` and cleans up the sandbox.

## 3. The Batch Merge (`aim merge-batch`)
If a fleet of agents has completed numerous isolated worktrees, the orchestrator can execute `aim merge-batch`. This command evaluates all open `fix/*` branches, resolves non-conflicting merges into `main`, and safely deletes the isolated worktrees to maintain a clean OS state.
