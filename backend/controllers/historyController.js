import { getHistory, deleteHistory } from "../services/historyService.js";

/**
 * Controller: Handles request to get a user's history.
 */
export const handleGetHistory = async (req, res) => {
  try {
    // Get userId from the query parameters (e.g., /api/conversions?userId=123)
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    const historyList = await getHistory(userId);
    res.json(historyList);
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller: Handles request to delete a history item.
 */
export const handleDeleteHistory = async (req, res) => {
  try {
    // Get id from the URL parameters (e.g., /api/conversions/abc)
    const { id } = req.params;
    // Get userId from the query (for security check)
    const { userId } = req.query; 

    if (!id || !userId) {
      return res.status(400).json({ error: "Document ID and User ID are required" });
    }

    const result = await deleteHistory(id, userId);
    res.json(result);
    
  } catch (err) {
    // Handle specific errors
    if (err.message === "User not authorized...") {
      return res.status(403).json({ error: err.message });
    }
    if (err.message === "Document not found") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
};