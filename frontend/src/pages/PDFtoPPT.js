import React, { useState, useRef } from "react";
import { notify } from "../utils/notify";
import { useNavigate } from "react-router-dom";
import { convertPDF, cache } from "../api"; 
import "../styles/pdftoppt.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import Sidebar from "../components/Sidebar"; 
import AIProviderModal from "../components/AIProviderModal";
import ImageProviderModal from "../components/ImageProviderModal";

export default function PDFToPPT() {
  const [slides, setSlides] = useState(15);
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [convertedSlides, setConvertedSlides] = useState(null);
  const [topic, setTopic] = useState("");
  const [conversionId, setConversionId] = useState(null);
  const loggedInUser = JSON.parse(localStorage.getItem("user")) || null;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showImageProviderModal, setShowImageProviderModal] = useState(false);
  const [includeImagesChoice, setIncludeImagesChoice] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState("grockai");
  const [selectedImageProvider, setSelectedImageProvider] = useState("pollinations");

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile || droppedFile.type !== "application/pdf") {
      notify("Please upload a valid PDF file", "error");
      return;
    }
    if (droppedFile.size > 25 * 1024 * 1024) {
      notify("File too large (max 25MB)", "error");
      return;
    }
    setFile(droppedFile);
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile || selectedFile.type !== "application/pdf") {
      notify("Please upload a valid PDF file", "error");
      setFile(null);
      return;
    }
    if (selectedFile.size > 25 * 1024 * 1024) {
      notify("File too large (max 25MB)", "error");
      setFile(null);
      return;
    }
    setFile(selectedFile);
  };

  // Open provider modal
  const handleConvert = () => {
    if (!file) return notify("Please select a PDF first", "error");
    if (!loggedInUser?.user_id) return notify("You must be logged in to convert and save history.", "error");
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

  const handleConversionStart = async (includeImages, imgProvider) => {
    setIsLoading(true);
    setLoadingText("Uploading PDF...");

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

      setLoadingText("Processing PDF...");
      const response = await convertPDF(formData);
      const payload = response?.data;
      const slideArray = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.slides)
        ? payload.slides
        : [];

      if (slideArray.length) {
        const slidesWithId = slideArray.map((s, idx) => ({ ...s, id: idx }));
        setConvertedSlides(slidesWithId);
        setTopic(file.name.replace(/\.pdf$/i, ""));
        
        // Store historyId for draft saving
        if (payload?.historyId) {
          setConversionId(payload.historyId);
        }
        
        // Invalidate cache so history refreshes
        if (loggedInUser?.user_id) {
          cache.invalidate(`history-${loggedInUser.user_id}`);
        }
        notify("Conversion successful! You can now preview or edit it.", "success");
      } else {
        // Only show error if backend explicitly failed
        const errorMsg = payload?.error || response?.error || "Conversion failed: Invalid response from server.";
        notify(errorMsg, "error");
      }
    } catch (err) {
      console.error("PDF conversion error:", err);
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
        <div className="ai-container pdftoppt">
           <header className="headerp">
             <div className="headerp-icon">PDF</div>
             <div>
               <h1>PDF to PowerPoint Converter</h1>
               <p>Transform your PDFs into editable and AI-enhanced slides</p>
             </div>
           </header>

           <div className="ai-content">
             <div className="ai-left">
               <div className="ai-card ai-card-top">
                 <h2>Upload Your PDF</h2>
                 <div 
                   className={`uploadp-area ${isDragging ? 'dragging' : ''}`}
                   onDragEnter={handleDragEnter}
                   onDragLeave={handleDragLeave}
                   onDragOver={handleDragOver}
                   onDrop={handleDrop}
                 >
                   <div className="uploadp-icon">⬆</div>
                   <h3>
                     Drop your PDF file here, or{" "}
                     <span
                       className="browsep"
                       onClick={() => fileInputRef.current.click()}
                     >
                       browse
                     </span>
                   </h3>
                   <p>Supports pdf files up to 25MB.</p>
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
                     "Convert to PPT"
                   )}
                 </button>

                 {convertedSlides && !isLoading && (
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
                             imageProvider: selectedImageProvider,
                             convId: conversionId, // Pass historyId for draft saving
                           } 
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
    {/* --- 1. Using text '–' and class 'slide-btn' --- */}
    <button
      type="button"
      className="slide-btn minus"
      onClick={() => setSlides((prev) => Math.max(1, prev - 1))}
    >
      –
    </button>

    {/* --- 2. Using class 'slide-input' --- */}
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

    {/* --- 3. Using text '+' and class 'slide-btn' --- */}
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
                  <h3>Features</h3>
                  <ul>
                    <li>AI-enhanced content extraction</li>
                    <li>Supports PDF files up to 25MB</li>
                    <li>Preview before download</li>
                    <li>Customizable slide count</li>
                  </ul>
                </div>
                <div className="ai-info-box">
                  <h3>Tips</h3>
                  <ul>
                    <li>Text-based PDFs produce better slides.</li>
                    <li>Scanned images may have limited text extraction.</li>
                    <li>Try 10–20 slides for balanced detail.</li>
                    <li>Edit in the next page before downloading.</li>
                    Note: <strong>AI may contain inaccuracies. Please review carefully!</strong>
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

    </div>
  );
}