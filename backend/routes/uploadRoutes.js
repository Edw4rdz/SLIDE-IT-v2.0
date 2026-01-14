import express from "express";
import { handleUpload, getTemplates, handleRefreshUrl } from "../controllers/uploadController.js";
import { upload } from "../middleware/multerConfig.js"; // Import our middleware

const router = express.Router();

// The 'upload.single("file")' middleware runs first.
// If it succeeds, it calls the 'handleUpload' controller.
router.post("/upload-template", upload.single("file"), handleUpload);

// Route to refresh presigned URLs
router.post("/refresh-url", handleRefreshUrl);

// This route just points to the 'getTemplates' controller.
router.get("/uploaded-templates", getTemplates);

export default router;