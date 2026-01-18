import express from "express";
import multer from "multer";
import {
  generateFromPdf,
  generateFromWord,
  generateFromExcel,
  generateFromTextFile,
  generateFromTopic,
  generatePollinationsImage,
  generateImagenImageAPI,
  generatePptx,
  getFreshPresignedUrl
} from "../controllers/aiController.js";

const router = express.Router();

// Configure Multer
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

// Pollinations AI Image Generation
router.post("/generate-image", generatePollinationsImage);

// Imagen AI Image Generation
router.post("/generate-imagen-image", generateImagenImageAPI);

// Generate PPTX from slides data
router.post("/generate-pptx", generatePptx);

// Get fresh presigned URL from S3 key
router.post("/presigned-url", getFreshPresignedUrl);

export default router;