// backend/controllers/templateController.js
import { getAllTemplates, getTemplateDetailsById } from "../services/templateService.js";

/**
 * Controller Logic: Get all templates and send as JSON.
 */
export const listTemplates = (req, res) => {
  const templates = getAllTemplates();
  res.json(templates);
};

/**
 * Controller Logic: Get a specific template's details.
 */
export const useTemplate = (req, res) => {
  try {
    const { id } = req.params;
    const templateDetails = getTemplateDetailsById(id);
    res.json({
      success: true,
      template: templateDetails,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};