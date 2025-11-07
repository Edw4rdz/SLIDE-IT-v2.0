// src/pages/EditPreview.js
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaDownload, FaArrowLeft, FaArrowRight, FaUpload, FaTimesCircle } from 'react-icons/fa';
import { getTemplates, downloadPPTX } from '../api';
import '../styles/edit-preview.css';



// Helper function (keep as is)
const getPollinationsImageUrl = (prompt) => {
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') return null;
  const encodedPrompt = encodeURIComponent(prompt.trim());
  return `https://image.pollinations.ai/prompt/${encodedPrompt}`;
};

export default function EditPreview() {
  const location = useLocation();
  const [slides, setSlides] = useState(location.state?.slides || []);
  const navigate = useNavigate();
  
  const initialSlides = (location.state?.slides || []).map((slide, index) => ({
    ...slide,
    id: slide.id ?? `slide-${index}-${Date.now()}`, 
    layout: index === 0 ? 'title' : 'content',
    uploadedImage: null, 
    // per-slide styles (editable via toolbar)
    styles: slide.styles || {
      titleFont: 'Arial',
      titleSize: 32,
      titleBold: false,
      titleItalic: false,
      textFont: 'Arial',
      textSize: 16,
      textBold: false,
      textItalic: false,
      textAlign: 'left'
    }
  }));
  const [editedSlides, setEditedSlides] = useState(initialSlides);
  const [topic, setTopic] = useState(location.state?.topic || 'My_Presentation');
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // This state correctly reads the flag from the previous page
  const [showImageColumn, setShowImageColumn] = useState(location.state?.includeImages ?? true);
  
  const [currentDesign, setCurrentDesign] = useState({
    font: "Arial",
    globalBackground: "#ffffff",
    globalTitleColor: "#000000",
    globalTextColor: "#333333",
    layouts: {
      title: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" },
      content: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" }
    }
  });
 
  const [previewImageUrls, setPreviewImageUrls] = useState({});
  const [fetchingImages, setFetchingImages] = useState(true);
  
  // All your functions (handleTemplateChange, useEffects, handleSlideChange, etc.)
  // are 100% correct and do not need to be changed.
  const handleTemplateChange = useCallback((templateId, availableTemplates) => {
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId('');
      setCurrentDesign({
        font: "Arial",
        globalBackground: "#ffffff",
        globalTitleColor: "#000000",
        globalTextColor: "#333333",
        layouts: {
          title: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" },
          content: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" }
        }
      });
      localStorage.removeItem('selectedTemplate');
      return;
    }
    const selected = availableTemplates.find((t) => t.id === templateId);
    if (selected && selected.design) {
      setSelectedTemplateId(templateId);
      const newDesign = { ...selected.design, id: selected.id };
      setCurrentDesign(newDesign);
      localStorage.setItem('selectedTemplate', JSON.stringify(newDesign));
    } else {
      console.warn("Selected template is missing 'design' object:", selected);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    const navigationDesign = location.state?.initialDesign;
    if (navigationDesign && navigationDesign.id) {
      console.log('Using initial design from navigation state:', navigationDesign);
      setCurrentDesign(navigationDesign);
      setSelectedTemplateId(navigationDesign.id);
    } else {
      console.log('No navigation state found, checking localStorage.');
      const saved = localStorage.getItem('selectedTemplate');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.id) { 
            setCurrentDesign(parsed);
            setSelectedTemplateId(parsed.id || '');
             console.log('Restored design from localStorage:', parsed);
          } else {
            console.log('Clearing invalid template from localStorage.');
            localStorage.removeItem('selectedTemplate');
          }
        } catch (e) {
           console.error('Error parsing localStorage template:', e);
          localStorage.removeItem('selectedTemplate');
        }
      } else {
         console.log('No selected template found in localStorage.');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    let isMounted = true;
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const res = await getTemplates();
        if (isMounted) {
          const fetchedTemplates = res.data || [];
          setTemplates(fetchedTemplates);
          const storedTemplate = JSON.parse(localStorage.getItem('selectedTemplate'));
          
          if (storedTemplate && storedTemplate.id && fetchedTemplates.find(t => t.id === storedTemplate.id)) {
            setCurrentDesign(storedTemplate);
            setSelectedTemplateId(storedTemplate.id);
          } else if (storedTemplate) {
            localStorage.removeItem('selectedTemplate');
          }
          
          setLoadingTemplates(false);
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
        if (isMounted) {
          setLoadingTemplates(false);
        }
      }
    };
    fetchTemplates();
    return () => {
      isMounted = false;
    };
  }, []); 

  useEffect(() => {
    if (editedSlides && editedSlides.length > 0 && showImageColumn) {
      setFetchingImages(true);
      const urls = {};
      editedSlides.forEach((slide) => {
        if (slide.id !== undefined) {
          if (slide.imagePrompt && !slide.uploadedImage) {
            urls[slide.id] = getPollinationsImageUrl(slide.imagePrompt);
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
  }, [editedSlides, showImageColumn]); 

  // Convert hex color like #RRGGBB or #RGB to rgba(...) with given alpha.
  const hexToRgba = (hex, alpha = 1) => {
    if (!hex || typeof hex !== 'string') return `rgba(0,0,0,${alpha})`;
    let h = hex.replace('#', '').trim();
    if (h.length === 3) {
      h = h.split('').map(c => c + c).join('');
    }
    if (h.length !== 6) return `rgba(0,0,0,${alpha})`;
    const r = parseInt(h.substring(0,2), 16);
    const g = parseInt(h.substring(2,4), 16);
    const b = parseInt(h.substring(4,6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  const handleSlideChange = (id, field, value) => {
    setEditedSlides((currentSlides) =>
      currentSlides.map((s) => {
        if (s.id === id) {
          let updatedSlide = {
            ...s,
            [field]: field === 'bullets' ? value.split('\n').map(b => b.trim()).filter(b => b) : value
          };
          if (field === 'imagePrompt') {
            updatedSlide.uploadedImage = null; 
          }
          return updatedSlide;
        }
        return s;
      })
    );
  };

  // Update per-slide style settings (font, size, bold, italic, align)
  const handleStyleChange = (slideId, key, value) => {
    setEditedSlides(currentSlides =>
      currentSlides.map(s => {
        if (s.id !== slideId) return s;
        const newStyles = { ...(s.styles || {}) };
        // Apply the change only to the specific style key for this slide.
        // Removed automatic propagation between title and text so each
        // control operates independently (title controls only title, etc.).
        newStyles[key] = value;
        return { ...s, styles: newStyles };
      })
    );
  };

  const handleImageUpload = (event, slideId) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setEditedSlides(currentSlides =>
          currentSlides.map(s =>
            s.id === slideId ? { ...s, uploadedImage: base64String, imagePrompt: "" } : s
          )
        );
      };
      reader.readAsDataURL(file);
    }
    event.target.value = null;
  };

  const handleRemoveImage = (slideId) => {
    setEditedSlides(currentSlides =>
      currentSlides.map(s =>
        s.id === slideId ? { ...s, uploadedImage: null, imagePrompt: "" } : s
      )
    );
  };
    // ➕ Add a new blank slide
  const handleAddSlide = () => {
    const newSlide = {
      id: `slide-${Date.now()}`,
      title: "New Slide",
      bullets: ["New point 1", "New point 2"],
      layout: "content",
      uploadedImage: null,
      imagePrompt: "",
      styles: {
        titleFont: currentDesign.font || 'Arial',
        titleSize: 32,
        titleBold: false,
        titleItalic: false,
        textFont: currentDesign.font || 'Arial',
        textSize: 16,
        textBold: false,
        textItalic: false,
        textAlign: 'left'
      }
    };
    setEditedSlides(prev => [...prev, newSlide]);
  };

  // ❌ Delete a slide by ID
  const handleDeleteSlide = (slideId) => {
    if (window.confirm("Are you sure you want to delete this slide?")) {
      setEditedSlides(prev => prev.filter(s => s.id !== slideId));
    }
  };

  // ✅ --- THIS FUNCTION IS UPDATED --- ✅
  const handleDownload = () => {
    if (!editedSlides.length) return alert("No slides to download!");
    const sanitizedTopic = topic.replace(/[\s/\\?%*:|"<>]/g, "_");
    const fileName = `${sanitizedTopic}_presentation.pptx`;
    
    const activeDesign = selectedTemplateId ? currentDesign : {
      font: "Arial",
      globalBackground: "#ffffff",
      globalTitleColor: "#000000",
      globalTextColor: "#333333",
      layouts: {
        title: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" },
        content: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" }
      }
    };
    
    // Pass the 'showImageColumn' flag to the download function
    downloadPPTX(editedSlides, activeDesign, fileName, showImageColumn);
  };

  if (!location.state?.slides && editedSlides.length === 0) return <div className="loading-message">Loading slide data... Please wait.</div>;

  // --- The rest of your JSX is 100% correct and unchanged ---
  // build slides JSX outside return to simplify JSX parsing
  const slidesJSX = editedSlides.map((s, index) => {
    // ... (theme logic is unchanged)
    const slideLayout = s.layout || 'content';
    const layoutStyles = currentDesign.layouts?.[slideLayout] || {};
    const theme = {
      background: layoutStyles.background || currentDesign.globalBackground,
      titleColor: layoutStyles.titleColor || currentDesign.globalTitleColor,
      textColor: layoutStyles.textColor || currentDesign.globalTextColor,
      font: currentDesign.font || 'Arial',
    };
    let previewStyle = {
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
    if (Array.isArray(theme.background)) {
      previewStyle.backgroundImage = `linear-gradient(135deg, ${theme.background.join(', ')})`;
    } else if (typeof theme.background === 'string' && theme.background.startsWith('http')) {
      previewStyle.backgroundImage = `url(${theme.background})`;
    } else {
      previewStyle.backgroundColor = theme.background || '#FFFFFF';
    }

    return (
      <div key={s.id} className="slide-wrapper" style={{width: '100%'}}>
        {/* Toolbar rendered outside (above) the slide card to preserve UI */}
        <div
          className="slide-toolbar-outside"
          role="toolbar"
          aria-label="Slide text styling"
          style={{
            background: hexToRgba(theme.titleColor || currentDesign.globalTitleColor, 0.12),
            borderColor: hexToRgba(theme.titleColor || currentDesign.globalTitleColor, 0.08)
          }}
        >
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <label style={{fontSize:12}}>Title:</label>
            <select value={s.styles?.titleFont || 'Arial'} onChange={(e) => handleStyleChange(s.id, 'titleFont', e.target.value)}>
              <option>Arial</option>
              <option>Inter</option>
              <option>Georgia</option>
              <option>"Times New Roman"</option>
              <option>"Courier New"</option>
            </select>
            <input type="number" value={s.styles?.titleSize || 32} min={10} max={80} style={{width:64}} onChange={(e) => handleStyleChange(s.id, 'titleSize', Number(e.target.value))} />
            <button className="toolbar-button" onClick={() => handleStyleChange(s.id, 'titleBold', !s.styles?.titleBold)} style={{fontWeight: s.styles?.titleBold ? 700 : 400}}>B</button>
            <button className="toolbar-button" onClick={() => handleStyleChange(s.id, 'titleItalic', !s.styles?.titleItalic)} style={{fontStyle: s.styles?.titleItalic ? 'italic' : 'normal'}}>I</button>
          </div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <label style={{fontSize:12}}>Text:</label>
            <select value={s.styles?.textFont || 'Arial'} onChange={(e) => handleStyleChange(s.id, 'textFont', e.target.value)}>
              <option>Arial</option>
              <option>Inter</option>
              <option>Georgia</option>
              <option>"Times New Roman"</option>
              <option>"Courier New"</option>
            </select>
            <input type="number" value={s.styles?.textSize || 16} min={8} max={48} style={{width:56}} onChange={(e) => handleStyleChange(s.id, 'textSize', Number(e.target.value))} />
            <button className="toolbar-button" onClick={() => handleStyleChange(s.id, 'textBold', !s.styles?.textBold)} style={{fontWeight: s.styles?.textBold ? 700 : 400}}>B</button>
            <button className="toolbar-button" onClick={() => handleStyleChange(s.id, 'textItalic', !s.styles?.textItalic)} style={{fontStyle: s.styles?.textItalic ? 'italic' : 'normal'}}>I</button>
            <button className="toolbar-button" onClick={() => handleStyleChange(s.id, 'textAlign', 'left')}>L</button>
            <button className="toolbar-button" onClick={() => handleStyleChange(s.id, 'textAlign', 'center')}>C</button>
            <button className="toolbar-button" onClick={() => handleStyleChange(s.id, 'textAlign', 'right')}>R</button>
          </div>
        </div>

        <div 
          className="slide-preview-card gamma-style" 
          style={{...previewStyle, color: theme.textColor, fontFamily: theme.font}}
        >
         {/* 🗑 DELETE BUTTON (Top right of each slide) */}
          <button
            className="delete-slide-btn"
            onClick={() => handleDeleteSlide(s.id)}
            title="Delete this slide"
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              backgroundColor: theme.titleColor,
              color: theme.background,
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            ×
          </button>
          <div className="slide-content-area">
            <div className="form-group">
              <label htmlFor={`title-${s.id}`} className="sr-only">Slide Title</label>
              <input
                id={`title-${s.id}`}
                type="text"
                className="form-control-title-preview"
                value={s.title || ''}
                onChange={(e) => handleSlideChange(s.id, 'title', e.target.value)}
                style={{
                  color: theme.titleColor,
                  fontFamily: s.styles?.titleFont || theme.font,
                  borderColor: theme.titleColor,
                  fontSize: `${s.styles?.titleSize || 32}px`,
                  fontWeight: s.styles?.titleBold ? 700 : 400,
                  fontStyle: s.styles?.titleItalic ? 'italic' : 'normal'
                }}
                placeholder="Type your title..."
              />
            </div>
            <div className="form-group">
              <label htmlFor={`bullets-${s.id}`} className="sr-only">Slide Bullets</label>
              <textarea
                id={`bullets-${s.id}`}
                className="form-control-bullets-preview"
                value={(s.bullets || []).join('\n')}
                onChange={(e) => handleSlideChange(s.id, 'bullets', e.target.value)}
                rows={8}
                style={{
                  color: theme.textColor,
                  fontFamily: s.styles?.textFont || theme.font,
                  borderColor: theme.textColor,
                  fontSize: `${s.styles?.textSize || 16}px`,
                  fontWeight: s.styles?.textBold ? 700 : 400,
                  fontStyle: s.styles?.textItalic ? 'italic' : 'normal',
                  textAlign: s.styles?.textAlign || 'left'
                }}
                placeholder="Type your bullet points (one per line)..."
              />
            </div>
          </div>
          {/* Image prompt / upload controls + preview are inside the slide card */}
          {showImageColumn && (
            <div className="slide-image-prompt-area" style={{ borderColor: theme.textColor, color: theme.textColor }}>
              <div className="form-group">
                <label htmlFor={`imagePrompt-${s.id}`} style={{ color: theme.titleColor, fontWeight: 'bold' }}>
                  AI Image Prompt
                </label>
                <input
                  id={`imagePrompt-${s.id}`}
                  type="text"
                  className="image-prompt-input"
                  value={s.imagePrompt || ""}
                  onChange={(e) => handleSlideChange(s.id, "imagePrompt", e.target.value)}
                  style={{
                    fontFamily: theme.font,
                    color: theme.textColor,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: `1px solid ${theme.textColor}`,
                    borderRadius: '8px',
                    width: '100%',
                    padding: '10px',
                    marginTop: '5px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Describe an AI image..."
                />
              </div>

              <div className="image-buttons-container">
                <label htmlFor={`upload-${s.id}`} className="upload-image-btn">
                  <FaUpload /> Upload
                </label>
                <input 
                  type="file" 
                  id={`upload-${s.id}`}
                  className="hidden-file-input"
                  accept="image/png, image/jpeg, image/gif"
                  onChange={(e) => handleImageUpload(e, s.id)}
                />
                {(s.uploadedImage || s.imagePrompt) && (
                  <button 
                    className="remove-image-btn"
                    onClick={() => handleRemoveImage(s.id)}
                  >
                    <FaTimesCircle /> Pure Text
                  </button>
                )}
              </div>

              <div className="image-preview-container" style={{marginTop:12}}>
                {s.uploadedImage ? (
                  <img
                    key={s.id}
                    src={s.uploadedImage}
                    alt="User upload"
                    className="preview-image loaded"
                    style={{ opacity: 1, objectFit: 'cover' }}
                  />
                ) : fetchingImages && previewImageUrls[s.id] === undefined && s.imagePrompt ? (
                  <p className="loading-text">Generating...</p>
                ) : previewImageUrls[s.id] ? (
                  <img
                    key={previewImageUrls[s.id]}
                    src={previewImageUrls[s.id]}
                    alt={`AI prompt: ${s.imagePrompt || s.title}`}
                    className="preview-image loaded"
                    style={{ opacity: 1 }}
                    onLoad={(e) => e.target.classList.add('loaded')}
                  />
                ) : (
                  <p className="no-image-text">(No image prompt or upload)</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  });

  return (
    <div className="edit-preview-wrapper">
      <motion.aside
        className="sidebar-glass"
        initial={{ marginLeft: 0, opacity: 1 }} 
        animate={{ marginLeft: isSidebarOpen ? 0 : -280, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="sidebar-content-wrapper">
          <div className="sidebar-header">
            <h2>🎨 Templates</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="sidebar-toggle">
              <FaArrowLeft />
            </button>
          </div>
          
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
                  onClick={() => handleTemplateChange(tpl.id, templates)}
                >
                  <img src={tpl.thumbnail} alt={tpl.name} />
                  <p>{tpl.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No pre-built templates found.</p>
          )}
        </div>
      </motion.aside>

      <div className="main-content">
        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)} className="sidebar-toggle-open">
            <FaArrowRight />
          </button>
        )}

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

        <div className="slides-grid">
          {slidesJSX}
          {/* ➕ ADD SLIDE BUTTON (After all slides) */}
  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
    <button
      onClick={handleAddSlide}
      className="add-slide-btn"
      style={{
        backgroundColor: currentDesign.globalTitleColor,
        color: currentDesign.globalBackground,
        border: 'none',
        borderRadius: '12px',
        padding: '12px 24px',
        fontSize: '16px',
        cursor: 'pointer',
        transition: '0.3s',
      }}
      onMouseEnter={(e) => {
        e.target.style.opacity = '0.8';
      }}
      onMouseLeave={(e) => {
        e.target.style.opacity = '1';
      }}
    >
      ➕ Add Slide
    </button>
  </div>
          {editedSlides.length === 0 && <p className="no-slides-message">No slides to display. Go back and generate some!</p>}
        </div>
      </div>
    </div>
  );
}