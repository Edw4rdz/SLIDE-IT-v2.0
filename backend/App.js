import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

// Import all your route files
import googleAuthRoutes from "./routes/authRoutes.js";
import googleTemplateRoutes from "./routes/googleRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import templateRoutes from "./routes/templateRoutes.js";
import aiRoutes from "./routes/aiRoutes.js"; // Your new AI route
import userAuthRoutes from "./routes/userAuthRoutes.js"; // Your new login route
import historyRoutes from "./routes/historyRoutes.js"; // <-- 1. ADD THIS LINE

// --- SETUP ---
dotenv.config();
const app = express();
const __dirname = path.resolve(); // For serving static files

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: "25mb" })); // Increase limit for PDF base64
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'uploads' directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- ROUTES ---
// All your application's routes are now cleanly organized
app.use("/api", googleAuthRoutes);
app.use("/api", googleTemplateRoutes);
app.use("/api", uploadRoutes);
app.use("/api", templateRoutes);
app.use("/api", aiRoutes);
app.use("/api", userAuthRoutes);
app.use("/api", historyRoutes); // <-- 2. ADD THIS LINE

// --- EXPORT APP ---
// We export 'app' so server.js can import it and start the server
export default app;