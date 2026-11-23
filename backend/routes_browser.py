import asyncio
import base64
import hashlib
import json
import logging
import os
import re
import shutil
import struct
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

import websockets
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from pydantic import BaseModel

from main import (
    HOME_DIR,
    _get_user_from_token,
    is_token_valid,
    require_admin,
    touch_api_token,
    verify_token,
)

router = APIRouter()
logger = logging.getLogger("aim-connect")

CDP_LOOPBACK_HOST = "127.0.0.1"
TARGET_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,128}$")
LEASE_NAME_RE = re.compile(r"^[A-Za-z0-9._:-]{1,64}$")
FAVORITE_ID_RE = re.compile(r"^[a-f0-9]{12}$")
MAX_FAVORITES = 50
CLOSED_TARGET_TOMBSTONE_TTL_S = 4.0
HUD_STALE_TTL_S = 6.0

# Track live screencast bridges so DELETE /api/browser/tabs/{id} can detach DevTools
# before calling /json/close/{id}, and tombstone closed IDs against /json/list races (#249).
_ACTIVE_BROWSER_BRIDGES: set["_CdpPageBridge"] = set()
_RECENTLY_CLOSED_TARGETS: dict[str, float] = {}
_KNOWN_TAB_ORDER: list[str] = []


def _clamp_viewport_dim(val: Any, default: int, low: int = 320, high: int = 2560) -> int:
    try:
        parsed = int(float(val))
    except (TypeError, ValueError):
        return default
    return max(low, min(high, parsed))


def _prune_closed_tombstones() -> set[str]:
    now = time.monotonic()
    expired = [tid for tid, ts in _RECENTLY_CLOSED_TARGETS.items() if now - ts > CLOSED_TARGET_TOMBSTONE_TTL_S]
    for tid in expired:
        _RECENTLY_CLOSED_TARGETS.pop(tid, None)
    return set(_RECENTLY_CLOSED_TARGETS.keys())


def _get_cdp_port() -> int:
    raw = os.environ.get("AIM_BROWSER_CDP_PORT") or os.environ.get("CDP_PORT") or "9222"
    try:
        port = int(str(raw).strip())
    except ValueError:
        port = 9222
    return max(1024, min(65535, port))


def _get_state_dir() -> str:
    custom = (os.environ.get("AIM_BROWSER_STATE_DIR") or "").strip()
    path = os.path.abspath(custom) if custom else os.path.join(HOME_DIR, ".cache", "aim-browser")
    os.makedirs(path, exist_ok=True)
    return path


def _get_profile_dir() -> str:
    custom = (os.environ.get("CDP_PROFILE_DIR") or "").strip()
    path = os.path.abspath(custom) if custom else os.path.join(HOME_DIR, ".cache", "aim-browser-profile")
    os.makedirs(path, exist_ok=True)
    return path


def _get_shots_dir() -> str:
    custom = (os.environ.get("AIM_SHOTS_DIR") or "").strip()
    path = os.path.abspath(custom) if custom else os.path.join(HOME_DIR, ".cache", "aim-connect", "shots")
    os.makedirs(path, exist_ok=True)
    return path


def _get_downloads_dir() -> str:
    custom = (os.environ.get("AIM_BROWSER_DOWNLOAD_DIR") or "").strip()
    path = os.path.abspath(custom) if custom else os.path.join(HOME_DIR, "Downloads", "aim-browser")
    os.makedirs(path, exist_ok=True)
    return path


def _extract_png_dims(png_bytes: bytes) -> tuple[int, int]:
    if len(png_bytes) >= 24 and png_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        try:
            w, h = struct.unpack(">II", png_bytes[16:24])
            if w > 0 and h > 0:
                return int(w), int(h)
        except struct.error:
            pass
    return 1280, 800


def _format_file_size(num_bytes: int) -> str:
    if num_bytes >= 1024 * 1024:
        return f"{num_bytes / (1024 * 1024):.1f} MB"
    if num_bytes >= 1024:
        return f"{round(num_bytes / 1024)} KB"
    return f"{num_bytes} B"


def _read_json_file(path: str, default: Any) -> Any:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def _write_json_atomic(path: str, payload: Any) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp_path = f"{path}.{os.getpid()}.{int(time.time() * 1000)}.tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    try:
        os.chmod(tmp_path, 0o600)
    except OSError:
        pass
    os.replace(tmp_path, path)


def _read_leases() -> dict[str, dict]:
    raw = _read_json_file(os.path.join(_get_state_dir(), "leases.json"), {})
    return raw if isinstance(raw, dict) else {}


def _write_leases(leases: dict[str, dict]) -> None:
    _write_json_atomic(os.path.join(_get_state_dir(), "leases.json"), leases)


def _read_hud(max_age_s: float = HUD_STALE_TTL_S) -> dict | None:
    hud_path = os.path.join(_get_state_dir(), "hud.json")
    raw = _read_json_file(hud_path, None)
    if not isinstance(raw, dict):
        return None
    now_s = time.time()
    ts_val = raw.get("ts")
    if isinstance(ts_val, (int, float)) and ts_val > 0:
        if (now_s * 1000.0 - float(ts_val)) > max_age_s * 1000.0:
            return None
    else:
        try:
            if (now_s - os.stat(hud_path).st_mtime) > max_age_s:
                return None
        except OSError:
            return None
    return raw


def _favorite_id_for_url(url: str) -> str:
    return hashlib.sha1(url.strip().encode("utf-8")).hexdigest()[:12]


def _default_favorite_title(url: str, raw_title: str = "") -> str:
    cleaned = (raw_title or "").strip()
    if cleaned and cleaned.lower() not in ("(untitled)", "about:blank", "new tab"):
        return cleaned[:80]
    parsed = urllib.parse.urlparse(url)
    host = (parsed.netloc or url).replace("www.", "")
    path = parsed.path.rstrip("/")
    label = f"{host}{path}" if path else host
    return (label or url)[:80]


def _read_favorites() -> list[dict]:
    raw = _read_json_file(os.path.join(_get_state_dir(), "favorites.json"), [])
    if not isinstance(raw, list):
        return []
    return [f for f in raw if isinstance(f, dict) and f.get("id") and f.get("url")]


def _write_favorites(favorites: list[dict]) -> None:
    _write_json_atomic(os.path.join(_get_state_dir(), "favorites.json"), favorites[:MAX_FAVORITES])


def _normalize_nav_url(raw_url: str) -> str:
    u = (raw_url or "").strip()
    if not u:
        return "about:blank"
    bad_scheme = re.match(r"^(javascript|vbscript|file|data):", u, re.IGNORECASE)
    if bad_scheme:
        raise ValueError(f"Disallowed URL scheme: {bad_scheme.group(1)}")
    if u in ("about:blank", "chrome://version") or "://" in u:
        parsed = urllib.parse.urlparse(u)
        if parsed.scheme.lower() not in ("http", "https", "about", "chrome"):
            raise ValueError(f"Disallowed URL scheme: {parsed.scheme}")
        return u
    if u.startswith(("localhost", "127.0.0.1", "[::1]")):
        return f"http://{u}"
    return f"https://{u}"


def _validate_cdp_ws_url(ws_url: str, expected_port: int) -> str:
    """Enforce strict loopback anti-SSRF invariant on upstream CDP debugger URLs."""
    parsed = urllib.parse.urlparse(ws_url or "")
    if parsed.scheme != "ws":
        raise ValueError("CDP WebSocket URL must use ws:// scheme")
    if parsed.hostname not in ("127.0.0.1", "localhost"):
        raise ValueError("CDP WebSocket host must be loopback")
    if parsed.port != expected_port:
        raise ValueError(f"CDP WebSocket port mismatch ({parsed.port} != {expected_port})")
    if not parsed.path.startswith("/devtools/page/"):
        raise ValueError("CDP WebSocket path must start with /devtools/page/")
    return f"ws://{CDP_LOOPBACK_HOST}:{expected_port}{parsed.path}"


def _cdp_http_text_sync(path: str, method: str = "GET", timeout: float = 2.0) -> str:
    port = _get_cdp_port()
    url = f"http://{CDP_LOOPBACK_HOST}:{port}{path}"
    req = urllib.request.Request(url, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def _cdp_http_json_sync(path: str, method: str = "GET", timeout: float = 2.0) -> Any:
    raw = _cdp_http_text_sync(path, method=method, timeout=timeout)
    return json.loads(raw) if raw.strip() else {}


async def _cdp_http_text(path: str, method: str = "GET", timeout: float = 2.0) -> str:
    return await asyncio.to_thread(_cdp_http_text_sync, path, method, timeout)


async def _cdp_http_json(path: str, method: str = "GET", timeout: float = 2.0) -> Any:
    return await asyncio.to_thread(_cdp_http_json_sync, path, method, timeout)


def _merge_tabs_with_leases(raw_targets: list[dict]) -> list[dict]:
    closed_ids = _prune_closed_tombstones()
    pages = [
        t
        for t in (raw_targets or [])
        if isinstance(t, dict) and t.get("type") == "page" and t.get("id") not in closed_ids
    ]
    live_by_id = {p.get("id"): p for p in pages if p.get("id")}
    live_ids = set(live_by_id.keys())

    # Preserve stable creation order across Page.bringToFront MRU shuffles (#251)
    _KNOWN_TAB_ORDER[:] = [tid for tid in _KNOWN_TAB_ORDER if tid in live_ids]
    for p in pages:
        tid = p.get("id")
        if tid and tid not in _KNOWN_TAB_ORDER:
            _KNOWN_TAB_ORDER.append(tid)
    ordered_pages = [live_by_id[tid] for tid in _KNOWN_TAB_ORDER if tid in live_by_id]

    leases = _read_leases()

    # Prune stale leases whose tabs were closed
    pruned = {k: v for k, v in leases.items() if isinstance(v, dict) and v.get("targetId") in live_ids}
    if len(pruned) != len(leases):
        _write_leases(pruned)
        leases = pruned

    lease_by_target: dict[str, dict] = {}
    for lease_name, meta in leases.items():
        tid = meta.get("targetId")
        if tid:
            lease_by_target[tid] = {
                "lease": lease_name,
                "actor": meta.get("actor") or lease_name,
                "session": meta.get("session") or "",
                "updatedAt": int(meta.get("updatedAt") or 0),
            }

    enriched = []
    for idx, p in enumerate(ordered_pages):
        tid = p.get("id", "")
        lmeta = lease_by_target.get(tid, {})
        enriched.append(
            {
                "index": idx,
                "id": tid,
                "title": p.get("title") or "(untitled)",
                "url": p.get("url") or "about:blank",
                "lease": lmeta.get("lease", ""),
                "actor": lmeta.get("actor", ""),
                "session": lmeta.get("session", ""),
                "updatedAt": lmeta.get("updatedAt", 0),
                "webSocketDebuggerUrl": p.get("webSocketDebuggerUrl", ""),
            }
        )
    return enriched


async def _collect_browser_status() -> dict:
    port = _get_cdp_port()
    hud = _read_hud()
    favorites = _read_favorites()
    try:
        version_info = await _cdp_http_json("/json/version", timeout=1.5)
        targets = await _cdp_http_json("/json/list", timeout=1.5)
        tabs = _merge_tabs_with_leases(targets if isinstance(targets, list) else [])
        return {
            "running": True,
            "cdp_port": port,
            "browser": version_info.get("Browser", "Chromium"),
            "tabs": tabs,
            "favorites": favorites,
            "hud": hud,
        }
    except Exception:
        return {
            "running": False,
            "cdp_port": port,
            "browser": "",
            "tabs": [],
            "favorites": favorites,
            "hud": hud,
        }


def _find_browser_binary() -> str | None:
    env_bin = (os.environ.get("BROWSER_BIN") or "").strip()
    if env_bin and (os.path.isfile(env_bin) or shutil.which(env_bin)):
        return env_bin
    for candidate in ("chromium", "chromium-browser", "google-chrome", "google-chrome-stable", "chrome"):
        resolved = shutil.which(candidate)
        if resolved:
            return resolved
    return None


class BrowserStartRequest(BaseModel):
    mode: str = "auto"  # auto | headless | headed
    url: str = "about:blank"


class OpenTabRequest(BaseModel):
    url: str = "about:blank"
    lease: str = ""
    actor: str = ""
    session: str = ""


class FavoriteRequest(BaseModel):
    url: str
    title: str = ""


@router.get("/api/browser/favorites", dependencies=[Depends(verify_token), Depends(require_admin)])
async def list_browser_favorites():
    """Return server-persisted browser favorites (#250)."""
    return {"favorites": _read_favorites()}


@router.post("/api/browser/favorites", dependencies=[Depends(verify_token), Depends(require_admin)])
async def save_browser_favorite(req: FavoriteRequest):
    """Upsert a browser favorite in 0600 favorites.json (#250)."""
    try:
        clean_url = _normalize_nav_url(req.url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if clean_url == "about:blank":
        raise HTTPException(status_code=400, detail="Cannot bookmark about:blank")

    fav_id = _favorite_id_for_url(clean_url)
    entry = {
        "id": fav_id,
        "title": _default_favorite_title(clean_url, req.title),
        "url": clean_url,
        "createdAt": int(time.time() * 1000),
    }
    existing = _read_favorites()
    replaced = False
    updated: list[dict] = []
    for item in existing:
        if item.get("id") == fav_id:
            updated.append({**item, "title": entry["title"], "url": clean_url})
            replaced = True
        else:
            updated.append(item)
    if not replaced:
        updated.append(entry)
    _write_favorites(updated)
    saved = next((f for f in updated if f["id"] == fav_id), entry)
    return {"favorite": saved, "favorites": updated[:MAX_FAVORITES]}


@router.delete("/api/browser/favorites/{fav_id}", dependencies=[Depends(verify_token), Depends(require_admin)])
async def delete_browser_favorite(fav_id: str):
    """Delete a saved browser favorite by id (#250)."""
    if not FAVORITE_ID_RE.match(fav_id or ""):
        raise HTTPException(status_code=400, detail="Invalid favorite id")
    existing = _read_favorites()
    filtered = [f for f in existing if f.get("id") != fav_id]
    if len(filtered) != len(existing):
        _write_favorites(filtered)
    return {"deleted": fav_id, "favorites": filtered}


@router.get("/api/browser/status", dependencies=[Depends(verify_token), Depends(require_admin)])
async def get_browser_status():
    """Return loopback CDP daemon status, leased tabs, and latest agent HUD state (#240)."""
    return await _collect_browser_status()


@router.post("/api/browser/start", dependencies=[Depends(verify_token), Depends(require_admin)])
async def start_browser_daemon(req: BrowserStartRequest | None = None):
    """Idempotently start local loopback Chromium CDP daemon on 127.0.0.1 (#240)."""
    body = req or BrowserStartRequest()
    try:
        initial_url = _normalize_nav_url(body.url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    current = await _collect_browser_status()
    if current["running"]:
        return {**current, "started": False}

    binary = _find_browser_binary()
    if not binary:
        raise HTTPException(
            status_code=503,
            detail="No Chromium/Chrome binary found on host. Install chromium or set BROWSER_BIN.",
        )

    port = _get_cdp_port()
    profile_dir = _get_profile_dir()
    # Default mode="auto" to --headless=new so Chromium never pops onto the Operator's WSL2/Linux desktop (#258)
    use_headless = body.mode != "headed"

    args = [
        binary,
        "--disable-dev-shm-usage",
        f"--remote-debugging-address={CDP_LOOPBACK_HOST}",
        f"--remote-debugging-port={port}",
        f"--user-data-dir={profile_dir}",
        "--no-first-run",
        "--no-default-browser-check",
        "--window-size=1280,800",
    ]
    if use_headless:
        args.append("--headless=new")
    else:
        args.append("--start-minimized")
    args.append(initial_url)

    proc = subprocess.Popen(
        args,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    pid_file = os.path.join(profile_dir, ".aim-browser-cdp.pid")
    try:
        with open(pid_file, "w", encoding="utf-8") as f:
            f.write(str(proc.pid))
    except OSError:
        pass

    for _ in range(25):
        status = await _collect_browser_status()
        if status["running"]:
            return {**status, "started": True, "headless": use_headless}
        await asyncio.sleep(0.3)

    raise HTTPException(status_code=504, detail=f"Chromium CDP did not start on {CDP_LOOPBACK_HOST}:{port}")


@router.post("/api/browser/tabs", dependencies=[Depends(verify_token), Depends(require_admin)])
async def open_browser_tab(req: OpenTabRequest):
    """Open a new CDP page tab and optionally bind a named lease (#240)."""
    try:
        clean_url = _normalize_nav_url(req.url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    lease = (req.lease or "").strip()
    if lease and not LEASE_NAME_RE.match(lease):
        raise HTTPException(status_code=400, detail="Invalid lease name")

    encoded = urllib.parse.quote(clean_url, safe="")
    try:
        created = await _cdp_http_json(f"/json/new?{encoded}", method="PUT", timeout=3.0)
    except Exception:
        try:
            created = await _cdp_http_json(f"/json/new?{encoded}", method="GET", timeout=3.0)
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"CDP daemon unreachable: {exc}")

    tid = created.get("id", "")
    if lease and tid:
        leases = _read_leases()
        leases[lease] = {
            "lease": lease,
            "targetId": tid,
            "actor": (req.actor or lease).strip()[:64],
            "session": (req.session or "").strip()[:64],
            "url": created.get("url") or clean_url,
            "title": created.get("title") or "",
            "updatedAt": int(time.time() * 1000),
        }
        _write_leases(leases)

    status = await _collect_browser_status()
    return {"tab": created, "tabs": status["tabs"]}


@router.delete("/api/browser/tabs/{target_id}", dependencies=[Depends(verify_token), Depends(require_admin)])
async def close_browser_tab(target_id: str):
    """Close a CDP tab by targetId, detaching active screencast bridges first (#240, #249)."""
    if not TARGET_ID_RE.match(target_id or ""):
        raise HTTPException(status_code=400, detail="Invalid target_id")

    # Mark closed immediately and detach any attached DevTools screencast bridge so
    # Chromium tears down the page target right away without waiting for a tab switch (#249).
    _RECENTLY_CLOSED_TARGETS[target_id] = time.monotonic()
    attached = [b for b in list(_ACTIVE_BROWSER_BRIDGES) if b.target_id == target_id]
    for bridge in attached:
        await bridge.close()

    try:
        # Note: Chromium /json/close/{id} returns plain text "Target is closing", not JSON (#251)
        await _cdp_http_text(f"/json/close/{target_id}", method="GET", timeout=2.5)
    except Exception as exc:
        _RECENTLY_CLOSED_TARGETS.pop(target_id, None)
        raise HTTPException(status_code=502, detail=f"Failed to close tab: {exc}")

    if target_id in _KNOWN_TAB_ORDER:
        _KNOWN_TAB_ORDER.remove(target_id)

    leases = _read_leases()
    filtered = {k: v for k, v in leases.items() if v.get("targetId") != target_id}
    if len(filtered) != len(leases):
        _write_leases(filtered)

    status = await _collect_browser_status()
    return {"closed": target_id, "tabs": status["tabs"]}


MAX_FULL_PAGE_HEIGHT = 12000
MAX_SAVED_SHOT_BYTES = 25 * 1024 * 1024


class BrowserScreenshotRequest(BaseModel):
    target_id: str = ""
    session: str = ""
    full_page: bool = False


class SaveShotImageRequest(BaseModel):
    image_base64: str
    label: str = "annotated"


def _write_private_shot_png(png_bytes: bytes, prefix: str, slug_raw: str) -> tuple[str, str, int, int]:
    width, height = _extract_png_dims(png_bytes)
    clean_slug = re.sub(r"[^a-zA-Z0-9._-]", "-", slug_raw or "shot").strip("-") or "shot"
    ts_ms = int(time.time() * 1000)
    filename = f"{prefix}-{clean_slug[:40]}-{ts_ms}.png"
    shots_dir = _get_shots_dir()
    full_path = os.path.join(shots_dir, filename)

    fd = os.open(full_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    try:
        os.write(fd, png_bytes)
    finally:
        os.close(fd)
    try:
        os.chmod(full_path, 0o600)
    except OSError:
        pass
    return filename, full_path, width, height


@router.post("/api/browser/screenshot", dependencies=[Depends(verify_token), Depends(require_admin)])
async def capture_browser_screenshot(req: BrowserScreenshotRequest | None = None):
    """Capture a viewport or full-page PNG screenshot of the active/leased CDP tab into 0600 shots/ (#258, #273)."""
    body = req or BrowserScreenshotRequest()
    if body.target_id and not TARGET_ID_RE.match(body.target_id):
        raise HTTPException(status_code=400, detail="Invalid target_id")

    try:
        chosen_id, ws_url, chosen_meta = await _resolve_target_ws(body.target_id)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"CDP target unavailable: {exc}")

    try:
        async with websockets.connect(ws_url, max_size=32 * 1024 * 1024) as cdp_ws:
            shot_params: dict[str, Any] = {"format": "png"}
            if body.full_page:
                await cdp_ws.send(json.dumps({"id": 10, "method": "Page.getLayoutMetrics", "params": {}}))
                metrics_res: dict[str, Any] = {}
                while True:
                    raw_m = await asyncio.wait_for(cdp_ws.recv(), timeout=4.0)
                    parsed_m = json.loads(raw_m)
                    if parsed_m.get("id") == 10:
                        metrics_res = parsed_m.get("result") or {}
                        break
                content_box = metrics_res.get("cssContentSize") or metrics_res.get("contentSize") or {}
                cw = _clamp_viewport_dim(content_box.get("width"), 1280, low=320, high=2560)
                ch = _clamp_viewport_dim(content_box.get("height"), 1600, low=320, high=MAX_FULL_PAGE_HEIGHT)
                shot_params = {
                    "format": "png",
                    "captureBeyondViewport": True,
                    "clip": {"x": 0, "y": 0, "width": cw, "height": ch, "scale": 1},
                }

            await cdp_ws.send(json.dumps({"id": 1, "method": "Page.captureScreenshot", "params": shot_params}))
            png_b64 = ""
            while True:
                raw_msg = await asyncio.wait_for(cdp_ws.recv(), timeout=8.0)
                parsed = json.loads(raw_msg)
                if parsed.get("id") == 1:
                    if "error" in parsed:
                        raise RuntimeError(parsed["error"].get("message", "Screenshot failed"))
                    png_b64 = (parsed.get("result") or {}).get("data") or ""
                    break
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"CDP screenshot capture failed: {exc}")

    if not png_b64:
        raise HTTPException(status_code=502, detail="CDP returned empty screenshot payload")

    png_bytes = base64.b64decode(png_b64)
    raw_url = chosen_meta.get("url") or "about:blank"
    host_slug = urllib.parse.urlparse(raw_url).netloc or "page"
    filename, full_path, width, height = _write_private_shot_png(png_bytes, "screenshot", host_slug)

    return {
        "filename": filename,
        "path": full_path,
        "url": raw_url,
        "dims": f"{width}x{height}",
        "target_id": chosen_id,
        "full_page": bool(body.full_page),
    }


@router.post("/api/browser/screenshot/save", dependencies=[Depends(verify_token), Depends(require_admin)])
async def save_annotated_or_pasted_screenshot(req: SaveShotImageRequest):
    """Persist a canvas-annotated or clipboard-pasted PNG into 0600 ~/.cache/aim-connect/shots/ (#273)."""
    raw_b64 = (req.image_base64 or "").strip()
    if not raw_b64:
        raise HTTPException(status_code=400, detail="Missing image_base64 payload")
    if "," in raw_b64 and raw_b64.lower().startswith("data:"):
        header_part, b64_part = raw_b64.split(",", 1)
        if "image/png" not in header_part.lower():
            raise HTTPException(status_code=400, detail="Only image/png data URLs are supported")
        raw_b64 = b64_part.strip()

    try:
        png_bytes = base64.b64decode(raw_b64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image payload")

    if len(png_bytes) > MAX_SAVED_SHOT_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 25 MB limit")
    if len(png_bytes) < 24 or png_bytes[:8] != b"\x89PNG\r\n\x1a\n":
        raise HTTPException(status_code=400, detail="Payload is not a valid PNG image")

    filename, full_path, width, height = _write_private_shot_png(
        png_bytes, "annotated", req.label or "shot"
    )
    return {
        "filename": filename,
        "path": full_path,
        "dims": f"{width}x{height}",
        "bytes": len(png_bytes),
    }


@router.get("/api/browser/downloads", dependencies=[Depends(verify_token), Depends(require_admin)])
async def list_browser_downloads():
    """List streaming (.crdownload) and completed files in ~/Downloads/aim-browser (#258)."""
    dl_dir = _get_downloads_dir()
    items = []
    now = time.time()
    try:
        entries = list(os.scandir(dl_dir))
    except OSError:
        entries = []

    entries.sort(key=lambda e: e.stat().st_mtime if e.is_file() else 0, reverse=True)
    for entry in entries[:40]:
        if not entry.is_file() or entry.name.startswith("."):
            continue
        try:
            st = entry.stat()
        except OSError:
            continue
        is_streaming = entry.name.endswith(".crdownload")
        clean_name = entry.name[: -len(".crdownload")] if is_streaming else entry.name
        age_s = max(0, int(now - st.st_mtime))
        when_str = (
            "Streaming now"
            if is_streaming
            else ("Just now" if age_s < 60 else f"{age_s // 60}m ago" if age_s < 3600 else f"{age_s // 3600}h ago")
        )
        items.append(
            {
                "id": hashlib.sha1(entry.path.encode("utf-8")).hexdigest()[:12],
                "name": clean_name,
                "raw_name": entry.name,
                "path": entry.path,
                "size": _format_file_size(st.st_size),
                "bytes": st.st_size,
                "status": "streaming" if is_streaming else "done",
                "when": when_str,
            }
        )
    return {"dir": dl_dir, "downloads": items}


@router.get("/api/browser/downloads/{filename}", dependencies=[Depends(verify_token), Depends(require_admin)])
async def download_browser_artifact(filename: str):
    """Download a completed file from ~/Downloads/aim-browser with strict path-traversal guard (#258)."""
    safe_name = os.path.basename(filename or "")
    if not safe_name or safe_name != filename or ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    dl_dir = _get_downloads_dir()
    target_path = os.path.abspath(os.path.join(dl_dir, safe_name))
    if os.path.dirname(target_path) != dl_dir or not os.path.isfile(target_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=target_path, filename=safe_name)


class _CdpPageBridge:
    """Thin async CDP WebSocket session streaming Page.startScreencast & forwarding input."""

    def __init__(
        self,
        ws_url: str,
        target_id: str,
        client_ws: WebSocket,
        viewport_width: int = 1280,
        viewport_height: int = 900,
    ):
        self.ws_url = ws_url
        self.target_id = target_id
        self.client_ws = client_ws
        self.viewport_width = _clamp_viewport_dim(viewport_width, 1280)
        self.viewport_height = _clamp_viewport_dim(viewport_height, 900, low=320, high=2160)
        self.cdp_ws: Any = None
        self._msg_id = 0
        self._pending: dict[int, asyncio.Future] = {}
        self._reader_task: asyncio.Task | None = None
        self._closed = False

    async def connect_and_start(self) -> None:
        self.cdp_ws = await websockets.connect(self.ws_url, max_size=16 * 1024 * 1024)
        _ACTIVE_BROWSER_BRIDGES.add(self)
        self._reader_task = asyncio.create_task(self._reader_loop())
        await self.send_cmd("Page.enable")
        try:
            await self.send_cmd(
                "Page.setDownloadBehavior",
                {"behavior": "allow", "downloadPath": _get_downloads_dir()},
                timeout=1.5,
            )
        except Exception:
            pass
        try:
            await self.send_cmd("Page.bringToFront", {}, timeout=2.0)
        except Exception:
            pass
        await self._apply_metrics_and_screencast(self.viewport_width, self.viewport_height)

    async def _apply_metrics_and_screencast(self, width: int, height: int) -> None:
        self.viewport_width = _clamp_viewport_dim(width, self.viewport_width)
        self.viewport_height = _clamp_viewport_dim(height, self.viewport_height, low=320, high=2160)
        await self.send_cmd(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": self.viewport_width,
                "height": self.viewport_height,
                "deviceScaleFactor": 1,
                "mobile": False,
            },
        )
        await self.send_cmd(
            "Page.startScreencast",
            {
                "format": "jpeg",
                "quality": 70,
                "maxWidth": self.viewport_width,
                "maxHeight": self.viewport_height,
                "everyNthFrame": 1,
            },
        )

    async def resize_viewport(self, width: int, height: int) -> None:
        w = _clamp_viewport_dim(width, self.viewport_width)
        h = _clamp_viewport_dim(height, self.viewport_height, low=320, high=2160)
        if w == self.viewport_width and h == self.viewport_height:
            return
        try:
            await self.send_cmd("Page.stopScreencast", {})
        except Exception:
            pass
        await self._apply_metrics_and_screencast(w, h)

    async def send_cmd(self, method: str, params: dict | None = None, timeout: float = 5.0) -> dict:
        if not self.cdp_ws or self._closed:
            raise RuntimeError("CDP connection not open")
        self._msg_id += 1
        cid = self._msg_id
        fut: asyncio.Future = asyncio.get_running_loop().create_future()
        self._pending[cid] = fut
        await self.cdp_ws.send(json.dumps({"id": cid, "method": method, "params": params or {}}))
        try:
            return await asyncio.wait_for(fut, timeout=timeout)
        finally:
            self._pending.pop(cid, None)

    async def _reader_loop(self) -> None:
        try:
            async for raw in self.cdp_ws:
                msg = json.loads(raw)
                if "id" in msg:
                    fut = self._pending.get(msg["id"])
                    if fut and not fut.done():
                        if "error" in msg:
                            fut.set_exception(RuntimeError(msg["error"].get("message", "CDP error")))
                        else:
                            fut.set_result(msg.get("result") or {})
                    continue

                method = msg.get("method")
                params = msg.get("params") or {}
                if method == "Page.screencastFrame":
                    session_id = params.get("sessionId")
                    if session_id is not None and not self._closed:
                        try:
                            self._msg_id += 1
                            await self.cdp_ws.send(
                                json.dumps(
                                    {
                                        "id": self._msg_id,
                                        "method": "Page.screencastFrameAck",
                                        "params": {"sessionId": session_id},
                                    }
                                )
                            )
                        except Exception:
                            pass
                    await self.client_ws.send_text(
                        json.dumps(
                            {
                                "type": "frame",
                                "target_id": self.target_id,
                                "data": params.get("data", ""),
                                "metadata": params.get("metadata") or {},
                            }
                        )
                    )
                elif method == "Page.frameNavigated":
                    frame = params.get("frame") or {}
                    if not frame.get("parentId"):
                        await self.client_ws.send_text(
                            json.dumps(
                                {
                                    "type": "navigated",
                                    "target_id": self.target_id,
                                    "url": frame.get("url", ""),
                                }
                            )
                        )
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            if not self._closed:
                try:
                    await self.client_ws.send_text(
                        json.dumps({"type": "error", "message": f"CDP target disconnected: {exc}"})
                    )
                except Exception:
                    pass

    async def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        _ACTIVE_BROWSER_BRIDGES.discard(self)
        try:
            if self.cdp_ws:
                self._msg_id += 1
                await asyncio.wait_for(
                    self.cdp_ws.send(
                        json.dumps({"id": self._msg_id, "method": "Page.stopScreencast", "params": {}})
                    ),
                    timeout=0.5,
                )
        except Exception:
            pass
        if self._reader_task:
            self._reader_task.cancel()
            try:
                await self._reader_task
            except BaseException:
                pass
        if self.cdp_ws:
            try:
                await self.cdp_ws.close()
            except Exception:
                pass
        for fut in self._pending.values():
            if not fut.done():
                fut.cancel()
        self._pending.clear()


async def _resolve_target_ws(target_id: str = "") -> tuple[str, str, dict]:
    port = _get_cdp_port()
    targets = await _cdp_http_json("/json/list", timeout=2.0)
    tabs = _merge_tabs_with_leases(targets if isinstance(targets, list) else [])
    chosen = None
    if target_id:
        chosen = next((t for t in tabs if t["id"] == target_id), None)
    if chosen is None and tabs:
        chosen = tabs[0]
    if chosen is None:
        encoded = urllib.parse.quote("about:blank", safe="")
        try:
            created = await _cdp_http_json(f"/json/new?{encoded}", method="PUT", timeout=3.0)
        except Exception:
            created = await _cdp_http_json(f"/json/new?{encoded}", method="GET", timeout=3.0)
        chosen = {
            "id": created.get("id", ""),
            "title": created.get("title") or "(untitled)",
            "url": created.get("url") or "about:blank",
            "lease": "",
            "actor": "",
            "webSocketDebuggerUrl": created.get("webSocketDebuggerUrl", ""),
        }
    ws_url = _validate_cdp_ws_url(chosen.get("webSocketDebuggerUrl", ""), port)
    return chosen["id"], ws_url, chosen


@router.websocket("/ws/browser")
async def browser_viewport_ws(websocket: WebSocket):
    """Operator-3FA-only live CDP Page.startScreencast & Co-Pilot input bridge (#240)."""
    await websocket.accept()
    bridge: _CdpPageBridge | None = None
    hud_task: asyncio.Task | None = None

    try:
        raw_auth = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
        auth_msg = json.loads(raw_auth)
        token = (auth_msg.get("token") or "").strip()
        if auth_msg.get("type") != "auth" or not is_token_valid(token):
            await websocket.close(code=1008)
            return
        role, _ = _get_user_from_token(token)
        if role != "admin":
            await websocket.close(code=1008)
            return

        requested_target = (auth_msg.get("target_id") or "").strip()
        vp_width = _clamp_viewport_dim(auth_msg.get("width"), 1280)
        vp_height = _clamp_viewport_dim(auth_msg.get("height"), 900, low=320, high=2160)
        try:
            tid, ws_url, meta = await _resolve_target_ws(requested_target)
            bridge = _CdpPageBridge(
                ws_url=ws_url,
                target_id=tid,
                client_ws=websocket,
                viewport_width=vp_width,
                viewport_height=vp_height,
            )
            await bridge.connect_and_start()
            await websocket.send_text(
                json.dumps(
                    {
                        "type": "ready",
                        "target_id": tid,
                        "title": meta.get("title", ""),
                        "url": meta.get("url", ""),
                        "lease": meta.get("lease", ""),
                        "actor": meta.get("actor", ""),
                        "session": meta.get("session", ""),
                    }
                )
            )
        except Exception as exc:
            await websocket.send_text(
                json.dumps({"type": "daemon_offline", "message": f"CDP daemon not ready: {exc}"})
            )

        async def _hud_watcher() -> None:
            last_seq = -1
            hud_path = os.path.join(_get_state_dir(), "hud.json")
            last_mtime = 0.0
            while True:
                await asyncio.sleep(0.15)
                if not is_token_valid(token):
                    try:
                        await websocket.close(code=1008)
                    except Exception:
                        pass
                    return
                try:
                    st = os.stat(hud_path)
                    if st.st_mtime <= last_mtime:
                        continue
                    last_mtime = st.st_mtime
                    hud = _read_hud()
                    if hud and int(hud.get("seq", 0)) != last_seq:
                        last_seq = int(hud.get("seq", 0))
                        await websocket.send_text(json.dumps({"type": "hud", "hud": hud}))
                except FileNotFoundError:
                    continue
                except Exception:
                    continue

        hud_task = asyncio.create_task(_hud_watcher())

        while True:
            raw = await websocket.receive_text()
            if not is_token_valid(token):
                await websocket.close(code=1008)
                return

            msg = json.loads(raw)
            mtype = msg.get("type")

            if mtype == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue

            if mtype == "resize_viewport":
                vp_width = _clamp_viewport_dim(msg.get("width"), vp_width)
                vp_height = _clamp_viewport_dim(msg.get("height"), vp_height, low=320, high=2160)
                if bridge and not bridge._closed:
                    await bridge.resize_viewport(vp_width, vp_height)
                continue

            # Active Operator interaction slides 4h session TTL (#247)
            touch_api_token(token)

            if mtype == "switch_target":
                next_tid = (msg.get("target_id") or "").strip()
                vp_width = _clamp_viewport_dim(msg.get("width"), vp_width)
                vp_height = _clamp_viewport_dim(msg.get("height"), vp_height, low=320, high=2160)
                if bridge:
                    await bridge.close()
                    bridge = None
                tid, ws_url, meta = await _resolve_target_ws(next_tid)
                bridge = _CdpPageBridge(
                    ws_url=ws_url,
                    target_id=tid,
                    client_ws=websocket,
                    viewport_width=vp_width,
                    viewport_height=vp_height,
                )
                await bridge.connect_and_start()
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "ready",
                            "target_id": tid,
                            "title": meta.get("title", ""),
                            "url": meta.get("url", ""),
                            "lease": meta.get("lease", ""),
                            "actor": meta.get("actor", ""),
                            "session": meta.get("session", ""),
                        }
                    )
                )
                continue

            if not bridge:
                await websocket.send_text(json.dumps({"type": "error", "message": "No active CDP target attached"}))
                continue

            if mtype == "navigate":
                nav_url = _normalize_nav_url(msg.get("url") or "")
                await bridge.send_cmd("Page.navigate", {"url": nav_url})
            elif mtype == "reload":
                await bridge.send_cmd("Page.reload", {})
            elif mtype in ("back", "forward"):
                hist = await bridge.send_cmd("Page.getNavigationHistory", {})
                idx = int(hist.get("currentIndex", 0))
                entries = hist.get("entries") or []
                next_idx = idx - 1 if mtype == "back" else idx + 1
                if 0 <= next_idx < len(entries):
                    await bridge.send_cmd("Page.navigateToHistoryEntry", {"entryId": entries[next_idx]["id"]})
            elif mtype == "mouse":
                await bridge.send_cmd(
                    "Input.dispatchMouseEvent",
                    {
                        "type": msg.get("eventType", "mousePressed"),
                        "x": float(msg.get("x", 0)),
                        "y": float(msg.get("y", 0)),
                        "button": msg.get("button", "left"),
                        "clickCount": int(msg.get("clickCount", 1)),
                        "modifiers": int(msg.get("modifiers", 0)),
                    },
                )
            elif mtype == "wheel":
                await bridge.send_cmd(
                    "Input.dispatchMouseEvent",
                    {
                        "type": "mouseWheel",
                        "x": float(msg.get("x", 0)),
                        "y": float(msg.get("y", 0)),
                        "deltaX": float(msg.get("deltaX", 0)),
                        "deltaY": float(msg.get("deltaY", 0)),
                    },
                )
            elif mtype == "key":
                params: dict[str, Any] = {
                    "type": msg.get("eventType", "keyDown"),
                    "key": msg.get("key", ""),
                    "code": msg.get("code", ""),
                    "modifiers": int(msg.get("modifiers", 0)),
                }
                if msg.get("text"):
                    params["text"] = msg["text"]
                if msg.get("windowsVirtualKeyCode"):
                    params["windowsVirtualKeyCode"] = int(msg["windowsVirtualKeyCode"])
                    params["nativeVirtualKeyCode"] = int(msg["windowsVirtualKeyCode"])
                await bridge.send_cmd("Input.dispatchKeyEvent", params)
            elif mtype == "insert_text":
                text = str(msg.get("text") or "")
                if text:
                    await bridge.send_cmd("Input.insertText", {"text": text})
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug("Browser WS closed: %s", exc)
    finally:
        if hud_task:
            hud_task.cancel()
            try:
                await hud_task
            except BaseException:
                pass
        if bridge:
            await bridge.close()
