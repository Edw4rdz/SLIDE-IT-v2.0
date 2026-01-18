import React from 'react';
import { FaTrash, FaGripVertical } from 'react-icons/fa';
import SlideToolbar from './SlideToolbar';
import TitleBox from './TitleBox';
import BodyBox from './BodyBox';
import StickerOverlay from './StickerOverlay';
import SlideImage from './SlideImage';

const SlideCard = ({
  slide,
  index,
  currentDesign,
  selectedTemplateId,
  // Toolbar props
  openStickerFor,
  setOpenStickerFor,
  stickerAnchorRefs,
  stickerSearchQuery,
  setStickerSearchQuery,
  stickerCategories,
  externalStickers,
  loadingExternalStickers,
  filterStickers,
  handleAddSticker,
  setExternalStickers,
  handleStyleChange,
  handleAddImageBack,
  tempFontSizes,
  setTempFontSizes,
  // Text box props
  selectedTextBox,
  setSelectedTextBox,
  setDraggingTextBox,
  setResizingTextBox,
  handleSlideChange,
  // Image props
  selectedImage,
  setSelectedImage,
  setDraggingSticker,
  setResizingSticker,
  previewImageUrls,
  handleImageUpload,
  handleRemoveImage,
  tempImagePrompts,
  setTempImagePrompts,
  promptTimeouts,
  // Sticker props
  selectedSticker,
  setSelectedSticker,
  setRotatingSticker,
  handleRemoveSticker,
  setEditedSlides,
  // Delete slide
  handleDeleteSlide,
  // Drag and drop
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging,
  isDragOver,
  // Refs
  containerRefs
}) => {
  const s = slide;

  // Per-slide background color logic
  const slideLayout = s.layout || 'content';
  const layoutStyles = currentDesign.layouts?.[slideLayout] || {};
  let slideBg = s.background || layoutStyles.background || currentDesign.globalBackground;
  const titleColor = s.titleColor || layoutStyles.titleColor || currentDesign.globalTitleColor || '#000';
  const textColor = s.textColor || layoutStyles.textColor || currentDesign.globalTextColor || '#333';

  const theme = {
    background: slideBg,
    titleColor,
    textColor,
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
    <div 
      key={s.id} 
      className="slide-wrapper" 
      style={{ 
        width: '100%',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
        transition: 'transform 0.2s ease, opacity 0.2s ease',
        border: isDragOver ? '2px dashed #667eea' : '2px solid transparent',
        borderRadius: '12px',
      }}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
    >
      {/* Toolbar */}
      <SlideToolbar
        slide={s}
        theme={theme}
        currentDesign={currentDesign}
        selectedTemplateId={selectedTemplateId}
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
      />

      <div
        className="slide-preview-card gamma-style"
        style={{ ...previewStyle, color: theme.textColor, fontFamily: theme.font }}
      >
        {/* Slide Controls - Drag Handle and Delete */}
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          gap: '8px',
          zIndex: 1000,
        }}>
          {/* Drag Handle */}
          <div
            title="Drag to reorder"
            style={{
              backgroundColor: '#6b7280',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4b5563';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6b7280';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <FaGripVertical size={14} />
          </div>

          {/* Delete Button */}
          <button
            className="delete-slide-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteSlide(s.id);
            }}
            title="Delete this slide"
            style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <FaTrash size={14} />
          </button>
        </div>

        <div className="slide-content-area" style={{ display: 'none' }}></div>

        {/* Overlay container */}
        <div
          ref={(el) => { if (el) containerRefs.current[s.id] = el; }}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}
        >
          {/* Title Box */}
          <TitleBox
            slide={s}
            theme={theme}
            currentDesign={currentDesign}
            selectedTextBox={selectedTextBox}
            setSelectedTextBox={setSelectedTextBox}
            setSelectedSticker={setSelectedSticker}
            setSelectedImage={setSelectedImage}
            setDraggingTextBox={setDraggingTextBox}
            setResizingTextBox={setResizingTextBox}
            handleSlideChange={handleSlideChange}
            containerRefs={containerRefs}
          />

          {/* Body Box */}
          <BodyBox
            slide={s}
            theme={theme}
            currentDesign={currentDesign}
            selectedTextBox={selectedTextBox}
            setSelectedTextBox={setSelectedTextBox}
            setSelectedSticker={setSelectedSticker}
            setSelectedImage={setSelectedImage}
            setDraggingTextBox={setDraggingTextBox}
            setResizingTextBox={setResizingTextBox}
            handleSlideChange={handleSlideChange}
            containerRefs={containerRefs}
          />

          {/* Stickers */}
          <StickerOverlay
            slide={s}
            selectedSticker={selectedSticker}
            setSelectedSticker={setSelectedSticker}
            setSelectedImage={setSelectedImage}
            setDraggingSticker={setDraggingSticker}
            setResizingSticker={setResizingSticker}
            setRotatingSticker={setRotatingSticker}
            containerRefs={containerRefs}
            handleRemoveSticker={handleRemoveSticker}
            setEditedSlides={setEditedSlides}
          />

          {/* Image */}
          {!s.removedImage && (s.uploadedImage || previewImageUrls[s.id]) && (
            <SlideImage
              slide={s}
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
              setSelectedSticker={setSelectedSticker}
              setDraggingSticker={setDraggingSticker}
              setResizingSticker={setResizingSticker}
              previewImageUrls={previewImageUrls}
              containerRefs={containerRefs}
              handleImageUpload={handleImageUpload}
              handleRemoveImage={handleRemoveImage}
              handleSlideChange={handleSlideChange}
              tempImagePrompts={tempImagePrompts}
              setTempImagePrompts={setTempImagePrompts}
              promptTimeouts={promptTimeouts}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SlideCard;
