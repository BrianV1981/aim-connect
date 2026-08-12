#!/bin/bash
# A.I.M. Sovereign Co-Agent Installer (headless)
# curl -fsSL https://raw.githubusercontent.com/BrianV1981/aim-joshua/main/joshua_os/install-agent.sh | bash -s python-developer

set -e
echo "--- J.O.S.H.U.A. SOVEREIGN CO-AGENT INSTALLER ---"

CURRENT_DIR=$(pwd)
CLI_NAME=$(basename "$CURRENT_DIR")

echo "[*] Step 1: Provisioning Local Operating System..."

git clone --depth 1 https://github.com/BrianV1981/aim-joshua.git .aim_temp_clone
cd .aim_temp_clone

echo "    [*] Building Engine Virtual Environment..."
./joshua_os/setup.sh

echo "[*] Step 2: Scaffolding Sovereign Environment..."

# Clean Sweep (sever OS identity / product dirt before merge)
rm -rf .git/ .github/ .vscode/ memory-wiki/ joshua_os/memory-wiki/ workspace/
rm -f HANDOFF.md
rm -rf joshua_os/tests/ joshua_os/benchmarks/ joshua_os/docs/ joshua_os/skills/
# Keep scripts/ for agy trust wrapper installer; strip bulk only if present
# (link_cli_alias + install_agy_trust_wrapper are required for folder-trust)

cp -a joshua_os ../

cp -n AGENTS.md ../ 2>/dev/null || true
cp -n TOOLS.md ../ 2>/dev/null || true

cd ..
rm -rf .aim_temp_clone

if [ ! -d ".git" ]; then
    git init
fi

[ ! -f README.md ] && echo "# My JOSHUA Project" > README.md

mkdir -p joshua_os/memory_lance
cp -r joshua_os/assets/default_lance/* joshua_os/memory_lance/

echo "    [*] Linking Local Alias ($CLI_NAME)..."
bash ./joshua_os/link_cli_alias.sh "$CURRENT_DIR" "$CLI_NAME"

echo "    [*] AGY folder-trust (exact cwd registration for all future spawns)..."
# Preserve trust helper even if scripts/ was stripped earlier in this installer
if [[ -f ./joshua_os/.aim_core/agy_workspace_trust.py ]]; then
  mkdir -p "$HOME/.local/share/aim-joshua"
  cp -a ./joshua_os/.aim_core/agy_workspace_trust.py \
    "$HOME/.local/share/aim-joshua/agy_workspace_trust.py"
  # Prefer full wrapper installer if scripts survived; else minimal trust of project root
  if [[ -f ./joshua_os/scripts/install_agy_trust_wrapper.sh ]]; then
    bash ./joshua_os/scripts/install_agy_trust_wrapper.sh || true
  fi
  PYTHONPATH="./joshua_os/.aim_core${PYTHONPATH:+:$PYTHONPATH}" \
    python3 ./joshua_os/.aim_core/agy_workspace_trust.py "$CURRENT_DIR" || true
fi

echo ""
echo "--- CO-AGENT DEPLOYMENT COMPLETE ---"
echo "Your Sovereign Node is installed with the default AGENTS.md blueprint."
echo "CRITICAL: source your shell RC (see above), then run: $CLI_NAME doctor"
echo "NOTE: New folders still need exact trust — host 'agy' wrapper pre-trusts pwd on each launch."
echo ""
