import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaSignOutAlt, FaUpload, FaImages, FaFileAlt } from "react-icons/fa";
import { convertWord } from "../api";
import "./wordtoppt.css";
import "font-awesome/css/font-awesome.min.css";

export default function WordToPPT() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [slides, setSlides] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [convertedSlides, setConvertedSlides] = useState(null);
  const [topic, setTopic] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const fileInputRef = useRef(null);
  const loggedInUser = JSON.parse(localStorage.getItem("user")) || null;

  // ✅ New modal state and image choice
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [includeImagesChoice, setIncludeImagesChoice] = useState(true);

  // 📂 File selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (
      selectedFile &&
      (selectedFile.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        selectedFile.type === "application/msword")
    ) {
      setFile(selectedFile);
    } else {
      alert("Please upload a valid Word file (.docx or .doc)");
      setFile(null);
    }
  };

  // ✅ Instead of converting directly, open modal first
  const handleUpload = () => {
    if (!file) return alert("Please select a Word document first");
    if (file.size > 25 * 1024 * 1024) return alert("File too large (max 25MB)");
    if (!loggedInUser?.user_id)
      return alert("You must be logged in to convert and save history.");
    setIsModalOpen(true);
  };

  // ✅ Handles the conversion after user chooses option
  const handleConversionStart = async (includeImages) => {
    setIsModalOpen(false);
    setIncludeImagesChoice(includeImages);
    setIsLoading(true);
    setLoadingText("Reading Word file...");

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      setLoadingText("Converting Word to slides...");
      const base64Word = reader.result.split(",")[1];

      try {
        const response = await convertWord({
          base64Word,
          slides,
          userId: loggedInUser.user_id,
          fileName: file.name,
          includeImages: includeImages, // ✅ Added this line
        });

        if (response.data && Array.isArray(response.data)) {
          const slidesWithId = response.data.map((s, idx) => ({ ...s, id: idx }));
          setConvertedSlides(slidesWithId);
          setTopic(file.name.replace(/\.(docx|doc)/i, ""));
          setLoadingText("Conversion completed!");
          alert("✅ Conversion successful! You can now preview or edit it.");
        } else {
          setLoadingText("Conversion failed.");
          alert("Conversion failed: Invalid response from server.");
        }
      } catch (err) {
        console.error("Word conversion error:", err);
        setLoadingText("Conversion failed.");
        alert(`❌ Conversion failed: ${err.response?.data?.error || err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      alert("Failed to read Word file. Please try again.");
      setIsLoading(false);
      setLoadingText("");
    };
  };

  // 🔒 Logout
  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to log out?")) return;
    setLoggingOut(true);
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    setTimeout(() => navigate("/login"), 1000);
  };

  return (
    <div className="ai-dashboard">
      {/* Sidebar */}
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

      {/* Main Content */}
      <main className="mainw">
        <div className="containerw">
          <header className="header">
            <div className="headerw-icon">DOCX</div>
            <div>
              <h1>Word to PPT Converter</h1>
              <p>Transform your Word documents into editable PowerPoint presentations</p>
            </div>
          </header>

          <div className="contentw-grid">
            {/* Left Column */}
            <div className="ai-left">
              <div className="ai-card ai-card-top">
                <h2>Upload Your Word Document</h2>
                <div className="uploadw-area">
                  <div className="uploadw-icon">⬆</div>
                  <h3>
                    Drop your Word document here, or{" "}
                    <span className="browsew" onClick={() => fileInputRef.current.click()}>
                      browse
                    </span>
                  </h3>
                  <p>Supports .docx and .doc files up to 25MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="file-input"
                    accept=".docx,.doc,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  {file && <p className="file-name">📑 {file.name}</p>}
                </div>

                {/* Convert button now opens modal */}
                <button
                  onClick={handleUpload}
                  className="convertw-btn"
                  disabled={isLoading || !file}
                >
                  {isLoading ? (
                    <div className="progress-bar-container">
                      <div className="progress-bar-indeterminate"></div>
                      <span className="progress-text">{loadingText}</span>
                    </div>
                  ) : convertedSlides ? (
                    "✅ Converted! Edit Now"
                  ) : (
                    "Convert to PPT"
                  )}
                </button>

                {/* Edit/Preview button after conversion */}
                {convertedSlides && (
                  <div className="after-convert-actions">
                    <button
                      className="edit-preview-btn"
                      onClick={() =>
                        navigate("/edit-preview", {
                          state: {
                            slides: convertedSlides,
                            topic,
                            includeImages: includeImagesChoice,
                          },
                        })
                      }
                    >
                      📝 Edit & Preview Slides
                    </button>
                  </div>
                )}
              </div>

              {/* Customize Slides */}
              <div className="ai-card">
  <h2>Customize Output</h2>
  <div className="ai-slider-section">
    <label htmlFor="slides">Number of Slides</label>
    <div className="slide-input-group">
      <button
        type="button"
        className="slide-btn minus"
        onClick={() => setSlides((prev) => Math.max(1, prev - 1))}
      >
        ➖
      </button>

      <input
        type="number"
        id="slides"
        min="1"
        value={slides}
        onChange={(e) => {
          const value = parseInt(e.target.value);
          if (!isNaN(value) && value >= 1) setSlides(value);
        }}
        className="slide-input"
      />

      <button
        type="button"
        className="slide-btn plus"
        onClick={() => setSlides((prev) => prev + 1)}
      >
        ➕
      </button>
    </div>
    <span id="slide-count"> Total number of slides: {slides}</span>
  </div>
</div>

            </div>

            {/* Right Column */}
            <div className="ai-right">
              <div className="ai-info-box">
                <h3>Smart Conversion</h3>
                <ul>
                  <li>Automatic heading detection</li>
                  <li>Preserves formatting and styles</li>
                  <li>Converts tables and lists</li>
                  <li>Imports images and graphics</li>
                  <li>Creates professional layouts</li>
                </ul>
              </div>
              <div className="ai-info-box">
                <h3>Supported Formats</h3>
                <ul>
                  <li>Microsoft Word (.docx)</li>
                  <li>Word 97–2003 (.doc)</li>
                  <li>Up to 25MB file size</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ✅ Modal for Image/Text choice */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Image Generation</h2>
            <p>Do you want to include AI-generated images in your presentation?</p>
            <div className="modal-buttons">
              <button
                className="modal-btn btn-text"
                onClick={() => handleConversionStart(false)}
              >
                <FaFileAlt /> Text Only
              </button>
              <button
                className="modal-btn btn-image"
                onClick={() => handleConversionStart(true)}
              >
                <FaImages /> Include Images
              </button>
            </div>
            <button
              className="modal-btn-cancel"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
