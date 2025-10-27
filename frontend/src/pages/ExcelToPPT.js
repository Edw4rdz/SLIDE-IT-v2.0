import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaSignOutAlt, FaUpload } from "react-icons/fa";
import { convertExcel } from "../api";
import "./exceltoppt.css";

export default function ExcelToPPT() {
  const [file, setFile] = useState(null);
  const [slidesCount, setSlidesCount] = useState(8);
  const [convertedSlides, setConvertedSlides] = useState(null);
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
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

    // --- 1. ADDED USER CHECK ---
    if (!loggedInUser?.user_id) {
      return alert("You must be logged in to convert and save history.");
    }

    setIsLoading(true);
    setLoadingText("Reading Excel file...");

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        setLoadingText("Converting Excel to slides...");
        const base64Excel = reader.result.split(",")[1];

        // This API call is already correct!
        const response = await convertExcel({
          base64Excel,
          slides: slidesCount,
          userId: loggedInUser.user_id, // This is correct
          fileName: file.name,         // This is correct
        });

        // --- 2. FIXED RESPONSE HANDLING ---
        // The backend now sends the slide array directly.
        // 'response.data' IS the array of slides.
        if (response.data && Array.isArray(response.data)) {
          
          // Add unique IDs for the EditPreview page
          const slidesWithId = response.data.map((s, idx) => ({ ...s, id: idx }));

          setConvertedSlides(slidesWithId);
          setTopic(file.name.replace(/\.(xlsx|xls)/i, ""));
          alert("✅ Conversion successful! You can now preview or edit it.");
        } else {
          // This will be caught by the catch block, but as a fallback:
          alert("Conversion failed: Invalid response from server.");
        }
      } catch (err) {
        console.error("Excel conversion error:", err);
        alert(`❌ Conversion failed: ${err.response?.data?.error || err.message}`);
      } finally {
        setIsLoading(false);
        setLoadingText("");
      }
    };

    reader.onerror = () => {
      console.error("Error reading the Excel file");
      alert("Error reading the file. Please try again.");
      setIsLoading(false);
      setLoadingText("");
    };

    reader.readAsDataURL(file);
  };

  // 🔒 Logout (No changes, this is perfect)
  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to log out?")) return;
    setLoggingOut(true);
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    setTimeout(() => navigate("/login"), 1200);
  };

  return (
    <div className="dashboard">
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
      <main className="main">
        <div className="container">
          {/* Header */}
          <header className="header">
            <div className="header-icon">XLSX</div>
            <div>
              <h1>Excel to PPT Converter</h1>
              <p>Transform your Excel sheets into editable AI slides</p>
            </div>
          </header>

          <div className="content-grid">
            <div className="main-cards">
              <section className="card">
                <h2>Upload Your Excel File</h2>
                <div
                  className="file-upload"
                  onClick={() => fileInputRef.current.click()}
                >
                  <div className="uploade-area">
                    <div className="uploade-icon">⬆</div>
                    {file ? (
                      <p>
                        <strong>{file.name}</strong> loaded
                      </p>
                    ) : (
                      <p>
                        Drop your Excel file here or{" "}
                        <span className="browse">browse</span>
                      </p>
                    )}
                    <p>Supports .xlsx and .xls up to 50MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="file-input"
                    accept=".xlsx,.xls"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                </div>

                <button
                  className="convert-btn"
                  onClick={() => {
                    if (convertedSlides) {
                      navigate("/edit-preview", {
                        state: { slides: convertedSlides, topic },
                      });
                    } else {
                      handleConvert();
                    }
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="progress-bar-container">
                      <div className="progress-bar-indeterminate"></div>
                      <span className="progress-text">{loadingText}</span>
                    </div>
                  ) : convertedSlides ? (
                    "📝 Edit & Preview Slides"
                  ) : (
                    "Convert to PowerPoint"
                  )}
                </button>
              </section>

              {/* Customize */}
              <section className="card">
                <h2>Customize Your Presentation</h2>
                <div className="input-group">
                  <label>Number of Slides</label>
                  <input
                    type="range"
                    min="3"
                    max="20"
                    value={slidesCount}
                    onChange={(e) => setSlidesCount(parseInt(e.target.value))}
                  />
                  <span>{slidesCount} slides</span>
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="right-sidebar">
              <section className="card">
                <h3>How it Works</h3>
                <ol>
                  <li>Upload your Excel document.</li>
                  <li>Choose number of slides.</li>
                  <li>AI automatically creates your presentation.</li>
                  <li>Preview & edit slides interactively before download.</li>
                </ol>
              </section>

              <section className="card">
                <h3>Tips</h3>
                <ul>
                  <li>Include well-structured headers for better results.</li>
                  <li>Charts are automatically converted into slides.</li>
                  <li>Keep large files under 50MB.</li>
                  <li>Use 5–15 slides for balanced detail.</li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}