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
import historyRoutes from "./routes/historyRoutes.js";
import adminRoutes from "./routes/adminRoutes.js"; // <-- ADDED
import otpRoutes from "./routes/otpRoutes.js"; // OTP verification routes
import excelRoutes from "./routes/excelRoutes.js";

// --- SETUP ---
dotenv.config();
const app = express();
const __dirname = path.resolve(); // For serving static files

// --- MIDDLEWARE ---
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000'
];

app.use(cors({
  origin: true, // Allow all origins for local development
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "25mb" })); // Increase limit for PDF base64
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyLog = { ...req.body };
    // Don't log file buffers or large data
    if (bodyLog.file) bodyLog.file = '[FILE DATA]';
    if (bodyLog.slides && Array.isArray(bodyLog.slides)) {
      bodyLog.slides = `[${bodyLog.slides.length} slides]`;
    }
    console.log('Body:', bodyLog);
  }
  next();
});

// Serve static files from the 'uploads' directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- ROUTES ---
// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'SLIDE-IT API is running', status: 'OK' });
});

// All your application's routes are now cleanly organized
app.use("/api", googleAuthRoutes);
app.use("/api", googleTemplateRoutes);
app.use("/api", uploadRoutes);
app.use("/api", templateRoutes);
app.use("/api", aiRoutes);
app.use("/api", userAuthRoutes);
app.use("/api", historyRoutes);
app.use("/api/admin", adminRoutes); // <-- ADDED
app.use("/api/otp", otpRoutes); // OTP verification endpoints
app.use("/api/excel", excelRoutes);

// --- EXPORT APP ---
// We export 'app' so server.js can import it and start the server
export default app;