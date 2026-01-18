import { getAllTemplates, getTemplateDetailsById } from "../services/templateService.js";

/**
 * Controller Logic: Get all templates.
 * Filters based on the authenticated user.
 */
export const listTemplates = async (req, res) => {
  try {
    // Extract userId from the authenticated request
    const userId = req.user ? req.user.uid : null;
    const templates = await getAllTemplates(userId);
    res.json(templates);
  } catch (err) {
    console.error("Error fetching templates:", err);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
};

/**
 * Controller Logic: Get a specific template's details.
 * This must also be "async".
 */
export const useTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const templateDetails = await getTemplateDetailsById(id);
    res.json({
      success: true,
      template: templateDetails,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};