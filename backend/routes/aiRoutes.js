import express from "express";
import multer from "multer";
import {
  generateFromPdf,
  generateFromWord,
  generateFromExcel,
  generateFromTextFile, // <--- Updated import
  generateFromTopic
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

export default router;