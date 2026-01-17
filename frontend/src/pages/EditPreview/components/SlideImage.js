import React from 'react';
import { FaUpload, FaSearch } from 'react-icons/fa';
import { FALLBACK_IMAGE } from '../constants';
import { getPollinationsImageUrl } from '../utils';

const SlideImage = ({
  slide,
  selectedImage,
  setSelectedImage,
  setSelectedSticker,
  setDraggingSticker,
  setResizingSticker,
  previewImageUrls,
  containerRefs,
  handleImageUpload,
  handleRemoveImage,
  handleSlideChange,
  tempImagePrompts,
  setTempImagePrompts,
  promptTimeouts
}) => {
  const s = slide;
  const showImageColumn = true; // This is controlled by parent

  // Handle image error with retry logic
  const handleImageError = (e, slideId, imagePrompt) => {
    const maxRetries = 3;
    const currentRetries = parseInt(e.currentTarget?.dataset?.retries || '0', 10);
    if (currentRetries < maxRetries && imagePrompt) {
      if (e.currentTarget) e.currentTarget.dataset.retries = String(currentRetries + 1);
    } else if (e.currentTarget) {
      e.currentTarget.src = FALLBACK_IMAGE;
      e.currentTarget.onerror = null;
    }
  };

  if (s.removedImage || (!s.uploadedImage && !previewImageUrls[s.id])) {
    return null;
  }

  return (
    <div
      key={`img-${s.id}`}
      data-image-wrapper
      onPointerDown={(ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        const rect = containerRefs.current[s.id]?.getBoundingClientRect() || { width: 1, height: 1 };
        try { ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
        setSelectedImage(s.id);
        setSelectedSticker(null);

        const imgData = s.imageData || { x: 0.55, y: 0.18, width: 0.4, height: 0.65 };
        setDraggingSticker({
          slideId: s.id,
          index: -1,
          startX: ev.clientX,
          startY: ev.clientY,
          origX: imgData.x || 0.55,
          origY: imgData.y || 0.18,
          rect,
          pointerId: ev.pointerId
        });
      }}
      onClick={(ev) => {
        ev.stopPropagation();
        setSelectedImage(s.id);
        setSelectedSticker(null);
      }}
      style={{
        position: 'absolute',
        left: `${((s.imageData?.x || 0.55) * 100)}%`,
        top: `${((s.imageData?.y || 0.18) * 100)}%`,
        width: `${((s.imageData?.width || 0.4) * 100)}%`,
        height: `${((s.imageData?.height || 0.65) * 100)}%`,
        pointerEvents: 'auto',
        touchAction: 'none',
        cursor: 'move',
        borderRadius: '8px',
        overflow: 'visible',
        border: selectedImage === s.id ? '3px solid rgba(139, 92, 246, 0.9)' : '2px solid rgba(255, 255, 255, 0.5)',
        boxShadow: selectedImage === s.id ? '0 4px 12px rgba(139, 92, 246, 0.4)' : '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'border 0.2s, box-shadow 0.2s',
        zIndex: s.imageData?.zIndex !== undefined ? s.imageData.zIndex : (selectedImage === s.id ? 200 : 110)
      }}
    >
      {s.uploadedImage || previewImageUrls[s.id] ? (
        <img
          src={s.uploadedImage || previewImageUrls[s.id]}
          alt="Slide"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            userSelect: 'none',
            pointerEvents: 'none',
            borderRadius: '6px'
          }}
          onError={(e) => {
            if (s.uploadedImage) handleImageError(e);
            else handleImageError(e, s.id, s.imagePrompt);
          }}
        />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          background: 'rgba(255,255,255,0.15)',
          border: '2px dashed rgba(0,0,0,0.2)',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(0,0,0,0.5)',
          gap: 8
        }}>
          <FaUpload size={24} style={{ opacity: 0.5 }} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>No Image</span>
        </div>
      )}

      {/* Floating toolbar when image is selected */}
      {selectedImage === s.id && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '-80px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
            minWidth: '420px',
            zIndex: 1000,
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'nowrap',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {/* AI Prompt Input */}
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <FaSearch style={{ position: 'absolute', left: 10, color: '#94a3b8', fontSize: 16 }} />
            <input
              type="text"
              value={tempImagePrompts[s.id] !== undefined ? tempImagePrompts[s.id] : (s.imagePrompt || "")}
              onChange={(e) => {
                const val = e.target.value;
                setTempImagePrompts({ ...tempImagePrompts, [s.id]: val });
                if (promptTimeouts.current[s.id]) clearTimeout(promptTimeouts.current[s.id]);
                promptTimeouts.current[s.id] = setTimeout(() => {
                  handleSlideChange(s.id, 'imagePrompt', val);
                }, 1000);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.target.blur();
                }
              }}
              placeholder="AI image prompt..."
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '16px',
                color: '#f1f5f9',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.background = 'rgba(0,0,0,0.5)';
                e.target.style.borderColor = '#8b5cf6';
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(0,0,0,0.3)';
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                if (tempImagePrompts[s.id] !== undefined) {
                  handleSlideChange(s.id, 'imagePrompt', tempImagePrompts[s.id]);
                  setTempImagePrompts(prev => {
                    const next = { ...prev };
                    delete next[s.id];
                    return next;
                  });
                }
              }}
            />
          </div>

          <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

          {/* Upload Button */}
          <label
            htmlFor={`upload-${s.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: '#e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            title="Upload Image"
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#e2e8f0'; }}
          >
            <FaUpload size={16} />
          </label>
          <input
            type="file"
            id={`upload-${s.id}`}
            style={{ display: 'none' }}
            accept="image/png, image/jpeg, image/gif"
            onChange={(e) => handleImageUpload(e, s.id)}
          />

          {/* Delete Button */}
          <button
            onClick={() => {
              handleRemoveImage(s.id);
              setSelectedImage(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.3)'; e.currentTarget.style.color = '#fca5a5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.color = '#f87171'; }}
            title="Delete Image"
          >
            <span style={{ fontSize: 18 }}>×</span>
          </button>
        </div>
      )}

      {/* Resize handles when selected */}
      {selectedImage === s.id && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {[
            { mode: 'nw', cursor: 'nw-resize', pos: { top: -9, left: -9 } },
            { mode: 'ne', cursor: 'ne-resize', pos: { top: -9, right: -9 } },
            { mode: 'sw', cursor: 'sw-resize', pos: { bottom: -9, left: -9 } },
            { mode: 'se', cursor: 'se-resize', pos: { bottom: -9, right: -9 } }
          ].map(({ mode, cursor, pos }) => (
            <div
              key={mode}
              onPointerDown={(ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                const rect = containerRefs.current[s.id]?.getBoundingClientRect() || { width: 1, height: 1 };
                try { ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
                const imgData = s.imageData || { x: 0.55, y: 0.18, width: 0.4, height: 0.65 };
                setResizingSticker({
                  slideId: s.id,
                  index: -1,
                  mode,
                  startX: ev.clientX,
                  startY: ev.clientY,
                  origX: imgData.x || 0.55,
                  origY: imgData.y || 0.18,
                  origW: imgData.width || 0.4,
                  origH: imgData.height || 0.65,
                  rect,
                  pointerId: ev.pointerId
                });
              }}
              style={{
                position: 'absolute',
                width: 18,
                height: 18,
                background: '#fff',
                border: '2px solid rgb(139, 92, 246)',
                borderRadius: '50%',
                pointerEvents: 'auto',
                touchAction: 'none',
                cursor,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                zIndex: 25,
                ...pos
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SlideImage;
