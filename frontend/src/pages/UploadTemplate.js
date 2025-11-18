import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaUpload } from 'react-icons/fa';
import { getTemplates } from '../api';
import '../styles/uploadTemplate.css'; // Main styles for this page
import '../styles/dashboard.css'; // Shared dashboard styles

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

  // Handle selecting any template
  // Handle selecting any template
 const handleSelectTemplate = (tpl) => {
  const editableCopy = {
    ...tpl,
    id: `copy-${tpl.id}-${Date.now()}`,
    name: `${tpl.name} (Copy)`,
  };

  setSelectedTemplate(editableCopy);
  localStorage.setItem('selectedTemplate', JSON.stringify(editableCopy));

  // ✅ Pass slides to EditPreview (use tpl.slides if it exists)
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
          <p className="templates-subtitle">Choose a pre-built design to start.</p>
        </section>

        {/* Templates Section (Pre-Built only) */}
        <div className="templates-container">
          <div className="templates-section">
          <div className="template-grid template-grid--comfortable">
            {loadingPrebuilt ? (
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