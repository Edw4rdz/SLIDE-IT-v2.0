import React, { useState, useRef, useEffect } from "react";
import { notify } from "../utils/notify";
import AIProviderModal from "../components/AIProviderModal";
import ImageProviderModal from "../components/ImageProviderModal";
import { useNavigate } from "react-router-dom";
import { FaMagic, FaEdit } from "react-icons/fa";
import { generateSlides, cache } from "../api"; // <-- Added cache import
import "../styles/ai-generator.css";
import Sidebar from "../components/Sidebar"; 

export default function AIGenerator() {
  // Utility to fit text inside a container by adjusting font size
  function fitTextToContainer(text, containerWidth, containerHeight, minFont = 12, maxFont = 40, fontFamily = 'Arial', fontWeight = 'bold') {
    if (!text) return minFont;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let fontSize = maxFont;
    let fits = false;
    while (fontSize >= minFont) {
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      const metrics = ctx.measureText(text);
      const textWidth = metrics.width;
      // Estimate height: fontSize * 1.2 (line height)
      const textHeight = fontSize * 1.2;
      if (textWidth <= containerWidth && textHeight <= containerHeight) {
        fits = true;
        break;
      }
      fontSize -= 1;
    }
    return fits ? fontSize : minFont;
  }

  const [slides, setSlides] = useState(10);
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [convertedSlides, setConvertedSlides] = useState([]);
  const [conversionId, setConversionId] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showImageProviderModal, setShowImageProviderModal] = useState(false);
  const [includeImages, setIncludeImages] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("gemini");
  const [selectedImageProvider, setSelectedImageProvider] = useState("pollinations");
  const previewRefs = useRef({});
  const navigate = useNavigate();
  const loggedInUser = JSON.parse(localStorage.getItem("user")) || null;

  // Show image modal before generating
  // Show provider modal before image modal
  const handleGenerateClick = () => {
    if (!topic.trim()) return notify("Please enter a topic first!", "error");
    if (!loggedInUser?.user_id) return notify("User not logged in. Cannot save history.", "error");
    setShowProviderModal(true);
  };

  // After provider is selected, show image modal
  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    setShowProviderModal(false);
    setShowImageModal(true);
  };

  const handleGenerate = (includeAIImages) => {
    setShowImageModal(false);
    setIncludeImages(includeAIImages);

    if (includeAIImages) {
      setShowImageProviderModal(true);
    } else {
      startGeneration(false, null);
    }
  };

  const handleImageProviderSelect = (provider) => {
    setSelectedImageProvider(provider);
    setShowImageProviderModal(false);
    startGeneration(true, provider);
  };
 
  const startGeneration = async (includeAIImages, imgProvider) => {
    setIsLoading(true);
    setLoadingText("Initializing AI generation...");
    setConvertedSlides([]);

    try {
      const res = await generateSlides({
        topic,
        slideCount: slides,
        userId: loggedInUser.user_id,
        includeImages: includeAIImages,
        provider: selectedProvider,
        imageProvider: imgProvider,
      });

      const payload = res?.data;
      const slideArray = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.slides)
        ? payload.slides
        : [];

      if (!slideArray.length) {
        throw new Error("Failed to generate slides (unexpected response)");
      }

      setLoadingText("Generating slide content...");
      const slidesWithId = slideArray.map((s, idx) => ({ ...s, id: idx }));
      setConvertedSlides(slidesWithId);
      
      // Store historyId for draft saving
      if (payload?.historyId) {
        setConversionId(payload.historyId);
      }
      
      setLoadingText("Slides generated successfully!");
      // Invalidate history cache so next fetch gets updated data
      if (loggedInUser?.user_id) {
        cache.invalidate(`history-${loggedInUser.user_id}`);
      }
    } catch (err) {
      console.error(err);
      notify("AI slide generation failed: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  // Navigate to Edit & Preview page (FIXED)
  const handleNavigateToEdit = () => {
    if (!convertedSlides || convertedSlides.length === 0) {
      return notify("Please generate slides first!", "error");
    }

    navigate("/edit-preview", {
      state: {
        slides: convertedSlides,
        topic,
        includeImages: !!includeImages, // ensure EditPreview shows image column
        imageSource: includeImages ? 'ai' : 'none',
        imageProvider: selectedImageProvider, // Pass the selected image provider
        convId: conversionId, // Pass historyId for draft saving
      },
    });
  };

  return (
 
    <div className="dashboard">
      
      <Sidebar activePage="dashboard" />
      <main className="main">
        <div className="ai-container aigenerator">
          <header className="headera">
            <div className="headera-icon">AI</div>
            <div>
              <h1>AI PowerPoint Generator</h1>
              <p>Create professional presentations from any topic using AI</p>
            </div>
          </header>

          <div className="ai-content">
            {/* Left */}
            <div className="ai-left">
              <div className="ai-card ai-card-top">
                <h2>What's your presentation about?</h2>
                <label className="ai-section-label">Presentation Topic</label>
                <textarea
                  placeholder="Describe your presentation topic..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                ></textarea>

                <button
                  className="generateAI-btn"
                  onClick={handleGenerateClick}
                  disabled={!topic.trim() || isLoading}
                >
                  {isLoading ? (
                    <div className="progress-bar-container">
                      <div className="progress-bar-indeterminate"></div>
                      <span className="progress-text">{loadingText}</span>
                    </div>
                  ) : (
                    <><FaMagic /> Generate Presentation</>
                  )}
                </button>

                {convertedSlides.length > 0 && !isLoading && (
                  <div className="success-card">
                    <div className="success-header">
                      <div className="success-icon">✓</div>
                      <div className="success-text">
                        <h3>Slides Generated!</h3>
                        <p>Your {convertedSlides.length} slides are ready to edit.</p>
                      </div>
                    </div>
                    <button className="edit-preview-btn" onClick={handleNavigateToEdit}>
                      📝 Edit & Preview Slides
                    </button>
                  </div>
                )}
              </div>

              <div className="ai-card">
  <h2>Customize Presentation</h2>
  <div className="ai-slider-section centered-slide-control">
    <label htmlFor="slides">Number of Slides</label>
    <div className="slide-control">
      <button
        className="slide-btn"
        onClick={() => setSlides((prev) => Math.max(1, prev - 1))}
      >
        –
      </button>
      <input
        type="number"
        id="slides"
        value={slides}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '') {
            setSlides('');
          } else {
            const num = parseInt(val);
            if (!isNaN(num)) setSlides(num);
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
        className="slide-btn"
        onClick={() => setSlides((prev) => prev + 1)}
      >
        +
      </button>
    </div>
    <span id="slide-count">{slides} slides</span>
  </div>
</div>
              {/* Slide Preview Section */}
              {convertedSlides.length > 0 && (
                <div className="ai-card">
                  <h2>Slide Preview (Auto Font Size)</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                    {convertedSlides.map((slide, idx) => (
                      <div
                        key={slide.id}
                        ref={el => previewRefs.current[slide.id] = el}
                        style={{
                          width: 320,
                          height: 180,
                          border: '1px solid #ccc',
                          borderRadius: 8,
                          background: '#fff',
                          overflow: 'hidden',
                          position: 'relative',
                          padding: 16,
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* Title */}
                        <div
                          style={{
                            width: '100%',
                            height: 48,
                            fontWeight: 'bold',
                            color: '#222',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: fitTextToContainer(slide.title, 288, 48),
                            fontFamily: 'Arial',
                          }}
                        >
                          {slide.title}
                        </div>
                        {/* Body Text */}
                        <div
                          style={{
                            width: '100%',
                            height: 100,
                            marginTop: 8,
                            color: '#444',
                            textAlign: 'left',
                            overflow: 'hidden',
                            fontSize: fitTextToContainer(slide.text || (slide.bullets ? slide.bullets.join(' ') : ''), 288, 100, 10, 24, 'Arial', 'normal'),
                            fontFamily: 'Arial',
                          }}
                        >
                          {slide.text || (slide.bullets ? slide.bullets.join(' • ') : '')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right */}
            <div className="ai-right">
              <div className="ai-info-box">
                <h3>How it Works</h3>
                <ol>
                  <li>Describe your topic.</li>
                  <li>AI generates the slides.</li>
                  <li>Preview and edit before download.</li>
                </ol>
              </div>
              <div className="ai-info-box">
                <h3>Features</h3>
                <ul className="ai-features">
                  <li>AI-powered content generation</li>
                  <li>Preview before download</li>
                  <li>Download as PPTX</li>
                  <li>Customizable slide count</li>
                </ul>
              </div>
              <div className="ai-info-box">
                <h3>Tips</h3>
                <ul>
                  <li>Be specific with your topic for better results.</li>
                  <li>Try 5–15 slides for best balance.</li>
                  <li>Preview and refine content before downloading.</li>
                  <li>Edit in the next page to customize slides.</li>
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

      {/* Image Generation Modal */}
      {showImageModal && (
        <div className="ai-image-modal-backdrop" onClick={() => setShowImageModal(false)}>
          <div className="ai-image-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Image Generation</h2>
            <p>Do you want to include AI-generated images in your presentation?</p>
            <div className="ai-modal-buttons">
              <button className="ai-modal-btn text-only-btn" onClick={() => handleGenerate(false)}>
                <span className="btn-icon">📄</span>
                <span className="btn-text">Text Only</span>
              </button>
              <button className="ai-modal-btn include-images-btn" onClick={() => handleGenerate(true)}>
                <span className="btn-icon">🖼️</span>
                <span className="btn-text">Include Images</span>
              </button>
            </div>
            <button className="ai-modal-cancel" onClick={() => setShowImageModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}