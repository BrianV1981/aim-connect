import asyncio
import hashlib
import json
import logging
import os
import re
import shutil
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

import websockets
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
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

# Track live screencast bridges so DELETE /api/browser/tabs/{id} can detach DevTools
# before calling /json/close/{id}, and tombstone closed IDs against /json/list races (#249).
_ACTIVE_BROWSER_BRIDGES: set["_CdpPageBridge"] = set()
_RECENTLY_CLOSED_TARGETS: dict[str, float] = {}


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


def _read_hud() -> dict | None:
    raw = _read_json_file(os.path.join(_get_state_dir(), "hud.json"), None)
    return raw if isinstance(raw, dict) else None


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


def _cdp_http_json_sync(path: str, method: str = "GET", timeout: float = 2.0) -> Any:
    port = _get_cdp_port()
    url = f"http://{CDP_LOOPBACK_HOST}:{port}{path}"
    req = urllib.request.Request(url, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
        return json.loads(raw) if raw.strip() else {}


async def _cdp_http_json(path: str, method: str = "GET", timeout: float = 2.0) -> Any:
    return await asyncio.to_thread(_cdp_http_json_sync, path, method, timeout)


def _merge_tabs_with_leases(raw_targets: list[dict]) -> list[dict]:
    closed_ids = _prune_closed_tombstones()
    pages = [
        t
        for t in (raw_targets or [])
        if isinstance(t, dict) and t.get("type") == "page" and t.get("id") not in closed_ids
    ]
    leases = _read_leases()
    live_ids = {p.get("id") for p in pages if p.get("id")}

    # Prune stale leases whose tabs were closed
    pruned = {k: v for k, v in leases.items() if isinstance(v, dict) and v.get("targetId") in live_ids}
    if len(pruned) != len(leases):
        _write_leases(pruned)
        leases = pruned

    lease_by_target: dict[str, dict] = {}
    for lease_name, meta in leases.items():
        tid = meta.get("targetId")
        if tid:
            lease_by_target[tid] = {"lease": lease_name, "actor": meta.get("actor") or lease_name}

    enriched = []
    for idx, p in enumerate(pages):
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
    has_display = bool(os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY"))
    use_headless = body.mode == "headless" or (body.mode == "auto" and not has_display)

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
        await _cdp_http_json(f"/json/close/{target_id}", method="GET", timeout=2.5)
    except Exception as exc:
        _RECENTLY_CLOSED_TARGETS.pop(target_id, None)
        raise HTTPException(status_code=502, detail=f"Failed to close tab: {exc}")

    leases = _read_leases()
    filtered = {k: v for k, v in leases.items() if v.get("targetId") != target_id}
    if len(filtered) != len(leases):
        _write_leases(filtered)

    status = await _collect_browser_status()
    return {"closed": target_id, "tabs": status["tabs"]}


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
