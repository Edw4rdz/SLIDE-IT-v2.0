import { listUploadedTemplates } from "../services/uploadService.js";
import { extractPptxDesign, extractPptxThumbnail } from "../services/pptxExtractorService.js";
import path from "path";
import fs from "fs/promises";

/**
 * Controller Logic: Handle the response for a successful upload.
 */
export const handleUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded or invalid file type" });
  }

  let design = null;
  let thumbnail = null;
  if (req.file.mimetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    try {
      const pptxPath = path.join(req.file.destination, req.file.filename);
      design = await extractPptxDesign(pptxPath);

      // Extract thumbnail and encode as base64 data URL
      const thumbFilename = await extractPptxThumbnail(pptxPath, req.file.destination, req.file.filename + "-thumb");
      if (thumbFilename) {
        const thumbPath = path.join(req.file.destination, thumbFilename);
        const ext = path.extname(thumbFilename).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        if (ext === '.gif') mimeType = 'image/gif';
        const buffer = await fs.readFile(thumbPath);
        const base64 = buffer.toString('base64');
        thumbnail = `data:${mimeType};base64,${base64}`;
        // Optionally, delete the file after encoding
        await fs.unlink(thumbPath);
      }
    } catch (err) {
      console.error("Failed to extract PPTX design or thumbnail:", err);
    }
  }

  res.json({
    success: true,
    message: "Template uploaded successfully",
    file: {
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`,
      mimetype: req.file.mimetype,
      size: req.file.size,
    },
    design, // <-- include design info
    thumbnail, // <-- base64 thumbnail or null
  });
};

/**
 * Controller Logic: Get the list of templates and send as JSON.
 */
export const getTemplates = async (req, res) => {
  try {
    // 1. Call the service
    const templates = await listUploadedTemplates();
    // 2. Send response
    res.json(templates);
  } catch (err) {
    // 3. Handle errors
    res.status(500).json({ success: false, message: err.message });
  }
};