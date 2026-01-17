import React from 'react';
import { FaArrowLeft, FaArrowRight, FaDownload } from 'react-icons/fa';
import { getBulletLines, replaceMarkdownBold } from '../utils';

const DownloadPreviewModal = ({
  showDownloadPreview,
  closePreviewModal,
  editedSlides,
  previewSlideIndex,
  setPreviewSlideIndex,
  showImageColumn,
  setShowImageColumn,
  previewImageUrls,
  currentDesign,
  handleDownload
}) => {
  if (!showDownloadPreview) return null;

  const gotoPrevPreview = () => setPreviewSlideIndex(i => Math.max(0, i - 1));
  const gotoNextPreview = () => setPreviewSlideIndex(i => Math.min(editedSlides.length - 1, i + 1));

  const slide = editedSlides[previewSlideIndex];
  if (!slide) return null;

  const layoutStyles = currentDesign.layouts?.[slide.layout] || {};
  let themeBg = slide.background || layoutStyles.background || currentDesign.globalBackground;
  const titleColor = slide.titleColor || layoutStyles.titleColor || currentDesign.globalTitleColor || '#000';
  const textColor = slide.textColor || layoutStyles.textColor || currentDesign.globalTextColor || '#333';
  const bulletLines = getBulletLines(slide);

  const modalPreviewStyle = { backgroundSize: 'cover', backgroundPosition: 'center' };
  if (Array.isArray(themeBg)) {
    modalPreviewStyle.backgroundImage = `linear-gradient(135deg, ${themeBg.join(', ')})`;
  } else if (typeof themeBg === 'string' && themeBg.startsWith('http')) {
    modalPreviewStyle.backgroundImage = `url(${themeBg})`;
  } else {
    modalPreviewStyle.backgroundColor = themeBg || '#FFFFFF';
  }

  const bodyFontFamily = (slide.styles?.textFont === 'Courier New')
    ? '"Courier New", Courier, monospace'
    : (slide.styles?.textFont || currentDesign.font);

  const textAlignValue = slide.styles?.textAlign || 'left';
  const bodyFontWeight = slide.styles?.textBold ? 700 : 400;
  const bodyFontStyle = slide.styles?.textItalic ? 'italic' : 'normal';

  // Calculate boxes
  const titleBox = slide.titleBox || { x: 0.05, y: 0.0622, width: 0.9, height: 0.1778, zIndex: 100 };

  const hasImage = showImageColumn && !slide.removedImage && Boolean(slide.uploadedImage || (slide.imagePrompt && (slide.imageData || slide.imagePosition)));
  let computedBodyBox = slide.bodyBox;

  if (hasImage && !computedBodyBox) {
    const SLIDE_WIDTH = 10.0;
    const SLIDE_HEIGHT = 5.625;
    const imagePosition = slide.imagePosition || 'right';

    let bodyX_inches = 0.5;
    let bodyW_inches = 4.8;
    let bodyY_inches = 1.25;
    let bodyH_inches = 3.65;

    if (imagePosition === 'left') {
      // Text on right side when image is on left
      bodyX_inches = 4.7;
      bodyW_inches = 4.8;
    } else if (imagePosition === 'right') {
      // Text on left side when image is on right
      bodyX_inches = 0.5;
      bodyW_inches = 4.8;
    } else if (imagePosition === 'center') {
      // Text below center image
      bodyX_inches = 0.5;
      bodyW_inches = 9.0;
      bodyY_inches = 3.55;
      bodyH_inches = 1.8;
    }

    computedBodyBox = {
      x: bodyX_inches / SLIDE_WIDTH,
      y: bodyY_inches / SLIDE_HEIGHT,
      width: bodyW_inches / SLIDE_WIDTH,
      height: bodyH_inches / SLIDE_HEIGHT,
      zIndex: 100
    };
  }

  const bodyBox = computedBodyBox || { x: 0.05, y: 0.2844, width: 0.9, height: 0.64, zIndex: 100 };

  const previewHeight = 675;
  const titleBoxHeightPx = previewHeight * titleBox.height;
  const autoTitleFontSize = Math.max(12, Math.floor(titleBoxHeightPx * 0.75));
  const finalTitleFontSize = slide.styles?.titleSize ?? autoTitleFontSize;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
      <div style={{ background: '#fff', width: '90%', maxWidth: 1300, maxHeight: '90%', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 12px 8px' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Download Preview</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, color: '#555' }}>
              <input
                type="checkbox"
                checked={showImageColumn}
                onChange={(e) => setShowImageColumn(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Include Images in Download</span>
            </label>
            <button
              onClick={closePreviewModal}
              style={{ background: '#ff5a5f', color: '#fff', border: 'none', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', fontSize: 14, lineHeight: '26px', textAlign: 'center' }}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#555', padding: '0 8px 10px 8px' }}>
          Slide {previewSlideIndex + 1} of {editedSlides.length}
          {!showImageColumn && <span style={{ marginLeft: 12, color: '#f59e0b', fontWeight: 600 }}>⚠ Images will not be included in download</span>}
        </div>

        {/* Slide area */}
        <div style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 10, padding: 20, background: 'transparent', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: 1200,
            aspectRatio: '16/9',
            minHeight: 675,
            color: textColor,
            fontFamily: bodyFontFamily,
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 0,
            ...modalPreviewStyle
          }}>
            {/* Title */}
            <div style={{
              position: 'absolute',
              left: `${titleBox.x * 100}%`,
              top: `${titleBox.y * 100}%`,
              width: `${titleBox.width * 100}%`,
              height: `${titleBox.height * 100}%`,
              zIndex: titleBox.zIndex !== undefined ? titleBox.zIndex : 100,
              padding: '2px 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              overflow: 'visible'
            }}>
              <h2 style={{
                fontSize: `${finalTitleFontSize}pt`,
                fontFamily: slide.styles?.titleFont || currentDesign.font,
                color: titleColor,
                margin: 0,
                fontWeight: slide.styles?.titleBold ? 700 : 500,
                fontStyle: slide.styles?.titleItalic ? 'italic' : 'normal',
                width: '100%',
                lineHeight: 1.05
              }}>
                {slide.title}
              </h2>
            </div>

            {/* Content */}
            <div style={{
              position: 'absolute',
              left: `${bodyBox.x * 100}%`,
              top: `${bodyBox.y * 100}%`,
              width: `${bodyBox.width * 100}%`,
              height: `${bodyBox.height * 100}%`,
              zIndex: bodyBox.zIndex !== undefined ? bodyBox.zIndex : 100,
              padding: '4px 8px',
              overflow: 'visible',
              color: textColor,
              fontFamily: bodyFontFamily,
              fontSize: `${slide.styles?.textSize || 16}pt`,
              fontWeight: bodyFontWeight,
              fontStyle: bodyFontStyle,
              textAlign: textAlignValue,
              lineHeight: '1.3'
            }}>
              {bulletLines.map((line, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  • {replaceMarkdownBold(line)}
                </div>
              ))}
            </div>

            {/* Image */}
            {showImageColumn && !slide.removedImage && (slide.uploadedImage || previewImageUrls[slide.id]) && (
              <div style={{
                position: 'absolute',
                left: `${((slide.imageData?.x || 0.5) * 100)}%`,
                top: `${((slide.imageData?.y || 0.15) * 100)}%`,
                width: `${((slide.imageData?.width || 0.4) * 100)}%`,
                height: `${((slide.imageData?.height || 0.6) * 100)}%`,
                zIndex: slide.imageData?.zIndex !== undefined ? slide.imageData.zIndex : 110,
                borderRadius: 8,
                overflow: 'hidden'
              }}>
                <img
                  src={slide.uploadedImage || previewImageUrls[slide.id]}
                  alt="slide-img"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            {/* Stickers overlay */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {(slide.stickers || []).map((st, si) => (
                <div
                  key={si}
                  style={{
                    position: 'absolute',
                    left: `${(st.x || 0) * 100}%`,
                    top: `${(st.y || 0) * 100}%`,
                    width: `${(st.width || 0.18) * 100}%`,
                    height: `${(st.height || 0.18) * 100}%`,
                    transform: `rotate(${st.rotate || 0}deg)`,
                    transformOrigin: 'top left'
                  }}
                >
                  <img src={st.url} alt="st" style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 8px 4px 8px' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={gotoPrevPreview}
              disabled={previewSlideIndex === 0}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', cursor: previewSlideIndex === 0 ? 'not-allowed' : 'pointer' }}
            >
              <FaArrowLeft /> Prev
            </button>
            <button
              onClick={gotoNextPreview}
              disabled={previewSlideIndex === editedSlides.length - 1}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', cursor: previewSlideIndex === editedSlides.length - 1 ? 'not-allowed' : 'pointer' }}
            >
              Next <FaArrowRight />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleDownload}
              style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FaDownload /> Download PPTX
            </button>
            <button
              onClick={closePreviewModal}
              style={{ padding: '8px 12px', background: '#f3f4f6', color: '#111827', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadPreviewModal;
