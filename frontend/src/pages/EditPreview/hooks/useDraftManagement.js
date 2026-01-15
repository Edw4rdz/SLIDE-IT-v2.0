import { useEffect, useCallback } from 'react';
import { saveDraft } from '../utils';

/**
 * Custom hook for managing draft loading and URL refreshing
 */
export const useDraftManagement = ({
  editedSlides,
  setEditedSlides,
  topic,
  setTopic,
  currentDesign,
  setCurrentDesign,
  setSelectedTemplateId,
  imageProvider,
  setImageProvider,
  draftLoaded,
  setDraftLoaded,
  urlsRefreshedRef,
  location
}) => {
  // Refresh expired presigned URLs for navigation state slides
  useEffect(() => {
    const refreshNavigationStateSlides = async () => {
      if (!urlsRefreshedRef.current && Array.isArray(location.state?.slides) && location.state.slides.length > 0 && editedSlides.length > 0) {
        urlsRefreshedRef.current = true;
        
        const { refreshPresignedUrlIfNeeded } = await import('../../../api');
        
        const refreshedSlides = await Promise.all(
          editedSlides.map(async (slide) => {
            const refreshedSlide = await refreshPresignedUrlIfNeeded(slide);
            return refreshedSlide;
          })
        );
        
        const hasChanges = refreshedSlides.some((slide, idx) => slide.uploadedImage !== editedSlides[idx].uploadedImage);
        
        if (hasChanges) {
          setEditedSlides(refreshedSlides);
          const convId = location.state?.convId || topic;
          saveDraft(refreshedSlides, topic, convId, currentDesign, imageProvider);
        }
      }
    };
    
    refreshNavigationStateSlides();
  }, [editedSlides, location.state?.slides, topic, currentDesign, imageProvider, setEditedSlides, urlsRefreshedRef]);

  // Load draft on mount
  useEffect(() => {
    if (draftLoaded) return;
    
    const convId = location.state?.convId || topic;
    const draftKey = `slideit_draft_${convId}`;
    
    const loadDraft = async () => {
      try {
        const savedDraft = localStorage.getItem(draftKey);
        
        // Always prefer draft if it exists, even if location.state has slides
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          
          if (draft.slides && Array.isArray(draft.slides)) {
            const { refreshPresignedUrlIfNeeded } = await import('../../../api');
            
            const restoredSlidesPromises = draft.slides.map(async (slide, index) => {
              const slideWithFreshUrl = await refreshPresignedUrlIfNeeded(slide);
              
              return {
                ...slideWithFreshUrl,
                id: slideWithFreshUrl.id ?? `slide-${index}-${Date.now()}`,
                layout: slideWithFreshUrl.layout || 'content',
                uploadedImage: slideWithFreshUrl.uploadedImage || null,
                uploadedImageKey: slideWithFreshUrl.uploadedImageKey || null,
                tables: [],
                stickers: slideWithFreshUrl.stickers || [],
                textBoxes: slideWithFreshUrl.textBoxes || [],
                imageData: slideWithFreshUrl.imageData || undefined,
                titleBox: slideWithFreshUrl.titleBox || undefined,
                bodyBox: slideWithFreshUrl.bodyBox || undefined,
                styles: slideWithFreshUrl.styles || {
                  titleFont: 'Arial',
                  titleSize: 32,
                  titleBold: false,
                  titleItalic: false,
                  textFont: 'Arial',
                  textSize: 16,
                  textBold: false,
                  textItalic: false,
                  textAlign: 'left'
                }
              };
            });
            
            const restoredSlides = await Promise.all(restoredSlidesPromises);
            setEditedSlides(restoredSlides);
            console.log('[DRAFT] Loaded from draft:', restoredSlides.length, 'slides');
          }
          
          if (draft.topic) {
            setTopic(draft.topic);
          }
          
          if (draft.imageProvider) {
            setImageProvider(draft.imageProvider);
            console.log('[DRAFT] Restored imageProvider:', draft.imageProvider);
          }
          
          if (draft.design) {
            setCurrentDesign(draft.design);
            if (draft.design.id) {
              setSelectedTemplateId(draft.design.id);
            }
          }
        } else if (location.state?.slides) {
          // No draft exists, use location.state slides
          const { initializeSlides } = await import('../utils');
          const initialSlides = initializeSlides(location.state.slides);
          setEditedSlides(initialSlides);
          console.log('[DRAFT] No draft found, loaded from navigation state:', initialSlides.length, 'slides');
        }
        
        setDraftLoaded(true);
      } catch (error) {
        console.error('[DRAFT] Error loading draft:', error);
        // Fallback to location.state if draft loading fails
        if (location.state?.slides) {
          const { initializeSlides } = await import('../utils');
          const initialSlides = initializeSlides(location.state.slides);
          setEditedSlides(initialSlides);
        }
        setDraftLoaded(true);
      }
    };
    
    loadDraft();
  }, [draftLoaded, setDraftLoaded, location.state?.convId, location.state?.slides, topic, setEditedSlides, setTopic, setCurrentDesign, setSelectedTemplateId]);
};

export default useDraftManagement;
