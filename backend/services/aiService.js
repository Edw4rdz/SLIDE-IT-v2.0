import { grokClient, GROK_MODEL } from "../config/grokConfig.js";
import mammoth from "mammoth"; // For Word docs
import * as XLSX from "xlsx";   // For Excel files
import pdf from "pdf-parse";    // For PDFs

// --- Helper: Clean & Parse JSON Response ---
const parseAIResponse = (responseText) => {
  try {
    // Remove markdown formatting if present
    const cleanText = responseText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    
    if (!Array.isArray(parsed)) {
      throw new Error("AI did not return an array of slides.");
    }
    return parsed;
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
  return `
    I need to create a presentation with approximately ${slideCount} slides based on the ${sourceType} provided below.
    
    For each slide, provide:
    1. "title": A catchy, professional title.
    2. "bullets": An array of 3-5 concise bullet points summarizing key facts.
    3. "imagePrompt": A detailed description for an AI image generator to create a background image.

    Output Format: JSON Array of objects.
    Example: [{"title": "Intro", "bullets": ["Point 1", "Point 2"], "imagePrompt": "A futuristic office"}]

    SOURCE CONTENT:
    """
    ${context}
    """
  `;
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