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
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: "25mb" })); // Increase limit for PDF base64
app.use(express.urlencoded({ extended: true }));

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
app.use("/api", adminRoutes); // <-- ADDED

// --- EXPORT APP ---
// We export 'app' so server.js can import it and start the server
export default app;