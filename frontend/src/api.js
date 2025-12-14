import axios from "axios";
import { notify } from "./utils/notify";

// --- CONFIGURATION ---

const API_BASE = process.env.REACT_APP_BACKEND_URL 
  ? `${process.env.REACT_APP_BACKEND_URL.replace(/\/$/, '')}/api` 
  : "http://localhost:5000/api";

// --- SIMPLE CACHE ---
const cache = {
  data: {},
  timestamps: {},
  TTL: 5 * 60 * 1000, // 5 minutes
  
  get(key) {
    const now = Date.now();
    if (this.data[key] && (now - this.timestamps[key]) < this.TTL) {
      console.log(`[Cache HIT] ${key}`);
      return this.data[key];
    }
    console.log(`[Cache MISS] ${key}`);
    return null;
  },
  
  set(key, value) {
    this.data[key] = value;
    this.timestamps[key] = Date.now();
  },
  
  invalidate(pattern) {
    Object.keys(this.data).forEach(key => {
      if (key.includes(pattern)) {
        delete this.data[key];
        delete this.timestamps[key];
      }
    });
  }
};

// Export cache for manual invalidation after conversions
export { cache };

// --- AUTH & USER ENDPOINTS ---
export const registerUser = (data) => axios.post(`${API_BASE}/register`, data);
export const loginUser = (data) => axios.post(`${API_BASE}/login`, data);
export const checkEmailExists = (email) => axios.post(`${API_BASE}/check-email`, { email });

// --- AI GENERATION ENDPOINTS (Grok 4.1) ---
// IMPORTANT: 'data' for file conversions must be a FormData object containing 'file' and 'slideCount'
export const convertPDF = (data) => axios.post(`${API_BASE}/convert-pdf`, data);
export const convertWord = (data) => axios.post(`${API_BASE}/convert-word`, data);
export const convertText = (data) => axios.post(`${API_BASE}/convert-text`, data); 
export const convertExcel = (data) => axios.post(`${API_BASE}/convert-excel`, data);

// IMPORTANT: 'data' for topics is a JSON object: { topic: "...", slideCount: 10 }
export const generateSlides = (data) => axios.post(`${API_BASE}/generate-topics`, data);

// --- TEMPLATE & HISTORY ENDPOINTS ---
export const uploadTemplate = (formData) =>
  axios.post(`${API_BASE}/upload-template`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getTemplates = () => axios.get(`${API_BASE}/templates/list`);

export const getHistory = async (userId) => {
  const cacheKey = `history-${userId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  const response = await axios.get(`${API_BASE}/conversions`, { params: { userId } });
  cache.set(cacheKey, response);
  return response;
};

export const deleteHistory = async (id, userId) => {
  const response = await axios.delete(`${API_BASE}/conversions/${id}`, { params: { userId } });
  cache.invalidate(`history-${userId}`); // Clear cache after delete
  return response;
};

// --- STATIC DATA ---
export const prebuiltTemplates = [
  {
    id: 'template1',
    name: 'Modern Blue',
    colors: ['#003366', '#0099cc'],
    images: ['modern-bg.png'],
    slides: [
      {
        id: 'slide1',
        title: 'Welcome to Modern Blue',
        bullets: ['Clean Design', 'Professional Look', 'Easy to Customize'],
        layout: 'title',
      },
      {
        id: 'slide2',
        title: 'About Us',
        bullets: ['Our Mission', 'Our Team', 'Our Vision'],
        layout: 'content',
      },
    ],
  },
  {
    id: 'template2',
    name: 'Creative Sunset',
    colors: ['#ff7e5f', '#feb47b'],
    images: ['sunset-bg.png'],
    slides: [
      {
        id: 'slide1',
        title: 'Creative Sunset Theme',
        bullets: ['Warm Colors', 'Relaxed Vibe', 'Beautiful Gradient'],
        layout: 'title',
      },
    ],
  },
];

// --- IMAGE GENERATION HELPER (via backend proxy) ---
export const generateImageFromPollinations = async (prompt) => {
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") return null;
  try {
    const res = await axios.post(`${API_BASE}/generate-image`, { prompt });
    if (res.data && res.data.success && res.data.base64) {
      // Always return as a data URL
      return `data:image/png;base64,${res.data.base64}`;
    }
    return null;
  } catch (err) {
    console.warn("Pollinations backend proxy failed:", err.message);
    return null;
  }
};

// --- GOOGLE IMAGEN HELPER (via backend proxy) ---
export const generateImageFromImagen = async (prompt) => {
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") return null;
  try {
    const res = await axios.post(`${API_BASE}/generate-imagen-image`, { prompt });
    if (res.data && res.data.success && res.data.base64) {
      return `data:image/png;base64,${res.data.base64}`;
    }
    return null;
  } catch (err) {
    console.warn("Imagen generation backend proxy failed:", err.message);
    return null;
  }
};

// --- PRESIGNED URL HELPER ---
// Get a fresh presigned URL from an S3 key
export const getFreshPresignedUrl = async (key) => {
  if (!key || typeof key !== "string" || key.trim() === "") return null;
  try {
    const res = await axios.post(`${API_BASE}/presigned-url`, { key });
    if (res.data && res.data.success && res.data.url) {
      return res.data.url;
    }
    return null;
  } catch (err) {
    console.warn("Failed to get fresh presigned URL:", err.message);
    return null;
  }
};

// Helper function to check if a URL is an S3 presigned URL
export const isS3PresignedUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('.s3.') && url.includes('X-Amz-');
};

// Helper function to refresh expired S3 presigned URLs
export const refreshPresignedUrlIfNeeded = async (slide) => {
  console.log('[refreshPresignedUrlIfNeeded] Checking slide:', slide.id, {
    hasUploadedImageKey: !!slide.uploadedImageKey,
    hasUploadedImage: !!slide.uploadedImage,
    isPresignedUrl: slide.uploadedImage ? isS3PresignedUrl(slide.uploadedImage) : false,
    uploadedImageKey: slide.uploadedImageKey,
    uploadedImagePreview: slide.uploadedImage?.substring(0, 100)
  });
  
  // If slide has uploadedImageKey and the URL looks like a presigned URL, refresh it
  if (slide.uploadedImageKey && slide.uploadedImage && isS3PresignedUrl(slide.uploadedImage)) {
    try {
      console.log('[refreshPresignedUrlIfNeeded] Requesting fresh URL for key:', slide.uploadedImageKey);
      const freshUrl = await getFreshPresignedUrl(slide.uploadedImageKey);
      if (freshUrl) {
        console.log('[refreshPresignedUrlIfNeeded] Got fresh URL:', freshUrl.substring(0, 100));
        return { ...slide, uploadedImage: freshUrl };
      } else {
        console.warn('[refreshPresignedUrlIfNeeded] No fresh URL returned');
      }
    } catch (err) {
      console.warn('[refreshPresignedUrlIfNeeded] Failed to refresh presigned URL for slide:', err);
    }
  } else {
    console.log('[refreshPresignedUrlIfNeeded] Skipping refresh - conditions not met');
  }
  return slide;
};

// --- POWERPOINT EXPORT LOGIC (via backend) ---
export const downloadPPTX = async (slides, design, fileName, includeImages = true, imageProvider = 'pollinations') => {
  try {
    const safeName = typeof fileName === "string" && fileName.trim().length
      ? fileName.trim()
      : "presentation";
    const downloadName = safeName.toLowerCase().endsWith(".pptx")
      ? safeName
      : `${safeName}.pptx`;

    const response = await axios.post(
      `${API_BASE}/generate-pptx`,
      {
        slides,
        design,
        fileName: downloadName,
        includeImages,
        imageProvider
      },
      { responseType: "blob" }
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", downloadName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Error generating PPTX:", err);
    notify("Failed to generate PPTX file. Check console for details.", "error");
  }
};