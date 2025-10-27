import express from "express";
import { listTemplates, useTemplate } from "../controllers/templateController.js";

const router = express.Router();

// Points to the controller for listing templates
router.get("/templates/list", listTemplates);

// Points to the controller for using a specific template
router.post("/templates/use/:id", useTemplate);

export default router;