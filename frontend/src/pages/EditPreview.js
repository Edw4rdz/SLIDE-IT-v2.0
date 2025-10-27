import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaDownload, FaArrowLeft } from "react-icons/fa";
// Import main API functions
import { getTemplates, downloadPPTX } from "../api";
import "./edit-preview.css"; // Make sure CSS is imported

// Helper function to generate Pollinations URL
const getPollinationsImageUrl = (prompt) => {
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === "") return null;
  const encodedPrompt = encodeURIComponent(prompt.trim());
  return `https://image.pollinations.ai/prompt/${encodedPrompt}`;
};


export default function EditPreview() {
  const location = useLocation();
  const navigate = useNavigate();

  // Ensure initialSlides have unique IDs if they don't already
  const initialSlides = (location.state?.slides || []).map((slide, index) => ({
      ...slide,
      id: slide.id ?? index // Assign index as ID if 'id' is missing
  }));

  const [editedSlides, setEditedSlides] = useState(initialSlides);
  const [topic, setTopic] = useState(location.state?.topic || "My_Presentation");

  // State for prebuilt templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // State for image previews
  const [previewImageUrls, setPreviewImageUrls] = useState({}); // Stores { slideId: 'url' }
  const [fetchingImages, setFetchingImages] = useState(true); // Track initial URL generation

  // Fetch prebuilt templates
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
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

  // Effect to generate image URLs for preview
  useEffect(() => {
    if (editedSlides && editedSlides.length > 0) {
      setFetchingImages(true);
      const urls = {};
      editedSlides.forEach(slide => {
        // Ensure slide.id exists before using it as a key
        if (slide.id !== undefined) {
            const prompt = slide.imagePrompt || slide.title; // Use imagePrompt or fallback to title
            if (prompt) {
                urls[slide.id] = getPollinationsImageUrl(prompt); // Generate URL
            }
        } else {
            console.warn("Slide missing ID, cannot generate preview URL:", slide);
        }
      });
      setPreviewImageUrls(urls);
      setFetchingImages(false); // Done generating URLs (actual image loading is async via <img>)
    } else {
      setFetchingImages(false);
      setPreviewImageUrls({}); // Clear URLs if no slides
    }
  }, [editedSlides]); // Re-run if editedSlides array changes reference

  // Handle changes in text inputs
  const handleSlideChange = (id, field, value) => {
    setEditedSlides((currentSlides) =>
      currentSlides.map((s) => {
        if (s.id === id) {
          const updatedSlide = {
            ...s,
            [field]: field === "bullets" ? value.split("\n").map(b => b.trim()).filter(b => b) : value // Trim bullets and remove empty lines
          };
          // If imagePrompt changes, update the preview URL immediately
          if (field === 'imagePrompt') {
            setPreviewImageUrls(prevUrls => ({
              ...prevUrls,
              [id]: getPollinationsImageUrl(value)
            }));
          }
          return updatedSlide;
        }
        return s;
      })
    );
  };

  // Handle download using the function from api.js
  const handleDownload = () => {
    if (!editedSlides.length) return alert("No slides to download!");
    // Sanitize filename to remove invalid characters
    const sanitizedTopic = topic.replace(/[\s/\\?%*:|"<>]/g, "_");
    const fileName = `${sanitizedTopic}_presentation.pptx`;
    // Pass the currently edited slides data to the download function
    downloadPPTX(editedSlides, fileName);
  };

  // Show loading state if initial slides haven't loaded yet
  if (!location.state?.slides) return <div className="loading-message">Loading slide data... Please wait.</div>;
   // Handle case where editedSlides might become empty during editing
   if (!editedSlides) return <div className="loading-message">No slides available for editing.</div>;


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
                  selectedTemplate?.id === tpl.id ? "selected" : ""
                }`}
                onClick={() => setSelectedTemplate(tpl)} // Store the whole template object if needed later
              >
                <img
                  src={tpl.thumbnail}
                  alt={tpl.name}
                  // Basic fallback if image fails to load
                  onError={(e) => {
                      e.target.onerror = null; // Prevent infinite loop
                      e.target.style.display = 'none'; // Hide broken image
                      // Optionally show placeholder text in parent div
                      const parent = e.target.parentNode;
                      if(parent){
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
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Title - will be centered due to CSS flex-grow and text-align */}
          <h1>Edit & Preview Your Slides</h1>

          {/* Actions Group (Input + Buttons) */}
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
             // Ensure 's' and 's.id' are defined before rendering
             s && s.id !== undefined ? (
            <motion.div key={s.id} whileHover={{ scale: 1.02 }} className="slide-editor">
              {/* Edit Section */}
              <div className="edit-section">
                 <h4>Slide {index + 1} - Edit</h4>
                 <label htmlFor={`title-${s.id}`}>Title</label>
                 <input
                   id={`title-${s.id}`}
                   type="text"
                   value={s.title || ""}
                   onChange={(e) => handleSlideChange(s.id, "title", e.target.value)}
                 />

                 <label htmlFor={`bullets-${s.id}`}>Bullets (one per line)</label>
                 <textarea
                   id={`bullets-${s.id}`}
                   value={(s.bullets || []).join("\n")}
                   onChange={(e) => handleSlideChange(s.id, "bullets", e.target.value) }
                   rows={5} // Adjust rows as needed
                 />
              </div>

              {/* Preview Section */}
              <div className="preview-section">
                 <h4>Preview</h4>
                <div className="preview-slide">
                  <h3>{s.title || "(No Title)"}</h3>
                  <ul>
                    {(s.bullets || []).length > 0 ? (
                        (s.bullets || []).map((b, i) => (
                            // Use a more robust key combining slide id and index
                            <li key={`${s.id}-bullet-${i}`}>{b || "(Empty Bullet)"}</li>
                        ))
                    ) : (
                        <li>(No bullet points)</li>
                    )}
                  </ul>

                  {/* Display Image Preview */}
                  <div className="image-preview-container">
                    {fetchingImages && previewImageUrls[s.id] === undefined ? ( // Show loading only if URL isn't generated yet
                      <p className="loading-text">Generating preview URL...</p>
                    ) : previewImageUrls[s.id] ? (
                      <img
                        key={previewImageUrls[s.id]} // Force re-render if URL changes
                        src={previewImageUrls[s.id]}
                        alt={`AI prompt: ${s.imagePrompt || s.title}`}
                        className="preview-image"
                        // Handle loading/error state for the image itself
                        onLoad={(e) => {
                            e.target.style.opacity = '1'; // Fade in on successful load
                            // Remove any previous error message for this container
                            const container = e.target.closest('.image-preview-container');
                            const errorMsg = container?.querySelector('.error-text');
                            if(errorMsg) container.removeChild(errorMsg);
                        }}
                        onError={(e) => {
                          console.warn(`Failed to load preview image for slide ${index + 1}: ${previewImageUrls[s.id]}`);
                          e.target.onerror = null; // Prevent infinite loop
                          e.target.style.display = 'none'; // Hide broken image element
                          // Display error message within the container
                          const container = e.target.closest('.image-preview-container');
                          if (container && !container.querySelector('.error-text')) { // Add error only once
                              const errorMsg = document.createElement('p');
                              errorMsg.textContent = '(Image failed to load)';
                              errorMsg.className = 'error-text';
                              container.appendChild(errorMsg);
                          }
                        }}
                        style={{ opacity: 0 }} // Start transparent for fade-in effect
                      />
                    ) : (
                      <p className="no-image-text">(No image prompt)</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
            ) : null // Render nothing if slide data is invalid
          ))}
          {/* Display message if there are no slides at all */}
          {editedSlides.length === 0 && <p className="no-slides-message">No slides to display. Go back and generate some!</p>}
        </div>
      </div>
    </div>
  );
}