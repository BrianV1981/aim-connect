#!/usr/bin/env python3
"""
spawn_sandbox.py
Provisions an isolated, git-tracked sandbox for a specific tenant/agent session.
Satisfies Roadmap Issues: #1, #2, #3, and #12.
"""

import argparse
import os
import subprocess
import sys
import shutil

def run_cmd(cmd, cwd=None):
    print(f"[*] Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    if result.returncode != 0:
        print(f"[ERROR] Command failed: {result.stderr}")
        sys.exit(1)
    return result.stdout

def main():
    parser = argparse.ArgumentParser(description="J.O.S.H.U.A Sandbox Provisioner")
    parser.add_argument("tenant_id", help="Unique ID for the tenant/session")
    parser.add_argument("--bwrap", action="store_true", help="Enable strict bubblewrap isolation (Issue 12)")
    
    args = parser.parse_args()
    
    # Define paths
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # /home/kingb/aim-joshua
    sandbox_dir = os.path.join(base_dir, "sandboxes", args.tenant_id)
    
    # 1. Create the sandbox directory (Issue 1)
    if not os.path.exists(sandbox_dir):
        os.makedirs(sandbox_dir)
        print(f"[OK] Created sandbox at {sandbox_dir}")
    else:
        print(f"[INFO] Sandbox already exists at {sandbox_dir}")
        
    # 2. Implement local git init (Issue 2)
    git_dir = os.path.join(sandbox_dir, ".git")
    if not os.path.exists(git_dir):
        run_cmd(["git", "init"], cwd=sandbox_dir)
        print(f"[OK] Initialized isolated Git ledger in sandbox.")
        # Create an initial commit so branch exists
        with open(os.path.join(sandbox_dir, ".gitignore"), "w") as f:
            f.write("*.log\n")
        run_cmd(["git", "add", ".gitignore"], cwd=sandbox_dir)
        run_cmd(["git", "commit", "-m", "Initial sandbox creation"], cwd=sandbox_dir)
    
    # 3. Mount/Link OS files into the sandbox (Issue 3)
    # We copy AGENTS.md, TOOLS.md, opencode.jsonc to give the sandbox its blueprint
    blueprint_files = ["AGENTS.md", "TOOLS.md", "opencode.jsonc", "VESSEL.md"]
    for bf in blueprint_files:
        src = os.path.join(base_dir, bf)
        dst = os.path.join(sandbox_dir, bf)
        if os.path.exists(src) and not os.path.exists(dst):
            shutil.copy2(src, dst)
            print(f"[OK] Injected blueprint {bf} into sandbox.")
            
    # Symlink the aim wrapper into the sandbox so the OS can boot locally
    aim_link = os.path.join(sandbox_dir, "aim")
    if not os.path.exists(aim_link):
        os.symlink(os.path.join(base_dir, "aim"), aim_link)
        print(f"[OK] Symlinked aim wrapper into sandbox.")
        
    # 4. Handle bwrap logic (Issue 12)
    if args.bwrap:
        print("[!] Bubblewrap isolation requested. Generating bwrap alias/script...")
        bwrap_script = os.path.join(sandbox_dir, "run_secure.sh")
        with open(bwrap_script, "w") as f:
            f.write("#!/bin/bash\n")
            f.write(f"bwrap --ro-bind /usr /usr --ro-bind /bin /bin --ro-bind /lib /lib --ro-bind /lib64 /lib64 \\\n")
            f.write(f"      --bind {sandbox_dir} {sandbox_dir} \\\n")
            f.write(f"      --ro-bind {os.path.join(base_dir, 'joshua_os')} {os.path.join(base_dir, 'joshua_os')} \\\n")
            f.write(f"      --unshare-all --share-net \\\n")
            f.write(f"      --cwd {sandbox_dir} ./aim \"$@\"\n")
        os.chmod(bwrap_script, 0o755)
        print(f"[OK] Secure bwrap execution script generated at {bwrap_script}")
    else:
        print("[INFO] Bwrap isolation not requested. Running in standard local mode.")
        
    print(f"\n[SUCCESS] Sandbox {args.tenant_id} fully provisioned.")
    if args.bwrap:
        print(f"-> To execute securely: cd {sandbox_dir} && ./run_secure.sh")
    else:
        print(f"-> To execute locally:  cd {sandbox_dir} && ./aim")

if __name__ == "__main__":
    main()
