import React from 'react';
import { calculateTitleBox } from '../utils';

const TitleBox = ({
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
  const titleBox = calculateTitleBox(s);
  const isSelected = selectedTextBox?.slideId === s.id && selectedTextBox?.type === 'title';
  const isEditing = s.editingTitle;

  // Match PPT defaults: title 44pt for title layout, else 32pt
  const baseTitleFontSize = (() => {
    if (typeof s.styles?.titleSize === 'number' && s.styles.titleSize > 0) return s.styles.titleSize;
    const layout = s.layout || 'content';
    return layout === 'title' ? 44 : 32;
  })();

  // Auto-shrink title font size for very long titles
  let autoTitleFontSize = baseTitleFontSize;
  try {
    const titleText = (s.title || 'Click to add title').trim();
    const approxLength = titleText.length;
    if (approxLength > 0) {
      const safeLength = 40;
      if (approxLength > safeLength) {
        const shrinkRatio = safeLength / approxLength;
        const estimated = Math.floor(baseTitleFontSize * shrinkRatio);
        autoTitleFontSize = Math.max(estimated, 14);
      }
    }
  } catch {
    autoTitleFontSize = baseTitleFontSize;
  }

  const titleColor = s.titleColor || theme.titleColor || '#000';

  return (
    <div
      data-textbox-wrapper
      onPointerDown={(ev) => {
        if (isEditing) return;
        ev.stopPropagation();
        ev.preventDefault();
        const rect = containerRefs.current[s.id]?.getBoundingClientRect() || { width: 1, height: 1 };
        try { ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
        setSelectedTextBox({ slideId: s.id, type: 'title' });
        setSelectedSticker(null);
        setSelectedImage(null);
        setDraggingTextBox({ slideId: s.id, type: 'title', startX: ev.clientX, startY: ev.clientY, origX: titleBox.x, origY: titleBox.y, origW: titleBox.width, origH: titleBox.height, rect, pointerId: ev.pointerId });
      }}
      onClick={(ev) => {
        ev.stopPropagation();
        setSelectedTextBox({ slideId: s.id, type: 'title' });
        setSelectedSticker(null);
        setSelectedImage(null);
      }}
      onDoubleClick={(ev) => {
        ev.stopPropagation();
        handleSlideChange(s.id, 'editingTitle', true);
      }}
      style={{
        position: 'absolute',
        left: `${titleBox.x * 100}%`,
        top: `${titleBox.y * 100}%`,
        width: `${titleBox.width * 100}%`,
        height: `${titleBox.height * 100}%`,
        zIndex: titleBox.zIndex !== undefined ? titleBox.zIndex : 100,
        border: 'none',
        cursor: isEditing ? 'text' : 'move',
        pointerEvents: 'auto'
      }}
    >
      <div
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={(e) => {
          handleSlideChange(s.id, 'title', e.target.textContent);
          handleSlideChange(s.id, 'editingTitle', false);
        }}
        style={{
          width: '100%',
          height: '100%',
          padding: '2px 6px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          color: titleColor,
          fontFamily: s.styles?.titleFont || theme.font,
          fontSize: `${autoTitleFontSize}pt`,
          fontWeight: s.styles?.titleBold ? 700 : 400,
          fontStyle: s.styles?.titleItalic ? 'italic' : 'normal',
          lineHeight: 1.0,
          outline: 'none',
          overflow: 'hidden',
          wordBreak: 'break-word',
          pointerEvents: isEditing ? 'auto' : 'none'
        }}
      >
        {s.title || 'Click to add title'}
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
                  setResizingTextBox({ slideId: s.id, type: 'title', mode, startX: e.clientX, startY: e.clientY, origX: titleBox.x, origY: titleBox.y, origW: titleBox.width, origH: titleBox.height, rect });
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
                  setResizingTextBox({ slideId: s.id, type: 'title', mode, startX: e.clientX, startY: e.clientY, origX: titleBox.x, origY: titleBox.y, origW: titleBox.width, origH: titleBox.height, rect });
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

export default TitleBox;
