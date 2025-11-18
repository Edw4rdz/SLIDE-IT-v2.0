import { 
  convertPdfToSlides, 
  convertWordToSlides, 
  convertExcelToSlides,
  convertTextFileToSlides, 
  generateTopicsToSlides 
} from "../services/aiService.js";
import fs from "fs";
import { saveHistory } from "../services/historyService.js";

const getFileBuffer = (file) => {
  if (file.buffer) return file.buffer;
  if (file.path) return fs.readFileSync(file.path);
  throw new Error("File buffer not found. Check multer configuration.");
};

export const generateFromPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, data: [], error: "No PDF file uploaded." });
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
    try {
      if (userId) {
        const saved = await saveHistory({
          userId,
          fileName: req.file.originalname || 'PDF Presentation',
          conversionType: 'PDF-to-PPTs',
          includeImages,
          previewThumb,
          slides,
        });
        console.log(`[History] Saved PDF for userId=${userId} file=${req.file.originalname} id=${saved.id}`);
      }
    } catch (e) {
      console.error('Failed to save PDF history:', e.message);
    }
    res.json({ success: true, data: Array.isArray(slides) ? slides : [], error: null });
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

    const slideCount = req.body.slideCount || 10;
    const userId = req.body.userId || null;
    const includeImages = req.body.includeImages === 'true' || req.body.includeImages === true || false;
    const previewThumb = req.body.previewThumb || null;
    const buffer = getFileBuffer(req.file);

    console.log(`Processing Word Doc: ${req.file.originalname}`);
    const slides = await convertWordToSlides(buffer, slideCount);
    console.log(`[WORD] Generated ${slides.length} slides, userId=${userId}`);
    try {
      if (userId) {
        console.log(`[WORD] Attempting to save history for userId=${userId}`);
        const saved = await saveHistory({
          userId,
          fileName: req.file.originalname || 'Word Presentation',
          conversionType: 'DOCX/WORD-to-PPTs',
          includeImages,
          previewThumb,
          slides,
        });
        console.log(`[WORD History SAVED] userId=${userId} file=${req.file.originalname} conversionType=WORD id=${saved.id}`);
      } else {
        console.log(`[WORD] No userId provided, skipping history save`);
      }
    } catch (e) {
      console.error('[WORD History FAILED]:', e.message);
    }
    res.json({ success: true, data: slides });
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

    const slideCount = req.body.slideCount || 10;
    const userId = req.body.userId || null;
    const buffer = getFileBuffer(req.file);

    console.log(`Processing Excel: ${req.file.originalname}`);
    const slides = await convertExcelToSlides(buffer, slideCount);
    try {
      if (userId) {
        const saved = await saveHistory({
          userId,
          fileName: req.file.originalname || 'Excel Presentation',
          conversionType: 'Excel-to-PPTs',
          slides,
        });
        console.log(`[History] Saved EXCEL for userId=${userId} file=${req.file.originalname} id=${saved.id}`);
      }
    } catch (e) {
      console.error('Failed to save Excel history:', e.message);
    }
    res.json({ success: true, data: slides });
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
    try {
      if (userId) {
        const saved = await saveHistory({
          userId,
          fileName: String(topic).slice(0, 80) || 'AI Topic Presentation',
          conversionType: 'AI-Generated PPTs',
          includeImages: !!includeImages,
          previewThumb: previewThumb || null,
          slides,
        });
        console.log(`[History] Saved TOPIC for userId=${userId} topic="${String(topic).slice(0,40)}" id=${saved.id}`);
      }
    } catch (e) {
      console.error('Failed to save Topic history:', e.message);
    }
    res.json({ success: true, data: slides });
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

    const slideCount = req.body.slideCount || 10;
    const userId = req.body.userId || null;
    const includeImages = req.body.includeImages === 'true' || req.body.includeImages === true || false;
    const previewThumb = req.body.previewThumb || null;
    const buffer = getFileBuffer(req.file);

    console.log(`Processing Text File: ${req.file.originalname}`);
    const slides = await convertTextFileToSlides(buffer, slideCount);
    try {
      if (userId) {
        const saved = await saveHistory({
          userId,
          fileName: req.file.originalname || 'Text Presentation',
          conversionType: 'TxT-to-PPTs',
          includeImages,
          previewThumb,
          slides,
        });
        console.log(`[History] Saved TEXT for userId=${userId} file=${req.file.originalname} id=${saved.id}`);
      }
    } catch (e) {
      console.error('Failed to save Text history:', e.message);
    }
    res.json({ success: true, data: slides });
  } catch (error) {
    console.error("Controller Text File Error:", error);
    res.status(500).json({ error: "Failed to generate slides from text file.", details: error.message });
  }
};