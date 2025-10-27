import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads folder exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer storage settings
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

// Allow only PPTX files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    cb(null, true);
  } else {
    cb(new Error("Only .pptx files are allowed"), false);
  }
};

// Export the configured multer instance
export const upload = multer({ storage, fileFilter });