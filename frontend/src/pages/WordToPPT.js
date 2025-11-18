import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom"; // Link, FaSignOutAlt, FaUpload removed
import { FaImages, FaFileAlt } from "react-icons/fa";
import { convertWord } from "../api";
import "../styles/wordtoppt.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import Sidebar from "../components/Sidebar"; // <-- 1. IMPORTED SIDEBAR

export default function WordToPPT() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [slides, setSlides] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [convertedSlides, setConvertedSlides] = useState(null);
  const [topic, setTopic] = useState("");
  // const [loggingOut, setLoggingOut] = useState(false); // <-- 2. REMOVED
  const fileInputRef = useRef(null);
  const loggedInUser = JSON.parse(localStorage.getItem("user")) || null;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [includeImagesChoice, setIncludeImagesChoice] = useState(true);

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

  const handleUpload = () => {
    if (!file) return alert("Please select a Word document first");
    if (file.size > 25 * 1024 * 1024) return alert("File too large (max 25MB)");
    if (!loggedInUser?.user_id)
      return alert("You must be logged in to convert and save history.");
    setIsModalOpen(true);
  };

  const handleConversionStart = async (includeImages) => {
    setIsModalOpen(false);
    setIncludeImagesChoice(includeImages);
    setIsLoading(true);
    setLoadingText("Uploading Word file...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slideCount", String(slides));
      formData.append("userId", String(loggedInUser.user_id));
      formData.append("includeImages", String(includeImages));

      const response = await convertWord(formData);

      const payload = response?.data;
      const slideArray = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.slides)
        ? payload.slides
        : [];

      if (!slideArray.length) {
        throw new Error("Conversion failed: unexpected server response");
      }

      const slidesWithId = slideArray.map((s, idx) => ({ ...s, id: idx }));
      setConvertedSlides(slidesWithId);
      setTopic(file.name.replace(/\.(docx|doc)$/i, ""));
      setLoadingText("Conversion completed!");
      alert("✅ Conversion successful! You can now preview or edit it.");
    } catch (err) {
      console.error("Word conversion error:", err);
      setLoadingText("Conversion failed.");
      alert(`❌ Conversion failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  // const handleLogout = () => { ... }; // <-- 3. REMOVED

  return (
    // 4. CHANGED to 'dashboard'
    <div className="dashboard">
      {/* 5. REPLACED old aside with Sidebar component */}
      <Sidebar activePage="dashboard" />

      {/* 6. CHANGED to 'main' */}
      <main className="main">
        <div className="ai-container wordtoppt">
          <header className="headerp">
            <div className="headerw-icon">DOCX</div>
            <div>
              <h1>Word to PPT Converter</h1>
              <p>Transform your Word documents into editable PowerPoint presentations</p>
            </div>
          </header>

          <div className="ai-content">
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

                {convertedSlides && (
                  <div className="success-card">
                    <div className="success-header">
                      <div className="success-icon">✓</div>
                      <div className="success-text">
                        <h3>Slides Generated!</h3>
                        <p>Your {convertedSlides.length} slides are ready to edit.</p>
                      </div>
                    </div>
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
                    {/* --- 7. CHANGED to text '–' --- */}
                    <button
                      type="button"
                      className="slide-btn minus"
                      onClick={() => setSlides((prev) => Math.max(1, prev - 1))}
                    >
                      –
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

                    {/* --- 8. CHANGED to text '+' --- */}
                    <button
                      type="button"
                      className="slide-btn plus"
                      onClick={() => setSlides((prev) => prev + 1)}
                    >
                      +
                    </button>
                  </div>
                  <span id="slide-count"> Total number of slides: {slides}</span>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="ai-right">
              <div className="ai-info-box">
                <h3>How it Works</h3>
                <ul>
                  <li>Summarizes your documents</li>
                  <li>Edit your content for clarity and conciseness</li>
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

      {/* Modal for Image/Text choice */}
      {isModalOpen && (
        <div className="ai-image-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="ai-image-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Image Generation</h2>
            <p>Do you want to include AI-generated images in your presentation?</p>
            
            <div className="ai-modal-buttons">
              <button className="ai-modal-btn text-only-btn" onClick={() => handleConversionStart(false)}>
                <span className="btn-icon">📄</span>
                <span className="btn-text">Text Only</span>
              </button>
              <button className="ai-modal-btn include-images-btn" onClick={() => handleConversionStart(true)}>
                <span className="btn-icon">🖼️</span>
                <span className="btn-text">Include Images</span>
              </button>
            </div>
            
            <button className="ai-modal-cancel" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}