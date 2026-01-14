import React from 'react';

const StickerPicker = ({
  slideId,
  stickerSearchQuery,
  setStickerSearchQuery,
  stickerCategories,
  externalStickers,
  loadingExternalStickers,
  filterStickers,
  handleAddSticker,
  setExternalStickers
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: 6,
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: 10,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 1000,
        maxHeight: 280,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        minWidth: 260
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* AI Search Input */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔍 Search stickers... (e.g., 'arrow', 'heart', 'star')"
          value={stickerSearchQuery}
          onChange={(e) => setStickerSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid rgba(0,0,0,0.15)',
            borderRadius: 8,
            fontSize: 13,
            outline: 'none',
            transition: 'all 0.2s'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#6D4FC2';
            e.target.style.boxShadow = '0 0 0 3px rgba(109, 79, 194, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(0,0,0,0.15)';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Sticker Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 40px)', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
        {(() => {
          const filtered = filterStickers(stickerSearchQuery);

          // Show local stickers if found
          if (filtered.length > 0) {
            return filtered.map(({ cat, item }, i) => {
              const full = `/stickers/${cat}/${item}`;
              return (
                <img
                  key={i}
                  src={full}
                  alt={`st-${i}`}
                  onClick={() => {
                    handleAddSticker(slideId, full);
                    setStickerSearchQuery("");
                    setExternalStickers([]);
                  }}
                  style={{
                    width: 40,
                    height: 40,
                    objectFit: 'contain',
                    cursor: 'pointer',
                    borderRadius: 4,
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onError={(e) => { e.currentTarget.style.opacity = 0.3; }}
                />
              );
            });
          }

          // Show loading state
          if (loadingExternalStickers) {
            return (
              <div style={{ gridColumn: '1/-1', padding: 20, textAlign: 'center', fontSize: 13, color: '#6D4FC2' }}>
                <div style={{
                  margin: '0 auto 8px',
                  width: 20,
                  height: 20,
                  border: '3px solid rgba(109, 79, 194, 0.3)',
                  borderTop: '3px solid #6D4FC2',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}></div>
                <div>🌐 Searching online stickers...</div>
              </div>
            );
          }

          // Show external stickers if found
          if (externalStickers.length > 0) {
            return (
              <>
                <div style={{
                  gridColumn: '1/-1',
                  padding: '6px 4px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#6D4FC2',
                  borderBottom: '1px solid rgba(109, 79, 194, 0.2)',
                  marginBottom: 4
                }}>
                  🌐 Online Stickers (Click to import)
                </div>
                {externalStickers.map((extSticker, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: 40,
                      height: 40,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 6,
                      transition: 'all 0.15s',
                      border: '2px solid rgba(109, 79, 194, 0.3)',
                      background: 'linear-gradient(135deg, rgba(109, 79, 194, 0.08), rgba(147, 51, 234, 0.08))'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.15)';
                      e.currentTarget.style.boxShadow = '0 3px 12px rgba(109, 79, 194, 0.35)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => {
                      const svgBlob = new Blob([extSticker.svg], { type: 'image/svg+xml' });
                      const url = URL.createObjectURL(svgBlob);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const dataUrl = reader.result;
                        handleAddSticker(slideId, dataUrl);
                        setStickerSearchQuery('');
                        setExternalStickers([]);
                        URL.revokeObjectURL(url);
                      };
                      reader.readAsDataURL(svgBlob);
                    }}
                    title={extSticker.name}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: extSticker.svg }}
                      style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    />
                  </div>
                ))}
              </>
            );
          }

          // No results at all
          return (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 20, color: '#999', fontSize: 13 }}>
              {stickerSearchQuery.trim().length > 2
                ? '🔍 No stickers found. Try different keywords!'
                : 'Type to search local or online stickers'}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default StickerPicker;
