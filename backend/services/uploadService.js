import fs from "fs/promises"; // Using promises for async/await
import path from "path";

const uploadDir = path.join(process.cwd(), "uploads");

/**
 * Business Logic: Get all template files from the uploads directory.
 */
export const listUploadedTemplates = async () => {
  try {
    const files = await fs.readdir(uploadDir);
    
    // Map to the format the frontend needs
    const templates = files.map((file) => ({
      name: file,
      url: `/uploads/${file}`,
    }));
    
    return templates;
  } catch (err) {
    console.error("Failed to read uploads folder:", err);
    throw new Error("Failed to retrieve templates.");
  }
};