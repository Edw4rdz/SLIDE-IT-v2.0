import { useEffect, useCallback } from 'react';
import { getPollinationsImageUrl, saveDraft, clamp } from '../utils';

/**
 * Custom hook for managing sticker and image drag/resize/rotate interactions
 */
export const useStickerInteractions = ({
  draggingSticker,
  setDraggingSticker,
  resizingSticker,
  setResizingSticker,
  rotatingSticker,
  setRotatingSticker,
  draggingTextBox,
  setDraggingTextBox,
  resizingTextBox,
  setResizingTextBox,
  setEditedSlides,
  selectedSticker,
  setSelectedSticker,
  selectedImage,
  setSelectedImage,
  selectedTextBox,
  setSelectedTextBox,
  openStickerFor,
  setOpenStickerFor,
  setStickerSearchQuery,
  stickerAnchorRefs,
  topic,
  location,
  currentDesign,
  imageProvider
}) => {
  // Close sticker dropdown on outside click
  useEffect(() => {
    if (!openStickerFor) return;
    const onDocMouseDown = (e) => {
      const el = stickerAnchorRefs.current[openStickerFor];
      if (!el || !el.contains(e.target)) {
        setOpenStickerFor(null);
        setStickerSearchQuery("");
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [openStickerFor, setOpenStickerFor, setStickerSearchQuery, stickerAnchorRefs]);

  // Pointer events for drag/resize/rotate
  useEffect(() => {
    const onPointerMove = (ev) => {
      if (draggingSticker) {
        const { slideId, index, startX, startY, origX, origY, rect } = draggingSticker;
        const dx = (ev.clientX - startX) / rect.width;
        const dy = (ev.clientY - startY) / rect.height;
        
        setEditedSlides((prev) => prev.map((s) => {
          if (s.id !== slideId) return s;

          // Handle image dragging (index === -1)
          if (index === -1) {
            const imgData = s.imageData || { x: 0.55, y: 0.18, width: 0.4, height: 0.65 };
            const maxX = 1 - (imgData.width || 0.4);
            const maxY = 1 - (imgData.height || 0.65);
            const newX = clamp((origX !== undefined ? origX : 0.55) + dx, 0, maxX);
            const newY = clamp((origY !== undefined ? origY : 0.18) + dy, 0, maxY);
            return { ...s, imageData: { ...imgData, x: newX, y: newY } };
          }

          // Handle sticker dragging
          const arr = Array.isArray(s.stickers) ? [...s.stickers] : [];
          const g = { ...(arr[index] || {}) };
          const maxX = 1 - (g.width || 0.18);
          const maxY = 1 - (g.height || 0.18);
          g.x = clamp((origX !== undefined ? origX : 0) + dx, 0, maxX);
          g.y = clamp((origY !== undefined ? origY : 0) + dy, 0, maxY);
          arr[index] = g;
          return { ...s, stickers: arr };
        }));
        return;
      }

      if (resizingSticker) {
        const { slideId, index, startX, startY, origX, origY, origW, origH, rect, mode } = resizingSticker;
        const dx = (ev.clientX - startX) / rect.width;
        const dy = (ev.clientY - startY) / rect.height;
        
        setEditedSlides((prev) => prev.map((s) => {
          if (s.id !== slideId) return s;

          // Handle image resizing (index === -1)
          if (index === -1) {
            let x = origX !== undefined ? origX : 0.5;
            let y = origY !== undefined ? origY : 0.15;
            let w = origW || 0.4;
            let h = origH || 0.6;

            if (mode === 'se') { w = clamp(w + dx, 0.1, 1); h = clamp(h + dy, 0.1, 1); }
            if (mode === 'ne') { w = clamp(w + dx, 0.1, 1); y = clamp(y + dy, 0, 1 - h); h = clamp(h - dy, 0.1, 1); }
            if (mode === 'sw') { x = clamp(x + dx, 0, 1 - w); w = clamp(w - dx, 0.1, 1); h = clamp(h + dy, 0.1, 1); }
            if (mode === 'nw') { x = clamp(x + dx, 0, 1 - w); w = clamp(w - dx, 0.1, 1); y = clamp(y + dy, 0, 1 - h); h = clamp(h - dy, 0.1, 1); }

            return { ...s, imageData: { x, y, width: w, height: h } };
          }

          // Handle sticker resizing
          const arr = Array.isArray(s.stickers) ? [...s.stickers] : [];
          const g = { ...(arr[index] || {}) };
          let x = origX !== undefined ? origX : 0;
          let y = origY !== undefined ? origY : 0;
          let w = origW || 0.18;
          let h = origH || 0.18;
          
          if (mode === 'se') { w = clamp(w + dx, 0.04, 1); h = clamp(h + dy, 0.04, 1); }
          if (mode === 'ne') { w = clamp(w + dx, 0.04, 1); y = clamp(y + dy, 0, 1 - h); h = clamp(h - dy, 0.04, 1); }
          if (mode === 'sw') { x = clamp(x + dx, 0, 1 - w); w = clamp(w - dx, 0.04, 1); h = clamp(h + dy, 0.04, 1); }
          if (mode === 'nw') { x = clamp(x + dx, 0, 1 - w); y = clamp(y + dy, 0, 1 - h); w = clamp(w - dx, 0.04, 1); h = clamp(h - dy, 0.04, 1); }
          
          g.x = clamp(x, 0, 1 - w);
          g.y = clamp(y, 0, 1 - h);
          g.width = w;
          g.height = h;
          arr[index] = g;
          return { ...s, stickers: arr };
        }));
        return;
      }

      // Text Box dragging
      if (draggingTextBox) {
        const { slideId, type, startX, startY, origX, origY, origW, origH, rect } = draggingTextBox;
        const dx = (ev.clientX - startX) / rect.width;
        const dy = (ev.clientY - startY) / rect.height;
        
        setEditedSlides((prev) => prev.map((s) => {
          if (s.id !== slideId) return s;
          
          const boxKey = type === 'title' ? 'titleBox' : 'bodyBox';
          const defaultBox = type === 'title' 
            ? { x: 0.05, y: 0.0622, width: 0.9, height: 0.1778 } 
            : { x: 0.05, y: 0.2844, width: 0.9, height: 0.64 };
            
          const currentW = origW !== undefined ? origW : (s[boxKey]?.width || defaultBox.width);
          const currentH = origH !== undefined ? origH : (s[boxKey]?.height || defaultBox.height);

          const box = { ...(s[boxKey] || defaultBox) };
          box.width = currentW;
          box.height = currentH;

          const maxX = 1 - currentW;
          const maxY = 1 - currentH;
          
          box.x = clamp((origX !== undefined ? origX : defaultBox.x) + dx, 0, maxX);
          box.y = clamp((origY !== undefined ? origY : defaultBox.y) + dy, 0, maxY);
          
          return { ...s, [boxKey]: box };
        }));
        return;
      }

      // Text Box resizing
      if (resizingTextBox) {
        const { slideId, type, startX, origX, origY, origW, origH, origFontSize, rect, mode } = resizingTextBox;
        const dx = (ev.clientX - startX) / rect.width;
        
        setEditedSlides((prev) => prev.map((s) => {
          if (s.id !== slideId) return s;
          
          const boxKey = type === 'title' ? 'titleBox' : 'bodyBox';
          const defaultBox = type === 'title' 
            ? { x: 0.05, y: 0.0622, width: 0.9, height: 0.1778 } 
            : { x: 0.05, y: 0.2844, width: 0.9, height: 0.64 };
            
          let x = origX !== undefined ? origX : defaultBox.x;
          let y = origY !== undefined ? origY : defaultBox.y;
          let w = origW || defaultBox.width;
          let h = origH || defaultBox.height;

          // Corner resizing
          if (['nw', 'ne', 'se', 'sw'].includes(mode)) {
            if (mode === 'se' || mode === 'ne') w = clamp(w + dx, 0.1, 1);
            if (mode === 'sw' || mode === 'nw') {
              const newW = clamp(w - dx, 0.1, 1);
              x = clamp(x + (w - newW), 0, 1 - newW);
              w = newW;
            }
            
            const aspect = (origW || defaultBox.width) / (origH || defaultBox.height);
            const newH = w / aspect;
            
            if (mode === 'ne' || mode === 'nw') {
              y = clamp(y + (h - newH), 0, 1 - newH);
            }
            h = newH;
          } else {
            if (mode === 'e') { w = clamp(w + dx, 0.1, 1); }
            if (mode === 'w') { 
              const newW = clamp(w - dx, 0.1, 1);
              x = clamp(x + (w - newW), 0, 1 - newW);
              w = newW;
            }
          }
          
          const newBox = { ...(s[boxKey] || defaultBox) };
          newBox.x = clamp(x, 0, 1 - w);
          newBox.y = clamp(y, 0, 1 - h);
          newBox.width = w;
          newBox.height = h;

          const newStyles = { ...(s.styles || {}) };
          if (type === 'title') {
            if (['nw', 'ne', 'se', 'sw'].includes(mode) && origFontSize && origW) {
              const ratio = w / origW;
              const newSize = Math.max(8, Math.min(200, Math.round(origFontSize * ratio)));
              newStyles.titleSize = newSize;
            }
          } else {
            if (['nw', 'ne', 'se', 'sw'].includes(mode) && origFontSize && origW) {
              const ratio = w / origW;
              const newSize = Math.max(8, Math.min(200, Math.round(origFontSize * ratio)));
              newStyles.textSize = newSize;
            }
          }
          
          return { ...s, [boxKey]: newBox, styles: newStyles };
        }));
        return;
      }

      if (rotatingSticker) {
        const { slideId, index, centerX, centerY, startAngle, origRotate } = rotatingSticker;
        const angNow = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * (180 / Math.PI);
        const delta = angNow - startAngle;
        
        setEditedSlides((prev) => prev.map((s) => {
          if (s.id !== slideId) return s;
          const arr = Array.isArray(s.stickers) ? [...s.stickers] : [];
          const g = { ...(arr[index] || {}) };
          g.rotate = ((origRotate || 0) + delta) % 360;
          arr[index] = g;
          return { ...s, stickers: arr };
        }));
        return;
      }
    };

    const onPointerUp = () => {
      // Save draft when any drag/resize/rotate operation completes
      if (draggingSticker || resizingSticker || rotatingSticker || draggingTextBox || resizingTextBox) {
        setTimeout(() => {
          setEditedSlides((currentSlides) => {
            const convId = location.state?.convId || topic;
            saveDraft(currentSlides, topic, convId, currentDesign, imageProvider);
            return currentSlides;
          });
        }, 0);
      }
      
      setDraggingSticker(null);
      setResizingSticker(null);
      setRotatingSticker(null);
      setDraggingTextBox(null);
      setResizingTextBox(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [draggingSticker, resizingSticker, rotatingSticker, draggingTextBox, resizingTextBox, setEditedSlides, setDraggingSticker, setResizingSticker, setRotatingSticker, setDraggingTextBox, setResizingTextBox]);

  // Keyboard support: delete selected sticker
  useEffect(() => {
    if (!selectedSticker) return;
    const onKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { slideId, index } = selectedSticker;
        setEditedSlides((prev) => {
          const updated = prev.map((s) => {
            if (s.id !== slideId) return s;
            const arr = Array.isArray(s.stickers) ? [...s.stickers] : [];
            if (index >= 0 && index < arr.length) {
              arr.splice(index, 1);
            }
            return { ...s, stickers: arr };
          });
          // Schedule save after state update completes
          setTimeout(() => {
            const convId = location.state?.convId || topic;
            saveDraft(updated, topic, convId, currentDesign, imageProvider);
          }, 0);
          return updated;
        });
        setSelectedSticker(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedSticker, setSelectedSticker, setEditedSlides, topic, location, currentDesign, imageProvider]);

  // Deselect sticker on outside click
  useEffect(() => {
    if (!selectedSticker) return;
    const onPointerDownGlobal = (e) => {
      const inSticker = e.target.closest('[data-sticker-wrapper]');
      const inOptions = e.target.closest('[data-shape-options]');
      if (!inSticker && !inOptions) {
        setSelectedSticker(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDownGlobal, true);
    return () => document.removeEventListener('pointerdown', onPointerDownGlobal, true);
  }, [selectedSticker, setSelectedSticker]);

  // Deselect image on outside click
  useEffect(() => {
    if (!selectedImage) return;
    const onPointerDownGlobal = (e) => {
      const inImage = e.target.closest('[data-image-wrapper]');
      if (!inImage) {
        setSelectedImage(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDownGlobal, true);
    return () => document.removeEventListener('pointerdown', onPointerDownGlobal, true);
  }, [selectedImage, setSelectedImage]);

  // Deselect text box on outside click
  useEffect(() => {
    if (!selectedTextBox) return;
    const onPointerDownGlobal = (e) => {
      const inTextBox = e.target.closest('[data-textbox-wrapper]');
      const inToolbar = e.target.closest('[data-textbox-toolbar]');
      if (!inTextBox && !inToolbar) {
        setSelectedTextBox(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDownGlobal, true);
    return () => document.removeEventListener('pointerdown', onPointerDownGlobal, true);
  }, [selectedTextBox, setSelectedTextBox]);
};

export default useStickerInteractions;
