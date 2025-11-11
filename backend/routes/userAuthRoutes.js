import express from "express";
import { login, register, checkEmailExists } from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/check-email", checkEmailExists);

export default router;