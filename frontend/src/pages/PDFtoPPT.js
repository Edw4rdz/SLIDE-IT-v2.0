import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaImages, FaFileAlt } from "react-icons/fa";
import { convertPDF } from "../api"; 
import "../styles/pdftoppt.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import Sidebar from "../components/Sidebar"; 

export default function PDFToPPT() {
  const [slides, setSlides] = useState(15);
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [convertedSlides, setConvertedSlides] = useState(null);
  const [topic, setTopic] = useState("");
  const loggedInUser = JSON.parse(localStorage.getItem("user")) || null;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [includeImagesChoice, setIncludeImagesChoice] = useState(true);


  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    } else {
      alert("Please upload a valid PDF file");
      setFile(null);
    }
  };

  const handleUpload = () => {
    if (!file) return alert("Please select a PDF first");
    if (file.size > 25 * 1024 * 1024) return alert("File too large (max 25MB)");
    if (!loggedInUser?.user_id) {
      return alert("You must be logged in to convert and save history.");
    }
    setIsModalOpen(true);
  };

  const handleConversionStart = async (includeImages) => {
    setIsModalOpen(false);
    setIncludeImagesChoice(includeImages);
    setIsLoading(true);
    setLoadingText("Uploading PDF...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slideCount", String(slides));
      formData.append("userId", String(loggedInUser.user_id));
      formData.append("includeImages", String(includeImages));

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
        alert("✅ Conversion successful! You can now preview or edit it.");
      } else {
        // Only show error if backend explicitly failed
        const errorMsg = payload?.error || response?.error || "Conversion failed: Invalid response from server.";
        alert(errorMsg);
      }
    } catch (err) {
      console.error("PDF conversion error:", err);
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
                   onClick={handleUpload}
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
                             includeImages: includeImagesChoice 
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
        const value = parseInt(e.target.value);
        if (!isNaN(value) && value >= 1) setSlides(value);
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