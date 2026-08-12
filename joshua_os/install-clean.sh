#!/bin/bash
# A.I.M. Exoskeleton Installer (Clean Project Wrapper)
# curl -fsSL https://raw.githubusercontent.com/BrianV1981/aim-joshua/main/joshua_os/install-clean.sh | bash

set -e
echo "--- J.O.S.H.U.A. CLEAN INSTALLER ---"

CURRENT_DIR=$(pwd)
CLI_NAME=$(basename "$CURRENT_DIR")

echo "[*] Step 1: Provisioning Local Operating System..."

# Clone the engine directly into a temporary hidden folder to avoid empty directory conflicts
git clone --depth 1 https://github.com/BrianV1981/aim-joshua.git .aim_temp_clone
cd .aim_temp_clone

echo "    [*] Building Engine Virtual Environment..."
./joshua_os/setup.sh

# Safely merge the Engine components into the host project
echo "[*] Step 2: Scaffolding Sovereign Environment..."

# Clean Sweep (Severing identity and cleaning out developer artifacts BEFORE moving)
rm -rf .git/ .github/ .vscode/
rm -rf joshua_os/tests/ joshua_os/benchmarks/ joshua_os/docs/ joshua_os/scripts/ joshua_os/skills/

cp -a joshua_os ../

cp -n AGENTS.md ../ 2>/dev/null || true
cp -n TOOLS.md ../ 2>/dev/null || true

cd ..
rm -rf .aim_temp_clone

if [ ! -d ".git" ]; then
    git init
fi

[ ! -f README.md ] && echo "# My JOSHUA Project" > README.md

# Base OS Provisioning (Moving the pre-baked DB to the active layer)
mkdir -p joshua_os/memory_lance
cp -r joshua_os/assets/default_lance/* joshua_os/memory_lance/

# Generate Ghost Folder Explainers
mkdir -p joshua_os/foundry joshua_os/planning-artifacts joshua_os/workspace
echo "# A.I.M. Foundry
Drop external raw PDFs, documents, or foreign repositories here before compiling them into \`.parquet\` cartridges via the \`aim bake\` command." > joshua_os/foundry/README.md

echo "# A.I.M. Planning Artifacts
Use this directory as a scratchpad for agents to generate architectural roadmaps, design documents, or task breakdowns before committing to code." > joshua_os/planning-artifacts/README.md

echo "# A.I.M. Workspace
This directory contains isolated Git Worktrees. When you type \`aim fix <id>\`, A.I.M. checks out a clean sandbox here to prevent you from working directly on the \`main\` branch." > joshua_os/workspace/README.md

echo "    [*] Linking Local Alias ($CLI_NAME)..."
bash ./joshua_os/link_cli_alias.sh "$CURRENT_DIR" "$CLI_NAME"

echo ""
echo "--- INSTALLATION COMPLETE ---"
echo "J.O.S.H.U.A. is installed and ready. A default AGENTS.md blueprint has been provided."
echo ""
