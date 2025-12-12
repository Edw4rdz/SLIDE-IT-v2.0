import React, { useState } from 'react';
import { FaTimes, FaDownload, FaArrowLeft, FaArrowRight, FaUpload, FaTimesCircle, FaSearch, FaAlignLeft, FaAlignCenter, FaAlignRight, FaTable, FaAngleDoubleUp, FaAngleUp, FaAngleDown, FaAngleDoubleDown, FaTrash, FaPlus, FaImage, FaFont, FaPalette, FaRedo, FaUndo, FaChevronLeft, FaChevronRight, FaMinus } from 'react-icons/fa';

const GuideModal = ({ isOpen, onClose }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  const pages = [
    // Page 0: Welcome
    {
      title: '👋 Welcome to Edit & Preview!',
      content: (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>🎨</div>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '12px' }}>
              Your Creative Workspace
            </h2>
            <p style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.8', maxWidth: '600px', margin: '0 auto' }}>
              Welcome to the <strong>Edit & Preview</strong> page—your powerful workspace for perfecting presentations! 
              This guide will walk you through all the amazing features available to you.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '40px' }}>
            <div style={{ padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>Easy to Use</div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>Intuitive interface</div>
            </div>
            <div style={{ padding: '20px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '12px', color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>Powerful Tools</div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>Professional features</div>
            </div>
            <div style={{ padding: '20px', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: '12px', color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚡</div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>Auto-Save</div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>Never lose work</div>
            </div>
          </div>

          <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '12px', border: '2px solid #3b82f6' }}>
            <p style={{ fontSize: '15px', color: '#1e40af', lineHeight: '1.6', margin: 0, textAlign: 'center' }}>
              <strong>💡 Tip:</strong> This guide has multiple pages. Use the navigation buttons at the bottom to explore all features!
            </p>
          </div>
        </div>
      ),
    },
    // Page 1: Templates & Design
    {
      title: '🎨 Templates & Design',
      content: (
        <div>
          <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', borderLeft: '4px solid #667eea' }}>
            <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaPalette style={{ color: '#667eea' }} /> Templates Sidebar
            </h4>
            <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: '1.6', marginBottom: '12px' }}>
              Browse and apply professional templates to your presentation. Click any template to instantly transform all slides 
              with matching colors, fonts, and backgrounds.
            </p>
            <ul style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
              <li>Click a template thumbnail to apply it</li>
              <li>Toggle sidebar visibility with arrow buttons</li>
              <li>Templates update all slides automatically</li>
            </ul>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#ecfdf5', borderRadius: '12px', border: '2px dashed #10b981' }}>
            <p style={{ fontSize: '14px', color: '#065f46', lineHeight: '1.6', margin: 0 }}>
              <strong>💡 Pro Tip:</strong> Use templates for instant professional designs, then customize individual slides to match your content!
            </p>
          </div>
        </div>
      ),
    },
    // Page 2: Slides & Navigation
    {
      title: '🎬 Slides & Navigation',
      content: (
        <div>
          <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
            <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🎬 Slide Controls
            </h4>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <div style={{ background: '#ef4444', color: '#fff', borderRadius: '8px', padding: '8px', minWidth: '40px', textAlign: 'center' }}>
                  <FaPlus />
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Add New Slide</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Insert a blank slide after the current one</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <div style={{ background: '#ef4444', color: '#fff', borderRadius: '8px', padding: '8px', minWidth: '40px', textAlign: 'center' }}>
                  <FaTrash />
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Delete Slide</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Remove the current slide (with confirmation)</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
            <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaDownload style={{ color: '#10b981' }} /> Header Actions
            </h4>
            <ul style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
              <li><strong>Topic Input:</strong> Edit your presentation title/filename</li>
              <li><strong>Preview Button:</strong> See a full-screen preview before downloading</li>
              <li><strong>Download Button:</strong> Export your presentation as a PowerPoint (.pptx) file</li>
            </ul>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '12px', border: '2px dashed #f59e0b' }}>
            <p style={{ fontSize: '14px', color: '#92400e', lineHeight: '1.6', margin: 0 }}>
              <strong>💡 Pro Tip:</strong> Your changes are saved automatically. You can safely close and return later!
            </p>
          </div>
        </div>
      ),
    },
    // Page 3: Text Editing
    {
      title: '✏️ Text Editing',
      content: (
        <div>
          <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', borderLeft: '4px solid #8b5cf6' }}>
            <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ✏️ Text Editing Toolbar
            </h4>
            <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: '1.6', marginBottom: '16px' }}>
              Click on any title or text box to activate the editing toolbar with these options:
            </p>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <div style={{ background: '#8b5cf6', color: '#fff', borderRadius: '8px', padding: '8px', minWidth: '40px', textAlign: 'center' }}>
                  <FaFont />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Font Family & Size</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Choose from various fonts and adjust size per slide (in points)</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <div style={{ background: '#8b5cf6', color: '#fff', borderRadius: '8px', padding: '8px', minWidth: '40px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                  B / I
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Bold & Italic</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Apply text formatting with one click</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <div style={{ background: '#8b5cf6', color: '#fff', borderRadius: '8px', padding: '8px', minWidth: '40px', textAlign: 'center', display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                  <FaAlignLeft style={{ fontSize: '10px' }} />
                  <FaAlignCenter style={{ fontSize: '10px' }} />
                  <FaAlignRight style={{ fontSize: '10px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Text Alignment</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Align text left, center, or right</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '12px', border: '2px solid #3b82f6' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1e40af', marginBottom: '12px' }}>
              📦 Moving & Resizing Text Boxes
            </h4>
            <ul style={{ fontSize: '14px', color: '#1e40af', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
              <li>Click a text box to select it (blue outline appears)</li>
              <li>Drag the text box to move it anywhere on the slide</li>
              <li>Drag the corner handles to resize the text box</li>
            </ul>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#ecfdf5', borderRadius: '12px', border: '2px dashed #10b981' }}>
            <p style={{ fontSize: '14px', color: '#065f46', lineHeight: '1.6', margin: 0 }}>
              <strong>💡 Pro Tip:</strong> Each slide can have its own unique text style and layout!
            </p>
          </div>
        </div>
      ),
    },
    // Page 4: Images
    {
      title: '🖼️ Image Management',
      content: (
        <div>
          <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', borderLeft: '4px solid #06b6d4' }}>
            <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaImage style={{ color: '#06b6d4' }} /> Image Controls
            </h4>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#374151', marginBottom: '8px', fontSize: '15px' }}>🤖 AI Image Generation</div>
                <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: 0 }}>
                  Enter a text prompt (e.g., "mountain landscape" or "business meeting") and the AI will generate a relevant image for your slide.
                </p>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <div style={{ background: '#06b6d4', color: '#fff', borderRadius: '8px', padding: '8px', minWidth: '40px', textAlign: 'center' }}>
                  <FaUpload />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Upload Your Own Image</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Click to upload images from your computer (JPG, PNG, etc.)</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <div style={{ background: '#06b6d4', color: '#fff', borderRadius: '8px', padding: '8px', minWidth: '40px', textAlign: 'center' }}>
                  <FaRedo />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Regenerate AI Image</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Generate a new image using the same prompt</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <div style={{ background: '#ef4444', color: '#fff', borderRadius: '8px', padding: '8px', minWidth: '40px', textAlign: 'center' }}>
                  <FaTimesCircle />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Remove Image</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Delete the current image from the slide</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#fef3c7', borderRadius: '12px', border: '2px solid #f59e0b' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#92400e', marginBottom: '12px' }}>
              ✨ Moving & Resizing Images
            </h4>
            <ul style={{ fontSize: '14px', color: '#78350f', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
              <li>Click an image to select it (blue outline appears)</li>
              <li>Drag the image to reposition it anywhere on the slide</li>
              <li>Drag corner handles to resize while maintaining aspect ratio</li>
              <li>Images can overlap with text and other elements</li>
            </ul>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '2px dashed #10b981' }}>
            <p style={{ fontSize: '14px', color: '#065f46', lineHeight: '1.6', margin: 0 }}>
              <strong>💡 Pro Tip:</strong> Be specific with AI prompts for better results. Try "modern office workspace" instead of just "office"!
            </p>
          </div>
        </div>
      ),
    },
    // Page 6: Stickers & Preview
    {
      title: '✨ Stickers & Preview',
      content: (
        <div>
          <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', borderLeft: '4px solid #14b8a6' }}>
            <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ✨ Stickers & Graphics
            </h4>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#374151', marginBottom: '8px', fontSize: '15px' }}>📂 Browse Categories</div>
                <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: 0 }}>
                  Choose from <strong>Corporate</strong>, <strong>Education</strong>, <strong>General</strong>, and <strong>Shapes</strong> categories. 
                  Each contains curated stickers perfect for your presentations.
                </p>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <div style={{ background: '#14b8a6', color: '#fff', borderRadius: '8px', padding: '8px', minWidth: '40px', textAlign: 'center' }}>
                  <FaSearch />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>External Search</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Search for custom stickers and icons from external sources</div>
                </div>
              </div>
              
              <div>
                <div style={{ fontWeight: '600', color: '#374151', marginBottom: '8px', fontSize: '15px' }}>🎯 Working with Stickers</div>
                <ul style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
                  <li>Click any sticker to add it to your slide</li>
                  <li>Drag to move stickers around</li>
                  <li>Drag corner handles to resize</li>
                  <li>Use rotation handle to spin stickers</li>
                  <li>Delete unwanted stickers with trash button</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', borderLeft: '4px solid #6366f1' }}>
            <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              👁️ Preview Mode
            </h4>
            <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: '1.6', marginBottom: '12px' }}>
              Before downloading, preview your presentation to see how it will look:
            </p>
            <ul style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
              <li><strong>Full Screen View:</strong> See slides as they will appear in the final presentation</li>
              <li><strong>Navigation:</strong> Use Prev/Next buttons to browse slides</li>
              <li><strong>Download:</strong> Export your presentation directly from preview mode</li>
              <li><strong>Close:</strong> Return to editing mode to make changes</li>
            </ul>
          </div>

          <div style={{ padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', color: '#fff' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              🎉 You're Ready to Create!
            </h4>
            <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0, opacity: 0.95 }}>
              You now know all the features available in Edit & Preview! Your work auto-saves as you edit, 
              so feel free to experiment and create your amazing presentation!
            </p>
          </div>
        </div>
      ),
    },
  ];

  const totalPages = pages.length;
  const currentPageData = pages[currentPage];

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleClose = () => {
    setCurrentPage(0);
    setIsMinimized(false);
    onClose();
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleMaximize = () => {
    setIsMinimized(false);
  };

  // Minimized view
  if (isMinimized) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 10000,
        }}
      >
        <button
          onClick={handleMaximize}
          style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(0, 0, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.3)';
          }}
        >
          📖 Open Guide
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#ffffff',
          }}
        >
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 'bold' }}>
              {currentPageData.title}
            </h2>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
              Page {currentPage + 1} of {totalPages}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleMinimize}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ffffff',
                fontSize: '20px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
              title="Minimize"
            >
              <FaMinus />
            </button>
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ffffff',
                fontSize: '20px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
              title="Close"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div style={{ padding: '0 24px', paddingTop: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {pages.map((_, index) => (
              <div
                key={index}
                style={{
                  width: index === currentPage ? '32px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: index === currentPage ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#d1d5db',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
                onClick={() => setCurrentPage(index)}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '24px',
            paddingTop: '20px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {currentPageData.content}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f9fafb',
          }}
        >
          <button
            onClick={goToPrevPage}
            disabled={currentPage === 0}
            style={{
              padding: '10px 20px',
              background: currentPage === 0 ? '#e5e7eb' : '#ffffff',
              color: currentPage === 0 ? '#9ca3af' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              if (currentPage !== 0) {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.transform = 'translateX(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== 0) {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.transform = 'translateX(0)';
              }
            }}
          >
            <FaChevronLeft /> Previous
          </button>

          <div style={{ display: 'flex', gap: '12px' }}>
            {currentPage === totalPages - 1 ? (
              <>
                <button
                  onClick={handleClose}
                  style={{
                    padding: '10px 24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  Got it! Let's Start Editing ✨
                </button>
                <button
                  onClick={handleMinimize}
                  style={{
                    padding: '10px 24px',
                    background: '#ffffff',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  Minimize for Later
                </button>
              </>
            ) : (
              <button
                onClick={goToNextPage}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(2px)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
              >
                Next <FaChevronRight />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuideModal;
