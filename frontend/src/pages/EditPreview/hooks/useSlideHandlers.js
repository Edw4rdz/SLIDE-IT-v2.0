import { useCallback } from 'react';
import { saveDraft, buildShapeSvg, svgToDataUrl, isShapeUrl, urlToBase64, svgDataUrlToPng, getPollinationsImageUrl } from '../utils';
import { DEFAULT_DESIGN } from '../constants';
import { notify } from '../../../utils/notify';
import { downloadPPTX } from '../../../api';

/**
 * Custom hook for slide handlers
 */
export const useSlideHandlers = ({
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
}) => {
  const handleSlideChange = useCallback((id, field, value) => {
    setEditedSlides((currentSlides) => {
      const updatedSlides = currentSlides.map((s) => {
        if (s.id === id) {
          let updatedSlide = {
            ...s,
            [field]: field === 'bullets' && typeof value === 'string' ? value.split('\n') : value
          };
          if (field === 'imagePrompt') {
            // Mark that a new image needs to be generated, but keep the old image visible
            // until the new one is ready. Don't clear uploadedImage here - it will be
            // replaced when the new image generation completes in useImageGeneration hook
            updatedSlide.imageNeedsGeneration = true;
            // Clear preview URL so it regenerates with new prompt
            setPreviewImageUrls(prev => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          }
          return updatedSlide;
        }
        return s;
      });
      // Schedule save after state update completes
      setTimeout(() => {
        saveDraft(updatedSlides, topic, (location.state?.convId || topic), currentDesign, imageProvider);
      }, 0);
      return updatedSlides;
    });
  }, [setEditedSlides, setPreviewImageUrls, topic, location.state?.convId, currentDesign, imageProvider]);

  const handleStyleChange = useCallback((slideId, key, value) => {
    setEditedSlides(currentSlides => {
      const updatedSlides = currentSlides.map(s => {
        if (s.id !== slideId) return s;
        const newStyles = { ...(s.styles || {}) };
        newStyles[key] = value;
        return { ...s, styles: newStyles };
      });
      // Schedule save after state update completes
      setTimeout(() => {
        saveDraft(updatedSlides, topic, (location.state?.convId || topic), currentDesign, imageProvider);
      }, 0);
      return updatedSlides;
    });
  }, [setEditedSlides, topic, location.state?.convId, currentDesign, imageProvider]);

  const handleImageUpload = useCallback((event, slideId) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setEditedSlides(currentSlides => {
          const updatedSlides = currentSlides.map(s =>
            s.id === slideId ? { 
              ...s,
              uploadedImage: base64String,
              imagePrompt: "",
              generatedImagePrompt: undefined,
              imageNeedsGeneration: false
            } : s
          );
          saveDraft(updatedSlides, topic, (location.state?.convId || topic), currentDesign, imageProvider);
          return updatedSlides;
        });
      };
      reader.readAsDataURL(file);
    }
    event.target.value = null;
  }, [setEditedSlides, topic, location.state?.convId, currentDesign, imageProvider]);

  const handleRemoveImage = useCallback((slideId) => {
    setEditedSlides(currentSlides => {
      const updatedSlides = currentSlides.map(s =>
        s.id === slideId ? { 
          ...s,
          lastRemovedImage: s.uploadedImage, // Store the image before removing
          uploadedImage: null,
          imagePrompt: "",
          removedImage: true,
          generatedImagePrompt: undefined,
          imageNeedsGeneration: false
        } : s
      );
      saveDraft(updatedSlides, topic, (location.state?.convId || topic), currentDesign, imageProvider);
      return updatedSlides;
    });
  }, [setEditedSlides, topic, location.state?.convId, currentDesign, imageProvider]);

  const handleAddImageBack = useCallback((slideId) => {
    setEditedSlides(currentSlides => {
      const updatedSlides = currentSlides.map(s =>
        s.id === slideId ? { 
          ...s, 
          removedImage: false,
          uploadedImage: s.lastRemovedImage || s.uploadedImage, // Restore the last removed image
          lastRemovedImage: null // Clear the backup after restoring
        } : s
      );
      saveDraft(updatedSlides, topic, (location.state?.convId || topic), currentDesign, imageProvider);
      return updatedSlides;
    });
    setSelectedImage(slideId);
  }, [setEditedSlides, setSelectedImage, topic, location.state?.convId, currentDesign, imageProvider]);

  const handleAddSlide = useCallback(() => {
    const newSlide = {
      id: `slide-${Date.now()}`,
      title: "New Slide",
      bullets: ["New point 1", "New point 2"],
      layout: "content",
      uploadedImage: null,
      imagePrompt: "",
      titleBox: { x: 0.05, y: 0.0622, width: 0.9, height: 0.1778, zIndex: 100 },
      bodyBox: { x: 0.05, y: 0.2844, width: 0.9, height: 0.64, zIndex: 100 },
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
    setEditedSlides(prev => {
      const updatedSlides = [...prev, newSlide];
      // Schedule save after state update completes
      setTimeout(() => {
        saveDraft(updatedSlides, topic, (location.state?.convId || topic), currentDesign, imageProvider);
      }, 0);
      return updatedSlides;
    });
  }, [setEditedSlides, currentDesign.font, topic, location.state?.convId, currentDesign, imageProvider]);

  const handleDeleteSlide = useCallback((slideId) => {
    if (editedSlides.length <= 1) {
      notify("Cannot delete the last slide!", 'error');
      return false;
    }
    return true;
  }, [editedSlides.length]);

  const handleReorderSlides = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    
    setEditedSlides(currentSlides => {
      const updatedSlides = [...currentSlides];
      const [movedSlide] = updatedSlides.splice(fromIndex, 1);
      updatedSlides.splice(toIndex, 0, movedSlide);
      
      // Save draft after reordering
      setTimeout(() => {
        saveDraft(updatedSlides, topic, (location.state?.convId || topic), currentDesign, imageProvider);
      }, 0);
      
      return updatedSlides;
    });
    
    notify('Slide reordered', 'success');
  }, [setEditedSlides, topic, location.state?.convId, currentDesign, imageProvider]);

  const confirmDeleteSlide = useCallback((slideId, setDeleteConfirm) => {
    setDeleteConfirm({ open: false, slideId: null });
    
    setEditedSlides(prev => {
      const updated = prev.filter(s => s.id !== slideId);
      
      if (selectedSticker?.slideId === slideId) setSelectedSticker(null);
      if (selectedImage === slideId) setSelectedImage(null);
      if (selectedTextBox?.slideId === slideId) setSelectedTextBox(null);
      
      saveDraft(updated, topic, (location.state?.convId || topic), currentDesign, imageProvider);
      
      return updated;
    });
    
    notify("Slide deleted successfully", 'success');
  }, [setEditedSlides, selectedSticker, selectedImage, selectedTextBox, setSelectedSticker, setSelectedImage, setSelectedTextBox, topic, location.state?.convId, currentDesign, imageProvider]);

  const handleAddSticker = useCallback(async (slideId, url) => {
    if (isShapeUrl(url)) {
      try {
        const res = await fetch(url);
        const txt = await res.text();
        const fill = '#4A90E2';
        const stroke = '#1F3A60';
        const strokeWidth = 2;
        const colored = buildShapeSvg(txt, fill, stroke, strokeWidth);
        const dataUrl = svgToDataUrl(colored);
        setEditedSlides(prev => {
          const updated = prev.map(s => {
            if (s.id !== slideId) return s;
            const added = { type: 'shape', baseSvg: txt, fillColor: fill, strokeColor: stroke, strokeWidth, url: dataUrl, x: 0.12, y: 0.12, width: 0.18, height: 0.18, rotate: 0 };
            return { ...s, stickers: [...(s.stickers || []), added] };
          });
          saveDraft(updated, topic, (location.state?.convId || topic), currentDesign, imageProvider);
          return updated;
        });
      } catch (e) {
        console.warn('Failed to load shape svg', e);
      }
    } else {
      setEditedSlides((prev) => {
        const updated = prev.map((s) => {
          if (s.id !== slideId) return s;
          const added = { type: 'image', url, x: 0.12, y: 0.12, width: 0.18, height: 0.18, opacity: 1, rotate: 0 };
          return { ...s, stickers: [...(s.stickers || []), added] };
        });
        saveDraft(updated, topic, (location.state?.convId || topic), currentDesign, imageProvider);
        return updated;
      });
    }
  }, [setEditedSlides, topic, location.state?.convId, currentDesign, imageProvider]);

  const handleRemoveSticker = useCallback((slideId, index) => {
    setEditedSlides((prev) => {
      let changed = false;
      const result = prev.map((s) => {
        if (s.id !== slideId) return s;
        const arr = Array.isArray(s.stickers) ? [...s.stickers] : [];
        if (index >= 0 && index < arr.length) {
          arr.splice(index, 1);
          changed = true;
        }
        return { ...s, stickers: arr };
      });
      if (changed) {
        setTimeout(() => setSelectedSticker(null), 0);
      }
      saveDraft(result, topic, (location.state?.convId || topic), currentDesign, imageProvider);
      return result;
    });
  }, [setEditedSlides, setSelectedSticker, topic, location.state?.convId, currentDesign, imageProvider]);

  const handleDownload = useCallback(async () => {
    if (!editedSlides.length) return notify("No slides to download!", 'error');

    const sanitizedTopic = topic.replace(/[\s/\\?%*:|"<>]/g, "_");
    const fileName = `${sanitizedTopic}_presentation.pptx`;
    
    const activeDesign = selectedTemplateId ? currentDesign : DEFAULT_DESIGN;

    const slidesForExport = await Promise.all(
      editedSlides.map(async (slide) => {
        let processedSlide = { ...slide };

        if (slide.uploadedImage && typeof slide.uploadedImage === 'string') {
          if (slide.uploadedImage.startsWith('http://') || slide.uploadedImage.startsWith('https://')) {
            const base64Image = await urlToBase64(slide.uploadedImage);
            processedSlide.uploadedImage = base64Image || slide.uploadedImage;
          }
        } else if (!slide.uploadedImage && previewImageUrls[slide.id]) {
          const previewUrl = previewImageUrls[slide.id];
          if (previewUrl.startsWith('http://') || previewUrl.startsWith('https://')) {
            const base64Image = await urlToBase64(previewUrl);
            processedSlide.uploadedImage = base64Image || previewUrl;
          } else {
            processedSlide.uploadedImage = previewUrl;
          }
        }

        if (Array.isArray(slide.stickers) && slide.stickers.length > 0) {
          const processedStickers = await Promise.all(
            slide.stickers.map(async (sticker) => {
              let processedUrl = sticker.url;
              
              if (sticker.url && typeof sticker.url === 'string' && sticker.url.startsWith('/') && !sticker.url.startsWith('//')) {
                const base64Data = await urlToBase64(sticker.url);
                processedUrl = base64Data || sticker.url;
              }
              
              if (processedUrl && typeof processedUrl === 'string' && processedUrl.includes('data:image/svg+xml')) {
                processedUrl = await svgDataUrlToPng(processedUrl, 400, 400);
              }
              
              return { ...sticker, url: processedUrl };
            })
          );
          processedSlide.stickers = processedStickers;
        }

        return processedSlide;
      })
    );
    
    downloadPPTX(slidesForExport, activeDesign, fileName, showImageColumn, imageProvider);
  }, [editedSlides, topic, selectedTemplateId, currentDesign, previewImageUrls, showImageColumn, imageProvider]);

  const openPreviewModal = useCallback(async () => {
    if (!editedSlides.length) return;

    if (imageProvider === 'imagen') {
      const urls = {};
      try {
        const { generateImageFromImagen } = await import('../../../api');
        const promises = editedSlides.map(async (slide) => {
          if (slide.id !== undefined && slide.imagePrompt && !slide.uploadedImage) {
            try {
              const img = await generateImageFromImagen(slide.imagePrompt);
              if (img) urls[slide.id] = img;
            } catch (err) {
              console.error('[Preview Imagen] Error generating for slide', slide.id, err);
            }
          }
        });
        await Promise.all(promises);
        setPreviewImageUrls(prev => ({ ...prev, ...urls }));
      } catch (e) {
        console.error('[Preview Imagen] Generation failed:', e);
      }
    }

    setPreviewSlideIndex(0);
    setShowDownloadPreview(true);
  }, [editedSlides, imageProvider, setPreviewImageUrls, setPreviewSlideIndex, setShowDownloadPreview]);

  return {
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
  };
};

export default useSlideHandlers;
