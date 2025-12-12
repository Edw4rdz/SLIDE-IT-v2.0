import React, { useState, useEffect, useCallback, useRef } from 'react';
import { notify } from "../utils/notify";
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaDownload, FaArrowLeft, FaArrowRight, FaUpload, FaSearch, FaAlignLeft, FaAlignCenter, FaAlignRight, FaTable, FaTrash, FaQuestionCircle } from 'react-icons/fa';
import { getTemplates, downloadPPTX } from '../api';
import '../styles/edit-preview.css';
import ConfirmDialog from "../components/ConfirmDialog";
import GuideModal from "../components/GuideModal";


function fileOrUrlToDataUrl(uploadedImage) {
return new Promise((resolve) => {
    if (!uploadedImage) return resolve(null);
    if (typeof uploadedImage === 'string') return resolve(uploadedImage); // already a URL or data URL
    if (uploadedImage instanceof File || uploadedImage instanceof Blob) {

      const reader = new FileReader();

      reader.onload = (e) => resolve(e.target.result);

      reader.readAsDataURL(uploadedImage);

    } else {

      resolve(null);

    }

  });

}



async function saveDraft(slides, topic, convId, design, imageProvider) {

  try {

    const slidesWithImages = await Promise.all(slides.map(async (slide) => {

      let img = slide.uploadedImage || null;

      if (img && (img instanceof File || img instanceof Blob)) {

        img = await fileOrUrlToDataUrl(img);

      }

      return { ...slide, uploadedImage: img };

    }));

    const draft = { 
      slides: slidesWithImages, 
      topic, 
      design: design ? { ...design } : null,
      imageProvider: imageProvider || 'pollinations'
    };

    const key = convId ? `slideit_draft_${convId}` : `slideit_draft_${topic}`;

    localStorage.setItem(key, JSON.stringify(draft));

  } catch (e) {

    console.warn('Failed to save draft:', e);

  }

}







// Helper function (keep as is)

const getPollinationsImageUrl = (prompt) => {

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') return null;

  const encodedPrompt = encodeURIComponent(prompt.trim());

  return `https://image.pollinations.ai/prompt/${encodedPrompt}`;

};



// Fallback placeholder image (base64 1x1 transparent PNG)

const FALLBACK_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';



const ensureTableCells = (rows, cols, existing = []) => {

  return Array.from({ length: rows }, (_, rIdx) => {

    const sourceRow = Array.isArray(existing[rIdx]) ? existing[rIdx] : [];

    return Array.from({ length: cols }, (_, cIdx) => (sourceRow[cIdx] !== undefined ? sourceRow[cIdx] : ''));

  });

};



const clampValue = (value, min, max) => {

  if (Number.isNaN(value)) return min;

  if (max < min) return min;

  return Math.min(Math.max(value, min), max);

};



const BASE_TABLE_CELL_WIDTH = 0.12; // approx 12% of slide width per column

const BASE_TABLE_CELL_HEIGHT = 0.10; // approx 10% of slide height per row

const MIN_TABLE_WIDTH = 0.03;

const MIN_TABLE_HEIGHT = 0.03;

const MAX_TABLE_WIDTH = 0.94;

const MAX_TABLE_HEIGHT = 0.88;

// Default sizing proportions

const autoSizeTableFrame = (table) => {

  const safeTable = table || {};

  const rows = Math.max(1, safeTable.rows || 1);

  const cols = Math.max(1, safeTable.cols || 1);

  const width = clampValue(cols * BASE_TABLE_CELL_WIDTH, MIN_TABLE_WIDTH, MAX_TABLE_WIDTH);

  const height = clampValue(rows * BASE_TABLE_CELL_HEIGHT, MIN_TABLE_HEIGHT, MAX_TABLE_HEIGHT);

  const x = clampValue(safeTable.x ?? 0, 0, 1 - width);

  const y = clampValue(safeTable.y ?? 0, 0, 1 - height);

  return { ...safeTable, width, height, x, y };

};



const applyAutoSizeIfNeeded = (table) => {

  if (!table) return table;

  return table.userResized ? table : autoSizeTableFrame(table);

};



const MIN_COLUMN_RATIO = 0.05;

const MIN_ROW_RATIO = 0.05;



const clampRatio = (value, min, max) => {

  if (Number.isNaN(value)) return min;

  if (max < min) return min;

  return Math.min(Math.max(value, min), max);

};



const ensureSegments = (count, segments = [], minRatio = 0.01) => {

  if (count <= 0) return [];

  const fallback = 1 / count;

  let arr = Array.isArray(segments) ? segments.slice(0, count) : [];

  while (arr.length < count) arr.push(fallback);

  arr = arr.map((v) => (Number.isFinite(v) && v > 0 ? v : fallback));

  let total = arr.reduce((sum, v) => sum + v, 0);

  if (!total) {

    arr = Array(count).fill(fallback);

    total = 1;

  }

  arr = arr.map((v) => v / total);

  const min = Math.min(minRatio, 1 / count);

  let deficit = 0;

  arr = arr.map((v) => {

    if (v < min) {

      deficit += (min - v);

      return min;

    }

    return v;

  });

  if (deficit > 0) {

    let remaining = deficit;

    arr = arr.map((v) => {

      if (remaining <= 0) return v;

      const available = v - min;

      if (available <= 0) return v;

      const reduction = Math.min(available, remaining);

      remaining -= reduction;

      return v - reduction;

    });

  }

  const finalTotal = arr.reduce((sum, v) => sum + v, 0);

  if (finalTotal <= 0) return Array(count).fill(fallback);

  return arr.map((v) => v / finalTotal);

};



const splitSegmentAt = (segments, insertIndex, minRatio) => {

  const count = Array.isArray(segments) ? segments.length : 0;

  if (count === 0) return [1];

  const normalized = ensureSegments(count, segments, minRatio);

  const index = clampValue(insertIndex, 0, count);

  const donorIndex = index === 0 ? 0 : Math.min(index - 1, count - 1);

  const donorShare = normalized[donorIndex] || (1 / count);

  const newShare = donorShare / 2;

  const updated = [...normalized];

  updated[donorIndex] = Math.max(donorShare - newShare, minRatio);

  updated.splice(index, 0, newShare);

  return ensureSegments(count + 1, updated, minRatio);

};



const removeSegmentAt = (segments, removeIndex, minRatio) => {

  const count = Array.isArray(segments) ? segments.length : 0;

  if (count <= 1) return [1];

  const normalized = ensureSegments(count, segments, minRatio);

  const index = clampValue(removeIndex, 0, count - 1);

  const updated = [...normalized];

  const removed = updated.splice(index, 1)[0] || 0;

  if (!updated.length) return [1];

  const target = index < updated.length ? index : updated.length - 1;

  updated[target] += removed;

  return ensureSegments(updated.length, updated, minRatio);

};



const ensureTableSizing = (table) => {

  if (!table) return table;

  const rows = Math.max(1, table.rows || 1);

  const cols = Math.max(1, table.cols || 1);

  const cells = ensureTableCells(rows, cols, table.cells);

  const columnWidths = ensureSegments(cols, table.columnWidths, MIN_COLUMN_RATIO);

  const rowHeights = ensureSegments(rows, table.rowHeights, MIN_ROW_RATIO);

  return { ...table, rows, cols, cells, columnWidths, rowHeights };

};



const ptToPx = (pt) => +(pt * 96 / 72).toFixed(2);

const BORDER_WIDTH_OPTIONS = [

  { label: '0.5 pt', value: ptToPx(0.5) },

  { label: '0.75 pt', value: ptToPx(0.75) },

  { label: '1 pt', value: ptToPx(1) },

  { label: '1.5 pt', value: ptToPx(1.5) },

  { label: '2.25 pt', value: ptToPx(2.25) },

];

const BORDER_STYLE_OPTIONS = [

  { label: 'Solid', value: 'solid' },

  { label: 'Dashed', value: 'dashed' },

];

const DEFAULT_BORDER_WIDTH = ptToPx(1);



// Override/fallback thumbnails for templates with broken or mismatched images

const TEMPLATE_THUMB_OVERRIDES = {

  "Elegant Dark Business":

    "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=800&auto=format&fit=crop",

  "Futuristic Tech Couture":

    "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop",

  // Requested: corporate-looking image for this template

  "Modern Corporate Blue":

    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=800&auto=format&fit=crop",

};



// Dynamically choose a reasonable starting font size based on content length.
// This is only used for initial slide styles; the editor and PPTX export
// still apply additional auto‑fit logic to prevent overflow.
function calculateOptimalFontSize(text, type, defaultSize) {
  const safeDefault = Number.isFinite(defaultSize) && defaultSize > 0 ? defaultSize : 16;
  if (!text || typeof text !== 'string') return safeDefault;

  const len = text.trim().length;

  if (type === 'title') {
    if (len > 50 && len <= 90) {
      // Slightly long titles → moderate shrink
      return Math.max(24, Math.round(safeDefault * 0.85));
    }
    if (len > 90) {
      // Very long titles → stronger shrink
      return Math.max(18, Math.round(safeDefault * 0.7));
    }
    return safeDefault;
  }

  // Body text rules
  if (len > 400) {
    return 10;
  }
  if (len > 200) {
    return 12;
  }
  return safeDefault;
}



const buildTemplateFallbackThumb = (name = "Template") => {

  try {

    const canvas = document.createElement('canvas');

    canvas.width = 640; canvas.height = 360;

    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 640, 360);

    grad.addColorStop(0, '#111827');

    grad.addColorStop(1, '#1f2937');

    ctx.fillStyle = grad; ctx.fillRect(0, 0, 640, 360);

    ctx.fillStyle = '#93c5fd'; ctx.font = 'bold 28px Arial';

    ctx.fillText(String(name).slice(0, 40), 24, 56);

    ctx.fillStyle = '#e5e7eb'; ctx.font = '14px Arial';

    ctx.fillText('Preview not available', 24, 88);

    return canvas.toDataURL('image/png', 0.9);

  } catch {

    return 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

  }

};



export default function EditPreview() {

  const location = useLocation();

  const navigate = useNavigate();

  

  const initialSlides = (location.state?.slides || []).map((slide, index) => {
    // Determine image position based on 3-slide pattern if not already set
    let imagePosition = slide.imagePosition;
    if (!imagePosition) {
      const pattern = index % 3;
      if (pattern === 0) imagePosition = 'right';
      else if (pattern === 1) imagePosition = 'left';
      else imagePosition = 'center';
    }
    
    // Set imageData based on position for consistent layout
    let imageData = slide.imageData;
    if (!imageData && imagePosition) {
      if (imagePosition === 'right') {
        imageData = { x: 0.6, y: 0.2, width: 0.35, height: 0.65 };
      } else if (imagePosition === 'left') {
        imageData = { x: 0.05, y: 0.2, width: 0.35, height: 0.65 };
      } else if (imagePosition === 'center') {
        // Center image: placed below title, text will be below image
        imageData = { x: 0.35, y: 0.23, width: 0.3, height: 0.36 };
      }
    }
    
    // Set bodyBox for center layout slides to position text below image
    let bodyBox = slide.bodyBox;
    if (!bodyBox && imagePosition === 'center') {
      bodyBox = { x: 0.05, y: 0.63, width: 0.9, height: 0.32, zIndex: 100 };
    }

    // Safely build a single body string for initial sizing
    const bodySource = Array.isArray(slide.bullets)
      ? slide.bullets.filter(Boolean).join(' ')
      : (typeof slide.text === 'string' ? slide.text : '');

    return {
      ...slide,
      id: slide.id ?? `slide-${index}-${Date.now()}`,
      layout: 'content',  // All slides use content layout with bullets
      imagePosition,
      imageData,
      bodyBox,
      // If uploadedImage is present in slide (from draft), use it; otherwise, null
      uploadedImage: slide.uploadedImage || null,
      tables: Array.isArray(slide.tables)

      ? slide.tables.map((tbl) => {

          const rows = Number.isInteger(tbl?.rows) && tbl.rows > 0 ? tbl.rows : 1;

          const cols = Number.isInteger(tbl?.cols) && tbl.cols > 0 ? tbl.cols : 1;

          const baseTable = {

            ...tbl,

            rows,

            cols,

            borderStyle: tbl?.borderStyle || 'solid',

            borderWidth: typeof tbl?.borderWidth === 'number' ? tbl.borderWidth : DEFAULT_BORDER_WIDTH,

            borderColor: tbl?.borderColor || '#111827',

            background: tbl?.background || '#ffffff',

            cells: ensureTableCells(rows, cols, tbl?.cells),

            userResized: Boolean(tbl?.userResized),

            columnWidths: Array.isArray(tbl?.columnWidths) ? tbl.columnWidths : undefined,

            rowHeights: Array.isArray(tbl?.rowHeights) ? tbl.rowHeights : undefined

          };

          return ensureTableSizing(applyAutoSizeIfNeeded(baseTable));

        })

      : [],

    // per-slide styles (editable via toolbar)

    styles: slide.styles || {

      titleFont: 'Arial',

      titleSize: calculateOptimalFontSize(slide.title || '', 'title', 32),

      titleBold: false,

      titleItalic: false,

      textFont: 'Arial',
      textSize: calculateOptimalFontSize(bodySource, 'body', 16),
      textBold: false,
      textItalic: false,
      textAlign: 'left'
    }
  };
  });

  const [editedSlides, setEditedSlides] = useState(initialSlides);

  const [topic, setTopic] = useState(location.state?.topic || 'My_Presentation');

  const [templates, setTemplates] = useState([]);

  const [loadingTemplates, setLoadingTemplates] = useState(true);

  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [draftLoaded, setDraftLoaded] = useState(false);

  

  // Stickers: picker, selection and interaction state
  const [stickerSearchQuery, setStickerSearchQuery] = useState("");
  const [openStickerFor, setOpenStickerFor] = useState(null); // slideId or null
  const [externalStickers, setExternalStickers] = useState([]); // External search results
  const [loadingExternalStickers, setLoadingExternalStickers] = useState(false);

  const [selectedSticker, setSelectedSticker] = useState(null); // { slideId, index }

  const [draggingSticker, setDraggingSticker] = useState(null); // { slideId, index, startX, startY, origX, origY, rect }

  const [resizingSticker, setResizingSticker] = useState(null); // { slideId, index, mode, startX, startY, origX, origY, origW, origH, rect, origRotate }

  const [rotatingSticker, setRotatingSticker] = useState(null); // { slideId, index, startX, startY, centerX, centerY, startAngle, origRotate }
  const [selectedTextBox, setSelectedTextBox] = useState(null); // { slideId, type: 'title'|'body' }
  const [draggingTextBox, setDraggingTextBox] = useState(null);
  const [resizingTextBox, setResizingTextBox] = useState(null);

  const [selectedTable, setSelectedTable] = useState(null); // { slideId, index }

  const [selectedImage, setSelectedImage] = useState(null); // slideId of the selected image

  const [draggingTable, setDraggingTable] = useState(null);

  const [resizingTable, setResizingTable] = useState(null);

  const [resizingTableAxis, setResizingTableAxis] = useState(null);

  const [tableCreator, setTableCreator] = useState({ slideId: null, rows: '3', cols: '3' });

  const [activeTableCell, setActiveTableCell] = useState(null); // { slideId, tableIndex, rowIndex, colIndex }

  // Temporary font size inputs (to allow typing without immediate updates)
  const [tempFontSizes, setTempFontSizes] = useState({});
  // Temporary image prompt input
  const [tempImagePrompts, setTempImagePrompts] = useState({});

  const containerRefs = useRef({});
  const promptTimeouts = useRef({});

  const tableFrameRefs = useRef({});

  const stickerAnchorRefs = useRef({});

  // Download preview modal state

  const [showDownloadPreview, setShowDownloadPreview] = useState(false);

  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);

  

  // This state correctly reads the flag from the previous page

  // eslint-disable-next-line no-unused-vars

  const [showImageColumn, setShowImageColumn] = useState(

    location.state?.includeImages === true || location.state?.includeImages === 'true'

  );

  

  // Get the image provider from navigation state (default to 'pollinations')

  const [imageProvider, setImageProvider] = useState(

    location.state?.imageProvider || 'pollinations'

  );

  

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

  // Guide modal state
  const [showGuide, setShowGuide] = useState(false);



  // Helper for image error fallback and retry (must be defined before any JSX usage)

  function handleImageError(e, slideId, imagePrompt) {

    const maxRetries = 3;
    const currentRetries = parseInt(e.currentTarget?.dataset?.retries || '0', 10);

    if (currentRetries < maxRetries && imagePrompt) {

      setPreviewImageUrls(urls => ({

        ...urls,

        [slideId]: getPollinationsImageUrl(imagePrompt) + `?retry=${Date.now()}`

      }));

      if (e.currentTarget) e.currentTarget.dataset.retries = String(currentRetries + 1);

    } else if (e.currentTarget) {

      e.currentTarget.src = FALLBACK_IMAGE;

      e.currentTarget.onerror = null;

    }

  }

  const [stickerCategories, setStickerCategories] = useState([]);

  // Show guide on first visit
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('slideit_edit_guide_seen');
    if (!hasSeenGuide) {
      setShowGuide(true);
      localStorage.setItem('slideit_edit_guide_seen', 'true');
    }
  }, []);

  // Load draft on mount if available
  useEffect(() => {
    if (draftLoaded) return; // Prevent multiple loads
    // If we navigated here with fresh slides, do NOT override with an older draft
    if (Array.isArray(location.state?.slides) && location.state.slides.length > 0) {
      setDraftLoaded(true);
      return;
    }
    
    const convId = location.state?.convId || topic;
    const draftKey = `slideit_draft_${convId}`;
    
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        console.log('[DRAFT] Loading saved draft from localStorage:', draftKey);
        
        // Update slides with draft data
        if (draft.slides && Array.isArray(draft.slides)) {
          const restoredSlides = draft.slides.map((slide, index) => ({
            ...slide,
            id: slide.id ?? `slide-${index}-${Date.now()}`,
            layout: slide.layout || 'content',  // All slides use content layout
            uploadedImage: slide.uploadedImage || null,
            tables: Array.isArray(slide.tables)
              ? slide.tables.map((tbl) => {
                  const rows = Number.isInteger(tbl?.rows) && tbl.rows > 0 ? tbl.rows : 1;
                  const cols = Number.isInteger(tbl?.cols) && tbl.cols > 0 ? tbl.cols : 1;
                  const baseTable = {
                    ...tbl,
                    rows,
                    cols,
                    borderStyle: tbl?.borderStyle || 'solid',
                    borderWidth: typeof tbl?.borderWidth === 'number' ? tbl.borderWidth : DEFAULT_BORDER_WIDTH,
                    borderColor: tbl?.borderColor || '#111827',
                    background: tbl?.background || '#ffffff',
                    cells: ensureTableCells(rows, cols, tbl?.cells),
                    userResized: Boolean(tbl?.userResized),
                    columnWidths: Array.isArray(tbl?.columnWidths) ? tbl.columnWidths : undefined,
                    rowHeights: Array.isArray(tbl?.rowHeights) ? tbl.rowHeights : undefined
                  };
                  return ensureTableSizing(applyAutoSizeIfNeeded(baseTable));
                })
              : [],
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
          
          setEditedSlides(restoredSlides);
        }
        
        // Update topic if present
        if (draft.topic) {
          setTopic(draft.topic);
        }
        
        // Update design if present
        if (draft.design) {
          setCurrentDesign(draft.design);
          if (draft.design.id) {
            setSelectedTemplateId(draft.design.id);
          }
        }
        
        // Update imageProvider if present in draft, BUT only if not already set via navigation
        // Navigation state should take priority over saved draft
        if (draft.imageProvider && !location.state?.imageProvider) {
          setImageProvider(draft.imageProvider);
          console.log('[DRAFT] Loaded imageProvider from draft:', draft.imageProvider);
        } else if (location.state?.imageProvider) {
          console.log('[DRAFT] Using imageProvider from navigation:', location.state.imageProvider);
        }
        
        setDraftLoaded(true);
        console.log('[DRAFT] Draft loaded successfully');
      } else {
        console.log('[DRAFT] No draft found for key:', draftKey);
        setDraftLoaded(true);
      }
    } catch (error) {
      console.error('[DRAFT] Error loading draft:', error);
      setDraftLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

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
        setStickerSearchQuery(""); // Clear search when closing

      }

    };

    document.addEventListener('mousedown', onDocMouseDown);

    return () => document.removeEventListener('mousedown', onDocMouseDown);

  }, [openStickerFor]);

  // Search external sticker sources (Iconify API - free, no API key needed)
  const searchExternalStickers = useCallback(async (query) => {
    setLoadingExternalStickers(true);
    try {
      // Use Iconify API to search for free icons/stickers
      const response = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=24`);
      const data = await response.json();
      
      if (data.icons && data.icons.length > 0) {
        // Fetch SVG data for each icon
        const iconPromises = data.icons.slice(0, 24).map(async (iconName) => {
          try {
            const svgResponse = await fetch(`https://api.iconify.design/${iconName}.svg?height=40`);
            const svgText = await svgResponse.text();
            return {
              name: iconName.split(':')[1] || iconName,
              svg: svgText,
              source: 'iconify',
              fullName: iconName
            };
          } catch (err) {
            return null;
          }
        });
        
        const icons = (await Promise.all(iconPromises)).filter(icon => icon !== null);
        setExternalStickers(icons);
      } else {
        setExternalStickers([]);
      }
    } catch (error) {
      console.error('External sticker search failed:', error);
      setExternalStickers([]);
    } finally {
      setLoadingExternalStickers(false);
    }
  }, []);

  // Filter stickers based on search query using AI-like keyword matching
  const filterStickers = (query) => {
    if (!query.trim()) {
      return stickerCategories.flatMap(cat => cat.items.map(item => ({cat: cat.name, item})));
    }
    
    const searchLower = query.toLowerCase().trim();
    const keywords = searchLower.split(/\s+/);
    
    // Smart keyword matching for sticker names
    const matchScore = (stickerName) => {
      const nameLower = stickerName.toLowerCase();
      let score = 0;
      
      keywords.forEach(keyword => {
        if (nameLower.includes(keyword)) score += 10;
        if (nameLower.startsWith(keyword)) score += 5;
      });
      
      return score;
    };
    
    const allStickers = stickerCategories.flatMap(cat => 
      cat.items.map(item => ({
        cat: cat.name, 
        item,
        score: matchScore(item)
      }))
    );
    
    const filtered = allStickers
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({cat, item}) => ({cat, item}));
    
    return filtered;
  };

  // useEffect to trigger external search when needed
  useEffect(() => {
    if (!stickerSearchQuery.trim()) {
      setExternalStickers([]);
      setLoadingExternalStickers(false);
      return;
    }
    
    const searchLower = stickerSearchQuery.toLowerCase().trim();
    const filtered = filterStickers(stickerSearchQuery);
    
    // Trigger external search if no local results and query is meaningful
    if (filtered.length === 0 && searchLower.length > 2) {
      searchExternalStickers(searchLower);
    } else {
      setExternalStickers([]);
      setLoadingExternalStickers(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stickerSearchQuery, searchExternalStickers]);

  

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
      
      // Also clear slide-specific styles when deselecting
      setEditedSlides(prevSlides => prevSlides.map(slide => ({
        ...slide,
        background: undefined,
        titleColor: undefined,
        textColor: undefined
      })));

      return;
    }

    const selected = availableTemplates.find((t) => t.id === templateId);

    if (selected && selected.design) {
      setSelectedTemplateId(templateId);
      const newDesign = { ...selected.design, id: selected.id };
      setCurrentDesign(newDesign);
      localStorage.setItem('selectedTemplate', JSON.stringify(newDesign));

      // Apply per-slide backgrounds from template to user's slides
      setEditedSlides(prevSlides => {
        return prevSlides.map((slide, index) => {
          // Check if the new design has specific slide definitions
          if (newDesign.slides && Array.isArray(newDesign.slides) && newDesign.slides.length > 0) {
            // Get background from corresponding template slide, or cycle through if needed
            const templateSlideIndex = index % newDesign.slides.length;
            const templateSlide = newDesign.slides[templateSlideIndex];
            
            if (templateSlide && templateSlide.background) {
              return {
                ...slide,
                background: templateSlide.background,
                titleColor: templateSlide.titleColor,
                textColor: templateSlide.textColor
              };
            }
          }
          
          // If no specific slide design matches (or template relies on global styles),
          // we must explicitly REMOVE the old per-slide overrides so global styles take over.
          return {
            ...slide,
            background: undefined,
            titleColor: undefined,
            textColor: undefined
          };
        });
      });

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

  }, [location.state?.initialDesign]); 

  // Helper to get the current user
  const getCurrentUser = () => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const res = await getTemplates();
        if (isMounted) {
          const apiTemplates = res.data || [];
          
          // Get current user and fetch uploaded templates from Local Storage
          const user = getCurrentUser();
          const userId = user?.user_id || user?.uid || user?.id || 'guest';
          const uploadedKey = `uploadedTemplates_${userId}`;
          const localTemplates = JSON.parse(localStorage.getItem(uploadedKey) || '[]');

          // Merge API templates with Local Storage templates
          const combinedTemplates = [...apiTemplates, ...localTemplates];
          setTemplates(combinedTemplates);

          const storedTemplate = JSON.parse(localStorage.getItem('selectedTemplate'));
          
          if (storedTemplate && storedTemplate.id && combinedTemplates.find(t => t.id === storedTemplate.id)) {
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

  // Track if image generation is already in progress to prevent duplicates
  const imageGenerationInProgress = useRef(false);

  useEffect(() => {

    // Always generate preview images when slides exist and either the image column
    // is enabled OR we're using a backend image provider (imagen/grok) that
    // can return base64 data URLs. Previously this only ran when `showImageColumn`
    // was true which caused previews to be empty even though the backend would
    // include images in the PPTX generation.
    if (editedSlides && editedSlides.length > 0 && (imageProvider === 'imagen' || imageProvider === 'grok' || showImageColumn)) {
      
      // Prevent duplicate image generation
      if (imageGenerationInProgress.current) {
        console.log('[IMAGE GEN] Already in progress, skipping...');
        return;
      }
      
      imageGenerationInProgress.current = true;
      
      // Use a copy to avoid mutating state and causing repeated requests
      const slidesCopy = editedSlides.map(s => ({ ...s }));
      // Fallback: If first slide is missing imagePrompt, set a default for Imagen
      if (imageProvider === 'imagen' && slidesCopy[0] && (!slidesCopy[0].imagePrompt || !slidesCopy[0].imagePrompt.trim())) {
        slidesCopy[0].imagePrompt = 'A visually appealing slide background';
      }

      const generateImageUrls = async () => {

        const urls = {};

        

        // If using Grok, we need to generate images via API IN PARALLEL

        if (imageProvider === 'grok') {

          console.log('[AI IMAGE DEBUG] Using Grok image provider - PARALLEL generation');

          

          // Import the API function

          const { generateImageFromGrok } = await import('../api');

          

          // Create array of promises for parallel execution

          const imagePromises = editedSlides.map(async (slide) => {

            if (slide.id !== undefined && slide.imagePrompt && !slide.uploadedImage) {

              try {

                console.log('[AI IMAGE DEBUG - Grok] Generating for slide:', slide.id, 'Prompt:', slide.imagePrompt);

                const imageDataUrl = await generateImageFromGrok(slide.imagePrompt);

                if (imageDataUrl) {

                  return { slideId: slide.id, url: imageDataUrl };

                } else {

                  console.warn('[AI IMAGE DEBUG - Grok] No image returned for slide:', slide.id);

                  return null;

                }

              } catch (error) {

                console.error('[AI IMAGE DEBUG - Grok] Error generating image for slide:', slide.id, error);

                return null;

              }

            }

            return null;

          });

          

          // Wait for all images to generate in parallel

          const results = await Promise.all(imagePromises);

          

          // Populate urls object with results

          results.forEach(result => {

            if (result && result.slideId && result.url) {

              urls[result.slideId] = result.url;

            }

          });

          

          console.log('[AI IMAGE DEBUG - Grok] All images generated in parallel:', Object.keys(urls).length);

        } else if (imageProvider === 'imagen') {

          console.log('[AI IMAGE DEBUG] Using Google Imagen provider - PARALLEL generation');

          const { generateImageFromImagen } = await import('../api');

          const imagePromisesImagen = editedSlides.map(async (slide) => {
            if (slide.id !== undefined && slide.imagePrompt && !slide.uploadedImage) {
              try {
                console.log('[AI IMAGE DEBUG - Imagen] Generating for slide:', slide.id, 'Prompt:', slide.imagePrompt);
                const imageDataUrl = await generateImageFromImagen(slide.imagePrompt);
                if (imageDataUrl) {
                  return { slideId: slide.id, url: imageDataUrl };
                } else {
                  console.warn('[AI IMAGE DEBUG - Imagen] No image returned for slide:', slide.id);
                  return null;
                }
              } catch (error) {
                console.error('[AI IMAGE DEBUG - Imagen] Error generating image for slide:', slide.id, error);
                return null;
              }
            }
            return null;
          });

          const resultsImagen = await Promise.all(imagePromisesImagen);

          resultsImagen.forEach(result => {
            if (result && result.slideId && result.url) {
              urls[result.slideId] = result.url;
            }
          });

          console.log('[AI IMAGE DEBUG - Imagen] All images generated in parallel:', Object.keys(urls).length);

        } else {

          // Default to Pollinations (URL-based, no API call needed)

          console.log('[AI IMAGE DEBUG] Using Pollinations image provider');

          

          editedSlides.forEach((slide) => {

            if (slide.id !== undefined) {

              if (slide.imagePrompt && !slide.uploadedImage) {

                const url = getPollinationsImageUrl(slide.imagePrompt);

                console.log('[AI IMAGE DEBUG - Pollinations] Slide:', slide.id, 'Prompt:', slide.imagePrompt, 'URL:', url);

                urls[slide.id] = url;

              } else {

                console.log('[AI IMAGE DEBUG - Pollinations] Slide:', slide.id, 'No prompt or uploaded image.');

              }

            } else {

              console.warn('[AI IMAGE DEBUG - Pollinations] Slide missing ID:', slide);

            }

          });

        }

        

        console.log('[AI IMAGE DEBUG] Final previewImageUrls:', urls);

        setPreviewImageUrls(urls);

        imageGenerationInProgress.current = false; // Reset flag

      };

      

      generateImageUrls();

    } else {

      setPreviewImageUrls({});
      imageGenerationInProgress.current = false; // Reset flag

    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedSlides.length, JSON.stringify(editedSlides.map(s => s.imagePrompt)), showImageColumn, imageProvider]); 

  // Save generated preview images to slide data so they persist when reopening
  useEffect(() => {
    if (!previewImageUrls || Object.keys(previewImageUrls).length === 0) return;
    
    let hasUpdates = false;
    const updatedSlides = editedSlides.map(slide => {
      const previewUrl = previewImageUrls[slide.id];
      // Only update if there's a preview URL and no uploadedImage yet
      if (previewUrl && !slide.uploadedImage) {
        hasUpdates = true;
        return { ...slide, uploadedImage: previewUrl };
      }
      return slide;
    });
    
    if (hasUpdates) {
      setEditedSlides(updatedSlides);
    }
  }, [previewImageUrls]); // Only depend on previewImageUrls to avoid loops

  // Auto-generate sticker images for slides that have sticker prompts but no URLs
  useEffect(() => {
    if (!editedSlides || editedSlides.length === 0) return;

    const generateStickers = async () => {
      let updatesNeeded = false;
      const updates = [];

      // Identify stickers needing generation
      for (const slide of editedSlides) {
        if (Array.isArray(slide.stickers)) {
          for (let i = 0; i < slide.stickers.length; i++) {
            const sticker = slide.stickers[i];
            if (sticker.prompt && !sticker.url) {
               updates.push({ slideId: slide.id, stickerIndex: i, prompt: sticker.prompt });
               updatesNeeded = true;
            }
          }
        }
      }

      if (!updatesNeeded) return;

      // Generate images
      const results = await Promise.all(updates.map(async (u) => {
           let url = null;
           if (imageProvider === 'grok') {
             try {
                const { generateImageFromGrok } = await import('../api');
                url = await generateImageFromGrok(u.prompt);
             } catch (e) { console.error("Sticker generation error:", e); }
           } else if (imageProvider === 'imagen') {
             try {
                const { generateImageFromImagen } = await import('../api');
                url = await generateImageFromImagen(u.prompt);
             } catch (e) { console.error("Sticker generation error (Imagen):", e); }
           } else {
             url = getPollinationsImageUrl(u.prompt);
           }
          return { ...u, url };
      }));
      
      const successful = results.filter(r => r.url);
      
      if (successful.length > 0) {
          setEditedSlides(prev => prev.map(s => {
              const slideUpdates = successful.filter(u => u.slideId === s.id);
              if (slideUpdates.length === 0) return s;
              
              const newStickers = [...(s.stickers || [])];
              slideUpdates.forEach(u => {
                  if (newStickers[u.stickerIndex]) {
                      newStickers[u.stickerIndex] = { ...newStickers[u.stickerIndex], url: u.url };
                  }
              });
              return { ...s, stickers: newStickers };
          }));
      }
    };
    
    generateStickers();
  }, [editedSlides, imageProvider]);

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

    let rawBullets = [];
    if (Array.isArray(slide.bullets)) {
      rawBullets = slide.bullets.filter(Boolean);
    } else {
      const source = typeof slide.bullets === 'string' && slide.bullets.trim().length
        ? slide.bullets
        : (typeof slide.text === 'string' ? slide.text : '');
      rawBullets = [source];
    }

    // Process all items to fix missing spaces and split
    const bullets = rawBullets
      .map(b => String(b))
      .map(b => b.replace(/([a-z])\.([A-Z])/g, '$1.\n$2')) // Fix missing spaces between sentences
      .flatMap(b => b.split(/\n|•/))
      .map(l => (l || '').trim())
      .filter(Boolean);

    // Replace **text** with "text" for display
    return bullets.map(b => replaceMarkdownBold(b));
  };

  // Replace markdown bold syntax **text** with quotes "text"
  const replaceMarkdownBold = (text) => {
    if (typeof text !== 'string') return text;
    // Replace **text** with "text"
    return text.replace(/\*\*(.*?)\*\*/g, '"$1"');
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

        setEditedSlides(prev => {
          const updated = prev.map(s => {
            if (s.id !== slideId) return s;
            const added = { type: 'shape', baseSvg: txt, fillColor: fill, strokeColor: stroke, strokeWidth, url: dataUrl, x: 0.12, y: 0.12, width: 0.18, height: 0.18, rotate: 0 };
            return { ...s, stickers: [ ...(s.stickers || []), added ] };
          });
          saveDraft(updated, topic, (location.state?.convId || topic), currentDesign, imageProvider);
          return updated;
        });

      } catch (e) {

        console.warn('Failed to load shape svg', e);

      }

    } else {

      setEditedSlides((prev) => {
        const updated = prev.map((s) => {
          if (s.id !== slideId) return s;
          const added = { type: 'image', url, x: 0.12, y: 0.12, width: 0.18, height: 0.18, opacity: 1, rotate: 0 };
          return { ...s, stickers: [ ...(s.stickers || []), added ] };
        });
        saveDraft(updated, topic, (location.state?.convId || topic), currentDesign, imageProvider);
        return updated;
      });

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
      if (changed) {
        console.log('[handleRemoveSticker] Sticker removed. Clearing selection.');
        setTimeout(() => setSelectedSticker(null), 0);
      }
      saveDraft(result, topic, (location.state?.convId || topic), currentDesign, imageProvider);
      return result;
    });

  };



  // Tables: quick add 3x3

  const handleAddTable = (slideId, rows = 3, cols = 3) => {

    setEditedSlides((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== slideId) return s;
        const added = ensureTableSizing(applyAutoSizeIfNeeded({
          type: 'table',
          rows,
          cols,
          cells: ensureTableCells(rows, cols),
          x: 0.14,
          y: 0.28,
          borderColor: '#111827',
          borderWidth: DEFAULT_BORDER_WIDTH,
          borderStyle: 'solid',
          background: '#ffffff',
          userResized: false,
          columnWidths: ensureSegments(cols, undefined, MIN_COLUMN_RATIO),
          rowHeights: ensureSegments(rows, undefined, MIN_ROW_RATIO)
        }));
        return { ...s, tables: [ ...(s.tables || []), added ] };
      });
      saveDraft(updated, topic, (location.state?.convId || topic), currentDesign, imageProvider);
      return updated;
    });

  };



  const updateTableProps = (slideId, tableIndex, updates) => {

    setEditedSlides((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== slideId) return s;
        const tables = Array.isArray(s.tables)
          ? s.tables.map((tbl, idx) => {
              if (idx !== tableIndex) return tbl;
              const next = typeof updates === 'function' ? updates(tbl) : updates;
              return ensureTableSizing({ ...tbl, ...next });
            })
          : [];
        return { ...s, tables };
      });
      saveDraft(updated, topic, (location.state?.convId || topic), currentDesign, imageProvider);
      return updated;
    });

  };



  const handleTableBackgroundChange = (slideId, tableIndex, background) => {

    updateTableProps(slideId, tableIndex, { background });

  };



  const handleTableBorderColorChange = (slideId, tableIndex, color) => {

    updateTableProps(slideId, tableIndex, { borderColor: color });

  };



  const handleTableBorderWidthChange = (slideId, tableIndex, widthPx) => {

    const numericWidth = typeof widthPx === 'number' ? widthPx : parseFloat(widthPx);

    if (Number.isNaN(numericWidth)) return;

    updateTableProps(slideId, tableIndex, { borderWidth: numericWidth });

  };



  const handleTableBorderStyleChange = (slideId, tableIndex, style) => {

    const allowed = ['solid', 'dashed'];

    const nextStyle = allowed.includes(style) ? style : 'solid';

    updateTableProps(slideId, tableIndex, { borderStyle: nextStyle });

  };



  const toggleTableCreator = (slideId) => {

    setTableCreator((prev) => {

      if (prev.slideId === slideId) {

        return { slideId: null, rows: '3', cols: '3' };

      }

      return { slideId, rows: '3', cols: '3' };

    });

  };



  const handleTableInputChange = (key, value) => {

    setTableCreator((prev) => ({ ...prev, [key]: value }));

  };



  const handleConfirmTable = (slideId) => {

    const rows = parseInt(tableCreator.rows, 10);

    const cols = parseInt(tableCreator.cols, 10);

    if (!Number.isInteger(rows) || rows <= 0 || !Number.isInteger(cols) || cols <= 0) {

      notify('Please enter positive whole numbers for rows and columns.', 'error');

      return;

    }

    handleAddTable(slideId, rows, cols);

    setTableCreator({ slideId: null, rows: '3', cols: '3' });

  };



  const handleRemoveTable = useCallback((slideId, index) => {

    setEditedSlides((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== slideId) return s;
        const arr = Array.isArray(s.tables) ? [...s.tables] : [];
        arr.splice(index, 1);
        return { ...s, tables: arr };
      });
      saveDraft(updated, topic, (location.state?.convId || topic), currentDesign, imageProvider);
      return updated;
    });

    delete tableFrameRefs.current[`${slideId}-${index}`];

    setSelectedTable(null);

    if (activeTableCell && activeTableCell.slideId === slideId && activeTableCell.tableIndex === index) {

      setActiveTableCell(null);

    } else if (activeTableCell && activeTableCell.slideId === slideId && activeTableCell.tableIndex > index) {

      setActiveTableCell({ ...activeTableCell, tableIndex: activeTableCell.tableIndex - 1 });

    }

  }, [topic, location.state?.convId, currentDesign, imageProvider, activeTableCell]);



  const handleTableCellChange = (slideId, tableIndex, rowIndex, colIndex, value) => {

    setEditedSlides((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== slideId) return s;
        const tables = Array.isArray(s.tables) ? s.tables.map((tbl, idx) => {
          if (idx !== tableIndex) return tbl;
          const rows = tbl.rows || 0;
          const cols = tbl.cols || 0;
          const cells = ensureTableCells(rows, cols, tbl.cells);
          if (cells[rowIndex] && cells[rowIndex][colIndex] !== undefined) {
            cells[rowIndex][colIndex] = value;
          }
          return ensureTableSizing({ ...tbl, cells });
        }) : [];
        return { ...s, tables };
      });
      saveDraft(updated, topic, (location.state?.convId || topic), currentDesign, imageProvider);
      return updated;
    });

    setActiveTableCell({ slideId, tableIndex, rowIndex, colIndex });

  };



  const handleAddTableRow = (slideId, tableIndex) => {

    let nextActive = activeTableCell;

    setEditedSlides((prev) => prev.map((s) => {

      if (s.id !== slideId) return s;

      const tables = Array.isArray(s.tables)

        ? s.tables.map((tbl, idx) => {

            if (idx !== tableIndex) return tbl;

            const cols = Math.max(1, tbl.cols || 1);

            const baseCells = ensureTableCells(Math.max(0, tbl.rows || 0), cols, tbl.cells).map((row) => [...row]);

            const match = activeTableCell && activeTableCell.slideId === slideId && activeTableCell.tableIndex === tableIndex;

            const insertIndex = match

              ? Math.min((activeTableCell.rowIndex ?? baseCells.length - 1) + 1, baseCells.length)

              : baseCells.length;

            baseCells.splice(insertIndex, 0, Array(cols).fill(''));

            if (match) {

              nextActive = {

                slideId,

                tableIndex,

                rowIndex: insertIndex,

                colIndex: Math.min(activeTableCell.colIndex ?? 0, cols - 1)

              };

            }

            const nextRowHeights = splitSegmentAt(tbl.rowHeights || [], insertIndex, MIN_ROW_RATIO);

            return ensureTableSizing(applyAutoSizeIfNeeded({

              ...tbl,

              rows: baseCells.length,

              cells: baseCells,

              rowHeights: nextRowHeights

            }));

          })

        : [];

      return { ...s, tables };

    }));

    if (nextActive && nextActive.slideId === slideId && nextActive.tableIndex === tableIndex) {

      setActiveTableCell(nextActive);

    }

  };



  const handleAddTableColumn = (slideId, tableIndex) => {

    let nextActive = activeTableCell;

    setEditedSlides((prev) => prev.map((s) => {

      if (s.id !== slideId) return s;

      const tables = Array.isArray(s.tables)

        ? s.tables.map((tbl, idx) => {

            if (idx !== tableIndex) return tbl;

            const rows = Math.max(1, tbl.rows || 1);

            const baseCells = ensureTableCells(rows, Math.max(0, tbl.cols || 0), tbl.cells).map((row) => [...row]);

            const currentCols = baseCells[0]?.length || 0;

            const match = activeTableCell && activeTableCell.slideId === slideId && activeTableCell.tableIndex === tableIndex;

            const insertIndex = match ? Math.min((activeTableCell.colIndex ?? currentCols - 1) + 1, currentCols) : currentCols;

            baseCells.forEach((row) => {

              const target = insertIndex > row.length ? row.length : insertIndex;

              row.splice(target, 0, '');

            });

            const newCols = baseCells[0]?.length || 1;

            if (match) {

              nextActive = {

                slideId,

                tableIndex,

                rowIndex: Math.min(activeTableCell.rowIndex ?? 0, baseCells.length - 1),

                colIndex: Math.min(insertIndex, newCols - 1)

              };

            }

            const nextColumnWidths = splitSegmentAt(tbl.columnWidths || [], insertIndex, MIN_COLUMN_RATIO);

            return ensureTableSizing(applyAutoSizeIfNeeded({

              ...tbl,

              cols: newCols,

              cells: baseCells,

              columnWidths: nextColumnWidths

            }));

          })

        : [];

      return { ...s, tables };

    }));

    if (nextActive && nextActive.slideId === slideId && nextActive.tableIndex === tableIndex) {

      setActiveTableCell(nextActive);

    }

  };



  const handleRemoveTableRow = (slideId, tableIndex) => {

    let nextActive = activeTableCell;

    setEditedSlides((prev) => prev.map((s) => {

      if (s.id !== slideId) return s;

      const tables = Array.isArray(s.tables)

        ? s.tables.map((tbl, idx) => {

            if (idx !== tableIndex) return tbl;

            const rows = Math.max(1, tbl.rows || 1);

            const cols = Math.max(1, tbl.cols || 1);

            const baseCells = ensureTableCells(rows, cols, tbl.cells).map((row) => [...row]);

            if (baseCells.length <= 1) return tbl;

            const match = activeTableCell && activeTableCell.slideId === slideId && activeTableCell.tableIndex === tableIndex;

            const removeIndex = match

              ? Math.min(Math.max(activeTableCell.rowIndex ?? 0, 0), baseCells.length - 1)

              : baseCells.length - 1;

            baseCells.splice(removeIndex, 1);

            if (!baseCells.length) {

              baseCells.push(Array(cols).fill(''));

            }

            if (match) {

              const nextRow = removeIndex > baseCells.length - 1 ? baseCells.length - 1 : removeIndex;

              nextActive = {

                slideId,

                tableIndex,

                rowIndex: Math.max(nextRow, 0),

                colIndex: Math.min(activeTableCell.colIndex ?? 0, (baseCells[0]?.length || 1) - 1)

              };

            }

            const nextRowHeights = removeSegmentAt(tbl.rowHeights || [], removeIndex, MIN_ROW_RATIO);

            return ensureTableSizing(applyAutoSizeIfNeeded({

              ...tbl,

              rows: baseCells.length,

              cells: baseCells,

              rowHeights: nextRowHeights

            }));

          })

        : [];

      return { ...s, tables };

    }));

    if (nextActive && nextActive.slideId === slideId && nextActive.tableIndex === tableIndex) {

      setActiveTableCell(nextActive);

    }

  };



  const handleRemoveTableColumn = (slideId, tableIndex) => {

    let nextActive = activeTableCell;

    setEditedSlides((prev) => prev.map((s) => {

      if (s.id !== slideId) return s;

      const tables = Array.isArray(s.tables)

        ? s.tables.map((tbl, idx) => {

            if (idx !== tableIndex) return tbl;

            const rows = Math.max(1, tbl.rows || 1);

            const cols = Math.max(1, tbl.cols || 1);

            const baseCells = ensureTableCells(rows, cols, tbl.cells).map((row) => [...row]);

            const currentCols = baseCells[0]?.length || 1;

            if (currentCols <= 1) return tbl;

            const match = activeTableCell && activeTableCell.slideId === slideId && activeTableCell.tableIndex === tableIndex;

            const removeIndex = match

              ? Math.min(Math.max(activeTableCell.colIndex ?? 0, 0), currentCols - 1)

              : currentCols - 1;

            baseCells.forEach((row) => {

              row.splice(removeIndex, 1);

              if (!row.length) {

                row.push('');

              }

            });

            const newCols = baseCells[0]?.length || 1;

            if (match) {

              const nextCol = removeIndex > newCols - 1 ? newCols - 1 : removeIndex;

              nextActive = {

                slideId,

                tableIndex,

                rowIndex: Math.min(activeTableCell.rowIndex ?? 0, baseCells.length - 1),

                colIndex: Math.max(nextCol, 0)

              };

            }

            const nextColumnWidths = removeSegmentAt(tbl.columnWidths || [], removeIndex, MIN_COLUMN_RATIO);

            return ensureTableSizing(applyAutoSizeIfNeeded({

              ...tbl,

              cols: newCols,

              cells: baseCells,

              columnWidths: nextColumnWidths

            }));

          })

        : [];

      return { ...s, tables };

    }));

    if (nextActive && nextActive.slideId === slideId && nextActive.tableIndex === tableIndex) {

      setActiveTableCell(nextActive);

    }

  };



  useEffect(() => {

    const onMove = (ev) => {

      if (resizingTableAxis) {

        const { slideId, tableIndex, type, index, startX, startY, rect, initialSizes } = resizingTableAxis;

        if (!rect) return;

        const segmentCount = Array.isArray(initialSizes) ? initialSizes.length : 0;

        setEditedSlides((prev) => prev.map((s) => {

          if (s.id !== slideId) return s;

          const tables = Array.isArray(s.tables) ? [...s.tables] : [];

          const t = { ...(tables[tableIndex] || {}) };

          if (!Array.isArray(initialSizes) || !initialSizes.length) return s;

          if (type === 'column') {

            if (!Array.isArray(t.columnWidths) || t.columnWidths.length !== segmentCount) return s;

            const pairSum = initialSizes[index] + initialSizes[index + 1];

            if (!pairSum) return s;

            let delta = (ev.clientX - startX) / rect.width;

            let first = clampRatio(initialSizes[index] + delta, MIN_COLUMN_RATIO, pairSum - MIN_COLUMN_RATIO);

            let second = pairSum - first;

            if (first < MIN_COLUMN_RATIO) {

              first = MIN_COLUMN_RATIO;

              second = pairSum - first;

            }

            if (second < MIN_COLUMN_RATIO) {

              second = MIN_COLUMN_RATIO;

              first = pairSum - second;

            }

            const updated = [...t.columnWidths];

            updated[index] = first;

            updated[index + 1] = second;

            const total = updated.reduce((sum, v) => sum + v, 0) || 1;

            t.columnWidths = updated.map((v) => v / total);

            t.userResized = true;

          } else if (type === 'row') {

            if (!Array.isArray(t.rowHeights) || t.rowHeights.length !== segmentCount) return s;

            const pairSum = initialSizes[index] + initialSizes[index + 1];

            if (!pairSum) return s;

            let delta = (ev.clientY - startY) / rect.height;

            let first = clampRatio(initialSizes[index] + delta, MIN_ROW_RATIO, pairSum - MIN_ROW_RATIO);

            let second = pairSum - first;

            if (first < MIN_ROW_RATIO) {

              first = MIN_ROW_RATIO;

              second = pairSum - first;

            }

            if (second < MIN_ROW_RATIO) {

              second = MIN_ROW_RATIO;

              first = pairSum - second;

            }

            const updated = [...t.rowHeights];

            updated[index] = first;

            updated[index + 1] = second;

            const total = updated.reduce((sum, v) => sum + v, 0) || 1;

            t.rowHeights = updated.map((v) => v / total);

            t.userResized = true;

          }

          tables[tableIndex] = ensureTableSizing(t);

          return { ...s, tables };

        }));

        return;

      }



      if (draggingSticker) {

        const { slideId, index, startX, startY, origX, origY, rect } = draggingSticker;

        const dx = (ev.clientX - startX) / rect.width;

        const dy = (ev.clientY - startY) / rect.height;

        console.log('[IMAGE DRAG] Moving:', { index, dx, dy, clientX: ev.clientX, clientY: ev.clientY });

        setEditedSlides((prev) => prev.map((s) => {

          if (s.id !== slideId) return s;

          // Handle image dragging (index === -1)
          if (index === -1) {
            console.log('[IMAGE DRAG] Updating image position');
            const imgData = s.imageData || { x: 0.5, y: 0.15, width: 0.4, height: 0.6 };
            const maxX = 1 - (imgData.width || 0.4);
            const maxY = 1 - (imgData.height || 0.6);
            const newX = clamp((origX || 0.5) + dx, 0, maxX);
            const newY = clamp((origY || 0.15) + dy, 0, maxY);
            console.log('[IMAGE DRAG] New position:', { newX, newY, origX, origY });
            return { 
              ...s, 
              imageData: {
                ...imgData,
                x: newX,
                y: newY
              }
            };
          }

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

          // Handle image resizing (index === -1)
          if (index === -1) {
            let x = origX || 0.5, y = origY || 0.15, w = origW || 0.4, h = origH || 0.6;

            if (mode === 'se') { w = clamp(w + dx, 0.1, 1); h = clamp(h + dy, 0.1, 1); }
            if (mode === 'ne') { w = clamp(w + dx, 0.1, 1); y = clamp(y + dy, 0, 1 - h); h = clamp(h - dy, 0.1, 1); }
            if (mode === 'sw') { x = clamp(x + dx, 0, 1 - w); w = clamp(w - dx, 0.1, 1); h = clamp(h + dy, 0.1, 1); }
            if (mode === 'nw') { x = clamp(x + dx, 0, 1 - w); w = clamp(w - dx, 0.1, 1); y = clamp(y + dy, 0, 1 - h); h = clamp(h - dy, 0.1, 1); }

            return { 
              ...s, 
              imageData: { x, y, width: w, height: h }
            };
          }

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



      if (resizingTableAxis) {

        const { slideId, tableIndex, type, index, startX, startY, rect, initialSizes } = resizingTableAxis;

        if (!rect) return;

        const segmentCount = Array.isArray(initialSizes) ? initialSizes.length : 0;

        setEditedSlides((prev) => prev.map((s) => {

          if (s.id !== slideId) return s;

          const tables = Array.isArray(s.tables) ? [...s.tables] : [];

          const t = { ...(tables[tableIndex] || {}) };

          if (!Array.isArray(initialSizes) || !initialSizes.length) return s;

          if (type === 'column') {

            if (!Array.isArray(t.columnWidths) || t.columnWidths.length !== segmentCount) return s;

            const pairSum = initialSizes[index] + initialSizes[index + 1];

            if (!pairSum) return s;

            let delta = (ev.clientX - startX) / rect.width;

            let first = clampRatio(initialSizes[index] + delta, MIN_COLUMN_RATIO, pairSum - MIN_COLUMN_RATIO);

            let second = pairSum - first;

            if (first < MIN_COLUMN_RATIO) {

              first = MIN_COLUMN_RATIO;

              second = pairSum - first;

            }

            if (second < MIN_COLUMN_RATIO) {

              second = MIN_COLUMN_RATIO;

              first = pairSum - second;

            }

            const updated = [...t.columnWidths];

            updated[index] = first;

            updated[index + 1] = second;

            const total = updated.reduce((sum, v) => sum + v, 0) || 1;

            t.columnWidths = updated.map((v) => v / total);

            t.userResized = true;

          } else if (type === 'row') {

            if (!Array.isArray(t.rowHeights) || t.rowHeights.length !== segmentCount) return s;

            const pairSum = initialSizes[index] + initialSizes[index + 1];

            if (!pairSum) return s;

            let delta = (ev.clientY - startY) / rect.height;

            let first = clampRatio(initialSizes[index] + delta, MIN_ROW_RATIO, pairSum - MIN_ROW_RATIO);

            let second = pairSum - first;

            if (first < MIN_ROW_RATIO) {

              first = MIN_ROW_RATIO;

              second = pairSum - first;

            }

            if (second < MIN_ROW_RATIO) {

              second = MIN_ROW_RATIO;

              first = pairSum - second;

            }

            const updated = [...t.rowHeights];

            updated[index] = first;

            updated[index + 1] = second;

            const total = updated.reduce((sum, v) => sum + v, 0) || 1;

            t.rowHeights = updated.map((v) => v / total);

            t.userResized = true;

          }

          tables[tableIndex] = ensureTableSizing(t);

          return { ...s, tables };

        }));

        return;

      }



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



      if (resizingTable) {

        const { slideId, index, startX, startY, origX, origY, origW, origH, rect, mode } = resizingTable;

        const dx = (ev.clientX - startX) / rect.width;

        const dy = (ev.clientY - startY) / rect.height;

        setEditedSlides((prev) => prev.map((s) => {

          if (s.id !== slideId) return s;

          const arr = Array.isArray(s.tables) ? [...s.tables] : [];

          const t = { ...(arr[index] || {}) };

          let x = origX || 0, y = origY || 0, w = origW || 0.5, h = origH || 0.3;

          if (mode === 'se') { w = clamp(w + dx, MIN_TABLE_WIDTH, 1); h = clamp(h + dy, MIN_TABLE_HEIGHT, 1); }

          if (mode === 'ne') { w = clamp(w + dx, MIN_TABLE_WIDTH, 1); y = clamp(y + dy, 0, 1 - h); h = clamp(h - dy, MIN_TABLE_HEIGHT, 1); }

          if (mode === 'sw') { x = clamp(x + dx, 0, 1 - w); w = clamp(w - dx, MIN_TABLE_WIDTH, 1); h = clamp(h + dy, MIN_TABLE_HEIGHT, 1); }

          if (mode === 'nw') { x = clamp(x + dx, 0, 1 - w); y = clamp(y + dy, 0, 1 - h); w = clamp(w - dx, MIN_TABLE_WIDTH, 1); h = clamp(h - dy, MIN_TABLE_HEIGHT, 1); }

          t.x = clamp(x, 0, 1 - w);

          t.y = clamp(y, 0, 1 - h);

          t.width = w; t.height = h;

          t.userResized = true;

          arr[index] = t;

          return { ...s, tables: arr };

        }));

      }

    };



    const onUp = () => {

      setDraggingSticker(null);

      setResizingSticker(null);

      setRotatingSticker(null);

      setDraggingTable(null);

      setResizingTable(null);

      setResizingTableAxis(null);

    };



    window.addEventListener('mousemove', onMove);

    window.addEventListener('mouseup', onUp);

    return () => {

      window.removeEventListener('mousemove', onMove);

      window.removeEventListener('mouseup', onUp);

    };

  }, [draggingSticker, resizingSticker, rotatingSticker, draggingTable, resizingTable, resizingTableAxis]);



  // Pointer events (better reliability) - handles stickers AND tables

  useEffect(() => {

    const onPointerMove = (ev) => {

      if (resizingTableAxis) {

        const { slideId, tableIndex, type, index, startX, startY, rect, initialSizes } = resizingTableAxis;

        if (!rect) return;

        const segmentCount = Array.isArray(initialSizes) ? initialSizes.length : 0;

        setEditedSlides((prev) => prev.map((s) => {

          if (s.id !== slideId) return s;

          const tables = Array.isArray(s.tables) ? [...s.tables] : [];

          const t = { ...(tables[tableIndex] || {}) };

          if (!Array.isArray(initialSizes) || !initialSizes.length) return s;

          if (type === 'column') {

            if (!Array.isArray(t.columnWidths) || t.columnWidths.length !== segmentCount) return s;

            const pairSum = initialSizes[index] + initialSizes[index + 1];

            if (!pairSum) return s;

            let delta = (ev.clientX - startX) / rect.width;

            let first = clampRatio(initialSizes[index] + delta, MIN_COLUMN_RATIO, pairSum - MIN_COLUMN_RATIO);

            let second = pairSum - first;

            if (first < MIN_COLUMN_RATIO) {

              first = MIN_COLUMN_RATIO;

              second = pairSum - first;

            }

            if (second < MIN_COLUMN_RATIO) {

              second = MIN_COLUMN_RATIO;

              first = pairSum - second;

            }

            const updated = [...t.columnWidths];

            updated[index] = first;

            updated[index + 1] = second;

            const total = updated.reduce((sum, v) => sum + v, 0) || 1;

            t.columnWidths = updated.map((v) => v / total);

            t.userResized = true;

          } else if (type === 'row') {

            if (!Array.isArray(t.rowHeights) || t.rowHeights.length !== segmentCount) return s;

            const pairSum = initialSizes[index] + initialSizes[index + 1];

            if (!pairSum) return s;

            let delta = (ev.clientY - startY) / rect.height;

            let first = clampRatio(initialSizes[index] + delta, MIN_ROW_RATIO, pairSum - MIN_ROW_RATIO);

            let second = pairSum - first;

            if (first < MIN_ROW_RATIO) {

              first = MIN_ROW_RATIO;

              second = pairSum - first;

            }

            if (second < MIN_ROW_RATIO) {

              second = MIN_ROW_RATIO;

              first = pairSum - second;

            }

            const updated = [...t.rowHeights];

            updated[index] = first;

            updated[index + 1] = second;

            const total = updated.reduce((sum, v) => sum + v, 0) || 1;

            t.rowHeights = updated.map((v) => v / total);

            t.userResized = true;

          }

          tables[tableIndex] = ensureTableSizing(t);

          return { ...s, tables };

        }));

        return;

      }



      if (draggingSticker) {
        const { slideId, index, startX, startY, origX, origY, rect } = draggingSticker;
        const dx = (ev.clientX - startX) / rect.width;
        const dy = (ev.clientY - startY) / rect.height;
        setEditedSlides((prev) => prev.map((s) => {
          if (s.id !== slideId) return s;

          // Handle image dragging (index === -1)
          if (index === -1) {
            const imgData = s.imageData || { x: 0.5, y: 0.15, width: 0.4, height: 0.6 };
            const maxX = 1 - (imgData.width || 0.4);
            const maxY = 1 - (imgData.height || 0.6);
            const newX = clamp((origX !== undefined ? origX : 0.5) + dx, 0, maxX);
            const newY = clamp((origY !== undefined ? origY : 0.15) + dy, 0, maxY);
            return { 
              ...s, 
              imageData: {
                ...imgData,
                x: newX,
                y: newY
              }
            };
          }

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
            let x = origX !== undefined ? origX : 0.5, y = origY !== undefined ? origY : 0.15, w = origW || 0.4, h = origH || 0.6;

            if (mode === 'se') { w = clamp(w + dx, 0.1, 1); h = clamp(h + dy, 0.1, 1); }
            if (mode === 'ne') { w = clamp(w + dx, 0.1, 1); y = clamp(y + dy, 0, 1 - h); h = clamp(h - dy, 0.1, 1); }
            if (mode === 'sw') { x = clamp(x + dx, 0, 1 - w); w = clamp(w - dx, 0.1, 1); h = clamp(h + dy, 0.1, 1); }
            if (mode === 'nw') { x = clamp(x + dx, 0, 1 - w); w = clamp(w - dx, 0.1, 1); y = clamp(y + dy, 0, 1 - h); h = clamp(h - dy, 0.1, 1); }

            return { 
              ...s, 
              imageData: { x, y, width: w, height: h }
            };
          }

          const arr = Array.isArray(s.stickers) ? [...s.stickers] : [];
          const g = { ...(arr[index] || {}) };
          let x = origX !== undefined ? origX : 0, y = origY !== undefined ? origY : 0, w = origW || 0.18, h = origH || 0.18;
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
            
          let x = origX !== undefined ? origX : defaultBox.x, y = origY !== undefined ? origY : defaultBox.y, w = origW || defaultBox.width, h = origH || defaultBox.height;

          // Corner resizing: Scale proportionally (Canva-style)
          if (['nw', 'ne', 'se', 'sw'].includes(mode)) {
             // Calculate new width first
             if (mode === 'se' || mode === 'ne') w = clamp(w + dx, 0.1, 1);
             if (mode === 'sw' || mode === 'nw') {
                const newW = clamp(w - dx, 0.1, 1);
                x = clamp(x + (w - newW), 0, 1 - newW);
                w = newW;
             }
             
             // Enforce aspect ratio for height
             const aspect = (origW || defaultBox.width) / (origH || defaultBox.height);
             const newH = w / aspect;
             
             // Adjust Y if resizing from top
             if (mode === 'ne' || mode === 'nw') {
                y = clamp(y + (h - newH), 0, 1 - newH);
             }
             h = newH;
          }
          // Side resizing: Change width only, height auto-adjusts (handled by render logic)
          else {
             if (mode === 'e') { w = clamp(w + dx, 0.1, 1); }
             if (mode === 'w') { 
                const newW = clamp(w - dx, 0.1, 1);
                x = clamp(x + (w - newW), 0, 1 - newW);
                w = newW;
             }
             // Do not change h for side resizing
          }
          
          const newBox = { ...(s[boxKey] || defaultBox) };
          newBox.x = clamp(x, 0, 1 - w);
          newBox.y = clamp(y, 0, 1 - h);
          newBox.width = w;
          newBox.height = h;

          // Font scaling logic
          const newStyles = { ...(s.styles || {}) };
          if (type === 'title') {
            // For title: corner resize scales font proportionally
            if (['nw', 'ne', 'se', 'sw'].includes(mode) && origFontSize && origW) {
               const ratio = w / origW; // Scale based on width change
               const newSize = Math.max(8, Math.min(200, Math.round(origFontSize * ratio)));
               newStyles.titleSize = newSize;
            }
            // Side resize: preserve titleSize (do nothing)
          } else {
            // For body text: corner resize scales font
            if (['nw', 'ne', 'se', 'sw'].includes(mode) && origFontSize && origW) {
               const ratio = w / origW; // Scale based on width change
               const newSize = Math.max(8, Math.min(200, Math.round(origFontSize * ratio)));
               newStyles.textSize = newSize;
            }
            // Side resize: do not change textSize
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

          if (mode === 'se') { w = clamp(w + dx, MIN_TABLE_WIDTH, 1); h = clamp(h + dy, MIN_TABLE_HEIGHT, 1); }

          if (mode === 'ne') { w = clamp(w + dx, MIN_TABLE_WIDTH, 1); y = clamp(y + dy, 0, 1 - h); h = clamp(h - dy, MIN_TABLE_HEIGHT, 1); }

          if (mode === 'sw') { x = clamp(x + dx, 0, 1 - w); w = clamp(w - dx, MIN_TABLE_WIDTH, 1); h = clamp(h + dy, MIN_TABLE_HEIGHT, 1); }

          if (mode === 'nw') { x = clamp(x + dx, 0, 1 - w); y = clamp(y + dy, 0, 1 - h); w = clamp(w - dx, MIN_TABLE_WIDTH, 1); h = clamp(h - dy, MIN_TABLE_HEIGHT, 1); }

          t.x = clamp(x, 0, 1 - w);

          t.y = clamp(y, 0, 1 - h);

          t.width = w; t.height = h;

          t.userResized = true;

          arr[index] = t;

          return { ...s, tables: arr };

        }));

        return;

      }

    };

  const onPointerUp = () => { 
    setDraggingSticker(null); 
    setResizingSticker(null); 
    setRotatingSticker(null); 
    setDraggingTable(null); 
    setResizingTable(null); 
    setResizingTableAxis(null);
    setDraggingTextBox(null);
    setResizingTextBox(null);
  };

    window.addEventListener('pointermove', onPointerMove);

    window.addEventListener('pointerup', onPointerUp);

    return () => {

      window.removeEventListener('pointermove', onPointerMove);

      window.removeEventListener('pointerup', onPointerUp);

    };

  }, [draggingSticker, resizingSticker, rotatingSticker, draggingTable, resizingTable, resizingTableAxis, draggingTextBox, resizingTextBox]);



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

    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [selectedImage]);

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
  }, [selectedTextBox]);

  useEffect(() => {

    if (!tableCreator.slideId) return;

    const exists = editedSlides.some((s) => s.id === tableCreator.slideId);

    if (!exists) {

      setTableCreator({ slideId: null, rows: '3', cols: '3' });

    }

  }, [editedSlides, tableCreator.slideId]);

  useEffect(() => {

    if (!selectedTable) return;

    const onKeyDown = (e) => {

      if (e.key === 'Delete' || e.key === 'Backspace') {

        handleRemoveTable(selectedTable.slideId, selectedTable.index);

        setSelectedTable(null);

      }

    };

    const onPointerDownGlobal = (e) => {

      const inTable = e.target.closest('[data-table-wrapper]');

      if (!inTable) {

        setSelectedTable(null);

      }

    };

    window.addEventListener('keydown', onKeyDown);

    document.addEventListener('pointerdown', onPointerDownGlobal, true);

    return () => {

      window.removeEventListener('keydown', onKeyDown);

      document.removeEventListener('pointerdown', onPointerDownGlobal, true);

    };

  }, [selectedTable, handleRemoveTable]);



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
            [field]: field === 'bullets' && typeof value === 'string' ? value.split('\n') : value
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
        setEditedSlides(currentSlides => {
          const updatedSlides = currentSlides.map(s =>
            s.id === slideId ? { ...s, uploadedImage: base64String, imagePrompt: "" } : s
          );
          // Save draft immediately after updating slides
          saveDraft(updatedSlides, topic, (location.state?.convId || topic), currentDesign, imageProvider);
          return updatedSlides;
        });
      };
      reader.readAsDataURL(file);
    }
    event.target.value = null;
  };



  const handleRemoveImage = (slideId) => {
    setEditedSlides(currentSlides => {
      const updatedSlides = currentSlides.map(s =>
        s.id === slideId ? { ...s, uploadedImage: null, imagePrompt: "", removedImage: true } : s
      );
      // Save draft immediately after removing image
      saveDraft(updatedSlides, topic, (location.state?.convId || topic), currentDesign, imageProvider);
      return updatedSlides;
    });
  };

  const handleAddImageBack = (slideId) => {
    setEditedSlides(currentSlides => {
      const updatedSlides = currentSlides.map(s =>
        s.id === slideId ? { ...s, removedImage: false } : s
      );
      // Save draft immediately after adding image back
      saveDraft(updatedSlides, topic, (location.state?.convId || topic), currentDesign, imageProvider);
      return updatedSlides;
    });
    // Auto-select the image so user can see the controls
    setSelectedImage(slideId);
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

      titleBox: { x: 0.05, y: 0.0622, width: 0.9, height: 0.1778, zIndex: 100 },
      
      bodyBox: { x: 0.05, y: 0.2844, width: 0.9, height: 0.64, zIndex: 100 },

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

  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, slideId: null });
  const handleDeleteSlide = (slideId) => {
    // Prevent deleting the last slide
    if (editedSlides.length <= 1) {
      notify("Cannot delete the last slide!", 'error');
      return;
    }
    setDeleteConfirm({ open: true, slideId });
  };
  const confirmDeleteSlide = () => {
    const slideId = deleteConfirm.slideId;
    setDeleteConfirm({ open: false, slideId: null });
    
    setEditedSlides(prev => {
      const updated = prev.filter(s => s.id !== slideId);
      
      // Clear any selections related to the deleted slide
      if (selectedSticker?.slideId === slideId) setSelectedSticker(null);
      if (selectedTable?.slideId === slideId) setSelectedTable(null);
      if (selectedImage === slideId) setSelectedImage(null);
      if (selectedTextBox?.slideId === slideId) setSelectedTextBox(null);
      if (activeTableCell?.slideId === slideId) setActiveTableCell(null);
      
      // Save draft after deletion
      saveDraft(updated, topic, (location.state?.convId || topic), currentDesign, imageProvider);
      
      return updated;
    });
    
    notify("Slide deleted successfully", 'success');
  };



  // ✅ --- THIS FUNCTION IS UPDATED --- ✅

  // ✅ UPDATED: Handles relative sticker URLs by converting them to Base64 before download
  const handleDownload = async () => {
    if (!editedSlides.length) return notify("No slides to download!", 'error');

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

    // Helper: Fetch a relative URL and convert it to Base64
    const urlToBase64 = async (url) => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.warn("Failed to convert sticker to base64", url, err);
        return url; // Fallback to original if failed
      }
    };

    // Helper: Convert SVG data URL to PNG data URL (for PPTX compatibility)
    const svgDataUrlToPng = async (svgDataUrl, width = 200, height = 200) => {
      return new Promise((resolve) => {
        try {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => {
            console.warn('Failed to convert SVG to PNG, using original');
            resolve(svgDataUrl); // Fallback to original
          };
          img.src = svgDataUrl;
        } catch (err) {
          console.warn('Error converting SVG to PNG:', err);
          resolve(svgDataUrl); // Fallback to original
        }
      });
    };

    // 1. Prepare slides: Convert any relative sticker URLs to Base64 and SVG to PNG
    // This allows the backend to embed the image data directly.
    const slidesForExport = await Promise.all(
      editedSlides.map(async (slide) => {
        if (!Array.isArray(slide.stickers) || slide.stickers.length === 0) {
          return slide;
        }

        const processedStickers = await Promise.all(
          slide.stickers.map(async (sticker) => {
            let processedUrl = sticker.url;
            
            // Check if it's a relative path (e.g. "/stickers/...") and not already a data URL
            if (sticker.url && typeof sticker.url === 'string' && sticker.url.startsWith('/') && !sticker.url.startsWith('//')) {
              const base64Data = await urlToBase64(sticker.url);
              processedUrl = base64Data || sticker.url;
            }
            
            // Convert SVG data URLs to PNG (PptxGenJS doesn't handle SVG well)
            if (processedUrl && typeof processedUrl === 'string' && processedUrl.includes('data:image/svg+xml')) {
              console.log('Converting SVG sticker to PNG for PPTX compatibility...');
              processedUrl = await svgDataUrlToPng(processedUrl, 400, 400);
            }
            
            return { ...sticker, url: processedUrl };
          })
        );

        return { ...slide, stickers: processedStickers };
      })
    );
    
    // 2. Send the processed slides to the backend
    downloadPPTX(slidesForExport, activeDesign, fileName, showImageColumn, imageProvider);
  };



  const openPreviewModal = async () => {

    if (!editedSlides.length) return;

    // If using Google Imagen, trigger immediate generation for preview
    if (imageProvider === 'imagen') {
      const urls = {};
      try {
        const { generateImageFromImagen } = await import('../api');
        const promises = editedSlides.map(async (slide) => {
          if (slide.id !== undefined && slide.imagePrompt && !slide.uploadedImage) {
            try {
              const img = await generateImageFromImagen(slide.imagePrompt);
              if (img) urls[slide.id] = img;
            } catch (err) {
              console.error('[Preview Imagen] Error generating for slide', slide.id, err);
            }
          }
        });
        await Promise.all(promises);
        setPreviewImageUrls(prev => ({ ...prev, ...urls }));
      } catch (e) {
        console.error('[Preview Imagen] Generation failed:', e);
      }
    }

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

    // Per-slide background color logic

    const slideLayout = s.layout || 'content';

    const layoutStyles = currentDesign.layouts?.[slideLayout] || {};

    // Use slide.background if present, else template, else global

    let slideBg = s.background || layoutStyles.background || currentDesign.globalBackground;

    const titleColor = s.titleColor || layoutStyles.titleColor || currentDesign.globalTitleColor || '#000';

    const textColor = s.textColor || layoutStyles.textColor || currentDesign.globalTextColor || '#333';

    const theme = {

      background: slideBg,

      titleColor,

      textColor,

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

              <option>Poppins</option>

              <option>Roboto</option>

              <option>Montserrat</option>

              <option>Open Sans</option>

              <option>Lato</option>

              <option>Raleway</option>

              <option>Playfair Display</option>

              <option>Merriweather</option>

              <option>Georgia</option>

              <option>Times New Roman</option>

              <option>Courier New</option>

              <option>Verdana</option>

              <option>Tahoma</option>

              <option>Trebuchet MS</option>

              <option>Impact</option>

              <option>Gill Sans</option>

              <option>Segoe UI</option>

              <option>Helvetica</option>

              <option>Garamond</option>

              <option>Comic Sans MS</option>

              <option>Lucida Console</option>

            </select>

            <input 
              type="number" 
              value={tempFontSizes[`title-${s.id}`] !== undefined ? tempFontSizes[`title-${s.id}`] : (s.styles?.titleSize || 32)}
              style={{width:64}} 
              onChange={(e) => {
                const val = e.target.value;
                setTempFontSizes(prev => ({...prev, [`title-${s.id}`]: val}));
              }} 
              onBlur={(e) => {
                const val = e.target.value;
                if (val === '') {
                  handleStyleChange(s.id, 'titleSize', 32);
                } else {
                  const num = Number(val);
                  if (!isNaN(num)) {
                    handleStyleChange(s.id, 'titleSize', num);
                  }
                }
                setTempFontSizes(prev => ({...prev, [`title-${s.id}`]: undefined}));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.target.blur();
              }}
            />

            <button className="toolbar-button" onClick={() => handleStyleChange(s.id, 'titleBold', !s.styles?.titleBold)} style={{fontWeight: s.styles?.titleBold ? 700 : 400}}>B</button>

            <button className="toolbar-button" onClick={() => handleStyleChange(s.id, 'titleItalic', !s.styles?.titleItalic)} style={{fontStyle: s.styles?.titleItalic ? 'italic' : 'normal'}}>I</button>

          </div>

          <div style={{display:'flex', gap:8, alignItems:'center'}}>

            <label style={{fontSize:12}}>Text:</label>

            <select value={s.styles?.textFont || 'Arial'} onChange={(e) => handleStyleChange(s.id, 'textFont', e.target.value)}>

              <option>Arial</option>

              <option>Inter</option>

              <option>Poppins</option>

              <option>Roboto</option>

              <option>Montserrat</option>

              <option>Open Sans</option>

              <option>Lato</option>

              <option>Raleway</option>

              <option>Playfair Display</option>

              <option>Merriweather</option>

              <option>Georgia</option>

              <option>Times New Roman</option>

              <option>Courier New</option>

            </select>

            <input 
              type="number" 
              value={tempFontSizes[`text-${s.id}`] !== undefined ? tempFontSizes[`text-${s.id}`] : (s.styles?.textSize || 16)}
              style={{width:56}} 
              onChange={(e) => {
                const val = e.target.value;
                setTempFontSizes(prev => ({...prev, [`text-${s.id}`]: val}));
              }} 
              onBlur={(e) => {
                const val = e.target.value;
                if (val === '') {
                  handleStyleChange(s.id, 'textSize', 16);
                } else {
                  const num = Number(val);
                  if (!isNaN(num)) {
                    handleStyleChange(s.id, 'textSize', num);
                  }
                }
                setTempFontSizes(prev => ({...prev, [`text-${s.id}`]: undefined}));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.target.blur();
              }}
            />

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

          <div style={{marginLeft:'auto', display:'flex', gap:8, alignItems: tableCreator.slideId === s.id ? 'flex-start' : 'center', position:'relative'}}>

            <div

              ref={(el) => { if (el) stickerAnchorRefs.current[s.id] = el; }}

              style={{ position:'relative', display:'inline-block' }}

            >

              <button className="toolbar-button" onClick={() => setOpenStickerFor(openStickerFor === s.id ? null : s.id)}>

                🧩 Stickers

              </button>

              {openStickerFor === s.id && (

                <div

                  style={{ position:'absolute', top:'100%', left:0, marginTop:6, background:'#fff', border:'1px solid rgba(0,0,0,0.12)', borderRadius:10, padding:8, display:'flex', flexDirection:'column', gap:8, zIndex:1000, maxHeight:280, boxShadow:'0 4px 12px rgba(0,0,0,0.12)', minWidth:260 }}

                  onMouseDown={(e) => e.stopPropagation()}

                >
                  {/* AI Search Input */}
                  <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                    <input
                      type="text"
                      placeholder="🔍 Search stickers... (e.g., 'arrow', 'heart', 'star')"
                      value={stickerSearchQuery}
                      onChange={(e) => setStickerSearchQuery(e.target.value)}
                      style={{
                        width:'100%',
                        padding:'8px 12px',
                        border:'1px solid rgba(0,0,0,0.15)',
                        borderRadius:8,
                        fontSize:13,
                        outline:'none',
                        transition:'all 0.2s'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#6D4FC2';
                        e.target.style.boxShadow = '0 0 0 3px rgba(109, 79, 194, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(0,0,0,0.15)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  
                  {/* Sticker Grid */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 40px)', gap:6, maxHeight:200, overflowY:'auto' }}>
                    {(() => {
                      const filtered = filterStickers(stickerSearchQuery);
                      
                      // Show local stickers if found
                      if (filtered.length > 0) {
                        return filtered.map(({cat,item},i) => {
                          const full = `/stickers/${cat}/${item}`;
                          return <img key={i} src={full} alt={`st-${i}`} onClick={() => { handleAddSticker(s.id, full); setStickerSearchQuery(""); setExternalStickers([]); }} style={{ width: 40, height: 40, objectFit: 'contain', cursor: 'pointer', borderRadius:4, transition:'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'} onError={(e)=>{ e.currentTarget.style.opacity = 0.3; }} />
                        });
                      }
                      
                      // Show loading state
                      if (loadingExternalStickers) {
                        return (
                          <div style={{ gridColumn:'1/-1', padding:20, textAlign:'center', fontSize:13, color:'#6D4FC2' }}>
                            <div style={{ margin:'0 auto 8px', width:20, height:20, border:'3px solid rgba(109, 79, 194, 0.3)', borderTop:'3px solid #6D4FC2', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}></div>
                            <div>🌐 Searching online stickers...</div>
                          </div>
                        );
                      }
                      
                      // Show external stickers if found
                      if (externalStickers.length > 0) {
                        return (
                          <>
                            <div style={{ gridColumn:'1/-1', padding:'6px 4px', fontSize:11, fontWeight:600, color:'#6D4FC2', borderBottom:'1px solid rgba(109, 79, 194, 0.2)', marginBottom:4 }}>
                              🌐 Online Stickers (Click to import)
                            </div>
                            {externalStickers.map((extSticker, idx) => (
                              <div
                                key={idx}
                                style={{
                                  width:40,
                                  height:40,
                                  cursor:'pointer',
                                  display:'flex',
                                  alignItems:'center',
                                  justifyContent:'center',
                                  borderRadius:6,
                                  transition:'all 0.15s',
                                  border:'2px solid rgba(109, 79, 194, 0.3)',
                                  background:'linear-gradient(135deg, rgba(109, 79, 194, 0.08), rgba(147, 51, 234, 0.08))'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.15)';
                                  e.currentTarget.style.boxShadow = '0 3px 12px rgba(109, 79, 194, 0.35)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                                onClick={() => {
                                  // Convert SVG to data URL for direct embedding
                                  const svgBlob = new Blob([extSticker.svg], { type: 'image/svg+xml' });
                                  const url = URL.createObjectURL(svgBlob);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    const dataUrl = reader.result;
                                    handleAddSticker(s.id, dataUrl);
                                    setStickerSearchQuery('');
                                    setExternalStickers([]);
                                    URL.revokeObjectURL(url);
                                  };
                                  reader.readAsDataURL(svgBlob);
                                }}
                                title={extSticker.name}
                              >
                                <div dangerouslySetInnerHTML={{ __html: extSticker.svg }} style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center' }} />
                              </div>
                            ))}
                          </>
                        );
                      }
                      
                      // No results at all
                      return (
                        <div style={{ gridColumn:'1/-1', textAlign:'center', padding:20, color:'#999', fontSize:13 }}>
                          {stickerSearchQuery.trim().length > 2 
                            ? '🔍 No stickers found. Try different keywords!' 
                            : 'Type to search local or online stickers'}
                        </div>
                      );
                    })()}
                  </div>

                </div>

              )}

            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:6, position:'relative' }}>

              {/* Add Image Button - Shows when image is removed */}
              {s.removedImage && (
                <button
                  className="toolbar-button"
                  title="Add image to slide"
                  onClick={() => handleAddImageBack(s.id)}
                  style={{ display:'flex', alignItems:'center', gap:6, background: 'transparent', borderColor: undefined }}
                >
                  <FaUpload /> Add Image
                </button>
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

            onClick={(e) => {
              e.stopPropagation();
              handleDeleteSlide(s.id);
            }}

            title="Delete this slide"

            style={{

              position: 'absolute',

              top: '10px',

              right: '10px',

              backgroundColor: '#ef4444',

              color: '#ffffff',

              border: 'none',

              borderRadius: '50%',

              width: '36px',

              height: '36px',

              cursor: 'pointer',

              zIndex: 1000,

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',

              transition: 'all 0.2s ease',

            }}

            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}

            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
              e.currentTarget.style.transform = 'scale(1)';
            }}

          >

            <FaTrash size={14} />

          </button>

          <div className="slide-content-area" style={{ display: 'none' }}></div>

          {/* Tables & stickers overlay container */}

          <div

            ref={(el) => { if (el) containerRefs.current[s.id] = el; }}

            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}

          >
            {/* Title Box */}
            {(() => {
               // IMPORTANT: This must EXACTLY match the backend PPTX generation logic
               // The backend calculates image/body/title positioning independently
               // DO NOT rely on frontend imageData - mirror backend defaults exactly
               
               const SLIDE_WIDTH = 10.0;  // inches
               const SLIDE_HEIGHT = 5.625; // inches
               const hasImage = Boolean(s.uploadedImage || (s.imagePrompt && (s.imageData || s.imagePosition)));
               const imagePosition = s.imagePosition || 'right';
               
               // Convert backend inches to normalized (0-1) for CSS positioning
               const toNormalized = (inches, slideSize) => inches / slideSize;
               
               let finalTitleX, finalTitleY, finalTitleW, finalTitleH;
               
               if (s.titleBox) {
                 // Use manual titleBox if provided (already in normalized form)
                 finalTitleX = s.titleBox.x;
                 finalTitleY = s.titleBox.y;
                 finalTitleW = s.titleBox.width;
                 finalTitleH = s.titleBox.height;
               } else if (hasImage) {
                 // Mirror backend logic exactly for image positioning
                 // Backend calculates bodyX/bodyW based on image position
                 let bodyX_inches = 0.5;
                 let bodyW_inches = 9.0;
                 
                 if (imagePosition === 'center') {
                   bodyX_inches = 0.5;
                   bodyW_inches = 9.0;
                 } else if (imagePosition === 'left') {
                   bodyX_inches = (0.05 + 0.35 + 0.04) * 10.0; // After image + margin
                   bodyW_inches = 10.0 - bodyX_inches - 0.5;
                 } else {
                   // right
                   bodyX_inches = 0.5;
                   bodyW_inches = (0.6 - 0.05) * 10.0; // Space before image
                 }
                 
                 // Convert to normalized
                 finalTitleX = toNormalized(bodyX_inches, SLIDE_WIDTH);
                 finalTitleW = toNormalized(bodyW_inches, SLIDE_WIDTH);
                 
                 // Title positioning for center layout
                 if (imagePosition === 'center') {
                   finalTitleY = toNormalized(0.35, SLIDE_HEIGHT);   // Backend: 0.35"
                   finalTitleH = toNormalized(0.56, SLIDE_HEIGHT);   // Backend: 0.56" (0.1 * 5.625)
                 } else {
                   finalTitleY = toNormalized(0.5, SLIDE_HEIGHT);
                   finalTitleH = toNormalized(0.8, SLIDE_HEIGHT);
                 }
              } else {
                // Fallback defaults (no image)
                finalTitleX = toNormalized(0.5, SLIDE_WIDTH);
                finalTitleW = toNormalized(9.0, SLIDE_WIDTH);
                finalTitleY = toNormalized(0.35, SLIDE_HEIGHT);
                finalTitleH = toNormalized(1.0, SLIDE_HEIGHT);
              }
              
              const titleBox = { x: finalTitleX, y: finalTitleY, width: finalTitleW, height: finalTitleH, zIndex: 100 };
              const isSelected = selectedTextBox?.slideId === s.id && selectedTextBox?.type === 'title';
              const isEditing = s.editingTitle;
              
              // Match PPT defaults: title 44pt for title layout, else 32pt
              const baseTitleFontSize = (() => {
                if (typeof s.styles?.titleSize === 'number' && s.styles.titleSize > 0) return s.styles.titleSize;
                const layout = s.layout || 'content';
                return layout === 'title' ? 44 : 32;
              })();

              // Auto-shrink title font size for very long titles so it stays inside the slide
              let autoTitleFontSize = baseTitleFontSize;
              try {
                const titleText = (s.title || 'Click to add title').trim();
                const approxLength = titleText.length;
                if (approxLength > 0) {
                  // Heuristic: keep full size up to ~40 chars, then shrink gradually
                  const safeLength = 40;
                  if (approxLength > safeLength) {
                    const shrinkRatio = safeLength / approxLength;
                    const estimated = Math.floor(baseTitleFontSize * shrinkRatio);
                    autoTitleFontSize = Math.max(estimated, 14); // never go below 14pt
                  }
                }
              } catch {
                autoTitleFontSize = baseTitleFontSize;
              }
               
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
                     setSelectedTable(null);
                     setDraggingTextBox({ slideId: s.id, type: 'title', startX: ev.clientX, startY: ev.clientY, origX: titleBox.x, origY: titleBox.y, origW: titleBox.width, origH: titleBox.height, rect, pointerId: ev.pointerId });
                   }}
                   onClick={(ev) => {
                     ev.stopPropagation();
                     setSelectedTextBox({ slideId: s.id, type: 'title' });
                     setSelectedSticker(null);
                     setSelectedImage(null);
                     setSelectedTable(null);
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
                       color: s.titleColor || titleColor || '#000',
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
            })()}

            {/* Body Box */}
            {(() => {
               // IMPORTANT: This must EXACTLY match the backend PPTX generation logic in pptxService.js
               // Backend uses inches; we convert to normalized (0-1) for CSS positioning
               
               // Convert backend inches to normalized (0-1) for CSS positioning
               const toNormalized = (inches, slideSize) => inches / slideSize;
               
               const hasImage = Boolean(s.uploadedImage || (s.imagePrompt && (s.imageData || s.imagePosition)));
               const imagePosition = s.imagePosition || 'right';
               let computedBodyBox = s.bodyBox;

               if (!computedBodyBox) {
                 // Calculate body box using exact backend logic
                 const SLIDE_WIDTH = 10.0;  // inches
                 const SLIDE_HEIGHT = 5.625; // inches
                 
                 let bodyX_inches = 0.5;
                 let bodyW_inches = 9.0;
                 let bodyY_inches, bodyH_inches;
                 
                 if (hasImage) {
                   // Backend places body at Y=1.5", H=3.5" when image is present
                   bodyY_inches = 1.5;
                   bodyH_inches = 3.5;
                   
                   // Body X/W depends on image position
                   if (imagePosition === 'left') {
                     // Image on left: body on right side
                     // Backend: bodyX = (0.05 + 0.35 + 0.04) * 10 = 4.4"
                     // Backend: bodyW = 10.0 - 4.4 - 0.5 = 5.1"
                     bodyX_inches = 4.4;
                     bodyW_inches = 5.1;
                   } else if (imagePosition === 'right') {
                     // Image on right: body on left side
                     // Backend: bodyX = 0.5", bodyW = (0.6 - 0.05) * 10 = 5.5"
                     bodyX_inches = 0.5;
                     bodyW_inches = 5.5;
                   } else {
                     // Image in center: body spans full width
                     bodyX_inches = 0.5;
                     bodyW_inches = 9.0;
                   }
                 } else {
                   // No image: body takes full width
                   // Backend: Y=1.6", H=3.6" (slightly lower and taller than with image)
                   bodyX_inches = 0.5;
                   bodyW_inches = 9.0;
                   bodyY_inches = 1.6;
                   bodyH_inches = 3.6;
                 }
                 
                 // Convert inches to normalized (0-1)
                 computedBodyBox = {
                   x: toNormalized(bodyX_inches, SLIDE_WIDTH),
                   y: toNormalized(bodyY_inches, SLIDE_HEIGHT),
                   width: toNormalized(bodyW_inches, SLIDE_WIDTH),
                   height: toNormalized(bodyH_inches, SLIDE_HEIGHT),
                   zIndex: 100
                 };
               }

               const bodyBox = computedBodyBox;
               const isSelected = selectedTextBox?.slideId === s.id && selectedTextBox?.type === 'body';
               const isEditing = s.editingContent;
               
              const bulletLines = getBulletLines(s);
              const lineCount = Math.max(1, bulletLines.length);
               const containerRect = containerRefs.current[s.id]?.getBoundingClientRect();

              // Font size auto-shrink logic to prevent overflow
              const bodyBoxHeightPx = containerRect ? containerRect.height * bodyBox.height : 300;
              const requestedFontSize =
                typeof s.styles?.textSize === 'number' && s.styles.textSize > 0
                  ? s.styles.textSize
                  : (s.layout || 'content') === 'title'
                    ? 24
                    : 18;

              // Work only from available height & number of lines:
              // maxFontPerLine = boxHeight / (lines * lineHeight * pxPerPt)
              const lineHeightEm = 1.2;
              const pxPerPoint = 1.33;
              const safeMinPt = 8; // allow smaller text when content is very long

              // If we don't know the container yet, fall back to requested size
              let autoFontSize = requestedFontSize;
              if (containerRect && lineCount > 0) {
                const maxPtThatFits = Math.floor(
                  bodyBoxHeightPx / (lineCount * lineHeightEm * pxPerPoint)
                );
                autoFontSize = Math.max(
                  Math.min(requestedFontSize, maxPtThatFits),
                  safeMinPt
                );
              }

               const autoBodyBox = bodyBox;

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
                     setSelectedTable(null);
                     setDraggingTextBox({ slideId: s.id, type: 'body', startX: ev.clientX, startY: ev.clientY, origX: autoBodyBox.x, origY: autoBodyBox.y, origW: autoBodyBox.width, origH: autoBodyBox.height, rect, pointerId: ev.pointerId });
                   }}
                   onClick={(ev) => {
                     ev.stopPropagation();
                     setSelectedTextBox({ slideId: s.id, type: 'body' });
                     setSelectedSticker(null);
                     setSelectedImage(null);
                     setSelectedTable(null);
                   }}
                   onDoubleClick={(ev) => {
                     ev.stopPropagation();
                     handleSlideChange(s.id, 'editingContent', true);
                   }}
                   style={{
                     position: 'absolute',
                     left: `${autoBodyBox.x * 100}%`,
                     top: `${autoBodyBox.y * 100}%`,
                     width: `${autoBodyBox.width * 100}%`,
                     height: `${autoBodyBox.height * 100}%`,
                     zIndex: autoBodyBox.zIndex !== undefined ? autoBodyBox.zIndex : 100,
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
                       color: s.textColor || theme.textColor || '#333',
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
                               setResizingTextBox({ slideId: s.id, type: 'body', mode, startX: e.clientX, startY: e.clientY, origX: autoBodyBox.x, origY: autoBodyBox.y, origW: autoBodyBox.width, origH: autoBodyBox.height, origFontSize: s.styles?.textSize || 16, rect });
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
                               setResizingTextBox({ slideId: s.id, type: 'body', mode, startX: e.clientX, startY: e.clientY, origX: autoBodyBox.x, origY: autoBodyBox.y, origW: autoBodyBox.width, origH: autoBodyBox.height, origFontSize: s.styles?.textSize || 16, rect });
                             }}
                             style={{ position: 'absolute', backgroundColor: '#fff', border: '1px solid #8b5cf6', zIndex: 20, pointerEvents: 'auto', ...style }}
                           />
                         );
                       })}
                     </>
                   )}
                 </div>
               );
            })()}

            {(s.tables || []).map((t, tIdx) => {

              const isSelected = selectedTable && selectedTable.slideId === s.id && selectedTable.index === tIdx;

              const cells = ensureTableCells(t.rows || 1, t.cols || 1, t.cells);

              const resolvedBackground = (!t.background || t.background === 'rgba(255,255,255,0.3)') ? '#ffffff' : t.background;

              const resolvedBorder = t.borderColor || '#111827';

              const resolvedBorderWidth = typeof t.borderWidth === 'number' ? t.borderWidth : DEFAULT_BORDER_WIDTH;

              const resolvedBorderStyle = t.borderStyle || 'solid';

              const normalizedBorderStyle = resolvedBorderStyle === 'dotted' ? 'dashed' : resolvedBorderStyle;

              const hexColorRegex = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

              const backgroundColorForPicker = hexColorRegex.test(resolvedBackground) ? resolvedBackground : '#ffffff';

              const borderColorForPicker = hexColorRegex.test(resolvedBorder) ? resolvedBorder : '#111827';

              const rowCount = Math.max(1, t.rows || cells.length || 1);

              const colCount = Math.max(1, t.cols || (cells[0]?.length ?? 1));

              const columnWidths = Array.isArray(t.columnWidths) ? ensureSegments(colCount, t.columnWidths, MIN_COLUMN_RATIO) : ensureSegments(colCount, undefined, MIN_COLUMN_RATIO);

              const rowHeights = Array.isArray(t.rowHeights) ? ensureSegments(rowCount, t.rowHeights, MIN_ROW_RATIO) : ensureSegments(rowCount, undefined, MIN_ROW_RATIO);

              const densityFactor = Math.max(rowCount - 3, 0) + Math.max(colCount - 3, 0);

              const cellPadding = clampValue(10 - densityFactor * 1.1, 3, 10);

              const cellFontSize = clampValue(13 - densityFactor * 0.6, 9, 13);

              const cellMinHeight = clampValue(28 - Math.max(0, rowCount - 3) * 3, 14, 28);

              const tableRefKey = `${s.id}-${tIdx}`;

              const columnBoundaries = [];

              let columnAccumulator = 0;

              columnWidths.forEach((portion, idx) => {

                columnAccumulator += portion;

                if (idx < columnWidths.length - 1) columnBoundaries.push(columnAccumulator);

              });

              const rowBoundaries = [];

              let rowAccumulator = 0;

              rowHeights.forEach((portion, idx) => {

                rowAccumulator += portion;

                if (idx < rowHeights.length - 1) rowBoundaries.push(rowAccumulator);

              });

              return (

                <div

                  key={`tbl-${s.id}-${tIdx}`}

                  data-table-wrapper

                  ref={(el) => {

                    if (el) {

                      tableFrameRefs.current[tableRefKey] = el;

                    } else {

                      delete tableFrameRefs.current[tableRefKey];

                    }

                  }}

                  onPointerDown={(ev) => {

                    if (ev.target.closest('[data-table-cell]')) return;

                    ev.stopPropagation();

                    ev.preventDefault();

                    const rect = containerRefs.current[s.id]?.getBoundingClientRect() || { width: 1, height: 1 };

                    try { ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) { console.warn('table pointerCapture failed', e); }

                    setSelectedSticker(null);

                    setSelectedImage(null);

                    setSelectedTable({ slideId: s.id, index: tIdx });

                    setDraggingTable({ slideId: s.id, index: tIdx, startX: ev.clientX, startY: ev.clientY, origX: t.x || 0, origY: t.y || 0, rect, pointerId: ev.pointerId });

                  }}

                  onClick={(ev) => {

                    if (ev.target.closest('[data-table-cell]')) return;

                    ev.stopPropagation();

                    setSelectedSticker(null);

                    setSelectedImage(null);

                    setSelectedTable({ slideId: s.id, index: tIdx });

                  }}

                  style={{

                    position: 'absolute',

                    left: `${(t.x || 0) * 100}%`,

                    top: `${(t.y || 0) * 100}%`,

                    width: `${(t.width || 0.5) * 100}%`,

                    height: `${(t.height || 0.3) * 100}%`,

                    pointerEvents: 'auto',

                    touchAction: 'none',

                    cursor: 'move',

                    background: resolvedBackground,

                    border: `${resolvedBorderWidth}px ${normalizedBorderStyle} ${resolvedBorder}`,

                    borderRadius: 0,

                    boxShadow: 'none',

                    overflow: 'visible',

                    zIndex: t.zIndex !== undefined ? t.zIndex : (isSelected ? 100 : 10)

                  }}

                >

                  <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', pointerEvents: 'auto' }}>

                    <colgroup>

                      {columnWidths.map((portion, cIdx) => (

                        <col key={`tbl-${s.id}-${tIdx}-col-${cIdx}`} style={{ width: `${portion * 100}%` }} />

                      ))}

                    </colgroup>

                    <tbody>

                      {cells.map((row, rowIdx) => (

                        <tr key={`tbl-${s.id}-${tIdx}-row-${rowIdx}`} style={{ height: `${(rowHeights[rowIdx] || (1 / rowCount)) * 100}%` }}>

                          {row.map((cellValue, colIdx) => (

                            <td

                              key={`tbl-${s.id}-${tIdx}-cell-${rowIdx}-${colIdx}`}

                              style={{

                                border: `${resolvedBorderWidth}px ${normalizedBorderStyle} ${resolvedBorder}`,

                                background: resolvedBackground,

                                padding: 0,

                                verticalAlign: 'top'

                              }}

                            >

                              <textarea

                                data-table-cell

                                value={cellValue}

                                onChange={(e) => handleTableCellChange(s.id, tIdx, rowIdx, colIdx, e.target.value)}

                                onPointerDown={(e) => {

                                  e.stopPropagation();

                                  setActiveTableCell({ slideId: s.id, tableIndex: tIdx, rowIndex: rowIdx, colIndex: colIdx });

                                }}

                                onFocus={() => {

                                  setSelectedSticker(null);

                                  setSelectedTable({ slideId: s.id, index: tIdx });

                                  setActiveTableCell({ slideId: s.id, tableIndex: tIdx, rowIndex: rowIdx, colIndex: colIdx });

                                }}

                                spellCheck={false}

                                style={{

                                  width: '100%',

                                  height: '100%',

                                  resize: 'none',

                                  border: 'none',

                                  background: 'transparent',

                                  color: '#111827',

                                  fontSize: `${cellFontSize}pt`,

                                  fontFamily: 'inherit',

                                  textAlign: 'left',

                                  lineHeight: 1.35,

                                  outline: 'none',

                                  padding: `${cellPadding}px`,

                                  whiteSpace: 'pre-wrap',

                                  overflow: 'auto',

                                  cursor: 'text',

                                  borderRadius: 6,

                                  boxSizing: 'border-box',

                                  boxShadow: 'none',

                                  minHeight: cellMinHeight

                                }}

                              />

                            </td>

                          ))}

                        </tr>

                      ))}

                    </tbody>

                  </table>

                  {isSelected && (

                    <>

                      <div

                        onPointerDown={(ev) => ev.stopPropagation()}

                        onClick={(ev) => ev.stopPropagation()}

                        style={{

                          position: 'absolute',

                          top: 0,

                          left: '50%',

                          transform: 'translate(-50%, calc(-100% - 8px))',

                          display: 'flex',

                          alignItems: 'center',

                          gap: 10,

                          flexWrap: 'nowrap',

                          background: 'linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)',

                          padding: '8px 12px',

                          borderRadius: 12,

                          boxShadow: '0 6px 20px rgba(0,0,0,0.6)',

                          pointerEvents: 'auto',

                          color: '#f8fafc',

                          fontSize: 11,

                          fontWeight: 600,

                          zIndex: 35,

                          border: '1px solid rgba(148,163,184,0.25)'

                        }}

                      >

                        <div style={{ display: 'flex', gap: 4 }}>

                          <button

                            onClick={() => handleAddTableRow(s.id, tIdx)}

                            style={{ background: '#3b82f6', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}

                            title="Add Row"

                          >

                            + Row

                          </button>

                          <button

                            onClick={() => handleAddTableColumn(s.id, tIdx)}

                            style={{ background: '#3b82f6', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}

                            title="Add Column"

                          >

                            + Col

                          </button>

                          <button

                            onClick={() => handleRemoveTableRow(s.id, tIdx)}

                            style={{ background: '#ef4444', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 10, fontWeight: 600, opacity: (t.rows || 1) <= 1 ? 0.4 : 1 }}

                            disabled={(t.rows || 1) <= 1}

                            title="Remove Row"

                          >

                            − Row

                          </button>

                          <button

                            onClick={() => handleRemoveTableColumn(s.id, tIdx)}

                            style={{ background: '#ef4444', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 10, fontWeight: 600, opacity: (t.cols || 1) <= 1 ? 0.4 : 1 }}

                            disabled={(t.cols || 1) <= 1}

                            title="Remove Column"

                          >

                            − Col

                          </button>

                        </div>

                        <div style={{ width: 1, height: 24, background: 'rgba(148,163,184,0.3)' }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>

                          <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>

                            <span style={{ fontSize: 10 }}>Shading</span>

                            <input

                              type="color"

                              value={backgroundColorForPicker}

                              onChange={(ev) => handleTableBackgroundChange(s.id, tIdx, ev.target.value)}

                              style={{ width: 26, height: 20, border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', borderRadius: 4 }}

                            />

                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>

                            <span style={{ fontSize: 10 }}>Border</span>

                            <input

                              type="color"

                              value={borderColorForPicker}

                              onChange={(ev) => handleTableBorderColorChange(s.id, tIdx, ev.target.value)}

                              style={{ width: 26, height: 20, border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', borderRadius: 4 }}

                            />

                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>

                            <span style={{ fontSize: 10 }}>Width</span>

                            <select

                              value={String(resolvedBorderWidth)}

                              onChange={(ev) => handleTableBorderWidthChange(s.id, tIdx, Number(ev.target.value))}

                              style={{ background: 'rgba(15,23,42,0.95)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '3px 7px', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}

                            >

                              {BORDER_WIDTH_OPTIONS.map((opt) => (

                                <option key={opt.value} value={opt.value}>{opt.label}</option>

                              ))}

                            </select>

                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>

                            <span style={{ fontSize: 10 }}>Style</span>

                            <select

                              value={normalizedBorderStyle}

                              onChange={(ev) => handleTableBorderStyleChange(s.id, tIdx, ev.target.value)}

                              style={{ background: 'rgba(15,23,42,0.95)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '3px 7px', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}

                            >

                              {BORDER_STYLE_OPTIONS.map((opt) => (

                                <option key={opt.value} value={opt.value}>{opt.label}</option>

                              ))}

                            </select>

                          </label>

                        </div>

                        <div style={{ width: 1, height: 24, background: 'rgba(148,163,184,0.3)' }} />

                        {/* Layering buttons removed as requested */}

                      </div>

                      <button

                        onPointerDown={(ev) => {

                          ev.stopPropagation();

                          ev.preventDefault();

                        }}

                        onClick={(ev) => {

                          ev.stopPropagation();

                          ev.preventDefault();

                          handleRemoveTable(s.id, tIdx);

                        }}

                        style={{ position: 'absolute', top: -28, right: -28, width: 28, height: 28, borderRadius: 14, border: 'none', background: '#ff4757', color: '#fff', cursor: 'pointer', pointerEvents: 'auto', zIndex: 30 }}

                        title="Remove table (Del)"

                      >×</button>

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

                              try { ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) { console.warn('table resize pointerCapture failed', e); }

                              setResizingTable({ slideId: s.id, index: tIdx, mode, startX: ev.clientX, startY: ev.clientY, origX: t.x || 0, origY: t.y || 0, origW: t.width || 0.5, origH: t.height || 0.3, rect, pointerId: ev.pointerId });

                            }}

                            style={{ position: 'absolute', width: 16, height: 16, background: '#ffffff', border: '1px solid rgba(107,114,128,0.6)', borderRadius: 3, pointerEvents: 'auto', touchAction: 'none', boxShadow: '0 1px 2px rgba(15,23,42,0.15)', zIndex: 25, ...pos }}

                          />

                        );

                      })}

                      {/* Column and row resize guides removed per request */}

                    </>

                  )}

                </div>

              );

            })}

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

                  setSelectedTable(null);

                  setSelectedImage(null);

                  setDraggingSticker({ slideId: s.id, index: idx, startX: ev.clientX, startY: ev.clientY, origX: g.x || 0, origY: g.y || 0, rect, pointerId: ev.pointerId });

                }}

                onClick={(ev) => { ev.stopPropagation(); setSelectedSticker({ slideId: s.id, index: idx }); setSelectedTable(null); setSelectedImage(null); }}

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

                    {/* Layering buttons removed as requested */}

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

            {/* AI Generated / Uploaded Image Overlay */}
            {!s.removedImage && (s.uploadedImage || previewImageUrls[s.id] || showImageColumn) && (
              <div
                key={`img-${s.id}`}
                data-image-wrapper
                onPointerDown={(ev) => {
                  console.log('[IMAGE] Pointer down on image', s.id);
                  ev.stopPropagation();
                  ev.preventDefault();
                  const rect = containerRefs.current[s.id]?.getBoundingClientRect() || { width: 1, height: 1 };
                  console.log('[IMAGE] Container rect:', rect);
                  try { ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
                  setSelectedImage(s.id);
                  setSelectedTable(null);
                  setSelectedSticker(null);
                  
                  // Start dragging
                  const imgData = s.imageData || { x: 0.5, y: 0.15, width: 0.4, height: 0.6 };
                  console.log('[IMAGE] Starting drag with imgData:', imgData);
                  const dragData = { 
                    slideId: s.id, 
                    index: -1, // Special index for image
                    startX: ev.clientX, 
                    startY: ev.clientY, 
                    origX: imgData.x || 0.5, 
                    origY: imgData.y || 0.15, 
                    rect, 
                    pointerId: ev.pointerId 
                  };
                  console.log('[IMAGE] Setting draggingSticker:', dragData);
                  setDraggingSticker(dragData);
                }}
                onClick={(ev) => { 
                  ev.stopPropagation(); 
                  setSelectedImage(s.id);
                  setSelectedTable(null);
                  setSelectedSticker(null);
                }}
                style={{
                  position: 'absolute',
                  left: `${((s.imageData?.x || 0.5) * 100)}%`,
                  top: `${((s.imageData?.y || 0.15) * 100)}%`,
                  width: `${((s.imageData?.width || 0.4) * 100)}%`,
                  height: `${((s.imageData?.height || 0.6) * 100)}%`,
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

                    {/* Layering buttons removed as requested */}

                    <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

                    {/* Upload Button */}
                    <label htmlFor={`upload-${s.id}`} style={{
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
                          const imgData = s.imageData || { x: 0.5, y: 0.15, width: 0.4, height: 0.6 };
                          setResizingSticker({ 
                            slideId: s.id, 
                            index: -1, // Special index for image
                            mode, 
                            startX: ev.clientX, 
                            startY: ev.clientY, 
                            origX: imgData.x || 0.5, 
                            origY: imgData.y || 0.15, 
                            origW: imgData.width || 0.4, 
                            origH: imgData.height || 0.6, 
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
            )}

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

                  {(() => {

                    const src = TEMPLATE_THUMB_OVERRIDES[tpl.name] || tpl.thumbnail;

                    return (

                      <img

                        src={src}

                        alt={tpl.name}

                        onError={(e) => {

                          e.currentTarget.onerror = null;

                          e.currentTarget.src = buildTemplateFallbackThumb(tpl.name);

                        }}

                      />

                    );

                  })()}

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

            <button 
              className="btn-guide" 
              onClick={() => setShowGuide(true)} 
              title="Open Guide"
              style={{
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >

              <FaQuestionCircle /> Guide

            </button>

            <button className="btn-back" onClick={() => {

              // Try to get convId from location.state if present

              const convId = location.state?.convId || topic;

              saveDraft(editedSlides, topic, convId, currentDesign, imageProvider);

              navigate(-1);

            }}>

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

          <div style={{ background:'#fff', width:'90%', maxWidth:1300, maxHeight:'90%', borderRadius:12, padding:16, display:'flex', flexDirection:'column', boxShadow:'0 8px 24px rgba(0,0,0,0.25)', overflow:'hidden' }}>

            {/* Header */}

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 8px 12px 8px' }}>

              <h2 style={{ margin:0, fontSize:18 }}>Download Preview</h2>

              <div style={{ display:'flex', alignItems:'center', gap:16 }}>

                <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:14, color:'#555' }}>

                  <input 

                    type="checkbox" 

                    checked={showImageColumn} 

                    onChange={(e) => setShowImageColumn(e.target.checked)}

                    style={{ cursor:'pointer' }}

                  />

                  <span>Include Images in Download</span>

                </label>

                <button onClick={closePreviewModal} style={{ background:'#ff5a5f', color:'#fff', border:'none', width:26, height:26, borderRadius:'50%', cursor:'pointer', fontSize:14, lineHeight:'26px', textAlign:'center' }} title="Close">✕</button>

              </div>

            </div>

            <div style={{ fontSize:12, color:'#555', padding:'0 8px 10px 8px' }}>

              Slide {previewSlideIndex + 1} of {editedSlides.length}

              {!showImageColumn && <span style={{ marginLeft:12, color:'#f59e0b', fontWeight:600 }}>⚠ Images will not be included in download</span>}

            </div>

            {/* Slide area */}

            <div style={{ flex:1, overflow:'auto', border:'none', borderRadius:10, padding:20, background:'transparent', display:'flex', justifyContent:'center' }}>

              {(() => {

                const slide = editedSlides[previewSlideIndex];

                if (!slide) return <p>Missing slide.</p>;

                const layoutStyles = currentDesign.layouts?.[slide.layout] || {};

                // Prefer slide.background, then layout background, then design globalBackground

                let themeBg = slide.background || layoutStyles.background || currentDesign.globalBackground;

                // Use contrast logic for preview modal

                const titleColor = slide.titleColor || layoutStyles.titleColor || currentDesign.globalTitleColor || '#000';

                const textColor = slide.textColor || layoutStyles.textColor || currentDesign.globalTextColor || '#333';

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

                // eslint-disable-next-line no-unused-vars

                // eslint-disable-next-line no-unused-vars
                const isTitle = slide.layout === 'title';

                // Use same two-column layout as the editor slide card when image column is enabled

                // eslint-disable-next-line no-unused-vars
                const columns = showImageColumn ? '1fr 320px' : '1fr';

                // Only treat as paragraph text if explicit slide.text provided.

                // Do NOT auto-merge bullet arrays into one paragraph so preview matches editor.
                // UPDATE: Force usage of bulletLines to match backend behavior and ensure bullets are rendered
                const bodyText = null;
                /*
                const bodyText = (typeof slide.text === 'string' && slide.text.trim().length)

                  ? slide.text

                  : '';
                */

                const textAlignValue = slide.styles?.textAlign || 'left';

                const bodyFontWeight = slide.styles?.textBold ? 700 : 400;

                const bodyFontStyle = slide.styles?.textItalic ? 'italic' : 'normal';

                const bodyFontFamily = (slide.styles?.textFont === 'Courier New')

                  ? '"Courier New", Courier, monospace'

                  : (slide.styles?.textFont || currentDesign.font);

                // Define boxes for preview matching editor
                const titleBox = slide.titleBox || { x: 0.05, y: 0.0622, width: 0.9, height: 0.1778, zIndex: 100 };
                
                // Dynamic body box calculation to match PPT export logic
                // If showImageColumn is false, we treat it as having no image, so text expands
                const hasImage = showImageColumn && !slide.removedImage && Boolean(slide.uploadedImage || (slide.imagePrompt && (slide.imageData || slide.imagePosition)));
                let computedBodyBox = slide.bodyBox;
                
                if (hasImage && !computedBodyBox) {
                  const SLIDE_WIDTH = 10.0;  // inches
                  const SLIDE_HEIGHT = 5.625; // inches
                  const imagePosition = slide.imagePosition || 'right';
                  
                  let bodyX_inches = 0.5;
                  let bodyW_inches = 9.0;
                  let bodyY_inches = 1.5;
                  let bodyH_inches = 3.5;
                  
                  if (imagePosition === 'left') {
                    // Image on left: body on right side
                    bodyX_inches = 4.4;  // (0.05 + 0.35 + 0.04) * 10
                    bodyW_inches = 5.1;  // 10.0 - 4.4 - 0.5
                  } else if (imagePosition === 'right') {
                    // Image on right: body on left side
                    bodyX_inches = 0.5;
                    bodyW_inches = 5.5;  // (0.6 - 0.05) * 10
                  } else if (imagePosition === 'center') {
                    // Center: body below image
                    bodyX_inches = 0.5;
                    bodyW_inches = 9.0;
                    bodyY_inches = 3.54375; // Image bottom (1.265625 + 2.278125)
                    bodyH_inches = 1.88125; // Remaining space
                  }

                  computedBodyBox = {
                    x: bodyX_inches / SLIDE_WIDTH,
                    y: bodyY_inches / SLIDE_HEIGHT,
                    width: bodyW_inches / SLIDE_WIDTH,
                    height: bodyH_inches / SLIDE_HEIGHT,
                    zIndex: 100
                  };
                }

                const bodyBox = computedBodyBox || { x: 0.05, y: 0.2844, width: 0.9, height: 0.64, zIndex: 100 };

                // Calculate auto font size for title to match editor logic
                // Editor uses container height * box height * 0.75
                // Preview card is approx 1200x675
                const previewHeight = 675; 
                const titleBoxHeightPx = previewHeight * titleBox.height;
                const autoTitleFontSize = Math.max(12, Math.floor(titleBoxHeightPx * 0.75));
                const finalTitleFontSize = slide.styles?.titleSize ?? autoTitleFontSize;

                return (
                  <div style={{ position:'relative', width:'100%', maxWidth: 1200, aspectRatio: '16/9', minHeight:675, color:textColor, fontFamily: bodyFontFamily, borderRadius:8, overflow:'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 0, ...modalPreviewStyle }}>
                    
                    {/* Title */}
                    <div 
                      style={{
                        position: 'absolute',
                        left: `${titleBox.x * 100}%`,
                        top: `${titleBox.y * 100}%`,
                        width: `${titleBox.width * 100}%`,
                        height: `${titleBox.height * 100}%`,
                        zIndex: titleBox.zIndex !== undefined ? titleBox.zIndex : 100,
                        padding: '2px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        overflow: 'visible'
                      }}
                    >
                       <h2 style={{ fontSize: `${finalTitleFontSize}pt`, fontFamily: slide.styles?.titleFont || currentDesign.font, color:titleColor, margin:0, fontWeight: slide.styles?.titleBold ? 700 : 500, fontStyle: slide.styles?.titleItalic ? 'italic' : 'normal', width: '100%', lineHeight: 1.05 }}>{slide.title}</h2>
                    </div>

                    {/* Content */}
                    <div 
                      style={{
                        position: 'absolute',
                        left: `${bodyBox.x * 100}%`,
                        top: `${bodyBox.y * 100}%`,
                        width: `${bodyBox.width * 100}%`,
                        height: `${bodyBox.height * 100}%`,
                        zIndex: bodyBox.zIndex !== undefined ? bodyBox.zIndex : 100,
                        padding: '4px 8px',
                        overflow: 'visible',
                        color:textColor, 
                        fontFamily: bodyFontFamily,
                        fontSize: `${slide.styles?.textSize || 16}pt`,
                        fontWeight: bodyFontWeight,
                        fontStyle: bodyFontStyle,
                        textAlign: textAlignValue,
                        lineHeight: '1.3'
                      }}
                    >
                        {bodyText ? (
                          bodyText.split('\n').map((ln, idx) => (
                              <div key={idx} style={{ marginBottom: 6 }}>{replaceMarkdownBold(ln)}</div>
                          ))
                        ) : (
                          bulletLines.map((line,i) => (
                            <div key={i} style={{ marginBottom: 6 }}>
                              • {replaceMarkdownBold(line)}
                            </div>
                          ))
                        )}
                    </div>

                    {/* Image (Absolute) - show if there's an actual image, regardless of showImageColumn */}
                    {!slide.removedImage && (slide.uploadedImage || previewImageUrls[slide.id]) && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${((slide.imageData?.x || (previewSlideIndex === 2 ? 0.35 : 0.5)) * 100)}%`,
                          top: `${((slide.imageData?.y || (previewSlideIndex === 2 ? 0.23 : 0.15)) * 100)}%`,
                          width: `${((slide.imageData?.width || (previewSlideIndex === 2 ? 0.3 : 0.4)) * 100)}%`,
                          height: `${((slide.imageData?.height || (previewSlideIndex === 2 ? 0.36 : 0.6)) * 100)}%`,
                          zIndex: slide.imageData?.zIndex !== undefined ? slide.imageData.zIndex : 110,
                          borderRadius: 8,
                          overflow: 'hidden'
                        }}
                      >
                        <img 
                          src={slide.uploadedImage || previewImageUrls[slide.id]} 
                          alt="slide-img" 
                          style={{ width:'100%', height:'100%', objectFit:'cover' }} 
                        />
                      </div>
                    )}

                    {/* Tables and stickers render (absolute overlay using percentage layout) */}
                    <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
                      {(slide.tables || []).map((tbl, ti) => {
                        const previewCells = ensureTableCells(tbl.rows || 1, tbl.cols || 1, tbl.cells);
                        const previewBackground = (!tbl.background || tbl.background === 'rgba(255,255,255,0.3)') ? '#ffffff' : tbl.background;
                        const previewBorder = tbl.borderColor || '#111827';
                        const previewBorderWidth = typeof tbl.borderWidth === 'number' ? tbl.borderWidth : DEFAULT_BORDER_WIDTH;
                        const previewBorderStyle = (tbl.borderStyle === 'dotted') ? 'dashed' : (tbl.borderStyle || 'solid');
                        const previewRowCount = Math.max(1, tbl.rows || previewCells.length || 1);
                        const previewColCount = Math.max(1, tbl.cols || (previewCells[0]?.length ?? 1));
                        const previewDensity = Math.max(previewRowCount - 3, 0) + Math.max(previewColCount - 3, 0);
                        const previewPadding = clampValue(10 - previewDensity * 1.1, 3, 10);
                        const previewFontSize = clampValue(13 - previewDensity * 0.6, 9, 13);
                        const previewColumnWidths = Array.isArray(tbl.columnWidths) ? ensureSegments(previewColCount, tbl.columnWidths, MIN_COLUMN_RATIO) : ensureSegments(previewColCount, undefined, MIN_COLUMN_RATIO);
                        const previewRowHeights = Array.isArray(tbl.rowHeights) ? ensureSegments(previewRowCount, tbl.rowHeights, MIN_ROW_RATIO) : ensureSegments(previewRowCount, undefined, MIN_ROW_RATIO);
                        return (
                          <div
                          key={`preview-table-${ti}`}
                          style={{
                            position:'absolute',
                            left:`${(tbl.x || 0) * 100}%`,
                            top:`${(tbl.y || 0) * 100}%`,
                            width:`${(tbl.width || 0.5) * 100}%`,
                            height:`${(tbl.height || 0.3) * 100}%`,
                            pointerEvents:'none',
                            // Remove clipping so full table shows
                            overflow:'visible'
                          }}
                        >
                          <table style={{ width:'100%', height:'100%', borderCollapse:'collapse', tableLayout:'fixed', border: `${previewBorderWidth}px ${previewBorderStyle} ${previewBorder}` }}>
                            <colgroup>
                              {previewColumnWidths.map((portion, cIdx) => (
                                <col key={`preview-table-${ti}-col-${cIdx}`} style={{ width: `${portion * 100}%` }} />
                              ))}
                            </colgroup>
                            <tbody>
                              {previewCells.map((row, rIdx) => (
                                <tr key={`preview-table-${ti}-row-${rIdx}`} style={{ height: `${(previewRowHeights[rIdx] || (1 / previewRowCount)) * 100}%` }}>
                                  {row.map((cellValue, cIdx) => (
                                    <td
                                      key={`preview-table-${ti}-cell-${rIdx}-${cIdx}`}
                                      style={{
                                        border: `${previewBorderWidth}px ${previewBorderStyle} ${previewBorder}`,
                                        background: previewBackground,
                                        textAlign: 'left',
                                        padding: `${previewPadding}px`,
                                        fontSize: `${previewFontSize}pt`,
                                        color: '#111827',
                                        whiteSpace: 'pre-wrap',
                                        lineHeight: 1.35,
                                        verticalAlign: 'top'
                                      }}
                                    >{cellValue && cellValue.trim() ? cellValue : '\u00a0'}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        );
                      })}
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

      {/* Confirm Dialog for Delete Slide */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Slide"
        message="Are you sure you want to delete this slide? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteSlide}
        onCancel={() => setDeleteConfirm({ open: false, slideId: null })}
      />

      {/* Guide Modal */}
      <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />

    </div>

  );

}