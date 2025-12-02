// backend/services/pptxService.js
import PptxGenJS from "pptxgenjs";
import axios from "axios";
import { PNG } from "pngjs";
import { grokClient, GROK_IMAGE_MODEL } from "../config/grokConfig.js"; // Import Grok client

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

const createCardBackgroundImage = (colors, width = 1280, height = 720) => {
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
 * Helper utilities shared across layout logic
 */
const clamp = (value, min, max) => {
  if (!Number.isFinite(value)) return min;
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
};

const ensureTableCells = (rows, cols, existing = []) => {
  return Array.from({ length: rows }, (_, rIdx) => {
    const srcRow = Array.isArray(existing[rIdx]) ? existing[rIdx] : [];
    return Array.from({ length: cols }, (_, cIdx) => (srcRow[cIdx] !== undefined ? srcRow[cIdx] : ''));
  });
};

const pxToPt = (px) => Number((px * 72 / 96).toFixed(2));

const mapBorderStyle = (style) => {
  if (!style) return 'solid';
  const normalized = String(style).toLowerCase();
  if (normalized.includes('dash') || normalized.includes('dot')) return 'dash';
  return 'solid';
};

const colorToHexString = (color, fallback = '#FFFFFF') => colorToPptx(color, fallback);

const getBulletLines = (slide) => {
  if (!slide) return [];
  if (Array.isArray(slide.bullets)) {
    return slide.bullets
      .map(b => (typeof b === 'string' ? b.trim() : ''))
      .filter(Boolean);
  }
  const source = typeof slide.text === 'string' ? slide.text : '';
  return source
    .split(/\n|•/)
    .map(line => (line || '').trim())
    .filter(Boolean);
};

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
 * Helper to generate image using Grok API
 */
async function generateGrokImage(prompt) {
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') return null;
  
  try {
    console.log(`[Grok Image] Generating image for prompt: "${prompt}"`);
    
    // Note: This assumes Grok/xAI follows OpenAI's image generation API structure
    // Adjust parameters as needed based on official xAI documentation
    const response = await grokClient.images.generate({
      model: GROK_IMAGE_MODEL,
      prompt: prompt,
      n: 1,
      response_format: "b64_json" // Request base64 directly
    });
        // x.ai images API does not support 'size'; omit to avoid 400 errors

    if (response.data && response.data.length > 0) {
      const image = response.data[0];
      if (image.b64_json) {
        return `data:image/png;base64,${image.b64_json}`;
      } else if (image.url) {
        // If URL is returned, fetch it
        return await fetchImageAsBase64(image.url);
      }
    }
    
    throw new Error("No image data returned from Grok API");
  } catch (error) {
    console.error("[Grok Image] Generation failed:", error.message);
    if (error.response) {
      console.error("[Grok Image] API Error Data:", error.response.data);
    }
    throw error; // Re-throw to trigger fallback
  }
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
  const { slides, includeImages, imageProvider } = requestBody;
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

  // Track which provider ultimately supplied images (grok/pollinations/none)
  let imageProviderFinal = null;

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
    const bgColorNorm = normalizeColor(slideBg, design.globalBackground);
    const gradientBackground = createCardBackgroundImage(slideBg, 1280, 720);
    if (gradientBackground) {
      pptxSlide.addImage({
        data: gradientBackground,
        x: 0,
        y: 0,
        w: 10,
        h: 5.625
      });
    } else {
      pptxSlide.background = { color: colorToPptx(bgColorNorm, design.globalBackground) };
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
        imageBase64 = slide.uploadedImage;
      } else if (slide.imagePrompt) {
        if (imageProvider === 'grok') {
          // Try Grok Image Generation first
          try {
             // Only attempt if we have a key (simple check, though client throws if missing)
             if (process.env.GROK_IMAGE_API_KEY || process.env.XAI_API_KEY) {
                imageBase64 = await generateGrokImage(slide.imagePrompt);
                imageProviderFinal = imageProviderFinal || 'grok';
             } else {
                throw new Error("No Grok/xAI API key available");
             }
          } catch (grokError) {
             console.log(`[Grok Image] Failed (or not configured), falling back to Pollinations. Reason: ${grokError.message}`);
             // Fallback to Pollinations
             const imageUrl = getPollinationsImageUrl(slide.imagePrompt);
             if (imageUrl) {
               console.log(`Fetching AI image (fallback): ${slide.imagePrompt}`);
               imageBase64 = await fetchImageAsBase64(imageUrl);
                imageProviderFinal = imageProviderFinal || 'pollinations';
             }
          }
        } else {
          // Default to Pollinations
          const imageUrl = getPollinationsImageUrl(slide.imagePrompt);
          if (imageUrl) {
            console.log(`Fetching AI image: ${slide.imagePrompt}`);
            imageBase64 = await fetchImageAsBase64(imageUrl);
            imageProviderFinal = imageProviderFinal || 'pollinations';
          }
        }
      }
    }

    // 3. DEFINE LAYOUTS
    let titleOpts, bodyOpts;
    const contentArea = {
      x: contentBounds.x + cardPaddingX,
      y: contentBounds.y + cardPaddingY,
      w: contentBounds.w - cardPaddingX * 2,
      h: contentBounds.h - cardPaddingY * 2
    };

    // Image positioning - match old frontend
    const imgW = 3.0;
    const imgH = 3.5;
    const imgMargin = 0.5;
    const imagePosition = slide.imagePosition || "right";
    const imgX = imagePosition === "left" ? imgMargin : 10 - imgMargin - imgW;
    const imgY = 1.0;

    // Calculate body positioning based on image
    let bodyX = 0.5;
    let bodyW = 9.0;
    if (imageBase64) {
      if (imagePosition === "left") {
        bodyX = imgX + imgW + 0.3;
        bodyW = 10 - bodyX - imgMargin;
      } else {
        bodyX = 0.5;
        bodyW = 10 - imgW - imgMargin - 0.8;
      }
    }

    if (imageBase64) {
      pptxSlide.addImage({
        data: imageBase64,
        x: imgX,
        y: imgY,
        w: imgW,
        h: imgH,
        sizing: { type: "contain", w: imgW, h: imgH },
      });
    }

    // 4. ADD TEXT TO SLIDE - Match old frontend positioning
    // Old frontend used: title at y: 0.35, body at y: 1.6
    const titleX = imageBase64 ? bodyX : 0.5;
    const titleW = imageBase64 ? bodyW : 9.0;
    const bodyXPos = imageBase64 ? bodyX : 0.5;
    const bodyWPos = imageBase64 ? bodyW : 9.0;

    // Add title
    pptxSlide.addText(slide.title || '', {
      x: titleX,
      y: 0.35,
      w: titleW,
      h: 1.0,
      color: titleColorPptx,
      fontFace: titleFontFace,
      fontSize: titleFontSize,
      bold: titleBold,
      italic: titleItalic,
      align: titleAlign || (slideLayout === 'title' ? 'center' : 'left'),
    });

    // Get bullet lines using the same logic as the old frontend
    const getBulletLinesForSlide = (sdata) => {
      if (!sdata) return [];
      if (Array.isArray(sdata.bullets)) {
        return sdata.bullets
          .filter(Boolean)
          .map((b) => String(b).trim())
          .filter(Boolean);
      }
      const src = typeof sdata.bullets === 'string' && sdata.bullets.trim().length
        ? sdata.bullets
        : (typeof sdata.text === 'string' ? sdata.text : '');
      return src
        .split(/\n|•/)
        .map((l) => (l || '').trim())
        .filter(Boolean);
    };

    const bulletLines = getBulletLinesForSlide(slide);
    const hasBullets = bulletLines.length > 0;
    const hasText = slide.text && slide.text.trim().length > 0;

    // Match old frontend behavior: join bullets with \n and add • prefix
    if (slideLayout === 'title') {
      // Title layout: show text or bullets
      let bodyText = typeof slide.text === 'string' ? slide.text.trim() : '';
      if (!bodyText && bulletLines.length) {
        bodyText = bulletLines.map((b) => `• ${b}`).join('\n');
      }
      if (bodyText) {
        pptxSlide.addText(bodyText, {
          x: titleX,
          y: 1.6,
          w: titleW,
          h: 3.6,
          color: textColorPptx,
          fontFace: bodyFontFace,
          fontSize: bodyFontSize,
          bold: bodyBold,
          italic: bodyItalic,
          align: bodyAlign || 'left',
          lineSpacing: 20,
        });
      } else if (bulletLines.length) {
        // Fallback: show bullets if no text
        pptxSlide.addText(bulletLines.map((b) => `• ${b}`).join('\n'), {
          x: titleX,
          y: 1.6,
          w: titleW,
          h: 3.6,
          color: textColorPptx,
          fontFace: bodyFontFace,
          fontSize: bodyFontSize,
          bold: bodyBold,
          italic: bodyItalic,
          align: bodyAlign || 'left',
          lineSpacing: 20,
        });
      }
    } else {
      // Content layout: show bullets or text
      if (hasBullets) {
        const bulletText = bulletLines.map((b) => `• ${b}`).join('\n');
        pptxSlide.addText(bulletText, {
          x: bodyXPos,
          y: 1.6,
          w: bodyWPos,
          h: 3.6,
          color: textColorPptx,
          fontFace: bodyFontFace,
          fontSize: bodyFontSize,
          bold: bodyBold,
          italic: bodyItalic,
          align: bodyAlign || 'left',
          lineSpacing: 20,
        });
      } else if (hasText) {
        // Only add text if there are NO bullets (matches old frontend logic)
        pptxSlide.addText(slide.text.trim(), {
          x: bodyXPos,
          y: 1.6,
          w: bodyWPos,
          h: 3.6,
          color: textColorPptx,
          fontFace: bodyFontFace,
          fontSize: bodyFontSize,
          bold: bodyBold,
          italic: bodyItalic,
          align: bodyAlign || 'left',
          lineSpacing: 20,
        });
      }
    }

    // --- FIX FOR TABLES & STICKERS ---
    
    // Handle Stickers (Images/Shapes) - match old frontend behavior
    if (Array.isArray(slide.stickers)) {
      for (const sticker of slide.stickers) {
        if (!sticker || !sticker.url) continue;

        let dataUrl = null;
        
        // If it's already a data URL, use it directly
        if (sticker.url.startsWith('data:')) {
          dataUrl = sticker.url;
        } else {
          // Fetch external URL (like pollinations.ai images)
          try {
            dataUrl = await fetchImageAsBase64(sticker.url);
          } catch (err) {
            console.warn(`Failed to fetch sticker image: ${sticker.url}`, err.message);
            continue;
          }
        }

        if (!dataUrl) continue;

        // Note: SVG rasterization would require additional libraries (sharp, canvas, etc.)
        // For now, we'll skip SVG rasterization and let PptxGenJS handle it if it can
        // If SVG support is needed, consider adding sharp or canvas library

        // Convert percentage (0-1) to Inches (10 x 5.625) - match old frontend
        const x = (sticker.x || 0) * 10.0;
        const y = (sticker.y || 0) * 5.625;
        const w = (sticker.width || 0.18) * 10.0;
        const h = (sticker.height || 0.18) * 5.625;
        const rotate = sticker.rotate || 0;

        try {
          pptxSlide.addImage({
            data: dataUrl,
            x: x,
            y: y,
            w: w,
            h: h,
            rotate: rotate
          });
        } catch (err) {
          console.warn(`Failed to add sticker to slide: ${sticker.url}`, err.message);
        }
      }
    }

    // Handle Tables - match old frontend behavior
    if (Array.isArray(slide.tables)) {
      for (const tbl of slide.tables) {
        try {
          const rowsCount = Math.max(1, tbl?.rows || (Array.isArray(tbl?.cells) ? tbl.cells.length : 1));
          const colsCount = Math.max(1, tbl?.cols || (Array.isArray(tbl?.cells?.[0]) ? tbl.cells[0].length : 1));
          
          // Ensure table cells exist
          const ensureTableCells = (rows, cols, existing = []) => {
            return Array.from({ length: rows }, (_, rIdx) => {
              const srcRow = Array.isArray(existing[rIdx]) ? existing[rIdx] : [];
              return Array.from({ length: cols }, (_, cIdx) => (srcRow[cIdx] !== undefined ? srcRow[cIdx] : ''));
            });
          };
          
          const cellMatrix = ensureTableCells(rowsCount, colsCount, tbl?.cells);
          
          const fillColor = colorToPptx(tbl?.background || '#FFFFFF', '#FFFFFF');
          const borderColor = colorToPptx(tbl?.borderColor || '#111827', '#111827');
          const tableTextColor = colorToPptx(textColorNorm, '#333333');
          
          // Convert border width from px to pt (old frontend used pxToPt)
          const pxToPt = (px) => Number((px * 72 / 96).toFixed(2));
          const borderPt = pxToPt(typeof tbl?.borderWidth === 'number' ? tbl.borderWidth : 1.33);
          
          // Map border style
          const mapBorderStyle = (style) => {
            if (style === 'dashed' || style === 'dash') return 'dash';
            if (style === 'dotted' || style === 'dot') return 'dash';
            return 'solid';
          };
          const borderType = mapBorderStyle(tbl?.borderStyle);
          
          // Create border definition for all sides
          const borderDef = ['t', 'r', 'b', 'l'].map(() => ({ 
            color: borderColor, 
            pt: borderPt, 
            type: borderType 
          }));
          
          // Map table data
          const tableRows = cellMatrix.map((row) =>
            row.map((value) => ({
              text: value || '',
              options: {
                fill: { color: fillColor },
                border: borderDef,
                color: tableTextColor,
                fontFace: bodyFontFace,
                fontSize: bodyFontSize,
                valign: 'top',
                align: 'left',
                margin: [4, 5, 4, 5],
                wrap: true,
              },
            }))
          );
          
          // Calculate table dimensions (match old frontend)
          const widthFrac = typeof tbl?.width === 'number' && tbl.width > 0 ? tbl.width : 0.5;
          const heightFrac = typeof tbl?.height === 'number' && tbl.height > 0 ? tbl.height : 0.3;
          const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
          const SLIDE_WIDTH_IN = 10.0;
          const SLIDE_HEIGHT_IN = 5.625;
          
          const tableWidth = clamp(widthFrac * SLIDE_WIDTH_IN, 1, SLIDE_WIDTH_IN);
          const tableHeight = clamp(heightFrac * SLIDE_HEIGHT_IN, 0.5, SLIDE_HEIGHT_IN);
          const tableX = clamp((tbl?.x || 0) * SLIDE_WIDTH_IN, 0, SLIDE_WIDTH_IN - tableWidth);
          const tableY = clamp((tbl?.y || 0) * SLIDE_HEIGHT_IN, 0, SLIDE_HEIGHT_IN - tableHeight);
          
          const colW = Array.from({ length: colsCount }, () => tableWidth / colsCount);
          const rowH = Array.from({ length: rowsCount }, () => tableHeight / rowsCount);
          
          pptxSlide.addTable(tableRows, {
            x: tableX,
            y: tableY,
            w: tableWidth,
            h: tableHeight,
            colW,
            rowH,
            valign: 'top',
          });
        } catch (tableErr) {
          console.warn('Failed to add table to PPTX export', tableErr);
        }
      }
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
  return { buffer: pptxBuffer, imageProviderFinal: imageProviderFinal || (includeImages ? 'none' : null) };
};