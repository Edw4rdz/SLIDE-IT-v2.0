import { getAllTemplates, getTemplateLinkById } from "../services/templateService.js";

/**
 * Controller Logic: Get all templates and send as JSON.
 */
export const listTemplates = (req, res) => {
  // 1. Call the service
  const templates = getAllTemplates();
  // 2. Send response
  res.json(templates);
};

/**
 * Controller Logic: Get a specific template link.
 */
export const useTemplate = (req, res) => {
  try {
    // 1. Get ID from request
    const { id } = req.params;
    
    // 2. Call the service
    const link = getTemplateLinkById(id);

    // 3. Send successful response
    res.json({
      success: true,
      link: link,
    });
  } catch (err) {
    // 4. Handle errors (like the "not found" error from the service)
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};