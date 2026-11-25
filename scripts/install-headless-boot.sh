#!/bin/bash
set -euo pipefail

# ==============================================================================
# A.I.M. CONNECT - OPT-IN LINUX SYSTEMD BOOT RECOVERY INSTALLER (#299)
# ==============================================================================
# Usage:
#   ./scripts/install-headless-boot.sh --status
#   ./scripts/install-headless-boot.sh --install [--configure-tmux]
#   ./scripts/install-headless-boot.sh --configure-tmux
#   ./scripts/install-headless-boot.sh --uninstall

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE_FILE="$SCRIPT_DIR/systemd/aim-connect-boot.service"
UNIT_NAME="aim-connect-boot.service"
USER_SYSTEMD_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
TARGET_UNIT="$USER_SYSTEMD_DIR/$UNIT_NAME"
TMUX_CONF="${AIM_TMUX_CONF:-$HOME/.tmux.conf}"

ACTION="status"
CONFIGURE_TMUX=0

for arg in "$@"; do
    case "$arg" in
        --install)
            ACTION="install"
            ;;
        --uninstall)
            ACTION="uninstall"
            ;;
        --status)
            ACTION="status"
            ;;
        --configure-tmux)
            CONFIGURE_TMUX=1
            ;;
        -h|--help)
            echo "Usage: $0 [--status | --install | --uninstall] [--configure-tmux]"
            exit 0
            ;;
        *)
            echo "Unknown option: $arg" >&2
            exit 2
            ;;
    esac
done

configure_tmux_conf() {
    touch "$TMUX_CONF"
    if ! grep -q "@resurrect-capture-pane-contents" "$TMUX_CONF" 2>/dev/null; then
        printf "\nset -g @resurrect-capture-pane-contents 'on'\n" >> "$TMUX_CONF"
        echo "[headless-boot] Added @resurrect-capture-pane-contents 'on' to $TMUX_CONF"
    else
        echo "[headless-boot] @resurrect-capture-pane-contents already present in $TMUX_CONF"
    fi

    if ! grep -q "@resurrect-processes" "$TMUX_CONF" 2>/dev/null; then
        printf "set -g @resurrect-processes '\"~agy->agy -c\" \"~grok->grok -c\" \"~codex->codex -c\" \"~opencode->opencode -c\" ~node ~python3 ~cloudflared'\n" >> "$TMUX_CONF"
        echo "[headless-boot] Added @resurrect-processes (-c fast-resume + daemons) to $TMUX_CONF"
    else
        echo "[headless-boot] Preserving existing @resurrect-processes in $TMUX_CONF"
    fi
}

run_systemctl_user() {
    if [ "${AIM_SKIP_SYSTEMCTL:-0}" = "1" ]; then
        return 0
    fi
    if command -v systemctl >/dev/null 2>&1; then
        systemctl --user "$@" || true
    fi
}

if [ "$CONFIGURE_TMUX" = "1" ] && [ "$ACTION" = "status" ]; then
    configure_tmux_conf
    exit 0
fi

case "$ACTION" in
    install)
        chmod +x "$SCRIPT_DIR/boot-restore.sh"
        mkdir -p "$USER_SYSTEMD_DIR"
        sed "s|__REPO_ROOT__|$REPO_ROOT|g" "$TEMPLATE_FILE" > "$TARGET_UNIT"
        echo "[headless-boot] Installed user unit: $TARGET_UNIT"

        if [ "$CONFIGURE_TMUX" = "1" ]; then
            configure_tmux_conf
        fi

        run_systemctl_user daemon-reload
        run_systemctl_user enable "$UNIT_NAME"

        if [ "${AIM_SKIP_SYSTEMCTL:-0}" != "1" ] && command -v loginctl >/dev/null 2>&1; then
            CURRENT_USER="${USER:-$(id -un)}"
            LINGER_STATE="$(loginctl show-user "$CURRENT_USER" -p Linger --value 2>/dev/null || echo "unknown")"
            if [ "$LINGER_STATE" != "yes" ]; then
                echo "[headless-boot] TIP: Run 'sudo loginctl enable-linger $CURRENT_USER' so user systemd units start at boot before interactive login."
            fi
        fi
        ;;
    uninstall)
        run_systemctl_user disable "$UNIT_NAME"
        rm -f "$TARGET_UNIT"
        run_systemctl_user daemon-reload
        echo "[headless-boot] Removed user unit: $TARGET_UNIT"
        ;;
    status)
        if [ -f "$TARGET_UNIT" ]; then
            echo "[headless-boot] Unit file installed: $TARGET_UNIT"
        else
            echo "[headless-boot] Unit file NOT installed ($TARGET_UNIT)"
        fi
        if grep -q "@resurrect-processes" "$TMUX_CONF" 2>/dev/null; then
            echo "[headless-boot] tmux-resurrect @resurrect-processes configured in $TMUX_CONF"
        else
            echo "[headless-boot] tmux-resurrect @resurrect-processes NOT found in $TMUX_CONF"
        fi
        run_systemctl_user is-enabled "$UNIT_NAME"
        ;;
esac
