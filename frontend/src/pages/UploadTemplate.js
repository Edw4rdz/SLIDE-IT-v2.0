import React, { useState, useEffect } from "react";
// import axios from "axios"; // <-- 1. REMOVED
import { Link } from "react-router-dom";
import { FaSignOutAlt, FaUpload } from "react-icons/fa";
import { getTemplates, uploadTemplate } from "../api"; // <-- 2. ADDED
import "./uploadTemplate.css";
import "./dashboard.css";

export default function UploadTemplate() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // Preview might not work well for PPTX
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(
    JSON.parse(localStorage.getItem("selectedTemplate")) || null
  );

  // Fetch prebuilt templates (FIXED)
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        // 3. Use the new API function
        const res = await getTemplates();
        setTemplates(res.data);
      } catch (err) {
        console.error("Error fetching templates:", err);
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, []);

  // Handle file change (No changes needed)
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
        // Basic validation for PPTX
        if (selectedFile.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || selectedFile.name.endsWith('.pptx')) {
            setFile(selectedFile);
            // NOTE: Creating an object URL for PPTX preview in an iframe usually doesn't work directly.
            // You might need a more complex preview solution or just show the filename.
            setPreview(URL.createObjectURL(selectedFile));
        } else {
            alert("Please upload a valid PPTX file (.pptx)");
            setFile(null);
            setPreview(null);
        }
    } else {
        setFile(null);
        setPreview(null);
    }
  };

  // Handle file upload (FIXED)
  const handleUpload = async () => {
    if (!file) return alert("Please select a PPTX file to upload.");
    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file); // Backend expects 'file'

    try {
      // 4. Use the new API function
      const response = await uploadTemplate(formData);
      setMessage(response.data.message || "Template uploaded successfully!");
      setFile(null);
      setPreview(null);
      // Maybe refresh the list of uploaded templates here if you add that feature
    } catch (error) {
      setMessage(`Error uploading template: ${error.response?.data?.message || error.message}. Please try again.`);
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  // Handle logout (No changes needed)
  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to log out?")) return;
    setLoggingOut(true);
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    // Consider using navigate hook instead of window.location
    setTimeout(() => (window.location.href = "/login"), 1200);
  };

  // Select prebuilt template (No changes needed)
  const handleSelectTemplate = (tpl) => {
    setSelectedTemplate(tpl);
    localStorage.setItem("selectedTemplate", JSON.stringify(tpl));
    alert(`✅ Selected "${tpl.name}" — it will be used in EditPreview.`);
  };

  return (
    <div className="dashboard">
      {/* Sidebar (No changes) */}
      <aside className="sidebar">
        <div className="fa fa-magic logo">
          <div>
            <h2>SLIDE-IT</h2>
            <p>Convert & Generate</p>
          </div>
        </div>
        <nav className="sidebar-links">
          <div className="top-links">
            <Link to="/dashboard"><i className="fa fa-home" /> Dashboard</Link>
            <Link to="/conversion"><i className="fa fa-history" /> Drafts</Link>
            <Link to="/settings"><i className="fa fa-cog" /> Settings</Link>
            <Link to="/uploadTemplate" className="upload-btn active">
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

      {/* Main Content (No changes to JSX structure) */}
      <main className="main">
        <div className="upload-template-page">
          {/* Upload Card */}
          <div className="upload-card">
            <h2>Upload Your Template</h2>
            <p className="subtitle">Upload a custom PPTX design file (.pptx)</p>

            <input type="file" accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={handleFileChange} />

            {/* Preview Section (Consider simplifying or removing if iframe doesn't work) */}
            {file && (
              <div className="preview">
                <p>Selected file: {file.name}</p>
                {/* <iframe src={preview} title="Template Preview" width="100%" height="200px" /> */}
              </div>
            )}

            <button onClick={handleUpload} disabled={uploading || !file}>
              {uploading ? "Uploading..." : "Upload Template"}
            </button>
            {message && <p className="message">{message}</p>}
          </div>

          {/* Prebuilt Templates Section */}
          <div className="prebuilt-section">
            <h3>Choose a Pre-Built Template</h3>
            {loadingTemplates ? (
              <p>Loading templates...</p>
            ) : (
              <div className="template-grid">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className={`template-card ${
                      selectedTemplate?.id === tpl.id ? "selected" : ""
                    }`}
                  >
                    {/* Make image clickable */}
                    <img src={tpl.thumbnail} alt={tpl.name} onClick={() => handleSelectTemplate(tpl)} style={{cursor: 'pointer'}} />
                    <p>{tpl.name}</p>
                    <button onClick={() => handleSelectTemplate(tpl)}>Use</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}