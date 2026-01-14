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
    if (Array.isArray(location.state?.slides) && location.state.slides.length > 0) {
      setDraftLoaded(true);
      return;
    }
    
    const convId = location.state?.convId || topic;
    const draftKey = `slideit_draft_${convId}`;
    
    const loadDraft = async () => {
      try {
        const savedDraft = localStorage.getItem(draftKey);
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
          }
          
          if (draft.topic) {
            setTopic(draft.topic);
          }
          
          if (draft.design) {
            setCurrentDesign(draft.design);
            if (draft.design.id) {
              setSelectedTemplateId(draft.design.id);
            }
          }
          
          setDraftLoaded(true);
        } else {
          setDraftLoaded(true);
        }
      } catch (error) {
        console.error('[DRAFT] Error loading draft:', error);
        setDraftLoaded(true);
      }
    };
    
    loadDraft();
  }, [draftLoaded, setDraftLoaded, location.state?.slides, location.state?.convId, topic, setEditedSlides, setTopic, setCurrentDesign, setSelectedTemplateId]);
};

export default useDraftManagement;
