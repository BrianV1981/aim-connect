# A.I.M. Connect Sandbox Model (Bubblewrap)

**Ticket:** #168  
**Status:** Documented  
**Component:** Backend Execution Engine (`backend/main.py`)  

---

## 1. Overview

A.I.M. Connect is a multi-tenant SaaS platform where each customer is provisioned dedicated AI agent CLI sessions (e.g., Gemini/Antigravity, Grok, OpenCode). To guarantee multi-tenant security and system stability, AI agent processes must operate in strict filesystem isolation.

Without isolation, an autonomous AI agent CLI process could access other tenants' workspaces, read host configuration/credentials in user home directories, or modify critical system configuration files.

A.I.M. Connect uses **Bubblewrap (`bwrap`)**—an unprivileged user namespace sandboxing tool—to wrap all agent CLI session execution inside lightweight containerized environments on Linux.

---

## 2. Core `bwrap` Mechanics

When the backend (`backend/main.py`) spawns an agent CLI process (inside a persistent `tmux` session), it constructs a `bwrap` invocation with specific isolation layers:

- **Root Filesystem Read-Only Bind (`--ro-bind / /`):** Gives the agent process read-only access to host system libraries, tools, python environments, and system binaries necessary for shell command execution.
- **Virtual Mounts (`--dev /dev --proc /proc --bind /tmp /tmp`):** Provides minimal pseudo-filesystems for process management, standard I/O, device nodes, and local temporary execution space.
- **Home Directory Tmpfs Masking (`--tmpfs /home/kingb`):** Mounts an empty memory-backed temporary filesystem over the host user home directory (`/home/kingb`). This hides all personal files, credentials, and configuration files stored on the host home directory from the sandbox.
- **Selective Read-Only Binary Mounts:** Selectively mounts only required CLI binaries back into the home directory structure (e.g., `--ro-bind /home/kingb/.local /home/kingb/.local`, `--ro-bind /home/kingb/.gemini /home/kingb/.gemini`).
- **Targeted Read-Write Mounts:** Exposes only the tenant's designated workspace directory (`--bind {workspace_dir} {workspace_dir}`), shared database (`--bind {shared_data_dir} {workspace_dir}/shared_database`), and agent-specific runtime directories.

---

## 3. Per-Harness Configurations

A.I.M. Connect supports three distinct agent CLI harnesses, each with specific sandbox volume mappings configured in `backend/main.py`:

### 3.1 Antigravity (`agy` / `admin-cli`)
- **CLI Binary:** `/home/kingb/.local/bin/agy`
- **Config & Tooling:** Read-only access to `/home/kingb/.gemini`
- **Isolated Storage Binds:**
  - Read-write brain storage: `--bind {agent_brain_dir} /home/kingb/.gemini/antigravity-cli/brain`
  - Read-write conversation history: `--bind {agent_conv_dir} /home/kingb/.gemini/antigravity-cli/conversations`
  - Read-write logs, crashes, and implicit state: `--bind {agent_brain_dir}/.system_generated/logs ...`
  - OAuth token access: `--bind {agent_brain_dir}/antigravity-oauth-token /home/kingb/.gemini/antigravity-cli/antigravity-oauth-token`
  - Workspace directory: `--bind {workspace_dir} {workspace_dir}`

**Example Command:**
```bash
bwrap --ro-bind / / --dev /dev --proc /proc --bind /tmp /tmp \
  --tmpfs /home/kingb \
  --setenv AIM_VESSEL_CLI 'agy' \
  --ro-bind /home/kingb/.local /home/kingb/.local \
  --ro-bind /home/kingb/.gemini /home/kingb/.gemini \
  --bind /home/kingb/.gemini/antigravity-cli/bin /home/kingb/.gemini/antigravity-cli/bin \
  --bind /home/kingb/aim-connect/agent_workspaces/tenant_1 /home/kingb/aim-connect/agent_workspaces/tenant_1 \
  --bind /home/kingb/aim-connect/agent_workspaces/shared_data /home/kingb/aim-connect/agent_workspaces/tenant_1/shared_database \
  --bind /home/kingb/aim-connect/agent_workspaces/tenant_1/brain /home/kingb/.gemini/antigravity-cli/brain \
  --bind /home/kingb/aim-connect/agent_workspaces/tenant_1/conversations /home/kingb/.gemini/antigravity-cli/conversations \
  --bind /home/kingb/aim-connect/agent_workspaces/tenant_1/brain/antigravity-oauth-token /home/kingb/.gemini/antigravity-cli/antigravity-oauth-token \
  --chdir /home/kingb/aim-connect/agent_workspaces/tenant_1 \
  /home/kingb/.local/bin/agy --log-file /dev/null --model gemini-flash-latest
```

---

### 3.2 Grok (`grok`)
- **CLI Binary:** Read-only bind `/home/kingb/.grok/bin` and `/home/kingb/.grok/downloads`
- **Data Dir Mapping:** Binds tenant workspace `grok_data` directory to home config: `--bind {workspace_dir}/grok_data /home/kingb/.grok`
- **Environment:** Injects `AIM_VESSEL_CLI='grok'` and `XAI_API_KEY` (if provisioned)

**Example Command:**
```bash
bwrap --ro-bind / / --dev /dev --proc /proc --bind /tmp /tmp \
  --tmpfs /home/kingb \
  --setenv AIM_VESSEL_CLI 'grok' \
  --setenv XAI_API_KEY 'xai-...' \
  --ro-bind /home/kingb/.local /home/kingb/.local \
  --bind /home/kingb/aim-connect/agent_workspaces/tenant_1/grok_data /home/kingb/.grok \
  --ro-bind /home/kingb/.grok/bin /home/kingb/.grok/bin \
  --ro-bind /home/kingb/.grok/downloads /home/kingb/.grok/downloads \
  --bind /home/kingb/aim-connect/agent_workspaces/tenant_1 /home/kingb/aim-connect/agent_workspaces/tenant_1 \
  --bind /home/kingb/aim-connect/agent_workspaces/shared_data /home/kingb/aim-connect/agent_workspaces/tenant_1/shared_database \
  --chdir /home/kingb/aim-connect/agent_workspaces/tenant_1 \
  /home/kingb/.grok/bin/grok --always-approve --disallowed-tools ask_question --model grok-4.5
```

---

### 3.3 OpenCode (`opencode`)
- **CLI Binary:** `/home/kingb/.opencode/bin/opencode`
- **Config & Tooling:** Read-only access to `/home/kingb/.opencode`
- **Data Dir Mapping:** Binds `{workspace_dir}/opencode_data` to `/home/kingb/.local/share/opencode`
- **OAuth Binds:** Binds `opencode-oauth-token` into `/home/kingb/.opencode/opencode-oauth-token`

**Example Command:**
```bash
bwrap --ro-bind / / --dev /dev --proc /proc --bind /tmp /tmp \
  --tmpfs /home/kingb \
  --setenv AIM_VESSEL_CLI 'opencode' \
  --ro-bind /home/kingb/.local /home/kingb/.local \
  --ro-bind /home/kingb/.gemini /home/kingb/.gemini \
  --ro-bind /home/kingb/.opencode /home/kingb/.opencode \
  --bind /home/kingb/aim-connect/agent_workspaces/tenant_1/opencode_data /home/kingb/.local/share/opencode \
  --bind /home/kingb/aim-connect/agent_workspaces/tenant_1 /home/kingb/aim-connect/agent_workspaces/tenant_1 \
  --bind /home/kingb/aim-connect/agent_workspaces/tenant_1/brain/antigravity-oauth-token /home/kingb/.opencode/opencode-oauth-token \
  --chdir /home/kingb/aim-connect/agent_workspaces/tenant_1 \
  /home/kingb/.opencode/bin/opencode --auto --model google/gemini-flash-lite-latest
```

---

## 4. Security Boundaries

| Boundary | Enforcement Mechanism | Consequence |
|---|---|---|
| **Inter-Tenant Workspace Isolation** | Selective `--bind {workspace_dir}` | Agent A cannot view or write to Agent B's workspace directory (`agent_workspaces/tenant_2`). |
| **Host Home Directory Protection** | `--tmpfs /home/kingb` | Host SSH keys, shell history, and personal dotfiles in `/home/kingb` are masked by empty temporary mounts. |
| **Host OS Read-Only Protection** | `--ro-bind / /` | Agents can read system binaries (`/usr/bin`, `/bin`, `/lib`) to run tools, but cannot tamper with host binaries or configuration. |
| **OAuth Token Isolation** | Per-agent token bind mounts | Each agent CLI session only sees its assigned OAuth token bind mount for service authentication. |

---

## 5. Future Enhancements

To strengthen sandbox security beyond filesystem isolation, the following upgrades are planned for upcoming releases:

1. **Network Namespace Isolation (`--unshare-net`):**
   - Isolate network interfaces so agents cannot directly access host localhost services (e.g. redis, host DBs).
   - Implement selective proxy/firewall egress rules allowing access only to LLM provider endpoints and authorized public scraping domains.

2. **Seccomp Filters (`--seccomp`):**
   - Apply seccomp BPF filters to restrict dangerous Linux syscalls (e.g. `chroot`, `ptrace`, kernel module loads, keyring operations).

3. **Cgroup Resource Controls (`cgroups v2`):**
   - Limit CPU usage, RAM allocation, and maximum process counts per agent container to prevent denial-of-service or runaway loops from affecting neighboring agents or host performance.
