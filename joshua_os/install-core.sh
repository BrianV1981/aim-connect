#!/bin/bash
# A.I.M. Core Contributor Installer
# curl -fsSL https://raw.githubusercontent.com/BrianV1981/aim-joshua/main/joshua_os/install-core.sh | bash

set -e
echo "--- J.O.S.H.U.A. CORE CONTRIBUTOR INSTALLER ---"

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

shopt -s dotglob
cp -a * ../
cd ..
rm -rf .aim_temp_clone
shopt -u dotglob

# Base OS Provisioning (Moving the pre-baked DB to the active layer)
mkdir -p joshua_os/memory_lance
cp -r joshua_os/assets/default_lance/* joshua_os/memory_lance/

echo "    [*] Linking Local Alias ($CLI_NAME)..."
bash ./joshua_os/link_cli_alias.sh "$CURRENT_DIR" "$CLI_NAME"

echo ""
echo "--- INSTALLATION COMPLETE ---"
echo "You are a Core Contributor. The .git history and developer folders (tests/, benchmarks/) have been preserved."
echo "A default AGENTS.md blueprint has been provided."
echo ""