import express from "express";
import {
  handlePdfConversion,
  handleTextConversion,
  handleWordConversion,
  handleExcelConversion,
  handleTopicGeneration
} from "../controllers/aiController.js";

const router = express.Router();

// PDF to PPT
router.post("/convert-pdf", handlePdfConversion);

// Text to PPT
router.post("/convert-text", handleTextConversion);

// Word to PPT
router.post("/convert-word", handleWordConversion);

// Excel to PPT
router.post("/convert-excel", handleExcelConversion);

// AI-Generated Topics to PPT
router.post("/generate-topics", handleTopicGeneration);

export default router;