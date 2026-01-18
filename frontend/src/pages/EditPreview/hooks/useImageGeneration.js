import { useEffect, useCallback } from 'react';
import { getPollinationsImageUrl, saveDraft } from '../utils';

/**
 * Custom hook for managing image generation
 */
export const useImageGeneration = ({
  editedSlides,
  setEditedSlides,
  imageProvider,
  showImageColumn,
  previewImageUrls,
  setPreviewImageUrls,
  imageGenerationInProgress,
  generatedPromptsRef,
  topic,
  convId,
  currentDesign
}) => {
  // Generate preview images
  useEffect(() => {
    if (editedSlides && editedSlides.length > 0 && (imageProvider === 'imagen' || imageProvider === 'grok' || imageProvider === 'pollinations' || showImageColumn)) {
      
      const slidesNeedingImages = editedSlides.filter(slide =>
        slide.imagePrompt && !slide.removedImage && (slide.imageNeedsGeneration || !slide.uploadedImage)
      );
      
      if (slidesNeedingImages.length === 0) {
        imageGenerationInProgress.current = false;
        return;
      }
      
      // Clear old generated prompt references when prompts change
      // This allows regeneration with new prompts for Imagen provider
      const currentPrompts = new Set(editedSlides.map(s => `${s.id}-${s.imagePrompt}`));
      const keysToDelete = Array.from(generatedPromptsRef.current).filter(key => {
        const [slideId] = key.split('-').slice(0, 1);
        const slide = editedSlides.find(s => s.id === slideId);
        if (slide) {
          const expectedKey = `${slide.id}-${slide.imagePrompt}`;
          return key !== expectedKey;
        }
        return false;
      });
      keysToDelete.forEach(key => generatedPromptsRef.current.delete(key));
      
      if (imageGenerationInProgress.current) {
        return;
      }
      
      imageGenerationInProgress.current = true;

      const generateImageUrls = async () => {
        const urls = {};

        if (imageProvider === 'grok') {
          const { generateImageFromGrok } = await import('../../../api');
          
          const imagePromises = editedSlides.map(async (slide) => {
            // Generate image if slide has prompt AND either no uploaded image OR needs regeneration
            if (slide.id !== undefined && slide.imagePrompt && !slide.removedImage &&
                (slide.imageNeedsGeneration || !slide.uploadedImage)) {
              try {
                const imageDataUrl = await generateImageFromGrok(slide.imagePrompt);
                if (imageDataUrl) {
                  return { slideId: slide.id, url: imageDataUrl };
                }
              } catch (error) {
                console.error('[AI IMAGE DEBUG - Grok] Error generating image for slide:', slide.id, error);
              }
            }
            return null;
          });
          
          const results = await Promise.all(imagePromises);
          results.forEach(result => {
            if (result && result.slideId && result.url) {
              urls[result.slideId] = result.url;
            }
          });
          
        } else if (imageProvider === 'imagen') {
          const { generateImageFromImagen } = await import('../../../api');
          
          const imagePromisesImagen = editedSlides.map(async (slide) => {
            // Generate image if slide has prompt AND either no uploaded image OR needs regeneration
            if (slide.id !== undefined && slide.imagePrompt && !slide.removedImage &&
                (slide.imageNeedsGeneration || !slide.uploadedImage)) {
              const promptKey = `${slide.id}-${slide.imagePrompt}`;
              
              if (generatedPromptsRef.current.has(promptKey)) {
                return null;
              }
              
              generatedPromptsRef.current.add(promptKey);
              
              try {
                const imageDataUrl = await generateImageFromImagen(slide.imagePrompt);
                if (imageDataUrl) {
                  return { slideId: slide.id, url: imageDataUrl };
                } else {
                  generatedPromptsRef.current.delete(promptKey);
                }
              } catch (error) {
                generatedPromptsRef.current.delete(promptKey);
                console.error('[AI IMAGE DEBUG - Imagen] Error generating image for slide:', slide.id, error);
              }
            }
            return null;
          });

          const resultsImagen = await Promise.all(imagePromisesImagen);
          resultsImagen.forEach(result => {
            if (result && result.slideId !== undefined && result.url) {
              urls[result.slideId] = result.url;
            }
          });
          
        } else {
          // Default to Pollinations (use backend proxy first, fallback to public URL)
          const { generateImageFromPollinations } = await import('../../../api');
          const imagePromises = editedSlides.map(async (slide) => {
            if (slide.id !== undefined && slide.imagePrompt && !slide.removedImage &&
                (slide.imageNeedsGeneration || !slide.uploadedImage)) {
              try {
                const imageDataUrl = await generateImageFromPollinations(slide.imagePrompt);
                if (imageDataUrl) return { slideId: slide.id, url: imageDataUrl };
              } catch (e) {
                console.warn('[Pollinations] backend proxy failed for slide', slide.id, e?.message || e);
              }
              // fallback to public no-auth URL
              return { slideId: slide.id, url: getPollinationsImageUrl(slide.imagePrompt) };
            }
            return null;
          });

          const results = await Promise.all(imagePromises);
          results.forEach(result => {
            if (result && result.slideId !== undefined && result.url) {
              urls[result.slideId] = result.url;
            }
          });
        }

        setPreviewImageUrls(prev => ({ ...prev, ...urls }));
        imageGenerationInProgress.current = false;
      };

      generateImageUrls();
    } else {
      setPreviewImageUrls({});
      imageGenerationInProgress.current = false;
    }
  }, [
    editedSlides.length,
    // include prompt + needs-generation + uploadedImage state so effect re-runs
    JSON.stringify(editedSlides.map(s => `${s.id}-${s.imagePrompt}-${s.imageNeedsGeneration ? 1 : 0}-${s.uploadedImage ? 1 : 0}`)),
    showImageColumn,
    imageProvider,
    setPreviewImageUrls,
    imageGenerationInProgress,
    generatedPromptsRef
  ]);

  // Save generated preview images to slide data
  useEffect(() => {
    if (!previewImageUrls || Object.keys(previewImageUrls).length === 0) return;
    
    setEditedSlides(prevSlides => {
      let hasUpdates = false;
      const updatedSlides = prevSlides.map(slide => {
        const previewUrl = previewImageUrls[slide.id];
        // Save if there's a preview URL AND either no uploaded image OR needs regeneration
        if (previewUrl && (!slide.uploadedImage || slide.imageNeedsGeneration)) {
          hasUpdates = true;
          // Apply generated preview and clear the "needs generation" flag
          const next = { ...slide, uploadedImage: previewUrl };
          if (next.imageNeedsGeneration) delete next.imageNeedsGeneration;
          return next;
        }
        return slide;
      });
      
      if (hasUpdates) {
        // Save updated slides with new images to draft
        const convIdValue = convId || topic;
        saveDraft(updatedSlides, topic, convIdValue, currentDesign, imageProvider);
      }
      
      return hasUpdates ? updatedSlides : prevSlides;
    });
  }, [previewImageUrls, setEditedSlides, topic, convId, currentDesign, imageProvider]);

  // Auto-generate sticker images
  useEffect(() => {
    if (!editedSlides || editedSlides.length === 0) return;

    const generateStickers = async () => {
      let updatesNeeded = false;
      const updates = [];

      for (const slide of editedSlides) {
        if (Array.isArray(slide.stickers)) {
          for (let i = 0; i < slide.stickers.length; i++) {
            const sticker = slide.stickers[i];
            if (sticker.prompt && !sticker.url) {
              updates.push({ slideId: slide.id, stickerIndex: i, prompt: sticker.prompt });
              updatesNeeded = true;
            }
          }
        }
      }

      if (!updatesNeeded) return;

      const results = await Promise.all(updates.map(async (u) => {
        let url = null;
        if (imageProvider === 'grok') {
          try {
            const { generateImageFromGrok } = await import('../../../api');
            url = await generateImageFromGrok(u.prompt);
          } catch (e) { console.error("Sticker generation error:", e); }
        } else if (imageProvider === 'imagen') {
          try {
            const { generateImageFromImagen } = await import('../../../api');
            url = await generateImageFromImagen(u.prompt);
          } catch (e) { console.error("Sticker generation error (Imagen):", e); }
        } else {
          try {
            const { generateImageFromPollinations } = await import('../../../api');
            url = await generateImageFromPollinations(u.prompt) || getPollinationsImageUrl(u.prompt);
          } catch (e) {
            console.warn('[Pollinations] sticker backend proxy failed:', e?.message || e);
            url = getPollinationsImageUrl(u.prompt);
          }
        }
        return { ...u, url };
      }));
      
      const successful = results.filter(r => r.url);
      
      if (successful.length > 0) {
        setEditedSlides(prev => prev.map(s => {
          const slideUpdates = successful.filter(u => u.slideId === s.id);
          if (slideUpdates.length === 0) return s;
          
          const newStickers = [...(s.stickers || [])];
          slideUpdates.forEach(u => {
            if (newStickers[u.stickerIndex]) {
              newStickers[u.stickerIndex] = { ...newStickers[u.stickerIndex], url: u.url };
            }
          });
          return { ...s, stickers: newStickers };
        }));
      }
    };
    
    generateStickers();
  }, [editedSlides, imageProvider, setEditedSlides]);
};

export default useImageGeneration;
