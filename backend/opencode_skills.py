"""OpenCode SKILL.md vs /slash-command wrapper discovery, sync, dispatch translation, and bwrap mounts (#323)."""

from __future__ import annotations

import os
import re
import subprocess as _subprocess
from pathlib import Path

SAFE_SKILL_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$")
SLASH_INVOCATION_RE = re.compile(r"^/([A-Za-z0-9][A-Za-z0-9_.:-]{0,63})(?:\s+(.*))?$", re.S)

OPENCODE_BUILTINS: frozenset[str] = frozenset(
    {
        "new",
        "compact",
        "models",
        "model",
        "sessions",
        "session",
        "undo",
        "redo",
        "review",
        "init",
        "themes",
        "theme",
        "help",
        "status",
        "clear",
        "share",
        "unshare",
        "rename",
        "connect",
        "editor",
        "export",
        "exit",
        "quit",
    }
)


def extract_frontmatter_description(md_path: str | Path, fallback: str = "") -> str:
    """Extract single-line YAML frontmatter description from a SKILL.md or command .md file."""
    try:
        head = Path(md_path).read_text(encoding="utf-8", errors="ignore")[:3072]
    except OSError:
        return fallback

    lines = head.splitlines()
    if not lines or lines[0].strip() != "---":
        return fallback

    fm_lines: list[str] = []
    for ln in lines[1:]:
        if ln.strip() == "---":
            break
        fm_lines.append(ln)

    in_block = False
    parts: list[str] = []
    raw_desc = ""
    for ln in fm_lines:
        stripped = ln.strip()
        if in_block:
            if ln.startswith((" ", "\t")) and stripped:
                parts.append(stripped)
                continue
            break
        if ln.lower().startswith("description:"):
            val = ln.split(":", 1)[1].strip()
            if val in (">", "|", ">-", "|-"):
                in_block = True
            else:
                raw_desc = val.strip("'\"")
                break

    if parts:
        raw_desc = " ".join(parts)
    cleaned = re.sub(r"\s+", " ", raw_desc).strip()
    if not cleaned:
        return fallback
    if len(cleaned) > 140:
        cleaned = cleaned[:137].rstrip() + "..."
    return cleaned


def _yaml_double_quote(val: str) -> str:
    escaped = val.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def _write_if_changed(path: Path, content: str) -> bool:
    """Write `content` only when missing or modified so unchanged command wrappers keep their mtime."""
    if path.is_file():
        try:
            if path.read_text(encoding="utf-8") == content:
                return False
        except OSError:
            pass
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")
    return True


def sync_opencode_command_wrappers(home_dir: str) -> dict:
    """Idempotently sync ~/.config/opencode/commands/*.md wrappers from installed OpenCode SKILL.md roots (#323)."""
    home = Path(home_dir)
    skill_roots = [
        home / ".config" / "opencode" / "skills",
        home / ".opencode" / "skills",
    ]
    existing_roots = [r for r in skill_roots if r.is_dir()]
    commands_dir = home / ".config" / "opencode" / "commands"
    if not existing_roots:
        return {"commands_dir": str(commands_dir), "discovered": 0, "written": 0}

    discovered: dict[str, Path] = {}
    for root in existing_roots:
        try:
            entries = sorted(root.iterdir(), key=lambda p: p.name.lower())
        except OSError:
            continue
        for entry in entries:
            if not entry.is_dir():
                continue
            sid = entry.name
            if not SAFE_SKILL_ID_RE.match(sid) or sid in discovered:
                continue
            skill_md = entry / "SKILL.md"
            if skill_md.is_file():
                discovered[sid] = skill_md

    if not discovered:
        return {"commands_dir": str(commands_dir), "discovered": 0, "written": 0}

    written = 0
    for sid, skill_md in sorted(discovered.items()):
        desc = extract_frontmatter_description(skill_md, f"Load and execute the {sid} skill")
        body = (
            "---\n"
            f"description: {_yaml_double_quote(desc)}\n"
            "---\n"
            f"Use the `{sid}` skill via the `skill` tool and follow its instructions. $ARGUMENTS\n"
        )
        if _write_if_changed(commands_dir / f"{sid}.md", body):
            written += 1

    generic_body = (
        "---\n"
        'description: "Load and run an installed A.I.M. skill by ID (e.g. /aim aim-handoff)"\n'
        "---\n"
        "The user invoked `/aim` with: $ARGUMENTS\n"
        "Treat the first token as the skill ID, load that skill via the `skill` tool, "
        "and follow its instructions for the remaining request.\n"
    )
    if _write_if_changed(commands_dir / "aim.md", generic_body):
        written += 1

    return {"commands_dir": str(commands_dir), "discovered": len(discovered), "written": written}


def _opencode_command_dirs(home_dir: str, cwd_path: str = "") -> list[Path]:
    dirs: list[Path] = []
    if cwd_path and os.path.isdir(cwd_path):
        cwd = Path(cwd_path)
        dirs.extend([cwd / ".opencode" / "commands", cwd / ".opencode" / "command"])
    home = Path(home_dir)
    dirs.extend([home / ".config" / "opencode" / "commands", home / ".config" / "opencode" / "command"])
    return [d for d in dirs if d.is_dir()]


def discover_opencode_custom_commands(home_dir: str, cwd_path: str = "") -> list[dict[str, str]]:
    """Return custom OpenCode slash commands from .opencode/commands/*.md and ~/.config/opencode/commands/*.md."""
    results: list[dict[str, str]] = []
    seen: set[str] = set()
    for cmd_dir in _opencode_command_dirs(home_dir, cwd_path):
        try:
            files = sorted(cmd_dir.glob("*.md"), key=lambda p: p.name.lower())
        except OSError:
            continue
        for md_file in files:
            if not md_file.is_file():
                continue
            stem = md_file.stem
            if not SAFE_SKILL_ID_RE.match(stem):
                continue
            key = stem.lower()
            if key in seen:
                continue
            seen.add(key)
            desc = extract_frontmatter_description(md_file, f"OpenCode /{stem} command")
            results.append(
                {
                    "cmd": f"/{stem}",
                    "kind": "command",
                    "description": desc,
                    "source": cmd_dir.name,
                }
            )
    return results


def find_opencode_command_wrapper(skill_id: str, *, home_dir: str, cwd_path: str = "") -> Path | None:
    clean = (skill_id or "").strip().lstrip("/")
    if not SAFE_SKILL_ID_RE.match(clean):
        return None
    for cmd_dir in _opencode_command_dirs(home_dir, cwd_path):
        cand = cmd_dir / f"{clean}.md"
        if cand.is_file():
            return cand
    return None


def _opencode_skill_exists(skill_id: str, *, home_dir: str, cwd_path: str = "") -> bool:
    clean = (skill_id or "").strip().lstrip("/")
    if not SAFE_SKILL_ID_RE.match(clean):
        return False
    roots: list[Path] = []
    if cwd_path and os.path.isdir(cwd_path):
        cwd = Path(cwd_path)
        roots.extend([cwd / ".opencode" / "skills", cwd / ".agents" / "skills"])
    home = Path(home_dir)
    roots.extend(
        [
            home / ".config" / "opencode" / "skills",
            home / ".opencode" / "skills",
            home / ".agents" / "skills",
        ]
    )
    return any((r / clean / "SKILL.md").is_file() for r in roots)


def has_loaded_opencode_command_wrapper(
    skill_id: str,
    *,
    home_dir: str,
    cwd_path: str = "",
    proc_start_ts: float | None = None,
) -> bool:
    wrapper = find_opencode_command_wrapper(skill_id, home_dir=home_dir, cwd_path=cwd_path)
    if wrapper is None:
        return False
    if proc_start_ts is not None and proc_start_ts > 0:
        try:
            if wrapper.stat().st_mtime > proc_start_ts + 1.0:
                return False
        except OSError:
            return False
    return True


def translate_opencode_skill_slash(
    text: str,
    *,
    vessel: str,
    home_dir: str,
    cwd_path: str = "",
    proc_start_ts: float | None = None,
) -> str:
    """Translate `/<skill-id> [args]` into an OpenCode skill-tool prompt when no active command wrapper is loaded (#323)."""
    v = (vessel or "").strip().lower()
    if v not in ("opencode", "oc"):
        return text

    stripped = (text or "").strip()
    m = SLASH_INVOCATION_RE.match(stripped)
    if not m:
        return text

    token = m.group(1)
    rest = (m.group(2) or "").strip()
    if token.lower() in OPENCODE_BUILTINS:
        return text

    if has_loaded_opencode_command_wrapper(
        token,
        home_dir=home_dir,
        cwd_path=cwd_path,
        proc_start_ts=proc_start_ts,
    ):
        return text

    if _opencode_skill_exists(token, home_dir=home_dir, cwd_path=cwd_path) or token.lower().startswith("aim-"):
        prompt = f'Use the "{token}" skill via the skill tool and follow its instructions.'
        if rest:
            prompt = f"{prompt} {rest}"
        return prompt

    return text


def get_linux_process_start_epoch(pid: int) -> float | None:
    """Return Unix epoch start timestamp for `pid` on Linux via /proc, or None."""
    if pid <= 0:
        return None
    try:
        btime = None
        with open("/proc/stat", "r", encoding="utf-8", errors="ignore") as fh:
            for ln in fh:
                if ln.startswith("btime "):
                    btime = float(ln.split()[1])
                    break
        if btime is None:
            return None
        stat_raw = Path(f"/proc/{pid}/stat").read_text(encoding="utf-8", errors="ignore")
        after_comm = stat_raw.rsplit(")", 1)[1].split()
        start_ticks = float(after_comm[19])
        clk_tck = float(os.sysconf("SC_CLK_TCK"))
        return btime + (start_ticks / clk_tck)
    except Exception:
        return None


def inspect_tmux_pane_context(session_target: str) -> tuple[str, str, float | None]:
    """Return (detected_vessel, pane_cwd, proc_start_ts) for a tmux session target."""
    clean_target = (session_target or "").strip().lstrip("=").rstrip(":")
    if not clean_target:
        return "", "", None
    try:
        res = _subprocess.run(
            [
                "tmux",
                "list-panes",
                "-t",
                clean_target,
                "-F",
                "#{pane_active}\t#{pane_current_command}\t#{pane_current_path}\t#{pane_pid}",
            ],
            capture_output=True,
            text=True,
            timeout=1.5,
        )
    except Exception:
        return "", "", None
    if res.returncode != 0 or not res.stdout.strip():
        return "", "", None

    chosen = None
    for ln in res.stdout.splitlines():
        parts = ln.split("\t")
        if len(parts) >= 4:
            if parts[0] == "1" or chosen is None:
                chosen = parts
                if parts[0] == "1":
                    break
    if not chosen:
        return "", "", None

    cmd_low = chosen[1].strip().lower()
    cwd = chosen[2].strip()
    try:
        pid = int(chosen[3].strip())
    except ValueError:
        pid = 0
    vessel = "opencode" if "opencode" in cmd_low else cmd_low
    return vessel, cwd, get_linux_process_start_epoch(pid)


def build_opencode_bwrap_skill_binds(home_dir: str, oc_cfg_dir: str) -> str:
    """Mount host ~/.config/opencode/{skills,commands} read-only underneath sandboxed oc_cfg_dir (#323)."""
    flags: list[str] = []
    for sub in ("skills", "commands"):
        host_sub = os.path.join(home_dir, ".config", "opencode", sub)
        if os.path.isdir(host_sub):
            os.makedirs(os.path.join(oc_cfg_dir, sub), exist_ok=True)
            flags.append(f"--ro-bind {host_sub} {home_dir}/.config/opencode/{sub} ")
    return "".join(flags)
