// Controller: generate-imagen-image
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
// In-memory cache for image results
const pollinationsImageCache = new Map();

// Helper: Clean prompt
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

// Controller: generate-image-POLLINATIONS
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
    // Cache result
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
  generateTopicsToSlides,
  parseAIResponse
} from "../services/aiService.js";
import { parseExcelAndSuggestCharts } from '../services/excelChartSuggestService.js';
import fs from "fs";
import { saveHistory, createHistoryDraft, updateHistory } from "../services/historyService.js";
import { generatePptxFromData } from "../services/pptxService.js";
import { uploadToS3, getSignedUrl } from "../services/s3Service.js";
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
  return Math.min(Math.max(n, 1), 50);
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
/**
 * Helper function to handle PPTX generation, S3 upload, and saving to both collections
 */
const handlePptxUploadAndSave = async (slides, params) => {
  const {
    userId,
    fileName,
    conversionType,
    includeImages,
    previewThumb,
    imageProvider,
    chartData,
    chartType,
    chartSummary,
  } = params;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[UPLOAD FLOW] Starting for ${fileName}`);
  
  try {
    // Create a history draft so frontend can poll progress/status
    let historyId = null;
    if (userId) {
      try {
        const draft = await createHistoryDraft({
          userId,
          fileName: fileName,
          conversionType,
          includeImages: includeImages || false,
          progress: 0,
          status: 'In Progress',
          slides: []
        });
        historyId = draft.id;
      } catch (draftErr) {
        console.warn('[History] Failed to create draft history:', draftErr.message || draftErr);
      }
    }

    // 1. Generate PPTX and capture generated images
    console.log(`[Step 1/4] Generating PPTX and creating images...`);
    if (historyId) await updateHistory(historyId, { progress: 10 });
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
      chartData,
      chartType,
      chartSummary,
    });

    const pptxBuffer = pptxResult.buffer;
    const generatedImages = pptxResult.generatedImages || {};
    const imageProviderFinal = pptxResult.imageProviderFinal || imageProvider;
    if (historyId) await updateHistory(historyId, { progress: 40 });
    // 2. Upload Generated Images to S3
    // This permanently saves the Imagen images so they appear in drafts
    if (includeImages && Object.keys(generatedImages).length > 0) {
        console.log(`[Step 2/4] Uploading ${Object.keys(generatedImages).length} AI images to S3...`);
        
        await Promise.all(Object.entries(generatedImages).map(async ([indexStr, base64Data]) => {
            try {
                const index = parseInt(indexStr);
                if (!slides[index]) return;

                // Prepare buffer
                const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
                const imgBuffer = Buffer.from(base64Content, 'base64');
                const imgFileName = `slide_img_${Date.now()}_${index}_${Math.random().toString(36).substr(7)}.png`;
                
                // Upload
                const s3ImgResult = await uploadToS3(imgBuffer, imgFileName, 'image/png', userId);

                // Try to generate a presigned URL for frontend preview
                let signedUrl = null;
                try {
                  signedUrl = await getSignedUrl(s3ImgResult.key, 3600);
                } catch (signErr) {
                  console.warn('[S3] Failed to generate signed URL, falling back to public URL:', signErr?.message || signErr);
                  signedUrl = s3ImgResult.url;
                }

                // UPDATE SLIDE WITH SIGNED URL 
                slides[index].uploadedImage = signedUrl;
                // store the underlying S3 key so long-term retrieval can use signed URLs later
                slides[index].uploadedImageKey = s3ImgResult.key;
                
                
                        console.log(`   > Slide ${index} image saved: ${s3ImgResult.url}`);
            } catch (err) {
                console.error(`   > Failed to save image for slide ${indexStr}:`, err.message);
            }
        }));
    }
            if (historyId) await updateHistory(historyId, { progress: 60 });

            // 3. Upload PPTX to S3
            console.log('[Step 3/4] Uploading PPTX to S3...');
    const pptxFileName = `${fileName.replace(/\.[^/.]+$/, '')}.pptx`;
    const s3Result = await uploadToS3(
      pptxBuffer,
      pptxFileName,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      userId
    );
            if (historyId) await updateHistory(historyId, { progress: 85 });

            // 4. Save to History and Conversions
            // Save AFTER the images are uploaded and slides are updated
    if (userId) {
      console.log('[Step 4/4] Saving to Database...');
      
      try {
        // Finalize history: update existing draft if it exists, otherwise create
        const historyPayload = {
          id: historyId || undefined,
          userId,
          fileName,
          conversionType,
          includeImages: includeImages || false,
          previewThumb: previewThumb || null,
          slides: slides,
          imageProviderRequested: imageProvider || null
        };
        const historyRecord = await saveHistory(historyPayload);
        historyId = historyRecord.id;
        console.log(`✅ History saved. ID: ${historyId}`);
      } catch (e) {
        console.error("History save failed:", e.message);
      }

      // Save to Conversions
      const isAIGenerated = conversionType === 'AI-Generated PPTs';
      const saveFn = isAIGenerated ? saveAIGeneratedConversion : saveConversion;
      
      await saveFn({
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
    }

    console.log(`[UPLOAD FLOW] ✅ SUCCESS`);
    
    return {
      s3Url: s3Result.url,
      s3Key: s3Result.key,
      fileSize: pptxBuffer.length,
      historyId,
      imageProviderFinal
    };

  } catch (error) {
    console.error(`[UPLOAD FLOW] ❌ ERROR:`, error.message);
    return { error: error.message, s3Url: null, historyId: null };
  }
};
export const generateFromPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, data: [], error: "No PDF file uploaded." });
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
      uploadError: uploadResult?.error || null,
      historyId: uploadResult?.historyId || null
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
      uploadError: uploadResult?.error || null,
      historyId: uploadResult?.historyId || null
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

    

    const slideCount = coerceSlideCount(req.body.slideCount, 10);
    const userId = req.body.userId || null;
    const provider = req.body.provider || 'grockai';
    const imageProvider = req.body.imageProvider || 'pollinations';

    // Optional chart data coming from frontend (for first slide)
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
            // chartType/data (reduced to label/value)
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
      uploadError: uploadResult?.error || null,
      historyId: uploadResult?.historyId || null
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
      // Gemini returns text
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
      uploadError: uploadResult?.error || null,
      historyId: uploadResult?.historyId || null
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
      uploadError: uploadResult?.error || null,
      historyId: uploadResult?.historyId || null
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

// Controller: POST /api/presigned-url
// Generates a fresh presigned URL from an S3 key
export const getFreshPresignedUrl = async (req, res) => {
  try {
    const { key } = req.body;
    
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ success: false, error: 'S3 key is required' });
    }
    
    // Generate a fresh presigned URL
    const url = await getSignedUrl(key, 3600);
    
    res.json({ success: true, url });
  } catch (error) {
    console.error('[Presigned URL] Error generating URL:', error.message);
    res.status(500).json({ success: false, error: 'Failed to generate presigned URL', details: error.message });
  }
};