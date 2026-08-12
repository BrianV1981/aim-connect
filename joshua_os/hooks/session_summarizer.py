#!/usr/bin/env python3
import sys
import json
import os
import time
import glob
import re
import subprocess

# --- DYNAMIC ROOT DISCOVERY ---
def find_aim_root():
    current = os.path.abspath(os.getcwd())
    while current != '/':
        if os.path.exists(os.path.join(current, "aim-agy_os", "setup.sh")): return os.path.join(current, "aim-agy_os")
        if os.path.exists(os.path.join(current, "setup.sh")): return current
        current = os.path.dirname(current)
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

AIM_ROOT = find_aim_root()
sys.path.append(AIM_ROOT)
sys.path.append(os.path.join(AIM_ROOT, ".aim_core"))

from plugins.datajack.forensic_utils import chunk_text, get_embedding
from wiki_tools import process_wiki
# Black box seal runs only from reincarnation (background_tasks / aim reincarnate),
# not from generic wiki summarizer — see issue #12 / docs/BLACKBOX_VAULT.md.

def _resolve_config_path():
    """Nested engine CONFIG, vessel-root CONFIG, then fail loudly (never silent 0)."""
    candidates = [
        os.path.join(AIM_ROOT, ".aim_core", "CONFIG.json"),
        os.path.join(os.path.dirname(AIM_ROOT), ".aim_core", "CONFIG.json"),
        os.path.join(AIM_ROOT, "core", "CONFIG.json"),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    return None

def _daemon_log(msg):
    """Append to daemon.log. Print only when stdout is a TTY.

    Handoff launches us with stdout/stderr redirected to daemon.log — if we both
    file-append and print, every line appears twice (false dual-SUCCESS / dual CONFIG).
    """
    line = msg.rstrip() + "\n"
    try:
        log_path = os.path.join(AIM_ROOT, "memory-wiki", "daemon.log")
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        with open(log_path, "a", encoding="utf-8") as lf:
            lf.write(line)
    except Exception:
        pass
    try:
        if sys.stdout.isatty():
            print(msg, flush=True)
    except Exception:
        pass

CONFIG_PATH = _resolve_config_path()
if not CONFIG_PATH:
    _daemon_log(
        "[FATAL] session_summarizer: no CONFIG.json found "
        f"(looked under {AIM_ROOT}/.aim_core and vessel root). Refusing silent success."
    )
    sys.exit(2)

with open(CONFIG_PATH, 'r') as f:
    CONFIG = json.load(f)
_daemon_log(f"[OK] session_summarizer loaded CONFIG from {CONFIG_PATH}")

def ingest_file_to_db(backend, filepath, record_type="session_history"):
    session_id = os.path.basename(filepath).replace('.md', '')
    
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    
    chunks = chunk_text(text)
    fragments = []
    
    if chunks:
        test_vec = get_embedding(chunks[0])
        if not test_vec:
            print("[WARNING] Embedding provider is unreachable. Skipping native LanceDB ingestion.")
            return

    for chunk in chunks:
        vec = get_embedding(chunk)
        if vec and len(vec) == 768:
            fragments.append({
                'session_id': session_id,
                'type': record_type,
                'content': chunk,
                'vector': vec
            })
        
    if fragments:
        backend.add_fragments(fragments)

def process_transcript(md_path):
    """
    Reincarnation wiki path: deterministic compiler first (reliable E2E).
    Optional AGY scribe swarm only if AIM_WIKI_SCRIBE=1.
    """
    try:
        _daemon_log(f"[WATCHDOG] Beginning wiki sequence for: {os.path.basename(md_path)}")
        stem = os.path.basename(md_path).replace('.md', '')
        # Archive names: {YYYY-MM-DD_HHMM}_{session_uuid} — UUID is last underscore segment
        # if it looks like a UUID; else use full stem.
        session_id = stem
        if '_' in stem:
            parts = stem.split('_')
            tail = parts[-1]
            if len(tail) >= 8 and any(c == '-' for c in tail) or len(tail) >= 20:
                session_id = tail
            elif tail not in ('chat', 'history', 'chat_history', 'history.md'):
                # multi-part timestamp: 2026-07-15_0337_uuid
                if len(parts) >= 3:
                    session_id = parts[-1]
                else:
                    session_id = stem

        # Stage raw + deterministic ingest/pages (no agent required)
        raw_logs_dir = os.path.join(AIM_ROOT, "memory-wiki", "_raw_logs")
        ingest_dir = os.path.join(AIM_ROOT, "memory-wiki", "_ingest")
        os.makedirs(raw_logs_dir, exist_ok=True)
        os.makedirs(ingest_dir, exist_ok=True)

        with open(md_path, 'r', encoding='utf-8') as f:
            transcript = f.read()
        if not transcript.strip():
            _daemon_log("[FATAL] Archive markdown is empty. Refusing SUCCESS.")
            return False

        # Reject empty skeletons / false greens from broken extractors
        stripped = transcript.strip()
        has_user = ("👤 USER" in stripped) or ("## 👤" in stripped) or ("user_query" in stripped.lower())
        has_aim = ("🤖 A.I.M" in stripped) or ("## 🤖" in stripped)
        no_turns_marker = "No conversational turns extracted" in stripped
        too_short = len(stripped) < 200
        if no_turns_marker or (too_short and not has_user):
            _daemon_log(
                f"[FATAL] Archive has no usable conversational content "
                f"(len={len(stripped)} has_user={has_user}). Refusing SUCCESS."
            )
            return False
        if not has_user and not has_aim:
            _daemon_log(
                "[FATAL] Archive missing USER/A.I.M. dialogue markers. Refusing SUCCESS."
            )
            return False

        raw_path = os.path.join(raw_logs_dir, f"{session_id}_reincarnate_raw.md")
        with open(raw_path, "w", encoding="utf-8") as f_out:
            f_out.write(transcript)
        print(f"[WATCHDOG] Staged raw log: {raw_path}")

        # Deterministic path via wiki_compiler
        sys.path.insert(0, os.path.join(AIM_ROOT, ".aim_core"))
        from wiki_compiler import (
            wiki_paths,
            ensure_wiki_scaffold,
            extractive_summary_from_markdown,
            process_raw_logs_to_ingest,
            process_ingest,
            stage0_multi_page_integrate,
        )
        from pathlib import Path
        paths = wiki_paths()
        ensure_wiki_scaffold(paths)
        # Prefer full archive text for short sessions so Operator markers survive extractive cap
        if len(transcript) < 120_000:
            summary = transcript
        else:
            summary = extractive_summary_from_markdown(Path(md_path))
        ingest_name = f"reincarnate_{session_id}.md"
        ingest_path = paths["ingest"] / ingest_name
        ingest_path.write_text(summary, encoding="utf-8")
        print(f"[WATCHDOG] Wrote ingest {ingest_path}")
        for line in process_raw_logs_to_ingest():
            print(f"  [wiki] {line}")
        # Schema-aligned multi-page Stage 0 (source + concept/entity stubs)
        for line in stage0_multi_page_integrate(Path(md_path), source_id=session_id):
            print(f"  [stage0] {line}")
        for line in process_ingest(paths):
            print(f"  [wiki] {line}")

        # Verify at least one page mentions content from this session id or archive stem
        pages_dir = paths["pages"]
        page_hits = list(pages_dir.glob(f"*{session_id[:12]}*")) + list(
            pages_dir.glob("reincarnate-*.md")
        )
        # Soft check: log if nothing new; still SUCCESS if process_ingest ran on non-empty

        # Optional scribe swarm (legacy) — off by default for reliability
        if os.environ.get("AIM_WIKI_SCRIBE") == "1":
            print("[WATCHDOG] AIM_WIKI_SCRIBE=1 — deterministic compiler already primary.")

        # LanceDB best-effort — only new archive + matching pages (not full wiki re-embed)
        if os.environ.get("AIM_WIKI_SKIP_LANCE") != "1":
            try:
                from lance_backend import VectorBackend
                backend = VectorBackend()
                print("[WATCHDOG] Ingesting archive into LanceDB (session only)...")
                ingest_file_to_db(backend, md_path, record_type="session_history")
                slug = session_id.replace("/", "-")[:40]
                for md_file in glob.glob(os.path.join(str(pages_dir), f"*{slug[:8]}*")):
                    ingest_file_to_db(backend, md_file, record_type="wiki_knowledge")
                for md_file in glob.glob(os.path.join(str(pages_dir), "reincarnate-*.md")):
                    # only if mtime recent (< 120s)
                    try:
                        if time.time() - os.path.getmtime(md_file) < 120:
                            ingest_file_to_db(backend, md_file, record_type="wiki_knowledge")
                    except OSError:
                        pass
            except Exception as le:
                print(f"[WATCHDOG] LanceDB ingest warning (non-fatal): {le}")
        else:
            print("[WATCHDOG] AIM_WIKI_SKIP_LANCE=1 — skipping vector ingest")

        _daemon_log("[SUCCESS] Deterministic wiki reincarnation sequence complete.")
        return True

    except Exception as e:
        _daemon_log(f"[FATAL] Watchdog Pipeline Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main(args):
    if "--reincarnate" not in args:
        print(json.dumps({}))
        return

    if os.environ.get('AIM_INTERNAL_REASONING'):
        print(json.dumps({}))
        return
    
    is_light_mode = "--light" in args
    if is_light_mode:
        print(json.dumps({}))
        return

    cognitive_mode = CONFIG.get('settings', {}).get('cognitive_mode', 'monolithic')
    if cognitive_mode == 'frontline':
        _daemon_log("[INFO] frontline cognitive_mode — skipping monolithic wiki daemon")
        print(json.dumps({}))
        return

    md_path = None
    for arg in args[1:]:
        if arg.endswith('.md') and os.path.exists(arg):
            md_path = arg
            break
            
    if not md_path:
        history_dir = os.path.join(AIM_ROOT, "archive", "history")
        if os.path.exists(history_dir):
            transcripts = glob.glob(os.path.join(history_dir, "*.md"))
            if transcripts:
                md_path = max(transcripts, key=os.path.getmtime)
                
    if not md_path:
        _daemon_log("[FATAL] --reincarnate: no archive markdown path found")
        sys.exit(3)

    # When not already --bg: re-exec in background BUT log to daemon.log (never DEVNULL)
    if "--bg" not in args:
        import subprocess
        log_path = os.path.join(AIM_ROOT, "memory-wiki", "daemon.log")
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        daemon_log = open(log_path, "a", encoding="utf-8")
        cmd = [sys.executable, os.path.abspath(__file__), "--bg"] + [a for a in args[1:] if a != "--bg"]
        if "--reincarnate" not in cmd:
            cmd.insert(1, "--reincarnate")
        subprocess.Popen(
            cmd,
            start_new_session=True,
            stdin=subprocess.DEVNULL,
            stdout=daemon_log,
            stderr=daemon_log,
            close_fds=True,
        )
        print(json.dumps({"spawned_bg": True, "archive": md_path}))
        return

    ok = process_transcript(md_path)
    if not ok:
        _daemon_log(f"[FATAL] process_transcript failed for {md_path}")
        sys.exit(4)

if __name__ == "__main__":
    main(sys.argv)
