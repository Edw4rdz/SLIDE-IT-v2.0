import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { convertExcel } from "../api";
import "../styles/exceltoppt.css";
import Sidebar from "../components/Sidebar";

export default function ExcelToPPT() {
  const [file, setFile] = useState(null);
  const [slidesCount, setSlidesCount] = useState(8);
  const [convertedSlides, setConvertedSlides] = useState(null);
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const loggedInUser = JSON.parse(localStorage.getItem("user")) || null;

  // Handle file selection (No changes, this is perfect)
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (
      selectedFile.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      selectedFile.type === "application/vnd.ms-excel"
    ) {
      setFile(selectedFile);
    } else {
      alert("Please upload a valid Excel file (.xlsx or .xls)");
      setFile(null);
    }
  };

  // 🚀 Upload + Convert Excel (FIXED)
  const handleConvert = async () => {
    if (!file) return alert("Please select an Excel file first");
    if (file.size > 50 * 1024 * 1024) return alert("File too large (max 50MB)");

    if (!loggedInUser?.user_id) {
      return alert("You must be logged in to convert and save history.");
    }

    setIsLoading(true);
    setLoadingText("Uploading Excel file...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slideCount", String(slidesCount));
      formData.append("userId", String(loggedInUser.user_id));

      const response = await convertExcel(formData);

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
      setTopic(file.name.replace(/\.(xlsx|xls)$/i, ""));
      alert("✅ Conversion successful! You can now preview or edit it.");
    } catch (err) {
      console.error("Excel conversion error:", err);
      alert(`❌ Conversion failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  return (
    <div className="dashboard">
      <Sidebar activePage="dashboard" />

      <main className="main">
        <div className="ai-container exceltoppt">
          <header className="headerp">
            <div className="headerp-icon">XLSX</div>
            <div>
              <h1>Excel to PPT Converter</h1>
              <p>Transform your Excel sheets into editable AI slides</p>
            </div>
          </header>

          <div className="ai-content">
            {/* Left */}
            <div className="ai-left">
              <div className="ai-card ai-card-top">
                <h2>Upload Your Excel File</h2>
                <div
                  className="uploadp-area"
                  onClick={() => fileInputRef.current.click()}
                >
                  <div className="uploadp-icon">⬆</div>
                  {file ? (
                    <p className="file-name">📑 {file.name}</p>
                  ) : (
                    <h3>Drop or browse your .xlsx file</h3>
                  )}
                  <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '8px' }}>
                    Supports .xlsx and .xls up to 50MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                </div>

                <button
                  onClick={handleConvert}
                  className="uploadp-btn"
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
                    "Convert to PowerPoint"
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
                          state: { slides: convertedSlides, topic },
                        })
                      }
                    >
                      📝 Edit & Preview Slides
                    </button>
                  </div>
                )}
              </div>

              <div className="ai-card">
                <h2>Customize Your Presentation</h2>
                <div className="ai-slider-section centered-slide-control">
                  <label htmlFor="slidesCount">Number of Slides</label>
                  <div className="slide-control">
                    <button
                      className="slide-btn minus"
                      onClick={() => setSlidesCount((prev) => Math.max(1, prev - 1))}
                    >
                      –
                    </button>
                    <input
                      type="number"
                      id="slidesCount"
                      value={slidesCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val >= 1) setSlidesCount(val);
                      }}
                      className="slide-input"
                    />
                    <button
                      className="slide-btn plus"
                      onClick={() => setSlidesCount((prev) => prev + 1)}
                    >
                      +
                    </button>
                  </div>
                  <span id="slide-count">Total Slides: {slidesCount}</span>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="ai-right">
              <div className="ai-info-box">
                <h3>How it Works</h3>
                <ol>
                  <li>Upload your Excel document.</li>
                  <li>Choose number of slides.</li>
                  <li>AI automatically creates your presentation.</li>
                  <li>Preview & edit slides interactively before download.</li>
                </ol>
              </div>

              <div className="ai-info-box">
                <h3>Tips</h3>
                <ul>
                  <li>Include well-structured headers for better results.</li>
                  <li>Keep large files under 50MB.</li>
                  <li>Use 5–15 slides for balanced detail.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}