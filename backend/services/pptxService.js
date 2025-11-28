// backend/services/pptxService.js
import PptxGenJS from "pptxgenjs";
import axios from "axios";
import { PNG } from "pngjs";


/**
 * Normalize arbitrary color inputs (arrays, gradients, rgb/hex strings) to #RRGGBB
 */
function normalizeColor(input, fallback = '#ffffff') {
  if (Array.isArray(input)) {
    const firstValid = input.find(Boolean);
    return normalizeColor(firstValid, fallback);
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();

    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
      if (trimmed.length === 4) {
        return (
          "#" +
          trimmed[1] + trimmed[1] +
          trimmed[2] + trimmed[2] +
          trimmed[3] + trimmed[3]
        ).toUpperCase();
      }
      return trimmed.toUpperCase();
    }

    if (trimmed.startsWith('rgb')) {
      const rgb = trimmed.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        const [r, g, b] = rgb.map(v => {
          const num = parseInt(v, 10);
          return Number.isFinite(num) ? Math.max(0, Math.min(255, num)) : 0;
        });
        return (
          "#" +
          r.toString(16).padStart(2, "0") +
          g.toString(16).padStart(2, "0") +
          b.toString(16).padStart(2, "0")
        ).toUpperCase();
      }
    }

    const hexMatch = trimmed.match(/#([0-9a-fA-F]{3,6})/);
    if (hexMatch) {
      const hex = hexMatch[1];
      if (hex.length === 3) {
        return (
          "#" +
          hex[0] + hex[0] +
          hex[1] + hex[1] +
          hex[2] + hex[2]
        ).toUpperCase();
      }
      return ("#" + hex).toUpperCase();
    }
  }

  return fallback.toUpperCase();
}

function colorToPptx(color, fallback = '#FFFFFF') {
  const normalized = normalizeColor(color, fallback);
  return normalized.replace('#', '').substring(0, 6).padEnd(6, '0').toUpperCase();
}

const hexToRgb = (hexColor) => {
  const normalized = normalizeColor(hexColor);
  const hex = normalized.replace('#', '');
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16)
  };
};

const lerp = (a, b, t) => Math.round(a + (b - a) * t);

const gradientCache = new Map();

const ensureColorArray = (value, fallback = ['#ffffff']) => {
  if (Array.isArray(value)) {
    const filtered = value.filter(Boolean);
    return filtered.length ? filtered : fallback;
  }
  if (typeof value === 'string') {
    if (value.startsWith('linear-gradient')) {
      const matches = value.match(/#[0-9a-fA-F]{3,6}/g);
      if (matches && matches.length) return matches;
    }
    return [value];
  }
  return fallback;
};

const getGradientColor = (stops, t) => {
  if (stops.length === 1) return stops[0];
  const scaled = t * (stops.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(index + 1, stops.length - 1);
  const localT = scaled - index;
  const start = stops[index];
  const end = stops[nextIndex];
  return {
    r: lerp(start.r, end.r, localT),
    g: lerp(start.g, end.g, localT),
    b: lerp(start.b, end.b, localT)
  };
};

const createCardBackgroundImage = (colors, width = 1000, height = 620) => {
  const colorStops = ensureColorArray(colors).map(hexToRgb);
  if (!colorStops.length) return null;
  const key = `${width}x${height}:${colorStops.map(c => `${c.r}-${c.g}-${c.b}`).join('|')}`;
  if (gradientCache.has(key)) return gradientCache.get(key);

  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const t = (x + y) / (width + height);
      const color = getGradientColor(colorStops, t);
      png.data[idx] = color.r;
      png.data[idx + 1] = color.g;
      png.data[idx + 2] = color.b;
      png.data[idx + 3] = 255;
    }
  }

  const buffer = PNG.sync.write(png);
  const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  gradientCache.set(key, dataUrl);
  return dataUrl;
};

/**
 * Calculate contrast color (black or white) based on background color
 */
const parseFontSize = (value, fallback) => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Helper to get the AI image URL (copied from your frontend)
 */
function getPollinationsImageUrl(prompt) {
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') return null;
  const encodedPrompt = encodeURIComponent(prompt.trim());
  return `https://image.pollinations.ai/prompt/${encodedPrompt}`;
}

/**
 * Fetches an image from a URL and returns it as a base64 string.
 * This runs on the server, so it will not have browser-related (CORS) errors.
 */
const fetchImageAsBase64 = async (url) => {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer'
    });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    // We must provide a data URI scheme for pptxgenjs
    return `data:${response.headers['content-type']};base64,${base64}`;
  } catch (err) {
    console.error(`Error fetching image for PPTX: ${url}`, err.message);
    return null; // Return null if fetching fails
  }
};

/**
 * Main service function to generate the PPTX from frontend data.
 */
export const generatePptxFromData = async (requestBody) => {
  const { slides, includeImages } = requestBody;
  const incomingDesign = typeof requestBody.design === 'object' && requestBody.design !== null
    ? requestBody.design
    : {};
  const design = {
    font: incomingDesign.font || 'Arial',
    globalBackground: incomingDesign.globalBackground || '#ffffff',
    globalTitleColor: incomingDesign.globalTitleColor || '#000000',
    globalTextColor: incomingDesign.globalTextColor || '#333333',
    layouts: incomingDesign.layouts || {},
    canvasBackground: incomingDesign.canvasBackground || '#f4f5fb'
  };

  if (!slides || slides.length === 0) {
    throw new Error("No slides data provided");
  }

  let pptx = new PptxGenJS();
  // Set layout using the correct method
  pptx.defineLayout({ name: 'LAYOUT_16x9', width: 10, height: 5.625 });
  pptx.layout = 'LAYOUT_16x9';

  // Use a 'for...of' loop to handle async image fetching
  for (const slide of slides) {
    let pptxSlide = pptx.addSlide();

    // 1. DETERMINE STYLES from the 'design' object
    const slideLayout = slide.layout || 'content';
    const layoutStyles = design.layouts?.[slideLayout] || {};

    const slideBg = slide.background || layoutStyles.background || design.globalBackground;
    const titleColorNorm = normalizeColor(
      slide.titleColor || layoutStyles.titleColor || design.globalTitleColor,
      '#000000'
    );
    const textColorNorm = normalizeColor(
      slide.textColor || layoutStyles.textColor || design.globalTextColor,
      '#333333'
    );

    const defaultFont = design.font || 'Arial';
    const titleFontFace = slide.styles?.titleFont || slide.styles?.textFont || defaultFont;
    const bodyFontFace = slide.styles?.textFont || slide.styles?.titleFont || defaultFont;
    const titleFontSize = parseFontSize(
      slide.styles?.titleSize,
      slideLayout === 'title' ? 44 : 32
    );
    const bodyFontSize = parseFontSize(
      slide.styles?.textSize,
      slideLayout === 'title' ? 24 : 18
    );
    const titleBold = !!slide.styles?.titleBold;
    const titleItalic = !!slide.styles?.titleItalic;
    const bodyBold = !!slide.styles?.textBold;
    const bodyItalic = !!slide.styles?.textItalic;
    const titleAlign = slide.styles?.titleAlign || (slideLayout === 'title' ? 'center' : 'left');
    const bodyAlign = slide.styles?.textAlign || (slideLayout === 'title' ? 'center' : 'left');

    const titleColorPptx = colorToPptx(titleColorNorm, '#000000');
    const textColorPptx = colorToPptx(textColorNorm, '#333333');

    // Full-slide background using template colors
    const gradientBackground = createCardBackgroundImage(slideBg, 1280, 720);
    if (gradientBackground) {
      pptxSlide.background = { data: gradientBackground };
    } else {
      pptxSlide.background = { color: colorToPptx(slideBg, design.globalBackground) };
    }

    const cardPaddingX = 0.6;
    const cardPaddingY = 0.5;
    const contentBounds = {
      x: 0.5,
      y: 0.6,
      w: 9.2,
      h: 4.7
    };

    // 2. CHECK FOR IMAGE
    let imageBase64 = null;
    if (includeImages) {
      if (slide.uploadedImage) {
        // Use the already-base64-encoded user-uploaded image
        imageBase64 = slide.uploadedImage;
      } else if (slide.imagePrompt) {
        // Fetch the AI image and convert it to base64
        const imageUrl = getPollinationsImageUrl(slide.imagePrompt);
        if (imageUrl) {
          console.log(`Fetching AI image: ${slide.imagePrompt}`);
          imageBase64 = await fetchImageAsBase64(imageUrl);
        }
      }
    }

    // 3. DEFINE LAYOUTS (coordinates for text and images)
    // All coordinates are in inches: { x, y, w, h }
    let titleOpts, bodyOpts;
    
    const contentArea = {
      x: contentBounds.x + cardPaddingX,
      y: contentBounds.y + cardPaddingY,
      w: contentBounds.w - cardPaddingX * 2,
      h: contentBounds.h - cardPaddingY * 2
    };

    const imageWidth = 3.5;
    const imageHeight = 3.5;
    const imageSpacing = 0.4;
    let effectiveTextWidth = contentArea.w;

    if (imageBase64) {
      effectiveTextWidth = Math.max(contentArea.w - imageWidth - imageSpacing, 2.5);
      const imageX = contentArea.x + effectiveTextWidth + imageSpacing * 0.5;
      const imageY = contentArea.y + 0.15;
      pptxSlide.addImage({
        data: imageBase64,
        x: imageX,
        y: imageY,
        w: imageWidth,
        h: imageHeight
      });
    }

    titleOpts = {
      x: contentArea.x,
      y: contentArea.y,
      w: effectiveTextWidth,
      h: 0.9,
      color: titleColorPptx,
      fontFace: titleFontFace,
      fontSize: titleFontSize,
      bold: titleBold,
      italic: titleItalic,
      align: titleAlign,
      valign: 'middle'
    };

    bodyOpts = {
      x: contentArea.x,
      y: contentArea.y + 0.95,
      w: effectiveTextWidth,
      h: contentArea.h - 1.0,
      color: textColorPptx,
      fontFace: bodyFontFace,
      fontSize: bodyFontSize,
      bold: bodyBold,
      italic: bodyItalic,
      align: bodyAlign
    };

    // 4. ADD TEXT TO SLIDE
    pptxSlide.addText(slide.title || '', titleOpts);

    // Always add body text, even for title slides, and always use high-contrast color
    let hasBullets = slide.bullets && slide.bullets.length > 0;
    let hasText = slide.text && slide.text.trim().length > 0;
    const bodyParagraphs = [];
    if (hasBullets) {
      const bulletPoints = slide.bullets
        .map(b => (typeof b === 'string' ? b.trim() : ''))
        .filter(b => b.length > 0);
      bulletPoints.forEach(text => {
        bodyParagraphs.push({
          text,
          options: {
            bullet: true,
            fontFace: bodyFontFace,
            fontSize: bodyFontSize,
            color: textColorPptx,
            bold: bodyBold,
            italic: bodyItalic,
            align: 'left',
            paraSpaceAfter: 6
          }
        });
      });
    }
    if (hasText) {
      bodyParagraphs.push({
        text: slide.text.trim(),
        options: {
          bullet: false,
          fontFace: bodyFontFace,
          fontSize: bodyFontSize,
          color: textColorPptx,
          bold: bodyBold,
          italic: bodyItalic,
          align: bodyAlign,
          paraSpaceBefore: hasBullets ? 8 : 0
        }
      });
    }

    if (bodyParagraphs.length > 0) {
      pptxSlide.addText(bodyParagraphs, bodyOpts);
    }
  }

  // 5. RETURN THE FILE BUFFER
  // This generates the file in memory
  console.log("PPTX generation complete. Generating buffer...");
  const pptxData = await pptx.write({ outputType: 'nodebuffer' });
  
  let pptxBuffer;
  if (Buffer.isBuffer(pptxData)) {
    pptxBuffer = pptxData;
  } else if (pptxData instanceof Uint8Array) {
    pptxBuffer = Buffer.from(pptxData);
  } else if (pptxData instanceof Blob) {
    const arrayBuffer = await pptxData.arrayBuffer();
    pptxBuffer = Buffer.from(arrayBuffer);
  } else if (typeof pptxData === 'string') {
    pptxBuffer = Buffer.from(pptxData, 'base64');
  } else {
    console.error('Unknown PPTX data format:', typeof pptxData, pptxData);
    throw new Error('Unknown PPTX data format returned from pptxgenjs');
  }
  
  console.log(`PPTX buffer ready, size: ${pptxBuffer.length} bytes`);
  return pptxBuffer;
};