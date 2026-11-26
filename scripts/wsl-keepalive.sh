#!/bin/bash
set -euo pipefail

# ==============================================================================
# A.I.M. CONNECT - REVERSIBLE WSL2 ALWAYS-ON KEEPALIVE CONTROLLER (#305)
# ==============================================================================
# Usage:
#   ./scripts/wsl-keepalive.sh on
#   ./scripts/wsl-keepalive.sh off
#   ./scripts/wsl-keepalive.sh status [--json]
#
# "on"  -> Sets vmIdleTimeout=-1 in Windows .wslconfig, installs a zero-window
#          wscript.exe launcher in Windows Startup (shell:startup), and spawns
#          the Windows-side wsl.exe keepalive handle so closing Windows Terminal
#          does NOT shut down WSL2.
# "off" -> Terminates aim_wsl_keepalive_sleep, removes the Windows Startup VBS
#          launcher, and strips vmIdleTimeout=-1 from .wslconfig so WSL2 reverts
#          100% to default Windows idle-shutdown behavior.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MERGE_PY="$SCRIPT_DIR/windows/wsl_config_merge.py"
PYTHON_BIN="$(command -v python3 || echo python)"

ACTION="status"
JSON_OUTPUT=0

for arg in "$@"; do
    case "$arg" in
        on|--on|enable|--enable)
            ACTION="on"
            ;;
        off|--off|disable|--disable|revert|--revert)
            ACTION="off"
            ;;
        status|--status)
            ACTION="status"
            ;;
        ensure-handle|--ensure-handle)
            ACTION="ensure_handle"
            ;;
        --json)
            JSON_OUTPUT=1
            ;;
        -h|--help)
            echo "Usage: $0 [on | off | status | ensure-handle] [--json]"
            exit 0
            ;;
        *)
            echo "Unknown option: $arg" >&2
            echo "Usage: $0 [on | off | status | ensure-handle] [--json]" >&2
            exit 2
            ;;
    esac
done

resolve_wsl_interop() {
    if [ "${AIM_SKIP_WIN_EXEC:-0}" = "1" ]; then
        echo ""
        return 0
    fi
    local cmd_exe="/mnt/c/Windows/System32/cmd.exe"
    if [ ! -x "$cmd_exe" ]; then
        echo ""
        return 0
    fi
    if [ -n "${WSL_INTEROP:-}" ] && [ -S "${WSL_INTEROP:-}" ]; then
        if (cd /mnt/c && WSL_INTEROP="$WSL_INTEROP" timeout 2 "$cmd_exe" /d /c "exit 0" </dev/null >/dev/null 2>&1); then
            echo "$WSL_INTEROP"
            return 0
        fi
    fi
    local sock
    for sock in $(ls -t /run/WSL/*_interop 2>/dev/null || true); do
        if [ -S "$sock" ]; then
            if (cd /mnt/c && WSL_INTEROP="$sock" timeout 2 "$cmd_exe" /d /c "exit 0" </dev/null >/dev/null 2>&1); then
                echo "$sock"
                return 0
            fi
        fi
    done
    echo ""
}

ACTIVE_INTEROP="$(resolve_wsl_interop)"

resolve_win_home() {
    if [ -n "${AIM_WIN_HOME:-}" ]; then
        echo "$AIM_WIN_HOME"
        return 0
    fi
    local cmd_exe="/mnt/c/Windows/System32/cmd.exe"
    if [ -n "$ACTIVE_INTEROP" ] && [ -x "$cmd_exe" ] && command -v wslpath >/dev/null 2>&1; then
        local raw_prof
        raw_prof="$(cd /mnt/c && WSL_INTEROP="$ACTIVE_INTEROP" timeout 2 "$cmd_exe" /d /c "echo %USERPROFILE%" </dev/null 2>/dev/null | tr -d '\r' | tail -n 1 || true)"
        if [ -n "$raw_prof" ] && [[ "$raw_prof" != *"%USERPROFILE%"* ]]; then
            local converted
            converted="$(wslpath -u "$raw_prof" 2>/dev/null || true)"
            if [ -n "$converted" ] && [ -d "$converted" ]; then
                echo "$converted"
                return 0
            fi
        fi
    fi
    if [ -n "${USER:-}" ] && [ -d "/mnt/c/Users/$USER" ]; then
        echo "/mnt/c/Users/$USER"
        return 0
    fi
    local candidate
    for candidate in /mnt/c/Users/*; do
        if [ -d "$candidate/AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Startup" ]; then
            echo "$candidate"
            return 0
        fi
    done
    echo ""
}

resolve_distro_name() {
    local raw="${AIM_WSL_DISTRO:-${WSL_DISTRO_NAME:-}}"
    if [ -z "$raw" ] && command -v wslpath >/dev/null 2>&1; then
        local unc
        unc="$(wslpath -w / 2>/dev/null | tr -d '\r' || true)"
        # Matches \\wsl.localhost\Ubuntu\ or \\wsl$\Ubuntu\
        if [[ "$unc" =~ ^\\\\wsl(\.localhost|\$)\\([^\\]+) ]]; then
            raw="${BASH_REMATCH[2]}"
        fi
    fi
    if [ -z "$raw" ]; then
        raw="Ubuntu"
    fi
    echo "$raw" | tr -cd 'a-zA-Z0-9_.-'
}

WIN_HOME="$(resolve_win_home)"
WSLCONFIG_PATH="${AIM_WSLCONFIG_PATH:-${WIN_HOME:+$WIN_HOME/.wslconfig}}"
STARTUP_DIR="${AIM_WIN_STARTUP_DIR:-${WIN_HOME:+$WIN_HOME/AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Startup}}"
LOCALAPPDATA_DIR="${AIM_WIN_LOCALAPPDATA_DIR:-${WIN_HOME:+$WIN_HOME/AppData/Local/AIM-Connect}}"
STARTUP_VBS="${STARTUP_DIR:+$STARTUP_DIR/aim-wsl-keepalive.vbs}"
LEGACY_VBS="${LOCALAPPDATA_DIR:+$LOCALAPPDATA_DIR/wsl-keepalive.vbs}"
SAFE_DISTRO="$(resolve_distro_name)"

is_keepalive_running() {
    pgrep -f "^aim_wsl_keepalive_sleep" >/dev/null 2>&1
}

is_idle_timeout_set() {
    [ -n "$WSLCONFIG_PATH" ] && [ -f "$WSLCONFIG_PATH" ] && grep -Eiq '^[[:space:]]*vmIdleTimeout[[:space:]]*=[[:space:]]*-1([[:space:]]|$)' "$WSLCONFIG_PATH"
}

is_startup_installed() {
    { [ -n "$STARTUP_VBS" ] && [ -f "$STARTUP_VBS" ]; } || { [ -n "$LEGACY_VBS" ] && [ -f "$LEGACY_VBS" ]; }
}

spawn_keepalive_handle() {
    local target_vbs=""
    if [ -n "$STARTUP_VBS" ] && [ -f "$STARTUP_VBS" ]; then
        target_vbs="$STARTUP_VBS"
    elif [ -n "$LEGACY_VBS" ] && [ -f "$LEGACY_VBS" ]; then
        target_vbs="$LEGACY_VBS"
    fi

    local wscript_exe="/mnt/c/Windows/System32/wscript.exe"
    if [ "${AIM_SKIP_WIN_EXEC:-0}" != "1" ] && [ -n "$ACTIVE_INTEROP" ] && [ -n "$target_vbs" ] && [ -x "$wscript_exe" ] && command -v wslpath >/dev/null 2>&1; then
        local win_vbs_path
        win_vbs_path="$(wslpath -w "$target_vbs")"
        (cd /mnt/c && WSL_INTEROP="$ACTIVE_INTEROP" setsid "$wscript_exe" //B //NoLogo "$win_vbs_path" </dev/null >/dev/null 2>&1 &)
        for _ in 1 2 3 4 5 6 7 8 9 10; do
            if is_keepalive_running; then
                return 0
            fi
            sleep 0.2
        done
    fi

    # Fallback handle when running inside a Linux/CI environment without Windows wscript.exe interop
    if ! is_keepalive_running; then
        nohup bash -c 'exec -a aim_wsl_keepalive_sleep sleep infinity' </dev/null >/dev/null 2>&1 &
        sleep 0.1
    fi
}

case "$ACTION" in
    on)
        if [ -z "$WSLCONFIG_PATH" ] || [ -z "$STARTUP_DIR" ]; then
            echo "[wsl-keepalive] ERROR: Could not locate Windows user profile directory (/mnt/c/Users/<user>)." >&2
            exit 1
        fi
        "$PYTHON_BIN" "$MERGE_PY" --force "$WSLCONFIG_PATH" >/dev/null
        mkdir -p "$STARTUP_DIR"
        printf "' Headless zero-window WSL2 keepalive handle for AIM-Connect (#305/#311)\r\nSet sh = CreateObject(\"WScript.Shell\")\r\nsh.Run \"wsl.exe -d %s --exec bash -c \"\"pgrep -f ^aim_wsl_keepalive_sleep >/dev/null 2>&1 || exec -a aim_wsl_keepalive_sleep sleep infinity\"\"\", 0, False\r\n" "$SAFE_DISTRO" > "$STARTUP_VBS"

        spawn_keepalive_handle

        echo "[wsl-keepalive] ENABLED WSL2 Always-On Mode:"
        echo "  - .wslconfig vmIdleTimeout=-1 : $WSLCONFIG_PATH"
        echo "  - Windows Startup launcher    : $STARTUP_VBS"
        echo "  - Keepalive handle            : ACTIVE (closing Windows Terminal will NOT shut down WSL)"
        echo "  - To turn OFF & revert        : ./scripts/wsl-keepalive.sh off"
        ;;

    ensure_handle)
        if is_idle_timeout_set && is_startup_installed; then
            if ! is_keepalive_running; then
                spawn_keepalive_handle
            fi
        fi
        ;;

    off)
        pkill -f "^aim_wsl_keepalive_sleep" 2>/dev/null || true
        for _ in 1 2 3 4 5; do
            if ! is_keepalive_running; then
                break
            fi
            sleep 0.1
        done

        if [ -n "$STARTUP_VBS" ] && [ -f "$STARTUP_VBS" ]; then
            rm -f "$STARTUP_VBS"
        fi
        if [ -n "$LEGACY_VBS" ] && [ -f "$LEGACY_VBS" ]; then
            rm -f "$LEGACY_VBS"
        fi
        if [ -n "$WSLCONFIG_PATH" ] && [ -f "$WSLCONFIG_PATH" ]; then
            "$PYTHON_BIN" "$MERGE_PY" --remove "$WSLCONFIG_PATH" >/dev/null
        fi

        echo "[wsl-keepalive] DISABLED & REVERTED WSL2 Always-On Mode:"
        echo "  - Keepalive handle stopped"
        echo "  - Windows Startup launcher removed"
        echo "  - vmIdleTimeout=-1 removed from ${WSLCONFIG_PATH:-.wslconfig}"
        ;;

    status)
        IDLE_OK="false"
        STARTUP_OK="false"
        PROC_OK="false"
        ALWAYS_ON="false"
        is_idle_timeout_set && IDLE_OK="true"
        is_startup_installed && STARTUP_OK="true"
        is_keepalive_running && PROC_OK="true"
        if [ "$IDLE_OK" = "true" ] && { [ "$STARTUP_OK" = "true" ] || [ "$PROC_OK" = "true" ]; }; then
            ALWAYS_ON="true"
        fi

        if [ "$JSON_OUTPUT" = "1" ]; then
            "$PYTHON_BIN" -c "import json,sys; print(json.dumps({
                'wsl_always_on_enabled': sys.argv[1] == 'true',
                'wsl_idle_timeout_configured': sys.argv[2] == 'true',
                'windows_startup_installed': sys.argv[3] == 'true',
                'wsl_keepalive_running': sys.argv[4] == 'true',
                'wslconfig_path': sys.argv[5],
                'startup_vbs_path': sys.argv[6],
            }))" "$ALWAYS_ON" "$IDLE_OK" "$STARTUP_OK" "$PROC_OK" "${WSLCONFIG_PATH:-}" "${STARTUP_VBS:-}"
        else
            echo "[wsl-keepalive] WSL2 Always-On : $([ "$ALWAYS_ON" = "true" ] && echo "ENABLED" || echo "OFF (Default Windows behavior)")"
            echo "  - .wslconfig vmIdleTimeout=-1 : $IDLE_OK (${WSLCONFIG_PATH:-not found})"
            echo "  - Windows Startup VBS         : $STARTUP_OK (${STARTUP_VBS:-not found})"
            echo "  - Keepalive handle active     : $PROC_OK"
        fi
        ;;
esac
