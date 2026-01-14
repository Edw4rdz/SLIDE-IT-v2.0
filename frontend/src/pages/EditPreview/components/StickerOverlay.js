import React from 'react';
import { buildShapeSvg, svgToDataUrl } from '../utils';

const StickerOverlay = ({
  slide,
  selectedSticker,
  setSelectedSticker,
  setSelectedImage,
  setDraggingSticker,
  setResizingSticker,
  setRotatingSticker,
  containerRefs,
  handleRemoveSticker,
  setEditedSlides
}) => {
  const s = slide;
  const stickers = s.stickers || [];

  return (
    <>
      {stickers.map((g, idx) => (
        <div
          key={`stk-${s.id}-${idx}`}
          data-sticker-wrapper
          onPointerDown={(ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            const rect = containerRefs.current[s.id]?.getBoundingClientRect() || { width: 1, height: 1 };
            try { ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
            setSelectedSticker({ slideId: s.id, index: idx });
            setSelectedImage(null);
            setDraggingSticker({ slideId: s.id, index: idx, startX: ev.clientX, startY: ev.clientY, origX: g.x || 0, origY: g.y || 0, rect, pointerId: ev.pointerId });
          }}
          onClick={(ev) => { ev.stopPropagation(); setSelectedSticker({ slideId: s.id, index: idx }); setSelectedImage(null); }}
          style={{
            position: 'absolute',
            left: `${(g.x || 0) * 100}%`,
            top: `${(g.y || 0) * 100}%`,
            width: `${(g.width || 0.18) * 100}%`,
            height: `${(g.height || 0.18) * 100}%`,
            transform: `rotate(${g.rotate || 0}deg)`,
            transformOrigin: 'top left',
            pointerEvents: 'auto',
            touchAction: 'none',
            cursor: 'move',
            zIndex: g.zIndex !== undefined ? g.zIndex : ((selectedSticker && selectedSticker.slideId === s.id && selectedSticker.index === idx) ? 100 : 20)
          }}
        >
          <img
            src={g.url}
            alt={g.type === 'shape' ? 'shape' : 'sticker'}
            style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' }}
            onError={(e) => { e.currentTarget.style.opacity = 0.3; }}
          />

          {/* Controls when selected */}
          {selectedSticker && selectedSticker.slideId === s.id && selectedSticker.index === idx && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
              {/* Remove button */}
              <button
                onPointerDown={(ev) => {
                  ev.stopPropagation();
                  ev.preventDefault();
                }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  ev.preventDefault();
                  handleRemoveSticker(s.id, idx);
                }}
                style={{ position: 'absolute', top: -28, right: -28, width: 28, height: 28, borderRadius: 14, border: 'none', background: '#ff4757', color: '#fff', cursor: 'pointer', pointerEvents: 'auto', zIndex: 30 }}
                title="Remove sticker (Del)"
              >×</button>

              {/* Rotate handle */}
              <div
                onPointerDown={(ev) => {
                  ev.stopPropagation();
                  ev.preventDefault();
                  const rect = containerRefs.current[s.id]?.getBoundingClientRect() || { left: 0, top: 0, width: 1, height: 1 };
                  const centerX = rect.left + ((g.x || 0) + (g.width || 0.18) / 2) * rect.width;
                  const centerY = rect.top + ((g.y || 0) + (g.height || 0.18) / 2) * rect.height;
                  const startAngle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * (180 / Math.PI);
                  try { ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
                  setRotatingSticker({ slideId: s.id, index: idx, startX: ev.clientX, startY: ev.clientY, centerX, centerY, startAngle, origRotate: g.rotate || 0, pointerId: ev.pointerId });
                }}
                style={{ position: 'absolute', top: -44, left: '50%', transform: 'translateX(-50%)', width: 28, height: 28, borderRadius: 14, background: '#fff', border: '2px solid rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', cursor: 'grab', zIndex: 30 }}
                title="Rotate"
              >
                ⟳
              </div>

              {/* Shape options panel */}
              {g.type === 'shape' && (
                <div
                  data-shape-options
                  style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translate(-50%, 12px)', background: '#fff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 10px', display: 'flex', gap: 12, alignItems: 'flex-start', pointerEvents: 'auto', zIndex: 200, boxShadow: '0 6px 18px rgba(0,0,0,0.25)', fontFamily: 'Inter, Arial, sans-serif', fontSize: 12 }}
                  onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onClick={(e) => { e.stopPropagation(); }}
                >
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, color: '#000', fontWeight: 500 }}>
                    <span>Fill</span>
                    <input
                      type="color"
                      value={g.fillColor}
                      onChange={(e) => {
                        const fill = e.target.value;
                        setEditedSlides(prev => prev.map(sl => {
                          if (sl.id !== s.id) return sl;
                          const arr = [...(sl.stickers || [])];
                          const target = arr[idx];
                          if (target.type === 'shape') {
                            const newSvg = buildShapeSvg(target.baseSvg, fill, target.strokeColor, target.strokeWidth);
                            target.fillColor = fill;
                            target.url = svgToDataUrl(newSvg);
                          }
                          return { ...sl, stickers: arr };
                        }));
                      }}
                      style={{ width: 44, height: 28, padding: 0, border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer' }}
                      onPointerDown={(e) => { e.stopPropagation(); }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, color: '#000', fontWeight: 500 }}>
                    <span>Stroke</span>
                    <input
                      type="color"
                      value={g.strokeColor}
                      onChange={(e) => {
                        const stroke = e.target.value;
                        setEditedSlides(prev => prev.map(sl => {
                          if (sl.id !== s.id) return sl;
                          const arr = [...(sl.stickers || [])];
                          const target = arr[idx];
                          if (target.type === 'shape') {
                            const newSvg = buildShapeSvg(target.baseSvg, target.fillColor, stroke, target.strokeWidth);
                            target.strokeColor = stroke;
                            target.url = svgToDataUrl(newSvg);
                          }
                          return { ...sl, stickers: arr };
                        }));
                      }}
                      style={{ width: 44, height: 28, padding: 0, border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer' }}
                      onPointerDown={(e) => { e.stopPropagation(); }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, minWidth: 120, color: '#000', fontWeight: 500 }}>
                    <span>Width</span>
                    <input
                      type="range"
                      min={0}
                      max={12}
                      value={g.strokeWidth}
                      onChange={(e) => {
                        const w = Number(e.target.value);
                        setEditedSlides(prev => prev.map(sl => {
                          if (sl.id !== s.id) return sl;
                          const arr = [...(sl.stickers || [])];
                          const target = arr[idx];
                          if (target.type === 'shape') {
                            const newSvg = buildShapeSvg(target.baseSvg, target.fillColor, target.strokeColor, w);
                            target.strokeWidth = w;
                            target.url = svgToDataUrl(newSvg);
                          }
                          return { ...sl, stickers: arr };
                        }));
                      }}
                      style={{ width: 110, cursor: 'pointer' }}
                      onPointerDown={(e) => { e.stopPropagation(); }}
                    />
                  </label>
                </div>
              )}

              {/* Corner handles */}
              {['nw', 'ne', 'se', 'sw'].map((mode) => {
                const pos = {
                  nw: { left: 0, top: 0, transform: 'translate(-50%,-50%)', cursor: 'nwse-resize' },
                  ne: { right: 0, top: 0, transform: 'translate(50%,-50%)', cursor: 'nesw-resize' },
                  se: { right: 0, bottom: 0, transform: 'translate(50%,50%)', cursor: 'nwse-resize' },
                  sw: { left: 0, bottom: 0, transform: 'translate(-50%,50%)', cursor: 'nesw-resize' },
                }[mode];
                return (
                  <div
                    key={mode}
                    onPointerDown={(ev) => {
                      ev.stopPropagation();
                      ev.preventDefault();
                      const rect = containerRefs.current[s.id]?.getBoundingClientRect() || { width: 1, height: 1 };
                      try { ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
                      setResizingSticker({ slideId: s.id, index: idx, mode, startX: ev.clientX, startY: ev.clientY, origX: g.x || 0, origY: g.y || 0, origW: g.width || 0.18, origH: g.height || 0.18, rect, pointerId: ev.pointerId });
                    }}
                    style={{ position: 'absolute', width: 18, height: 18, background: '#fff', border: '2px solid rgba(0,0,0,0.25)', borderRadius: 4, pointerEvents: 'auto', touchAction: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', zIndex: 25, ...pos }}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
    </>
  );
};

export default StickerOverlay;
