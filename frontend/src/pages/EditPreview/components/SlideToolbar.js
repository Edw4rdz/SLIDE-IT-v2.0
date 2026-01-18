import React from 'react';
import { FaAlignLeft, FaAlignCenter, FaAlignRight, FaUpload, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import { hexToRgba } from '../utils';
import { FONT_OPTIONS } from '../constants';
import StickerPicker from './StickerPicker';

// Reusable FontSizeInput component with up/down arrows
const FontSizeInput = ({ value, onChange, onCommit, minSize = 8, maxSize = 120, step = 2, width = 64 }) => {
  const handleIncrement = () => {
    const newVal = Math.min(Number(value) + step, maxSize);
    onChange(newVal);
    onCommit(newVal);
  };

  const handleDecrement = () => {
    const newVal = Math.max(Number(value) - step, minSize);
    onChange(newVal);
    onCommit(newVal);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <style>
        {`
          .font-size-input::-webkit-outer-spin-button,
          .font-size-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .font-size-input {
            -moz-appearance: textfield;
          }
        `}
      </style>
      <input
        type="number"
        className="font-size-input"
        value={value}
        style={{ width, textAlign: 'center' }}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const val = e.target.value;
          if (val === '' || isNaN(Number(val))) {
            onCommit(null); // Will use default
          } else {
            onCommit(Math.max(minSize, Math.min(maxSize, Number(val))));
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.target.blur();
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            handleIncrement();
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            handleDecrement();
          }
        }}
        min={minSize}
        max={maxSize}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <button
          type="button"
          onClick={handleIncrement}
          style={{
            padding: '2px 4px',
            fontSize: 8,
            cursor: 'pointer',
            border: '1px solid #ccc',
            borderRadius: 2,
            background: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1
          }}
          title="Increase font size"
        >
          <FaChevronUp size={8} />
        </button>
        <button
          type="button"
          onClick={handleDecrement}
          style={{
            padding: '2px 4px',
            fontSize: 8,
            cursor: 'pointer',
            border: '1px solid #ccc',
            borderRadius: 2,
            background: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1
          }}
          title="Decrease font size"
        >
          <FaChevronDown size={8} />
        </button>
      </div>
    </div>
  );
};

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
        <FontSizeInput
          value={tempFontSizes[`title-${s.id}`] !== undefined ? tempFontSizes[`title-${s.id}`] : (s.styles?.titleSize || 32)}
          onChange={(val) => setTempFontSizes(prev => ({ ...prev, [`title-${s.id}`]: val }))}
          onCommit={(val) => {
            handleStyleChange(s.id, 'titleSize', val ?? 32);
            setTempFontSizes(prev => ({ ...prev, [`title-${s.id}`]: undefined }));
          }}
          minSize={1}
          maxSize={200}
          step={1}
          width={50}
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
          {FONT_OPTIONS.map(font => (
            <option key={font}>{font}</option>
          ))}
        </select>
        <FontSizeInput
          value={tempFontSizes[`text-${s.id}`] !== undefined ? tempFontSizes[`text-${s.id}`] : (s.styles?.textSize || 16)}
          onChange={(val) => setTempFontSizes(prev => ({ ...prev, [`text-${s.id}`]: val }))}
          onCommit={(val) => {
            handleStyleChange(s.id, 'textSize', val ?? 16);
            setTempFontSizes(prev => ({ ...prev, [`text-${s.id}`]: undefined }));
          }}
          minSize={1}
          maxSize={200}
          step={1}
          width={50}
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
