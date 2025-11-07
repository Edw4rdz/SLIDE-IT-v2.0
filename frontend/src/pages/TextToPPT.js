import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom"; // Link, FaSignOutAlt, FaUpload removed
import { FaImages, FaFileAlt } from "react-icons/fa";
import { convertText } from "../api";
import "../styles/texttoppt.css";
import Sidebar from "../components/Sidebar"; // <-- 1. IMPORTED SIDEBAR

export default function TextToPPT() {
  const [slides, setSlides] = useState(8);
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [convertedSlides, setConvertedSlides] = useState(null);
  const [topic, setTopic] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [includeImagesChoice, setIncludeImagesChoice] = useState(true);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  // const [loggingOut, setLoggingOut] = useState(false); // <-- 2. REMOVED
  const loggedInUser = JSON.parse(localStorage.getItem("user")) || null;

  // 🧩 Handle File Upload
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile || selectedFile.type !== "text/plain") {
      alert("Please upload a valid .txt file");
      setFile(null);
      return;
    }
    if (selectedFile.size > 25 * 1024 * 1024) {
      alert("File too large (max 25MB)");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = () => setFileContent(reader.result);
    reader.onerror = () => {
      alert("Error reading file.");
      setFile(null);
      setFileContent("");
    };
    reader.readAsText(selectedFile);
  };

  // 🚀 Open Modal for Choosing Option
  const handleConvert = () => {
    if (!file || !fileContent.trim()) return alert("Please upload a text file first");
    if (!loggedInUser?.user_id) return alert("You must be logged in to convert and save history.");
    setIsModalOpen(true);
  };

  // 🚀 Start Conversion After Choosing Option
  const handleConversionStart = async (includeImages) => {
    setIsModalOpen(false);
    setIncludeImagesChoice(includeImages);
    setIsLoading(true);
    setLoadingText("Converting text to slides...");

    try {
      const response = await convertText({
        text: fileContent,
        slides,
        userId: loggedInUser.user_id,
        fileName: file.name,
        includeImages: includeImages, // ✅ Added choice flag
      });

      if (response.data && Array.isArray(response.data)) {
        const slidesWithId = response.data.map((s, idx) => ({ ...s, id: idx }));
        setConvertedSlides(slidesWithId);
        setTopic(file.name.replace(".txt", ""));
        alert("✅ Conversion successful! You can now preview or edit slides.");
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

  return (
    <div className="dashboard">
      <Sidebar activePage="dashboard" />
      <main className="main">
        <div className="ai-container texttoppt">
          <header className="headerp">
            <div className="headerp-icon">TXT</div>
            <div>
              <h1>Text to PowerPoint Converter</h1>
              <p>Transform your plain text into AI-enhanced slides</p>
            </div>
          </header>

          <div className="ai-content">
            {/* Left */}
            <div className="ai-left">
              <div className="ai-card ai-card-top">
                <h2>Upload Your Text File</h2>
                <div
                  className="uploadp-area"
                  onClick={() => fileInputRef.current.click()}
                >
                  <div className="uploadp-icon">⬆</div>
                  {file ? (
                    <p className="file-name">📑 {file.name}</p>
                  ) : (
                    <h3>Drop or browse your .txt file</h3>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt"
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
                    "Convert Again"
                  ) : (
                    "Convert to PPT"
                  )}
                </button>

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

              <div className="ai-card">
                <h2>Customize Output</h2>
                <div className="ai-slider-section centered-slide-control">
                  <label htmlFor="slides">Number of Slides</label>
                  <div className="slide-control">
                    <button
                      className="slide-btn minus"
                      onClick={() => setSlides((prev) => Math.max(1, prev - 1))}
                    >
                      –
                    </button>
                    <input
                      type="number"
                      id="slides"
                      value={slides}
                      onChange={(e) => setSlides(parseInt(e.target.value) || 1)}
                      className="slide-input"
                    />
                    <button
                      className="slide-btn plus"
                      onClick={() => setSlides((prev) => prev + 1)}
                    >
                      +
                    </button>
                  </div>
                  <span id="slide-count">{slides} slides</span>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="ai-right">
              <div className="ai-info-box">
                <h3>How it Works</h3>
                <ol>
                  <li>Upload your text file.</li>
                  <li>Choose if you want AI-generated images.</li>
                  <li>AI automatically creates your presentation.</li>
                  <li>Preview and edit before download.</li>
                </ol>
              </div>

              <div className="ai-info-box">
                <h3>Tips</h3>
                <ul>
                  <li>Well-structured text gives better slides.</li>
                  <li>Keep content clear and concise.</li>
                  <li>Try 5–15 slides for best results.</li>
                  <li>Edit in the next page before downloading.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ✅ Modal */}
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