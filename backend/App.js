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

// --- SETUP ---
dotenv.config();
const app = express();
const __dirname = path.resolve(); // For serving static files

// --- MIDDLEWARE ---
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed origins or Vercel preview pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed === '*') return true;
      if (allowed === origin) return true;
      // Allow localhost on any port
      if (origin && /^https?:\/\/localhost:\d+$/i.test(origin)) return true;
      if (origin && /^https?:\/\/127\.0\.0\.1:\d+$/i.test(origin)) return true;
      // Allow any Vercel preview URL
      if (origin && origin.includes('.vercel.app')) return true;
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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

// --- EXPORT APP ---
// We export 'app' so server.js can import it and start the server
export default app;