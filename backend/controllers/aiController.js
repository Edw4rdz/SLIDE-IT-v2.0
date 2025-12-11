// Controller: POST /api/generate-imagen-image
export const generateImagenImageAPI = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'Missing or invalid prompt' });
    }
    // Dynamically import the Imagen generator
    const { generateImagenImage } = await import('../services/pptxService.js');
    const imageDataUrl = await generateImagenImage(prompt);
    if (imageDataUrl) {
      // Remove the data URL prefix for consistency with other endpoints
      const base64 = imageDataUrl.replace(/^data:image\/png;base64,/, '');
      return res.json({ success: true, base64 });
    } else {
      return res.status(502).json({ success: false, error: 'No image returned from Imagen' });
    }
  } catch (error) {
    console.error('[Imagen API] Generation failed:', error.message);
    res.status(502).json({ success: false, error: 'Failed to generate Imagen image', details: error.message });
  }
};
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

// Controller: POST /api/generate-grok-image
export const generateGrokImageAPI = async (req, res) => {
  try {
    let { prompt } = req.body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ success: false, error: "Missing or invalid prompt" });
    }
    
    // Import Grok configuration
    const { grokClient, GROK_IMAGE_MODEL } = await import("../config/grokConfig.js");
    
    console.log(`[Grok Image API] Generating image for prompt: "${prompt}"`);
    
    // Call Grok API to generate image
    const response = await grokClient.images.generate({
      model: GROK_IMAGE_MODEL,
      prompt: prompt,
      n: 1,
      response_format: "b64_json"
    });
    
    if (response.data && response.data.length > 0) {
      const image = response.data[0];
      if (image.b64_json) {
        return res.json({ success: true, base64: image.b64_json, cached: false });
      } else if (image.url) {
        // If URL is returned, fetch it and convert to base64
        const axios = (await import("axios")).default;
        const imgResponse = await axios.get(image.url, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(imgResponse.data, 'binary').toString('base64');
        return res.json({ success: true, base64, cached: false });
      }
    }
    
    throw new Error("No image data returned from Grok API");
  } catch (error) {
    console.error("[Grok Image API] Generation failed:", error.message);
    if (error.response) {
      console.error("[Grok Image API] Error Data:", error.response.data);
    }
    res.status(502).json({ success: false, error: "Failed to generate Grok image", details: error.message });
  }
};

import { 
  convertPdfToSlides, 
  convertWordToSlides, 
  convertExcelToSlides,
  convertTextFileToSlides, 
  generateTopicsToSlides,
  parseAIResponse
} from "../services/aiService.js";
import { parseExcelAndSuggestCharts } from '../services/excelChartSuggestService.js';
import fs from "fs";
import { saveHistory } from "../services/historyService.js";
import { generatePptxFromData } from "../services/pptxService.js";
import { uploadToS3 } from "../services/s3Service.js";
import { saveConversion, saveAIGeneratedConversion } from "../services/conversionService.js";

const getFileBuffer = (file) => {
  if (file.buffer) return file.buffer;
  if (file.path) return fs.readFileSync(file.path);
  throw new Error("File buffer not found. Check multer configuration.");
};

// --- Helpers: enforce exact slide count ---
const coerceSlideCount = (val, fallback = 10) => {
  const n = parseInt(val, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, 1), 50); // clamp 1..50
};

const buildPlaceholderSlide = (index) => ({
  title: `Slide ${index}`,
  layout: 'content',
  contentStyle: 'bullets',
  bullets: [
    'Add your key point here',
    'Add supporting detail here'
  ],
  text: '',
  imagePrompt: ''
});

const enforceSlideCount = (slides, count) => {
  const arr = Array.isArray(slides) ? slides.filter(Boolean) : [];
  if (arr.length === count) return arr;
  if (arr.length > count) {
    console.log(`[AI Normalize] Trimming slides ${arr.length} -> ${count}`);
    return arr.slice(0, count);
  }
  // pad with placeholders
  const padded = [...arr];
  for (let i = arr.length + 1; i <= count; i++) {
    padded.push(buildPlaceholderSlide(i));
  }
  console.log(`[AI Normalize] Padding slides ${arr.length} -> ${count}`);
  return padded;
};

/**
 * Helper function to handle PPTX generation, S3 upload, and saving to both collections
 * @param {Array} slides - Generated slides data
 * @param {Object} params - Conversion parameters
 * @returns {Promise<Object>} - Upload results with URLs
 */
const handlePptxUploadAndSave = async (slides, params) => {
  const {
    userId,
    fileName,
    conversionType,
    includeImages,
    previewThumb,
    imageProvider,
    // Optional: chart info for first slide
    chartData,
    chartType,
    chartSummary,
  } = params;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[UPLOAD FLOW] Starting for ${fileName}`);
  console.log(`[UPLOAD FLOW] User: ${userId}, Slides: ${slides.length}, Type: ${conversionType}, ImageProvider: ${imageProvider}`);
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
        slides,
        imageProviderRequested: imageProvider || null
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
    const pptxResult = await generatePptxFromData({
      slides,
      design: {
        globalBackground: '#ffffff',
        globalTitleColor: '#000000',
        globalTextColor: '#333333',
        font: 'Arial',
        layouts: {}
      },
      includeImages: includeImages || false,
      imageProvider: imageProvider,
      // Pass through chart info so pptxService can build a first chart slide
      chartData,
      chartType,
      chartSummary,
    });

    const pptxBuffer = pptxResult.buffer;
    const imageProviderFinal = pptxResult.imageProviderFinal || imageProvider || null;
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

    // 3. Save to appropriate conversions collection
    if (userId) {
      console.log('[Step 4/4] Saving to conversions collection...');
      
      // Determine if this is AI-generated content
      const isAIGenerated = conversionType === 'AI-Generated PPTs';
      
      // Use appropriate save function based on conversion type
      const saveFn = isAIGenerated ? saveAIGeneratedConversion : saveConversion;
      const collectionName = isAIGenerated ? 'AI-generated' : 'userconversions';
      
      const conversionRecord = await saveFn({
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
        previewThumb: previewThumb || null,
        imageProviderRequested: imageProvider || null,
        imageProviderFinal: imageProviderFinal || null
      });

      console.log(`✅ [Step 4/4] Saved to ${collectionName} with ID: ${conversionRecord.id}`);

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
      historyId,
      imageProviderFinal
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

    const slideCount = coerceSlideCount(req.body.slideCount, 10);
    const userId = req.body.userId || null;
    const includeImages = req.body.includeImages === 'true' || req.body.includeImages === true || false;
    const previewThumb = req.body.previewThumb || null;
    const provider = req.body.provider || 'grockai';
    const imageProvider = req.body.imageProvider || 'pollinations';
    const buffer = getFileBuffer(req.file);

    console.log(`Processing PDF: ${req.file.originalname} (Provider: ${provider})`);
    let slides = [];
    try {
      if (provider === 'gemini') {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
          throw new Error('Gemini API key not set in environment.');
        }
        // Extract text from PDF
        const data = await (await import('pdf-parse')).default(buffer);
        const text = data.text;
        const truncatedText = text.length > 100000 ? text.substring(0, 100000) + "..." : text;
        const geminiPrompt = `Create a presentation with EXACTLY ${slideCount} slides based on the PDF text below.\nFor each slide, provide a JSON object with:\n- title: catchy title\n- bullets: 3-5 concise bullet points\n- imagePrompt: a detailed image description\nReturn a JSON array.\nPDF TEXT: ${truncatedText}`;
        const geminiRes = await (await import('axios')).default.post(
          'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
          {
            contents: [{ parts: [{ text: geminiPrompt }] }]
          },
          {
            params: { key: geminiApiKey },
            headers: { 'Content-Type': 'application/json' }
          }
        );
        const geminiText = geminiRes?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        slides = enforceSlideCount(parseAIResponse(geminiText), slideCount);
      } else {
        slides = enforceSlideCount(await convertPdfToSlides(buffer, slideCount), slideCount);
      }
    } catch (err) {
      console.error("PDF conversion error:", err);
      return res.status(200).json({ success: false, data: [], error: err.message });
    }

    let uploadResult = null;
    if (userId && slides.length > 0) {
      uploadResult = await handlePptxUploadAndSave(slides, {
        userId,
        fileName: req.file.originalname || 'PDF Presentation',
        conversionType: 'PDF-to-PPTs',
        includeImages,
        previewThumb,
        imageProvider
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

    const slideCount = coerceSlideCount(req.body.slideCount, 10);
    const userId = req.body.userId || null;
    const includeImages = req.body.includeImages === 'true' || req.body.includeImages === true || false;
    const previewThumb = req.body.previewThumb || null;
    const provider = req.body.provider || 'grockai';
    const imageProvider = req.body.imageProvider || 'pollinations';
    const buffer = getFileBuffer(req.file);

    console.log(`Processing Word Doc: ${req.file.originalname} (Provider: ${provider})`);
    let slides = [];
    try {
      if (provider === 'gemini') {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
          throw new Error('Gemini API key not set in environment.');
        }
        // Extract text from Word
        const mammoth = (await import('mammoth')).default;
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value;
        const truncatedText = text.length > 100000 ? text.substring(0, 100000) + "..." : text;
        const geminiPrompt = `Create a presentation with EXACTLY ${slideCount} slides based on the Word document text below.\nFor each slide, provide a JSON object with:\n- title: catchy title\n- bullets: 3-5 concise bullet points\n- imagePrompt: a detailed image description\nReturn a JSON array.\nWORD TEXT: ${truncatedText}`;
        const geminiRes = await (await import('axios')).default.post(
          'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
          {
            contents: [{ parts: [{ text: geminiPrompt }] }]
          },
          {
            params: { key: geminiApiKey },
            headers: { 'Content-Type': 'application/json' }
          }
        );
        const geminiText = geminiRes?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        slides = enforceSlideCount(parseAIResponse(geminiText), slideCount);
      } else {
        slides = enforceSlideCount(await convertWordToSlides(buffer, slideCount), slideCount);
      }
    } catch (err) {
      console.error("Word conversion error:", err);
      return res.status(200).json({ success: false, data: [], error: err.message });
    }

    let uploadResult = null;
    if (userId && slides.length > 0) {
      uploadResult = await handlePptxUploadAndSave(slides, {
        userId,
        fileName: req.file.originalname || 'Word Presentation',
        conversionType: 'DOCX/WORD-to-PPTs',
        includeImages,
        previewThumb,
        imageProvider
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

    const slideCount = coerceSlideCount(req.body.slideCount, 10);
    const userId = req.body.userId || null;
    const provider = req.body.provider || 'grockai';
    const imageProvider = req.body.imageProvider || 'pollinations';

    // Optional chart data coming from frontend (for first slide) - allow reassignment
    let chartType = req.body.chartType || null;
    let chartSummary = req.body.chartSummary || null;
    let chartData = null;
    if (req.body.chartData) {
      try {
        chartData = JSON.parse(req.body.chartData);
      } catch (e) {
        console.warn('Failed to parse chartData from Excel request:', e.message);
      }
    }
    const buffer = getFileBuffer(req.file);

    console.log(`Processing Excel: ${req.file.originalname} (Provider: ${provider})`);
    let slides = [];
    try {
      if (provider === 'gemini') {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
          throw new Error('Gemini API key not set in environment.');
        }
        // Extract text from Excel
        const XLSX = (await import('xlsx')).default;
        const workbook = XLSX.read(buffer, { type: "buffer" });
        let excelData = "";
        workbook.SheetNames.forEach(sheet => {
          const data = XLSX.utils.sheet_to_csv(workbook.Sheets[sheet]);
          excelData += `\n--- Sheet: ${sheet} ---\n${data}`;
        });
        const truncatedText = excelData.length > 100000 ? excelData.substring(0, 100000) + "..." : excelData;
        const geminiPrompt = `Create a presentation with EXACTLY ${slideCount} slides based on the Excel data below.\nFor each slide, provide a JSON object with:\n- title: catchy title\n- bullets: 3-5 concise bullet points\n- imagePrompt: a detailed image description\nReturn a JSON array.\nEXCEL DATA: ${truncatedText}`;
        const geminiRes = await (await import('axios')).default.post(
          'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
          {
            contents: [{ parts: [{ text: geminiPrompt }] }]
          },
          {
            params: { key: geminiApiKey },
            headers: { 'Content-Type': 'application/json' }
          }
        );
        const geminiText = geminiRes?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        slides = enforceSlideCount(parseAIResponse(geminiText), slideCount);
      } else {
        slides = enforceSlideCount(await convertExcelToSlides(buffer, slideCount), slideCount);
      }
    } catch (err) {
      console.error("Excel conversion error:", err);
      return res.status(200).json({ success: false, data: [], error: err.message });
    }

    let uploadResult = null;
    // If chartData not provided, try to auto-suggest a chart (first sheet) using the Excel suggestion helper
    try {
      if (!chartData) {
        const suggestions = parseExcelAndSuggestCharts(buffer || req.file.path);
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          const first = suggestions.find(s => Array.isArray(s.data) && s.data.length >= 2) || suggestions[0];
          if (first && first.data && first.data.length > 0) {
            // Infer chartType/data (reduced to label/value keys)
            const labelKey = first.suggestedLabelKey || Object.keys(first.data[0] || {})[0];
            const valueKeys = first.suggestedValueKeys && first.suggestedValueKeys.length ? first.suggestedValueKeys : (first.suggestedValueKey ? [first.suggestedValueKey] : (Object.keys(first.data[0] || {}).slice(1) || []));
            chartData = first.data.map(row => {
              const r = { [labelKey]: row[labelKey] };
              for (const vk of valueKeys) r[vk] = row[vk];
              return r;
            });
            chartType = chartType || first.chartType;
            // Auto-summary if missing
            if (!chartSummary) {
              const keys = Object.keys(first.data[0] || {});
              const labelKey = keys[0];
              const valueKey = (valueKeys && valueKeys.length ? valueKeys[0] : keys[1] || keys[0]);
              if (keys.length >= 2 && valueKey) {
                const firstLabel = first.data[0][labelKey];
                const lastLabel = first.data[first.data.length - 1][labelKey];
                const firstValue = first.data[0][valueKey];
                const lastValue = first.data[first.data.length - 1][valueKey];
                chartSummary = `From ${firstLabel} to ${lastLabel}, ${valueKey} changed from ${firstValue} to ${lastValue}.`;
              }
            }
          }
        }
      }
    } catch (suggestErr) {
      console.warn('Failed to auto-suggest chart from Excel:', suggestErr?.message || suggestErr);
    }

    if (userId && slides.length > 0) {
      const includeImages = req.body.includeImages === 'true' || req.body.includeImages === true;
      uploadResult = await handlePptxUploadAndSave(slides, {
        userId,
        fileName: req.file.originalname || 'Excel Presentation',
        conversionType: 'Excel-to-PPTs',
        includeImages,
        previewThumb: null,
        imageProvider,
        // forward chart info so PPTX generator can build a first chart slide
        chartData,
        chartType,
        chartSummary,
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
    const { topic, userId, includeImages, previewThumb, provider, imageProvider } = req.body;
    const slideCount = coerceSlideCount(req.body.slideCount, 10);

    if (!topic) {
      return res.status(400).json({ error: "No topic provided." });
    }

    console.log(`Processing Topic: "${topic}" (Provider: ${provider || 'grok'})`);
    let slides = [];
    
    if (provider === 'gemini') {
      // Use Gemini API
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        return res.status(500).json({ error: 'Gemini API key not configured. Please contact administrator.' });
      }
      const geminiPrompt = `Create a presentation with EXACTLY ${slideCount} slides based on the topic below.\nFor each slide, provide a JSON object with:\n- title: catchy title\n- bullets: 3-5 concise bullet points\n- imagePrompt: a detailed image description\nReturn a JSON array.\nTOPIC: ${topic}`;
      const geminiRes = await axios.post(
        'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
        {
          contents: [{ parts: [{ text: geminiPrompt }] }]
        },
        {
          params: { key: geminiApiKey },
          headers: { 'Content-Type': 'application/json' }
        }
      );
      // Gemini returns text in geminiRes.data.candidates[0].content.parts[0].text
      const geminiText = geminiRes?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      slides = enforceSlideCount(parseAIResponse(geminiText), slideCount);
    } else if (provider === 'openai') {
      // OpenAI provider not yet implemented
      return res.status(501).json({ 
        error: 'OpenAI provider is not currently available. Please use Gemini or Grok (default) provider.',
        availableProviders: ['gemini', 'grok']
      });
    } else {
      // Default: Use Grok
      try {
        slides = enforceSlideCount(await generateTopicsToSlides(topic, slideCount), slideCount);
      } catch (grokError) {
        // Check if it's a rate limit error
        if (grokError.message && grokError.message.includes('429')) {
          return res.status(429).json({ 
            error: 'Grok API rate limit reached. Your API credits may be exhausted. Please try using Gemini provider or contact administrator.',
            details: 'Rate limit exceeded',
            availableProviders: ['gemini']
          });
        }
        throw grokError; // Re-throw if it's not a rate limit error
      }
    }

    // NEW: Upload PPTX to S3 and save to both collections
    let uploadResult = null;
    if (userId && slides.length > 0) {
      uploadResult = await handlePptxUploadAndSave(slides, {
        userId,
        fileName: String(topic).slice(0, 80) || 'AI Topic Presentation',
        conversionType: 'AI-Generated PPTs',
        includeImages: !!includeImages,
        previewThumb: previewThumb || null,
        imageProvider: imageProvider
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

    const slideCount = coerceSlideCount(req.body.slideCount, 10);
    const userId = req.body.userId || null;
    const includeImages = req.body.includeImages === 'true' || req.body.includeImages === true || false;
    const previewThumb = req.body.previewThumb || null;
    const provider = req.body.provider || 'grockai';
    const imageProvider = req.body.imageProvider || 'pollinations';
    const buffer = getFileBuffer(req.file);

    console.log(`Processing Text File: ${req.file.originalname} (Provider: ${provider})`);
    let slides = [];
    try {
      if (provider === 'gemini') {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
          throw new Error('Gemini API key not set in environment.');
        }
        const text = buffer.toString("utf-8");
        const truncatedText = text.length > 100000 ? text.substring(0, 100000) + "..." : text;
        const geminiPrompt = `Create a presentation with EXACTLY ${slideCount} slides based on the text file below.\nFor each slide, provide a JSON object with:\n- title: catchy title\n- bullets: 3-5 concise bullet points\n- imagePrompt: a detailed image description\nReturn a JSON array.\nTEXT FILE: ${truncatedText}`;
        const geminiRes = await (await import('axios')).default.post(
          'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
          {
            contents: [{ parts: [{ text: geminiPrompt }] }]
          },
          {
            params: { key: geminiApiKey },
            headers: { 'Content-Type': 'application/json' }
          }
        );
        const geminiText = geminiRes?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        slides = enforceSlideCount(parseAIResponse(geminiText), slideCount);
      } else {
        slides = enforceSlideCount(await convertTextFileToSlides(buffer, slideCount), slideCount);
      }
    } catch (err) {
      console.error("Text file conversion error:", err);
      return res.status(200).json({ success: false, data: [], error: err.message });
    }

    let uploadResult = null;
    if (userId && slides.length > 0) {
      uploadResult = await handlePptxUploadAndSave(slides, {
        userId,
        fileName: req.file.originalname || 'Text Presentation',
        conversionType: 'TxT-to-PPTs',
        includeImages,
        previewThumb,
        imageProvider
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
    const { slides, design, fileName, includeImages, imageProvider } = req.body;

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({ error: "Slides data is required and must be a non-empty array" });
    }

    console.log(`Generating PPTX for ${slides.length} slides with imageProvider: ${imageProvider || 'pollinations'}...`);

    const pptxResult = await generatePptxFromData({
      slides,
      design,
      includeImages: includeImages || false,
      imageProvider: imageProvider || 'pollinations'
    });

    const pptxBuffer = pptxResult.buffer || pptxResult;

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