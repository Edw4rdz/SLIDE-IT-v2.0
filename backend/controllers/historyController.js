import { getHistory, deleteHistory } from "../services/historyService.js";

// Simple in-memory rate limiter (prevents spam from same user)
const rateLimitCache = new Map();
const RATE_LIMIT_WINDOW = 2000; // 2 seconds

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
    
    // Rate limiting: allow 1 request per 2 seconds per user
    const lastRequest = rateLimitCache.get(userId);
    const now = Date.now();
    if (lastRequest && (now - lastRequest) < RATE_LIMIT_WINDOW) {
      console.log(`[Rate Limited] User ${userId} - too many requests`);
      return res.status(429).json({ error: "Too many requests, please wait" });
    }
    rateLimitCache.set(userId, now);
    
    const historyList = await getHistory(String(userId));
    res.json(historyList);
    
  } catch (err) {
    // Check if this is a Firebase quota error
    if (err.code === 8 || err.message?.includes('Quota exceeded')) {
      console.log(`⚠️  Firebase quota exceeded - returning empty history for user ${req.query.userId}`);
      return res.json([]); // Return empty array so app still works
    }
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