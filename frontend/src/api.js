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
  const encodedPrompt = encodeURIComponent(prompt.trim());
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}`;
  console.log(`Attempting to fetch image from Pollinations: ${url}`);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 30000,
      });
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      const mimeType = response.headers['content-type'] || 'image/jpeg';
      console.log(`Successfully fetched image for prompt: "${prompt}"`);
      return `data:${mimeType};base64,${base64}`;
    } catch (err) {
      console.warn(`⚠️ Pollinations fetch failed (attempt ${attempt + 1}/${retries + 1}) for prompt "${prompt}":`, err.message);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        console.error(`Failed to fetch image from Pollinations after ${retries + 1} attempts for prompt: "${prompt}"`);
        return null;
      }
    }
  }
  return null;
};

/**
 * Helper function to add a single slide using the specific styling provided.
 * Marked as async because it fetches the image.
 * @param {PptxGenJS.Presentation} pptx - The PptxGenJS presentation object.
 * @param {object} slideData - Data including title, bullets, imagePrompt.
 */
const addSlideWithCustomStyle = async (pptx, slideData) => {
  const slideTitle = slideData.title || "Untitled Slide";
  const slideBullets = slideData.bullets || [];
  const imagePrompt = slideData.imagePrompt || slideTitle; // Fallback prompt

  const newSlide = pptx.addSlide();

  // --- STYLING FROM YOUR EXAMPLE SNIPPET ---
  const margin = 0.5; // inches
  const textWidth = 5.0; // inches
  const imageWidth = 4.5; // inches

  // Add Title
  newSlide.addText(slideTitle, {
    x: margin,
    y: margin,
    w: textWidth - margin, // Use calculated width
    fontSize: 28,
    bold: true,
    color: "203864", // Dark blue color
  });

  // Add Bullets
  if (slideBullets.length > 0) {
    // Your snippet uses '• ' prefix, pptxgenjs `bullet:true` might look different.
    // We'll use your snippet's approach for exact replication:
    const bulletText = slideBullets.map((b) => `• ${b || ''}`).join("\n"); // Ensure bullet prefix
    newSlide.addText(bulletText, {
      x: margin,
      y: 1.2, // Position below title
      w: textWidth - margin, // Use calculated width
      fontSize: 18,
      color: "333333", // Dark grey color
      lineSpacing: 28, // Line spacing in points
      // Removed bullet: true as we added the prefix manually
    });
  }

  // Fetch image data using the helper function
  const imageBase64Data = await generateImageFromPollinations(imagePrompt);

  // Add Image using base64 data if fetched successfully
  if (imageBase64Data) {
     try {
       // Use the coordinates and dimensions from your snippet
       newSlide.addImage({
         data: imageBase64Data, // Use the fetched base64 data URI
         x: textWidth + margin, // Position image to the right of text
         y: 0.0,               // Vertical position from your snippet
         w: imageWidth,        // Width from your snippet
         h: 3.0,               // Height from your snippet
         // sizing: { type: 'contain', w: imageWidth, h: 4.5 } // Optional: Add sizing if needed
       });
       console.log(`Added image to slide "${slideTitle}"`);
     } catch (imgErr) {
       console.warn(`⚠️ PptxGenJS failed to add image for slide "${slideTitle}":`, imgErr);
        // Add placeholder text on failure, positioned similarly to the image
        newSlide.addText('[Image load failed]', { x: textWidth + margin, y: 1.0, w: imageWidth, h: 4.5, color: 'FF0000', align: 'center', valign: 'middle'});
     }
  } else {
    console.warn(`Skipping image for slide "${slideTitle}" (fetch failed or no prompt).`);
    // Add placeholder text if no image generated
    newSlide.addText('[No image generated]', { x: textWidth + margin, y: 1.0, w: imageWidth, h: 4.5, color: '888888', align: 'center', valign: 'middle'});
  }
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

  console.log("Generating PPTX file with custom style and images:", slides);
  alert("Generating presentation with images... This may take a minute. Please wait.");

  const pptx = new PptxGenJS();

  // Process slides sequentially
  console.log("Starting slide generation process...");
  for (let i = 0; i < slides.length; i++) {
    console.log(`Processing slide ${i + 1}/${slides.length}...`);
    try {
      // Call the helper function that uses the specific styling
      await addSlideWithCustomStyle(pptx, slides[i]);
    } catch (slideError) {
        console.error(`Error processing slide ${i + 1}:`, slideError);
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