import express from "express";
import { 
  getAllUsers, 
  getAnalytics,
  createUser,      
  deleteUser,
  updateUserRole
} from "../controllers/adminController.js";
import { checkAdmin } from "../middleware/checkAdmin.js";

const router = express.Router();

router.use(checkAdmin);
router.get("/admin/users", getAllUsers);
router.get("/admin/analytics", getAnalytics);
router.post("/admin/user", createUser);
router.delete("/admin/user/:docId", deleteUser);
router.put("/admin/user/:docId/role", updateUserRole);
export default router;