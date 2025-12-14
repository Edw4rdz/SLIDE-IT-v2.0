import React, { useState, useEffect, useMemo, useCallback } from "react";
import {useNavigate } from "react-router-dom";
import { getHistory, deleteHistory, downloadPPTX, refreshPresignedUrlIfNeeded } from "../api"; 
import { notify } from "../utils/notify";
import "../styles/dashboard.css";
import "../styles/conversion.css";
import Sidebar from "../components/Sidebar"; 
import ConfirmDialog from "../components/ConfirmDialog";

export default function Conversions() {
  const navigate = useNavigate();
 
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshedUrls, setRefreshedUrls] = useState({}); // Cache for refreshed URLs

 

  // Fetch History
  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
          navigate("/login");
          return;
        }
        // Uses the new cached function from api.js
        const res = await getHistory(user.user_id);
        if (isMounted) {
          setHistory(res.data);
        }
      } catch (err) {
        console.error("Error fetching conversion history:", err);
        if (err.response?.status === 404) {
          console.log("History API (/api/conversions) not found or backend not running.");
        } else if (err.response?.status === 429) {
          console.log("Rate limited - using cached data");
          // Cache will handle this gracefully
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchHistory();
    
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // Refresh expired presigned URLs for thumbnails
  useEffect(() => {
    const refreshThumbnails = async () => {
      for (const conv of history) {
        const draftKey = conv.id ? `slideit_draft_${conv.id}` : `slideit_draft_${conv.fileName}`;
        let draft = null;
        try {
          draft = JSON.parse(localStorage.getItem(draftKey));
        } catch {}
        
        const displaySlides = draft?.slides || conv.slides;
        if (displaySlides && displaySlides.length > 0) {
          const firstSlide = displaySlides[0];
          
          // Check if we need to refresh the URL
          if (firstSlide.uploadedImageKey && firstSlide.uploadedImage && !refreshedUrls[conv.id]) {
            try {
              const refreshedSlide = await refreshPresignedUrlIfNeeded(firstSlide);
              if (refreshedSlide.uploadedImage !== firstSlide.uploadedImage) {
                // URL was refreshed, update the cache
                setRefreshedUrls(prev => ({
                  ...prev,
                  [conv.id]: refreshedSlide.uploadedImage
                }));
                
                // Update the draft in localStorage
                if (draft) {
                  const updatedSlides = draft.slides.map((s, idx) => 
                    idx === 0 ? refreshedSlide : s
                  );
                  localStorage.setItem(draftKey, JSON.stringify({ ...draft, slides: updatedSlides }));
                }
              }
            } catch (err) {
              console.warn(`Failed to refresh URL for conversion ${conv.id}:`, err);
            }
          }
        }
      }
    };
    
    if (history.length > 0) {
      refreshThumbnails();
    }
  }, [history, refreshedUrls]);

  // ✅ Delete Conversion
  const [confirm, setConfirm] = useState({ open: false, id: null });

  const requestDelete = (id) => setConfirm({ open: true, id });

  const handleDelete = async () => {
    const id = confirm.id;
    setConfirm({ open: false, id: null });
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.user_id) {
          notify("User not found. Please log in again.", "error");
        navigate("/login");
        return;
      }
      // Uses the new function from api.js
      await deleteHistory(id, user.user_id);
      setHistory((prev) => prev.filter((c) => c.id !== id));
      notify("Conversion deleted successfully!", "success");
    } catch (err) {
      console.error("Error deleting conversion:", err);
      notify(`Failed to delete conversion: ${err.response?.data?.error || err.message}`, "error");
    }
  };

  // ✅ Edit Conversion
  const handleEdit = (conv) => {
    // Try to load draft for this conversion
    const draftKey = conv.id ? `slideit_draft_${conv.id}` : `slideit_draft_${conv.fileName}`;
    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem(draftKey));
    } catch {}
    navigate("/edit-preview", {
      state: { 
        slides: draft?.slides || conv.slides || [], 
        topic: draft?.topic || conv.fileName,
        includeImages: conv.includeImages === true || conv.includeImages === 'true',
        convId: conv.id || conv.fileName,
        initialDesign: draft?.design || conv.design || null,
        imageProvider: draft?.imageProvider || conv.imageProvider || 'pollinations' // Pass imageProvider from draft
      },
    });
  };

  // ✅ Handle Download
  const DEFAULT_DESIGN = {
    font: "Arial",
    globalBackground: "#ffffff",
    globalTitleColor: "#000000",
    globalTextColor: "#333333",
    layouts: {
      title: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" },
      content: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" }
    }
  };

  const handleDownload = (conv) => {
    if (!conv.slides || conv.slides.length === 0) {
      return notify("No slide data found to download.", "error");
    }
    const designForDownload = conv.draftDesign || conv.design || DEFAULT_DESIGN;
    const safeFileName = conv.fileName || "presentation.pptx";
    // Always send forceSecondSlide to match Edit Preview
    downloadPPTX(
      conv.slides,
      designForDownload,
      safeFileName,
      conv.includeImages,
      conv.imageProvider,
      { forceSecondSlide: Array.isArray(conv.slides) && conv.slides.length > 1 ? conv.slides[1] : undefined }
    );
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

    // If conversion was TEXT ONLY, show empty placeholder
    if (conv.includeImages === false || conv.includeImages === 'false') {
      return null;
    }

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
            <h1>DRAFTS</h1>
            <p>Track all your uploaded files, AI processing status, and download completed presentations.</p>
          </header>

          {loading ? (
            <p>Loading conversion history...</p>
          ) : history.length === 0 ? (
            <div className="info-text">
              <p>No conversions available right now.</p>
              <p style={{fontSize: '14px', color: '#666', marginTop: '10px'}}>
                ℹ️ Conversions will reflect here. If it is not loading, Firebase quota is exceeded, history will show empty until quota resets (Every 4pm).
                Your conversions are still saved and will reappear after the reset.
              </p>
            </div>
          ) : (
            <div className="conversion-grid">
              {history.map((conv) => {
                // Load draft if present
                const draftKey = conv.id ? `slideit_draft_${conv.id}` : `slideit_draft_${conv.fileName}`;
                // Always re-read the latest draft from localStorage for each render
                let draft = null;
                try {
                  draft = JSON.parse(localStorage.getItem(draftKey));
                } catch {}
                const displaySlides = draft?.slides || conv.slides;
                const displayTitle = draft?.topic || conv.fileName || 'Untitled Conversion';
                // Prefer first slide's uploadedImage from draft if present
                let thumbUrl = null;
                
                // First check if we have a refreshed URL in cache
                if (refreshedUrls[conv.id]) {
                  thumbUrl = refreshedUrls[conv.id];
                } else if (displaySlides && displaySlides.length > 0) {
                  const firstSlide = displaySlides[0];
                  // Priority: 1) Draft's uploaded image, 2) Draft's image URL, 3) Original image
                  if (firstSlide.uploadedImage) {
                    thumbUrl = firstSlide.uploadedImage;
                  } else if (firstSlide.imageUrl) {
                    thumbUrl = firstSlide.imageUrl;
                  } else if (firstSlide.imagePrompt && (conv.includeImages !== false && conv.includeImages !== 'false')) {
                    const encoded = encodeURIComponent(firstSlide.imagePrompt.trim());
                    thumbUrl = `https://image.pollinations.ai/prompt/${encoded}`;
                  }
                }
                // Fallback to memoized thumbnail if nothing found
                if (!thumbUrl && thumbnails[conv.id]) {
                  thumbUrl = thumbnails[conv.id];
                }
                return (
                  <div className="conversion-card" key={conv.id}>
                    <div className="card-header">
                      {/* Display status and type from history data */}
                      <span className={`status-badge ${conv.status?.toLowerCase() || 'unknown'}`}>{conv.status || 'Unknown'}</span>
                      <p className="file-type">{
                        (() => {
                          const raw = (conv.conversionType || conv.type || '').toUpperCase();
                          const map = {
                            TOPIC: 'AI-Generated PPTs',
                            PDF: 'PDF-to-PPTs',
                            WORD: 'DOCX/WORD-to-PPTs',
                            DOCX: 'DOCX/WORD-to-PPTs',
                            TEXT: 'TxT-to-PPTs',
                            TXT: 'TxT-to-PPTs',
                            EXCEL: 'Excel-to-PPTs'
                          };
                          return map[raw] || raw || 'Unknown Type';
                        })()
                      }</p>
                    </div>

                    <h3 className="file-name">{displayTitle}</h3>

                    {/* Thumbnail */}
                    {thumbUrl ? (
                      <div className="history-thumb-wrapper">
                        <img
                          src={thumbUrl}
                          alt={`Preview for ${displayTitle}`}
                          className="history-thumb"
                          loading="lazy"
                          onError={(e) => { e.currentTarget.style.display='none'; }}
                        />
                      </div>
                    ) : (
                      <div className="history-thumb-wrapper empty-thumb">
                        {/* Show empty placeholder if TEXT ONLY */}
                      </div>
                    )}

                    {conv.uploadedAt?.seconds && (
                       <p className="conversion-date">
                         Saved on {new Date(conv.uploadedAt.seconds * 1000).toLocaleString()}
                       </p>
                    )}

                    {renderSlidePreview(displaySlides)}

                    {/* Download Button */}
                    {conv.status === "Completed" && displaySlides && displaySlides.length > 0 && (
                      <button
                        className="download-btn"
                        onClick={() => handleDownload({ ...conv, slides: displaySlides, draftDesign: draft?.design || null })}
                      >
                        Download PPT
                      </button>
                    )}

                    {/* Edit & Delete Buttons */}
                    <div className="conversion-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(conv)}
                        disabled={!displaySlides || displaySlides.length === 0}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => requestDelete(conv.id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <ConfirmDialog
        open={confirm.open}
        title="Delete Conversion"
        message="Delete this conversion permanently?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, id: null })}
      />
    </div>
  );
}