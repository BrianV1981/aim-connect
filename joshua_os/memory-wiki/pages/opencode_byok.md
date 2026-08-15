# OpenCode BYOK, variants, and the snapshot hang

Headless OpenCode in Joshua is **not** the same process as host `opencode` on the Operator's laptop. Keys, config, and snapshot behavior are isolated on purpose.

## Multi-provider (#163, shipped)

Compute label is **OpenCode (API)** (not “Joshua OS”). Browser vault:

- `leaddeed_opencode_providers` JSON: `{ google, deepseek }`
- Legacy `leaddeed_opencode_api_key` migrates into the Gemini slot
- `leaddeed_opencode_model` binds which key is sent
- `leaddeed_opencode_variant` for V4 Flash/Pro only: `default|low|medium|high|max`

WS auth prefers `opencode_provider` / `opencode_api_key` / `opencode_model` / `opencode_variant`. Legacy `gemini_*` still works. **Only the active provider key is injected.**

Backend table: `backend/opencode_providers.py`.

| Provider | Env | `--model` |
|----------|-----|-----------|
| Google | `GEMINI_API_KEY` + `GOOGLE_GENERATIVE_AI_API_KEY` | existing `google/…` map |
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek/deepseek-chat`, `reasoner`, `v4-flash`, `v4-pro` |

Confirmed on this host (`~/.opencode/bin/opencode` 1.17.18 + models.dev). TUI `opencode --auto` **rejects** `--variant` (prints help). Variants go in sandbox `~/.config/opencode/opencode.json` as `agent.build.variant`. Chat/Reasoner have no variants.

## Host key ≠ Joshua key

| Surface | File |
|---------|------|
| Host CLI (`~/aim-ld`, Operator login) | `~/.local/share/opencode/auth.json` |
| Joshua seat | `agent_workspaces/agent-<seat>/opencode_data/auth.json` (bound over `~/.local/share/opencode` **inside bwrap only**) |

Proven 2026-08-14: different inodes, keys not equal. Save & Reboot writes the **dashboard** key into the seat file. It does **not** overwrite the host login. Brian's Joshua seat may have no `auth.json` until he Save & Reboots OpenCode after `c4cc7a6`.

## 0-token hang (not a missing key)

Operator local DeepSeek V4 Pro: 11k tokens, ~4.8s. Joshua pane: **0 tokens**, still Build. Process **had** `DEEPSEEK_API_KEY` (length 35). Oracle:

- OpenCode was `git add --all` on a **7.3GB** workspace (almost all `opencode_data`)
- Customer share dir had **no** `auth.json` (host login uses that file)
- `~/.local/state/opencode` was **EROFS** (`--ro-bind ~/.local`) → models.dev lock mkdir failed

Gemini **flash-lite via OpenCode works** (Brian 2026-08-14 00:42–00:43 UTC). Do not call free Gemini a stall.

**Fix (`c4cc7a6`):** `"snapshot": false` in sandbox config; write `{provider: {type: api, key}}` into seat `auth.json`; bind writable `opencode_data/joshua_state` → `~/.local/state/opencode`. Operator confirmed DeepSeek works after Save & Reboot.

Log check (no secrets): `grep 'llm runtime selected' …/opencode_data/log/opencode.log | tail` → `llm.provider=deepseek` vs `google`.

## Related

- [joshua_architecture.md](joshua_architecture.md) §4b
- aim-ld Compute UI: `AgentTerminal.tsx`
- #165 (Operator-gated): bwrap still interpolates keys onto the command line (`ps` can see them). Do not “fix” that here.

Back to [index](../index.md)
