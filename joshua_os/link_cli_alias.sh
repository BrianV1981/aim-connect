#!/usr/bin/env bash
# Shared by install-clean / install-agent / install-core (and retrofit for existing projects).
# Links a host-project shell alias → nested joshua_os CLI + optional ./aim wrapper.
#
# Usage:
#   bash joshua_os/link_cli_alias.sh [PROJECT_ROOT] [CLI_NAME]
# Defaults: PROJECT_ROOT=cwd, CLI_NAME=basename(PROJECT_ROOT)

set -euo pipefail

PROJECT_ROOT="${1:-$(pwd)}"
PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
CLI_NAME="${2:-$(basename "$PROJECT_ROOT")}"

VENV_PY="$PROJECT_ROOT/joshua_os/venv/bin/python3"
CLI_PY="$PROJECT_ROOT/joshua_os/.aim_core/aim_cli.py"

if [[ ! -f "$CLI_PY" ]]; then
  echo "[ERROR] link_cli_alias: aim_cli.py not found at $CLI_PY" >&2
  exit 1
fi
if [[ ! -f "$VENV_PY" ]]; then
  echo "[WARN] link_cli_alias: venv python not found at $VENV_PY (alias still written)"
fi

RC_FILE="$HOME/.bashrc"
if [[ -f "$HOME/.zshrc" ]]; then
  RC_FILE="$HOME/.zshrc"
fi

SED_ALIAS="alias ${CLI_NAME}='NODE_OPTIONS=\"--max-old-space-size=8192\" ${VENV_PY} ${CLI_PY}'"

if [[ ! -f "$RC_FILE" ]]; then
  touch "$RC_FILE"
fi

if ! grep -q "alias ${CLI_NAME}=" "$RC_FILE" 2>/dev/null; then
  {
    echo ""
    echo "# A.I.M. CLI — ${CLI_NAME} (project: ${PROJECT_ROOT})"
    echo "$SED_ALIAS"
  } >> "$RC_FILE"
  echo "    [SUCCESS] Alias '${CLI_NAME}' added to $RC_FILE"
else
  sed -i "s|alias ${CLI_NAME}=.*|${SED_ALIAS}|g" "$RC_FILE"
  echo "    [OK] Alias '${CLI_NAME}' already exists (updated path in $RC_FILE)."
fi

WRAPPER="$PROJECT_ROOT/aim"
if [[ ! -f "$WRAPPER" ]]; then
  cat > "$WRAPPER" << 'WRAP'
#!/usr/bin/env bash
ROOT="$(dirname "$(readlink -f "$0")")"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=8192}"

# 1. Execute Core Engine
"$ROOT/joshua_os/venv/bin/python3" "$ROOT/joshua_os/.aim_core/aim_cli.py" "$@"
EXIT_CODE=$?

# 2. Teardown Hook: Commit memory state to local ledger (Issue 15)
if [ "$PWD" != "$ROOT" ] && [ -d ".git" ]; then
    echo "[*] Session complete. Committing state to local ledger..."
    git add memory_lance/ 2>/dev/null || true
    git add AGENTS.md 2>/dev/null || true
    git commit -m "Auto-commit: Agent session complete" > /dev/null 2>&1 || true
fi

exit $EXIT_CODE
WRAP
  chmod +x "$WRAPPER"
  echo "    [SUCCESS] Local ./aim wrapper written"
fi

# Systemic AGY folder-trust: wrap host `agy` so every spawn pre-registers cwd
TRUST_INSTALL="$PROJECT_ROOT/joshua_os/scripts/install_agy_trust_wrapper.sh"
if [[ -f "$TRUST_INSTALL" ]]; then
  bash "$TRUST_INSTALL" || echo "    [WARN] agy trust wrapper install failed (non-fatal)"
else
  # headless install-agent may strip scripts/; try copy from .aim_core helper alone
  if [[ -f "$PROJECT_ROOT/joshua_os/.aim_core/agy_workspace_trust.py" ]]; then
    mkdir -p "$HOME/.local/share/aim-joshua"
    cp -a "$PROJECT_ROOT/joshua_os/.aim_core/agy_workspace_trust.py" \
      "$HOME/.local/share/aim-joshua/agy_workspace_trust.py" 2>/dev/null || true
  fi
fi

# Always pre-trust this project root (exact path — parent trust does not cascade)
if [[ -f "$PROJECT_ROOT/joshua_os/.aim_core/agy_workspace_trust.py" ]]; then
  PYTHONPATH="$PROJECT_ROOT/joshua_os/.aim_core${PYTHONPATH:+:$PYTHONPATH}" \
    python3 "$PROJECT_ROOT/joshua_os/.aim_core/agy_workspace_trust.py" "$PROJECT_ROOT" \
    >/dev/null 2>&1 || true
  echo "    [OK] Registered AGY trusted workspace: $PROJECT_ROOT"
fi

echo "    [ACTION] Load the alias:  source $RC_FILE"
echo "    [ACTION] Then run:        ${CLI_NAME} doctor"
