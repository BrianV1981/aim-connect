#!/bin/bash
set -uo pipefail

# ==============================================================================
# A.I.M. CONNECT - HEADLESS COLD-BOOT RESTORE & HEALTH-CHECK (#299)
# ==============================================================================
# 1. If no tmux server is running (e.g. after OS / WSL2 reboot or crash) and a
#    tmux-resurrect snapshot exists, bootstrap a temporary session
#    (aim_restore_tmp), trigger restore.sh so saved sessions & AI agents (-c)
#    resurrect, and remove aim_restore_tmp.
# 2. Always invoke ./startup.sh in idempotent health-check mode afterward so
#    FastAPI (:8000), optional MCP (:8001), and Cloudflared are guaranteed live.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Ensure user-local CLI binaries (agy, grok, opencode, codex, cloudflared) are
# on PATH when invoked from a non-interactive systemd unit.
export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"

RESURRECT_RESTORE_SCRIPT="${AIM_RESURRECT_RESTORE_SCRIPT:-$HOME/.tmux/plugins/tmux-resurrect/scripts/restore.sh}"
RESURRECT_LAST_PRIMARY="${AIM_RESURRECT_LAST_FILE:-$HOME/.local/share/tmux/resurrect/last}"
RESURRECT_LAST_FALLBACK="$HOME/.tmux/resurrect/last"
TMUX_SETTINGS_FILE="${AIM_TMUX_SETTINGS_FILE:-$HOME/.aim_tmux_settings.json}"
BOOT_RESTORE_WAIT_SECONDS="${AIM_BOOT_RESTORE_WAIT_SECONDS:-5}"
STARTUP_SCRIPT="${AIM_STARTUP_SCRIPT:-$REPO_ROOT/startup.sh}"

has_saved_snapshot() {
    [ -e "$RESURRECT_LAST_PRIMARY" ] || [ -e "$RESURRECT_LAST_FALLBACK" ]
}

is_auto_restore_enabled() {
    if [ -f "$TMUX_SETTINGS_FILE" ] && grep -Eq '"auto_restore_on_boot"[[:space:]]*:[[:space:]]*false' "$TMUX_SETTINGS_FILE" 2>/dev/null; then
        return 1
    fi
    return 0
}

if ! tmux has-session 2>/dev/null; then
    if ! is_auto_restore_enabled; then
        echo "[boot-restore] Cold-boot snapshot auto-restore is disabled in $TMUX_SETTINGS_FILE; starting AIM-Connect services only."
    elif [ -x "$RESURRECT_RESTORE_SCRIPT" ] && has_saved_snapshot; then
        echo "[boot-restore] Dead tmux daemon detected; bootstrapping cold-boot tmux-resurrect restore..."
        tmux new-session -d -s aim_restore_tmp
        tmux set-option -g mouse on 2>/dev/null || true
        tmux run-shell "$RESURRECT_RESTORE_SCRIPT"
        sleep "$BOOT_RESTORE_WAIT_SECONDS"
        tmux kill-session -t aim_restore_tmp 2>/dev/null || true
        echo "[boot-restore] Cold-boot tmux-resurrect restore completed."
    else
        echo "[boot-restore] No tmux-resurrect snapshot or restore.sh found; skipping snapshot restore."
    fi
else
    echo "[boot-restore] Active tmux server detected; skipping cold-boot restore to preserve live sessions."
fi

if [ -f "$STARTUP_SCRIPT" ]; then
    echo "[boot-restore] Running idempotent startup.sh health-check..."
    bash "$STARTUP_SCRIPT"
else
    echo "[boot-restore] ERROR: startup.sh not found at $STARTUP_SCRIPT" >&2
    exit 1
fi
