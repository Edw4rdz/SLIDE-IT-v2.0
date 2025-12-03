import React, { useState, useRef } from "react";
import { notify } from "../utils/notify";
import { useNavigate } from "react-router-dom";
import { convertWord, cache } from "../api";
import "../styles/wordtoppt.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import Sidebar from "../components/Sidebar";
import AIProviderModal from "../components/AIProviderModal";
import ImageProviderModal from "../components/ImageProviderModal";

export default function WordToPPT() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [slides, setSlides] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [convertedSlides, setConvertedSlides] = useState(null);
  const [topic, setTopic] = useState("");
  const fileInputRef = useRef(null);

  const loggedInUser = JSON.parse(localStorage.getItem("user")) || null;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showImageProviderModal, setShowImageProviderModal] = useState(false);
  const [includeImagesChoice, setIncludeImagesChoice] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState("grockai");
  const [selectedImageProvider, setSelectedImageProvider] = useState("pollinations");

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
      notify("Please upload a valid Word file (.docx or .doc)", "error");
      setFile(null);
    }
  };

  const handleConvert = () => {
    if (!file) return notify("Please select a Word document first", "error");
    if (!loggedInUser?.user_id)
      return notify("You must be logged in to convert and save history.", "error");
    setShowProviderModal(true);
  };

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    setShowProviderModal(false);
    setIsModalOpen(true);
  };

  const handleImageChoice = (includeImages) => {
    setIsModalOpen(false);
    setIncludeImagesChoice(includeImages);
    if (includeImages) {
      setShowImageProviderModal(true);
    } else {
      handleConversionStart(false, null);
    }
  };

  const handleImageProviderSelect = (provider) => {
    setSelectedImageProvider(provider);
    setShowImageProviderModal(false);
    handleConversionStart(true, provider);
  };

  const handleConversionStart = async (includeImages, imgProvider) => {
    setIsLoading(true);
    setLoadingText("Uploading Word file...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slideCount", String(slides));
      formData.append("userId", String(loggedInUser.user_id));
      formData.append("includeImages", String(includeImages));
      formData.append("provider", selectedProvider);
      if (imgProvider) {
        formData.append("imageProvider", imgProvider);
      }

      const response = await convertWord(formData);

      const payload = response?.data;
      const slideArray = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.slides)
        ? payload.slides
        : [];

      if (!slideArray.length)
        throw new Error("Conversion failed: unexpected server response");

      const slidesWithId = slideArray.map((s, idx) => ({ ...s, id: idx }));

      setConvertedSlides(slidesWithId);
      setTopic(file.name.replace(/\.(docx|doc)$/i, ""));

      if (loggedInUser?.user_id)
        cache.invalidate(`history-${loggedInUser.user_id}`);

      notify("Conversion successful! You can now preview or edit it.", "success");
    } catch (err) {
      console.error("Word conversion error:", err);
      notify(`Conversion failed: ${err.response?.data?.error || err.message}`, "error");
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  return (
    <div className="dashboard">
      <Sidebar activePage="dashboard" />

      <main className="main">
        <div className="ai-container wordtoppt">
          <header className="headerp">
            <div className="headerw-icon">DOCX</div>
            <div>
              <h1>Word to PPT Converter</h1>
              <p>Transform your Word documents into editable AI-generated slides</p>
            </div>
          </header>

          <div className="ai-content">
            <div className="ai-left">
              <div className="ai-card ai-card-top">
                <h2>Upload Your Word Document</h2>

                <div className="uploadw-area">
                  <div className="uploadw-icon">⬆</div>
                  <h3>
                    Drop your Word document here, or{" "}
                    <span onClick={() => fileInputRef.current.click()} className="browsew">
                      browse
                    </span>
                  </h3>
                  <p>Supports .docx & .doc up to 25MB</p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.doc"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />

                  {file && <p className="file-name">📑 {file.name}</p>}
                </div>

                <button
                  onClick={handleConvert}
                  disabled={isLoading || !file}
                  className="convertw-btn"
                >
                  {isLoading ? (
                    <div className="progress-bar-container">
                      <div className="progress-bar-indeterminate"></div>
                      <span className="progress-text">{loadingText}</span>
                    </div>
                  ) : (
                    convertedSlides ? "Convert Again" : "Convert to PPT"
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

              <div className="ai-card">
                <h2>Customize Output</h2>
                <div className="ai-slider-section">
                  <label>Number of Slides</label>

                  <div className="slide-input-group">
                    <button
                      type="button"
                      className="slide-btn minus"
                      onClick={() => setSlides((prev) => Math.max(1, prev - 1))}
                    >
                      –
                    </button>

                    <input
                      type="number"
                      min="1"
                      value={slides}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setSlides('');
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num) && num >= 1) setSlides(num);
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '' || parseInt(e.target.value) < 1) {
                          setSlides(1);
                        }
                      }}
                      className="slide-input"
                    />

                    <button
                      type="button"
                      className="slide-btn plus"
                      onClick={() => setSlides((prev) => prev + 1)}
                    >
                      +
                    </button>
                  </div>

                  <span id="slide-count">Total number of slides: {slides}</span>
                </div>
              </div>
            </div>

            <div className="ai-right">
              <div className="ai-info-box">
                <h3>How it Works</h3>
                <ul>
                  <li>Extracts key points from your Word document</li>
                  <li>Summarizes and cleans content</li>
                  <li>Generates AI-crafted slide layouts</li>
                </ul>
              </div>

              <div className="ai-info-box">
                <h3>Supported Formats</h3>
                <ul>
                  <li>.docx (Microsoft Word)</li>
                  <li>.doc (Word 97–2003)</li>
                  <li>Max file size: 25MB</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* AI Provider Selection Modal */}
      <AIProviderModal
        isOpen={showProviderModal}
        onSelect={handleProviderSelect}
        onCancel={() => setShowProviderModal(false)}
      />

      {/* Image Provider Selection Modal */}
      <ImageProviderModal
        isOpen={showImageProviderModal}
        onSelect={handleImageProviderSelect}
        onCancel={() => setShowImageProviderModal(false)}
      />

      {/* Image Option Modal (matches PDFtoPPT) */}
      {isModalOpen && (
        <div className="ai-image-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="ai-image-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Image Generation</h2>
            <p>Do you want to include AI-generated images in your presentation?</p>
            <div className="ai-modal-buttons">
              <button className="ai-modal-btn text-only-btn" onClick={() => handleImageChoice(false)}>
                <span className="btn-icon">📄</span>
                <span className="btn-text">Text Only</span>
              </button>
              <button className="ai-modal-btn include-images-btn" onClick={() => handleImageChoice(true)}>
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
