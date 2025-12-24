import { listUploadedTemplates } from "../services/uploadService.js";
import { extractPptxDesign, extractPptxThumbnail } from "../services/pptxExtractorService.js";
import path from "path";
import fs from "fs/promises";
import { createCanvas } from "canvas";

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

      // Extract thumbnail image
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
        await fs.unlink(thumbPath);
      } else if (design && design.slides && design.slides.length > 0) {
        // Generate thumbnail from first slide design if no embedded thumbnail
        thumbnail = generateThumbnailFromSlide(design.slides[0], req.file.filename);
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
    design, 
    thumbnail, 
  });
};

/**
 * Controller Logic: Get the list of templates and send as JSON.
 */
export const getTemplates = async (req, res) => {
  try {
    const templates = await listUploadedTemplates();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Generate a thumbnail image from slide design information
 */
function generateThumbnailFromSlide(slideInfo, filename) {
  try {
    const canvas = createCanvas(360, 220);
    const ctx = canvas.getContext('2d');

    // Apply slide background
    const background = slideInfo.background || '#ffffff';
    if (background.startsWith('linear-gradient')) {
      // Parse gradient 
      const match = background.match(/#[0-9a-fA-F]{6}/g);
      if (match && match.length >= 2) {
        const grad = ctx.createLinearGradient(0, 0, 360, 220);
        grad.addColorStop(0, match[0]);
        grad.addColorStop(1, match[1]);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#ffffff';
      }
    } else {
      ctx.fillStyle = background;
    }
    ctx.fillRect(0, 0, 360, 220);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(14, 14, Math.min(filename.length * 8 + 20, 320), 26);
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText(filename.substring(0, 35), 24, 32);

    const titleColor = slideInfo.titleColor || '#000000';
    ctx.fillStyle = titleColor;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Slide 1', 180, 120);

    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (err) {
    console.error('Error generating thumbnail:', err);
    return null;
  }
}