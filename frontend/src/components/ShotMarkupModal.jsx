import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icons';
import {
  MARKUP_COLORS,
  MARKUP_TOOLS,
  drawAnnotationOnContext,
  nextCalloutNumber,
} from '../shotMarkupUtils';

export default function ShotMarkupModal({
  isOpen,
  attachment,
  onSaveAnnotated,
  onDownload,
  onClose,
}) {
  const [tool, setTool] = useState('pin');
  const [color, setColor] = useState(MARKUP_COLORS[0].hex);
  const [annotations, setAnnotations] = useState([]);
  const [draftAnn, setDraftAnn] = useState(null);
  const [imgReady, setImgReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const canvasRef = useRef(null);
  const imgObjRef = useRef(null);
  const pointerDownRef = useRef(false);

  // Load clean screenshot bytes via authenticated /api/file/raw
  useEffect(() => {
    if (!isOpen || !attachment?.path) return undefined;
    let cancelled = false;
    let blobUrl = '';
    setAnnotations([]);
    setDraftAnn(null);
    setImgReady(false);
    setErrMsg('');

    (async () => {
      try {
        const res = await fetch(`/api/file/raw?path=${encodeURIComponent(attachment.path)}`);
        if (!res.ok) {
          if (!cancelled) setErrMsg(`Failed to load screenshot (HTTP ${res.status})`);
          return;
        }
        const blob = await res.blob();
        blobUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          if (cancelled) return;
          imgObjRef.current = img;
          setImgReady(true);
        };
        img.onerror = () => {
          if (!cancelled) setErrMsg('Failed to decode screenshot PNG');
        };
        img.src = blobUrl;
      } catch (err) {
        if (!cancelled) setErrMsg(err.message || 'Failed to load screenshot');
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrl) {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {}
      }
    };
  }, [isOpen, attachment?.path]);

  const repaintCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgObjRef.current;
    if (!canvas || !img || !imgReady) return;
    const w = img.naturalWidth || img.width || 1280;
    const h = img.naturalHeight || img.height || 800;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    for (const ann of annotations) {
      drawAnnotationOnContext(ctx, ann, w);
    }
    if (draftAnn) {
      drawAnnotationOnContext(ctx, draftAnn, w);
    }
  }, [annotations, draftAnn, imgReady]);

  useEffect(() => {
    repaintCanvas();
  }, [repaintCanvas]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (ev) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        onClose?.();
      } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
        ev.preventDefault();
        setAnnotations((prev) => prev.slice(0, -1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const toImageCoords = (ev) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return {
      x: Math.max(0, Math.min(canvas.width, (ev.clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(canvas.height, (ev.clientY - rect.top) * scaleY)),
    };
  };

  const handlePointerDown = (ev) => {
    if (!imgReady) return;
    if (ev.button !== undefined && ev.button !== 0) return;
    ev.preventDefault();
    try {
      ev.currentTarget.setPointerCapture?.(ev.pointerId);
    } catch {}
    pointerDownRef.current = true;
    const pt = toImageCoords(ev);

    if (tool === 'pin') {
      const num = nextCalloutNumber(annotations);
      setDraftAnn({ type: 'pin', num, color, x: pt.x, y: pt.y, x2: pt.x, y2: pt.y });
    } else if (tool === 'pen') {
      setDraftAnn({ type: 'pen', color, points: [pt] });
    } else {
      setDraftAnn({ type: tool, color, x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
    }
  };

  const handlePointerMove = (ev) => {
    if (!pointerDownRef.current || !draftAnn) return;
    ev.preventDefault();
    const pt = toImageCoords(ev);
    setDraftAnn((prev) => {
      if (!prev) return null;
      if (prev.type === 'pen') {
        return { ...prev, points: [...prev.points, pt] };
      }
      return { ...prev, x2: pt.x, y2: pt.y };
    });
  };

  const handlePointerUp = (ev) => {
    if (!pointerDownRef.current) return;
    pointerDownRef.current = false;
    try {
      ev.currentTarget.releasePointerCapture?.(ev.pointerId);
    } catch {}
    if (draftAnn) {
      setAnnotations((prev) => [...prev, draftAnn]);
      setDraftAnn(null);
    }
  };

  const handleApplyAndSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !imgReady) return;
    setSaving(true);
    setErrMsg('');
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const baseSlug = (attachment?.filename || 'shot').replace(/\.png$/i, '');
      const res = await fetch('/api/browser/screenshot/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: dataUrl,
          label: baseSlug,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrMsg(data.detail || 'Failed to save marked screenshot');
        return;
      }
      onSaveAnnotated?.({
        ...attachment,
        filename: data.filename,
        path: data.path,
        dims: data.dims,
        annotated: true,
      });
      onClose?.();
    } catch (err) {
      setErrMsg(err.message || 'Failed to save marked screenshot');
    } finally {
      setSaving(false);
    }
  };

  const handleDirectDownload = () => {
    const canvas = canvasRef.current;
    if (canvas && imgReady && annotations.length > 0) {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `marked-${attachment?.filename || 'screenshot.png'}`;
      a.click();
      return;
    }
    onDownload?.(attachment);
  };

  if (!isOpen || !attachment) return null;

  const nextPinNum = nextCalloutNumber(annotations);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2300 }}>
      <div
        className="modal-card shot-markup-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shot-markup-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
              <Icon name="edit" size={14} />
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em' }}>
              VISUAL MARKUP STUDIO // {attachment.filename}
            </span>
            {attachment.dims && (
              <span className="mono-kbd" style={{ fontSize: '9.5px' }}>
                {attachment.dims}
              </span>
            )}
          </div>
          <button type="button" className="ghost-btn" onClick={onClose} title="Close Markup Studio">
            <Icon name="close" size={15} />
          </button>
        </div>

        <div className="shot-markup-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            {MARKUP_TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`subbar-util-btn ${tool === t.id ? 'active' : ''}`}
                onClick={() => setTool(t.id)}
                title={t.hint}
              >
                <span>{t.id === 'pin' ? `① PIN (#${nextPinNum})` : t.label}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            {MARKUP_COLORS.map((c) => {
              const selected = color === c.hex;
              const isBlack = c.id === 'black';
              const isWhite = c.id === 'white';
              const activeAccent = isBlack || isWhite ? 'var(--text-primary)' : c.hex;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`fav-chip ${selected ? 'active' : ''}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    borderColor: selected ? activeAccent : undefined,
                    color: selected ? activeAccent : undefined,
                  }}
                  onClick={() => setColor(c.hex)}
                  title={c.neutral ? c.label : `${c.short}: ${c.label}`}
                >
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: c.hex,
                      border: isBlack
                        ? '1px solid rgba(255, 255, 255, 0.5)'
                        : isWhite
                          ? '1px solid rgba(0, 0, 0, 0.35)'
                          : 'none',
                      boxShadow: selected && !isBlack ? `0 0 8px ${c.hex}` : 'none',
                    }}
                  />
                  <span>{c.short}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="fav-chip"
              disabled={annotations.length === 0}
              onClick={() => setAnnotations((prev) => prev.slice(0, -1))}
              title="Undo last mark (Ctrl+Z)"
            >
              UNDO
            </button>
            <button
              type="button"
              className="fav-chip"
              disabled={annotations.length === 0}
              onClick={() => setAnnotations([])}
              title="Clear all markings"
            >
              CLEAR
            </button>
            <button
              type="button"
              className="fav-chip"
              onClick={handleDirectDownload}
              title="Download PNG to your device"
            >
              <Icon name="downloadSm" size={11} />
              <span style={{ marginLeft: '4px' }}>SAVE PNG</span>
            </button>
            <button
              type="button"
              className="neon-cta-btn"
              style={{ height: '28px', padding: '0 12px', fontSize: '10.5px' }}
              disabled={!imgReady || saving}
              onClick={handleApplyAndSave}
            >
              <span>{saving ? 'SAVING...' : 'APPLY TO CHAT'}</span>
            </button>
          </div>
        </div>

        {errMsg && (
          <div style={{ padding: '6px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#f87171' }}>
            {errMsg}
          </div>
        )}

        <div className="shot-markup-stage">
          {!imgReady && !errMsg ? (
            <div className="fleet-empty-state">Loading full-resolution screenshot...</div>
          ) : (
            <canvas
              ref={canvasRef}
              className="shot-markup-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          )}
        </div>

        <div className="shot-markup-footer">
          <span>
            Tip: Drop <strong>① ② ③</strong> pins (drag before releasing to add a pointer arrow), then just type or speak <em>&quot;#1 fix padding, #2 remove border&quot;</em>.
          </span>
          <span>Red = Fix · Emerald = Keep · Cyan = Info · Amber = Move · White / Black = Neutral</span>
        </div>
      </div>
    </div>
  );
}
