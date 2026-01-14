import React from 'react';
import { calculateBodyBox, getBulletLines } from '../utils';

const BodyBox = ({
  slide,
  theme,
  currentDesign,
  selectedTextBox,
  setSelectedTextBox,
  setSelectedSticker,
  setSelectedImage,
  setDraggingTextBox,
  setResizingTextBox,
  handleSlideChange,
  containerRefs
}) => {
  const s = slide;
  const bodyBox = calculateBodyBox(s);
  const isSelected = selectedTextBox?.slideId === s.id && selectedTextBox?.type === 'body';
  const isEditing = s.editingContent;

  const bulletLines = getBulletLines(s);
  const lineCount = Math.max(1, bulletLines.length);
  const containerRect = containerRefs.current[s.id]?.getBoundingClientRect();

  // Font size auto-shrink logic
  const bodyBoxHeightPx = containerRect ? containerRect.height * bodyBox.height : 300;
  const requestedFontSize =
    typeof s.styles?.textSize === 'number' && s.styles.textSize > 0
      ? s.styles.textSize
      : (s.layout || 'content') === 'title'
        ? 24
        : 18;

  const lineHeightEm = 1.2;
  const pxPerPoint = 1.33;
  const safeMinPt = 8;

  let autoFontSize = requestedFontSize;
  if (containerRect && lineCount > 0) {
    const maxPtThatFits = Math.floor(bodyBoxHeightPx / (lineCount * lineHeightEm * pxPerPoint));
    autoFontSize = Math.max(Math.min(requestedFontSize, maxPtThatFits), safeMinPt);
  }

  const textColor = s.textColor || theme.textColor || '#333';

  return (
    <div
      data-textbox-wrapper
      onPointerDown={(ev) => {
        if (isEditing) return;
        ev.stopPropagation();
        ev.preventDefault();
        const rect = containerRefs.current[s.id]?.getBoundingClientRect() || { width: 1, height: 1 };
        try { ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
        setSelectedTextBox({ slideId: s.id, type: 'body' });
        setSelectedSticker(null);
        setSelectedImage(null);
        setDraggingTextBox({ slideId: s.id, type: 'body', startX: ev.clientX, startY: ev.clientY, origX: bodyBox.x, origY: bodyBox.y, origW: bodyBox.width, origH: bodyBox.height, rect, pointerId: ev.pointerId });
      }}
      onClick={(ev) => {
        ev.stopPropagation();
        setSelectedTextBox({ slideId: s.id, type: 'body' });
        setSelectedSticker(null);
        setSelectedImage(null);
      }}
      onDoubleClick={(ev) => {
        ev.stopPropagation();
        handleSlideChange(s.id, 'editingContent', true);
      }}
      style={{
        position: 'absolute',
        left: `${bodyBox.x * 100}%`,
        top: `${bodyBox.y * 100}%`,
        width: `${bodyBox.width * 100}%`,
        height: `${bodyBox.height * 100}%`,
        zIndex: bodyBox.zIndex !== undefined ? bodyBox.zIndex : 100,
        border: 'none',
        cursor: isEditing ? 'text' : 'move',
        pointerEvents: 'auto'
      }}
    >
      <div
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={(e) => {
          const text = e.target.innerText;
          const lines = text.split('\n').filter(l => l.trim());
          handleSlideChange(s.id, 'bullets', lines);
          handleSlideChange(s.id, 'editingContent', false);
        }}
        style={{
          width: '100%',
          height: '100%',
          padding: '4px 8px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          color: textColor,
          fontFamily: s.styles?.textFont || theme.font,
          fontSize: `${autoFontSize}pt`,
          fontWeight: s.styles?.textBold ? 700 : 400,
          fontStyle: s.styles?.textItalic ? 'italic' : 'normal',
          textAlign: s.styles?.textAlign || 'left',
          lineHeight: 1.2,
          outline: 'none',
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          pointerEvents: isEditing ? 'auto' : 'none'
        }}
      >
        {bulletLines.length > 0 ? bulletLines.map(line => `• ${line}`).join('\n') : 'Click to add text'}
      </div>
      
      {isSelected && !isEditing && (
        <>
          <div style={{ position: 'absolute', inset: -2, border: '2px solid #8b5cf6', pointerEvents: 'none', zIndex: 10 }} />
          {['nw', 'ne', 'se', 'sw'].map(mode => {
            const style = {
              nw: { top: -5, left: -5, cursor: 'nwse-resize' },
              ne: { top: -5, right: -5, cursor: 'nesw-resize' },
              se: { bottom: -5, right: -5, cursor: 'nwse-resize' },
              sw: { bottom: -5, left: -5, cursor: 'nesw-resize' }
            }[mode];
            return (
              <div
                key={mode}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const rect = containerRefs.current[s.id]?.getBoundingClientRect() || { width: 1, height: 1 };
                  try { e.currentTarget.setPointerCapture(e.pointerId); } catch(err) {}
                  setResizingTextBox({ slideId: s.id, type: 'body', mode, startX: e.clientX, startY: e.clientY, origX: bodyBox.x, origY: bodyBox.y, origW: bodyBox.width, origH: bodyBox.height, origFontSize: s.styles?.textSize || 16, rect });
                }}
                style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#fff', border: '1px solid #8b5cf6', borderRadius: '50%', zIndex: 20, pointerEvents: 'auto', ...style }}
              />
            );
          })}
          {['w', 'e'].map(mode => {
            const style = {
              w: { top: '50%', left: -4, transform: 'translateY(-50%)', cursor: 'ew-resize', height: 16, width: 6, borderRadius: 4 },
              e: { top: '50%', right: -4, transform: 'translateY(-50%)', cursor: 'ew-resize', height: 16, width: 6, borderRadius: 4 }
            }[mode];
            return (
              <div
                key={mode}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const rect = containerRefs.current[s.id]?.getBoundingClientRect() || { width: 1, height: 1 };
                  try { e.currentTarget.setPointerCapture(e.pointerId); } catch(err) {}
                  setResizingTextBox({ slideId: s.id, type: 'body', mode, startX: e.clientX, startY: e.clientY, origX: bodyBox.x, origY: bodyBox.y, origW: bodyBox.width, origH: bodyBox.height, origFontSize: s.styles?.textSize || 16, rect });
                }}
                style={{ position: 'absolute', backgroundColor: '#fff', border: '1px solid #8b5cf6', zIndex: 20, pointerEvents: 'auto', ...style }}
              />
            );
          })}
        </>
      )}
    </div>
  );
};

export default BodyBox;
