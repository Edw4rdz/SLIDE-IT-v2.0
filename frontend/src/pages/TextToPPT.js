import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaSignOutAlt, FaUpload } from "react-icons/fa";
import { convertText } from "../api"; // Axios backend call
import "./texttoppt.css";

export default function TextToPPT() {
  const [slides, setSlides] = useState(8);
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(""); // Step text
  const [convertedSlides, setConvertedSlides] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const loggedInUser = JSON.parse(localStorage.getItem("user")) || null;

  // 🧩 Select File (No changes)
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile || selectedFile.type !== "text/plain") {
      alert("Please upload a valid .txt file");
      setFile(null);
      return;
    }
    if (selectedFile.size > 25 * 1024 * 1024) { // Increased limit slightly, adjust if needed
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

  // 🚀 Upload + Convert Text (FIXED)
  const handleConvert = async () => {
    if (!file || !fileContent.trim()) return alert("Please upload a text file first");

    // --- 1. ADDED USER CHECK ---
    if (!loggedInUser?.user_id) {
      return alert("You must be logged in to convert and save history.");
    }

    setIsLoading(true);
    setLoadingText("Converting text to slides...");

    try {
      // API call is correct, note the 'text' property name
      const response = await convertText({
        text: fileContent, // Backend expects 'text'
        slides,
        userId: loggedInUser.user_id, // Correct
        fileName: file.name,         // Correct
      });

      // --- 2. FIXED RESPONSE HANDLING ---
      // The backend sends the slide array directly.
      if (response.data && Array.isArray(response.data)) {
        
        // Add unique IDs for the EditPreview page
        const slidesWithId = response.data.map((s, idx) => ({ ...s, id: idx }));

        setConvertedSlides(slidesWithId);
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

  // 🔒 Logout (No changes)
  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to log out?")) return;
    setLoggingOut(true);
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    setTimeout(() => navigate("/login"), 1000);
  };

  return (
    <div className="ai-dashboard">
      {/* Sidebar (No changes) */}
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

      {/* Main Content (No changes to JSX) */}
      <main className="ai-main">
        <div className="ai-container">
          <header className="headerp">
            <div className="headerp-icon">TXT</div>
            <div>
              <h1>Text to PowerPoint Converter</h1>
              <p>Transform your plain text into AI-enhanced slides</p>
            </div>
          </header>

          <div className="ai-content">
            {/* Left Column */}
            <div className="ai-left">
              {/* Upload Card */}
              <div className="ai-card ai-card-top">
                <h2>Upload Your Text File</h2>
                <div className="uploadp-area" onClick={() => fileInputRef.current.click()}>
                  <div className="uploadp-icon">⬆</div>
                  {file ? <p className="file-name">📑 {file.name}</p> : <h3>Drop or browse your .txt file</h3>}
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
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="progress-bar-container">
                      <div className="progress-bar-indeterminate"></div>
                      <span className="progress-text">{loadingText}</span>
                    </div>
                  ) : convertedSlides ? ( // <-- Button text changes after conversion
                      "📝 Edit & Preview Slides"
                    ) : (
                      "Convert to PPT"
                    )}
                </button>

                 {convertedSlides && (
                   <div className="after-convert-actions">
                     <button
                       className="edit-preview-btn"
                       onClick={() =>
                         navigate("/edit-preview", { state: { slides: convertedSlides, topic: file.name } })
                       }
                     >
                       📝 Edit & Preview Slides
                     </button>
                   </div>
                 )}
              </div>

              {/* Customize Output */}
              <div className="ai-card">
                <h2>Customize Output</h2>
                <div className="ai-slider-section">
                  <label htmlFor="slides">Number of Slides</label>
                  <input
                    type="range"
                    id="slides"
                    min="3"
                    max="30" // Increased max slightly
                    value={slides}
                    onChange={(e) => setSlides(parseInt(e.target.value))}
                  />
                  <span id="slide-count">{slides} slides</span>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="ai-right">
              <div className="ai-info-box">
                <h3>How it Works</h3>
                <ol>
                  <li>Upload your text file.</li>
                  <li>Choose the number of slides.</li>
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