import express from "express";
import multer from "multer";
import {
  generateFromPdf,
  generateFromWord,
  generateFromExcel,
  generateFromTextFile, // <--- Updated import
  generateFromTopic,
  generatePollinationsImage, // <-- New import
  generateGrokImageAPI, // <-- New import for Grok images
  generateImagenImageAPI, // <-- New import for Imagen images
  generatePptx
} from "../controllers/aiController.js";

const router = express.Router();

// Configure Multer (Memory storage is best for serverless/PaaS like Render)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Routes ---
//PDF to Slides
router.post("/convert-pdf", upload.single("file"), generateFromPdf);
//Word to Slides
router.post("/convert-word", upload.single("file"), generateFromWord);
//Excel to Slides
router.post("/convert-excel", upload.single("file"), generateFromExcel);
//Text File to Slides
router.post("/convert-text", upload.single("file"), generateFromTextFile);
//Topics to Slides
router.post("/generate-topics", generateFromTopic);

// Pollinations AI Image Generation (PUBLIC)
router.post("/generate-image", generatePollinationsImage);

// Grok AI Image Generation (PUBLIC)
router.post("/generate-grok-image", generateGrokImageAPI);

// Imagen AI Image Generation (PUBLIC)
router.post("/generate-imagen-image", generateImagenImageAPI);

// Generate PPTX from slides data
router.post("/generate-pptx", generatePptx);

export default router;