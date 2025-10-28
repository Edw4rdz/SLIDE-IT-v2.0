import { geminiModel } from "../config/geminiConfig.js";
import mammoth from "mammoth"; 
import * as XLSX from "xlsx";
/**
 * Helper function to parse the AI's JSON response reliably.
 * Tries direct parsing and parsing from markdown code blocks.
 */
const parseAIResponse = (responseText) => {
  try {
    // Attempt to parse the JSON directly
    const parsed = JSON.parse(responseText);
    // Basic validation (adjust as needed based on expected structure)
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title !== undefined && parsed[0].bullets !== undefined && parsed[0].imagePrompt !== undefined) {
      return parsed;
    }
    console.warn("Parsed JSON structure might not be as expected:", parsed);
    // If validation fails but it's an array, return it anyway, hoping the frontend can handle it
    if (Array.isArray(parsed)) return parsed;
    throw new Error("Parsed JSON does not match expected array format.");
  } catch (error) {
    console.warn("Failed initial JSON parse:", error.message);
    // Fallback: Try to extract JSON from markdown code blocks ```json ... ```
    const markdownMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      try {
        console.log("Attempting to parse JSON from markdown block...");
        const parsedMarkdown = JSON.parse(markdownMatch[1]);
        // Re-validate structure from markdown
        if (Array.isArray(parsedMarkdown) && parsedMarkdown.length > 0 && parsedMarkdown[0].title !== undefined && parsedMarkdown[0].bullets !== undefined && parsedMarkdown[0].imagePrompt !== undefined) {
          console.log("Successfully parsed JSON from markdown.");
          return parsedMarkdown;
        }
        console.warn("Parsed markdown JSON structure might not be as expected:", parsedMarkdown);
        if (Array.isArray(parsedMarkdown)) return parsedMarkdown; // Return if array, even if structure differs slightly
      } catch (markdownError) {
        console.error("Failed to parse JSON extracted from markdown block:", markdownError);
      }
    }
    // If all parsing fails, throw a more informative error
    console.error("AI returned unparsable content:", responseText);
    throw new Error(`AI returned invalid or unparsable JSON format. Check AI service or prompt.`);
  }
};


/**
 * Business Logic: Converts a PDF file (base64) into slide data including image prompts.
 */
export const convertPdfToSlides = async (base64PDF, slides) => {
  try {
    // Updated prompt asking for imagePrompt
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
    // Use the reliable parser
    return parseAIResponse(result.response.text());
  } catch (err) {
    console.error("Error in AI Service (PDF):", err);
    // Include original error message for better debugging
    throw new Error(`Failed to convert PDF using AI: ${err.message}`);
  }
};

/**
 * Business Logic: Converts plain text into slide data including image prompts.
 */
export const convertTextToSlides = async (text, slides) => {
  try {
    // Updated prompt asking for imagePrompt
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
    // Use the reliable parser
    return parseAIResponse(result.response.text());
  } catch (err) {
    console.error("Error in AI Service (Text):", err);
    throw new Error(`Failed to convert text using AI: ${err.message}`);
  }
};

/**
 * Business Logic: Converts a Word Doc (.docx) file (base64) into slide data including image prompts.
 */
/**
 * Business Logic: Converts a Word Doc (.docx) file (base64) into slide data including image prompts.
 * Extracts text first, then sends text to AI.
 */
export const convertWordToSlides = async (base64Word, slides) => {
  try {
    // 1. Decode base64 and extract text using mammoth
    console.log("Decoding base64 Word document...");
    const buffer = Buffer.from(base64Word, "base64");
    console.log("Extracting text from Word buffer...");
    const { value: extractedText } = await mammoth.extractRawText({ buffer });

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No readable text found in the Word document.");
    }
    console.log(`Extracted ${extractedText.length} characters.`);

    // 2. Create the prompt using the extracted text
    const prompt = `
      Based on the following text extracted from a Word document, organize the content into approximately ${slides} slides.
      For each slide, provide a concise 'title', a list of 'bullets' (3-5 points), AND a simple 'imagePrompt' (a few keywords describing a relevant image).
      Return ONLY JSON in the format: [{ "title": "...", "bullets": ["...", "..."], "imagePrompt": "..." }]

      EXTRACTED TEXT:
      ---
      ${extractedText}
      ---
    `;

    // 3. Call Gemini with ONLY the text prompt (no inlineData)
    console.log("Sending extracted text to Gemini AI...");
    const result = await geminiModel.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: prompt }] // Send only text
      }],
      generationConfig: { responseMimeType: "application/json" }
    });

    // 4. Parse the response
    console.log("Parsing Gemini AI response...");
    return parseAIResponse(result.response.text()); // Use your existing parser

  } catch (err) {
    console.error("Error in AI Service (Word):", err);
    // Add more specific error message based on potential mammoth failure
    if (err.message.includes("mammoth")) {
        throw new Error(`Failed to extract text from Word document: ${err.message}`);
    }
    throw new Error(`Failed to convert Word doc using AI: ${err.message}`);
  }
};

/**
 * Business Logic: Converts an Excel (.xlsx) file (base64) into slide data including image prompts.
 */
export const convertExcelToSlides = async (base64Excel, slides) => {
  try {
    // 1. Decode base64 and parse Excel data using xlsx
    console.log("Decoding base64 Excel document...");
    const buffer = Buffer.from(base64Excel, "base64");
    console.log("Parsing Excel buffer...");
    const workbook = XLSX.read(buffer, { type: "buffer" });

    let combinedText = "";
    // Extract text from each sheet (simple CSV-like representation)
    workbook.SheetNames.forEach((sheetName) => {
      console.log(`Extracting text from sheet: ${sheetName}`);
      const sheet = workbook.Sheets[sheetName];
      // Convert sheet data to CSV format text
      const sheetData = XLSX.utils.sheet_to_csv(sheet, { skipHidden: true });
      combinedText += `\n--- Sheet: ${sheetName} ---\n${sheetData}\n`;
    });

    if (combinedText.trim().length === 0) {
      throw new Error("No readable data found in the Excel document.");
    }
    console.log(`Extracted ${combinedText.length} characters from Excel.`);

    // 2. Create the prompt using the extracted text
    const prompt = `
      Based on the following text extracted from an Excel spreadsheet (represented sheet by sheet in CSV-like format), organize the key insights into approximately ${slides} slides. Focus on summaries, trends, totals, or important data points.
      For each slide, provide a concise 'title', a list of 'bullets' (3-5 points summarizing information), AND a simple 'imagePrompt' (keywords describing a relevant chart, graph, or data visualization).
      Return ONLY JSON in the format: [{ "title": "...", "bullets": ["...", "..."], "imagePrompt": "..." }]

      EXTRACTED EXCEL DATA:
      ---
      ${combinedText}
      ---
    `;

    // 3. Call Gemini with ONLY the text prompt (NO inlineData for Excel)
    console.log("Sending extracted Excel text to Gemini AI...");
    const result = await geminiModel.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: prompt }] // Send only the extracted text
      }],
      generationConfig: { responseMimeType: "application/json" }
    });

    // 4. Parse the response using your helper
    console.log("Parsing Gemini AI response for Excel conversion...");
    return parseAIResponse(result.response.text());

  } catch (err) {
    console.error("Error in AI Service (Excel):", err);
     // Add more specific error message based on potential xlsx failure
    if (err.message.includes("xlsx")) {
        throw new Error(`Failed to parse Excel document: ${err.message}`);
    }
    // Keep the original error message if it's from Gemini or parsing
    throw new Error(`Failed to convert Excel sheet using AI: ${err.message}`);
  }
};

/**
 * Business Logic: Generates slide content from a user-provided topic, including image prompts.
 */
export const generateTopicsToSlides = async (topic, slides) => {
  try {
    // Updated prompt asking for imagePrompt
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
     // Use the reliable parser
     return parseAIResponse(result.response.text());
  } catch (err) {
    console.error("Error in AI Service (Topics):", err);
    throw new Error(`Failed to generate topics using AI: ${err.message}`);
  }
};