import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaDownload, FaArrowLeft, FaArrowRight, FaSearch, FaQuestionCircle } from 'react-icons/fa';
import '../../styles/edit-preview.css';
import ConfirmDialog from '../../components/ConfirmDialog';
import GuideModal from '../../components/GuideModal';

// Custom hooks
import {
  useEditPreviewState,
  useStickerInteractions,
  useImageGeneration,
  useDraftManagement,
  useSlideHandlers,
  useStickerSearch
} from './hooks';

// Components
import {
  SlideCard,
  TemplateSidebar,
  DownloadPreviewModal
} from './components';

// Utils
import { saveDraft } from './utils';

export default function EditPreview() {
  const navigate = useNavigate();

  // Initialize all state from custom hook
  const state = useEditPreviewState();

  const {
    // Core state
    editedSlides,
    setEditedSlides,
    topic,
    setTopic,
    templates,
    loadingTemplates,
    selectedTemplateId,
    isSidebarOpen,
    setIsSidebarOpen,
    draftLoaded,
    setDraftLoaded,
    // Sticker state
    stickerSearchQuery,
    setStickerSearchQuery,
    openStickerFor,
    setOpenStickerFor,
    externalStickers,
    setExternalStickers,
    loadingExternalStickers,
    setLoadingExternalStickers,
    selectedSticker,
    setSelectedSticker,
    draggingSticker,
    setDraggingSticker,
    resizingSticker,
    setResizingSticker,
    rotatingSticker,
    setRotatingSticker,
    stickerCategories,
    // Text box state
    selectedTextBox,
    setSelectedTextBox,
    draggingTextBox,
    setDraggingTextBox,
    resizingTextBox,
    setResizingTextBox,
    // Image state
    selectedImage,
    setSelectedImage,
    previewImageUrls,
    setPreviewImageUrls,
    // Temporary input state
    tempFontSizes,
    setTempFontSizes,
    tempImagePrompts,
    setTempImagePrompts,
    // Modal state
    showDownloadPreview,
    setShowDownloadPreview,
    previewSlideIndex,
    setPreviewSlideIndex,
    deleteConfirm,
    setDeleteConfirm,
    showGuide,
    setShowGuide,
    // Additional state
    showImageColumn,
    setShowImageColumn,
    imageProvider,
    currentDesign,
    setCurrentDesign,
    setSelectedTemplateId,
    // Refs
    containerRefs,
    promptTimeouts,
    stickerAnchorRefs,
    urlsRefreshedRef,
    imageGenerationInProgress,
    generatedPromptsRef,
    // Handlers
    handleTemplateChange,
    // Location
    location
  } = state;

  // Sticker search hook
  const { filterStickers } = useStickerSearch({
    stickerCategories,
    stickerSearchQuery,
    setExternalStickers,
    setLoadingExternalStickers
  });

  // Draft management
  useDraftManagement({
    editedSlides,
    setEditedSlides,
    topic,
    setTopic,
    currentDesign,
    setCurrentDesign,
    setSelectedTemplateId,
    imageProvider,
    setImageProvider: state.setImageProvider,
    draftLoaded,
    setDraftLoaded,
    urlsRefreshedRef,
    location
  });

  // Image generation
  useImageGeneration({
    editedSlides,
    setEditedSlides,
    imageProvider,
    showImageColumn,
    previewImageUrls,
    setPreviewImageUrls,
    imageGenerationInProgress,
    generatedPromptsRef,
    topic,
    convId: location.state?.convId || topic,
    currentDesign
  });

  // Sticker interactions
  useStickerInteractions({
    draggingSticker,
    setDraggingSticker,
    resizingSticker,
    setResizingSticker,
    rotatingSticker,
    setRotatingSticker,
    draggingTextBox,
    setDraggingTextBox,
    resizingTextBox,
    setResizingTextBox,
    setEditedSlides,
    selectedSticker,
    setSelectedSticker,
    selectedImage,
    setSelectedImage,
    selectedTextBox,
    setSelectedTextBox,
    openStickerFor,
    setOpenStickerFor,
    setStickerSearchQuery,
    stickerAnchorRefs,
    topic,
    location,
    currentDesign,
    imageProvider
  });

  // Slide handlers
  const {
    handleSlideChange,
    handleStyleChange,
    handleImageUpload,
    handleRemoveImage,
    handleAddImageBack,
    handleAddSlide,
    handleDeleteSlide,
    handleReorderSlides,
    confirmDeleteSlide,
    handleAddSticker,
    handleRemoveSticker,
    handleDownload,
    openPreviewModal
  } = useSlideHandlers({
    editedSlides,
    setEditedSlides,
    topic,
    location,
    currentDesign,
    imageProvider,
    selectedTemplateId,
    selectedSticker,
    setSelectedSticker,
    selectedImage,
    setSelectedImage,
    selectedTextBox,
    setSelectedTextBox,
    previewImageUrls,
    setPreviewImageUrls,
    showImageColumn,
    setShowDownloadPreview,
    setPreviewSlideIndex
  });

  // Drag and drop state for slide reordering
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Drag event handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    const fromIndex = draggedIndex;
    if (fromIndex !== null && fromIndex !== toIndex) {
      handleReorderSlides(fromIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Save draft on ANY navigation away from this page (browser back, system back, page reload, etc.)
  useEffect(() => {
    const convId = location.state?.convId || topic;
    
    // Save draft when page unloads (reload, close tab, browser navigation)
    const handleBeforeUnload = (e) => {
      saveDraft(editedSlides, topic, convId, currentDesign, imageProvider);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup function runs when component unmounts (browser back, system back, route change)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save draft when component unmounts for ANY reason
      saveDraft(editedSlides, topic, convId, currentDesign, imageProvider);
    };
  }, [editedSlides, topic, location.state?.convId, currentDesign, imageProvider]);

  // Auto-save draft periodically (every 10 seconds for more frequent saves)
  useEffect(() => {
    const convId = location.state?.convId || topic;
    
    const autoSaveInterval = setInterval(() => {
      if (editedSlides.length > 0) {
        saveDraft(editedSlides, topic, convId, currentDesign, imageProvider);
      }
    }, 10000); // Save every 10 seconds
    
    return () => clearInterval(autoSaveInterval);
  }, [editedSlides, topic, location.state?.convId, currentDesign, imageProvider]);

  // Save draft when topic changes (with debounce via auto-save)
  useEffect(() => {
    const convId = location.state?.convId || topic;
    const timeoutId = setTimeout(() => {
      if (editedSlides.length > 0) {
        saveDraft(editedSlides, topic, convId, currentDesign, imageProvider);
      }
    }, 1000); // Debounce: save 1 second after topic stops changing
    
    return () => clearTimeout(timeoutId);
  }, [topic]);

  // Early return if no slides AND draft not loaded yet (wait for draft to load)
  if (!draftLoaded || (editedSlides.length === 0 && !location.state?.slides)) {
    return <div className="loading-message">Loading slide data... Please wait.</div>;
  }

  return (
    <div className="edit-preview-wrapper">
      {/* Sidebar */}
      <motion.aside
        className="sidebar-glass"
        initial={{ marginLeft: 0, opacity: 1 }}
        animate={{ marginLeft: isSidebarOpen ? 0 : -280, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <TemplateSidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          loadingTemplates={loadingTemplates}
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          handleTemplateChange={handleTemplateChange}
        />
      </motion.aside>

      {/* Main Content */}
      <div className="main-content">
        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)} className="sidebar-toggle-open">
            <FaArrowRight />
          </button>
        )}

        {/* Header */}
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
            <button
              className="btn-guide"
              onClick={() => setShowGuide(true)}
              title="Open Guide"
              style={{
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              <FaQuestionCircle /> Guide
            </button>
            <button
              className="btn-back"
              onClick={() => {
                const convId = location.state?.convId || topic;
                saveDraft(editedSlides, topic, convId, currentDesign, imageProvider);
                navigate(-1);
              }}
            >
              <FaArrowLeft /> Back
            </button>
            <button
              className="btn-download"
              onClick={openPreviewModal}
              disabled={editedSlides.length === 0}
              title="Preview slides before downloading"
            >
              <FaSearch /> Download Preview
            </button>
            <button
              className="btn-download"
              onClick={handleDownload}
              disabled={editedSlides.length === 0}
              title="Download PPTX now"
            >
              <FaDownload /> Download PPTX
            </button>
          </div>
        </motion.header>

        {/* Slides Grid */}
        <div className="slides-grid">
          {editedSlides.map((slide, index) => (
            <SlideCard
              key={slide.id}
              slide={slide}
              index={index}
              currentDesign={currentDesign}
              selectedTemplateId={selectedTemplateId}
              // Toolbar props
              openStickerFor={openStickerFor}
              setOpenStickerFor={setOpenStickerFor}
              stickerAnchorRefs={stickerAnchorRefs}
              stickerSearchQuery={stickerSearchQuery}
              setStickerSearchQuery={setStickerSearchQuery}
              stickerCategories={stickerCategories}
              externalStickers={externalStickers}
              loadingExternalStickers={loadingExternalStickers}
              filterStickers={filterStickers}
              handleAddSticker={handleAddSticker}
              setExternalStickers={setExternalStickers}
              handleStyleChange={handleStyleChange}
              handleAddImageBack={handleAddImageBack}
              tempFontSizes={tempFontSizes}
              setTempFontSizes={setTempFontSizes}
              // Text box props
              selectedTextBox={selectedTextBox}
              setSelectedTextBox={setSelectedTextBox}
              setDraggingTextBox={setDraggingTextBox}
              setResizingTextBox={setResizingTextBox}
              handleSlideChange={handleSlideChange}
              // Image props
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
              setDraggingSticker={setDraggingSticker}
              setResizingSticker={setResizingSticker}
              previewImageUrls={previewImageUrls}
              handleImageUpload={handleImageUpload}
              handleRemoveImage={handleRemoveImage}
              tempImagePrompts={tempImagePrompts}
              setTempImagePrompts={setTempImagePrompts}
              promptTimeouts={promptTimeouts}
              // Sticker props
              selectedSticker={selectedSticker}
              setSelectedSticker={setSelectedSticker}
              setRotatingSticker={setRotatingSticker}
              handleRemoveSticker={handleRemoveSticker}
              setEditedSlides={setEditedSlides}
              // Delete slide
              handleDeleteSlide={(slideId) => {
                if (handleDeleteSlide(slideId)) {
                  setDeleteConfirm({ open: true, slideId });
                }
              }}
              // Drag and drop
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
              isDragging={draggedIndex === index}
              isDragOver={dragOverIndex === index && draggedIndex !== index}
              // Refs
              containerRefs={containerRefs}
            />
          ))}

          {/* Add Slide Button */}
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
              onMouseEnter={(e) => { e.target.style.opacity = '0.8'; }}
              onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
            >
              ➕ Add Slide
            </button>
          </div>

          {editedSlides.length === 0 && (
            <p className="no-slides-message">No slides to display. Go back and generate some!</p>
          )}
        </div>
      </div>

      {/* Download Preview Modal */}
      <DownloadPreviewModal
        showDownloadPreview={showDownloadPreview}
        closePreviewModal={() => setShowDownloadPreview(false)}
        editedSlides={editedSlides}
        previewSlideIndex={previewSlideIndex}
        setPreviewSlideIndex={setPreviewSlideIndex}
        showImageColumn={showImageColumn}
        setShowImageColumn={setShowImageColumn}
        previewImageUrls={previewImageUrls}
        currentDesign={currentDesign}
        handleDownload={handleDownload}
      />

      {/* Confirm Dialog for Delete Slide */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Slide"
        message="Are you sure you want to delete this slide? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => confirmDeleteSlide(deleteConfirm.slideId, setDeleteConfirm)}
        onCancel={() => setDeleteConfirm({ open: false, slideId: null })}
      />

      {/* Guide Modal */}
      <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}
