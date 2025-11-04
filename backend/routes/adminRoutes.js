import express from "express";
import { 
  getAllUsers, 
  getAnalytics 
} from "../controllers/adminController.js";
import { checkAdmin } from "../middleware/checkAdmin.js";

const router = express.Router();

// 1. Apply the 'checkAdmin' middleware to ALL routes in this file.
// This is the gatekeeper that protects your admin dashboard data.
router.use(checkAdmin);

// 2. Define the routes
// GET /api/admin/users
// (Protected) Gets all registered users
router.get("/admin/users", getAllUsers);

// GET /api/admin/analytics
// (Protected) Gets feature usage insights
router.get("/admin/analytics", getAnalytics);

export default router;