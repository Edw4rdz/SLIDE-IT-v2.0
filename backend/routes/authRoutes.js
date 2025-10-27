import express from "express";
import {
  redirectToGoogleAuth,
  handleGoogleCallback,
  logout,
  getAuthStatus
} from "../controllers/googleAuthController.js";

const router = express.Router();

router.get("/auth/google", redirectToGoogleAuth);
router.get("/auth/google/callback", handleGoogleCallback);
router.get("/auth/logout", logout);
router.get("/auth/status", getAuthStatus);

export default router;