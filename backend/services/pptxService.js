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

const createCardBackgroundImage = (colors, width = 1920, height = 1080) => {
  const colorStops = ensureColorArray(colors).map(hexToRgb);
  if (!colorStops.length) return null;
  const key = `${width}x${height}:${colorStops.map(c => `${c.r}-${c.g}-${c.b}`).join('|')}`;
  if (gradientCache.has(key)) return gradientCache.get(key);

  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      // Vertical gradient from top to bottom (matches preview better)
      const t = y / height;
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
    .replace(/([a-z])\.([A-Z])/g, '$1.\n$2') // Fix missing spaces between sentences
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
 * Helper to calculate text box height based on text content
 * 
 * @param {string} text - The text content
 * @param {number} fontSize - Font size in points
 * @param {number} boxWidth - Text box width in inches
 * @param {number} lineHeight - Line height multiplier (default 1.2)
 * @param {string} fontFace - Font family name (default 'Arial')
 * @returns {number} - Calculated height in inches
 */
const calculateTextBoxHeight = (text, fontSize, boxWidth, lineHeight = 1.2, fontFace = 'Arial') => {
  if (!text || text.trim() === '') return 0.5;
  
  // Average character width ratio based on font size (empirically adjusted)
  // Most fonts have an average character width of about 0.5-0.6 times the font size
  const avgCharWidthRatio = 0.55;
  
  // Convert box width from inches to points (1 inch = 72 points)
  const boxWidthPts = boxWidth * 72;
  
  // Estimate average character width in points
  const avgCharWidth = fontSize * avgCharWidthRatio;
  
  // Calculate characters per line
  const charsPerLine = Math.floor(boxWidthPts / avgCharWidth);
  
  // Ensure minimum characters per line
  const effectiveCharsPerLine = Math.max(charsPerLine, 10);
  
  // Split text into lines and count wrapped lines
  const lines = text.split('\n');
  let totalLines = 0;
  
  for (const line of lines) {
    if (line.length === 0) {
      // Empty line still takes vertical space
      totalLines += 1;
    } else {
      // Account for word wrapping - split by spaces to simulate word wrap
      const words = line.split(/\s+/);
      let currentLineLength = 0;
      let linesInParagraph = 0;
      
      for (const word of words) {
        const wordLength = word.length;
        
        if (currentLineLength + wordLength + 1 <= effectiveCharsPerLine) {
          // Word fits on current line
          currentLineLength += wordLength + 1; // +1 for space
        } else {
          // Word needs new line
          if (currentLineLength > 0) {
            linesInParagraph += 1;
          }
          currentLineLength = wordLength + 1;
        }
      }
      
      // Add final line of paragraph
      if (currentLineLength > 0) {
        linesInParagraph += 1;
      }
      
      totalLines += Math.max(linesInParagraph, 1);
    }
  }
  
  // Calculate height in points: totalLines * fontSize * lineHeight
  const heightPts = totalLines * fontSize * lineHeight;
  
  // Convert points to inches (1 inch = 72 points)
  const heightInches = heightPts / 72;
  
  // Add small padding (0.2 inches) and ensure minimum height
  const finalHeight = Math.max(0.5, heightInches + 0.2);
  
  console.log(`[calculateTextBoxHeight] Text: "${text.substring(0, 50)}..." | fontSize: ${fontSize}pt | boxWidth: ${boxWidth}" | lines: ${totalLines} | height: ${finalHeight}"`);
  
  return finalHeight;
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

  console.log(`[PPTX Generation] Starting with ${slides.length} slides, imageProvider: ${imageProvider || 'none'}`);

  // OPTIMIZATION: Pre-generate all images in parallel before creating slides
  let imageProviderFinal = null;
  const imageCache = new Map(); // Cache generated images by slide index
  
  if (includeImages) {
    console.log(`[PPTX Generation] Pre-generating images in parallel...`);
    const imagePromises = slides.map(async (slide, index) => {
      if (slide.uploadedImage) {
        imageCache.set(index, slide.uploadedImage);
        return { index, provider: null };
      }
      
      if (slide.imagePrompt) {
        try {
          let imageBase64 = null;
          let usedProvider = null;
          
          if (imageProvider === 'grok') {
            if (process.env.GROK_IMAGE_API_KEY || process.env.XAI_API_KEY) {
              imageBase64 = await generateGrokImage(slide.imagePrompt);
              usedProvider = 'grok';
              console.log(`[PPTX Generation] Grok image generated for slide ${index + 1}`);
            } else {
              throw new Error("No Grok/xAI API key available");
            }
          } else {
            // Pollinations fallback
            const imageUrl = getPollinationsImageUrl(slide.imagePrompt);
            if (imageUrl) {
              imageBase64 = await fetchImageAsBase64(imageUrl);
              usedProvider = 'pollinations';
              console.log(`[PPTX Generation] Pollinations image generated for slide ${index + 1}`);
            }
          }
          
          if (imageBase64) {
            imageCache.set(index, imageBase64);
          }
          return { index, provider: usedProvider };
        } catch (error) {
          console.warn(`[PPTX Generation] Failed to generate image for slide ${index + 1}:`, error.message);
          // Try fallback to Pollinations if Grok fails
          if (imageProvider === 'grok') {
            try {
              const imageUrl = getPollinationsImageUrl(slide.imagePrompt);
              if (imageUrl) {
                const fallbackImage = await fetchImageAsBase64(imageUrl);
                imageCache.set(index, fallbackImage);
                console.log(`[PPTX Generation] Fallback Pollinations image for slide ${index + 1}`);
                return { index, provider: 'pollinations' };
              }
            } catch (fallbackError) {
              console.warn(`[PPTX Generation] Fallback also failed for slide ${index + 1}`);
            }
          }
          return { index, provider: null };
        }
      }
      return { index, provider: null };
    });
    
    // Wait for all images to be generated in parallel
    const results = await Promise.all(imagePromises);
    
    // Determine which provider was used
    const usedProviders = results.filter(r => r && r.provider).map(r => r.provider);
    if (usedProviders.length > 0) {
      imageProviderFinal = usedProviders[0]; // Use the first successful provider
    }
    
    console.log(`[PPTX Generation] All images pre-generated (${imageCache.size}/${slides.length})`);
  }

  let pptx = new PptxGenJS();
  // Set layout using the correct method
  pptx.defineLayout({ name: 'LAYOUT_16x9', width: 10, height: 5.625 });
  pptx.layout = 'LAYOUT_16x9';

  // Now create slides using the pre-generated images
  for (let slideIndex = 0; slideIndex < slides.length; slideIndex++) {
    const slide = slides[slideIndex];
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
    const gradientBackground = createCardBackgroundImage(slideBg, 1920, 1080);
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

    // 2. GET PRE-GENERATED IMAGE FROM CACHE
    const imageBase64 = imageCache.get(slideIndex) || null;

    // 3. DEFINE LAYOUTS
    let titleOpts, bodyOpts;
    const contentArea = {
      x: contentBounds.x + cardPaddingX,
      y: contentBounds.y + cardPaddingY,
      w: contentBounds.w - cardPaddingX * 2,
      h: contentBounds.h - cardPaddingY * 2
    };

    // Image positioning - Convert normalized coordinates (0-1) to PPTX inches
    const SLIDE_WIDTH_INCHES = 10.0;
    const SLIDE_HEIGHT_INCHES = 5.625;
    const imagePosition = slide.imagePosition || "right";
    
    let imgX, imgY, imgW, imgH;
    
    // Calculate body positioning based on image position
    let bodyX = 0.5;
    let bodyW = 9.0;
    
    if (imageBase64) {
      // Frontend normalized coordinates to PPTX inches conversion
      if (slide.imageData) {
        // Use custom image data if available
        imgX = slide.imageData.x * SLIDE_WIDTH_INCHES;
        imgY = slide.imageData.y * SLIDE_HEIGHT_INCHES;
        imgW = slide.imageData.width * SLIDE_WIDTH_INCHES;
        imgH = slide.imageData.height * SLIDE_HEIGHT_INCHES;

        // Recalculate body positioning based on custom image position
        if (imagePosition === "left") {
          bodyX = imgX + imgW + (0.04 * SLIDE_WIDTH_INCHES);
          bodyW = Math.max(0.5, SLIDE_WIDTH_INCHES - bodyX - 0.5);
        } else if (imagePosition === "right") {
          bodyX = 0.5;
          bodyW = Math.max(0.5, imgX - 0.5);
        } else {
          // Center or other
          bodyX = 0.5;
          bodyW = 9.0;
        }
      } else if (imagePosition === "center") {
        // Center: normalized { x: 0.35, y: 0.5, width: 0.3, height: 0.4 }
        imgX = 0.35 * SLIDE_WIDTH_INCHES;  // 3.5"
        imgY = 0.5 * SLIDE_HEIGHT_INCHES;   // 2.8125"
        imgW = 0.3 * SLIDE_WIDTH_INCHES;    // 3.0"
        imgH = 0.4 * SLIDE_HEIGHT_INCHES;   // 2.25"
        // Text takes full width at top
        bodyX = 0.5;
        bodyW = 9.0;
      } else if (imagePosition === "left") {
        // Left: normalized { x: 0.05, y: 0.2, width: 0.35, height: 0.65 }
        imgX = 0.05 * SLIDE_WIDTH_INCHES;  // 0.5"
        imgY = 0.2 * SLIDE_HEIGHT_INCHES;   // 1.125"
        imgW = 0.35 * SLIDE_WIDTH_INCHES;   // 3.5"
        imgH = 0.65 * SLIDE_HEIGHT_INCHES;  // 3.65625"
        bodyX = (0.05 + 0.35 + 0.04) * SLIDE_WIDTH_INCHES; // After image + margin
        bodyW = SLIDE_WIDTH_INCHES - bodyX - 0.5;
      } else {
        // Right: normalized { x: 0.6, y: 0.2, width: 0.35, height: 0.65 }
        imgX = 0.6 * SLIDE_WIDTH_INCHES;   // 6.0"
        imgY = 0.2 * SLIDE_HEIGHT_INCHES;   // 1.125"
        imgW = 0.35 * SLIDE_WIDTH_INCHES;   // 3.5"
        imgH = 0.65 * SLIDE_HEIGHT_INCHES;  // 3.65625"
        bodyX = 0.5;
        bodyW = (0.6 - 0.05) * SLIDE_WIDTH_INCHES; // Space before image
      }
      
      pptxSlide.addImage({
        data: imageBase64,
        x: imgX,
        y: imgY,
        w: imgW,
        h: imgH,
        sizing: { type: "contain", w: imgW, h: imgH },
      });
    }

    // 4. ADD TEXT TO SLIDE
    
    const SLIDE_WIDTH = 10.0;
    const SLIDE_HEIGHT = 5.625;

    // Resolve Title Box - if image exists, always use dynamic positioning
    let finalTitleX, finalTitleY, finalTitleW, finalTitleH;
    if (slide.titleBox) {
      // Use manual titleBox if provided
      finalTitleX = slide.titleBox.x * SLIDE_WIDTH;
      finalTitleY = slide.titleBox.y * SLIDE_HEIGHT;
      finalTitleW = slide.titleBox.width * SLIDE_WIDTH;
      finalTitleH = slide.titleBox.height * SLIDE_HEIGHT;
    } else if (imageBase64) {
      // With image: use dynamic positioning based on image position
      finalTitleX = bodyX;
      finalTitleW = bodyW;
      
      // For center layout, use smaller title box to save space
      if (imagePosition === 'center') {
        finalTitleY = 0.35;  // 0.6" / 5.625"
        finalTitleH = 0.56;  // 0.1 * 5.625" (reduced from 0.8")
      } else {
        finalTitleY = 0.5;
        finalTitleH = 0.8;
      }
    } else {
      // Fallback defaults
      finalTitleX = 0.5;
      finalTitleW = 9.0;
      finalTitleY = 0.35;
      finalTitleH = 1.0;
    }

    // Add title with dynamic height FIRST (so we can calculate body position)
    const adjustedTitleSize = titleFontSize;
    const titleText = slide.title || '';
    
    let actualTitleHeight = 0;
    
    if (titleText.trim()) {
      // Calculate dynamic height based on title text
      const dynamicTitleHeight = calculateTextBoxHeight(
        titleText,
        adjustedTitleSize,
        finalTitleW,
        1.2,
        titleFontFace
      );
      
      actualTitleHeight = dynamicTitleHeight;
      
      pptxSlide.addText(titleText, {
        x: finalTitleX,
        y: finalTitleY,
        w: finalTitleW,
        h: dynamicTitleHeight,
        color: titleColorPptx,
        fontFace: titleFontFace,
        fontSize: adjustedTitleSize,
        bold: titleBold,
        italic: titleItalic,
        align: titleAlign || (slideLayout === 'title' ? 'center' : 'left'),
        margin: 0,
        lineSpacing: adjustedTitleSize * 1.2,
        fit: 'resize', // Allow PowerPoint to resize if user edits
        valign: 'top' // Align text to top of box
      });
    } else {
      // No title text - use a small default spacing
      actualTitleHeight = 0.3;
    }

    // Resolve Body Box - AFTER title is calculated to avoid overlap
    let finalBodyX, finalBodyY, finalBodyW, finalBodyH;
    if (slide.bodyBox) {
      // Use manual bodyBox if provided
      finalBodyX = slide.bodyBox.x * SLIDE_WIDTH;
      finalBodyY = slide.bodyBox.y * SLIDE_HEIGHT;
      finalBodyW = slide.bodyBox.width * SLIDE_WIDTH;
      finalBodyH = slide.bodyBox.height * SLIDE_HEIGHT;
    } else if (imageBase64) {
      // With image: use dynamic positioning based on image position
      finalBodyX = bodyX;
      finalBodyW = bodyW;
      // Start below title with a small gap (0.15")
      finalBodyY = finalTitleY + actualTitleHeight + 0.15;
      finalBodyH = Math.max(1.0, SLIDE_HEIGHT - finalBodyY - 0.2); // Fill remaining space
    } else {
      // No image: body below title
      finalBodyX = 0.5;
      finalBodyW = 9.0;
      // Start below title with a small gap (0.15")
      finalBodyY = finalTitleY + actualTitleHeight + 0.15;
      finalBodyH = Math.max(1.0, SLIDE_HEIGHT - finalBodyY - 0.2); // Fill remaining space
    }

    // Get bullet lines using the same logic as the old frontend
    const getBulletLinesForSlide = (sdata) => {
      if (!sdata) return [];
      
      let sourceArray = [];
      if (Array.isArray(sdata.bullets)) {
        sourceArray = sdata.bullets.filter(Boolean);
      } else {
        const text = typeof sdata.bullets === 'string' && sdata.bullets.trim().length
          ? sdata.bullets
          : (typeof sdata.text === 'string' ? sdata.text : '');
        sourceArray = [text];
      }

      return sourceArray
        .map(b => String(b))
        .map(b => b.replace(/([a-z])\.([A-Z])/g, '$1.\n$2')) // Fix missing spaces between sentences
        .flatMap(b => b.split(/\n|•/))
        .map(l => (l || '').trim())
        .filter(Boolean);
    };

    const bulletLines = getBulletLinesForSlide(slide);
    const hasBullets = bulletLines.length > 0;
    const hasText = slide.text && slide.text.trim().length > 0;

    // Match old frontend behavior: use proper bullet formatting
    if (slideLayout === 'title') {
      // Title layout: show text (no bullets, just newlines)
      let bodyText = typeof slide.text === 'string' ? slide.text.trim() : '';
      if (!bodyText && bulletLines.length) {
        bodyText = bulletLines.join('\n');
      }
      
      if (bodyText) {
        const dynamicBodyHeight = calculateTextBoxHeight(
          bodyText,
          bodyFontSize,
          finalBodyW,
          1.2,
          bodyFontFace
        );
        
        pptxSlide.addText(bodyText, {
          x: finalBodyX,
          y: finalBodyY,
          w: finalBodyW,
          h: dynamicBodyHeight,
          color: textColorPptx,
          fontFace: bodyFontFace,
          fontSize: bodyFontSize,
          bold: bodyBold,
          italic: bodyItalic,
          align: bodyAlign || 'left',
          margin: 0,
          lineSpacing: bodyFontSize * 1.2,
          fit: 'resize', // Allow PowerPoint to resize if user edits
          valign: 'top' // Align text to top of box
        });
      }
    } else {
      // Content layout: show bullets or text
      const bulletText = bulletLines.map(b => `• ${b}`).join('\n');
      
      const adjustedFontSize = bodyFontSize;
      
      if (hasBullets || hasText) {
        const dynamicBodyHeight = calculateTextBoxHeight(
          bulletText,
          adjustedFontSize,
          finalBodyW,
          1.2,
          bodyFontFace
        );
        
        pptxSlide.addText(bulletText, {
          x: finalBodyX,
          y: finalBodyY,
          w: finalBodyW,
          h: dynamicBodyHeight,
          color: textColorPptx,
          fontFace: bodyFontFace,
          fontSize: adjustedFontSize,
          bold: bodyBold,
          italic: bodyItalic,
          align: bodyAlign || 'left',
          margin: 0,
          lineSpacing: adjustedFontSize * 1.2,
          fit: 'resize', // Allow PowerPoint to resize if user edits
          valign: 'top' // Align text to top of box
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