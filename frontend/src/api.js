
import axios from "axios";
import PptxGenJS from "pptxgenjs";
import { Buffer } from "buffer";

const API_BASE = "http://localhost:5000/api";


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

    
    const slideLayout = s.layout || 'content';
    const layoutStyles = safeDesign.layouts?.[slideLayout] || {};
    const theme = {
      background: layoutStyles.background || safeDesign.globalBackground || "#FFFFFF",
      titleColor: (layoutStyles.titleColor || safeDesign.globalTitleColor || "#000000"),
      textColor: (layoutStyles.textColor || safeDesign.globalTextColor || "#333333"),
      font: safeDesign.font || "Arial",
    };

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


    slide.addText(String(s.title || "Untitled Slide"), {
      x: 0.5, y: 0.25, w: 9.0, h: 1.0, 
      align: "center", 
      fontFace: theme.font, 
      fontSize: 32, 
      bold: true, 
      color: theme.titleColor.replace("#", ""),
    });

   
    let imageBase64 = null;
    if (s.uploadedImage) {
      console.log(`Using uploaded image for slide ${i + 1}`);
      imageBase64 = s.uploadedImage;
      

    } else if (s.imagePrompt && includeImages) {
   
      console.log(`Fetching AI image for slide ${i + 1}: ${s.imagePrompt}`);
      try {
        imageBase64 = await generateImageFromPollinations(s.imagePrompt); 
      } catch (err) {
        console.error(`Failed to fetch image for slide ${i + 1}`, err);
      }
    }
    const bulletStrings = Array.isArray(s.bullets) ? s.bullets.map(b => String(b || "")) : [];
    const bulletObjects = bulletStrings.map(str => ({ 
      text: str,
      options: { 
        fontFace: theme.font, 
        fontSize: 18, 
        color: theme.textColor.replace("#", ""),
      }
    }));
    

    if (imageBase64) {
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

      if (bulletObjects.length > 0) {
        slide.addText(bulletObjects, {
          x: 1.0, y: 1.5, w: 8.0, h: 3.8,
          align: "left",
          bullet: { type: 'bullet', code: '2022' },
          lineSpacing: 30,
        });
      }
    }
  } 

  try {
    await pptx.writeFile({ fileName });
    console.log(`✅ Presentation "${fileName}" generated.`);
  } catch (err) {
    console.error("❌ Error generating PPTX file:", err);
    alert(`Error saving presentation: ${err.message || "Unknown error"}`);
    throw err;
  }
};