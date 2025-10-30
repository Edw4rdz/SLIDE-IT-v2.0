import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
// ✅ Import the text icon
import { FaSignOutAlt, FaUpload, FaFileAlt } from "react-icons/fa";
import { getHistory, deleteHistory, downloadPPTX } from "../api"; // <-- Uses api.js
import "./dashboard.css";
import "./conversion.css";

export default function Conversions() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Handle Logout (Unchanged)
  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to log out?")) return;
    setLoggingOut(true);
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    setTimeout(() => navigate("/login"), 1200);
  };

  // ✅ Fetch History (Unchanged)
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
          navigate("/login");
          return;
        }
        const res = await getHistory(user.user_id);
        setHistory(res.data);
      } catch (err) {
        console.error("Error fetching conversion history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [navigate]);

  // ✅ Delete Conversion (Unchanged)
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this conversion permanently?")) return;
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.user_id) {
        alert("User not found. Please log in again.");
        navigate("/login");
        return;
      }
      await deleteHistory(id, user.user_id);
      setHistory((prev) => prev.filter((c) => c.id !== id));
      alert("Conversion deleted successfully!");
    } catch (err) {
      console.error("Error deleting conversion:", err);
      alert(`Failed to delete conversion: ${err.response?.data?.error || err.message}`);
    }
  };

  // ✅ --- FIX 1: UPDATED handleEdit ---
  // We now pass the 'includeImages' flag from the conversion object.
  const handleEdit = (conv) => {
    navigate("/edit-preview", {
      state: { 
        slides: conv.slides || [], 
        topic: conv.fileName,
        // This is the line that fixes the bug
        includeImages: conv.includeImages 
      },
    });
  };

  // ✅ --- FIX 2: UPDATED handleDownload ---
  // We now pass the 'includeImages' flag to the download function.
  const handleDownload = (conv) => {
    if (!conv.slides || conv.slides.length === 0) {
      return alert("No slide data found to download.");
    }
    
    // The download function needs a design object, even a default one.
    const defaultDesign = {
      font: "Arial",
      globalBackground: "#ffffff",
      globalTitleColor: "#000000",
      globalTextColor: "#333333",
      layouts: { 
        title: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" },
        content: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" }
      }
    };

    // Pass the flag as the 4th argument, just like in EditPreview.js
    downloadPPTX(
      conv.slides, 
      defaultDesign, // Use a default design
      conv.fileName, 
      conv.includeImages // This is the line that fixes the bug
    );
  };

  // ✅ Preview Slides (Unchanged)
  const renderSlidePreview = (slides) => {
    if (!slides || slides.length === 0) return <p>No slide data available.</p>;
    return (
      <div className="slide-preview">
        <h4>Slide Preview ({slides.length} slides)</h4>
        <ul>
          {slides.slice(0, 3).map((slide, index) => ( 
            <li key={index}>
              <strong>{slide.title || "Untitled"}</strong>
               {slide.bullets && ` (${slide.bullets.length} bullet points)`}
            </li>
          ))}
          {slides.length > 3 && <li>... and {slides.length - 3} more</li>}
        </ul>
      </div>
    );
  };

  return (
    <div className="dashboard">
      {/* Sidebar (Unchanged) */}
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
            <Link to="/conversion" className="active"><i className="fa fa-history" /> Drafts</Link>
            <Link to="/settings"><i className="fa fa-cog" /> Settings</Link>
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

      {/* Main Content (Unchanged) */}
      <main className="main">
        <div className="container">
          <header className="conversion-header">
            <h1>Conversion History</h1>
            <p>Track all your uploaded files, AI processing status, and download completed presentations.</p>
          </header>

          {loading ? (
            <p>Loading conversion history...</p>
          ) : history.length === 0 ? (
            <p className="info-text">No conversions yet. Start using the tools to save drafts here.</p>
          ) : (
            <div className="conversion-grid">
              {history.map((conv) => (
                <div className="conversion-card" key={conv.id}>
                  <div className="card-header">
                    <span className={`status-badge ${conv.status?.toLowerCase() || 'unknown'}`}>{conv.status || 'Unknown'}</span>
                    <p className="file-type">{conv.type || 'Unknown Type'}</p>
                  </div>

                  <h3 className="file-name">{conv.fileName || 'Untitled Conversion'}</h3>

                  {conv.uploadedAt?.seconds && (
                       <p className="conversion-date">
                         Saved on {new Date(conv.uploadedAt.seconds * 1000).toLocaleString()}
                       </p>
                  )}
                  
                  {/* ✅ --- NEW: Show a badge if it's text-only --- ✅ */}
                  {conv.includeImages === false && (
                    <div className="text-only-badge">
                      <FaFileAlt /> Text Only
                    </div>
                  )}

                  {renderSlidePreview(conv.slides)}

                  {conv.status === "Completed" && conv.slides && conv.slides.length > 0 && (
                    <button
                      className="download-btn"
                      onClick={() => handleDownload(conv)}
                    >
                      Download PPT
                    </button>
                  )}

                  <div className="conversion-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(conv)}
                      disabled={!conv.slides || conv.slides.length === 0}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(conv.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}