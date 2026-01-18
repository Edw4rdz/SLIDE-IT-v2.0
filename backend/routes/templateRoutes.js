import express from "express";
import { listTemplates, useTemplate } from "../controllers/templateController.js";
import { authenticateUser } from "../middleware/authenticateUser.js";

const router = express.Router();

// GET /api/templates/list
router.get("/templates/list", authenticateUser, listTemplates);

// POST /api/templates/use/:id
router.post("/templates/use/:id", authenticateUser, useTemplate);

export default router;