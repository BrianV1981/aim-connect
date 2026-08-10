# SOP: Wiring a New Operator into the Joshua Matrix

This document outlines the standard operating procedure for onboarding a new client/operator so they can interface with Joshua and the LeadDeeds infrastructure.

## 1. Identify the Operator ID
The operator's workspace is driven by their email address. Convert the primary email into the `operator_id` format by replacing `@` and `.` with underscores.
- **Example:** `jeff.hale@spectrum.com` -> `jeff_hale_spectrum_com`

## 2. Provision the Sovereign Workspace
The `aim-connect` backend isolates every user in their own physical directory structure. You must clone the core intelligence repository (`aim-ld`) to create their environment.
Run the following command:
```bash
git clone "$AIM_LD_ROOT" "$AIM_CONNECT_ROOT/agent_workspaces/agent-<operator_id>"
```
> **Note:** `AIM_CONNECT_ROOT` defaults to the project root. `AIM_LD_ROOT` is typically the sibling `aim-ld` directory.

## 3. Verify the Contract JSON
Ensure the client's parameters have been generated in a `.contract.json` file inside the `aim-ld` repository (e.g. `leaddeed-fic/contracts/generated/`).
- Ensure their email is correctly set under the `"delivery"` block (using either `"email_to"` or `"target"`).

## 4. Run the Matrix Engine (Database Injection)
You must execute the `build_joshua_mirror.py` script to parse their specific leads and generate their isolated SQLite WAL database (`joshua.db`). 

```bash
cd "$AIM_LD_ROOT/workspace/leaddeed-matrix"
python3 scripts/build_joshua_mirror.py \
  --csv "$AIM_LD_ROOT/workspace/bluehost_staging/leaddeed-matrix/<their_matrix_folder>/hot_lead_matrix.csv" \
  --contract "$AIM_LD_ROOT/workspace/leaddeed-fic/contracts/generated/<their_contract_name>.contract.json"
```
*Note: This script will automatically create the `shared_database` folder in their workspace and dump the SQLite database and Morning Briefing inside it.*

## 5. Verify the Sandbox Bridge
Check the following directory to ensure the files were generated successfully:
```bash
ls "$AIM_CONNECT_ROOT/agent_workspaces/agent-<operator_id>/shared_database/"
```

You should see:
- `joshua.db`
- `todays_briefing.md`

### How the Sandbox Works:
The next time the client connects via the UI, the `aim-connect` backend will automatically execute `bwrap` (Bubblewrap) to launch their agent inside a sandboxed environment. The backend uses `--bind` flags to natively punch a read/write hole to the `shared_database/` folder, allowing all active harnesses to view and update the data simultaneously. See [SANDBOX_MODEL.md](./SANDBOX_MODEL.md) for the full technical spec.
