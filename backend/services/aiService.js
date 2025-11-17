import { geminiModel } from "../config/geminiConfig.js";
import mammoth from "mammoth"; 
import * as XLSX from "xlsx";

const parseAIResponse = (responseText) => {
  try {
    const parsed = JSON.parse(responseText);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title !== undefined && parsed[0].bullets !== undefined && parsed[0].imagePrompt !== undefined) {
      return cleanMarkdownFromSlides(parsed);
    }
    console.warn("Parsed JSON structure might not be as expected:", parsed);
    if (Array.isArray(parsed)) return cleanMarkdownFromSlides(parsed);
    throw new Error("Parsed JSON does not match expected array format.");
  } catch (error) {
    console.warn("Failed initial JSON parse:", error.message);
    const markdownMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      try {
        console.log("Attempting to parse JSON from markdown block...");
        const parsedMarkdown = JSON.parse(markdownMatch[1]);
        if (Array.isArray(parsedMarkdown) && parsedMarkdown.length > 0 && parsedMarkdown[0].title !== undefined && parsedMarkdown[0].bullets !== undefined && parsedMarkdown[0].imagePrompt !== undefined) {
          console.log("Successfully parsed JSON from markdown.");
          return cleanMarkdownFromSlides(parsedMarkdown);
        }
        console.warn("Parsed markdown JSON structure might not be as expected:", parsedMarkdown);
        if (Array.isArray(parsedMarkdown)) return cleanMarkdownFromSlides(parsedMarkdown); 
      } catch (markdownError) {
        console.error("Failed to parse JSON extracted from markdown block:", markdownError);
      }
    }
    console.error("AI returned unparsable content:", responseText);
    throw new Error(`AI returned invalid or unparsable JSON format. Check AI service or prompt.`);
  }
};
const cleanMarkdownFromSlides = (slides) => {
  return slides.map(slide => ({
    ...slide,
    title: slide.title ? slide.title.replace(/\*\*|__|\*|_/g, '').trim() : slide.title,
    imagePrompt: slide.imagePrompt ? slide.imagePrompt.replace(/\*\*|__|\*|_/g, '').trim() : slide.imagePrompt,
    bullets: Array.isArray(slide.bullets) 
      ? slide.bullets.map(bullet => bullet.replace(/\*\*|__|\*|_/g, '').trim())
      : slide.bullets
  }));
};


export const convertPdfToSlides = async (base64PDF, slides) => {
  try {
    const prompt = `
      Extract text from this PDF and organize it into approximately ${slides} slides.
      For each slide, provide a concise 'title', a list of 'bullets' (3-5 points), AND a simple 'imagePrompt' (a few keywords describing a relevant image, suitable for an AI image generator).
      Return ONLY JSON in the format: [{ "title": "...", "bullets": ["...", "..."], "imagePrompt": "..." }]
    `;
    const result = await geminiModel.generateContent({
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "application/pdf", data: base64PDF } }
        ]
      }],
      generationConfig: { responseMimeType: "application/json" }
    });
    return parseAIResponse(result.response.text());
  } catch (err) {
    console.error("Error in AI Service (PDF):", err);
    throw new Error(`Failed to convert PDF using AI: ${err.message}`);
  }
};
export const convertTextToSlides = async (text, slides) => {
  try {
    const prompt = `
      Take this text: "${text}".
      Organize it into approximately ${slides} slides.
      For each slide, provide a concise 'title', a list of 'bullets' (3-5 points), AND a simple 'imagePrompt' (a few keywords describing a relevant image).
      Return ONLY JSON in the format: [{ "title": "...", "bullets": ["...", "..."], "imagePrompt": "..." }]
    `;
    const result = await geminiModel.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generationConfig: { responseMimeType: "application/json" }
    });
    return parseAIResponse(result.response.text());
  } catch (err) {
    console.error("Error in AI Service (Text):", err);
    throw new Error(`Failed to convert text using AI: ${err.message}`);
  }
};

export const convertWordToSlides = async (base64Word, slides) => {
  try {
    console.log("Decoding base64 Word document...");
    const buffer = Buffer.from(base64Word, "base64");
    console.log("Extracting text from Word buffer...");
    const { value: extractedText } = await mammoth.extractRawText({ buffer });

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No readable text found in the Word document.");
    }
    console.log(`Extracted ${extractedText.length} characters.`);
    const prompt = `
      Based on the following text extracted from a Word document, organize the content into approximately ${slides} slides.
      For each slide, provide a concise 'title', a list of 'bullets' (3-5 points), AND a simple 'imagePrompt' (a few keywords describing a relevant image).
      Return ONLY JSON in the format: [{ "title": "...", "bullets": ["...", "..."], "imagePrompt": "..." }]

      EXTRACTED TEXT:
      ---
      ${extractedText}
      ---
    `;
    console.log("Sending extracted text to Gemini AI...");
    const result = await geminiModel.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: prompt }] 
      }],
      generationConfig: { responseMimeType: "application/json" }
    });

    console.log("Parsing Gemini AI response...");
    return parseAIResponse(result.response.text());
  } catch (err) {
    console.error("Error in AI Service (Word):", err);
    if (err.message.includes("mammoth")) {
        throw new Error(`Failed to extract text from Word document: ${err.message}`);
    }
    throw new Error(`Failed to convert Word doc using AI: ${err.message}`);
  }
};
export const convertExcelToSlides = async (base64Excel, slides) => {
  try {
    console.log("Decoding base64 Excel document...");
    const buffer = Buffer.from(base64Excel, "base64");
    console.log("Parsing Excel buffer...");
    const workbook = XLSX.read(buffer, { type: "buffer" });

    let combinedText = "";
    workbook.SheetNames.forEach((sheetName) => {
      console.log(`Extracting text from sheet: ${sheetName}`);
      const sheet = workbook.Sheets[sheetName];
   
      const sheetData = XLSX.utils.sheet_to_csv(sheet, { skipHidden: true });
      combinedText += `\n--- Sheet: ${sheetName} ---\n${sheetData}\n`;
    });

    if (combinedText.trim().length === 0) {
      throw new Error("No readable data found in the Excel document.");
    }
    console.log(`Extracted ${combinedText.length} characters from Excel.`);
    const prompt = `
      Based on the following text extracted from an Excel spreadsheet (represented sheet by sheet in CSV-like format), organize the key insights into approximately ${slides} slides. Focus on summaries, trends, totals, or important data points.
      For each slide, provide a concise 'title', a list of 'bullets' (3-5 points summarizing information), AND a simple 'imagePrompt' (keywords describing a relevant chart, graph, or data visualization).
      Return ONLY JSON in the format: [{ "title": "...", "bullets": ["...", "..."], "imagePrompt": "..." }]

      EXTRACTED EXCEL DATA:
      ---
      ${combinedText}
      ---
    `;
   console.log("Sending extracted Excel text to Gemini AI...");
    const result = await geminiModel.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: prompt }] 
      }],
      generationConfig: { responseMimeType: "application/json" }
    });

    console.log("Parsing Gemini AI response for Excel conversion...");
    return parseAIResponse(result.response.text());

  } catch (err) {
    console.error("Error in AI Service (Excel):", err);
    if (err.message.includes("xlsx")) {
        throw new Error(`Failed to parse Excel document: ${err.message}`);
    }
    throw new Error(`Failed to convert Excel sheet using AI: ${err.message}`);
  }
};


export const generateTopicsToSlides = async (topic, slides) => {
  try {
    const prompt = `
      Generate a presentation about this topic: "${topic}".
      Create content for approximately ${slides} slides.
      For each slide, provide a concise 'title', a list of 'bullets' (3-5 points), AND a simple 'imagePrompt' (a few keywords describing a relevant image).
      Return ONLY JSON in the format: [{ "title": "...", "bullets": ["...", "..."], "imagePrompt": "..." }]
    `;
    const result = await geminiModel.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generationConfig: { responseMimeType: "application/json" }
    });
     return parseAIResponse(result.response.text());
  } catch (err) {
    console.error("Error in AI Service (Topics):", err);
    throw new Error(`Failed to generate topics using AI: ${err.message}`);
  }
};