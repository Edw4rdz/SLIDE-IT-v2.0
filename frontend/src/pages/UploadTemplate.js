import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaUpload, FaFilePowerpoint, FaTrashAlt } from 'react-icons/fa';
import { getTemplates, uploadTemplate } from '../api';
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
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  const [prebuiltTemplates, setPrebuiltTemplates] = useState([]);
  const [loadingPrebuilt, setLoadingPrebuilt] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(
    JSON.parse(localStorage.getItem('selectedTemplate')) || null
  );
  const [uploadedTemplates, setUploadedTemplates] = useState(
    JSON.parse(localStorage.getItem('uploadedTemplates')) || []
  );

  const [activeTab, setActiveTab] = useState('prebuilt');

  // Fetch prebuilt templates
  useEffect(() => {
    const fetchPrebuiltTemplates = async () => {
      setLoadingPrebuilt(true);
      try {
        const res = await getTemplates();
        setPrebuiltTemplates(res.data || []);
      } catch (err) {
        console.error('Error fetching prebuilt templates:', err);
        setMessage('Could not load prebuilt templates.');
      } finally {
        setLoadingPrebuilt(false);
      }
    };
    fetchPrebuiltTemplates();
  }, []);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || selectedFile.name.endsWith('.pptx')) {
          setFile(selectedFile);
          setMessage(`Selected: ${selectedFile.name}`); // Show selected filename
      } else {
          alert("Please upload a valid PPTX file (.pptx)");
          e.target.value = null;
          setFile(null);
          setMessage('');
      }
    } else {
        setFile(null);
        setMessage('');
    }
  };


  // Handle file upload
  const handleUpload = async () => {
    if (!file) return alert('Please select a PPTX file to upload.');
    setUploading(true);
    setMessage('Uploading...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await uploadTemplate(formData);
      setMessage(response.data.message || 'Template uploaded successfully!');

      const newTemplate = {
        id: `uploaded-${Date.now()}-${file.name}`,
        name: file.name,
        isUploaded: true,
      };

      const updatedUploadedTemplates = [...uploadedTemplates, newTemplate];
      setUploadedTemplates(updatedUploadedTemplates);
      localStorage.setItem('uploadedTemplates', JSON.stringify(updatedUploadedTemplates));

      setFile(null);
      document.getElementById('file-input').value = null; // Clear file input
      setActiveTab('uploaded'); // Switch to uploaded tab after upload

    } catch (error) {
      setMessage(`Error uploading template: ${error.response?.data?.message || error.message}. Please try again.`);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  // Handle selecting any template
  // Handle selecting any template
 const handleSelectTemplate = (tpl) => {
  const editableCopy = {
    ...tpl,
    id: `copy-${tpl.id}-${Date.now()}`,
    name: `${tpl.name} (Copy)`,
  };

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
  const handleRemoveUploadedTemplate = (idToRemove, event) => {
      event.stopPropagation(); // Prevent card click when clicking remove button
      if (!window.confirm("Remove this template?")) return;

      const updatedTemplates = uploadedTemplates.filter(tpl => tpl.id !== idToRemove);
      setUploadedTemplates(updatedTemplates);
      localStorage.setItem('uploadedTemplates', JSON.stringify(updatedTemplates));

      if (selectedTemplate?.id === idToRemove) {
          setSelectedTemplate(null);
          localStorage.removeItem('selectedTemplate');
      }
       setMessage('Uploaded template removed.');
  };


  return (
    <div className="dashboard">
      {/* Sidebar (Keep as is) */}
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

      {/* Main Content - Redesigned */}
      <main className="main main-upload-template">
        <h1 className="page-title">Manage Templates</h1>

        {/* Upload Section - More integrated */}
        <div className="upload-section-new">
          <h2>Upload Custom Template (.pptx)</h2>
           <div className="upload-controls">
            <label htmlFor="file-input" className="file-input-label">
                {file ? `Selected: ${file.name}` : 'Choose File...'}
            </label>
            <input
              id="file-input"
              type="file"
              accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={handleFileChange}
              style={{ display: 'none' }} // Hide default input
            />
            <button className="upload-button" onClick={handleUpload} disabled={uploading || !file}>
              <FaUpload /> {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
          {message && <p className={`upload-message ${message.startsWith('Error') ? 'error' : 'success'}`}>{message}</p>}
        </div>

        {/* Templates Section with Tabs */}
        <div className="templates-section">
          <div className="tabs">
            <button
              className={`tab-button ${activeTab === 'prebuilt' ? 'active' : ''}`}
              onClick={() => setActiveTab('prebuilt')}
            >
              Pre-Built Templates
            </button>
            <button
              className={`tab-button ${activeTab === 'uploaded' ? 'active' : ''}`}
              onClick={() => setActiveTab('uploaded')}
            >
              Your Uploads ({uploadedTemplates.length})
            </button>
          </div>

          <div className="tab-content">
            {/* Prebuilt Tab */}
            {activeTab === 'prebuilt' && (
              <div className="template-grid">
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
                        onError={(e) => { /* Keep onError logic */
                           e.target.onerror = null; e.target.style.display = 'none';
                           const parent = e.target.parentNode;
                           if(parent && !parent.querySelector('.template-error-text')){
                             const errorText = document.createElement('p'); errorText.textContent = '(Preview unavailable)';
                             errorText.className = 'template-error-text'; parent.insertBefore(errorText, e.target.nextSibling);
                           }
                        }}
                      />
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
            )}

            {/* Uploaded Tab */}
            {activeTab === 'uploaded' && (
              <div className="template-grid">
                {uploadedTemplates.length > 0 ? (
                  uploadedTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className={`template-card uploaded-card ${
                        selectedTemplate?.id === tpl.id ? 'selected' : ''
                      }`}
                      onClick={() => handleSelectTemplate(tpl)}
                    >
                      <div className="template-icon">
                        <FaFilePowerpoint size="4em" />
                      </div>
                      <div className="card-overlay">
                          <p title={tpl.name}>{tpl.name}</p>
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
                                onClick={(e) => handleRemoveUploadedTemplate(tpl.id, e)}
                             >
                                <FaTrashAlt /> Remove
                             </button>
                          </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>You haven't uploaded any templates yet. Use the section above to upload a .pptx file.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}