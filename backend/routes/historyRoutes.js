import express from "express";
import { 
  handleGetHistory, 
  handleDeleteHistory 
} from "../controllers/historyController.js";

const router = express.Router();

// GET /api/conversions
// Gets all history items for a user
router.get("/conversions", handleGetHistory);

// DELETE /api/conversions/:id
// Deletes one specific history item
router.delete("/conversions/:id", handleDeleteHistory);

export default router;