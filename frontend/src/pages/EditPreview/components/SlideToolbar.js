import React from 'react';
import { FaAlignLeft, FaAlignCenter, FaAlignRight, FaUpload } from 'react-icons/fa';
import { hexToRgba } from '../utils';
import { FONT_OPTIONS } from '../constants';
import StickerPicker from './StickerPicker';

const SlideToolbar = ({
  slide,
  theme,
  currentDesign,
  selectedTemplateId,
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
  setTempFontSizes
}) => {
  const s = slide;

  return (
    <div
      className="slide-toolbar-outside"
      role="toolbar"
      aria-label="Slide text styling"
      style={{
        background: hexToRgba(theme.titleColor || currentDesign.globalTitleColor, 0.12),
        borderColor: hexToRgba(theme.titleColor || currentDesign.globalTitleColor, 0.08)
      }}
    >
      {/* Title styling controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 12 }}>Title:</label>
        <select
          value={s.styles?.titleFont || 'Arial'}
          onChange={(e) => handleStyleChange(s.id, 'titleFont', e.target.value)}
        >
          {FONT_OPTIONS.map(font => (
            <option key={font}>{font}</option>
          ))}
        </select>
        <input
          type="number"
          value={tempFontSizes[`title-${s.id}`] !== undefined ? tempFontSizes[`title-${s.id}`] : (s.styles?.titleSize || 32)}
          style={{ width: 64 }}
          onChange={(e) => {
            const val = e.target.value;
            setTempFontSizes(prev => ({ ...prev, [`title-${s.id}`]: val }));
          }}
          onBlur={(e) => {
            const val = e.target.value;
            if (val === '') {
              handleStyleChange(s.id, 'titleSize', 32);
            } else {
              const num = Number(val);
              if (!isNaN(num)) {
                handleStyleChange(s.id, 'titleSize', num);
              }
            }
            setTempFontSizes(prev => ({ ...prev, [`title-${s.id}`]: undefined }));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.target.blur();
          }}
        />
        <button
          className="toolbar-button"
          onClick={() => handleStyleChange(s.id, 'titleBold', !s.styles?.titleBold)}
          style={{ fontWeight: s.styles?.titleBold ? 700 : 400 }}
        >
          B
        </button>
        <button
          className="toolbar-button"
          onClick={() => handleStyleChange(s.id, 'titleItalic', !s.styles?.titleItalic)}
          style={{ fontStyle: s.styles?.titleItalic ? 'italic' : 'normal' }}
        >
          I
        </button>
      </div>

      {/* Text styling controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 12 }}>Text:</label>
        <select
          value={s.styles?.textFont || 'Arial'}
          onChange={(e) => handleStyleChange(s.id, 'textFont', e.target.value)}
        >
          {FONT_OPTIONS.slice(0, 13).map(font => (
            <option key={font}>{font}</option>
          ))}
        </select>
        <input
          type="number"
          value={tempFontSizes[`text-${s.id}`] !== undefined ? tempFontSizes[`text-${s.id}`] : (s.styles?.textSize || 16)}
          style={{ width: 56 }}
          onChange={(e) => {
            const val = e.target.value;
            setTempFontSizes(prev => ({ ...prev, [`text-${s.id}`]: val }));
          }}
          onBlur={(e) => {
            const val = e.target.value;
            if (val === '') {
              handleStyleChange(s.id, 'textSize', 16);
            } else {
              const num = Number(val);
              if (!isNaN(num)) {
                handleStyleChange(s.id, 'textSize', num);
              }
            }
            setTempFontSizes(prev => ({ ...prev, [`text-${s.id}`]: undefined }));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.target.blur();
          }}
        />
        <button
          className="toolbar-button"
          onClick={() => handleStyleChange(s.id, 'textBold', !s.styles?.textBold)}
          style={{ fontWeight: s.styles?.textBold ? 700 : 400 }}
        >
          B
        </button>
        <button
          className="toolbar-button"
          onClick={() => handleStyleChange(s.id, 'textItalic', !s.styles?.textItalic)}
          style={{ fontStyle: s.styles?.textItalic ? 'italic' : 'normal' }}
        >
          I
        </button>
        <button
          className="toolbar-button"
          aria-label="Align left"
          title="Align left"
          onClick={() => handleStyleChange(s.id, 'textAlign', 'left')}
          style={{
            background: (s.styles?.textAlign || 'left') === 'left' ? '#2e2e2e' : 'transparent',
            borderColor: (s.styles?.textAlign || 'left') === 'left' ? '#555' : undefined
          }}
        >
          <FaAlignLeft />
        </button>
        <button
          className="toolbar-button"
          aria-label="Align center"
          title="Align center"
          onClick={() => handleStyleChange(s.id, 'textAlign', 'center')}
          style={{
            background: s.styles?.textAlign === 'center' ? '#2e2e2e' : 'transparent',
            borderColor: s.styles?.textAlign === 'center' ? '#555' : undefined
          }}
        >
          <FaAlignCenter />
        </button>
        <button
          className="toolbar-button"
          aria-label="Align right"
          title="Align right"
          onClick={() => handleStyleChange(s.id, 'textAlign', 'right')}
          style={{
            background: s.styles?.textAlign === 'right' ? '#2e2e2e' : 'transparent',
            borderColor: s.styles?.textAlign === 'right' ? '#555' : undefined
          }}
        >
          <FaAlignRight />
        </button>
      </div>

      {/* Right-aligned actions: Stickers */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
        <div
          ref={(el) => { if (el) stickerAnchorRefs.current[s.id] = el; }}
          style={{ position: 'relative', display: 'inline-block' }}
        >
          <button
            className="toolbar-button"
            onClick={() => setOpenStickerFor(openStickerFor === s.id ? null : s.id)}
          >
            🧩 Stickers
          </button>
          {openStickerFor === s.id && (
            <StickerPicker
              slideId={s.id}
              stickerSearchQuery={stickerSearchQuery}
              setStickerSearchQuery={setStickerSearchQuery}
              stickerCategories={stickerCategories}
              externalStickers={externalStickers}
              loadingExternalStickers={loadingExternalStickers}
              filterStickers={filterStickers}
              handleAddSticker={handleAddSticker}
              setExternalStickers={setExternalStickers}
            />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
          {s.removedImage && (
            <button
              className="toolbar-button"
              title="Add image to slide"
              onClick={() => handleAddImageBack(s.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent' }}
            >
              <FaUpload /> Add Image
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlideToolbar;
