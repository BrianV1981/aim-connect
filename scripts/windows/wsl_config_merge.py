#!/usr/bin/env python3
"""Safely merge vmIdleTimeout=-1 under [wsl2] in a Windows .wslconfig file (#299).

Preserves existing sections, keys (e.g., networkingMode=mirrored, localhostForwarding=true),
comments, and line endings, and never restarts or shuts down WSL.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

SECTION_RE = re.compile(r"^\s*\[([^\]]+)\]\s*(?:[#;].*)?$")
KEY_RE = re.compile(r"^\s*([A-Za-z0-9_.-]+)\s*=\s*(.*?)\s*$")


def merge_wslconfig_text(existing_text: str, force: bool = False) -> tuple[str, bool]:
    """Ensure vmIdleTimeout=-1 is set under [wsl2]. Returns (updated_text, changed)."""
    newline = "\r\n" if "\r\n" in existing_text else "\n"
    raw_lines = existing_text.splitlines() if existing_text else []

    if not raw_lines:
        return f"[wsl2]{newline}vmIdleTimeout=-1{newline}", True

    out_lines: list[str] = []
    in_wsl2 = False
    found_wsl2_section = False
    found_vm_idle_key = False
    changed = False

    for line in raw_lines:
        sec_match = SECTION_RE.match(line)
        if sec_match:
            if in_wsl2 and not found_vm_idle_key:
                out_lines.append("vmIdleTimeout=-1")
                found_vm_idle_key = True
                changed = True
            sec_name = sec_match.group(1).strip().lower()
            in_wsl2 = sec_name == "wsl2"
            if in_wsl2:
                found_wsl2_section = True
            out_lines.append(line)
            continue

        if in_wsl2 and not line.lstrip().startswith(("#", ";")):
            key_match = KEY_RE.match(line)
            if key_match and key_match.group(1).strip().lower() == "vmidletimeout":
                found_vm_idle_key = True
                current_val = key_match.group(2).split("#", 1)[0].split(";", 1)[0].strip()
                if current_val != "-1" and force:
                    out_lines.append("vmIdleTimeout=-1")
                    changed = True
                else:
                    out_lines.append(line)
                continue

        out_lines.append(line)

    if found_wsl2_section and not found_vm_idle_key:
        out_lines.append("vmIdleTimeout=-1")
        changed = True
    elif not found_wsl2_section:
        if out_lines and out_lines[-1].strip():
            out_lines.append("")
        out_lines.append("[wsl2]")
        out_lines.append("vmIdleTimeout=-1")
        changed = True

    rendered = newline.join(out_lines) + newline
    return rendered, changed


def ensure_wslconfig_file(path: Path, force: bool = False) -> bool:
    """Update .wslconfig on disk if needed. Returns True if modified."""
    existing = path.read_text(encoding="utf-8", errors="replace") if path.exists() else ""
    updated, changed = merge_wslconfig_text(existing, force=force)
    if changed or not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            backup = path.with_suffix(path.suffix + ".bak")
            backup.write_text(existing, encoding="utf-8")
        path.write_text(updated, encoding="utf-8")
        return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Merge vmIdleTimeout=-1 into .wslconfig")
    parser.add_argument("path", help="Path to .wslconfig")
    parser.add_argument("--force", action="store_true", help="Overwrite existing vmIdleTimeout value")
    parser.add_argument("--check", action="store_true", help="Check only without modifying file")
    args = parser.parse_args()

    target = Path(args.path).expanduser()
    existing = target.read_text(encoding="utf-8", errors="replace") if target.exists() else ""
    _, would_change = merge_wslconfig_text(existing, force=args.force)
    if args.check:
        if would_change:
            print(f"[wslconfig] vmIdleTimeout=-1 MISSING in {target}")
            return 1
        print(f"[wslconfig] vmIdleTimeout configured in {target}")
        return 0

    changed = ensure_wslconfig_file(target, force=args.force)
    if changed:
        print(f"[wslconfig] Updated {target} with vmIdleTimeout=-1 (backup saved to {target}.bak if prior file existed).")
    else:
        print(f"[wslconfig] {target} already preserves vmIdleTimeout.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
