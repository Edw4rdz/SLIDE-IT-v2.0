import { listUploadedTemplates } from "../services/uploadService.js";

/**
 * Controller Logic: Handle the response for a successful upload.
 */
export const handleUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded or invalid file type" });
  }

  // The 'upload' middleware already did the work.
  // This controller just formats the successful response.
  res.json({
    success: true,
    message: "Template uploaded successfully",
    file: {
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`,
      mimetype: req.file.mimetype,
      size: req.file.size,
    },
  });
};

/**
 * Controller Logic: Get the list of templates and send as JSON.
 */
export const getTemplates = async (req, res) => {
  try {
    // 1. Call the service
    const templates = await listUploadedTemplates();
    // 2. Send response
    res.json(templates);
  } catch (err) {
    // 3. Handle errors
    res.status(500).json({ success: false, message: err.message });
  }
};