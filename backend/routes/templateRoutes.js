// backend/routes/templateRoutes.js
import express from "express";
import { listTemplates, useTemplate } from "../controllers/templateController.js";

const router = express.Router();

// This handles GET /api/templates/list
router.get("/templates/list", listTemplates);

// This handles POST /api/templates/use/:id
router.post("/templates/use/:id", useTemplate);

export default router;