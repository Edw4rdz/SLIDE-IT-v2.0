import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaImages, FaFileAlt } from "react-icons/fa";
import { convertPDF } from "../api"; 
import "../styles/pdftoppt.css";
import "font-awesome/css/font-awesome.min.css";
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
    setLoadingText("Reading PDF file...");

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        setLoadingText("Converting document...");
        const base64PDF = reader.result.split(",")[1];
        
        // Build a lightweight preview thumb from first page (client-side canvas)
        let previewThumb = null;
        // Placeholder: generate a real page thumbnail later using pdf.js

        const response = await convertPDF({
          base64PDF,
          slides,
          userId: loggedInUser.user_id, 
          fileName: file.name,
          includeImages: includeImages,
          previewThumb
        });

        if (response.data && Array.isArray(response.data)) {
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

  return (
    <div className="dashboard"> 
      
      <Sidebar activePage="dashboard" />

      <main className="main">
        <div className="ai-container pdftoppt">
           <header className="headerp">
             <div className="headerp-icon">📄</div>
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
                   <div className="after-convert-actions">
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
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Image Generation</h2>
            <p>Do you want to include AI-generated images in your presentation?</p>
            <div className="modal-buttons">
              <button
                className="modal-btn btn-text"
                onClick={() => handleConversionStart(false)} 
              >
                <FaFileAlt />
                Text Only
              </button>
              <button
                className="modal-btn btn-image"
                onClick={() => handleConversionStart(true)} 
              >
                <FaImages />
                Include Images
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