// src/pages/CustomizeTemplate.js
import React, { useState, useEffect } from "react";
import { notify } from "../utils/notify";
import { Link, useNavigate } from "react-router-dom";
import { FaSignOutAlt, FaUpload } from "react-icons/fa";
import { motion, Reorder } from "framer-motion";
import { downloadPPTX } from "../api";
import "../styles/customize-template.css";
import "../styles/dashboard.css";
import ConfirmDialog from "../components/ConfirmDialog";

// Sidebar Component
const Sidebar = ({ handleLogout, loggingOut }) => (
  <aside className="sidebar neon-glow">
    <div className="logo">
      <div>
        <h2>SLIDE-IT</h2>
        <p>Convert & Generate</p>
      </div>
    </div>
    <nav className="sidebar-links">
      <div className="top-links">
        <Link to="/dashboard"><i className="fa fa-home" /> Dashboard</Link>
        <Link to="/conversion"><i className="fa fa-history" /> Drafts</Link>
        <Link to="/settings"><i className="fa fa-cog" /> Settings</Link>
        <Link to="/uploadTemplate" className="upload-btn">
          <FaUpload className="icon" /> Manage Template
        </Link>
        <Link to="/customize-template" className="upload-btn active">
          <i className="fa fa-pencil" /> Customize
        </Link>
      </div>
      <div className="bottom-links">
        <div className="logout-btn" onClick={handleLogout}>
          <FaSignOutAlt className="icon" /> Logout
          {loggingOut && <div className="spinner-small"></div>}
        </div>
      </div>
    </nav>
  </aside>
);

// Helper for readable colors
// eslint-disable-next-line no-unused-vars
const getReadableColor = (bg, light = "#FFF", dark = "#000") => {
  if (!bg) return dark;
  if (bg.includes("gradient")) return light;
  const hex = bg.replace("#", "");
  if (hex.length !== 6) return light;
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? dark : light;
};

// Helper for parsing CSS gradients
// eslint-disable-next-line no-unused-vars
const parseGradientColors = (gradientStr) => {
  if (!gradientStr || typeof gradientStr !== "string") return null;
  const matches = gradientStr.match(/#([0-9A-Fa-f]{3,6})/g);
  return matches || null;
};

export default function CustomizeTemplate() {
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [slides, setSlides] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, index: null });
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    const savedTemplate = localStorage.getItem("selectedTemplate");
    if (savedTemplate) {
      try {
        const parsed = JSON.parse(savedTemplate);
        if (parsed?.slides?.length) {
          setTemplate(parsed);
          setSlides(parsed.slides);
        } else throw new Error("Invalid template data");
      } catch {
        notify("Invalid template data. Redirecting...", "error");
        navigate("/uploadTemplate");
      }
    } else {
      notify("No template selected.", "error");
      navigate("/uploadTemplate");
    }
  }, [navigate]);

  const handleTitleChange = (i, val) => {
    const updated = [...slides];
    updated[i].title = val;
    setSlides(updated);
  };

  const handleBulletsChange = (i, val) => {
    const updated = [...slides];
    updated[i].bullets = val.split("\n").filter(Boolean);
    setSlides(updated);
  };

  const handleAddSlide = () => {
    const newSlide = {
      title: `New Slide ${slides.length + 1}`,
      bullets: ["Your first point here"],
    };
    setSlides([...slides, newSlide]);
  };

  const handleDeleteSlide = (index) => {
    if (slides.length === 1) {
      notify("You must have at least one slide.", "error");
      return;
    }
    setDeleteConfirm({ open: true, index });
  };

  // ✅ Generate PPTX with consistent gradient
  // ✅ Generate PPTX with consistent gradient
 const handleGenerate = async () => {
   if (!template) return notify("Missing template data.", "error");

   // Prepare slides data (no changes needed here)
   const updatedSlides = slides.map((s) => ({
     title: s.title?.trim() || "Untitled Slide",
     bullets: s.bullets?.filter(Boolean) || ["No content provided"],
     // Ensure imagePrompt logic is consistent with how downloadPPTX uses it
     imagePrompt: s.imagePrompt || s.title || "Presentation Slide",
   }));

   // --- ⬇️ *** FIX: Explicitly define the design for download *** ⬇️ ---
   // Use the intended gradient background and corresponding colors/font
   // This ensures the download uses the same style as the preview
   const backgroundForDownload = template.background && template.background.includes('gradient')
        ? template.background // Use the gradient string if present in the template data
        : "linear-gradient(135deg, #1e134b, #3e287a)"; // Hardcoded fallback gradient (same as preview)

   const design = {
     // Use the explicit gradient string for downloadPPTX to parse
     background: backgroundForDownload,
     gradientAngle: 135, // Keep the angle consistent
     // Use the corresponding title/text colors for the dark theme
     titleColor: template.titleColor || "#FFFFFF", // White title
     textColor: template.textColor || "#E0E0E0", // Light text
     font: template.font || 'Arial, sans-serif', // Use template font or fallback
     accent: template.accent || "#00e5ff", // Optional accent color
     // Ensure other potential properties expected by downloadPPTX are included if needed
     // backgroundImage: template.backgroundImage || "",
     // cardStyle: template.cardStyle || "frosted",
   };
   // --- End Fix ---

   setIsGenerating(true);
   try {
     // Pass the explicitly defined 'design' object
     await downloadPPTX(updatedSlides, design, `${template.name || 'presentation'}-customized.pptx`);
     notify("Presentation generated successfully!", "success");
   } catch (err) {
     console.error("❌ Error generating presentation:", err);
     notify("Something went wrong while generating the PowerPoint.", "error");
   } finally {
     setIsGenerating(false);
   }
 };
  const handleLogout = () => {
    setLogoutConfirmOpen(true);
  };
  const confirmLogout = () => {
    setLogoutConfirmOpen(false);
    setLoggingOut(true);
    localStorage.clear();
    setTimeout(() => navigate("/login"), 1200);
  };

  if (!template)
    return (
      <div className="dashboard">
        <main className="main loading">Loading template...</main>
      </div>
    );

  // ✅ Build theme with gradient preview
  const theme = {
    font: template.font || "'Poppins', sans-serif",
    background:
      template.background ||
      "linear-gradient(135deg,#0A1F44,#092F6B,#005E90)",
    titleColor: template.titleColor || "#ffffff",
    textColor: template.textColor || "#e0e0e0",
    accent: template.accent || "#00bcd4",
    cardStyle: template.cardStyle || "frosted",
  };

  // Generate gradient background style for live preview
  const backgroundStyle = Array.isArray(theme.background)
    ? { background: `linear-gradient(135deg, ${theme.background.join(", ")})` }
    : { background: theme.background };

  return (
    <div className="dashboard gamma-template" style={backgroundStyle}>
      <div className="background-layer"></div>
      <div className="background-overlay"></div>

      <Sidebar handleLogout={handleLogout} loggingOut={loggingOut} />

      <motion.main
        className="main main-edit-preview content-inner"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="page-title">
          ⚡ Customize Template: {template.name || "Untitled"}
        </h1>

        {/* 🧩 Editable slides */}
        <Reorder.Group axis="y" onReorder={setSlides} values={slides} className="slides-editor">
          {slides.map((slide, index) => (
            <Reorder.Item key={index} value={slide}>
              <motion.div
                className="slide-card"
                whileHover={{ scale: 1.04 }}
                transition={{ type: "spring", stiffness: 180 }}
              >
                <div className="slide-header">
                  <h3>Slide {index + 1}</h3>
                  <button
                    className="delete-slide-btn"
                    onClick={() => handleDeleteSlide(index)}
                  >
                    ✖
                  </button>
                </div>

                <input
                  type="text"
                  value={slide.title}
                  onChange={(e) => handleTitleChange(index, e.target.value)}
                  placeholder="Enter slide title"
                  className="slide-title"
                />
                <textarea
                  value={slide.bullets.join("\n")}
                  onChange={(e) => handleBulletsChange(index, e.target.value)}
                  placeholder="Enter bullet points (one per line)"
                  rows="5"
                  className="slide-bullets"
                />
              </motion.div>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        <div className="add-slide-container">
          <button onClick={handleAddSlide} className="add-slide-btn">
            ➕ Add New Slide
          </button>
        </div>

        <div className="edit-actions">
          <button
            onClick={handleGenerate}
            className="generate-button glow-btn"
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "💾 Save & Generate PPTX"}
          </button>
          <button onClick={() => navigate("/UploadTemplate")} className="cancel-button">
            Cancel
          </button>
        </div>
      </motion.main>
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Slide"
        message="Delete this slide?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          const idx = deleteConfirm.index;
          setDeleteConfirm({ open: false, index: null });
          if (typeof idx === 'number') {
            const updated = slides.filter((_, i) => i !== idx);
            setSlides(updated);
          }
        }}
        onCancel={() => setDeleteConfirm({ open: false, index: null })}
      />
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Logout"
        message="Are you sure you want to log out?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </div>
  );
}

// Render dialogs within component tree
// eslint-disable-next-line no-unused-vars
const CustomizeTemplateDialogsRenderer = ({ deleteConfirm, setDeleteConfirm, slides, setSlides, logoutConfirmOpen, setLogoutConfirmOpen, confirmLogout }) => (
  <>
    <ConfirmDialog
      open={deleteConfirm.open}
      title="Delete Slide"
      message="Delete this slide?"
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={() => {
        const idx = deleteConfirm.index;
        setDeleteConfirm({ open: false, index: null });
        if (typeof idx === 'number') {
          const updated = slides.filter((_, i) => i !== idx);
          setSlides(updated);
        }
      }}
      onCancel={() => setDeleteConfirm({ open: false, index: null })}
    />
    <ConfirmDialog
      open={logoutConfirmOpen}
      title="Logout"
      message="Are you sure you want to log out?"
      confirmText="Logout"
      cancelText="Cancel"
      onConfirm={confirmLogout}
      onCancel={() => setLogoutConfirmOpen(false)}
    />
  </>
);

// Confirm Dialogs
// Render at root to keep UI consistent
// Placed after main component return
export function CustomizeTemplateDialogs({ deleteConfirm, setDeleteConfirm, slides, setSlides, logoutConfirmOpen, setLogoutConfirmOpen, confirmLogout }) {
  const confirmDelete = () => {
    const idx = deleteConfirm.index;
    setDeleteConfirm({ open: false, index: null });
    if (typeof idx === 'number') {
      const updated = slides.filter((_, i) => i !== idx);
      setSlides(updated);
    }
  };
  return (
    <>
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Slide"
        message="Delete this slide?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, index: null })}
      />
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Logout"
        message="Are you sure you want to log out?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </>
  );
}
