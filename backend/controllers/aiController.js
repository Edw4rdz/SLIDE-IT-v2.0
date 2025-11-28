import axios from "axios";
import { scanBuffer } from "../services/virusScanService.js";
// In-memory cache for image results (prompt -> base64)
const pollinationsImageCache = new Map();

// Helper: Clean prompt (first sentence, max 8 words)
function cleanPrompt(prompt) {
  if (!prompt) return "";
  // Take first sentence, then up to 8 words
  let firstSentence = prompt.split(/[.!?\n]/)[0];
  let words = firstSentence.trim().split(/\s+/).slice(0, 8);
  return words.join(" ").trim();
}

// Helper: Fetch image from Pollinations with retries
async function fetchPollinationsImage(prompt, retries = 2) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, { responseType: "arraybuffer", timeout: 12000 });
      if (response.status === 200 && response.data) {
        return Buffer.from(response.data, "binary").toString("base64");
      }
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(res => setTimeout(res, 800 * (attempt + 1)));
    }
  }
  throw new Error("Failed to fetch image from Pollinations");
}

// Controller: POST /api/generate-image
export const generatePollinationsImage = async (req, res) => {
  try {
    let { prompt } = req.body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ success: false, error: "Missing or invalid prompt" });
    }
    const cleanedPrompt = cleanPrompt(prompt);
    // Check cache
    if (pollinationsImageCache.has(cleanedPrompt)) {
      return res.json({ success: true, base64: pollinationsImageCache.get(cleanedPrompt), cached: true });
    }
    // Fetch from Pollinations
    const base64 = await fetchPollinationsImage(cleanedPrompt);
    // Cache result (limit cache size to 100)
    pollinationsImageCache.set(cleanedPrompt, base64);
    if (pollinationsImageCache.size > 100) {
      // Remove oldest entry
      const firstKey = pollinationsImageCache.keys().next().value;
      pollinationsImageCache.delete(firstKey);
    }
    res.json({ success: true, base64, cached: false });
  } catch (error) {
    console.error("[Pollinations] Image fetch error:", error.message);
    res.status(502).json({ success: false, error: "Failed to generate image", details: error.message });
  }
};
import { 
  convertPdfToSlides, 
  convertWordToSlides, 
  convertExcelToSlides,
  convertTextFileToSlides, 
  generateTopicsToSlides 
} from "../services/aiService.js";
import fs from "fs";
import { saveHistory } from "../services/historyService.js";
import { generatePptxFromData } from "../services/pptxService.js";
import { uploadToS3 } from "../services/s3Service.js";
import { saveConversion } from "../services/conversionService.js";

const getFileBuffer = (file) => {
  if (file.buffer) return file.buffer;
  if (file.path) return fs.readFileSync(file.path);
  throw new Error("File buffer not found. Check multer configuration.");
};

/**
 * Helper function to handle PPTX generation, S3 upload, and saving to both collections
 * @param {Array} slides - Generated slides data
 * @param {Object} params - Conversion parameters
 * @returns {Promise<Object>} - Upload results with URLs
 */
const handlePptxUploadAndSave = async (slides, params) => {
  const { userId, fileName, conversionType, includeImages, previewThumb } = params;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[UPLOAD FLOW] Starting for ${fileName}`);
  console.log(`[UPLOAD FLOW] User: ${userId}, Slides: ${slides.length}, Type: ${conversionType}`);
  console.log(`${'='.repeat(60)}\n`);
  
  // First, ALWAYS save to history collection (for backward compatibility and UI display)
  let historyId = null;
  try {
    if (userId) {
      console.log('[Step 1/4] Saving to history collection...');
      const historyRecord = await saveHistory({
        userId,
        fileName,
        conversionType,
        includeImages: includeImages || false,
        previewThumb: previewThumb || null,
        slides
      });
      historyId = historyRecord.id;
      console.log(`✅ [Step 1/4] History saved with ID: ${historyId}`);
    }
  } catch (historyError) {
    console.error('❌ [Step 1/4] History Save Failed:', historyError.message);
    // Continue even if history save fails
  }

  // Then try to generate PPTX, upload to S3, and save to conversions
  try {
    // 1. Generate PPTX file from slides
    console.log(`[Step 2/4] Starting PPTX generation for ${slides.length} slides...`);
    const pptxBuffer = await generatePptxFromData({
      slides,
      design: {
        globalBackground: '#ffffff',
        globalTitleColor: '#000000',
        globalTextColor: '#333333',
        font: 'Arial',
        layouts: {}
      },
      includeImages: includeImages || false
    });

    console.log(`✅ [Step 2/4] PPTX generated, size: ${pptxBuffer.length} bytes`);

    // 2. Upload to S3
    console.log('[Step 3/4] Uploading to S3...');
    const pptxFileName = `${fileName.replace(/\.[^/.]+$/, '')}.pptx`;
    const s3Result = await uploadToS3(
      pptxBuffer,
      pptxFileName,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      userId  // Pass userId to organize by user folder
    );

    console.log(`✅ [Step 3/4] S3 upload successful: ${s3Result.url}`);

    // 3. Save to 'conversions' collection
    if (userId) {
      console.log('[Step 4/4] Saving to conversions collection...');
      const conversionRecord = await saveConversion({
        userId,
        fileName: pptxFileName,
        originalFileName: fileName,
        conversionType,
        s3Url: s3Result.url,
        s3Key: s3Result.key,
        s3Bucket: s3Result.bucket,
        fileSize: pptxBuffer.length,
        slideCount: slides.length,
        includeImages: includeImages || false,
        previewThumb: previewThumb || null
      });

      console.log(`✅ [Step 4/4] Conversions saved with ID: ${conversionRecord.id}`);

      // 4. Update history record with S3 info
      if (historyId) {
        console.log(`[Info] History ${historyId} linked to S3: ${s3Result.key}`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[UPLOAD FLOW] ✅ COMPLETE SUCCESS`);
    console.log(`${'='.repeat(60)}\n`);

    return {
      s3Url: s3Result.url,
      s3Key: s3Result.key,
      fileSize: pptxBuffer.length,
      historyId
    };

  } catch (error) {
    console.error(`\n${'='.repeat(60)}`);
    console.error('[UPLOAD FLOW] ❌ PARTIAL FAILURE');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error(`${'='.repeat(60)}\n`);
    
    // Return error but include historyId so UI still works
    return {
      error: error.message,
      s3Url: null,
      s3Key: null,
      historyId
    };
  }
};

export const generateFromPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, data: [], error: "No PDF file uploaded." });
    }

    // Virus Scan
    try {
      await scanBuffer(req.file.buffer);
    } catch (error) {
      return res.status(400).json({ success: false, data: [], error: error.message });
    }

    const slideCount = req.body.slideCount || 10;
    const userId = req.body.userId || null;
    const includeImages = req.body.includeImages === 'true' || req.body.includeImages === true || false;
    const previewThumb = req.body.previewThumb || null;
    const buffer = getFileBuffer(req.file);

    console.log(`Processing PDF: ${req.file.originalname}`);
    let slides = [];
    try {
      slides = await convertPdfToSlides(buffer, slideCount);
    } catch (err) {
      console.error("PDF conversion error:", err);
      // Return empty array but still success false
      return res.status(200).json({ success: false, data: [], error: err.message });
    }

    // NEW: Upload PPTX to S3 and save to both collections
    let uploadResult = null;
    if (userId && slides.length > 0) {
      uploadResult = await handlePptxUploadAndSave(slides, {
        userId,
        fileName: req.file.originalname || 'PDF Presentation',
        conversionType: 'PDF-to-PPTs',
        includeImages,
        previewThumb
      });
      console.log(`[PDF] Upload result:`, uploadResult);
    }

    res.json({ 
      success: true, 
      data: Array.isArray(slides) ? slides : [], 
      error: null,
      s3Url: uploadResult?.s3Url || null,
      uploadError: uploadResult?.error || null
    });
  } catch (error) {
    console.error("Controller PDF Error:", error);
    res.status(500).json({ success: false, data: [], error: "Failed to generate slides from PDF.", details: error.message });
  }
};

export const generateFromWord = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No Word document uploaded." });
    }

    // Virus Scan
    try {
      await scanBuffer(req.file.buffer);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const slideCount = req.body.slideCount || 10;
    const userId = req.body.userId || null;
    const includeImages = req.body.includeImages === 'true' || req.body.includeImages === true || false;
    const previewThumb = req.body.previewThumb || null;
    const buffer = getFileBuffer(req.file);

    console.log(`Processing Word Doc: ${req.file.originalname}`);
    const slides = await convertWordToSlides(buffer, slideCount);
    console.log(`[WORD] Generated ${slides.length} slides, userId=${userId}`);

    // NEW: Upload PPTX to S3 and save to both collections
    let uploadResult = null;
    if (userId && slides.length > 0) {
      uploadResult = await handlePptxUploadAndSave(slides, {
        userId,
        fileName: req.file.originalname || 'Word Presentation',
        conversionType: 'DOCX/WORD-to-PPTs',
        includeImages,
        previewThumb
      });
      console.log(`[WORD] Upload result:`, uploadResult);
    }

    res.json({ 
      success: true, 
      data: slides,
      s3Url: uploadResult?.s3Url || null,
      uploadError: uploadResult?.error || null
    });
  } catch (error) {
    console.error("Controller Word Error:", error);
    res.status(500).json({ error: "Failed to generate slides from Word.", details: error.message });
  }
};

export const generateFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No Excel file uploaded." });
    }

    // Virus Scan
    try {
      await scanBuffer(req.file.buffer);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const slideCount = req.body.slideCount || 10;
    const userId = req.body.userId || null;
    const buffer = getFileBuffer(req.file);

    console.log(`Processing Excel: ${req.file.originalname}`);
    const slides = await convertExcelToSlides(buffer, slideCount);

    // NEW: Upload PPTX to S3 and save to both collections
    let uploadResult = null;
    if (userId && slides.length > 0) {
      uploadResult = await handlePptxUploadAndSave(slides, {
        userId,
        fileName: req.file.originalname || 'Excel Presentation',
        conversionType: 'Excel-to-PPTs',
        includeImages: false,
        previewThumb: null
      });
      console.log(`[EXCEL] Upload result:`, uploadResult);
    }

    res.json({ 
      success: true, 
      data: slides,
      s3Url: uploadResult?.s3Url || null,
      uploadError: uploadResult?.error || null
    });
  } catch (error) {
    console.error("Controller Excel Error:", error);
    res.status(500).json({ error: "Failed to generate slides from Excel.", details: error.message });
  }
};

export const generateFromTopic = async (req, res) => {
  try {
    const { topic, slideCount, userId, includeImages, previewThumb } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "No topic provided." });
    }

    console.log(`Processing Topic: "${topic}"`);
    const slides = await generateTopicsToSlides(topic, slideCount || 10);

    // NEW: Upload PPTX to S3 and save to both collections
    let uploadResult = null;
    if (userId && slides.length > 0) {
      uploadResult = await handlePptxUploadAndSave(slides, {
        userId,
        fileName: String(topic).slice(0, 80) || 'AI Topic Presentation',
        conversionType: 'AI-Generated PPTs',
        includeImages: !!includeImages,
        previewThumb: previewThumb || null
      });
      console.log(`[TOPIC] Upload result:`, uploadResult);
    }

    res.json({ 
      success: true, 
      data: slides,
      s3Url: uploadResult?.s3Url || null,
      uploadError: uploadResult?.error || null
    });
  } catch (error) {
    console.error("Controller Topic Error:", error);
    res.status(500).json({ error: "Failed to generate slides from topic.", details: error.message });
  }
};

export const generateFromTextFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No text file uploaded." });
    }

    // Virus Scan
    try {
      await scanBuffer(req.file.buffer);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const slideCount = req.body.slideCount || 10;
    const userId = req.body.userId || null;
    const includeImages = req.body.includeImages === 'true' || req.body.includeImages === true || false;
    const previewThumb = req.body.previewThumb || null;
    const buffer = getFileBuffer(req.file);

    console.log(`Processing Text File: ${req.file.originalname}`);
    const slides = await convertTextFileToSlides(buffer, slideCount);

    // NEW: Upload PPTX to S3 and save to both collections
    let uploadResult = null;
    if (userId && slides.length > 0) {
      uploadResult = await handlePptxUploadAndSave(slides, {
        userId,
        fileName: req.file.originalname || 'Text Presentation',
        conversionType: 'TxT-to-PPTs',
        includeImages,
        previewThumb
      });
      console.log(`[TEXT] Upload result:`, uploadResult);
    }

    res.json({ 
      success: true, 
      data: slides,
      s3Url: uploadResult?.s3Url || null,
      uploadError: uploadResult?.error || null
    });
  } catch (error) {
    console.error("Controller Text File Error:", error);
    res.status(500).json({ error: "Failed to generate slides from text file.", details: error.message });
  }
};

// Controller: POST /api/generate-pptx
export const generatePptx = async (req, res) => {
  try {
    const { slides, design, fileName, includeImages } = req.body;

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({ error: "Slides data is required and must be a non-empty array" });
    }

    console.log(`Generating PPTX for ${slides.length} slides...`);

    const pptxBuffer = await generatePptxFromData({
      slides,
      design,
      includeImages: includeImages || false
    });

    // Set headers for file download
    const pptxFileName = fileName || 'presentation.pptx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${pptxFileName}"`);

    // Send the buffer
    res.send(pptxBuffer);
  } catch (error) {
    console.error("PPTX Generation Error:", error);
    res.status(500).json({ error: "Failed to generate PPTX file", details: error.message });
  }
};