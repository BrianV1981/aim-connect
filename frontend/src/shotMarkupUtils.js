// Sovereign Visual Marking System — 4-Color Convention, Callout Pins, & WSL2 Path Helpers (#273)

export const MARKUP_COLORS = [
  { id: 'red', hex: '#FF3B5C', short: 'FIX', label: 'Fix / Bug / Delete', neutral: false },
  { id: 'emerald', hex: '#00FFA3', short: 'KEEP', label: 'Keep / Match Style', neutral: false },
  { id: 'cyan', hex: '#00B8FF', short: 'INFO', label: 'Question / Inspect', neutral: false },
  { id: 'amber', hex: '#FBBF24', short: 'MOVE', label: 'Move / Resize / Layout', neutral: false },
  { id: 'white', hex: '#FFFFFF', short: 'WHITE', label: 'Neutral White Ink', neutral: true },
  { id: 'black', hex: '#111827', short: 'BLACK', label: 'Neutral Black Ink', neutral: true },
];

export function isDarkInkColor(hex) {
  const clean = String(hex || '').trim().replace(/^#/, '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return false;
  return 0.299 * r + 0.587 * g + 0.114 * b < 64;
}

export const MARKUP_TOOLS = [
  { id: 'pin', label: '① PIN', hint: 'Tap to drop numbered callout (or drag to point arrow)' },
  { id: 'circle', label: '⭕ CIRCLE', hint: 'Drag ellipse around target' },
  { id: 'rect', label: '▢ BOX', hint: 'Drag rectangle around target' },
  { id: 'arrow', label: '↘ ARROW', hint: 'Drag directional pointer arrow' },
  { id: 'pen', label: '🖍 PEN', hint: 'Draw freehand stroke' },
];

export function nextCalloutNumber(annotations) {
  if (!Array.isArray(annotations) || annotations.length === 0) return 1;
  let maxNum = 0;
  for (const item of annotations) {
    if (item?.type === 'pin' && typeof item.num === 'number' && item.num > maxNum) {
      maxNum = item.num;
    }
  }
  return maxNum + 1;
}

export function normalizeWindowsPathsInText(rawText) {
  const input = String(rawText || '');
  if (!input) return '';

  // Convert quoted Windows paths: "C:\Users\...\file name.png" -> "/mnt/c/Users/.../file name.png"
  const quotedReplaced = input.replace(/"([A-Za-z]):\\([^"\r\n]+)"/g, (_m, drive, rest) => {
    const posix = rest.replace(/\\+/g, '/');
    return `"/mnt/${drive.toLowerCase()}/${posix}"`;
  });

  // Convert unquoted Windows paths: C:\Users\...\file.png -> /mnt/c/Users/.../file.png
  return quotedReplaced.replace(/(^|\s|@)([A-Za-z]):\\([^\s"']+)/g, (_m, lead, drive, rest) => {
    const posix = rest.replace(/\\+/g, '/');
    return `${lead}/mnt/${drive.toLowerCase()}/${posix}`;
  });
}

const AT_IMAGE_REF_RE = /@(?:"(\/[^"\r\n]+\.(?:png|jpg|jpeg|webp|gif))"|(\/[^\s"']+\.(?:png|jpg|jpeg|webp|gif)))/gi;

export function extractOperatorTurnAttachments(rawUserText) {
  const text = String(rawUserText || '');
  if (!text) return { cleanText: '', attachments: [] };

  const attachments = [];
  const cleaned = text.replace(AT_IMAGE_REF_RE, (_full, quotedPath, plainPath) => {
    const filePath = quotedPath || plainPath || '';
    if (filePath) {
      const filename = filePath.split('/').pop() || 'screenshot.png';
      attachments.push({
        id: `att-${attachments.length}-${filename}`,
        filename,
        path: filePath,
        dims: '',
      });
    }
    return '';
  });

  return {
    cleanText: cleaned.replace(/[ \t]{2,}/g, ' ').trim(),
    attachments,
  };
}

function drawArrowSegment(ctx, x1, y1, x2, y2, color, lineWidth) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return;
  const angle = Math.atan2(dy, dx);
  const headLen = Math.max(14, lineWidth * 3.8);

  const drawPass = (strokeColor, widthBoost, fillColor) => {
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;
    ctx.lineWidth = lineWidth + widthBoost;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(angle) * (headLen * 0.55), y2 - Math.sin(angle) * (headLen * 0.55));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLen * Math.cos(angle - Math.PI / 6.2),
      y2 - headLen * Math.sin(angle - Math.PI / 6.2)
    );
    ctx.lineTo(
      x2 - headLen * Math.cos(angle + Math.PI / 6.2),
      y2 - headLen * Math.sin(angle + Math.PI / 6.2)
    );
    ctx.closePath();
    ctx.fill();
    if (widthBoost > 0) ctx.stroke();
    ctx.restore();
  };

  const haloColor = isDarkInkColor(color)
    ? 'rgba(255, 255, 255, 0.88)'
    : 'rgba(0, 0, 0, 0.72)';
  drawPass(haloColor, 3, haloColor);
  drawPass(color, 0, color);
}

export function drawAnnotationOnContext(ctx, ann, baseWidth = 1280) {
  if (!ctx || !ann) return;
  const scale = Math.max(0.85, Math.min(2.2, baseWidth / 1100));
  const strokeW = Math.round(3.6 * scale * 10) / 10;
  const color = ann.color || '#FF3B5C';
  const darkInk = isDarkInkColor(color);
  const haloStroke = darkInk ? 'rgba(255, 255, 255, 0.88)' : 'rgba(0, 0, 0, 0.68)';

  if (ann.type === 'pin') {
    const r = Math.round(15 * scale);
    const hasTail =
      typeof ann.x2 === 'number' &&
      typeof ann.y2 === 'number' &&
      Math.hypot(ann.x2 - ann.x, ann.y2 - ann.y) > r + 8;

    if (hasTail) {
      drawArrowSegment(ctx, ann.x, ann.y, ann.x2, ann.y2, color, strokeW);
    }

    ctx.save();
    ctx.shadowColor = darkInk ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 8 * scale;
    ctx.beginPath();
    ctx.arc(ann.x, ann.y, r, 0, Math.PI * 2);
    ctx.fillStyle = darkInk ? '#F8FAFC' : '#07090c';
    ctx.fill();
    ctx.lineWidth = Math.max(2.6, 2.8 * scale);
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `800 ${Math.round(13.5 * scale)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(ann.num || 1), ann.x, ann.y + 0.5);
    ctx.restore();
    return;
  }

  if (ann.type === 'arrow') {
    drawArrowSegment(ctx, ann.x1, ann.y1, ann.x2, ann.y2, color, strokeW * 1.15);
    return;
  }

  if (ann.type === 'circle') {
    const cx = (ann.x1 + ann.x2) / 2;
    const cy = (ann.y1 + ann.y2) / 2;
    const rx = Math.max(4, Math.abs(ann.x2 - ann.x1) / 2);
    const ry = Math.max(4, Math.abs(ann.y2 - ann.y1) / 2);
    for (const [col, extra] of [
      [haloStroke, 3],
      [color, 0],
    ]) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = col;
      ctx.lineWidth = strokeW + extra;
      ctx.stroke();
      ctx.restore();
    }
    return;
  }

  if (ann.type === 'rect') {
    const x = Math.min(ann.x1, ann.x2);
    const y = Math.min(ann.y1, ann.y2);
    const w = Math.max(4, Math.abs(ann.x2 - ann.x1));
    const h = Math.max(4, Math.abs(ann.y2 - ann.y1));
    for (const [col, extra] of [
      [haloStroke, 3],
      [color, 0],
    ]) {
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = strokeW + extra;
      ctx.lineJoin = 'round';
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }
    return;
  }

  if (ann.type === 'pen' && Array.isArray(ann.points) && ann.points.length > 0) {
    for (const [col, extra] of [
      [haloStroke, 2.8],
      [color, 0],
    ]) {
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = strokeW + extra;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(ann.points[0].x, ann.points[0].y);
      for (let i = 1; i < ann.points.length; i++) {
        ctx.lineTo(ann.points[i].x, ann.points[i].y);
      }
      if (ann.points.length === 1) {
        ctx.lineTo(ann.points[0].x + 0.5, ann.points[0].y + 0.5);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
}
