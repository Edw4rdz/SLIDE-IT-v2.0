import { geminiModel } from "../config/geminiConfig.js";

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
export const convertWordToSlides = async (base64Word, slides) => {
  try {
    // Updated prompt asking for imagePrompt
    const prompt = `
      Extract text from this Word document and organize it into approximately ${slides} slides.
      For each slide, provide a concise 'title', a list of 'bullets' (3-5 points), AND a simple 'imagePrompt' (a few keywords describing a relevant image).
      Return ONLY JSON in the format: [{ "title": "...", "bullets": ["...", "..."], "imagePrompt": "..." }]
    `;
    const result = await geminiModel.generateContent({
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", data: base64Word } }
        ]
      }],
      generationConfig: { responseMimeType: "application/json" }
    });
     // Use the reliable parser
     return parseAIResponse(result.response.text());
  } catch (err) {
    console.error("Error in AI Service (Word):", err);
    throw new Error(`Failed to convert Word doc using AI: ${err.message}`);
  }
};

/**
 * Business Logic: Converts an Excel (.xlsx) file (base64) into slide data including image prompts.
 */
export const convertExcelToSlides = async (base64Excel, slides) => {
  try {
    // Updated prompt asking for imagePrompt
    const prompt = `
      Extract data from this Excel spreadsheet and organize it into approximately ${slides} slides. Prioritize summaries, charts, and key tables.
      For each slide, provide a concise 'title', a list of 'bullets' (3-5 points summarizing insights), AND a simple 'imagePrompt' (a few keywords describing a relevant chart or data visualization).
      Return ONLY JSON in the format: [{ "title": "...", "bullets": ["...", "..."], "imagePrompt": "..." }]
    `;
    const result = await geminiModel.generateContent({
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", data: base64Excel } }
        ]
      }],
      generationConfig: { responseMimeType: "application/json" }
    });
     // Use the reliable parser
     return parseAIResponse(result.response.text());
  } catch (err) {
    console.error("Error in AI Service (Excel):", err);
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