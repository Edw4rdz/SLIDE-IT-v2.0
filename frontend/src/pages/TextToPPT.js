import React, { useState, useRef } from "react";
import { notify } from "../utils/notify";
import { useNavigate } from "react-router-dom";
import { convertText, cache } from "../api";
import Sidebar from "../components/Sidebar";
import AIProviderModal from "../components/AIProviderModal";
import ImageProviderModal from "../components/ImageProviderModal";
import "../styles/texttoppt.css";

export default function TextToPPT() {
  const [slides, setSlides] = useState(15);
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [convertedSlides, setConvertedSlides] = useState(null);
  const [topic, setTopic] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showImageProviderModal, setShowImageProviderModal] = useState(false);
  const [includeImagesChoice, setIncludeImagesChoice] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState("grockai");
  const [selectedImageProvider, setSelectedImageProvider] = useState("pollinations");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const loggedInUser = JSON.parse(localStorage.getItem("user")) || null;

  // Handle file upload
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile || selectedFile.type !== "text/plain") {
      notify("Please upload a valid .txt file", "error");
      setFile(null);
      return;
    }
    if (selectedFile.size > 25 * 1024 * 1024) {
      notify("File too large (max 25MB)", "error");
      setFile(null);
      return;
    }
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = () => setFileContent(reader.result);
    reader.onerror = () => {
      notify("Error reading file.", "error");
      setFile(null);
      setFileContent("");
    };
    reader.readAsText(selectedFile);
  };

  // Open provider modal
  const handleConvert = () => {
    if (!file || !fileContent.trim()) {
      notify("Please upload a text file first", "error");
      return;
    }
    // Check for minimum content length (e.g., at least 10 characters and 2 lines)
    const minLength = 10;
    const minLines = 2;
    const lines = fileContent.trim().split(/\r?\n/).filter(Boolean);
    if (fileContent.trim().length < minLength || lines.length < minLines) {
      notify("Your text file is too short. Please upload a file with more content (at least 2 lines of text).", "error");
      return;
    }
    if (!loggedInUser?.user_id) {
      notify("You must be logged in to convert and save history.", "error");
      return;
    }
    setShowProviderModal(true);
  };

  // Handle provider selection
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

  // Start conversion after choosing image option
  const handleConversionStart = async (includeImages, imgProvider) => {
    setIsLoading(true);
    setLoadingText("Uploading text file...");
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
      const response = await convertText(formData);
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
      setTopic(file.name.replace(/\.(txt)$/i, ""));
      // Invalidate cache
      if (loggedInUser?.user_id) {
        cache.invalidate(`history-${loggedInUser.user_id}`);
      }
      notify("Conversion successful! You can now preview or edit slides.", "success");
    } catch (err) {
      console.error(err);
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
        <div className="ai-container texttoppt">
          <header className="headerp">
            <div className="headerp-icon">TXT</div>
            <div>
              <h1>Text to PowerPoint Converter</h1>
              <p>Transform your plain text into AI-enhanced slides</p>
            </div>
          </header>
          <div className="ai-content">
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
            {/* Image Option Modal */}
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
            <div className="ai-left">
              <div className="ai-card ai-card-top">
                <h2>Upload Your Text File</h2>
                <div className="uploadp-area">
                  <div className="uploadp-icon">⬆</div>
                  <h3>
                    Drop your text file here, or {" "}
                    <span
                      className="browsep"
                      onClick={() => fileInputRef.current.click()}
                    >
                      browse
                    </span>
                  </h3>
                  <p>Supports text files up to 25MB.</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  {file && <p className="file-name">📄 {file.name}</p>}
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
                            imageProvider: selectedImageProvider, // Pass the selected image provider
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
                  <label htmlFor="slides">Number of Slides</label>
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
                      id="slides"
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
                  <span id="slide-count"> Total number of slides: {slides}</span>
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
    </div>
  );
}