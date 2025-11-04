import { saveHistory } from "../services/historyService.js";
import {
  convertPdfToSlides,
  convertTextToSlides,
  convertWordToSlides,
  convertExcelToSlides,
  generateTopicsToSlides
} from "../services/aiService.js";

export const handlePdfConversion = async (req, res) => {
  try {
    // 1. Get userId and fileName from the frontend
    const { base64PDF, slides, userId, fileName } = req.body;
    
    if (!base64PDF || !slides) {
      return res.status(400).json({ error: "Missing PDF or slides number" });
    }
    if (!userId) {
      return res.status(400).json({ error: "User ID is required to save history" });
    }

    // 2. Call the AI service
    const slideData = await convertPdfToSlides(base64PDF, slides);

    // 3. (NEW) Save to history
    await saveHistory({
      userId: userId,
      fileName: fileName || "PDF Conversion", // Use fileName from frontend
      conversionType: "PDF-to-PPTs", // <-- MODIFIED (was 'type: "PDF"')
      slides: slideData // Save the JSON slide data
    });

    // 4. Send response
    res.json(slideData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const handleTextConversion = async (req, res) => {
  try {
    // 1. Get userId
    const { text, slides, userId } = req.body;
    
    if (!text || !slides) {
      return res.status(400).json({ error: "Missing text or slides number" });
    }
    if (!userId) {
      return res.status(400).json({ error: "User ID is required to save history" });
    }

    // 2. Call the AI service
    const slideData = await convertTextToSlides(text, slides);
    
    // 3. (NEW) Save to history
    await saveHistory({
      userId: userId,
      fileName: text.substring(0, 40) + "...", // Use first 40 chars of text as name
      conversionType: "TxT-to-PPTs", // <-- MODIFIED (was 'type: "Text"')
      slides: slideData
    });

    // 4. Send response
    res.json(slideData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const handleWordConversion = async (req, res) => {
  try {
    // 1. Get userId and fileName
    const { base64Word, slides, userId, fileName } = req.body;
    
    if (!base64Word || !slides) {
      return res.status(400).json({ error: "Missing Word data or slides number" });
    }
    if (!userId) {
      return res.status(400).json({ error: "User ID is required to save history" });
    }

    // 2. Call the AI service
    const slideData = await convertWordToSlides(base64Word, slides);

    // 3. (NEW) Save to history
    await saveHistory({
      userId: userId,
      fileName: fileName || "Word Conversion",
      conversionType: "DOCX/WORD-to-PPTs", // <-- MODIFIED (was 'type: "Word"')
      slides: slideData
    });

    // 4. Send response
    res.json(slideData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const handleExcelConversion = async (req, res) => {
  try {
    // 1. Get userId and fileName
    const { base64Excel, slides, userId, fileName } = req.body;
    
    if (!base64Excel || !slides) {
      return res.status(400).json({ error: "Missing Excel data or slides number" });
    }
    if (!userId) {
      return res.status(400).json({ error: "User ID is required to save history" });
    }

    // 2. Call the AI service
    const slideData = await convertExcelToSlides(base64Excel, slides);
    
    // 3. (NEW) Save to history
    await saveHistory({
      userId: userId,
      fileName: fileName || "Excel Conversion",
      conversionType: "Excel-to-PPTs", // <-- MODIFIED (was 'type: "Excel"')
      slides: slideData
    });

    // 4. Send response
    res.json(slideData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const handleTopicGeneration = async (req, res) => {
  try {
    // 1. Get userId
    const { topic, slides, userId } = req.body; 
    
    if (!topic || !slides) {
      return res.status(400).json({ error: "Missing topic or slides number" });
    }
    if (!userId) {
        return res.status(400).json({ error: "User ID is required to save history" });
    }

    // 2. Call the AI service
    const slideData = await generateTopicsToSlides(topic, slides);
    
    // 3. (NEW) Save to history
    await saveHistory({
      userId: userId,
      fileName: topic, // Use the topic as the name
      conversionType: "AI-Generated PPTs", // <-- MODIFIED (was 'type: "AI Topic"')
      slides: slideData 
    });

    // 4. Send response
    res.json(slideData);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};