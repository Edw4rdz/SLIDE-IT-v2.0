import axios from "axios";
import PptxGenJS from "pptxgenjs";
// Ensure you have run: npm install buffer
import { Buffer } from 'buffer';

const API_BASE = "http://localhost:5000/api";

// --- Auth APIs ---
export const registerUser = (data) =>
  axios.post(`${API_BASE}/register`, data);

export const loginUser = (data) =>
  axios.post(`${API_BASE}/login`, data);

// --- Conversion APIs ---
export const convertPDF = (data) =>
  axios.post(`${API_BASE}/convert-pdf`, data);

export const convertWord = (data) =>
  axios.post(`${API_BASE}/convert-word`, data);

export const convertText = (data) =>
  axios.post(`${API_BASE}/convert-text`, data);

export const convertExcel = (data) =>
  axios.post(`${API_BASE}/convert-excel`, data);

// --- AI Generator ---
export const generateSlides = (data) => {
  return axios.post(`${API_BASE}/generate-topics`, data);
};

// --- Template Upload API ---
export const uploadTemplate = (formData) => {
  return axios.post(`${API_BASE}/upload-template`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// --- Template List API ---
export const getTemplates = () => {
  return axios.get(`${API_BASE}/templates/list`);
};

// --- History / Drafts APIs ---
export const getHistory = (userId) => {
  return axios.get(`${API_BASE}/conversions`, {
    params: { userId: userId },
  });
};

export const deleteHistory = (id, userId) => {
  return axios.delete(`${API_BASE}/conversions/${id}`, {
    params: { userId: userId },
  });
};


// --- PPTX Generation Logic with Pollinations Images ---

/**
 * Fetches an image from Pollinations.ai based on a prompt. Includes retries.
 * @param {string} prompt - The image description prompt.
 * @param {number} [retries=1] - Number of retry attempts.
 * @returns {Promise<string|null>} Base64 data URI or null if failed.
 */
const generateImageFromPollinations = async (prompt, retries = 1) => {
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === "") {
    console.warn("Invalid or empty image prompt provided for Pollinations.");
    return null;
  }
// --- Replace with this ---
if (!prompt || typeof prompt !== 'string' || prompt.trim() === "") {
    console.warn("Invalid or empty image prompt provided for Pollinations.");
    return null;
}
// Create the enhanced prompt first
const enhancedPrompt = `${prompt.trim()}, presentation graphic style, clear background`;
// Encode the enhanced prompt directly for the URL
const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}`;
console.log(`Attempting to fetch image from Pollinations: ${url}`);
// --- End replace ---

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 35000, // Slightly longer timeout
      });
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      const mimeType = response.headers['content-type'] || 'image/jpeg';
      console.log(`Successfully fetched image for prompt: "${prompt}"`);
      return `data:${mimeType};base64,${base64}`;
    } catch (err) {
      console.warn(`⚠️ Pollinations fetch failed (attempt ${attempt + 1}/${retries + 1}) for prompt "${prompt}":`, err.message);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 2500)); // Longer retry delay
      } else {
        console.error(`Failed to fetch image from Pollinations after ${retries + 1} attempts for prompt: "${prompt}"`);
        return null;
      }
    }
  }
  return null;
};

/**
 * Helper function to add a single slide using the target style (image_6ce583.jpg).
 * Marked as async because it fetches the image.
 * @param {PptxGenJS.Presentation} pptx - The PptxGenJS presentation object.
 * @param {object} slideData - Data including title, bullets, imagePrompt.
 */
const addSlideWithCustomStyle = async (pptx, slideData) => {
  const slideTitle = slideData.title || "Untitled Slide";
  const slideBullets = slideData.bullets || [];
  const imagePrompt = slideData.imagePrompt || slideTitle; // Fallback prompt

  const newSlide = pptx.addSlide(); // Create a new slide

  // --- STYLING based on image_6ce583.jpg ---
  // Assuming a 16x9 layout (10 inches wide x 5.625 inches high)

  // 1. Add Title (Centered, Top)
  newSlide.addText(slideTitle, {
    x: 0.5,           // Left margin
    y: 0.25,          // Position near top
    w: 9.0,           // Width (10 inches - 0.5 margin each side)
    h: 0.75,          // Height for title area
    align: 'center',    // Center align text
    fontSize: 32,
    bold: true,
    fontFace: 'Arial',  // Example font
    color: '365F91',    // Example dark blue/purple color (adjust hex code)
  });

  // Define column dimensions below title
  const contentY = 1.25; // Start content lower to avoid title overlap
  const contentHeight = 4.0; // Max height for content area below title (5.625 total height - 1.25 Y - ~0.375 bottom margin)
  const leftColX = 0.5;
  const leftColW = 4.3; // Approx 43% width
  const gap = 0.4;
  const rightColX = leftColX + leftColW + gap;
  const rightColW = 10.0 - rightColX - 0.5; // Remaining width minus right margin


  // 2. Add Bullets (Left Column, below title) - ADJUSTED y, h, and added bullet:true
  if (slideBullets.length > 0) {
    newSlide.addText(slideBullets.join('\n'), {
      x: leftColX,
      y: contentY,       // Start lower down
      w: leftColW,
      h: contentHeight,  // Use defined height
      fontSize: 16,      // Keep font size
      fontFace: 'Arial',
      color: '404040',     // Dark grey text
      bullet: true,      // <-- ADD THIS FOR BULLET POINTS
      lineSpacing: 28,     // Keep line spacing
      valign: 'top'
    });
  }

  // 3. Fetch image data using the helper function
  const imageBase64Data = await generateImageFromPollinations(imagePrompt);

  // 4. Add Image (Right Column, below title) - ADJUSTED y, h to match bullets
  if (imageBase64Data) {
     try {
       newSlide.addImage({
         data: imageBase64Data,
         x: rightColX,
         y: contentY,       // Align vertically with bullets
         w: rightColW,
         h: contentHeight,  // Use same height as bullets column
         sizing: { type: 'contain', w: rightColW, h: contentHeight } // Fit image within the bounds clearly
       });
       console.log(`Added image to slide "${slideTitle}"`);
     } catch (imgErr) {
       console.warn(`⚠️ PptxGenJS failed to add image for slide "${slideTitle}":`, imgErr);
        // Add placeholder text on failure, positioned similarly
        newSlide.addText('[Image load failed]', { x: rightColX, y: contentY, w: rightColW, h: contentHeight, color: 'FF0000', align: 'center', valign: 'middle'});
     }
  } else {
    console.warn(`Skipping image for slide "${slideTitle}" (fetch failed or no prompt).`);
    // Add placeholder text if no image generated
    newSlide.addText('[No image generated]', { x: rightColX, y: contentY, w: rightColW, h: contentHeight, color: '888888', align: 'center', valign: 'middle'});
  }
  // --- END NEW STYLING INTEGRATION ---
};

/**
 * Main async function to generate and download the PPTX file.
 * Applies the specific styling requested.
 */
export const downloadPPTX = async (slides, fileName = "presentation.pptx") => {
  if (!slides || !Array.isArray(slides) || slides.length === 0) {
      console.error("Invalid or empty slides data provided for PPTX generation.");
      alert("Cannot generate presentation: No slide data available.");
      return;
  }

  console.log("Generating PPTX file with new style and images:", slides);
  alert("Generating presentation with images... This may take a minute. Please wait.");

  const pptx = new PptxGenJS();
  // Set layout to 16x9 for predictable coordinates (inches: 10 x 5.625)
  pptx.layout = 'LAYOUT_16x9';

  // Process slides sequentially
  console.log("Starting slide generation process...");
  for (let i = 0; i < slides.length; i++) {
    const slideNumber = i + 1; // Slide number starts from 1
    console.log(`Processing slide ${slideNumber}/${slides.length}...`);
    try {
      // Call the helper function that uses the specific styling
      await addSlideWithCustomStyle(pptx, slides[i]);
    } catch (slideError) {
        console.error(`Error processing slide ${slideNumber}:`, slideError);
    }
  }

  // Save and trigger download
  console.log("All slides processed. Writing PPTX file...");
  try {
    await pptx.writeFile({ fileName: fileName });
    console.log(`Successfully generated and triggered download for ${fileName}`);
  } catch (err) {
    console.error("Error generating PPTX file:", err);
    alert("An error occurred while generating the PowerPoint file. Check the console for details.");
  }
};