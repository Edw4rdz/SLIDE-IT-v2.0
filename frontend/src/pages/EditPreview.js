import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaDownload, FaArrowLeft } from 'react-icons/fa';
import { getTemplates, downloadPPTX } from '../api';
import './edit-preview.css';

// Helper function (keep as is)
const getPollinationsImageUrl = (prompt) => {
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') return null;
  const encodedPrompt = encodeURIComponent(prompt.trim());
  return `https://image.pollinations.ai/prompt/${encodedPrompt}`;
};


export default function EditPreview() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialSlides = (location.state?.slides || []).map((slide, index) => ({
    ...slide,
    id: slide.id ?? `slide-${index}-${Date.now()}` // Ensure unique ID
  }));

  const [editedSlides, setEditedSlides] = useState(initialSlides);
  const [topic, setTopic] = useState(location.state?.topic || 'My_Presentation');
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true); // Start as true
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [currentDesign, setCurrentDesign] = useState({
    background: '#ffffff',
    titleColor: '#000000',
    textColor: '#333333',
    font: 'Arial',
    backgroundImage: '',
  });
  const [previewImageUrls, setPreviewImageUrls] = useState({});
  const [fetchingImages, setFetchingImages] = useState(true); // Keep this for image URL generation status

  // ✅ Improved template handler (toggle + smooth reselect fix)
  const handleTemplateChange = useCallback((templateId, availableTemplates) => {
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId('');
      setCurrentDesign({
        background: '#ffffff',
        titleColor: '#000000',
        textColor: '#333333',
        font: 'Arial',
        backgroundImage: '',
      });
      localStorage.removeItem('selectedTemplate');
      return;
    }

    const selected = availableTemplates.find((t) => t.id === templateId);
    if (selected) {
      setSelectedTemplateId(templateId);
      const newDesign = {
        // ✅ Treat background as image if it’s a URL
        background: selected.background || '#FFFFFF',
        backgroundImage: selected.background.startsWith('http')
          ? `url(${selected.background})`
          : '',
        titleColor: selected.titleColor || '#000000',
        textColor: selected.textColor || '#333333',
        font: selected.font || 'Arial',
        id: selected.id // Also store ID for re-selection
      };
      setCurrentDesign(newDesign);
      // Store the *new* design object, not the raw 'selected' one
      localStorage.setItem('selectedTemplate', JSON.stringify(newDesign));
    }
  }, [selectedTemplateId]);

  // ✅ Restore last selected template from localStorage (on mount)
  useEffect(() => {
    const saved = localStorage.getItem('selectedTemplate');
    if (saved) {
      const parsed = JSON.parse(saved);
      setCurrentDesign(parsed);
      setSelectedTemplateId(parsed.id || '');
    }
  }, []); // Empty dependency array - only run once on mount


  // Fetch prebuilt templates ONCE on mount
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates if component unmounts
    const fetchTemplates = async () => {
      setLoadingTemplates(true); // Set loading true at the start
      try {
        const res = await getTemplates();
        if (isMounted) { // Only update state if component is still mounted
          const fetchedTemplates = res.data || [];
          setTemplates(fetchedTemplates);

          // Check localStorage *after* setting templates
          const storedTemplate = JSON.parse(localStorage.getItem('selectedTemplate'));
          if (storedTemplate && fetchedTemplates.find(t => t.id === storedTemplate.id)) {
            // Re-apply stored template using the fetched data to ensure consistency
            // We find the *full* template from the fresh list
            const fullTemplate = fetchedTemplates.find(t => t.id === storedTemplate.id);
            if (fullTemplate) {
                // Manually set the state again from the *full* template data
                // This is safer than calling handleTemplateChange here
                 setSelectedTemplateId(fullTemplate.id);
                 setCurrentDesign({
                    background: fullTemplate.background || '#FFFFFF',
                    backgroundImage: fullTemplate.background.startsWith('http')
                      ? `url(${fullTemplate.background})`
                      : '',
                    titleColor: fullTemplate.titleColor || '#000000',
                    textColor: fullTemplate.textColor || '#333333',
                    font: fullTemplate.font || 'Arial',
                    id: fullTemplate.id
                 });
            }
          }
          // Set loading false ONLY after all processing is done
          setLoadingTemplates(false);
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
        if (isMounted) {
          setLoadingTemplates(false); // Ensure loading stops even on error
        }
      }
    };

    fetchTemplates();

    // Cleanup function to set isMounted to false when component unmounts
    return () => {
      isMounted = false;
    };
  // We remove handleTemplateChange from deps because we are manually setting state
  // to avoid re-run loops. This effect should truly only run ONCE.
  }, []); 


  // Effect to generate image URLs for preview (Keep as is)
  useEffect(() => {
    if (editedSlides && editedSlides.length > 0) {
      setFetchingImages(true);
      const urls = {};
      editedSlides.forEach((slide) => {
        if (slide.id !== undefined) {
          const prompt = slide.imagePrompt || slide.title;
          if (prompt) {
            urls[slide.id] = getPollinationsImageUrl(prompt);
          }
        } else {
          console.warn('Slide missing ID:', slide);
        }
      });
      setPreviewImageUrls(urls);
      setFetchingImages(false);
    } else {
      setFetchingImages(false);
      setPreviewImageUrls({});
    }
  }, [editedSlides]);


  // Handle changes in text inputs (Keep as is)
  const handleSlideChange = (id, field, value) => {
    setEditedSlides((currentSlides) =>
      currentSlides.map((s) => {
        if (s.id === id) {
          const updatedSlide = {
            ...s,
            [field]: field === 'bullets' ? value.split('\n').map(b => b.trim()).filter(b => b) : value
          };
          if (field === 'imagePrompt' || (field === 'title' && !s.imagePrompt)) {
            setPreviewImageUrls(prevUrls => ({
              ...prevUrls,
              [id]: getPollinationsImageUrl(updatedSlide.imagePrompt || updatedSlide.title)
            }));
          }
          return updatedSlide;
        }
        return s;
      })
    );
  };

  // Handle download (UPDATED)
  // ✅ Handle Download - supports default and template designs
  const handleDownload = () => {
    if (!editedSlides.length) return alert("No slides to download!");

    const sanitizedTopic = topic.replace(/[\s/\\?%*:|"<>]/g, "_");
    const fileName = `${sanitizedTopic}_presentation.pptx`;

    // If no template is selected, use a clean default design
    const defaultDesign = {
      background: "#ffffff",
      titleColor: "#000000",
      textColor: "#333333",
      font: "Arial",
      backgroundImage: null
    };

    // Use the selected template if available, otherwise default
    const activeDesign = selectedTemplateId ? currentDesign : defaultDesign;

    downloadPPTX(editedSlides, activeDesign, fileName);
  };

  if (!location.state?.slides && editedSlides.length === 0) return <div className="loading-message">Loading slide data... Please wait.</div>;

  return (
    <div className="edit-preview-wrapper">
      {/* Sidebar */}
      <motion.aside
        className="sidebar-glass"
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <h2>🎨 Templates</h2>
        {loadingTemplates ? (
          <p className="loading">Loading templates...</p>
        ) : templates.length > 0 ? (
          <div className="template-gallery">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className={`template-item ${
                  selectedTemplateId === tpl.id ? 'selected' : ''
                }`}
                // Pass the current list of templates to avoid stale closure issues
                onClick={() => handleTemplateChange(tpl.id, templates)}
              >
                <img
                  src={tpl.thumbnail}
                  alt={tpl.name}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    const parent = e.target.parentNode;
                    if(parent && !parent.querySelector('.template-error-text')){
                      const errorText = document.createElement('p');
                      errorText.textContent = '(Preview unavailable)';
                      errorText.className = 'template-error-text';
                      parent.insertBefore(errorText, e.target.nextSibling);
                    }
                  }}
                />
                <p>{tpl.name}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No pre-built templates found.</p>
        )}
      </motion.aside>

      {/* Main Content */}
      <div className="main-content">
        <motion.header
          className="header-glass"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <h1>Edit & Preview Your Slides</h1>
          <div className="header-actions">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="topic-edit-input"
              aria-label="Presentation Topic/Filename"
            />
            <button className="btn-back" onClick={() => navigate(-1)}>
              <FaArrowLeft /> Back
            </button>
            <button className="btn-download" onClick={handleDownload} disabled={editedSlides.length === 0}>
              <FaDownload /> Download
            </button>
          </div>
        </motion.header>

        {/* Slide Editor Grid */}
        <div className="slides-grid">
          {editedSlides.map((s, index) => (
            s && s.id !== undefined ? (
              <motion.div
                key={s.id}
                whileHover={{ scale: 1.02 }}
                className="slide-editor"
                // The style prop has been removed from here
              >
                {/* Edit Section */}
                <div className="edit-section">
                  <h4>Slide {index + 1} - Edit</h4>
                  <label htmlFor={`title-${s.id}`}>Title</label>
                  <input
                    id={`title-${s.id}`}
                    type="text"
                    value={s.title || ''}
                    onChange={(e) => handleSlideChange(s.id, 'title', e.target.value)}
                    style={{ fontFamily: currentDesign.font }}
                  />

                  <label htmlFor={`bullets-${s.id}`}>Bullets (one per line)</label>
                  <textarea
                    id={`bullets-${s.id}`}
                    value={(s.bullets || []).join('\n')}
                    onChange={(e) => handleSlideChange(s.id, 'bullets', e.target.value) }
                    rows={5}
                    style={{ fontFamily: currentDesign.font }}
                  />

                  <label htmlFor={`imagePrompt-${s.id}`}>Image Prompt</label>
                  <input
                    id={`imagePrompt-${s.id}`}
                    type="text"
                    value={s.imagePrompt || ""}
                    onChange={(e) => handleSlideChange(s.id, "imagePrompt", e.target.value)}
                    style={{ fontFamily: currentDesign.font }}
                  />
                </div>

                {/* --- THIS IS THE FIXED PREVIEW SECTION --- */}
                <div className="preview-section">
                  <h4>Preview</h4>
                  <div
                    className="preview-slide"
                    style={{
                      backgroundColor: currentDesign.background,
                      backgroundImage: currentDesign.backgroundImage,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <h3
                      style={{
                        color: currentDesign.titleColor,
                        fontFamily: currentDesign.font,
                      }}
                    >
                      {s.title || '(No Title)'}
                    </h3>

                    <ul
                      style={{
                        color: currentDesign.textColor,
                        fontFamily: currentDesign.font,
                      }}
                    >
                      {(s.bullets || []).length > 0 ? (
                        (s.bullets || []).map((b, i) => (
                          <li key={`${s.id}-bullet-${i}`}>{b || '(Empty Bullet)'}</li>
                        ))
                      ) : (
                        <li>(No bullet points)</li>
                      )}
                    </ul>

                    {/* Image Preview (This is your original, correct logic) */}
                    <div className="image-preview-container">
                      {fetchingImages && previewImageUrls[s.id] === undefined ? (
                        <p className="loading-text">Generating preview URL...</p>
                      ) : previewImageUrls[s.id] ? (
                        <img
                          key={previewImageUrls[s.id]}
                          src={previewImageUrls[s.id]}
                          alt={`AI prompt: ${s.imagePrompt || s.title}`}
                          className="preview-image"
                          onLoad={(e) => {
                            e.target.style.opacity = '1';
                            const container = e.target.closest('.image-preview-container');
                            const errorMsg = container?.querySelector('.error-text');
                            if(errorMsg) container.removeChild(errorMsg);
                          }}
                          onError={(e) => {
                            console.warn(`Failed to load preview image for slide ${index + 1}: ${previewImageUrls[s.id]}`);
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            const container = e.target.closest('.image-preview-container');
                            if (container && !container.querySelector('.error-text')) {
                              const errorMsg = document.createElement('p');
                              errorMsg.textContent = '(Image failed to load)';
                              errorMsg.className = 'error-text';
                              container.appendChild(errorMsg);
                            }
                          }}
                          style={{ opacity: 0 }}
                        />
                      ) : (
                        <p className="no-image-text">(No image prompt)</p>
                      )}
                    </div>
                  </div>
                </div>
                {/* --- END OF FIXED PREVIEW SECTION --- */}

              </motion.div>
            ) : null
          ))}
          {editedSlides.length === 0 && <p className="no-slides-message">No slides to display. Go back and generate some!</p>}
        </div>
      </div>
    </div>
  );
}