
import axios from "axios";
import PptxGenJS from "pptxgenjs";
import { Buffer } from "buffer";

const API_BASE = "http://localhost:5000/api";


export const registerUser = (data) => axios.post(`${API_BASE}/register`, data);
export const loginUser = (data) => axios.post(`${API_BASE}/login`, data);
export const checkEmailExists = (email) => axios.post(`${API_BASE}/check-email`, { email });
export const convertPDF = (data) => axios.post(`${API_BASE}/convert-pdf`, data);
export const convertWord = (data) => axios.post(`${API_BASE}/convert-word`, data);
export const convertText = (data) => axios.post(`${API_BASE}/convert-text`, data);
export const convertExcel = (data) => axios.post(`${API_BASE}/convert-excel`, data);
export const generateSlides = (data) => axios.post(`${API_BASE}/generate-topics`, data);
export const uploadTemplate = (formData) =>
  axios.post(`${API_BASE}/upload-template`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const getTemplates = () => axios.get(`${API_BASE}/templates/list`);
export const getHistory = (userId) =>
  axios.get(`${API_BASE}/conversions`, { params: { userId } });
export const deleteHistory = (id, userId) =>
  axios.delete(`${API_BASE}/conversions/${id}`, { params: { userId } });

// Example prebuilt templates (you might have this in /src/api.js or /src/data/templates.js)
export const prebuiltTemplates = [
  {
    id: 'template1',
    name: 'Modern Blue',
    colors: ['#003366', '#0099cc'],
    images: ['modern-bg.png'],
    slides: [
      {
        id: 'slide1',
        title: 'Welcome to Modern Blue',
        bullets: ['Clean Design', 'Professional Look', 'Easy to Customize'],
        layout: 'title',
      },
      {
        id: 'slide2',
        title: 'About Us',
        bullets: ['Our Mission', 'Our Team', 'Our Vision'],
        layout: 'content',
      },
    ],
  },
  {
    id: 'template2',
    name: 'Creative Sunset',
    colors: ['#ff7e5f', '#feb47b'],
    images: ['sunset-bg.png'],
    slides: [
      {
        id: 'slide1',
        title: 'Creative Sunset Theme',
        bullets: ['Warm Colors', 'Relaxed Vibe', 'Beautiful Gradient'],
        layout: 'title',
      },
    ],
  },
];

const generateImageFromPollinations = async (prompt, retries = 1) => {

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") return null;
  const encodedPrompt = encodeURIComponent(prompt.trim());
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 20000,
      });
      const base64 = Buffer.from(response.data, "binary").toString("base64");
      const mimeType = response.headers["content-type"] || "image/jpeg";
      return `data:${mimeType};base64,${base64}`;
    } catch (err) {
      console.warn(`⚠️ Pollinations fetch failed (attempt ${attempt + 1}): ${err.message}`);
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return null;
};


// 🧠 Converts slides & current design to PowerPoint exactly like Gamma
// 🧠 Converts slides & current design to PowerPoint exactly like the preview & edit
export const downloadPPTX = async (slides, design, fileName, includeImages = true) => {
  try {
    const pptx = new PptxGenJS();

    // --- Fix UNKNOWN-LAYOUT issue ---
    const LAYOUT_NAME = "LAYOUT_16x9_CUSTOM";
    pptx.defineLayout({ name: LAYOUT_NAME, width: 10.0, height: 5.625 });
    pptx.layout = LAYOUT_NAME;

    // Helper: make gradient → image dataURL
    const createGradientDataURL = (colors) => {
      if (!Array.isArray(colors) || colors.length === 0) return null;
      const canvas = document.createElement("canvas");
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d");
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      colors.forEach((c, i) => gradient.addColorStop(i / (colors.length - 1), c));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png");
    };

    // Helper: safely fetch remote image → dataURL
    const fetchAsDataURL = async (url) => {
      try {
        const response = await fetch(url, { mode: "cors" });
        const blob = await response.blob();
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn("CORS blocked or fetch failed for:", url);
        return null;
      }
    };

    // Helper: rasterize SVG data URL to PNG data URL for PowerPoint compatibility
    const rasterizeSvgDataUrl = async (dataUrl, width = 512, height = 512) => {
      try {
        if (!dataUrl || !dataUrl.startsWith('data:image/svg')) return dataUrl;
        const img = new Image();
        // Important for some browsers when drawing SVGs
        img.crossOrigin = 'anonymous';
        const loaded = await new Promise((resolve, reject) => {
          img.onload = () => resolve(true);
          img.onerror = reject;
          img.src = dataUrl;
        });
        if (!loaded) return dataUrl;
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        return canvas.toDataURL('image/png');
      } catch (e) {
        console.warn('SVG rasterize failed, falling back to original data URL', e);
        return dataUrl;
      }
    };

    // Helper: normalize bullets/text like the editor preview does
    const getBulletLines = (sdata) => {
      if (!sdata) return [];
      if (Array.isArray(sdata.bullets)) return sdata.bullets.filter(Boolean).map((b) => String(b).trim()).filter(Boolean);
      const src = typeof sdata.bullets === 'string' && sdata.bullets.trim().length
        ? sdata.bullets
        : (typeof sdata.text === 'string' ? sdata.text : '');
      return src
        .split(/\n|•/)
        .map((l) => (l || '').trim())
        .filter(Boolean);
    };

    for (let i = 0; i < slides.length; i++) {
      const sdata = slides[i];
      const slide = pptx.addSlide();

      const layoutType = sdata.layout || "content";
      const layoutStyle = design?.layouts?.[layoutType] || {};
      const bgVal = layoutStyle.background ?? design?.globalBackground ?? "#FFFFFF";

      // ---- BACKGROUND ----
      if (Array.isArray(bgVal) && bgVal.length > 1) {
        const dataUrl = createGradientDataURL(bgVal);
        if (dataUrl) slide.addImage({ data: dataUrl, x: 0, y: 0, w: "100%", h: "100%" });
        else slide.background = { color: bgVal[0] };
      } else if (typeof bgVal === "string" && bgVal.startsWith("http")) {
        const dataUrl = await fetchAsDataURL(bgVal);
        if (dataUrl) slide.addImage({ data: dataUrl, x: 0, y: 0, w: "100%", h: "100%" });
        else slide.background = { color: "#FFFFFF" };
      } else {
        slide.background = { color: Array.isArray(bgVal) ? bgVal[0] : bgVal };
      }

      // ---- BULLETS/TEXT & TITLE ----
      const bulletLines = getBulletLines(sdata);

      // --- Determine per-slide styles ---
      const slideStyles = sdata.styles || {};
      const textFont = slideStyles.textFont || design?.font || "Arial";
      const textSize = slideStyles.textSize || 18;
      const textBold = slideStyles.textBold || false;
      const textItalic = slideStyles.textItalic || false;
      const textAlign = slideStyles.textAlign || "left";

      const titleFont = slideStyles.titleFont || design?.font || "Arial";
      const titleSize = slideStyles.titleSize || 28;
      const titleBold = slideStyles.titleBold !== undefined ? slideStyles.titleBold : true;
      const titleItalic = slideStyles.titleItalic || false;

  // Determine image presence and position
  // Include images on title slides as well so export matches the editor/preview layout
  const hasImage = includeImages && (sdata.uploadedImage || sdata.imagePrompt);
      const imagePosition = sdata.imagePosition || "right";

      const imgW = 3.0;
      const imgH = 3.5;
      const imgMargin = 0.5;
      const imgX = imagePosition === "left" ? imgMargin : 10 - imgMargin - imgW;
      const imgY = 1.0;

      let bodyX = 0.5;
      let bodyW = 9.0;
      if (hasImage) {
        if (imagePosition === "left") {
          bodyX = imgX + imgW + 0.3;
          bodyW = 10 - bodyX - imgMargin;
        } else {
          bodyX = 0.5;
          bodyW = 10 - imgW - imgMargin - 0.8;
        }
      }

      // Add title & body
      if (layoutType === 'title') {
        // Render title slide like the editor: left-aligned title within the body area, with optional image column
        const titleFontSize = (sdata.styles && sdata.styles.titleSize) || titleSize;
        const titleFontFace = (sdata.styles && sdata.styles.titleFont) || titleFont;
        const titleX = hasImage ? bodyX : 0.5;
        const titleW = hasImage ? bodyW : 9;
        slide.addText(sdata.title || '', {
          x: titleX,
          y: 0.35,
          w: titleW,
          h: 1,
          color: layoutStyle.titleColor || design?.globalTitleColor || '#000000',
          fontFace: titleFontFace,
          fontSize: titleFontSize,
          bold: titleBold,
          italic: titleItalic,
          align: 'left',
        });

        // Body text or bullets (left-aligned)
        let bodyText = typeof sdata.text === 'string' ? sdata.text.trim() : '';
        if (!bodyText && bulletLines.length) bodyText = bulletLines.join('\n');
        if (bodyText) {
          slide.addText(bodyText, {
            x: titleX,
            y: 1.6,
            w: titleW,
            h: 3.6,
            color: layoutStyle.textColor || design?.globalTextColor || '#333333',
            fontFace: textFont,
            fontSize: textSize,
            bold: textBold,
            italic: textItalic,
            align: textAlign || 'left',
            lineSpacing: 20,
          });
        } else if (bulletLines.length) {
          slide.addText(bulletLines.map((b) => `• ${b}`).join('\n'), {
            x: titleX,
            y: 1.6,
            w: titleW,
            h: 3.6,
            color: layoutStyle.textColor || design?.globalTextColor || '#333333',
            fontFace: textFont,
            fontSize: textSize,
            bold: textBold,
            italic: textItalic,
            align: textAlign || 'left',
            lineSpacing: 20,
          });
        }
      } else {
        // Content slide: title aligned left within body region
        const titleX = hasImage ? bodyX : 0.5;
        const titleW = hasImage ? bodyW : 9;
        slide.addText(sdata.title || '', {
          x: titleX,
          y: 0.35,
          w: titleW,
          h: 1,
          color: layoutStyle.titleColor || design?.globalTitleColor || '#000000',
          fontFace: titleFont,
          fontSize: titleSize,
          bold: titleBold,
          italic: titleItalic,
          align: 'left',
        });

        // Content slide: add bullets if any
        if (bulletLines.length) {
          slide.addText(bulletLines.map((b) => `• ${b}`).join('\n'), {
            x: bodyX,
            y: 1.6,
            w: bodyW,
            h: 3.6,
            color: layoutStyle.textColor || design?.globalTextColor || '#333333',
            fontFace: textFont,
            fontSize: textSize,
            bold: textBold,
            italic: textItalic,
            align: textAlign,
            lineSpacing: 20,
          });
        }
      }

      // ---- IMAGE ----
      if (hasImage) {
        let imgSrc = sdata.uploadedImage;
        if (!imgSrc && sdata.imagePrompt) {
          const encoded = encodeURIComponent((sdata.imagePrompt || "").trim());
          imgSrc = `https://image.pollinations.ai/prompt/${encoded}`;
        }
        if (imgSrc) {
          const dataUrl = imgSrc.startsWith("data:") ? imgSrc : await fetchAsDataURL(imgSrc);
          if (dataUrl) {
            slide.addImage({
              data: dataUrl,
              x: imgX,
              y: imgY,
              w: imgW,
              h: imgH,
              sizing: { type: "contain", w: imgW, h: imgH },
            });
          }
        }
      }

      // ---- USER STICKERS ----
      const stickers = Array.isArray(sdata.stickers) ? sdata.stickers : [];
      if (stickers.length) {
        for (const g of stickers) {
          if (!g || !g.url) continue;
          let dataUrl = null;
          if (g.url.startsWith('data:')) {
            dataUrl = g.url;
          } else {
            dataUrl = await fetchAsDataURL(g.url);
          }
          if (!dataUrl) continue;
          if (dataUrl.startsWith('data:image/svg')) {
            dataUrl = await rasterizeSvgDataUrl(dataUrl);
          }
          const x = (g.x || 0) * 10.0;
          const y = (g.y || 0) * 5.625;
          const w = (g.width || 0.18) * 10.0;
          const h = (g.height || 0.18) * 5.625;
          const rotate = g.rotate || 0;
          slide.addImage({ data: dataUrl, x, y, w, h, sizing: { type: 'contain', w, h }, rotate });
        }
      }

      // Tables export removed as requested
    }

    await pptx.writeFile({ fileName });
  } catch (err) {
    console.error("Error generating PPTX:", err);
    alert("Failed to generate PPTX file. Check console for details.");
  }
};
