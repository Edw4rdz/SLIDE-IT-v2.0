// In-memory cache for Imagen images: key = prompt+model, value = base64
const imagenImageCache = new Map();

export { generateImagenImage };
// backend/services/pptxService.js
import PptxGenJS from "pptxgenjs";
import axios from "axios";
import { PNG } from "pngjs";
import { GoogleAuth } from "google-auth-library"; // --- NEW IMPORT ---
import { grokClient, GROK_IMAGE_MODEL } from "../config/grokConfig.js";

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
 * --- NEW: Generate Image using Google Vertex AI (Service Account) ---
 */
async function generateImagenImage(prompt) {

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') return null;

  // Use prompt + model as cache key
  const modelId = process.env.IMAGEN_MODEL_ID || 'imagen-3.0-fast-generate-001';
  const cacheKey = `${modelId}::${prompt.trim()}`;
  if (imagenImageCache.has(cacheKey)) {
    return imagenImageCache.get(cacheKey);
  }

  try {
    // 1. Get Authentication Token from Service Account
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    const token = accessToken.token;

    // 2. Configure Vertex AI Endpoint
    const projectId = process.env.GOOGLE_PROJECT_ID; 
    const location = process.env.GCP_LOCATION || 'us-central1';
    
    if (!projectId) throw new Error("GOOGLE_PROJECT_ID is missing in .env");

    // Use the model ID from env (e.g., 'imagen-4.0-fast-generate-001') or fallback
    // (already set above)
    console.log(`[Imagen] Using Vertex AI Model: ${modelId} in ${location}`);
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predict`;

    // 3. Make the Request
    const response = await axios.post(url, {
      instances: [
        { prompt: prompt }
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: "16:9" // Optimize for slides
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // 4. Extract Image
    const b64 = response.data.predictions?.[0]?.bytesBase64Encoded;
    
    if (b64) {
      const dataUrl = `data:image/png;base64,${b64}`;
      imagenImageCache.set(cacheKey, dataUrl);
      // Limit cache size to 200
      if (imagenImageCache.size > 200) {
        const firstKey = imagenImageCache.keys().next().value;
        imagenImageCache.delete(firstKey);
      }
      return dataUrl;
    }
    throw new Error("No image data in Vertex AI response");

  } catch (error) {
    console.error("[Imagen] Generation failed:", error.response?.data?.error || error.message);
    throw error;
  }
}

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
    
    const response = await grokClient.images.generate({
      model: GROK_IMAGE_MODEL,
      prompt: prompt,
      n: 1,
      response_format: "b64_json"
    });

    if (response.data && response.data.length > 0) {
      const image = response.data[0];
      if (image.b64_json) {
        return `data:image/png;base64,${image.b64_json}`;
      } else if (image.url) {
        return await fetchImageAsBase64(image.url);
      }
    }
    
    throw new Error("No image data returned from Grok API");
  } catch (error) {
    console.error("[Grok Image] Generation failed:", error.message);
    if (error.response) {
      console.error("[Grok Image] API Error Data:", error.response.data);
    }
    throw error;
  }
}

const fetchImageAsBase64 = async (url) => {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer'
    });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return `data:${response.headers['content-type']};base64,${base64}`;
  } catch (err) {
    console.error(`Error fetching image for PPTX: ${url}`, err.message);
    return null;
  }
};

async function generateChartImage(chartData, chartType = 'bar', width = 800, height = 450) {
  if (!chartData || !Array.isArray(chartData) || chartData.length === 0) return null;
  try {
    const keys = Object.keys(chartData[0]);
    const labelKey = keys[0];
    const valueKeys = keys.slice(1);
    const labels = chartData.map(r => String(r[labelKey]));

    const colors = [
      'rgba(75, 192, 192, 0.6)',
      'rgba(255, 159, 64, 0.6)',
      'rgba(54, 162, 235, 0.6)',
      'rgba(153, 102, 255, 0.6)',
      'rgba(255, 205, 86, 0.6)'
    ];

    let datasets = valueKeys.map((vk, i) => ({
      label: vk,
      data: chartData.map(r => Number(r[vk]) || 0),
      backgroundColor: colors[i % colors.length],
      borderColor: colors[i % colors.length].replace('0.6', '1'),
      borderWidth: 1,
    }));
    
    if (chartType === 'pie' && datasets.length > 1) {
      datasets = [
        {
          label: datasets[0].label,
          data: datasets[0].data,
          backgroundColor: datasets[0].backgroundColor,
          borderColor: datasets[0].borderColor,
          borderWidth: 1,
        }
      ];
    }

    const chartConfig = {
      type: chartType === 'pie' ? 'pie' : (chartType === 'line' ? 'line' : 'bar'),
      data: { labels, datasets },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: { legend: { display: datasets.length > 1 || chartType === 'pie' } },
      }
    };

    const body = {
      chart: JSON.stringify(chartConfig),
      width,
      height,
      format: 'png',
      backgroundColor: 'white'
    };

    const response = await axios.post('https://quickchart.io/chart', body, { responseType: 'arraybuffer', timeout: 20000 });
    if (response && response.data) {
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      return `data:image/png;base64,${base64}`;
    }
    return null;
  } catch (err) {
    console.warn('[Chart Image] QuickChart generation failed:', err.message);
    return null;
  }
}

const calculateTextBoxHeight = (text, fontSize, boxWidth, lineHeight = 1.2, fontFace = 'Arial') => {
  if (!text || text.trim() === '') return 0.5;
  const avgCharWidthRatio = 0.55;
  const boxWidthPts = boxWidth * 72;
  const avgCharWidth = fontSize * avgCharWidthRatio;
  const charsPerLine = Math.floor(boxWidthPts / avgCharWidth);
  const effectiveCharsPerLine = Math.max(charsPerLine, 10);
  
  const lines = text.split('\n');
  let totalLines = 0;
  
  for (const line of lines) {
    if (line.length === 0) {
      totalLines += 1;
    } else {
      const words = line.split(/\s+/);
      let currentLineLength = 0;
      let linesInParagraph = 0;
      
      for (const word of words) {
        const wordLength = word.length;
        if (currentLineLength + wordLength + 1 <= effectiveCharsPerLine) {
          currentLineLength += wordLength + 1;
        } else {
          if (currentLineLength > 0) {
            linesInParagraph += 1;
          }
          currentLineLength = wordLength + 1;
        }
      }
      if (currentLineLength > 0) linesInParagraph += 1;
      totalLines += Math.max(linesInParagraph, 1);
    }
  }
  
  const heightPts = totalLines * fontSize * lineHeight;
  const heightInches = heightPts / 72;
  const finalHeight = Math.max(0.5, heightInches + 0.2);
  return finalHeight;
};

function autoFitFontSize(text, boxWidth, boxHeight, minFont = 12, maxFont = 40, lineHeight = 1.2, fontFace = 'Arial') {
  let fontSize = maxFont;
  while (fontSize >= minFont) {
    const height = calculateTextBoxHeight(text, fontSize, boxWidth, lineHeight, fontFace);
    if (height <= boxHeight) {
      return fontSize;
    }
    fontSize -= 1;
  }
  return minFont;
}

export const generatePptxFromData = async (requestBody) => {
  const { slides, includeImages, imageProvider, forceSecondSlide, chartData, chartType, chartSummary } = requestBody;
  const incomingDesign = typeof requestBody.design === 'object' && requestBody.design !== null ? requestBody.design : {};
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

  if (forceSecondSlide && slides.length > 1) {
    slides[1] = forceSecondSlide;
  }

  console.log(`[PPTX Generation] Starting with ${slides.length} slides, imageProvider: ${imageProvider || 'none'}`);

  let imageProviderFinal = null;
  const imageCache = new Map();
  
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

          // --- NEW: Check if we already have a saved image from a previous generation ---
          if (slide.savedImageUrl) {
             try {
                console.log(`[PPTX] Fetching saved image for slide ${index}...`);
                // Re-use the existing helper to fetch the URL
                imageBase64 = await fetchImageAsBase64(slide.savedImageUrl);
                if (imageBase64) usedProvider = 'saved';
             } catch (savedErr) {
                console.warn(`[PPTX] Could not fetch saved image for slide ${index}, regenerating...`);
             }
          }

          // If we didn't find a saved image (or failed to fetch it), GENERATE A NEW ONE
          if (!imageBase64) {
              if (imageProvider === 'imagen') {
                 try {
                    imageBase64 = await generateImagenImage(slide.imagePrompt);
                    usedProvider = 'imagen';
                 } catch (err) {
                    console.warn(`[PPTX] Imagen failed for slide ${index}, trying fallback...`, err.message);
                 }
              } 
              else if (imageProvider === 'grok') {
                if (process.env.GROK_IMAGE_API_KEY || process.env.XAI_API_KEY) {
                  imageBase64 = await generateGrokImage(slide.imagePrompt);
                  usedProvider = 'grok';
                }
              }
              
              // Pollinations fallback
              if (!imageBase64) {
                const imageUrl = getPollinationsImageUrl(slide.imagePrompt);
                if (imageUrl) {
                  imageBase64 = await fetchImageAsBase64(imageUrl);
                  usedProvider = 'pollinations';
                }
              }
          }
          
          if (imageBase64) {
            imageCache.set(index, imageBase64);
          }
          return { index, provider: usedProvider };
        } catch (error) {
          console.warn(`[PPTX Generation] Failed to generate image for slide ${index + 1}:`, error.message);
          return { index, provider: null };
        }
      }
    });
    
    const results = await Promise.all(imagePromises);
    const usedProviders = results.filter(r => r && r.provider).map(r => r.provider);
    if (usedProviders.length > 0) {
      imageProviderFinal = usedProviders[0];
    }
    
    console.log(`[PPTX Generation] All images pre-generated (${imageCache.size}/${slides.length})`);
  }

  let pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'LAYOUT_16x9', width: 10, height: 5.625 });
  pptx.layout = 'LAYOUT_16x9';

  let slideOffset = 0;
  if (chartData && chartType) {
    const chartSlide = pptx.addSlide();
    chartSlide.background = { color: colorToPptx(design.globalBackground, '#ffffff') };
    chartSlide.addText('Chart & Summary', {
      x: 0.5, y: 0.3, w: 9, h: 0.8,
      fontFace: design.font,
      fontSize: 36,
      color: colorToPptx(design.globalTitleColor, '#000000'),
      bold: true,
      align: 'center',
      valign: 'top',
    });
    let chartRendered = false;
    if (Array.isArray(chartData) && chartData.length > 0) {
      try {
        const chartImage = await generateChartImage(Array.isArray(chartData) ? chartData : [], (chartType || 'bar'), 800, 450);
        if (chartImage) {
          chartSlide.addImage({ data: chartImage, x: 1.0, y: 1.1, w: 5.0, h: 3.4 });
          chartRendered = true;
        }
      } catch (err) {
        console.warn('[PPTX] Chart image generation failed, falling back to native chart', err.message);
      }
    }
    if (!chartRendered) {
      let chartTypePptx = 'bar';
      if (chartType === 'line') chartTypePptx = 'line';
      if (chartType === 'pie') chartTypePptx = 'pie';
      let chartLabels = [];
      let chartValues = [];
      if (Array.isArray(chartData) && chartData.length > 0) {
        const keys = Object.keys(chartData[0]);
        if (keys.length >= 2) {
          chartLabels = chartData.map(row => row[keys[0]]);
          chartValues = chartData.map(row => Number(row[keys[1]]) || 0);
        }
      }
      if (chartLabels.length && chartValues.length) {
        chartSlide.addChart(chartTypePptx, [
          {
            name: 'Series',
            labels: chartLabels,
            values: chartValues,
          }
        ], {
          x: 1.0, y: 1.2, w: 4.5, h: 3.0,
          barDir: 'col',
          showLegend: false,
          showValue: true,
        });
      }
    }
    if (chartSummary) {
      chartSlide.addText(chartSummary, {
        x: 5.7, y: 1.2, w: 3.3, h: 3.0,
        fontFace: design.font,
        fontSize: 22,
        color: colorToPptx(design.globalTextColor, '#333333'),
        align: 'left',
        valign: 'top',
        margin: 0.1,
      });
    }
    slideOffset = 1;
  }

  for (let slideIndex = 0; slideIndex < slides.length; slideIndex++) {
    const slide = slides[slideIndex];
    let pptxSlide = pptx.addSlide();

    const slideLayout = slide.layout || 'content';
    const layoutStyles = design.layouts?.[slideLayout] || {};

    const slideBg = slide.background || layoutStyles.background || design.globalBackground;
    const titleColorNorm = normalizeColor(slide.titleColor || layoutStyles.titleColor || design.globalTitleColor, '#000000');
    const textColorNorm = normalizeColor(slide.textColor || layoutStyles.textColor || design.globalTextColor, '#333333');

    const defaultFont = design.font || 'Arial';
    const titleFontFace = slide.styles?.titleFont || slide.styles?.textFont || defaultFont;
    const bodyFontFace = slide.styles?.textFont || slide.styles?.titleFont || defaultFont;
    const titleFontSize = parseFontSize(slide.styles?.titleSize, slideLayout === 'title' ? 44 : 32);
    const bodyFontSize = parseFontSize(slide.styles?.textSize, slideLayout === 'title' ? 24 : 18);
    const titleBold = !!slide.styles?.titleBold;
    const titleItalic = !!slide.styles?.titleItalic;
    const bodyBold = !!slide.styles?.textBold;
    const bodyItalic = !!slide.styles?.textItalic;
    const titleAlign = slide.styles?.titleAlign || (slideLayout === 'title' ? 'center' : 'left');
    const bodyAlign = slide.styles?.textAlign || (slideLayout === 'title' ? 'center' : 'left');

    const titleColorPptx = colorToPptx(titleColorNorm, '#000000');
    const textColorPptx = colorToPptx(textColorNorm, '#333333');

    const bgColorNorm = normalizeColor(slideBg, design.globalBackground);
    const gradientBackground = createCardBackgroundImage(slideBg, 1920, 1080);
    if (gradientBackground) {
      pptxSlide.addImage({ data: gradientBackground, x: 0, y: 0, w: 10, h: 5.625 });
    } else {
      pptxSlide.background = { color: colorToPptx(bgColorNorm, design.globalBackground) };
    }

    const imageBase64 = imageCache.get(slideIndex) || null;
    const SLIDE_WIDTH_INCHES = 10.0;
    const SLIDE_HEIGHT_INCHES = 5.625;
    const imagePosition = slide.imagePosition || "right";
    
    let imgX, imgY, imgW, imgH;
    let bodyX = 0.5;
    let bodyW = 9.0;
    
    if (imageBase64) {
      if (slide.imageData) {
        imgX = slide.imageData.x * SLIDE_WIDTH_INCHES;
        imgY = slide.imageData.y * SLIDE_HEIGHT_INCHES;
        imgW = slide.imageData.width * SLIDE_WIDTH_INCHES;
        imgH = slide.imageData.height * SLIDE_HEIGHT_INCHES;

        if (imagePosition === "left") {
          bodyX = imgX + imgW + (0.04 * SLIDE_WIDTH_INCHES);
          bodyW = Math.max(0.5, SLIDE_WIDTH_INCHES - bodyX - 0.5);
        } else if (imagePosition === "right") {
          bodyX = 0.5;
          bodyW = Math.max(0.5, imgX - 0.5);
        }
      } else if (imagePosition === "center") {
        imgX = 0.35 * SLIDE_WIDTH_INCHES;
        imgY = 0.5 * SLIDE_HEIGHT_INCHES;
        imgW = 0.3 * SLIDE_WIDTH_INCHES;
        imgH = 0.4 * SLIDE_HEIGHT_INCHES;
      } else if (imagePosition === "left") {
        imgX = 0.05 * SLIDE_WIDTH_INCHES;
        imgY = 0.2 * SLIDE_HEIGHT_INCHES;
        imgW = 0.35 * SLIDE_WIDTH_INCHES;
        imgH = 0.65 * SLIDE_HEIGHT_INCHES;
        bodyX = (0.05 + 0.35 + 0.04) * SLIDE_WIDTH_INCHES;
        bodyW = SLIDE_WIDTH_INCHES - bodyX - 0.5;
      } else {
        imgX = 0.6 * SLIDE_WIDTH_INCHES;
        imgY = 0.2 * SLIDE_HEIGHT_INCHES;
        imgW = 0.35 * SLIDE_WIDTH_INCHES;
        imgH = 0.65 * SLIDE_HEIGHT_INCHES;
        bodyX = 0.5;
        bodyW = (0.6 - 0.05) * SLIDE_WIDTH_INCHES;
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

    let finalTitleX, finalTitleY, finalTitleW, finalTitleH;
    if (slide.titleBox) {
      finalTitleX = slide.titleBox.x * SLIDE_WIDTH_INCHES;
      finalTitleY = slide.titleBox.y * SLIDE_HEIGHT_INCHES;
      finalTitleW = slide.titleBox.width * SLIDE_WIDTH_INCHES;
      finalTitleH = slide.titleBox.height * SLIDE_HEIGHT_INCHES;
    } else if (imageBase64) {
      finalTitleX = bodyX;
      finalTitleW = bodyW;
      if (imagePosition === 'center') {
        finalTitleY = 0.35;
        finalTitleH = 0.56;
      } else {
        finalTitleY = 0.5;
        finalTitleH = 0.8;
      }
    } else {
      finalTitleX = 0.5;
      finalTitleW = 9.0;
      finalTitleY = 0.35;
      finalTitleH = 1.0;
    }

    const titleText = (slide.title || '').replace(/\*\*/g, '"');
    let adjustedTitleSize = titleFontSize;
    try {
      const trimmed = titleText.trim();
      if (trimmed.length > 40) {
        const shrinkRatio = 40 / trimmed.length;
        adjustedTitleSize = Math.max(Math.floor(titleFontSize * shrinkRatio), 14);
      }
    } catch {
      adjustedTitleSize = titleFontSize;
    }
    
    let actualTitleHeight = 0;
    if (titleText.trim()) {
      const dynamicTitleHeight = calculateTextBoxHeight(titleText, adjustedTitleSize, finalTitleW, 1.2, titleFontFace);
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
        fit: 'resize',
        valign: 'top'
      });
    } else {
      actualTitleHeight = 0.3;
    }

    let finalBodyX, finalBodyY, finalBodyW, finalBodyH;
    if (slide.bodyBox) {
      finalBodyX = slide.bodyBox.x * SLIDE_WIDTH_INCHES;
      finalBodyY = slide.bodyBox.y * SLIDE_HEIGHT_INCHES;
      finalBodyW = slide.bodyBox.width * SLIDE_WIDTH_INCHES;
      finalBodyH = slide.bodyBox.height * SLIDE_HEIGHT_INCHES;
    } else if (imageBase64) {
      finalBodyX = bodyX;
      finalBodyW = bodyW;
      if (imagePosition === 'center') {
        finalBodyY = imgY + imgH + 0.1;
        finalBodyH = Math.max(0.8, SLIDE_HEIGHT_INCHES - finalBodyY - 0.2);
      } else {
        finalBodyY = finalTitleY + actualTitleHeight + 0.05;
        finalBodyH = Math.max(1.0, SLIDE_HEIGHT_INCHES - finalBodyY - 0.2);
      }
    } else {
      finalBodyX = 0.5;
      finalBodyW = 9.0;
      finalBodyY = finalTitleY + actualTitleHeight + 0.05;
      finalBodyH = Math.max(1.0, SLIDE_HEIGHT_INCHES - finalBodyY - 0.2);
    }

    const getBulletLinesForSlide = (sdata) => {
      if (!sdata) return [];
      let sourceArray = [];
      if (Array.isArray(sdata.bullets)) {
        sourceArray = sdata.bullets.filter(Boolean);
      } else {
        const text = typeof sdata.bullets === 'string' && sdata.bullets.trim().length ? sdata.bullets : (typeof sdata.text === 'string' ? sdata.text : '');
        sourceArray = [text];
      }
      return sourceArray.map(b => String(b)).map(b => b.replace(/([a-z])\.([A-Z])/g, '$1.\n$2')).flatMap(b => b.split(/\n|•/)).map(l => (l || '').trim()).filter(Boolean);
    };

    const bulletLines = getBulletLinesForSlide(slide);
    const hasBullets = bulletLines.length > 0;
    const hasText = slide.text && slide.text.trim().length > 0;

    if (slideLayout === 'title') {
      let bodyText = typeof slide.text === 'string' ? slide.text.trim() : '';
      if (!bodyText && bulletLines.length) bodyText = bulletLines.join('\n');
      bodyText = bodyText.replace(/\*\*/g, '"');
      
      if (bodyText) {
        const dynamicBodyHeight = calculateTextBoxHeight(bodyText, bodyFontSize, finalBodyW, 1.2, bodyFontFace);
        const constrainedBodyHeight = Math.min(dynamicBodyHeight, finalBodyH);
        
        pptxSlide.addText(bodyText, {
          x: finalBodyX,
          y: finalBodyY,
          w: finalBodyW,
          h: constrainedBodyHeight,
          color: textColorPptx,
          fontFace: bodyFontFace,
          fontSize: bodyFontSize,
          bold: bodyBold,
          italic: bodyItalic,
          align: bodyAlign || 'left',
          margin: 0,
          lineSpacing: bodyFontSize * 1.2,
          fit: 'shrink',
          valign: 'top'
        });
      }
    } else {
      const bulletText = bulletLines.map(b => `• ${b.replace(/\*\*/g, '"')}`).join('\n');
      if (hasBullets || hasText) {
        const dynamicBodyHeight = calculateTextBoxHeight(bulletText, bodyFontSize, finalBodyW, 1.2, bodyFontFace);
        const constrainedBodyHeight = Math.min(dynamicBodyHeight, finalBodyH);
        
        pptxSlide.addText(bulletText, {
          x: finalBodyX,
          y: finalBodyY,
          w: finalBodyW,
          h: constrainedBodyHeight,
          color: textColorPptx,
          fontFace: bodyFontFace,
          fontSize: bodyFontSize,
          bold: bodyBold,
          italic: bodyItalic,
          align: bodyAlign || 'left',
          margin: 0,
          lineSpacing: bodyFontSize * 1.2,
          fit: 'shrink',
          valign: 'top'
        });
      }
    }

    if (Array.isArray(slide.stickers)) {
      for (const sticker of slide.stickers) {
        if (!sticker || !sticker.url) continue;
        let dataUrl = null;
        if (sticker.url.startsWith('data:')) {
          dataUrl = sticker.url;
        } else {
          try {
            dataUrl = await fetchImageAsBase64(sticker.url);
          } catch (err) { continue; }
        }
        if (!dataUrl) continue;
        const x = (sticker.x || 0) * 10.0;
        const y = (sticker.y || 0) * 5.625;
        const w = (sticker.width || 0.18) * 10.0;
        const h = (sticker.height || 0.18) * 5.625;
        try {
          pptxSlide.addImage({ data: dataUrl, x, y, w, h, rotate: sticker.rotate || 0 });
        } catch (err) {}
      }
    }

    if (Array.isArray(slide.tables)) {
      for (const tbl of slide.tables) {
        try {
          const rowsCount = Math.max(1, tbl?.rows || (Array.isArray(tbl?.cells) ? tbl.cells.length : 1));
          const colsCount = Math.max(1, tbl?.cols || (Array.isArray(tbl?.cells?.[0]) ? tbl.cells[0].length : 1));
          const cellMatrix = ensureTableCells(rowsCount, colsCount, tbl?.cells);
          const fillColor = colorToPptx(tbl?.background || '#FFFFFF', '#FFFFFF');
          const borderColor = colorToPptx(tbl?.borderColor || '#111827', '#111827');
          const tableTextColor = colorToPptx(textColorNorm, '#333333');
          const borderPt = pxToPt(typeof tbl?.borderWidth === 'number' ? tbl.borderWidth : 1.33);
          const borderType = mapBorderStyle(tbl?.borderStyle);
          const borderDef = ['t', 'r', 'b', 'l'].map(() => ({ color: borderColor, pt: borderPt, type: borderType }));
          
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
          
          const widthFrac = typeof tbl?.width === 'number' && tbl.width > 0 ? tbl.width : 0.5;
          const heightFrac = typeof tbl?.height === 'number' && tbl.height > 0 ? tbl.height : 0.3;
          const tableWidth = clamp(widthFrac * SLIDE_WIDTH_INCHES, 1, SLIDE_WIDTH_INCHES);
          const tableHeight = clamp(heightFrac * SLIDE_HEIGHT_INCHES, 0.5, SLIDE_HEIGHT_INCHES);
          const tableX = clamp((tbl?.x || 0) * SLIDE_WIDTH_INCHES, 0, SLIDE_WIDTH_INCHES - tableWidth);
          const tableY = clamp((tbl?.y || 0) * SLIDE_HEIGHT_INCHES, 0, SLIDE_HEIGHT_INCHES - tableHeight);
          
          const colW = Array.from({ length: colsCount }, () => tableWidth / colsCount);
          const rowH = Array.from({ length: rowsCount }, () => tableHeight / rowsCount);
          
          pptxSlide.addTable(tableRows, { x: tableX, y: tableY, w: tableWidth, h: tableHeight, colW, rowH, valign: 'top' });
        } catch (tableErr) {}
      }
    }
  }

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
    throw new Error('Unknown PPTX data format returned from pptxgenjs');
  }
  
  console.log(`PPTX buffer ready, size: ${pptxBuffer.length} bytes`);
  return { buffer: pptxBuffer, imageProviderFinal: imageProviderFinal || (includeImages ? 'none' : null) };
};