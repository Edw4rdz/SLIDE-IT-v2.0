import React, { useState, useEffect, useMemo, useCallback } from "react";
import {useNavigate } from "react-router-dom";
import { getHistory, deleteHistory, downloadPPTX } from "../api"; 
import "../styles/dashboard.css";
import "../styles/conversion.css";
import Sidebar from "../components/Sidebar"; 

export default function Conversions() {
  const navigate = useNavigate();
 
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

 

  // Fetch History
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
          navigate("/login");
          return;
        }
        // Uses the new function from api.js
        const res = await getHistory(user.user_id);
        setHistory(res.data);
      } catch (err) {
        console.error("Error fetching conversion history:", err);
        if (err.response?.status === 404) {
          console.log("History API (/api/conversions) not found or backend not running.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [navigate]);

  // ✅ Delete Conversion
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this conversion permanently?")) return;
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.user_id) {
        alert("User not found. Please log in again.");
        navigate("/login");
        return;
      }
      // Uses the new function from api.js
      await deleteHistory(id, user.user_id);
      setHistory((prev) => prev.filter((c) => c.id !== id));
      alert("Conversion deleted successfully!");
    } catch (err) {
      console.error("Error deleting conversion:", err);
      alert(`Failed to delete conversion: ${err.response?.data?.error || err.message}`);
    }
  };

  // ✅ Edit Conversion
  const handleEdit = (conv) => {
    navigate("/edit-preview", {
      state: { slides: conv.slides || [], topic: conv.fileName },
    });
  };

  // ✅ Handle Download
  const handleDownload = (conv) => {
    if (!conv.slides || conv.slides.length === 0) {
      return alert("No slide data found to download.");
    }
    // Calls the PPTX generator function from api.js
    downloadPPTX(conv.slides, conv.fileName);
  };

  // ✅ Preview Slides (Only shows title and bullets count for brevity)
  const renderSlidePreview = (slides) => {
    if (!slides || slides.length === 0) return <p>No slide data available.</p>;
    return (
      <div className="slide-preview">
        <h4>Slide Preview ({slides.length} slides)</h4>
        <ul>
          {slides.slice(0, 3).map((slide, index) => ( // Show first 3 slides only
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

  const createTextThumb = useCallback((title = "Presentation", type = "PPT") => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 360;
      canvas.height = 220;
      const ctx = canvas.getContext("2d");

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 360, 220);
      grad.addColorStop(0, "#eef2ff");
      grad.addColorStop(1, "#dbeafe");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 360, 220);

      // Type badge
      ctx.fillStyle = "#1f2937";
      ctx.globalAlpha = 0.85;
      ctx.fillRect(14, 14, 94, 26);
      ctx.globalAlpha = 1;
      ctx.font = "bold 12px Arial";
      ctx.fillStyle = "#fff";
      ctx.fillText((type || "PPT").toUpperCase(), 24, 32);

      // Title text
      ctx.fillStyle = "#111827";
      ctx.font = "bold 20px Arial";
      const maxWidth = 330;
      const lines = [];
      const words = String(title || "Presentation").split(/\s+/);
      let line = "";
      for (let w of words) {
        const test = (line ? line + " " : "") + w;
        if (ctx.measureText(test).width < maxWidth) line = test;
        else { lines.push(line); line = w; }
        if (lines.length > 2) break; // keep it compact
      }
      if (line && lines.length < 3) lines.push(line);
      const startY = 90;
      lines.slice(0, 3).forEach((txt, i) => ctx.fillText(txt, 20, startY + i * 28));

      return canvas.toDataURL("image/jpeg", 0.8);
    } catch (e) {
      return null;
    }
  }, []);

 
  const getThumbnailForConversion = useCallback((conv) => {
    if (!conv) return null;
    if (conv.previewThumb) return conv.previewThumb;

    if (conv.slides && conv.slides.length > 0) {
      const first = conv.slides[0];
      if (first.imageUrl) return first.imageUrl;
      if (first.uploadedImage) return first.uploadedImage;
      if (first.imagePrompt) {
        const encoded = encodeURIComponent(first.imagePrompt.trim());
        return `https://image.pollinations.ai/prompt/${encoded}`;
      }
   
      const title = first.title || conv.fileName || "Presentation";
      return createTextThumb(title, conv.conversionType || conv.type);
    }
    return createTextThumb(conv.fileName || "Presentation", conv.conversionType || conv.type);
  }, [createTextThumb]);


  const thumbnails = useMemo(() => {
    const map = {};
    history.forEach(h => { map[h.id] = getThumbnailForConversion(h); });
    return map;
  }, [history, getThumbnailForConversion]);

  return (
    <div className="dashboard">
      <Sidebar activePage="drafts" />

      {/* Main Content */}
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
                    {/* Display status and type from history data */}
                    <span className={`status-badge ${conv.status?.toLowerCase() || 'unknown'}`}>{conv.status || 'Unknown'}</span>
                    <p className="file-type">{conv.conversionType || conv.type || 'Unknown Type'}</p>
                  </div>

                  <h3 className="file-name">{conv.fileName || 'Untitled Conversion'}</h3>

                  {/* Thumbnail */}
                  {thumbnails[conv.id] && (
                    <div className="history-thumb-wrapper">
                      <img
                        src={thumbnails[conv.id]}
                        alt={`Preview for ${conv.fileName}`}
                        className="history-thumb"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display='none'; }}
                      />
                    </div>
                  )}

                  {conv.uploadedAt?.seconds && (
                     <p className="conversion-date">
                       Saved on {new Date(conv.uploadedAt.seconds * 1000).toLocaleString()}
                     </p>
                  )}


                  {renderSlidePreview(conv.slides)}

                  {/* Download Button */}
                  {conv.status === "Completed" && conv.slides && conv.slides.length > 0 && (
                    <button
                      className="download-btn"
                      onClick={() => handleDownload(conv)}
                    >
                      Download PPT
                    </button>
                  )}

                  {/* Edit & Delete Buttons */}
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