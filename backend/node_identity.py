"""Server node identity, peer server directory, and dynamic badged PWA icons (#306)."""

from __future__ import annotations

import hashlib
import html
import io
import json
import os
import re
import urllib.parse

HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
SAFE_HOST_RE = re.compile(r"^[A-Za-z0-9.-]+(?::\d{1,5})?$")
ALNUM_RE = re.compile(r"[A-Za-z0-9]")

DEFAULT_APP_NAME = "A.I.M. Connect"
DEFAULT_APP_COLOR = "#00FFA3"
NODE_IDENTITY_FILENAME = "node_identity.json"

_ICON_PNG_CACHE: dict[tuple[str, int, str, str], bytes] = {}


def sanitize_hex_color(raw: object, default: str = DEFAULT_APP_COLOR) -> str:
    val = str(raw or "").strip()
    if HEX_COLOR_RE.match(val):
        return val.upper()
    return default


def sanitize_server_url(raw: object) -> str:
    """Validate and normalize an http(s) AIM-Connect server origin/URL; reject unsafe schemes."""
    text = str(raw or "").strip()
    if not text or any(ord(ch) < 32 for ch in text):
        return ""
    if "://" not in text:
        lower = text.lower()
        if lower.startswith(("javascript:", "data:", "vbscript:", "file:", "blob:")):
            return ""
        is_local = lower.startswith(("localhost", "127.0.0.1", "[::1]"))
        text = f"{'http' if is_local else 'https'}://{text}"

    try:
        parsed = urllib.parse.urlsplit(text)
    except ValueError:
        return ""

    scheme = (parsed.scheme or "").lower()
    if scheme not in ("https", "http"):
        return ""
    if parsed.username or parsed.password or not parsed.hostname:
        return ""

    host = parsed.hostname.lower()
    if not re.match(r"^[a-z0-9.-]+$", host) and ":" not in host:
        return ""

    try:
        port = parsed.port
    except ValueError:
        return ""

    netloc = f"[{host}]" if ":" in host and not host.startswith("[") else host
    if port and not ((scheme == "https" and port == 443) or (scheme == "http" and port == 80)):
        netloc = f"{netloc}:{port}"

    clean_path = (parsed.path or "").rstrip("/")
    return f"{scheme}://{netloc}{clean_path}"


def derive_monogram(label: str, explicit: str = "") -> str:
    exp_chars = "".join(ALNUM_RE.findall(str(explicit or ""))).upper()
    if exp_chars:
        return exp_chars[:4]

    cleaned = str(label or "").strip()
    if not cleaned or cleaned.lower() in ("a.i.m. connect", "aim connect"):
        return "AIM"

    tokens = [ "".join(ALNUM_RE.findall(part)).upper() for part in re.split(r"[\s._/-]+", cleaned) ]
    tokens = [t for t in tokens if t]
    if not tokens:
        return "AIM"
    if len(tokens) >= 2:
        initials = "".join(t[0] for t in tokens[:3])
        if len(initials) >= 2:
            return initials[:4]
    return tokens[0][:3]


def _make_peer_id(url: str) -> str:
    return "srv-" + hashlib.sha256(url.lower().encode("utf-8")).hexdigest()[:10]


def normalize_peer_servers(items: list[dict] | None) -> list[dict]:
    if not isinstance(items, list):
        return []
    seen_urls: set[str] = set()
    normalized: list[dict] = []
    for raw in items:
        if not isinstance(raw, dict):
            continue
        clean_url = sanitize_server_url(raw.get("url", ""))
        if not clean_url:
            continue
        url_key = clean_url.lower()
        if url_key in seen_urls:
            continue
        seen_urls.add(url_key)

        parsed = urllib.parse.urlsplit(clean_url)
        fallback_label = (parsed.hostname or clean_url).split(".")[0].upper()
        label = str(raw.get("label") or fallback_label).strip()[:40] or fallback_label
        color = sanitize_hex_color(raw.get("color"), default="#38BDF8")
        normalized.append(
            {
                "id": _make_peer_id(clean_url),
                "label": label,
                "url": clean_url,
                "color": color,
            }
        )
        if len(normalized) >= 20:
            break
    return normalized


def parse_env_peer_servers(raw: str) -> list[dict]:
    """Parse AIM_PEER_SERVERS from JSON array or 'Label|https://host|#Color,Label2|https://host2'."""
    text = (raw or "").strip()
    if not text:
        return []
    if text.startswith("["):
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return normalize_peer_servers(parsed)
        except Exception:
            return []

    entries: list[dict] = []
    for chunk in re.split(r"[,;\n]+", text):
        part = chunk.strip()
        if not part:
            continue
        pieces = [p.strip() for p in part.split("|")]
        if len(pieces) == 1:
            entries.append({"url": pieces[0]})
        elif len(pieces) == 2:
            entries.append({"label": pieces[0], "url": pieces[1]})
        else:
            entries.append({"label": pieces[0], "url": pieces[1], "color": pieces[2]})
    return normalize_peer_servers(entries)


def _identity_file_path(auth_state_dir: str) -> str:
    return os.path.join(auth_state_dir, NODE_IDENTITY_FILENAME)


def _read_saved_identity(auth_state_dir: str) -> dict:
    path = _identity_file_path(auth_state_dir)
    if not os.path.isfile(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def sanitize_request_host(raw_host: str) -> str:
    cand = (raw_host or "").strip().split(",")[0].strip()
    if not cand or not SAFE_HOST_RE.match(cand):
        return ""
    host_only = cand.split(":")[0].lower()
    if host_only in ("testserver", "testclient"):
        return ""
    return cand.lower()


def load_node_identity(auth_state_dir: str, request_host: str = "") -> dict:
    """Resolve active node identity from 0600 node_identity.json layered over .env variables."""
    saved = _read_saved_identity(auth_state_dir)

    env_app_name = (os.environ.get("AIM_APP_NAME") or "").strip()
    env_app_color = (os.environ.get("AIM_APP_COLOR") or "").strip()
    env_node_label = (os.environ.get("AIM_NODE_LABEL") or "").strip()
    env_monogram = (os.environ.get("AIM_APP_MONOGRAM") or "").strip()
    env_peers = parse_env_peer_servers(os.environ.get("AIM_PEER_SERVERS", ""))

    saved_app_name = str(saved.get("app_name") or "").strip()[:60]
    saved_node_label = str(saved.get("node_label") or "").strip()[:40]
    saved_monogram = str(saved.get("monogram") or "").strip()[:4]
    saved_color = str(saved.get("app_color") or "").strip()
    has_saved_peers = "peer_servers" in saved and isinstance(saved.get("peer_servers"), list)
    saved_peers = normalize_peer_servers(saved.get("peer_servers")) if has_saved_peers else []

    app_name = saved_app_name or env_app_name or DEFAULT_APP_NAME
    app_color = sanitize_hex_color(saved_color or env_app_color, default=DEFAULT_APP_COLOR)
    clean_host = sanitize_request_host(request_host)

    explicit_label = saved_node_label or env_node_label
    if explicit_label:
        node_label = explicit_label
    elif app_name != DEFAULT_APP_NAME:
        node_label = app_name[:40]
    elif clean_host and not clean_host.startswith(("localhost", "127.0.0.1")):
        node_label = clean_host.split(".")[0].upper()[:24]
    elif clean_host:
        node_label = clean_host.upper()
    else:
        node_label = ""

    is_customized = bool(
        saved_node_label
        or saved_app_name
        or saved_monogram
        or saved_color
        or env_node_label
        or env_monogram
        or env_app_color
        or (env_app_name and env_app_name != DEFAULT_APP_NAME)
    )

    monogram = derive_monogram(explicit_label or app_name, saved_monogram or env_monogram)

    merged_peers = normalize_peer_servers([*saved_peers, *env_peers]) if has_saved_peers else env_peers
    sig_raw = f"{app_name}|{node_label}|{monogram}|{app_color}"
    badge_tag = hashlib.sha256(sig_raw.encode("utf-8")).hexdigest()[:8]

    return {
        "app_name": app_name,
        "node_label": node_label,
        "monogram": monogram,
        "app_color": app_color,
        "host": clean_host,
        "is_customized": is_customized,
        "badge_tag": badge_tag,
        "peer_servers": merged_peers,
    }


def save_node_identity(auth_state_dir: str, patch: dict) -> dict:
    """Persist admin-configured node identity & peer server directory with 0600 permissions."""
    current = _read_saved_identity(auth_state_dir)

    if "app_name" in patch and patch["app_name"] is not None:
        current["app_name"] = str(patch["app_name"]).strip()[:60]
    if "node_label" in patch and patch["node_label"] is not None:
        current["node_label"] = str(patch["node_label"]).strip()[:40]
    if "monogram" in patch and patch["monogram"] is not None:
        raw_mono = "".join(ALNUM_RE.findall(str(patch["monogram"]))).upper()[:4]
        current["monogram"] = raw_mono
    if "app_color" in patch and patch["app_color"] is not None:
        raw_col = str(patch["app_color"]).strip()
        if raw_col and not HEX_COLOR_RE.match(raw_col):
            raise ValueError("app_color must be a 6-digit hex color like #00FFA3")
        current["app_color"] = raw_col.upper() if raw_col else ""
    if "peer_servers" in patch and patch["peer_servers"] is not None:
        if not isinstance(patch["peer_servers"], list):
            raise ValueError("peer_servers must be a list")
        for item in patch["peer_servers"]:
            if isinstance(item, dict) and item.get("url"):
                if not sanitize_server_url(item.get("url")):
                    raise ValueError(f"Invalid peer server URL: {item.get('url')!r}")
        current["peer_servers"] = normalize_peer_servers(patch["peer_servers"])

    os.makedirs(auth_state_dir, mode=0o700, exist_ok=True)
    path = _identity_file_path(auth_state_dir)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(current, f, indent=2)
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass
    return load_node_identity(auth_state_dir)


def _hex_to_rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    clean = sanitize_hex_color(hex_color).lstrip("#")
    return (int(clean[0:2], 16), int(clean[2:4], 16), int(clean[4:6], 16), alpha)


def render_custom_svg_icon(base_svg: str, app_color: str, monogram: str) -> str:
    """Tint primary accent in icon.svg and append a high-contrast corner monogram pill."""
    color = sanitize_hex_color(app_color)
    mono = html.escape(derive_monogram(monogram, monogram))
    tinted = base_svg.replace("#00FFA3", color).replace("#00ffa3", color)
    badge_svg = (
        f'\n  <g id="nodeBadge">'
        f'\n    <rect x="278" y="388" width="206" height="96" rx="26" fill="#05080C" fill-opacity="0.94" stroke="{color}" stroke-width="10" />'
        f'\n    <text x="381" y="452" text-anchor="middle" fill="#F8FAFC" font-family="JetBrains Mono, monospace" font-weight="800" font-size="52" letter-spacing="2">{mono}</text>'
        f"\n  </g>\n</svg>"
    )
    if "</svg>" in tinted:
        return tinted.replace("</svg>", badge_svg, 1)
    return tinted


def render_custom_png_icon(base_png_path: str, filename: str, app_color: str, monogram: str) -> bytes | None:
    """Render and memoize a monogrammed + color-ringed PNG icon so mobile Home Screen icons are distinct."""
    try:
        st = os.stat(base_png_path)
    except OSError:
        return None

    color = sanitize_hex_color(app_color)
    mono = derive_monogram(monogram, monogram)
    cache_key = (base_png_path, st.st_mtime_ns, color, mono)
    cached = _ICON_PNG_CACHE.get(cache_key)
    if cached is not None:
        return cached

    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return None

    try:
        img = Image.open(base_png_path).convert("RGBA")
        w, h = img.size
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        is_maskable = "maskable" in filename.lower()
        margin = int(round(w * (0.14 if is_maskable else 0.055)))
        badge_h = max(28, int(round(h * (0.21 if is_maskable else 0.235))))
        badge_w = max(56, int(round(w * (0.44 if len(mono) <= 2 else 0.52))))
        x2 = w - margin
        y2 = h - margin
        x1 = max(margin, x2 - badge_w)
        y1 = max(margin, y2 - badge_h)
        radius = max(6, int(round(badge_h * 0.30)))
        border_w = max(2, int(round(w * 0.022)))

        accent_rgba = _hex_to_rgba(color, 255)
        # Subtle top-border accent ring so icon color pops immediately on phone home screens
        ring_inset = int(round(w * (0.09 if is_maskable else 0.02)))
        draw.rounded_rectangle(
            [ring_inset, ring_inset, w - ring_inset - 1, h - ring_inset - 1],
            radius=max(12, int(round(w * 0.18))),
            outline=accent_rgba,
            width=max(2, int(round(w * 0.026))),
        )

        draw.rounded_rectangle(
            [x1, y1, x2, y2],
            radius=radius,
            fill=(5, 8, 12, 242),
            outline=accent_rgba,
            width=border_w,
        )

        font_px = max(12, int(round(badge_h * (0.56 if len(mono) <= 3 else 0.46))))
        try:
            font = ImageFont.load_default(size=font_px)
        except TypeError:
            font = ImageFont.load_default()

        bbox = draw.textbbox((0, 0), mono, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = x1 + (badge_w - tw) / 2 - bbox[0]
        ty = y1 + (badge_h - th) / 2 - bbox[1]
        draw.text((tx, ty), mono, fill=(248, 250, 252, 255), font=font)

        combined = Image.alpha_composite(img, overlay)
        buf = io.BytesIO()
        combined.save(buf, format="PNG")
        png_bytes = buf.getvalue()
        if len(_ICON_PNG_CACHE) > 32:
            _ICON_PNG_CACHE.clear()
        _ICON_PNG_CACHE[cache_key] = png_bytes
        return png_bytes
    except Exception:
        return None
