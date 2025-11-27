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
router.get("/users", getAllUsers);
router.get("/analytics", getAnalytics);
router.post("/user", createUser);
router.delete("/user/:docId", deleteUser);
router.put("/user/:docId/role", updateUserRole);
export default router;