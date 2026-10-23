# SOP: Wiring a New Operator into a Sovereign Agent Workspace

This document outlines the standard operating procedure for onboarding a new client/operator so they can interface with an isolated AI agent workspace in `aim-connect`.

## 1. Identify the Operator ID
The operator's workspace is driven by their email address (or an opaque registry ID). By default, convert the primary email into the `operator_id` format by replacing non-alphanumeric characters (`@`, `.`) with underscores:
- **Example:** `jane.doe@example.com` -> `jane_doe_example_com`

## 2. Provision the Sovereign Workspace
The `aim-connect` backend isolates every user in their own physical directory structure under `agent_workspaces/`. Create or clone your agent template repository to provision their environment:
```bash
mkdir -p "$AIM_CONNECT_ROOT/agent_workspaces/agent-<operator_id>/shared_database"
```
> **Note:** `AIM_CONNECT_ROOT` defaults to the project root.

## 3. Configure Operator Parameters
If your external dashboard or data pipeline uses per-operator configuration files, place or generate the operator's configuration before seeding their workspace database.

## 4. Seed the Shared Database (Optional)
If your agent harness queries a local SQLite database inside the sandbox, initialize or copy the operator's SQLite database into their `shared_database/` directory:

```bash
sqlite3 "$AIM_CONNECT_ROOT/agent_workspaces/agent-<operator_id>/shared_database/joshua.db" "VACUUM;"
```
*Note: The `shared_database` folder in the operator's workspace is mounted read/write inside the Bubblewrap (`bwrap`) sandbox across all harnesses.*

## 5. Verify the Sandbox Bridge
Check the following directory to ensure the workspace was initialized successfully:
```bash
ls "$AIM_CONNECT_ROOT/agent_workspaces/agent-<operator_id>/shared_database/"
```

### How the Sandbox Works:
The next time the client connects via the UI, the `aim-connect` backend will automatically execute `bwrap` (Bubblewrap) to launch their agent inside a sandboxed environment. The backend uses `--bind` flags to natively punch a read/write hole to the `shared_database/` folder, allowing all active harnesses to view and update the data simultaneously. See [SANDBOX_MODEL.md](./SANDBOX_MODEL.md) for the full technical spec.
