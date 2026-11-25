"""Tmux workspace persistence, Empty-Save Guardrail, Fast Resume (-c), Git Repo discovery, and TMUX & BOOT Settings (#300).

Ported from battle-tested `aim-tmux-dashboard` (`TmuxManager` issues #37, #38, #44, #47, #48, #49)
with persistent web Settings controls for default harness, -c auto-resume, autonomous skip-permissions,
cold-boot auto-restore, WSL keepalive / boot unit status, Empty-Save Guardrail, sidebar bar visibility,
and shared `~/.aim_dashboard.json` Git scan roots.
"""

from __future__ import annotations

import glob
import json
import os
import re
import shlex
import shutil
import subprocess
from pathlib import Path

KNOWN_AI_AGENTS = (
    "agy",
    "aider",
    "claude",
    "grok",
    "gpt",
    "agent",
    "opencode",
    "gemini",
    "codex",
    "antigravity",
)

LAUNCHABLE_AGENTS = ("agy", "grok", "opencode", "codex", "claude", "gemini", "aider")

IDLE_SHELLS = ("bash", "-bash", "zsh", "-zsh", "sh", "-sh", "fish", "-fish")

IGNORED_SCAN_DIRS = {
    "venv",
    ".venv",
    "node_modules",
    "__pycache__",
    "workspace",
    "archive",
    "aim_legacy_archive",
    "joshua_os",
    "aim-agy_os",
    "target",
    "dist",
    "build",
    "agent_workspaces",
}


def sanitize_session_name(name: str) -> str:
    """Sanitize a repository/folder name into a valid AIM-Connect tmux session name."""
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "-", (name or "").strip()).strip("-")
    return (cleaned[:64]) or "project"


def is_ai_cmd(cmd: str | None) -> bool:
    cmd_lower = (cmd or "").lower()
    return any(agent in cmd_lower for agent in KNOWN_AI_AGENTS)


def is_idle_shell(cmd: str | None) -> bool:
    return (cmd or "").strip().lower() in IDLE_SHELLS


def _get_settings_file_path(home_dir: str | None = None) -> Path:
    env_override = os.environ.get("AIM_TMUX_SETTINGS_FILE", "").strip()
    if env_override:
        return Path(env_override)
    base_home = Path(home_dir or os.path.expanduser("~"))
    return base_home / ".aim_tmux_settings.json"


def _get_dash_config_path(home_dir: str | None = None) -> Path:
    env_override = os.environ.get("AIM_DASHBOARD_CONFIG_FILE", "").strip()
    if env_override:
        return Path(env_override)
    base_home = Path(home_dir or os.path.expanduser("~"))
    return base_home / ".aim_dashboard.json"


def _detect_tmux_conf_skip_permissions(home_dir: str | None = None) -> bool:
    base_home = Path(home_dir or os.path.expanduser("~"))
    tmux_conf = Path(os.environ.get("AIM_TMUX_CONF", str(base_home / ".tmux.conf")))
    if tmux_conf.is_file():
        try:
            return "--dangerously-skip-permissions" in tmux_conf.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return False
    return False


def load_tmux_settings(home_dir: str | None = None) -> dict:
    """Load persistent TMUX & BOOT settings merged with ~/.aim_dashboard.json search_paths."""
    settings_path = _get_settings_file_path(home_dir=home_dir)
    dash_path = _get_dash_config_path(home_dir=home_dir)

    defaults = {
        "default_agent": "agy",
        "auto_resume_c": True,
        "skip_permissions": _detect_tmux_conf_skip_permissions(home_dir=home_dir),
        "auto_restore_on_boot": True,
        "empty_save_guardrail": True,
        "show_sidebar_resurrect_bar": True,
        "search_paths": [],
    }

    if settings_path.is_file():
        try:
            raw = json.loads(settings_path.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                if str(raw.get("default_agent", "")).lower() in (*LAUNCHABLE_AGENTS, "shell"):
                    defaults["default_agent"] = str(raw["default_agent"]).lower()
                for bool_key in (
                    "auto_resume_c",
                    "skip_permissions",
                    "auto_restore_on_boot",
                    "empty_save_guardrail",
                    "show_sidebar_resurrect_bar",
                ):
                    if bool_key in raw:
                        defaults[bool_key] = bool(raw[bool_key])
                if isinstance(raw.get("search_paths"), list):
                    defaults["search_paths"] = [str(p).strip() for p in raw["search_paths"] if str(p).strip()]
        except Exception:
            pass

    if dash_path.is_file():
        try:
            dash_cfg = json.loads(dash_path.read_text(encoding="utf-8"))
            if isinstance(dash_cfg, dict) and isinstance(dash_cfg.get("search_paths"), list):
                merged_paths: list[str] = []
                for item in [*dash_cfg["search_paths"], *defaults["search_paths"]]:
                    cleaned = str(item).strip()
                    if cleaned and cleaned not in merged_paths:
                        merged_paths.append(cleaned)
                defaults["search_paths"] = merged_paths
        except Exception:
            pass

    return defaults


def save_tmux_settings(patch: dict, home_dir: str | None = None, sync_tmux_conf: bool = False) -> dict:
    """Persist TMUX & BOOT settings (0600) and synchronize search_paths with ~/.aim_dashboard.json."""
    current = load_tmux_settings(home_dir=home_dir)

    if "default_agent" in patch and patch["default_agent"] is not None:
        cand = str(patch["default_agent"]).strip().lower()
        if cand not in (*LAUNCHABLE_AGENTS, "shell"):
            raise ValueError(f"Unsupported default_agent: {cand!r}")
        current["default_agent"] = cand

    for bool_key in (
        "auto_resume_c",
        "skip_permissions",
        "auto_restore_on_boot",
        "empty_save_guardrail",
        "show_sidebar_resurrect_bar",
    ):
        if bool_key in patch and patch[bool_key] is not None:
            current[bool_key] = bool(patch[bool_key])

    if "search_paths" in patch and patch["search_paths"] is not None:
        cleaned_paths: list[str] = []
        for raw_p in patch["search_paths"]:
            val = str(raw_p).strip()
            if val and val not in cleaned_paths:
                cleaned_paths.append(val)
        current["search_paths"] = cleaned_paths[:20]

    settings_path = _get_settings_file_path(home_dir=home_dir)
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    settings_path.write_text(json.dumps(current, indent=2) + "\n", encoding="utf-8")
    try:
        os.chmod(settings_path, 0o600)
    except OSError:
        pass

    dash_path = _get_dash_config_path(home_dir=home_dir)
    dash_data: dict = {}
    if dash_path.is_file():
        try:
            loaded = json.loads(dash_path.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                dash_data = loaded
        except Exception:
            dash_data = {}
    dash_data["search_paths"] = current["search_paths"]
    dash_path.parent.mkdir(parents=True, exist_ok=True)
    dash_path.write_text(json.dumps(dash_data, indent=2) + "\n", encoding="utf-8")

    if sync_tmux_conf:
        sync_resurrect_processes_in_tmux_conf(
            auto_resume_c=current["auto_resume_c"],
            skip_permissions=current["skip_permissions"],
            home_dir=home_dir,
        )

    return current


def sync_resurrect_processes_in_tmux_conf(
    auto_resume_c: bool = True,
    skip_permissions: bool = False,
    home_dir: str | None = None,
) -> None:
    """Update or append @resurrect-processes in ~/.tmux.conf with valid single-quoted -> rules (#44)."""
    base_home = Path(home_dir or os.path.expanduser("~"))
    tmux_conf = Path(os.environ.get("AIM_TMUX_CONF", str(base_home / ".tmux.conf")))
    agy_cmd = build_agent_launch_command("agy", resume=auto_resume_c, skip_permissions=skip_permissions)
    grok_cmd = build_agent_launch_command("grok", resume=auto_resume_c, skip_permissions=False)
    codex_cmd = build_agent_launch_command("codex", resume=auto_resume_c, skip_permissions=False)
    oc_cmd = build_agent_launch_command("opencode", resume=auto_resume_c, skip_permissions=False)
    target_line = (
        f'set -g @resurrect-processes \'"{f"~agy->{agy_cmd}"}" '
        f'"{f"~grok->{grok_cmd}"}" "{f"~codex->{codex_cmd}"}" "{f"~opencode->{oc_cmd}"}" '
        f"~node ~python3 ~cloudflared'"
    )

    existing_lines = tmux_conf.read_text(encoding="utf-8").splitlines() if tmux_conf.is_file() else []
    out_lines: list[str] = []
    replaced = False
    has_capture = False

    for line in existing_lines:
        if "@resurrect-capture-pane-contents" in line and not line.lstrip().startswith("#"):
            has_capture = True
        if "@resurrect-processes" in line and not line.lstrip().startswith("#"):
            if not replaced:
                out_lines.append(target_line)
                replaced = True
            continue
        out_lines.append(line)

    if not has_capture:
        out_lines.append("set -g @resurrect-capture-pane-contents 'on'")
    if not replaced:
        out_lines.append(target_line)

    tmux_conf.write_text("\n".join(out_lines) + "\n", encoding="utf-8")
    subprocess.run(["tmux", "source-file", str(tmux_conf)], capture_output=True)


def get_host_boot_and_wsl_status(home_dir: str | None = None) -> dict:
    """Inspect WSL2 idle-timeout, sleep-infinity keepalive, and Linux systemd boot unit status."""
    base_home = Path(home_dir or os.path.expanduser("~"))
    is_wsl = os.path.exists("/proc/sys/fs/binfmt_misc/WSLInterop")
    if not is_wsl and os.path.isfile("/proc/version"):
        try:
            is_wsl = "microsoft" in Path("/proc/version").read_text(encoding="utf-8", errors="ignore").lower()
        except OSError:
            is_wsl = False

    wsl_idle_configured = False
    wsl_cfg_env = os.environ.get("AIM_WSLCONFIG_PATH", "").strip()
    win_home_env = os.environ.get("AIM_WIN_HOME", "").strip()
    if wsl_cfg_env:
        candidate_cfgs = [Path(wsl_cfg_env)]
    elif win_home_env:
        candidate_cfgs = [Path(win_home_env) / ".wslconfig"]
    else:
        candidate_cfgs = [Path(p) for p in glob.glob("/mnt/c/Users/*/.wslconfig")]
    for cfg in candidate_cfgs:
        if cfg.is_file():
            try:
                txt = cfg.read_text(encoding="utf-8", errors="ignore")
                if re.search(r"(?im)^\s*vmIdleTimeout\s*=\s*-1\b", txt):
                    wsl_idle_configured = True
                    break
            except OSError:
                pass

    startup_dir_env = os.environ.get("AIM_WIN_STARTUP_DIR", "").strip()
    if startup_dir_env:
        candidate_vbs = [Path(startup_dir_env) / "aim-wsl-keepalive.vbs"]
    elif win_home_env:
        candidate_vbs = [
            Path(win_home_env) / "AppData" / "Roaming" / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup" / "aim-wsl-keepalive.vbs",
            Path(win_home_env) / "AppData" / "Local" / "AIM-Connect" / "wsl-keepalive.vbs",
        ]
    else:
        candidate_vbs = [
            *(Path(p) for p in glob.glob("/mnt/c/Users/*/AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Startup/aim-wsl-keepalive.vbs")),
            *(Path(p) for p in glob.glob("/mnt/c/Users/*/AppData/Local/AIM-Connect/wsl-keepalive.vbs")),
        ]
    windows_startup_installed = any(v.is_file() for v in candidate_vbs)

    keepalive_proc = subprocess.run(
        ["pgrep", "-f", "aim_wsl_keepalive_sleep|sleep infinity"],
        capture_output=True,
        text=True,
    )
    keepalive_running = keepalive_proc.returncode == 0 and bool(keepalive_proc.stdout.strip())

    xdg_cfg = Path(os.environ.get("XDG_CONFIG_HOME", str(base_home / ".config")))
    unit_file = xdg_cfg / "systemd" / "user" / "aim-connect-boot.service"
    unit_installed = unit_file.is_file()
    always_on_enabled = bool(wsl_idle_configured and (windows_startup_installed or keepalive_running))

    return {
        "is_wsl": is_wsl,
        "wsl_idle_timeout_configured": wsl_idle_configured,
        "windows_startup_installed": windows_startup_installed,
        "wsl_keepalive_running": keepalive_running,
        "wsl_always_on_enabled": always_on_enabled,
        "systemd_boot_unit_installed": unit_installed,
        "cli_enable_cmd": "./scripts/wsl-keepalive.sh on",
        "cli_disable_cmd": "./scripts/wsl-keepalive.sh off",
    }


def execute_host_boot_control(action: str, repo_root: Path, home_dir: str | None = None) -> dict:
    """Toggle Linux systemd cold-boot unit or reversible WSL2 Always-On keepalive safely (#299, #300, #305)."""
    act = (action or "").strip().lower()
    installer = repo_root / "scripts" / "install-headless-boot.sh"
    keepalive_cli = repo_root / "scripts" / "wsl-keepalive.sh"
    env = os.environ.copy()
    if home_dir:
        env["HOME"] = str(home_dir)

    if act == "install_boot_unit":
        res = subprocess.run(["bash", str(installer), "--install"], cwd=str(repo_root), env=env, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(res.stderr.strip() or "Failed to install boot unit")
    elif act == "uninstall_boot_unit":
        res = subprocess.run(["bash", str(installer), "--uninstall"], cwd=str(repo_root), env=env, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(res.stderr.strip() or "Failed to remove boot unit")
    elif act == "enable_wsl_always_on":
        res = subprocess.run(["bash", str(keepalive_cli), "on"], cwd=str(repo_root), env=env, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(res.stderr.strip() or "Failed to enable WSL2 Always-On mode")
    elif act == "disable_wsl_always_on":
        res = subprocess.run(["bash", str(keepalive_cli), "off"], cwd=str(repo_root), env=env, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(res.stderr.strip() or "Failed to revert WSL2 Always-On mode")
    elif act == "start_keepalive":
        subprocess.Popen(
            ["bash", "-c", "pgrep -f 'aim_wsl_keepalive_sleep' >/dev/null 2>&1 || exec -a aim_wsl_keepalive_sleep sleep infinity"],
            start_new_session=True,
        )
    elif act == "stop_keepalive":
        subprocess.run(["pkill", "-f", "aim_wsl_keepalive_sleep"], capture_output=True)
    else:
        raise ValueError(f"Unsupported host action: {action!r}")

    return {"status": "ok", "action": act, "host_status": get_host_boot_and_wsl_status(home_dir=home_dir)}


def resolve_agent_binary(cmd_or_hint: str | None = None, home_dir: str | None = None) -> str:
    """Resolve an AI CLI binary name from a pane command, explicit hint, or saved default_agent."""
    if cmd_or_hint:
        hint_lower = cmd_or_hint.strip().lower()
        if hint_lower == "antigravity":
            return "agy"
        for agent in LAUNCHABLE_AGENTS:
            if agent in hint_lower:
                return agent
        for agent in KNOWN_AI_AGENTS:
            if agent in hint_lower:
                return agent

    prefs = load_tmux_settings(home_dir=home_dir)
    pref_agent = prefs.get("default_agent", "agy")
    if pref_agent in LAUNCHABLE_AGENTS:
        return pref_agent

    base_home = home_dir or os.path.expanduser("~")
    for candidate in ("agy", "grok", "opencode", "codex"):
        if shutil.which(candidate) or os.path.isfile(os.path.join(base_home, ".local", "bin", candidate)):
            return candidate
    return "agy"


def build_agent_launch_command(
    agent: str,
    resume: bool = True,
    skip_permissions: bool | None = None,
    home_dir: str | None = None,
) -> str:
    """Build shell-safe CLI command to launch or fast-resume (-c) an AI agent."""
    normalized = (agent or "").strip().lower()
    if normalized in ("", "none", "shell", "bash"):
        return ""
    if normalized not in LAUNCHABLE_AGENTS:
        raise ValueError(f"Unsupported agent CLI: {agent!r}")

    if skip_permissions is None:
        skip_permissions = bool(load_tmux_settings(home_dir=home_dir).get("skip_permissions", False))

    parts = [normalized]
    if normalized == "agy" and skip_permissions:
        parts.append("--dangerously-skip-permissions")
    if resume:
        parts.append("-c")
    return " ".join(parts)


def get_resurrect_paths(home_dir: str | None = None) -> tuple[Path, Path, Path | None]:
    """Return (save_script, restore_script, last_snapshot_file_or_None)."""
    home = Path(home_dir or os.path.expanduser("~"))
    scripts_dir_env = os.environ.get("AIM_TMUX_RESURRECT_DIR", "").strip()
    scripts_dir = Path(scripts_dir_env) if scripts_dir_env else (home / ".tmux" / "plugins" / "tmux-resurrect" / "scripts")
    save_script = scripts_dir / "save.sh"
    restore_script = scripts_dir / "restore.sh"

    last_env = os.environ.get("AIM_TMUX_RESURRECT_LAST", "").strip()
    if last_env:
        candidates = [Path(last_env)]
    else:
        candidates = [
            home / ".local" / "share" / "tmux" / "resurrect" / "last",
            home / ".tmux" / "resurrect" / "last",
        ]

    resolved_last: Path | None = None
    for candidate in candidates:
        if candidate.exists():
            resolved_last = candidate
            break
    return save_script, restore_script, resolved_last


def get_saved_resurrect_session_count(home_dir: str | None = None) -> tuple[int, float | None]:
    """Count distinct session names in the last tmux-resurrect snapshot (#47)."""
    _, _, last_file = get_resurrect_paths(home_dir=home_dir)
    if last_file is None or not last_file.exists():
        return 0, None
    try:
        sessions: set[str] = set()
        for line in last_file.read_text(encoding="utf-8", errors="ignore").splitlines():
            if line.startswith("pane\t"):
                parts = line.split("\t")
                if len(parts) >= 2 and parts[1] and parts[1] != "aim_restore_tmp":
                    sessions.add(parts[1])
        mtime = last_file.stat().st_mtime
        return len(sessions), mtime
    except Exception:
        return 0, None


def should_warn_before_save(active_count: int, saved_count: int) -> tuple[bool, str]:
    """Empty-Save Guardrail (#47): prevent overwriting a richer snapshot with an empty/low session state."""
    if active_count <= 1:
        if saved_count > active_count:
            return (
                True,
                f"Only {active_count} active session(s) running, while your last backup has {saved_count} sessions. Overwrite saved workspace state?",
            )
        return (
            True,
            f"Only {active_count} active session(s) running. Are you sure you want to overwrite your saved workspace state?",
        )
    if saved_count >= 2 and active_count * 2 <= saved_count:
        return (
            True,
            f"Only {active_count} active sessions running compared to {saved_count} in your last backup. Overwrite saved workspace state?",
        )
    return False, ""


def get_active_tmux_hierarchy() -> dict[str, dict]:
    """Return active tmux sessions -> windows -> panes hierarchy."""
    fmt = "#{session_name}\t#{window_id}\t#{window_active}\t#{pane_id}\t#{pane_current_command}\t#{pane_active}\t#{pane_current_path}"
    try:
        res = subprocess.run(["tmux", "list-panes", "-a", "-F", fmt], capture_output=True, text=True)
    except FileNotFoundError:
        return {}
    if res.returncode != 0:
        return {}

    sessions: dict[str, dict] = {}
    for line in res.stdout.splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) != 7:
            continue
        s_name, w_id, w_active, p_id, p_cmd, p_active, p_path = parts
        if s_name == "aim_restore_tmp":
            continue
        s_entry = sessions.setdefault(s_name, {"windows": {}})
        w_entry = s_entry["windows"].setdefault(
            w_id,
            {"active": w_active == "1", "panes": []},
        )
        w_entry["panes"].append(
            {
                "id": p_id,
                "cmd": p_cmd,
                "active": p_active == "1",
                "path": p_path,
            }
        )
    return sessions


def get_resurrect_status(home_dir: str | None = None) -> dict:
    """Inspect tmux-resurrect installation, snapshot counts, and Empty-Save Guardrail state."""
    save_script, restore_script, _ = get_resurrect_paths(home_dir=home_dir)
    installed = save_script.is_file() and restore_script.is_file()
    active_count = len(get_active_tmux_hierarchy())
    saved_count, last_saved_at = get_saved_resurrect_session_count(home_dir=home_dir)
    prefs = load_tmux_settings(home_dir=home_dir)
    raw_warn, warning_message = should_warn_before_save(active_count, saved_count)
    should_warn = raw_warn and bool(prefs.get("empty_save_guardrail", True))
    return {
        "installed": installed,
        "active_session_count": active_count,
        "saved_session_count": saved_count,
        "last_saved_at": last_saved_at,
        "should_warn": should_warn,
        "warning_message": warning_message if should_warn else "",
    }


def save_tmux_workspace(force: bool = False, home_dir: str | None = None) -> dict:
    """Trigger tmux-resurrect save.sh with configurable Empty-Save Guardrail (#47)."""
    save_script, _, _ = get_resurrect_paths(home_dir=home_dir)
    if not save_script.is_file():
        raise FileNotFoundError("tmux-resurrect not found in ~/.tmux/plugins/tmux-resurrect/")

    active_count = len(get_active_tmux_hierarchy())
    saved_count, last_saved_at = get_saved_resurrect_session_count(home_dir=home_dir)
    prefs = load_tmux_settings(home_dir=home_dir)
    raw_warn, warning_message = should_warn_before_save(active_count, saved_count)
    guard_enabled = bool(prefs.get("empty_save_guardrail", True))

    if raw_warn and guard_enabled and not force:
        return {
            "status": "confirm_required",
            "should_warn": True,
            "warning_message": warning_message,
            "active_session_count": active_count,
            "saved_session_count": saved_count,
            "last_saved_at": last_saved_at,
        }

    subprocess.Popen(["tmux", "run-shell", str(save_script)])
    return {
        "status": "saving",
        "should_warn": False,
        "warning_message": "",
        "active_session_count": active_count,
        "saved_session_count": saved_count,
    }


def restore_tmux_workspace(home_dir: str | None = None, wait_seconds: int = 5) -> dict:
    """Trigger tmux-resurrect restore.sh with cold-boot dead-daemon bootstrap (#37)."""
    _, restore_script, _ = get_resurrect_paths(home_dir=home_dir)
    if not restore_script.is_file():
        raise FileNotFoundError("tmux-resurrect not found in ~/.tmux/plugins/tmux-resurrect/")

    saved_count, last_saved_at = get_saved_resurrect_session_count(home_dir=home_dir)
    server_check = subprocess.run(["tmux", "has-session"], capture_output=True)
    quoted_restore = shlex.quote(str(restore_script))

    if server_check.returncode != 0:
        cmd = (
            f"tmux new-session -d -s aim_restore_tmp && "
            f"tmux set-option -g mouse on && "
            f"tmux run-shell {quoted_restore} && "
            f"sleep {max(0, int(wait_seconds))} && "
            f"tmux kill-session -t aim_restore_tmp"
        )
        subprocess.Popen(["bash", "-c", cmd])
        bootstrapped = True
    else:
        subprocess.Popen(["tmux", "run-shell", str(restore_script)])
        bootstrapped = False

    return {
        "status": "restoring",
        "bootstrapped_daemon": bootstrapped,
        "saved_session_count": saved_count,
        "last_saved_at": last_saved_at,
    }


def fast_resume_session_agent(
    session_name: str,
    requested_agent: str | None = None,
    home_dir: str | None = None,
) -> dict:
    """Resume localized AI agent (-c) in session's active pane or a new persistent shell window (#38, #49)."""
    hierarchy = get_active_tmux_hierarchy()
    if session_name not in hierarchy:
        raise LookupError(f"Tmux session {session_name!r} not found.")

    target_pane = None
    windows = hierarchy[session_name]["windows"]
    for w_data in windows.values():
        if w_data.get("active"):
            for p_data in w_data.get("panes", []):
                if p_data.get("active"):
                    target_pane = p_data
                    break
        if target_pane:
            break

    if target_pane is None:
        for w_data in windows.values():
            panes = w_data.get("panes", [])
            if panes:
                target_pane = panes[0]
                break

    if target_pane is None or not target_pane.get("path"):
        raise RuntimeError(f"Could not resolve active pane working directory for {session_name!r}.")

    pane_id = target_pane["id"]
    pane_cmd = target_pane.get("cmd") or ""
    pane_path = target_pane["path"]
    prefs = load_tmux_settings(home_dir=home_dir)
    hint = requested_agent or (pane_cmd if is_ai_cmd(pane_cmd) else None)
    agent_bin = resolve_agent_binary(hint, home_dir=home_dir)
    resume_flag = bool(prefs.get("auto_resume_c", True))
    skip_perms = bool(prefs.get("skip_permissions", False))
    resume_cmd = build_agent_launch_command(
        agent_bin,
        resume=resume_flag,
        skip_permissions=skip_perms,
        home_dir=home_dir,
    )

    if pane_id and is_idle_shell(pane_cmd):
        subprocess.run(
            ["tmux", "send-keys", "-t", pane_id, resume_cmd, "Enter"],
            check=True,
            capture_output=True,
            text=True,
        )
        mode = "reused-pane"
    else:
        shell_cmd = f"bash -ic '{resume_cmd}; exec bash'"
        subprocess.run(
            [
                "tmux",
                "new-window",
                "-t",
                session_name,
                "-c",
                pane_path,
                "-n",
                f"{agent_bin}-resume",
                shell_cmd,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        mode = "new-window"

    return {
        "status": "resumed",
        "session": session_name,
        "agent": agent_bin,
        "command": resume_cmd,
        "mode": mode,
        "cwd": pane_path,
    }


def discover_git_repos(
    search_roots: list[Path] | None = None,
    home_dir: str | None = None,
    max_depth: int = 2,
) -> list[dict]:
    """Discover local Git repositories up to max_depth and annotate active tmux status (#48)."""
    base_home = Path(home_dir or os.path.expanduser("~"))

    if search_roots is not None:
        roots = [Path(r).expanduser() for r in search_roots]
    else:
        env_roots = os.environ.get("AIM_PROJECT_SEARCH_PATHS", "").strip()
        if env_roots:
            roots = [Path(p).expanduser() for p in env_roots.split(os.pathsep) if p.strip()]
        else:
            roots = [base_home]
            prefs = load_tmux_settings(home_dir=home_dir)
            for item in prefs.get("search_paths", []):
                expanded = Path(str(item)).expanduser()
                if expanded.is_dir() and expanded not in roots:
                    roots.append(expanded)

    seen_paths: set[str] = set()
    discovered: list[dict] = []

    def _scan(current: Path, depth: int) -> None:
        if depth > max_depth:
            return
        try:
            entries = list(os.scandir(current))
        except OSError:
            return

        for entry in entries:
            try:
                if not entry.is_dir(follow_symlinks=False):
                    continue
            except OSError:
                continue

            dname = entry.name
            if dname.startswith(".") or dname in IGNORED_SCAN_DIRS:
                continue
            lower_name = dname.lower()
            if ".bak" in lower_name or "-backup" in lower_name or "_backup" in lower_name:
                continue

            entry_path = Path(entry.path)
            if (entry_path / ".git").exists():
                resolved = str(entry_path.resolve())
                if resolved not in seen_paths:
                    seen_paths.add(resolved)
                    discovered.append(
                        {
                            "name": dname,
                            "session_name": sanitize_session_name(dname),
                            "path": str(entry_path),
                            "resolved_path": resolved,
                        }
                    )
                continue

            if depth < max_depth:
                _scan(entry_path, depth + 1)

    for root in roots:
        if root.is_dir():
            _scan(root, 1)

    hierarchy = get_active_tmux_hierarchy()
    session_by_path: dict[str, str] = {}
    for s_name, s_data in hierarchy.items():
        if s_name == "aim-connect-workspace" or s_name.startswith("agent-"):
            continue
        for w_data in s_data.get("windows", {}).values():
            for p_data in w_data.get("panes", []):
                p_path = p_data.get("path")
                if p_path:
                    session_by_path.setdefault(p_path, s_name)
                    try:
                        session_by_path.setdefault(str(Path(p_path).resolve()), s_name)
                    except OSError:
                        pass

    home_prefix = str(base_home)
    items: list[dict] = []
    for repo in discovered:
        r_name = repo["name"]
        s_name = repo["session_name"]
        r_path = repo["path"]
        resolved_path = repo["resolved_path"]

        matched_session = None
        if r_name in hierarchy:
            matched_session = r_name
        elif s_name in hierarchy:
            matched_session = s_name
        elif r_path in session_by_path:
            matched_session = session_by_path[r_path]
        elif resolved_path in session_by_path:
            matched_session = session_by_path[resolved_path]

        short_path = (
            "~" + r_path[len(home_prefix):]
            if r_path.startswith(home_prefix + os.sep) or r_path == home_prefix
            else r_path
        )
        items.append(
            {
                "name": r_name,
                "session_name": matched_session or s_name,
                "path": r_path,
                "short_path": short_path,
                "active": matched_session is not None,
            }
        )

    items.sort(key=lambda item: (not item["active"], item["name"].lower()))
    return items
