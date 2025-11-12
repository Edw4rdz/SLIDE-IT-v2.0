// src/pages/EditPreview.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaDownload, FaArrowLeft, FaArrowRight, FaUpload, FaTimesCircle, FaSearch, FaAlignLeft, FaAlignCenter, FaAlignRight } from 'react-icons/fa';
import { getTemplates, downloadPPTX } from '../api';
import '../styles/edit-preview.css';



// Helper function (keep as is)
const getPollinationsImageUrl = (prompt) => {
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') return null;
  const encodedPrompt = encodeURIComponent(prompt.trim());
  return `https://image.pollinations.ai/prompt/${encodedPrompt}`;
};

export default function EditPreview() {
  const location = useLocation();
  const [slides, setSlides] = useState(location.state?.slides || []);
  const navigate = useNavigate();
  
  const initialSlides = (location.state?.slides || []).map((slide, index) => ({
    ...slide,
    id: slide.id ?? `slide-${index}-${Date.now()}`, 
    layout: index === 0 ? 'title' : 'content',
    uploadedImage: null, 
    // per-slide styles (editable via toolbar)
    styles: slide.styles || {
      titleFont: 'Arial',
      titleSize: 32,
      titleBold: false,
      titleItalic: false,
      textFont: 'Arial',
      textSize: 16,
      textBold: false,
      textItalic: false,
      textAlign: 'left'
    }
  }));
  const [editedSlides, setEditedSlides] = useState(initialSlides);
  const [topic, setTopic] = useState(location.state?.topic || 'My_Presentation');
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Stickers: picker, selection and interaction state
  const [openStickerFor, setOpenStickerFor] = useState(null); // slideId or null
  const [openTableFor, setOpenTableFor] = useState(null); // slideId or null
  const [selectedSticker, setSelectedSticker] = useState(null); // { slideId, index }
  const [draggingSticker, setDraggingSticker] = useState(null); // { slideId, index, startX, startY, origX, origY, rect }
  const [resizingSticker, setResizingSticker] = useState(null); // { slideId, index, mode, startX, startY, origX, origY, origW, origH, rect, origRotate }
  const [rotatingSticker, setRotatingSticker] = useState(null); // { slideId, index, startX, startY, centerX, centerY, startAngle, origRotate }
  const [selectedTable, setSelectedTable] = useState(null); // { slideId, index }
  const [draggingTable, setDraggingTable] = useState(null);
  const [resizingTable, setResizingTable] = useState(null);
  const containerRefs = useRef({});
  const stickerAnchorRefs = useRef({});
  // Download preview modal state
  const [showDownloadPreview, setShowDownloadPreview] = useState(false);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  
  // This state correctly reads the flag from the previous page
  const [showImageColumn, setShowImageColumn] = useState(location.state?.includeImages ?? true);
  
  const [currentDesign, setCurrentDesign] = useState({
    font: "Arial",
    globalBackground: "#ffffff",
    globalTitleColor: "#000000",
    globalTextColor: "#333333",
    layouts: {
      title: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" },
      content: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" }
    }
  });
 
  const [previewImageUrls, setPreviewImageUrls] = useState({});
  const [fetchingImages, setFetchingImages] = useState(true);
  
  // Manifest-driven stickers (will include shapes)
  const [stickerCategories, setStickerCategories] = useState([]);
  useEffect(() => {
    fetch('/stickers/manifest.json')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.categories)) setStickerCategories(data.categories);
      })
      .catch(e => console.warn('Sticker manifest load failed', e));
  }, []);

  // Close sticker dropdown on outside click
  useEffect(() => {
    if (!openStickerFor) return;
    const onDocMouseDown = (e) => {
      const el = stickerAnchorRefs.current[openStickerFor];
      if (!el || !el.contains(e.target)) {
        setOpenStickerFor(null);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [openStickerFor]);
  
  // All your functions (handleTemplateChange, useEffects, handleSlideChange, etc.)
  // are 100% correct and do not need to be changed.
  const handleTemplateChange = useCallback((templateId, availableTemplates) => {
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId('');
      setCurrentDesign({
        font: "Arial",
        globalBackground: "#ffffff",
        globalTitleColor: "#000000",
        globalTextColor: "#333333",
        layouts: {
          title: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" },
          content: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" }
        }
      });
      localStorage.removeItem('selectedTemplate');
      return;
    }
    const selected = availableTemplates.find((t) => t.id === templateId);
    if (selected && selected.design) {
      setSelectedTemplateId(templateId);
      const newDesign = { ...selected.design, id: selected.id };
      setCurrentDesign(newDesign);
      localStorage.setItem('selectedTemplate', JSON.stringify(newDesign));
    } else {
      console.warn("Selected template is missing 'design' object:", selected);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    const navigationDesign = location.state?.initialDesign;
    if (navigationDesign && navigationDesign.id) {
      console.log('Using initial design from navigation state:', navigationDesign);
      setCurrentDesign(navigationDesign);
      setSelectedTemplateId(navigationDesign.id);
    } else {
      console.log('No navigation state found, checking localStorage.');
      const saved = localStorage.getItem('selectedTemplate');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.id) { 
            setCurrentDesign(parsed);
            setSelectedTemplateId(parsed.id || '');
             console.log('Restored design from localStorage:', parsed);
          } else {
            console.log('Clearing invalid template from localStorage.');
            localStorage.removeItem('selectedTemplate');
          }
        } catch (e) {
           console.error('Error parsing localStorage template:', e);
          localStorage.removeItem('selectedTemplate');
        }
      } else {
         console.log('No selected template found in localStorage.');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    let isMounted = true;
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const res = await getTemplates();
        if (isMounted) {
          const fetchedTemplates = res.data || [];
          setTemplates(fetchedTemplates);
          const storedTemplate = JSON.parse(localStorage.getItem('selectedTemplate'));
          
          if (storedTemplate && storedTemplate.id && fetchedTemplates.find(t => t.id === storedTemplate.id)) {
            setCurrentDesign(storedTemplate);
            setSelectedTemplateId(storedTemplate.id);
          } else if (storedTemplate) {
            localStorage.removeItem('selectedTemplate');
          }
          
          setLoadingTemplates(false);
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
        if (isMounted) {
          setLoadingTemplates(false);
        }
      }
    };
    fetchTemplates();
    return () => {
      isMounted = false;
    };
  }, []); 

  useEffect(() => {
    if (editedSlides && editedSlides.length > 0 && showImageColumn) {
      setFetchingImages(true);
      const urls = {};
      editedSlides.forEach((slide) => {
        if (slide.id !== undefined) {
          if (slide.imagePrompt && !slide.uploadedImage) {
            urls[slide.id] = getPollinationsImageUrl(slide.imagePrompt);
          }
        } else {
          console.warn('Slide missing ID:', slide);
        }
      });
      setPreviewImageUrls(urls);
      setFetchingImages(false);
    } else {
      setFetchingImages(false);
      setPreviewImageUrls({});
    }
  }, [editedSlides, showImageColumn]); 

  // Clamp helper for safe positioning
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  // --- Shape helpers ---
  const buildShapeSvg = (baseSvg, fill, stroke, strokeWidth) => {
    if (!baseSvg) return '';
    // naive replace fill/stroke on path, rect, circle, polygon, line, ellipse
    const colorized = baseSvg
      .replace(/fill="[^"]*"/g, `fill="${fill}"`)
      .replace(/stroke="[^"]*"/g, `stroke="${stroke}"`)
      .replace(/stroke-width="[^"]*"/g, `stroke-width="${strokeWidth}"`);
    // ensure stroke attributes exist
    if (!/stroke=/.test(colorized)) {
      return colorized.replace(/<([a-zA-Z]+)([^>]*)>/, `<$1$2 stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}">`);
    }
    return colorized;
  };
  const svgToDataUrl = (svg) => `data:image/svg+xml;base64,${btoa(svg)}`;

  const isShapeUrl = (url) => /\/stickers\/shapes\//.test(url);

  // Normalize bullets/text into an array of lines for consistent preview
  const getBulletLines = (slide) => {
    if (!slide) return [];
    if (Array.isArray(slide.bullets)) return slide.bullets.filter(Boolean);
    const source = typeof slide.bullets === 'string' && slide.bullets.trim().length
      ? slide.bullets
      : (typeof slide.text === 'string' ? slide.text : '');
    return source
      .split(/\n|•/)
      .map(l => (l || '').trim())
      .filter(Boolean);
  };

  // Add sticker (image or shape)
  const handleAddSticker = async (slideId, url) => {
    if (isShapeUrl(url)) {
      try {
        const res = await fetch(url);
        const txt = await res.text();
        const fill = '#4A90E2';
        const stroke = '#1F3A60';
        const strokeWidth = 2;
        const colored = buildShapeSvg(txt, fill, stroke, strokeWidth);
        const dataUrl = svgToDataUrl(colored);
        setEditedSlides(prev => prev.map(s => {
          if (s.id !== slideId) return s;
          const added = { type: 'shape', baseSvg: txt, fillColor: fill, strokeColor: stroke, strokeWidth, url: dataUrl, x: 0.12, y: 0.12, width: 0.18, height: 0.18, rotate: 0 };
          return { ...s, stickers: [ ...(s.stickers || []), added ] };
        }));
      } catch (e) {
        console.warn('Failed to load shape svg', e);
      }
    } else {
      setEditedSlides((prev) => prev.map((s) => {
        if (s.id !== slideId) return s;
        const added = { type: 'image', url, x: 0.12, y: 0.12, width: 0.18, height: 0.18, opacity: 1, rotate: 0 };
        return { ...s, stickers: [ ...(s.stickers || []), added ] };
      }));
    }
    setOpenStickerFor(null);
  };

  const handleRemoveSticker = (slideId, index) => {
    console.log('[handleRemoveSticker] Called with:', { slideId, index });
    setEditedSlides((prev) => {
      let changed = false;
      const result = prev.map((s) => {
        if (s.id !== slideId) return s;
        const arr = Array.isArray(s.stickers) ? [...s.stickers] : [];
        if (index >= 0 && index < arr.length) {
          console.log('[handleRemoveSticker] Removing sticker at index:', index);
          arr.splice(index, 1);
          changed = true;
        }
        return { ...s, stickers: arr };
      });
      // If the sticker was deleted, also clear selection (force update)
      if (changed) {
        console.log('[handleRemoveSticker] Sticker removed. Clearing selection.');
        setTimeout(() => setSelectedSticker(null), 0);
      }
      return result;
    });
  };

  // Tables: quick add 3x3
  const handleAddTable = (slideId, rows = 3, cols = 3) => {
    setEditedSlides((prev) => prev.map((s) => {
      if (s.id !== slideId) return s;
      const added = { type: 'table', rows, cols, x: 0.14, y: 0.28, width: 0.5, height: 0.3, borderColor: '#333', borderWidth: 1, background: 'rgba(255,255,255,0.3)' };
      return { ...s, tables: [ ...(s.tables || []), added ] };
    }));
    setOpenTableFor(null);
  };

  const handleRemoveTable = (slideId, index) => {
    setEditedSlides((prev) => prev.map((s) => {
      if (s.id !== slideId) return s;
      const arr = Array.isArray(s.tables) ? [...s.tables] : [];
      arr.splice(index, 1);
      return { ...s, tables: arr };
    }));
    setSelectedTable(null);
  };

  // Global mouse handlers for drag/resize/rotate (mouse fallback)
  useEffect(() => {
    const onMove = (ev) => {
      if (draggingSticker) {
        const { slideId, index, startX, startY, origX, origY, rect } = draggingSticker;
        const dx = (ev.clientX - startX) / rect.width;
        const dy = (ev.clientY - startY) / rect.height;
        setEditedSlides((prev) => prev.map((s) => {
          if (s.id !== slideId) return s;
          const arr = Array.isArray(s.stickers) ? [...s.stickers] : [];
          const g = { ...(arr[index] || {}) };
          const maxX = 1 - (g.width || 0.18);
          const maxY = 1 - (g.height || 0.18);
          g.x = clamp((origX || 0) + dx, 0, maxX);
          g.y = clamp((origY || 0) + dy, 0, maxY);
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
          const arr = Array.isArray(s.stickers) ? [...s.stickers] : [];
          const g = { ...(arr[index] || {}) };
          let x = origX || 0, y = origY || 0, w = origW || 0.18, h = origH || 0.18;
          if (mode === 'se') { w = clamp(w + dx, 0.04, 1); h = clamp(h + dy, 0.04, 1); }
          if (mode === 'ne') { w = clamp(w + dx, 0.04, 1); y = clamp(y + dy, 0, 1 - h); h = clamp(h - dy, 0.04, 1); }
          if (mode === 'sw') { x = clamp(x + dx, 0, 1 - w); w = clamp(w - dx, 0.04, 1); h = clamp(h + dy, 0.04, 1); }
          if (mode === 'nw') { x = clamp(x + dx, 0, 1 - w); y = clamp(y + dy, 0, 1 - h); w = clamp(w - dx, 0.04, 1); h = clamp(h - dy, 0.04, 1); }
          g.x = clamp(x, 0, 1 - w);
          g.y = clamp(y, 0, 1 - h);
          g.width = w; g.height = h;
          arr[index] = g;
          return { ...s, stickers: arr };
        }));
      }
      // Rotation handling
      if (rotatingSticker) {
        const { slideId, index, centerX, centerY, startAngle, origRotate } = rotatingSticker;
        const cx = centerX;
        const cy = centerY;
        const angNow = Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI);
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
      // Table dragging
      if (draggingTable) {
        const { slideId, index, startX, startY, origX, origY, rect } = draggingTable;
        const dx = (ev.clientX - startX) / rect.width;
        const dy = (ev.clientY - startY) / rect.height;
        setEditedSlides((prev) => prev.map((s) => {
          if (s.id !== slideId) return s;
          const arr = Array.isArray(s.tables) ? [...s.tables] : [];
          const t = { ...(arr[index] || {}) };
          const maxX = 1 - (t.width || 0.5);
          const maxY = 1 - (t.height || 0.3);
          t.x = clamp((origX || 0) + dx, 0, maxX);
          t.y = clamp((origY || 0) + dy, 0, maxY);
          arr[index] = t;
          return { ...s, tables: arr };
        }));
        return;
      }
      // Table resizing
      if (resizingTable) {
        const { slideId, index, startX, startY, origX, origY, origW, origH, rect, mode } = resizingTable;
        const dx = (ev.clientX - startX) / rect.width;
        const dy = (ev.clientY - startY) / rect.height;
        setEditedSlides((prev) => prev.map((s) => {
          if (s.id !== slideId) return s;
          const arr = Array.isArray(s.tables) ? [...s.tables] : [];
          const t = { ...(arr[index] || {}) };
          let x = origX || 0, y = origY || 0, w = origW || 0.5, h = origH || 0.3;
          if (mode === 'se') { w = clamp(w + dx, 0.1, 1); h = clamp(h + dy, 0.1, 1); }
          if (mode === 'ne') { w = clamp(w + dx, 0.1, 1); y = clamp(y + dy, 0, 1 - h); h = clamp(h - dy, 0.1, 1); }
          if (mode === 'sw') { x = clamp(x + dx, 0, 1 - w); w = clamp(w - dx, 0.1, 1); h = clamp(h + dy, 0.1, 1); }
          if (mode === 'nw') { x = clamp(x + dx, 0, 1 - w); y = clamp(y + dy, 0, 1 - h); w = clamp(w - dx, 0.1, 1); h = clamp(h - dy, 0.1, 1); }
          t.x = clamp(x, 0, 1 - w);
          t.y = clamp(y, 0, 1 - h);
          t.width = w; t.height = h;
          arr[index] = t;
          return { ...s, tables: arr };
        }));
      }
    };
    const onUp = () => { setDraggingSticker(null); setResizingSticker(null); setRotatingSticker(null); setDraggingTable(null); setResizingTable(null); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [draggingSticker, resizingSticker, rotatingSticker, draggingTable, resizingTable]);

  // Pointer events (better reliability) - handles stickers AND tables
  useEffect(() => {
    const onPointerMove = (ev) => {
      if (draggingSticker) {
        const { slideId, index, startX, startY, origX, origY, rect } = draggingSticker;
        const dx = (ev.clientX - startX) / rect.width;
        const dy = (ev.clientY - startY) / rect.height;
        setEditedSlides((prev) => prev.map((s) => {
          if (s.id !== slideId) return s;
          const arr = Array.isArray(s.stickers) ? [...s.stickers] : [];
          const g = { ...(arr[index] || {}) };
          const maxX = 1 - (g.width || 0.18);
          const maxY = 1 - (g.height || 0.18);
          g.x = clamp((origX || 0) + dx, 0, maxX);
          g.y = clamp((origY || 0) + dy, 0, maxY);
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
          const arr = Array.isArray(s.stickers) ? [...s.stickers] : [];
          const g = { ...(arr[index] || {}) };
          let x = origX || 0, y = origY || 0, w = origW || 0.18, h = origH || 0.18;
          if (mode === 'se') { w = clamp(w + dx, 0.04, 1); h = clamp(h + dy, 0.04, 1); }
          if (mode === 'ne') { w = clamp(w + dx, 0.04, 1); y = clamp(y + dy, 0, 1 - h); h = clamp(h - dy, 0.04, 1); }
          if (mode === 'sw') { x = clamp(x + dx, 0, 1 - w); w = clamp(w - dx, 0.04, 1); h = clamp(h + dy, 0.04, 1); }
          if (mode === 'nw') { x = clamp(x + dx, 0, 1 - w); y = clamp(y + dy, 0, 1 - h); w = clamp(w - dx, 0.04, 1); h = clamp(h - dy, 0.04, 1); }
          g.x = clamp(x, 0, 1 - w);
          g.y = clamp(y, 0, 1 - h);
          g.width = w; g.height = h;
          arr[index] = g;
          return { ...s, stickers: arr };
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

      // Table dragging via pointer events
      if (draggingTable) {
        const { slideId, index, startX, startY, origX, origY, rect } = draggingTable;
        const dx = (ev.clientX - startX) / rect.width;
        const dy = (ev.clientY - startY) / rect.height;
        setEditedSlides((prev) => prev.map((s) => {
          if (s.id !== slideId) return s;
          const arr = Array.isArray(s.tables) ? [...s.tables] : [];
          const t = { ...(arr[index] || {}) };
          const maxX = 1 - (t.width || 0.5);
          const maxY = 1 - (t.height || 0.3);
          t.x = clamp((origX || 0) + dx, 0, maxX);
          t.y = clamp((origY || 0) + dy, 0, maxY);
          arr[index] = t;
          return { ...s, tables: arr };
        }));
        return;
      }
      // Table resizing via pointer events
      if (resizingTable) {
        const { slideId, index, startX, startY, origX, origY, origW, origH, rect, mode } = resizingTable;
        const dx = (ev.clientX - startX) / rect.width;
        const dy = (ev.clientY - startY) / rect.height;
        setEditedSlides((prev) => prev.map((s) => {
          if (s.id !== slideId) return s;
          const arr = Array.isArray(s.tables) ? [...s.tables] : [];
          const t = { ...(arr[index] || {}) };
          let x = origX || 0, y = origY || 0, w = origW || 0.5, h = origH || 0.3;
          if (mode === 'se') { w = clamp(w + dx, 0.1, 1); h = clamp(h + dy, 0.1, 1); }
          if (mode === 'ne') { w = clamp(w + dx, 0.1, 1); y = clamp(y + dy, 0, 1 - h); h = clamp(h - dy, 0.1, 1); }
          if (mode === 'sw') { x = clamp(x + dx, 0, 1 - w); w = clamp(w - dx, 0.1, 1); h = clamp(h + dy, 0.1, 1); }
          if (mode === 'nw') { x = clamp(x + dx, 0, 1 - w); y = clamp(y + dy, 0, 1 - h); w = clamp(w - dx, 0.1, 1); h = clamp(h - dy, 0.1, 1); }
          t.x = clamp(x, 0, 1 - w);
          t.y = clamp(y, 0, 1 - h);
          t.width = w; t.height = h;
          arr[index] = t;
          return { ...s, tables: arr };
        }));
        return;
      }
    };
    const onPointerUp = () => { setDraggingSticker(null); setResizingSticker(null); setRotatingSticker(null); setDraggingTable(null); setResizingTable(null); };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [draggingSticker, resizingSticker, rotatingSticker, draggingTable, resizingTable]);

  // Keyboard support: delete selected sticker with Delete/Backspace
  useEffect(() => {
    if (!selectedSticker) return;
    const onKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleRemoveSticker(selectedSticker.slideId, selectedSticker.index);
        setSelectedSticker(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedSticker]);

  // Deselect sticker on outside click (hide options panel when clicking anywhere else)
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
  }, [selectedSticker]);

  // Convert hex color like #RRGGBB or #RGB to rgba(...) with given alpha.
  const hexToRgba = (hex, alpha = 1) => {
    if (!hex || typeof hex !== 'string') return `rgba(0,0,0,${alpha})`;
    let h = hex.replace('#', '').trim();
    if (h.length === 3) {
      h = h.split('').map(c => c + c).join('');
    }
    if (h.length !== 6) return `rgba(0,0,0,${alpha})`;
    const r = parseInt(h.substring(0,2), 16);
    const g = parseInt(h.substring(2,4), 16);
    const b = parseInt(h.substring(4,6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  const handleSlideChange = (id, field, value) => {
    setEditedSlides((currentSlides) =>
      currentSlides.map((s) => {
        if (s.id === id) {
          let updatedSlide = {
            ...s,
            [field]: field === 'bullets' ? value.split('\n').map(b => b.trim()).filter(b => b) : value
          };
          if (field === 'imagePrompt') {
            updatedSlide.uploadedImage = null; 
          }
          return updatedSlide;
        }
        return s;
      })
    );
  };

  // Update per-slide style settings (font, size, bold, italic, align)
  const handleStyleChange = (slideId, key, value) => {
    setEditedSlides(currentSlides =>
      currentSlides.map(s => {
        if (s.id !== slideId) return s;
        const newStyles = { ...(s.styles || {}) };
        // Apply the change only to the specific style key for this slide.
        // Removed automatic propagation between title and text so each
        // control operates independently (title controls only title, etc.).
        newStyles[key] = value;
        return { ...s, styles: newStyles };
      })
    );
  };

  const handleImageUpload = (event, slideId) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setEditedSlides(currentSlides =>
          currentSlides.map(s =>
            s.id === slideId ? { ...s, uploadedImage: base64String, imagePrompt: "" } : s
          )
        );
      };
      reader.readAsDataURL(file);
    }
    event.target.value = null;
  };

  const handleRemoveImage = (slideId) => {
    setEditedSlides(currentSlides =>
      currentSlides.map(s =>
        s.id === slideId ? { ...s, uploadedImage: null, imagePrompt: "" } : s
      )
    );
  };
    // ➕ Add a new blank slide
  const handleAddSlide = () => {
    const newSlide = {
      id: `slide-${Date.now()}`,
      title: "New Slide",
      bullets: ["New point 1", "New point 2"],
      layout: "content",
      uploadedImage: null,
      imagePrompt: "",
      styles: {
        titleFont: currentDesign.font || 'Arial',
        titleSize: 32,
        titleBold: false,
        titleItalic: false,
        textFont: currentDesign.font || 'Arial',
        textSize: 16,
        textBold: false,
        textItalic: false,
        textAlign: 'left'
      }
    };
    setEditedSlides(prev => [...prev, newSlide]);
  };

  // ❌ Delete a slide by ID
  const handleDeleteSlide = (slideId) => {
    if (window.confirm("Are you sure you want to delete this slide?")) {
      setEditedSlides(prev => prev.filter(s => s.id !== slideId));
    }
  };

  // ✅ --- THIS FUNCTION IS UPDATED --- ✅
  const handleDownload = () => {
    if (!editedSlides.length) return alert("No slides to download!");
    const sanitizedTopic = topic.replace(/[\s/\\?%*:|"<>]/g, "_");
    const fileName = `${sanitizedTopic}_presentation.pptx`;
    
    const activeDesign = selectedTemplateId ? currentDesign : {
      font: "Arial",
      globalBackground: "#ffffff",
      globalTitleColor: "#000000",
      globalTextColor: "#333333",
      layouts: {
        title: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" },
        content: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" }
      }
    };
    
    // Pass the 'showImageColumn' flag to the download function
    downloadPPTX(editedSlides, activeDesign, fileName, showImageColumn);
  };

  const openPreviewModal = () => {
    if (!editedSlides.length) return;
    setPreviewSlideIndex(0);
    setShowDownloadPreview(true);
  };
  const closePreviewModal = () => setShowDownloadPreview(false);
  const gotoPrevPreview = () => setPreviewSlideIndex(i => Math.max(0, i - 1));
  const gotoNextPreview = () => setPreviewSlideIndex(i => Math.min(editedSlides.length - 1, i + 1));

  if (!location.state?.slides && editedSlides.length === 0) return <div className="loading-message">Loading slide data... Please wait.</div>;

  // --- The rest of your JSX is 100% correct and unchanged ---
  // build slides JSX outside return to simplify JSX parsing
  const slidesJSX = editedSlides.map((s, index) => {
    // ... (theme logic is unchanged)
    const slideLayout = s.layout || 'content';
    const layoutStyles = currentDesign.layouts?.[slideLayout] || {};
    const theme = {
      background: layoutStyles.background || currentDesign.globalBackground,
      titleColor: layoutStyles.titleColor || currentDesign.globalTitleColor,
      textColor: layoutStyles.textColor || currentDesign.globalTextColor,
      font: currentDesign.font || 'Arial',
    };
    let previewStyle = {
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
    if (Array.isArray(theme.background)) {
      previewStyle.backgroundImage = `linear-gradient(135deg, ${theme.background.join(', ')})`;
    } else if (typeof theme.background === 'string' && theme.background.startsWith('http')) {
      previewStyle.backgroundImage = `url(${theme.background})`;
    } else {
      previewStyle.backgroundColor = theme.background || '#FFFFFF';
    }

    return (
      <div key={s.id} className="slide-wrapper" style={{width: '100%'}}>
        {/* Toolbar rendered outside (above) the slide card to preserve UI */}
        <div
          className="slide-toolbar-outside"
          role="toolbar"
          aria-label="Slide text styling"
          style={{
            background: hexToRgba(theme.titleColor || currentDesign.globalTitleColor, 0.12),
            borderColor: hexToRgba(theme.titleColor || currentDesign.globalTitleColor, 0.08)
          }}
        >
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <label style={{fontSize:12}}>Title:</label>
            <select value={s.styles?.titleFont || 'Arial'} onChange={(e) => handleStyleChange(s.id, 'titleFont', e.target.value)}>
              <option>Arial</option>
              <option>Inter</option>
              <option>Georgia</option>
              <option>Times New Roman</option>
              <option>Courier New</option>
            </select>
            <input type="number" value={s.styles?.titleSize || 32} min={10} max={80} style={{width:64}} onChange={(e) => handleStyleChange(s.id, 'titleSize', Number(e.target.value))} />
            <button className="toolbar-button" onClick={() => handleStyleChange(s.id, 'titleBold', !s.styles?.titleBold)} style={{fontWeight: s.styles?.titleBold ? 700 : 400}}>B</button>
            <button className="toolbar-button" onClick={() => handleStyleChange(s.id, 'titleItalic', !s.styles?.titleItalic)} style={{fontStyle: s.styles?.titleItalic ? 'italic' : 'normal'}}>I</button>
          </div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <label style={{fontSize:12}}>Text:</label>
            <select value={s.styles?.textFont || 'Arial'} onChange={(e) => handleStyleChange(s.id, 'textFont', e.target.value)}>
              <option>Arial</option>
              <option>Inter</option>
              <option>Georgia</option>
              <option>Times New Roman</option>
              <option>Courier New</option>
            </select>
            <input type="number" value={s.styles?.textSize || 16} min={8} max={48} style={{width:56}} onChange={(e) => handleStyleChange(s.id, 'textSize', Number(e.target.value))} />
            <button className="toolbar-button" onClick={() => handleStyleChange(s.id, 'textBold', !s.styles?.textBold)} style={{fontWeight: s.styles?.textBold ? 700 : 400}}>B</button>
            <button className="toolbar-button" onClick={() => handleStyleChange(s.id, 'textItalic', !s.styles?.textItalic)} style={{fontStyle: s.styles?.textItalic ? 'italic' : 'normal'}}>I</button>
            <button
              className="toolbar-button"
              aria-label="Align left"
              title="Align left"
              onClick={() => handleStyleChange(s.id, 'textAlign', 'left')}
              style={{
                background: (s.styles?.textAlign || 'left') === 'left' ? '#2e2e2e' : 'transparent',
                borderColor: (s.styles?.textAlign || 'left') === 'left' ? '#555' : undefined
              }}
            >
              <FaAlignLeft />
            </button>
            <button
              className="toolbar-button"
              aria-label="Align center"
              title="Align center"
              onClick={() => handleStyleChange(s.id, 'textAlign', 'center')}
              style={{
                background: s.styles?.textAlign === 'center' ? '#2e2e2e' : 'transparent',
                borderColor: s.styles?.textAlign === 'center' ? '#555' : undefined
              }}
            >
              <FaAlignCenter />
            </button>
            <button
              className="toolbar-button"
              aria-label="Align right"
              title="Align right"
              onClick={() => handleStyleChange(s.id, 'textAlign', 'right')}
              style={{
                background: s.styles?.textAlign === 'right' ? '#2e2e2e' : 'transparent',
                borderColor: s.styles?.textAlign === 'right' ? '#555' : undefined
              }}
            >
              <FaAlignRight />
            </button>
          </div>
          {/* Right-aligned actions: Stickers & Table */}
          <div style={{marginLeft:'auto', display:'flex', gap:8, alignItems:'center'}}>
            <div
              ref={(el) => { if (el) stickerAnchorRefs.current[s.id] = el; }}
              style={{ position:'relative', display:'inline-block' }}
            >
              <button className="toolbar-button" onClick={() => setOpenStickerFor(openStickerFor === s.id ? null : s.id)}>
                🧩 Stickers
              </button>
              {openStickerFor === s.id && (
                <div
                  style={{ position:'absolute', top:'100%', left:0, marginTop:6, background:'#fff', border:'1px solid rgba(0,0,0,0.12)', borderRadius:10, padding:8, display:'grid', gridTemplateColumns:'repeat(6, 40px)', gap:6, zIndex:1000, maxHeight:220, overflowY:'auto', boxShadow:'0 4px 12px rgba(0,0,0,0.12)' }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {stickerCategories.flatMap(cat => cat.items.map(item => ({cat: cat.name, item}))).map(({cat,item},i) => {
                    const full = `/stickers/${cat}/${item}`;
                    return <img key={i} src={full} alt={`st-${i}`} onClick={() => handleAddSticker(s.id, full)} style={{ width: 40, height: 40, objectFit: 'contain', cursor: 'pointer' }} onError={(e)=>{ e.currentTarget.style.opacity = 0.3; }} />
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="slide-preview-card gamma-style" 
          style={{...previewStyle, color: theme.textColor, fontFamily: theme.font}}
        >
         {/* 🗑 DELETE BUTTON (Top right of each slide) */}
          <button
            className="delete-slide-btn"
            onClick={() => handleDeleteSlide(s.id)}
            title="Delete this slide"
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              backgroundColor: theme.titleColor,
              color: theme.background,
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            ×
          </button>
          <div className="slide-content-area">
            <div className="form-group">
              <label htmlFor={`title-${s.id}`} className="sr-only">Slide Title</label>
              <input
                id={`title-${s.id}`}
                type="text"
                className="form-control-title-preview"
                value={s.title || ''}
                onChange={(e) => handleSlideChange(s.id, 'title', e.target.value)}
                style={{
                  color: theme.titleColor,
                  fontFamily: s.styles?.titleFont || theme.font,
                  borderColor: theme.titleColor,
                  fontSize: `${s.styles?.titleSize || 32}px`,
                  fontWeight: s.styles?.titleBold ? 700 : 400,
                  fontStyle: s.styles?.titleItalic ? 'italic' : 'normal'
                }}
                placeholder="Type your title..."
              />
            </div>
            <div className="form-group">
              <label htmlFor={`bullets-${s.id}`} className="sr-only">Slide Bullets</label>
              <textarea
                id={`bullets-${s.id}`}
                className="form-control-bullets-preview"
                value={(s.bullets || []).join('\n')}
                onChange={(e) => handleSlideChange(s.id, 'bullets', e.target.value)}
                rows={8}
                style={{
                  color: theme.textColor,
                  fontFamily: s.styles?.textFont || theme.font,
                  borderColor: theme.textColor,
                  fontSize: `${s.styles?.textSize || 16}px`,
                  fontWeight: s.styles?.textBold ? 700 : 400,
                  fontStyle: s.styles?.textItalic ? 'italic' : 'normal',
                  textAlign: s.styles?.textAlign || 'left'
                }}
                placeholder="Type your bullet points (one per line)..."
              />
            </div>
          </div>
          {/* Image prompt / upload controls + preview are inside the slide card */}
          {showImageColumn && (
            <div className="slide-image-prompt-area" style={{ borderColor: theme.textColor, color: theme.textColor }}>
              <div className="form-group">
                <label htmlFor={`imagePrompt-${s.id}`} style={{ color: theme.titleColor, fontWeight: 'bold' }}>
                  AI Image Prompt
                </label>
                <input
                  id={`imagePrompt-${s.id}`}
                  type="text"
                  className="image-prompt-input"
                  value={s.imagePrompt || ""}
                  onChange={(e) => handleSlideChange(s.id, "imagePrompt", e.target.value)}
                  style={{
                    fontFamily: theme.font,
                    color: theme.textColor,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: `1px solid ${theme.textColor}`,
                    borderRadius: '8px',
                    width: '100%',
                    padding: '10px',
                    marginTop: '5px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Describe an AI image..."
                />
              </div>

              <div className="image-buttons-container">
                <label htmlFor={`upload-${s.id}`} className="upload-image-btn">
                  <FaUpload /> Upload
                </label>
                <input 
                  type="file" 
                  id={`upload-${s.id}`}
                  className="hidden-file-input"
                  accept="image/png, image/jpeg, image/gif"
                  onChange={(e) => handleImageUpload(e, s.id)}
                />
                {(s.uploadedImage || s.imagePrompt) && (
                  <button 
                    className="remove-image-btn"
                    onClick={() => handleRemoveImage(s.id)}
                  >
                    <FaTimesCircle /> Pure Text
                  </button>
                )}
              </div>

              <div className="image-preview-container" style={{marginTop:12}}>
                {s.uploadedImage ? (
                  <img
                    key={s.id}
                    src={s.uploadedImage}
                    alt="User upload"
                    className="preview-image loaded"
                    style={{ opacity: 1, objectFit: 'cover' }}
                  />
                ) : fetchingImages && previewImageUrls[s.id] === undefined && s.imagePrompt ? (
                  <p className="loading-text">Generating...</p>
                ) : previewImageUrls[s.id] ? (
                  <img
                    key={previewImageUrls[s.id]}
                    src={previewImageUrls[s.id]}
                    alt={`AI prompt: ${s.imagePrompt || s.title}`}
                    className="preview-image loaded"
                    style={{ opacity: 1 }}
                    onLoad={(e) => e.target.classList.add('loaded')}
                  />
                ) : (
                  <p className="no-image-text">(No image prompt or upload)</p>
                )}
              </div>
            </div>
          )}

          {/* Tables disabled for now */}

          {/* Stickers overlay container */}
          <div
            ref={(el) => { if (el) containerRefs.current[s.id] = el; }}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100 }}
          >
            {(s.stickers || []).map((g, idx) => (
              <div
                key={`stk-${s.id}-${idx}`}
                data-sticker-wrapper
                onPointerDown={(ev) => {
                  ev.stopPropagation();
                  ev.preventDefault();
                  const rect = containerRefs.current[s.id]?.getBoundingClientRect() || { width: 1, height: 1 };
                  console.log('[Sticker] pointerDown', { slideId: s.id, index: idx, clientX: ev.clientX, clientY: ev.clientY, rect });
                  try { ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) { console.warn('pointerCapture failed', e); }
                  setSelectedSticker({ slideId: s.id, index: idx });
                  setDraggingSticker({ slideId: s.id, index: idx, startX: ev.clientX, startY: ev.clientY, origX: g.x || 0, origY: g.y || 0, rect, pointerId: ev.pointerId });
                }}
                onClick={(ev) => { ev.stopPropagation(); setSelectedSticker({ slideId: s.id, index: idx }); }}
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
                }}
              >
                {g.type === 'shape' ? (
                  <img
                    src={g.url}
                    alt="shape"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' }}
                    onError={(e) => { e.currentTarget.style.opacity = 0.3; }}
                  />
                ) : (
                  <img
                    src={g.url}
                    alt="sticker"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' }}
                    onError={(e) => { e.currentTarget.style.opacity = 0.3; }}
                  />
                )}

                {/* Controls when selected */}
                {selectedSticker && selectedSticker.slideId === s.id && selectedSticker.index === idx && (
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
                    {/* Remove button */}
                    <button
                      onPointerDown={(ev) => {
                        // Prevent parent sticker wrapper from starting a drag via its onPointerDown
                        ev.stopPropagation();
                        ev.preventDefault();
                      }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        ev.preventDefault();
                        console.log('[Sticker] REMOVE', { slideId: s.id, idx });
                        handleRemoveSticker(s.id, idx);
                      }}
                      style={{ position: 'absolute', top: -28, right: -28, width: 28, height: 28, borderRadius: 14, border: 'none', background: '#ff4757', color: '#fff', cursor: 'pointer', pointerEvents: 'auto', zIndex: 30 }}
                      title="Remove sticker (Del)"
                    >×</button>
                        {/* Rotate handle (pointer down to start rotating) */}
                        <div
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            ev.preventDefault();
                            const rect = containerRefs.current[s.id]?.getBoundingClientRect() || { left: 0, top: 0, width: 1, height: 1 };
                            const centerX = rect.left + ((g.x || 0) + (g.width || 0.18) / 2) * rect.width;
                            const centerY = rect.top + ((g.y || 0) + (g.height || 0.18) / 2) * rect.height;
                            const startAngle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * (180 / Math.PI);
                            console.log('[Sticker] rotate pointerDown', { slideId: s.id, index: idx, centerX, centerY, startAngle, origRotate: g.rotate || 0 });
                            try { ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) { console.warn('rotate pointerCapture failed', e); }
                            setRotatingSticker({ slideId: s.id, index: idx, startX: ev.clientX, startY: ev.clientY, centerX, centerY, startAngle, origRotate: g.rotate || 0, pointerId: ev.pointerId });
                          }}
                          style={{ position: 'absolute', top: -44, left: '50%', transform: 'translateX(-50%)', width: 28, height: 28, borderRadius: 14, background: '#fff', border: '2px solid rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', cursor: 'grab', zIndex: 30 }}
                          title="Rotate"
                        >
                          ⟳
                        </div>
                    {g.type === 'shape' && (
                      <div
                        data-shape-options
                        style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translate(-50%, 12px)', background: '#fff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 10px', display: 'flex', gap: 12, alignItems: 'flex-start', pointerEvents: 'auto', zIndex: 200, boxShadow: '0 6px 18px rgba(0,0,0,0.25)', fontFamily: 'Inter, Arial, sans-serif', fontSize: 12 }}
                        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        onClick={(e) => { e.stopPropagation(); }}
                      >
                        <label style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:4, color:'#000', fontWeight:500 }}>
                          <span>Fill</span>
                          <input type="color" value={g.fillColor} onChange={(e) => {
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
                        }} style={{ width: 44, height: 28, padding:0, border:'1px solid #ccc', borderRadius:4, background:'#fff', cursor:'pointer' }} onPointerDown={(e) => { e.stopPropagation(); }} />
                        </label>
                        <label style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:4, color:'#000', fontWeight:500 }}>
                          <span>Stroke</span>
                          <input type="color" value={g.strokeColor} onChange={(e) => {
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
                        }} style={{ width: 44, height: 28, padding:0, border:'1px solid #ccc', borderRadius:4, background:'#fff', cursor:'pointer' }} onPointerDown={(e) => { e.stopPropagation(); }} />
                        </label>
                        <label style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:4, minWidth:120, color:'#000', fontWeight:500 }}>
                          <span>Width</span>
                          <input type="range" min={0} max={12} value={g.strokeWidth} onChange={(e) => {
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
                        }} onInput={(e) => {
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
                        }} style={{ width: 110, cursor:'pointer' }} onPointerDown={(e) => { e.stopPropagation(); }} />
                        </label>
                      </div>
                    )}
                    {/* Corner handles */}
                    {['nw','ne','se','sw'].map((mode) => {
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
                            console.log('[Sticker] resize pointerDown', { slideId: s.id, index: idx, mode, clientX: ev.clientX, clientY: ev.clientY, rect });
                            try { ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) { console.warn('resize pointerCapture failed', e); }
                            setResizingSticker({ slideId: s.id, index: idx, mode, startX: ev.clientX, startY: ev.clientY, origX: g.x || 0, origY: g.y || 0, origW: g.width || 0.18, origH: g.height || 0.18, rect, pointerId: ev.pointerId });
                          }}
                          style={{ position: 'absolute', width: 18, height: 18, background: '#fff', border: `2px solid rgba(0,0,0,0.25)`, borderRadius: 4, pointerEvents: 'auto', touchAction: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', zIndex: 25, ...pos }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom-left floating sticker picker removed; dropdown lives under the toolbar button */}
        </div>
      </div>
    );
  });

  return (
    <div className="edit-preview-wrapper">
      <motion.aside
        className="sidebar-glass"
        initial={{ marginLeft: 0, opacity: 1 }} 
        animate={{ marginLeft: isSidebarOpen ? 0 : -280, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="sidebar-content-wrapper">
          <div className="sidebar-header">
            <h2>🎨 Templates</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="sidebar-toggle">
              <FaArrowLeft />
            </button>
          </div>
          
          {loadingTemplates ? (
            <p className="loading">Loading templates...</p>
          ) : templates.length > 0 ? (
            <div className="template-gallery">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className={`template-item ${
                    selectedTemplateId === tpl.id ? 'selected' : ''
                  }`}
                  onClick={() => handleTemplateChange(tpl.id, templates)}
                >
                  <img src={tpl.thumbnail} alt={tpl.name} />
                  <p>{tpl.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No pre-built templates found.</p>
          )}
        </div>
      </motion.aside>

      <div className="main-content">
        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)} className="sidebar-toggle-open">
            <FaArrowRight />
          </button>
        )}

        <motion.header
          className="header-glass"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <h1>Edit & Preview Your Slides</h1>
          <div className="header-actions">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="topic-edit-input"
              aria-label="Presentation Topic/Filename"
            />
            <button className="btn-back" onClick={() => navigate(-1)}>
              <FaArrowLeft /> Back
            </button>
            <button className="btn-download" onClick={openPreviewModal} disabled={editedSlides.length === 0} title="Preview slides before downloading">
              <FaSearch /> Download Preview
            </button>
            <button className="btn-download" onClick={handleDownload} disabled={editedSlides.length === 0} title="Download PPTX now">
              <FaDownload /> Download PPTX
            </button>
          </div>
        </motion.header>

        <div className="slides-grid">
          {slidesJSX}
          {/* ➕ ADD SLIDE BUTTON (After all slides) */}
  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
    <button
      onClick={handleAddSlide}
      className="add-slide-btn"
      style={{
        backgroundColor: currentDesign.globalTitleColor,
        color: currentDesign.globalBackground,
        border: 'none',
        borderRadius: '12px',
        padding: '12px 24px',
        fontSize: '16px',
        cursor: 'pointer',
        transition: '0.3s',
      }}
      onMouseEnter={(e) => {
        e.target.style.opacity = '0.8';
      }}
      onMouseLeave={(e) => {
        e.target.style.opacity = '1';
      }}
    >
      ➕ Add Slide
    </button>
  </div>
          {editedSlides.length === 0 && <p className="no-slides-message">No slides to display. Go back and generate some!</p>}
        </div>
      </div>
      {showDownloadPreview && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000 }}>
          <div style={{ background:'#fff', width:'80%', maxWidth:1100, maxHeight:'85%', borderRadius:12, padding:16, display:'flex', flexDirection:'column', boxShadow:'0 8px 24px rgba(0,0,0,0.25)', overflow:'hidden' }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 8px 12px 8px' }}>
              <h2 style={{ margin:0, fontSize:18 }}>Download Preview</h2>
              <button onClick={closePreviewModal} style={{ background:'#ff5a5f', color:'#fff', border:'none', width:26, height:26, borderRadius:'50%', cursor:'pointer', fontSize:14, lineHeight:'26px', textAlign:'center' }} title="Close">✕</button>
            </div>
            <div style={{ fontSize:12, color:'#555', padding:'0 8px 10px 8px' }}>Slide {previewSlideIndex + 1} of {editedSlides.length}</div>
            {/* Slide area */}
            <div style={{ flex:1, overflow:'auto', border:'1px solid rgba(0,0,0,0.1)', borderRadius:10, padding:20, background:'linear-gradient(135deg,#dae4f8,#6b76a9 60%,#2d3c7a)' }}>
              {(() => {
                const slide = editedSlides[previewSlideIndex];
                if (!slide) return <p>Missing slide.</p>;
                const layoutStyles = currentDesign.layouts?.[slide.layout] || {};
                const titleColor = layoutStyles.titleColor || currentDesign.globalTitleColor;
                const textColor = layoutStyles.textColor || currentDesign.globalTextColor;
                const themeBg = layoutStyles.background || currentDesign.globalBackground;
                const bulletLines = getBulletLines(slide);

                // Compute modal preview background the same way the slide card does
                const modalPreviewStyle = { backgroundSize: 'cover', backgroundPosition: 'center' };
                if (Array.isArray(themeBg)) {
                  modalPreviewStyle.backgroundImage = `linear-gradient(135deg, ${themeBg.join(', ')})`;
                } else if (typeof themeBg === 'string' && themeBg.startsWith('http')) {
                  modalPreviewStyle.backgroundImage = `url(${themeBg})`;
                } else {
                  modalPreviewStyle.backgroundColor = themeBg || '#FFFFFF';
                }
                const isTitle = slide.layout === 'title';
                // Use same two-column layout as the editor slide card when image column is enabled
                const columns = showImageColumn ? '1fr 320px' : '1fr';
                const bodyText = (typeof slide.text === 'string' && slide.text.trim().length)
                  ? slide.text
                  : (bulletLines.length ? bulletLines.join('\n') : '');
                return (
                  <div style={{ position:'relative', width:'100%', minHeight:380, color:textColor, fontFamily: slide.styles?.textFont || currentDesign.font, borderRadius:8, padding:'30px 40px', display:'grid', gridTemplateColumns: columns, gap:40, alignItems:'flex-start', ...modalPreviewStyle }}>
                    {/* Render title and body like the editor slide card: left-aligned title + body, optional image column */}
                    <>
                      <div style={{ fontSize: slide.styles?.textSize || 16, display:'flex', flexDirection:'column', gap:10 }}>
                        <h2 style={{ fontSize: slide.styles?.titleSize || 32, fontFamily: slide.styles?.titleFont || currentDesign.font, color:titleColor, margin:'0 0 16px', fontWeight: slide.styles?.titleBold ? 700 : 500, fontStyle: slide.styles?.titleItalic ? 'italic' : 'normal' }}>{slide.title}</h2>
                        {/* If this is a title layout with paragraph text, show it as left-aligned body (editor shows paragraph inside left content area) */}
                        {bodyText ? (
                          <div style={{ lineHeight: '1.4', color: textColor }}>{bodyText.split('\n').map((ln, idx) => (
                            <div key={idx} style={{ marginBottom: 6 }}>{ln}</div>
                          ))}</div>
                        ) : (
                          bulletLines.map((line,i) => (
                            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                              <span style={{ fontSize: slide.styles?.textSize || 16, lineHeight:'1.2', color:titleColor }}>•</span>
                              <span style={{ lineHeight:'1.2' }}>{line}</span>
                            </div>
                          ))
                        )}
                      </div>
                      {showImageColumn && (
                        <div style={{ display:'flex', justifyContent:'center' }}>
                          <div style={{ background:'#fff', padding:12, borderRadius:14, boxShadow:'0 10px 26px rgba(0,0,0,0.2)' }}>
                            {slide.uploadedImage ? (
                              <img src={slide.uploadedImage} alt="uploaded" style={{ width:300, height:300, objectFit:'cover', borderRadius:8 }} />
                            ) : slide.imagePrompt ? (
                              <img src={getPollinationsImageUrl(slide.imagePrompt)} alt="prompt" style={{ width:300, height:300, objectFit:'cover', borderRadius:8 }} />
                            ) : (
                              <div style={{ width:300, height:220, background:'rgba(0,0,0,0.05)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'#666' }}>No image</div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                    {/* Stickers render (absolute overlay using percentage layout) */}
                    <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
                      {(slide.stickers || []).map((st, si) => (
                        <div key={si} style={{ position:'absolute', left:`${(st.x||0)*100}%`, top:`${(st.y||0)*100}%`, width:`${(st.width||0.18)*100}%`, height:`${(st.height||0.18)*100}%`, transform:`rotate(${st.rotate||0}deg)`, transformOrigin:'top left' }}>
                          <img src={st.url} alt="st" style={{ width:'100%', height:'100%', objectFit:'contain', userSelect:'none', pointerEvents:'none' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            {/* Bottom bar */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 8px 4px 8px' }}>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={gotoPrevPreview} disabled={previewSlideIndex === 0} style={{ padding:'6px 12px', borderRadius:6, border:'1px solid #ccc', cursor: previewSlideIndex===0?'not-allowed':'pointer' }}><FaArrowLeft /> Prev</button>
                <button onClick={gotoNextPreview} disabled={previewSlideIndex === editedSlides.length - 1} style={{ padding:'6px 12px', borderRadius:6, border:'1px solid #ccc', cursor: previewSlideIndex===editedSlides.length-1?'not-allowed':'pointer' }}>Next <FaArrowRight /></button>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={handleDownload} style={{ padding:'8px 16px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                  <FaDownload /> Download PPTX
                </button>
                <button onClick={closePreviewModal} style={{ padding:'8px 12px', background:'#f3f4f6', color:'#111827', border:'1px solid #d1d5db', borderRadius:8, cursor:'pointer' }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}