import axios from "axios";
import PptxGenJS from "pptxgenjs";
import { Buffer } from "buffer";

const API_BASE = "http://localhost:5000/api";

// --- Auth APIs ---
export const registerUser = (data) => axios.post(`${API_BASE}/register`, data);
export const loginUser = (data) => axios.post(`${API_BASE}/login`, data);

// --- Conversion APIs ---
export const convertPDF = (data) => axios.post(`${API_BASE}/convert-pdf`, data);
export const convertWord = (data) => axios.post(`${API_BASE}/convert-word`, data);
export const convertText = (data) => axios.post(`${API_BASE}/convert-text`, data);
export const convertExcel = (data) => axios.post(`${API_BASE}/convert-excel`, data);

// --- AI Generator ---
export const generateSlides = (data) => axios.post(`${API_BASE}/generate-topics`, data);

// --- Template Upload & List APIs ---
export const uploadTemplate = (formData) =>
  axios.post(`${API_BASE}/upload-template`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getTemplates = () => axios.get(`${API_BASE}/templates/list`);

// --- History / Drafts APIs ---
export const getHistory = (userId) =>
  axios.get(`${API_BASE}/conversions`, { params: { userId } });

export const deleteHistory = (id, userId) =>
  axios.delete(`${API_BASE}/conversions/${id}`, { params: { userId } });

// -----------------------------------------------------------------------------
// 🔹 HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Fetches an image from Pollinations.ai with retries.
 */
const generateImageFromPollinations = async (prompt, retries = 1) => {
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") return null;
  const encodedPrompt = encodeURIComponent(prompt.trim());
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
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

/**
 * Ensures text color is readable against a background.
 */
const getReadableColor = (bgColor, light = "#FFFFFF", dark = "#000000") => {
  if (!bgColor) return dark;
  const c = bgColor.charAt(0) === "#" ? bgColor.substring(1) : bgColor;
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? dark : light;
};

// -----------------------------------------------------------------------------
// 🔹 SLIDE GENERATOR
// -----------------------------------------------------------------------------

const addSlideWithCustomStyle = async (pptx, slideData, design) => {
  const slideTitle = slideData.title || "Untitled Slide";
  const slideBullets = slideData.bullets || [];
  const imagePrompt = slideData.imagePrompt || slideTitle;

  const titleColor = design.titleColor || "#000000";
  const textColor = design.textColor || "#333333";
  const font = design.font || "Arial";
  const bgColor = design.background || "#FFFFFF";
  const bgImage = design.backgroundImage
    ?.replace(/url\(['"]?|['"]?\)/g, "")
    .trim();

  // Adjust text color if background is too similar
  const adjustedTextColor = getReadableColor(bgColor, "#FFFFFF", textColor);
  const adjustedTitleColor = getReadableColor(bgColor, "#FFFFFF", titleColor);

  const slide = pptx.addSlide();

  // --- Background ---
  if (bgImage && bgImage.startsWith("http")) {
  try {
    const bgResponse = await axios.get(bgImage, { responseType: "arraybuffer" });
    const bgBase64 = `data:image/png;base64,${Buffer.from(bgResponse.data, "binary").toString("base64")}`;
    slide.background = { data: bgBase64 };
  } catch {
    console.warn("⚠️ Background image failed, using color fallback.");
    slide.background = { color: bgColor };
  }
} else {
  slide.background = { color: bgColor };
}


  // --- Layout ---
 // 🎯 Improved slide layout with better spacing and balance
// 🎯 Modern side-by-side layout (text left, image right)
// --- Layout ---
const slideWidth = 13.33;
const margin = 0.6;
const spacing = 0.3; // extra gap between text & image

const titleY = 0.5;
const titleH = 1.0;
const textY = titleY + titleH + 0.3;
const textH = 4.0;

const textW = 5.3;
const imageW = 4.0;

// ✅ Corrected placement: image starts AFTER text + spacing + margin
const imageX = margin + textW + spacing;
const imageY = 1.5;
const imageH = 4.5;

// --- Title ---
slide.addText(slideTitle, {
  x: margin,
  y: titleY,
  w: 9.0,
  h: titleH,
  align: "center",
  valign: "middle",
  fontFace: "Arial Black",
  fontSize: 28,
  bold: true,
  color: adjustedTitleColor,
});

// --- Bullets / Content ---
if (slideBullets.length > 0) {
  slide.addText(
    slideBullets.map((b) => `• ${b}`).join("\n"),
    {
      x: margin,
      y: textY,
      w: textW,
      h: textH,
      fontFace: "Calibri",
      fontSize: 18,
      color: adjustedTextColor,
      align: "left",
      valign: "top",
      lineSpacingMultiple: 1.3,
    }
  );
}

// --- Image ---
const imageBase64Data = await generateImageFromPollinations(imagePrompt);

if (imageBase64Data && imageBase64Data.startsWith("data:image/")) {
  try {
    slide.addImage({
      data: imageBase64Data,
      x: imageX,
      y: imageY,
      w: imageW,
      h: imageH,
      sizing: { type: "contain" },
    });
  } catch (err) {
    console.warn(`⚠️ Failed to add image for slide "${slideTitle}":`, err);
    slide.addText("[Image failed to load]", {
      x: imageX,
      y: imageY + 1,
      w: imageW,
      h: 1,
      color: "#FF0000",
      align: "center",
      valign: "middle",
    });
  }
} else {
  slide.addText("(No image generated)", {
    x: imageX,
    y: imageY + 1,
    w: imageW,
    h: 1,
    color: adjustedTextColor,
    align: "center",
    valign: "middle",
  });
}

};

// -----------------------------------------------------------------------------
// 🔹 MAIN DOWNLOAD FUNCTION
// -----------------------------------------------------------------------------

export const downloadPPTX = async (slides, design, fileName = "presentation.pptx") => {
  if (!slides || slides.length === 0) {
    alert("No slides to download!");
    return;
  }

  alert("Generating PowerPoint... This may take a minute. Please wait.");

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  for (let i = 0; i < slides.length; i++) {
    await addSlideWithCustomStyle(pptx, slides[i], design);
  }

  try {
    await pptx.writeFile({ fileName });
    console.log(`✅ Successfully saved ${fileName}`);
  } catch (err) {
    console.error("❌ Error generating PPTX:", err);
    alert("Error generating PowerPoint. Check console for details.");
  }
};