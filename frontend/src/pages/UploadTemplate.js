import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaUpload } from 'react-icons/fa';
import { getTemplates, uploadTemplate } from '../api';
import '../styles/uploadTemplate.css'; // Main styles for this page
import '../styles/dashboard.css'; // Shared dashboard styles


// Inline helper for color contrast
function getContrastYIQ(hexColor) {
  if (typeof hexColor !== 'string') hexColor = String(hexColor || '');
  let r, g, b;
  if (hexColor.startsWith('#')) {
    const hex = hexColor.replace('#', '');
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
  } else if (hexColor.startsWith('rgb')) {
    const rgb = hexColor.match(/\d+/g);
    r = parseInt(rgb[0], 10);
    g = parseInt(rgb[1], 10);
    b = parseInt(rgb[2], 10);
  } else {
    // fallback to white
    return '#fff';
  }
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#222' : '#fff';
}

// Thumbnail overrides for known templates with broken images
const TEMPLATE_THUMB_OVERRIDES = {
  "Elegant Dark Business":
    "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=800&auto=format&fit=crop",
  "Futuristic Tech Couture":
    "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop",
  "Modern Corporate Blue":
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=800&auto=format&fit=crop",
};

export default function UploadTemplate() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);


  const [prebuiltTemplates, setPrebuiltTemplates] = useState([]);
  const [loadingPrebuilt, setLoadingPrebuilt] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(
    JSON.parse(localStorage.getItem('selectedTemplate')) || null
  );
  const [uploadedTemplates, setUploadedTemplates] = useState(() => {
    const saved = localStorage.getItem('uploadedTemplates');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState('uploaded'); // 'uploaded' or 'prebuilt'
  const [uploadMessage, setUploadMessage] = useState(null);
  const fileInputRef = useRef();

  // Fetch prebuilt templates
  useEffect(() => {
    const fetchPrebuiltTemplates = async () => {
      setLoadingPrebuilt(true);
      try {
        const res = await getTemplates();
        setPrebuiltTemplates(res.data || []);
      } catch (err) {
        console.error('Error fetching prebuilt templates:', err);
      } finally {
        setLoadingPrebuilt(false);
      }
    };
    fetchPrebuiltTemplates();
  }, []);


  // Handle selecting any template (prebuilt or uploaded)
  const handleSelectTemplate = (tpl) => {
    const editableCopy = {
      ...tpl,
      id: `copy-${tpl.id || tpl.name}-${Date.now()}`,
      name: `${tpl.name} (Copy)`,
    };

    setSelectedTemplate(editableCopy);
    localStorage.setItem('selectedTemplate', JSON.stringify(editableCopy));

    // Pass slides to EditPreview (use tpl.slides if it exists)
    const slidesToLoad = tpl.slides?.length ? tpl.slides : [
      {
        id: `slide-1-${Date.now()}`,
        title: 'Sample Slide',
        bullets: ['This is a sample slide.'],
        layout: 'title',
      },
    ];

    navigate('/edit-preview', {
      state: {
        slides: slidesToLoad,
        initialDesign: editableCopy,
        topic: tpl.name,
        includeImages: true,
      },
    });
  };

  // Handle uploading a template (simple: just store file name and preview)
  const handleUploadTemplate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
      // Upload PPTX to backend and get design info
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await uploadTemplate(formData);
        const { design, thumbnail } = res.data;
        // Build slides array with all info from backend
        const slides = (design?.slides || []).map((slide, idx) => ({
          id: `slide-${idx + 1}`,
          title: slide.title || `Slide ${idx + 1}`,
          text: slide.text || '',
          background: slide.background || design.globalBackground || "#fff",
          titleColor: slide.titleColor || design.globalTitleColor || "#000",
          textColor: slide.textColor || design.globalTextColor || "#333",
        }));
        const newTemplate = {
          id: `uploaded-${file.name}-${Date.now()}`,
          name: file.name,
          thumbnail: thumbnail || '',
          slides,
          design,
          uploaded: true,
        };
        const updated = [newTemplate, ...uploadedTemplates];
        setUploadedTemplates(updated);
        localStorage.setItem('uploadedTemplates', JSON.stringify(updated));
        setUploadMessage({ type: 'success', text: 'Template uploaded!' });
        setTimeout(() => setUploadMessage(null), 2000);
      } catch (err) {
        setUploadMessage({ type: 'error', text: 'Failed to extract template design.' });
        setTimeout(() => setUploadMessage(null), 2000);
      }
    } else if (file.type.startsWith('image/')) {
      // Handle image upload as before
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newTemplate = {
          id: `uploaded-${file.name}-${Date.now()}`,
          name: file.name,
          thumbnail: ev.target.result,
          slides: [],
          uploaded: true,
        };
        const updated = [newTemplate, ...uploadedTemplates];
        setUploadedTemplates(updated);
        localStorage.setItem('uploadedTemplates', JSON.stringify(updated));
        setUploadMessage({ type: 'success', text: 'Template uploaded!' });
        setTimeout(() => setUploadMessage(null), 2000);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Remove uploaded template
  const handleRemoveUploaded = (id) => {
    const updated = uploadedTemplates.filter(t => t.id !== id);
    setUploadedTemplates(updated);
    localStorage.setItem('uploadedTemplates', JSON.stringify(updated));
  };




  // Handle logout
  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to log out?')) return;
    setLoggingOut(true);
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    localStorage.removeItem('selectedTemplate');
    setTimeout(() => navigate('/login'), 1200);
  };

  // Handle removing an uploaded template
    // Removed upload/remove handlers and state, since uploads are disabled


  return (
    <div className="dashboard">
      {/* Sidebar (Keep as is) */}
      <aside className="sidebar">
        <div className="logo">
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
              <FaUpload className="icon" /> Manage Template
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

      {/* Main Content - Redesigned (visual only) */}
      <main className="main main-upload-template">
        <section className="templates-hero">
          <h1 className="templates-title">Manage Templates</h1>
          <p className="templates-subtitle">Upload your own or use a pre-built design.</p>
        </section>

        {/* Upload Section (top) */}
        <div className="upload-section-new">
          <h2>Upload a Template</h2>
          <div className="upload-controls">
            <input
              type="file"
              accept=".pptx,image/*"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleUploadTemplate}
            />
            <label className="file-input-label" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
              Choose file
            </label>
            <button className="upload-button" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
              <FaUpload style={{ marginRight: 6 }} /> Upload
            </button>
          </div>
          {uploadMessage && (
            <div className={`upload-message ${uploadMessage.type}`}>{uploadMessage.text}</div>
          )}
        </div>

        {/* Templates Section (below, left-aligned) */}
        <div className="templates-container">
          <div className="tabs">
            <button
              className={`tab-button${activeTab === 'uploaded' ? ' active' : ''}`}
              onClick={() => setActiveTab('uploaded')}
            >
              Uploaded
            </button>
            <button
              className={`tab-button${activeTab === 'prebuilt' ? ' active' : ''}`}
              onClick={() => setActiveTab('prebuilt')}
            >
              Prebuilt
            </button>
          </div>
          <div className="templates-section">
            <div className="template-grid template-grid--comfortable">
              {activeTab === 'uploaded' ? (
                uploadedTemplates.length > 0 ? (
                  uploadedTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className={`template-card uploaded-card ${selectedTemplate?.id === tpl.id ? 'selected' : ''}`}
                      onClick={() => handleSelectTemplate(tpl)}
                    >
                      {tpl.thumbnail && tpl.thumbnail.startsWith('data:') ? (
                        <img
                          src={tpl.thumbnail}
                          alt={tpl.name}
                          style={{height: 120, objectFit: 'cover', width: '100%', borderRadius: 8}}
                        />
                      ) : (
                        (() => {
                          // Prefer slide background, then design background, then generated color
                          function stringToColor(str) {
                            let hash = 0;
                            for (let i = 0; i < str.length; i++) {
                              hash = str.charCodeAt(i) + ((hash << 5) - hash);
                            }
                            const h = Math.abs(hash) % 360;
                            return `hsl(${h}, 70%, 65%)`;
                          }
                          const bgColor = tpl.slides && tpl.slides[0] && tpl.slides[0].background
                            ? tpl.slides[0].background
                            : (tpl.design && tpl.design.globalBackground
                                ? tpl.design.globalBackground
                                : stringToColor(tpl.name));
                          // Use the first slide's title if available, else template name
                          const cardTitle = tpl.slides && tpl.slides[0] && tpl.slides[0].title
                            ? tpl.slides[0].title
                            : tpl.name;
                          const fontColor = tpl.slides && tpl.slides[0] && tpl.slides[0].titleColor
                            ? tpl.slides[0].titleColor
                            : (tpl.design && tpl.design.globalTitleColor ? tpl.design.globalTitleColor : '#000');
                          return (
                            <div
                              style={{
                                height: 120,
                                width: '100%',
                                background: bgColor,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: fontColor,
                                fontWeight: 700,
                                fontSize: 20,
                                borderRadius: 8,
                                textAlign: 'center',
                                padding: '0 8px',
                              }}
                            >
                              <span style={{fontSize: 38, marginBottom: 4, opacity: 0.7, display: 'block'}}>
                                {/* Simple SVG presentation icon */}
                                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect x="3" y="5" width="18" height="12" rx="2" fill="#fff" fillOpacity="0.5"/>
                                  <rect x="7" y="9" width="6" height="2" rx="1" fill="#fff" fillOpacity="0.8"/>
                                  <rect x="7" y="13" width="10" height="2" rx="1" fill="#fff" fillOpacity="0.8"/>
                                </svg>
                              </span>
                              <span>
                                {cardTitle && cardTitle.length > 22 ? cardTitle.slice(0, 20) + '…' : (cardTitle || 'No image')}
                              </span>
                            </div>
                          );
                        })()
                      )}
                      <div className="template-name" title={tpl.name}>{tpl.name}</div>
                      <div className="card-overlay">
                        <p>{tpl.name}</p>
                        <div className="uploaded-actions">
                          <button
                            className="use-button-overlay"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTemplate(tpl);
                            }}
                          >
                            Use
                          </button>
                          <button
                            className="remove-button-overlay"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveUploaded(tpl.id);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No uploaded templates yet.</p>
                )
              ) : loadingPrebuilt ? (
                <p>Loading templates...</p>
              ) : prebuiltTemplates.length > 0 ? (
                prebuiltTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className={`template-card prebuilt-card ${
                      selectedTemplate?.id === tpl.id ? 'selected' : ''
                    }`}
                    onClick={() => handleSelectTemplate(tpl)}
                  >
                    <img
                      src={TEMPLATE_THUMB_OVERRIDES[tpl.name] || tpl.thumbnail}
                      alt={tpl.name}
                      onError={(e) => {
                        e.target.onerror = null; e.target.style.display = 'none';
                        const parent = e.target.parentNode;
                        if (parent && !parent.querySelector('.template-error-text')) {
                          const errorText = document.createElement('p');
                          errorText.textContent = '(Preview unavailable)';
                          errorText.className = 'template-error-text';
                          parent.insertBefore(errorText, e.target.nextSibling);
                        }
                      }}
                    />
                    <div className="template-name" title={tpl.name}>{tpl.name}</div>
                    <div className="card-overlay">
                      <p>{tpl.name}</p>
                      <button
                        className="use-button-overlay"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTemplate(tpl);
                        }}
                      >
                        Use
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p>No pre-built templates available.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}