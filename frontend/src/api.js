// src/api.js
import axios from "axios";
import PptxGenJS from "pptxgenjs";
import { Buffer } from "buffer";

const API_BASE = "http://localhost:5000/api";

// ... (All other functions like registerUser, getTemplates, etc. are unchanged) ...
export const registerUser = (data) => axios.post(`${API_BASE}/register`, data);
export const loginUser = (data) => axios.post(`${API_BASE}/login`, data);
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


const generateImageFromPollinations = async (prompt, retries = 1) => {
  // ... (This function is unchanged) ...
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


// -----------------------------------------------------------------------------
// 🔹 MAIN DOWNLOAD FUNCTION (✅ UPDATED FOR "Text Only" option)
// -----------------------------------------------------------------------------

// ✅ --- LINE 1: Accept the new 'includeImages' flag ---
export const downloadPPTX = async (slides, design, fileName = "presentation.pptx", includeImages = true) => {
  if (!slides?.length) {
    alert("No slides to export.");
    return;
  }

  const safeDesign = design || {
     font: "Arial",
     globalBackground: "#ffffff",
     globalTitleColor: "#000000",
     globalTextColor: "#333333",
     layouts: { title: {}, content: {} }
  };
  
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; 

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    if (!s) continue; 

    const slide = pptx.addSlide();

    // --- 1. Determine Theme (Unchanged) ---
    const slideLayout = s.layout || 'content';
    const layoutStyles = safeDesign.layouts?.[slideLayout] || {};
    const theme = {
      background: layoutStyles.background || safeDesign.globalBackground || "#FFFFFF",
      titleColor: (layoutStyles.titleColor || safeDesign.globalTitleColor || "#000000"),
      textColor: (layoutStyles.textColor || safeDesign.globalTextColor || "#333333"),
      font: safeDesign.font || "Arial",
    };

    // --- 2. Apply Background (Unchanged) ---
    let backgroundOption = {};
    const fallbackBgColor = "#FFFFFF"; 
    if (Array.isArray(theme.background)) {
      if (theme.background.length > 1) {
        backgroundOption = {
          type: "gradient",
          colors: theme.background.map(c => c.replace("#", "")),
          angle: safeDesign.gradientAngle || 135 
        };
      } else if (theme.background.length === 1) {
        backgroundOption = { color: theme.background[0].replace("#", "") };
      } else {
        backgroundOption = { color: fallbackBgColor.replace("#", "") };
      }
    } 
    else if (typeof theme.background === "string" && theme.background.startsWith("#")) {
      backgroundOption = { color: theme.background.replace("#", "") };
    } 
    else {
      backgroundOption = { color: fallbackBgColor.replace("#", "") };
    }
    slide.background = backgroundOption;

    // --- 3. Add Title (Unchanged) ---
    slide.addText(String(s.title || "Untitled Slide"), {
      x: 0.5, y: 0.25, w: 9.0, h: 1.0, 
      align: "center", 
      fontFace: theme.font, 
      fontSize: 32, 
      bold: true, 
      color: theme.titleColor.replace("#", ""),
    });

    // --- 4. Get Image (✅ LOGIC UPDATED) ---
    let imageBase64 = null;
    if (s.uploadedImage) {
      // Priority 1: Use the user's uploaded image
      console.log(`Using uploaded image for slide ${i + 1}`);
      imageBase64 = s.uploadedImage;
      
    // ✅ --- LINE 2: Check for 'imagePrompt' AND the 'includeImages' flag ---
    } else if (s.imagePrompt && includeImages) {
      // Priority 2: Fetch the AI image (only if flag is true)
      console.log(`Fetching AI image for slide ${i + 1}: ${s.imagePrompt}`);
      try {
        imageBase64 = await generateImageFromPollinations(s.imagePrompt); 
      } catch (err) {
        console.error(`Failed to fetch image for slide ${i + 1}`, err);
      }
    }
    // (If 'includeImages' is false, this block is skipped)

    // --- 5. Add Content (Unchanged) ---
    const bulletStrings = Array.isArray(s.bullets) ? s.bullets.map(b => String(b || "")) : [];
    const bulletObjects = bulletStrings.map(str => ({ 
      text: str,
      options: { 
        fontFace: theme.font, 
        fontSize: 18, 
        color: theme.textColor.replace("#", ""),
      }
    }));
    
    // This layout logic is already perfect. 
    // If imageBase64 is null (because user chose "Text Only"), 
    // it will automatically use "LAYOUT 2: No Image".
    if (imageBase64) {
      // LAYOUT 1: Image exists
      if (bulletObjects.length > 0) {
        slide.addText(bulletObjects, {
          x: 0.5, y: 1.5, w: 4.5, h: 3.8, 
          align: "left", 
          bullet: { type: 'bullet', code: '2022' },
          lineSpacing: 30,
        });
      }
      slide.addImage({
        data: imageBase64,
        x: 5.5, y: 1.5, w: 4.0, h: 3.8, 
        sizing: { type: 'cover', w: 4.0, h: 3.8 }
      });
    } else {
      // LAYOUT 2: No Image
      if (bulletObjects.length > 0) {
        slide.addText(bulletObjects, {
          x: 1.0, y: 1.5, w: 8.0, h: 3.8,
          align: "left",
          bullet: { type: 'bullet', code: '2022' },
          lineSpacing: 30,
        });
      }
    }
  } // --- End slide loop ---

  // --- Generate File (Unchanged) ---
  try {
    await pptx.writeFile({ fileName });
    console.log(`✅ Presentation "${fileName}" generated.`);
  } catch (err) {
    console.error("❌ Error generating PPTX file:", err);
    alert(`Error saving presentation: ${err.message || "Unknown error"}`);
    throw err;
  }
};