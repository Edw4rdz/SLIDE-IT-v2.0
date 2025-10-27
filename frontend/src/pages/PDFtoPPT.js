import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaSignOutAlt, FaUpload } from "react-icons/fa";
import { convertPDF } from "../api"; // axios -> backend
import "./pdftoppt.css";
import "font-awesome/css/font-awesome.min.css";

export default function PDFToPPT() {
  const [slides, setSlides] = useState(15);
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [convertedSlides, setConvertedSlides] = useState(null);
  const [topic, setTopic] = useState("");
  const loggedInUser = JSON.parse(localStorage.getItem("user")) || null;

  // 🧩 Select File (No changes, this is perfect)
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    } else {
      alert("Please upload a valid PDF file");
      setFile(null);
    }
  };

  // 🚀 Upload + Convert PDF (FIXED)
  const handleUpload = async () => {
    if (!file) return alert("Please select a PDF first");
    if (file.size > 25 * 1024 * 1024) return alert("File too large (max 25MB)");

    // --- 1. ADDED USER CHECK ---
    if (!loggedInUser?.user_id) {
      return alert("You must be logged in to convert and save history.");
    }

    setIsLoading(true);
    setLoadingText("Reading PDF file..."); 

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        setLoadingText("Converting document...");
        const base64PDF = reader.result.split(",")[1];
        
        // This API call is already correct!
        const response = await convertPDF({
          base64PDF,
          slides,
          userId: loggedInUser.user_id,  // This is correct
          fileName: file.name          // This is correct
        });

        // --- 2. FIXED RESPONSE HANDLING ---
        // The backend now sends the slide array directly.
        // 'response.data' IS the array of slides.
        if (response.data && Array.isArray(response.data)) {
          
          // Add unique IDs for the EditPreview page
          const slidesWithId = response.data.map((s, idx) => ({ ...s, id: idx }));

          setConvertedSlides(slidesWithId);
          setTopic(file.name.replace(".pdf", ""));
          alert("✅ Conversion successful! You can now preview or edit it.");
        } else {
          alert("Conversion failed: Invalid response from server.");
        }
      } catch (err) {
        console.error(err);
        alert(`❌ Conversion failed: ${err.response?.data?.error || err.message}`);
      } finally {
        setIsLoading(false);
        setLoadingText(""); 
      }
    };
    
    reader.onerror = () => {
        console.error("Error reading the file.");
        alert("Error reading the file. Please try again.");
        setIsLoading(false);
        setLoadingText("");
    };

    reader.readAsDataURL(file);
  };

  // 🔒 Logout (No changes, this is perfect)
  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to log out?")) return;
    setLoggingOut(true);
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    setTimeout(() => navigate("/login"), 1000);
  };

  return (
    <div className="ai-dashboard">
      {/* Sidebar (No changes) */}
      <aside className="ai-sidebar">
        <div className="ai-logo">
          <i className="fa fa-magic"></i>
          <div className="logo-text">
            <h2>SLIDE-IT</h2>
            <p>Convert & Generate</p>
          </div>
        </div>

        <nav className="ai-nav">
          <div className="top-links">
            <Link to="/dashboard" className="active">
              <i className="fa fa-home"></i> Dashboard
            </Link>
            <Link to="/conversion">
              <i className="fa fa-history"></i> Drafts
            </Link>
            <Link to="/settings">
              <i className="fa fa-cog"></i> Settings
            </Link>
            <Link to="/uploadTemplate" className="upload-btn">
              <FaUpload className="icon" /> Upload Template
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

      {/* Main Content (No changes to JSX) */}
      <main className="ai-main">
        <div className="ai-container">
          <header className="headerp">
            <div className="headerp-icon">📄</div>
            <div>
              <h1>PDF to PowerPoint Converter</h1>
              <p>Transform your PDFs into editable and AI-enhanced slides</p>
            </div>
          </header>

          <div className="ai-content">
            {/* Left Column */}
            <div className="ai-left">
              {/* Upload Card */}
              <div className="ai-card ai-card-top">
                <h2>Upload Your PDF</h2>
                <div className="uploadp-area">
                  <div className="uploadp-icon">⬆</div>
                  <h3>
                    Drop your PDF here, or{" "}
                    <span
                      className="browsep"
                      onClick={() => fileInputRef.current.click()}
                    >
                      browse
                    </span>
                  </h3>
                  <p>Supports up to 25MB PDF files</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  {file && <p className="file-name">📑 {file.name}</p>}
                </div>

                <button
                  onClick={handleUpload}
                  className="uploadp-btn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="progress-bar-container">
                      <div className="progress-bar-indeterminate"></div>
                      <span className="progress-text">{loadingText}</span>
                    </div>
                  ) : convertedSlides ? ( // <-- ADDED THIS CHECK
                    "📝 Edit & Preview Slides"
                  ) : (
                    "Convert to PPT"
                  )}
                </button>

                {/* Show after successful conversion */}
                {convertedSlides && (
                  <div className="after-convert-actions">
                    <button
                      className="edit-preview-btn"
                      onClick={() =>
                        navigate("/edit-preview", { state: { slides: convertedSlides, topic } })
                      }
                    >
                      📝 Edit & Preview Slides
                    </button>
                  </div>
                )}


              </div>

              {/* Customization */}
              <div className="ai-card">
                <h2>Customize Output</h2>
                <div className="ai-slider-section">
                  <label htmlFor="slides">Number of Slides</label>
                  <input
                    type="range"
                    id="slides"
                    min="5"
                    max="30"
                    value={slides}
                    onChange={(e) => setSlides(parseInt(e.target.value))}
                  />
                  <span id="slide-count">{slides} slides</span>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="ai-right">
              <div className="ai-info-box">
                <h3>How it Works</h3>
                <ol>
                  <li>Upload your PDF document.</li>
                  <li>Choose the number of slides.</li>
                  <li>AI automatically creates your presentation.</li>
                  <li>Preview and edit it interactively before download.</li>
                </ol>
              </div>

              <div className="ai-info-box">
                <h3>Tips</h3>
                <ul>
                  <li>Text-based PDFs produce better slides.</li>
                  <li>Scanned images may have limited text extraction.</li>
                  <li>Try 10–20 slides for balanced detail.</li>
                  <li>Edit in the next page before downloading.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}