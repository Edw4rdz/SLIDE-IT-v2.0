// EditPreview Utility Functions

import { FALLBACK_IMAGE, SLIDE_DIMENSIONS } from './constants';

/**
 * Convert a File/Blob or URL string to a data URL
 */
export function fileOrUrlToDataUrl(uploadedImage) {
  return new Promise((resolve) => {
    if (!uploadedImage) return resolve(null);
    if (typeof uploadedImage === 'string') return resolve(uploadedImage);
    if (uploadedImage instanceof File || uploadedImage instanceof Blob) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(uploadedImage);
    } else {
      resolve(null);
    }
  });
}

/**
 * Save draft to localStorage
 */
export async function saveDraft(slides, topic, convId, design, imageProvider) {
  try {
    const slidesWithImages = await Promise.all(slides.map(async (slide) => {
      let img = slide.uploadedImage || null;
      if (img && (img instanceof File || img instanceof Blob)) {
        img = await fileOrUrlToDataUrl(img);
      }
      return { 
        ...slide, 
        uploadedImage: img,
        uploadedImageKey: slide.uploadedImageKey || null
      };
    }));
    const draft = { 
      slides: slidesWithImages, 
      topic, 
      design: design ? { ...design } : null,
      imageProvider: imageProvider || 'pollinations'
    };
    const key = convId ? `slideit_draft_${convId}` : `slideit_draft_${topic}`;
    localStorage.setItem(key, JSON.stringify(draft));
    console.log(`[DRAFT SAVED] ${slides.length} slides saved to key: ${key}`);
  } catch (e) {
    console.warn('Failed to save draft:', e);
  }
}

/**
 * Get Pollinations image URL from prompt
 */
export const getPollinationsImageUrl = (prompt) => {
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') return null;
  const encodedPrompt = encodeURIComponent(prompt.trim());
  return `https://image.pollinations.ai/prompt/${encodedPrompt}`;
};

/**
 * Dynamically choose a reasonable starting font size based on content length
 */
export function calculateOptimalFontSize(text, type, defaultSize) {
  const safeDefault = Number.isFinite(defaultSize) && defaultSize > 0 ? defaultSize : 16;
  if (!text || typeof text !== 'string') return safeDefault;

  const len = text.trim().length;

  if (type === 'title') {
    if (len > 50 && len <= 90) {
      return Math.max(24, Math.round(safeDefault * 0.85));
    }
    if (len > 90) {
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

/**
 * Build a fallback thumbnail for templates
 */
export const buildTemplateFallbackThumb = (name = "Template") => {
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

/**
 * Clamp a value between min and max
 */
export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

/**
 * Convert hex color to rgba
 */
export const hexToRgba = (hex, alpha = 1) => {
  if (!hex || typeof hex !== 'string') return `rgba(0,0,0,${alpha})`;
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('');
  }
  if (h.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Build shape SVG with custom colors
 */
export const buildShapeSvg = (baseSvg, fill, stroke, strokeWidth) => {
  if (!baseSvg) return '';
  const colorized = baseSvg
    .replace(/fill="[^"]*"/g, `fill="${fill}"`)
    .replace(/stroke="[^"]*"/g, `stroke="${stroke}"`)
    .replace(/stroke-width="[^"]*"/g, `stroke-width="${strokeWidth}"`);
  if (!/stroke=/.test(colorized)) {
    return colorized.replace(/<([a-zA-Z]+)([^>]*)>/, `<$1$2 stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}">`);
  }
  return colorized;
};

/**
 * Convert SVG string to data URL
 */
export const svgToDataUrl = (svg) => `data:image/svg+xml;base64,${btoa(svg)}`;

/**
 * Check if URL is a shape URL
 */
export const isShapeUrl = (url) => /\/stickers\/shapes\//.test(url);

/**
 * Replace markdown bold syntax **text** with quotes "text"
 */
export const replaceMarkdownBold = (text) => {
  if (typeof text !== 'string') return text;
  return text.replace(/\*\*(.*?)\*\*/g, '"$1"');
};

/**
 * Normalize bullets/text into an array of lines for consistent preview
 */
export const getBulletLines = (slide) => {
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

  const bullets = rawBullets
    .map(b => String(b))
    .map(b => b.replace(/([a-z])\.([A-Z])/g, '$1.\n$2'))
    .flatMap(b => b.split(/\n|•/))
    .map(l => (l || '').trim())
    .filter(Boolean);

  return bullets.map(b => replaceMarkdownBold(b));
};

/**
 * Handle image error with retry logic
 */
export function handleImageError(e, slideId, imagePrompt, setPreviewImageUrls, getPollinationsImageUrlFn) {
  const maxRetries = 3;
  const currentRetries = parseInt(e.currentTarget?.dataset?.retries || '0', 10);

  if (currentRetries < maxRetries && imagePrompt) {
    setPreviewImageUrls(urls => ({
      ...urls,
      [slideId]: getPollinationsImageUrlFn(imagePrompt) + `?retry=${Date.now()}`
    }));
    if (e.currentTarget) e.currentTarget.dataset.retries = String(currentRetries + 1);
  } else if (e.currentTarget) {
    e.currentTarget.src = FALLBACK_IMAGE;
    e.currentTarget.onerror = null;
  }
}

/**
 * Convert inches to normalized (0-1) for CSS positioning
 */
export const toNormalized = (inches, slideSize) => inches / slideSize;

/**
 * Calculate title box position based on image position
 */
export const calculateTitleBox = (slide) => {
  const { WIDTH: SLIDE_WIDTH, HEIGHT: SLIDE_HEIGHT } = SLIDE_DIMENSIONS;
  const hasImage = Boolean(slide.uploadedImage || (slide.imagePrompt && (slide.imageData || slide.imagePosition)));
  const imagePosition = slide.imagePosition || 'right';

  let finalTitleX, finalTitleY, finalTitleW, finalTitleH;

  if (slide.titleBox) {
    return slide.titleBox;
  }

  if (hasImage) {
    let bodyX_inches = 0.5;
    let bodyW_inches = 9.0;

    if (imagePosition === 'center') {
      bodyX_inches = 0.5;
      bodyW_inches = 9.0;
    } else if (imagePosition === 'left') {
      bodyX_inches = (0.05 + 0.35 + 0.04) * 10.0;
      bodyW_inches = 10.0 - bodyX_inches - 0.5;
    } else {
      bodyX_inches = 0.5;
      bodyW_inches = (0.6 - 0.05) * 10.0;
    }

    finalTitleX = toNormalized(bodyX_inches, SLIDE_WIDTH);
    finalTitleW = toNormalized(bodyW_inches, SLIDE_WIDTH);

    if (imagePosition === 'center') {
      finalTitleY = toNormalized(0.35, SLIDE_HEIGHT);
      finalTitleH = toNormalized(0.56, SLIDE_HEIGHT);
    } else {
      finalTitleY = toNormalized(0.5, SLIDE_HEIGHT);
      finalTitleH = toNormalized(0.8, SLIDE_HEIGHT);
    }
  } else {
    finalTitleX = toNormalized(0.5, SLIDE_WIDTH);
    finalTitleW = toNormalized(9.0, SLIDE_WIDTH);
    finalTitleY = toNormalized(0.35, SLIDE_HEIGHT);
    finalTitleH = toNormalized(1.0, SLIDE_HEIGHT);
  }

  return { x: finalTitleX, y: finalTitleY, width: finalTitleW, height: finalTitleH, zIndex: 100 };
};

/**
 * Calculate body box position based on image position
 */
export const calculateBodyBox = (slide) => {
  const { WIDTH: SLIDE_WIDTH, HEIGHT: SLIDE_HEIGHT } = SLIDE_DIMENSIONS;
  
  if (slide.bodyBox) {
    return slide.bodyBox;
  }

  const hasImage = Boolean(slide.uploadedImage || (slide.imagePrompt && (slide.imageData || slide.imagePosition)));
  const imagePosition = slide.imagePosition || 'right';

  let bodyX_inches = 0.5;
  let bodyW_inches = 9.0;
  let bodyY_inches, bodyH_inches;

  if (hasImage) {
    bodyY_inches = 1.5;
    bodyH_inches = 3.5;

    if (imagePosition === 'left') {
      bodyX_inches = 4.4;
      bodyW_inches = 5.1;
    } else if (imagePosition === 'right') {
      bodyX_inches = 0.5;
      bodyW_inches = 5.5;
    } else {
      bodyX_inches = 0.5;
      bodyW_inches = 9.0;
    }
  } else {
    bodyX_inches = 0.5;
    bodyW_inches = 9.0;
    bodyY_inches = 1.6;
    bodyH_inches = 3.6;
  }

  return {
    x: toNormalized(bodyX_inches, SLIDE_WIDTH),
    y: toNormalized(bodyY_inches, SLIDE_HEIGHT),
    width: toNormalized(bodyW_inches, SLIDE_WIDTH),
    height: toNormalized(bodyH_inches, SLIDE_HEIGHT),
    zIndex: 100
  };
};

/**
 * Get current user from storage
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

/**
 * URL to Base64 converter for download
 */
export const urlToBase64 = async (url) => {
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
    return url;
  }
};

/**
 * Convert SVG data URL to PNG data URL (for PPTX compatibility)
 */
export const svgDataUrlToPng = async (svgDataUrl, width = 200, height = 200) => {
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
        resolve(svgDataUrl);
      };
      img.src = svgDataUrl;
    } catch (err) {
      console.warn('Error converting SVG to PNG:', err);
      resolve(svgDataUrl);
    }
  });
};

/**
 * Initialize slides from navigation state
 */
export const initializeSlides = (navigationSlides) => {
  return (navigationSlides || []).map((slide, index) => {
    let imagePosition = slide.imagePosition;
    if (!imagePosition) {
      const pattern = index % 3;
      if (pattern === 0) imagePosition = 'right';
      else if (pattern === 1) imagePosition = 'left';
      else imagePosition = 'center';
    }

    let imageData = slide.imageData;
    if (!imageData && imagePosition) {
      if (imagePosition === 'right') {
        imageData = { x: 0.6, y: 0.2, width: 0.35, height: 0.65 };
      } else if (imagePosition === 'left') {
        imageData = { x: 0.05, y: 0.2, width: 0.35, height: 0.65 };
      } else if (imagePosition === 'center') {
        imageData = { x: 0.35, y: 0.23, width: 0.3, height: 0.36 };
      }
    }

    let bodyBox = slide.bodyBox;
    if (!bodyBox && imagePosition === 'center') {
      bodyBox = { x: 0.05, y: 0.63, width: 0.9, height: 0.32, zIndex: 100 };
    }

    const bodySource = Array.isArray(slide.bullets)
      ? slide.bullets.filter(Boolean).join(' ')
      : (typeof slide.text === 'string' ? slide.text : '');

    return {
      ...slide,
      id: slide.id ?? `slide-${index}-${Date.now()}`,
      layout: 'content',
      imagePosition,
      imageData,
      bodyBox,
      uploadedImage: slide.uploadedImage || null,
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
};
