import { grokClient, GROK_MODEL } from "../config/grokConfig.js";
import mammoth from "mammoth"; // For Word docs
import * as XLSX from "xlsx";   // For Excel files
import pdf from "pdf-parse";    // For PDFs

// --- Helper: Clean & Parse JSON Response ---
export const parseAIResponse = (responseText) => {
  try {
    // Remove markdown formatting if present and parse JSON
    const cleanText = responseText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanText);

    if (!Array.isArray(parsed)) {
      throw new Error("AI did not return an array of slides.");
    }

    // Normalize and strip unwanted fields (e.g. stickers) so outputs
    // from different providers have a consistent shape.
    return parsed.map((rawSlide, index) => {
      const pattern = index % 3;
      let imagePosition;
      if (pattern === 0) imagePosition = 'right';
      else if (pattern === 1) imagePosition = 'left';
      else imagePosition = 'center';

      // Normalize fields with safe fallbacks and ignore 'stickers'
      const title = rawSlide.title || rawSlide.header || '';
      const bullets = Array.isArray(rawSlide.bullets) ? rawSlide.bullets : (rawSlide.points && Array.isArray(rawSlide.points) ? rawSlide.points : []);
      const imagePrompt = rawSlide.imagePrompt || rawSlide.image || '';
      const text = rawSlide.text || rawSlide.content || '';
      const layout = rawSlide.layout || 'content';
      const contentStyle = rawSlide.contentStyle || (bullets.length ? 'bullets' : 'paragraph');

      return {
        title,
        layout,
        contentStyle,
        text,
        bullets,
        imagePrompt,
        imagePosition
      };
    });
  } catch (error) {
    console.error("JSON Parse Error. Raw AI Output:", responseText);
    throw new Error("Failed to parse AI response. Please try again.");
  }
};

// --- Helper: Standard Prompt Generators ---
const createSystemPrompt = () => {
  return "You are an expert presentation designer. You must output ONLY valid JSON code. Do not add conversational text.";
};

const createUserPrompt = (context, slideCount, sourceType) => {
  // Use the same minimal JSON schema as the Gemini-based controllers so
  // Grok produces outputs consistent with Gemini (no stickers, simple array).
  return `Create a presentation with EXACTLY ${slideCount} slides based on the ${sourceType} below.\n\nFor each slide, return a JSON object with exactly these fields:\n- title: short catchy title\n- bullets: an array of 3-5 concise bullet points\n- imagePrompt: a short, clear image description for that slide\n- text: (optional) a short paragraph or summary text\n\nReturn a JSON array (no additional text, no markdown wrappers).\n\n${context}`;
};

// --- Helper: Centralized API Call ---
const callGrok = async (userContent) => {
  const completion = await grokClient.chat.completions.create({
    model: GROK_MODEL,
    messages: [
      { role: "system", content: createSystemPrompt() },
      { role: "user", content: userContent }
    ],
    temperature: 0.7, 
  });
  return completion.choices[0].message.content;
};

// --- EXPORTED FUNCTIONS (Ensure all 5 are present) ---

// 1. Handle PDF
export const convertPdfToSlides = async (fileBuffer, slides) => {
  try {
    const data = await pdf(fileBuffer);
    const text = data.text;
    const truncatedText = text.length > 100000 ? text.substring(0, 100000) + "..." : text;
    
    const prompt = createUserPrompt(truncatedText, slides, "PDF text");
    const rawResponse = await callGrok(prompt);
    return parseAIResponse(rawResponse);
  } catch (err) {
    console.error("PDF Error:", err);
    throw new Error(`PDF Processing Failed: ${err.message}`);
  }
};

// 2. Handle Word (DOCX)
export const convertWordToSlides = async (fileBuffer, slides) => {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    const text = result.value;
    
    const prompt = createUserPrompt(text, slides, "Word Document");
    const rawResponse = await callGrok(prompt);
    return parseAIResponse(rawResponse);
  } catch (err) {
    console.error("Word Error:", err);
    throw new Error(`Word Doc Processing Failed: ${err.message}`);
  }
};

// 3. Handle Excel
export const convertExcelToSlides = async (fileBuffer, slides) => {
  try {
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    let excelData = "";
    
    workbook.SheetNames.forEach(sheet => {
      const data = XLSX.utils.sheet_to_csv(workbook.Sheets[sheet]);
      excelData += `\n--- Sheet: ${sheet} ---\n${data}`;
    });

    const prompt = createUserPrompt(excelData, slides, "Excel Data");
    const rawResponse = await callGrok(prompt);
    return parseAIResponse(rawResponse);
  } catch (err) {
    console.error("Excel Error:", err);
    throw new Error(`Excel Processing Failed: ${err.message}`);
  }
};

// 4. Handle Text Files (.txt uploads)
export const convertTextFileToSlides = async (fileBuffer, slides) => {
  try {
    const text = fileBuffer.toString("utf-8");

    if (!text || text.trim().length === 0) {
      throw new Error("The uploaded text file is empty.");
    }

    const prompt = createUserPrompt(text, slides, "Plain Text File");
    const rawResponse = await callGrok(prompt);
    return parseAIResponse(rawResponse);
  } catch (err) {
    console.error("Text File Error:", err);
    throw new Error(`Text File Processing Failed: ${err.message}`);
  }
};

// 5. Handle Topic (Raw String Input) - THIS WAS MISSING
export const generateTopicsToSlides = async (topic, slides) => {
  try {
    const prompt = createUserPrompt(topic, slides, "Topic Description");
    const rawResponse = await callGrok(prompt);
    return parseAIResponse(rawResponse);
  } catch (err) {
    console.error("Topic Error:", err);
    throw new Error(`Topic Generation Failed: ${err.message}`);
  }
};