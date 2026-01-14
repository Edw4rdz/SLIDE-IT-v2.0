import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getTemplates } from '../../../api';
import { initializeSlides, saveDraft, getCurrentUser } from '../utils';
import { DEFAULT_DESIGN } from '../constants';

/**
 * Custom hook for managing EditPreview state
 */
export const useEditPreviewState = () => {
  const location = useLocation();

  // Initialize slides from navigation state
  const initialSlides = initializeSlides(location.state?.slides || []);

  // Core state
  const [editedSlides, setEditedSlides] = useState(initialSlides);
  const [topic, setTopic] = useState(location.state?.topic || 'My_Presentation');
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Sticker state
  const [stickerSearchQuery, setStickerSearchQuery] = useState("");
  const [openStickerFor, setOpenStickerFor] = useState(null);
  const [externalStickers, setExternalStickers] = useState([]);
  const [loadingExternalStickers, setLoadingExternalStickers] = useState(false);
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [draggingSticker, setDraggingSticker] = useState(null);
  const [resizingSticker, setResizingSticker] = useState(null);
  const [rotatingSticker, setRotatingSticker] = useState(null);
  const [stickerCategories, setStickerCategories] = useState([]);

  // Text box state
  const [selectedTextBox, setSelectedTextBox] = useState(null);
  const [draggingTextBox, setDraggingTextBox] = useState(null);
  const [resizingTextBox, setResizingTextBox] = useState(null);

  // Image state
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImageUrls, setPreviewImageUrls] = useState({});

  // Temporary input state
  const [tempFontSizes, setTempFontSizes] = useState({});
  const [tempImagePrompts, setTempImagePrompts] = useState({});

  // Modal state
  const [showDownloadPreview, setShowDownloadPreview] = useState(false);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, slideId: null });
  const [showGuide, setShowGuide] = useState(false);

  // Refs
  const containerRefs = useRef({});
  const promptTimeouts = useRef({});
  const stickerAnchorRefs = useRef({});
  const urlsRefreshedRef = useRef(false);
  const imageGenerationInProgress = useRef(false);
  const generatedPromptsRef = useRef(new Set());

  // Show image column state
  const [showImageColumn, setShowImageColumn] = useState(
    location.state?.includeImages === true || location.state?.includeImages === 'true'
  );

  // Get initial image provider
  const getInitialImageProvider = () => {
    if (location.state?.imageProvider) {
      return location.state.imageProvider;
    }
    const convId = location.state?.convId || location.state?.topic;
    if (convId) {
      const draftKey = `slideit_draft_${convId}`;
      try {
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          if (draft.imageProvider) {
            return draft.imageProvider;
          }
        }
      } catch (e) {
        console.warn('[INIT] Failed to check draft for imageProvider:', e);
      }
    }
    return 'pollinations';
  };

  const [imageProvider, setImageProvider] = useState(getInitialImageProvider());

  // Design state
  const [currentDesign, setCurrentDesign] = useState(DEFAULT_DESIGN);

  // Load sticker manifest
  useEffect(() => {
    fetch('/stickers/manifest.json')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.categories)) setStickerCategories(data.categories);
      })
      .catch(e => console.warn('Sticker manifest load failed', e));
  }, []);

  // Show guide on first visit
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('slideit_edit_guide_seen');
    if (!hasSeenGuide) {
      setShowGuide(true);
      localStorage.setItem('slideit_edit_guide_seen', 'true');
    }
  }, []);

  // Load templates
  useEffect(() => {
    let isMounted = true;
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const res = await getTemplates();
        if (isMounted) {
          const apiTemplates = res.data || [];
          const user = getCurrentUser();
          const userId = user?.user_id || user?.uid || user?.id || 'guest';
          const uploadedKey = `uploadedTemplates_${userId}`;
          const localTemplates = JSON.parse(localStorage.getItem(uploadedKey) || '[]');
          const combinedTemplates = [...apiTemplates, ...localTemplates];
          setTemplates(combinedTemplates);

          const storedTemplate = JSON.parse(localStorage.getItem('selectedTemplate'));
          if (storedTemplate && storedTemplate.id && combinedTemplates.find(t => t.id === storedTemplate.id)) {
            setCurrentDesign(storedTemplate);
            setSelectedTemplateId(storedTemplate.id);
          } else if (storedTemplate) {
            localStorage.removeItem('selectedTemplate');
          }
          setLoadingTemplates(false);
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
        if (isMounted) setLoadingTemplates(false);
      }
    };
    fetchTemplates();
    return () => { isMounted = false; };
  }, []);

  // Load design from navigation state or localStorage
  useEffect(() => {
    const navigationDesign = location.state?.initialDesign;
    if (navigationDesign && navigationDesign.id) {
      setCurrentDesign(navigationDesign);
      setSelectedTemplateId(navigationDesign.id);
    } else {
      const saved = localStorage.getItem('selectedTemplate');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.id) {
            setCurrentDesign(parsed);
            setSelectedTemplateId(parsed.id || '');
          } else {
            localStorage.removeItem('selectedTemplate');
          }
        } catch (e) {
          localStorage.removeItem('selectedTemplate');
        }
      }
    }
  }, [location.state?.initialDesign]);

  // Template change handler
  const handleTemplateChange = useCallback((templateId, availableTemplates) => {
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId('');
      setCurrentDesign(DEFAULT_DESIGN);
      localStorage.removeItem('selectedTemplate');
      setEditedSlides(prevSlides => prevSlides.map(slide => ({
        ...slide,
        background: undefined,
        titleColor: undefined,
        textColor: undefined
      })));
      return;
    }

    const selected = availableTemplates.find((t) => t.id === templateId);
    if (selected && selected.design) {
      setSelectedTemplateId(templateId);
      const newDesign = { ...selected.design, id: selected.id };
      setCurrentDesign(newDesign);
      localStorage.setItem('selectedTemplate', JSON.stringify(newDesign));

      setEditedSlides(prevSlides => {
        return prevSlides.map((slide, index) => {
          if (newDesign.slides && Array.isArray(newDesign.slides) && newDesign.slides.length > 0) {
            const templateSlideIndex = index % newDesign.slides.length;
            const templateSlide = newDesign.slides[templateSlideIndex];
            if (templateSlide && templateSlide.background) {
              return {
                ...slide,
                background: templateSlide.background,
                titleColor: templateSlide.titleColor,
                textColor: templateSlide.textColor
              };
            }
          }
          return {
            ...slide,
            background: undefined,
            titleColor: undefined,
            textColor: undefined
          };
        });
      });
    }
  }, [selectedTemplateId]);

  return {
    // Core state
    editedSlides,
    setEditedSlides,
    topic,
    setTopic,
    templates,
    loadingTemplates,
    selectedTemplateId,
    setSelectedTemplateId,
    isSidebarOpen,
    setIsSidebarOpen,
    draftLoaded,
    setDraftLoaded,
    // Sticker state
    stickerSearchQuery,
    setStickerSearchQuery,
    openStickerFor,
    setOpenStickerFor,
    externalStickers,
    setExternalStickers,
    loadingExternalStickers,
    setLoadingExternalStickers,
    selectedSticker,
    setSelectedSticker,
    draggingSticker,
    setDraggingSticker,
    resizingSticker,
    setResizingSticker,
    rotatingSticker,
    setRotatingSticker,
    stickerCategories,
    // Text box state
    selectedTextBox,
    setSelectedTextBox,
    draggingTextBox,
    setDraggingTextBox,
    resizingTextBox,
    setResizingTextBox,
    // Image state
    selectedImage,
    setSelectedImage,
    previewImageUrls,
    setPreviewImageUrls,
    // Temporary input state
    tempFontSizes,
    setTempFontSizes,
    tempImagePrompts,
    setTempImagePrompts,
    // Modal state
    showDownloadPreview,
    setShowDownloadPreview,
    previewSlideIndex,
    setPreviewSlideIndex,
    deleteConfirm,
    setDeleteConfirm,
    showGuide,
    setShowGuide,
    // Additional state
    showImageColumn,
    setShowImageColumn,
    imageProvider,
    setImageProvider,
    currentDesign,
    setCurrentDesign,
    // Refs
    containerRefs,
    promptTimeouts,
    stickerAnchorRefs,
    urlsRefreshedRef,
    imageGenerationInProgress,
    generatedPromptsRef,
    // Handlers
    handleTemplateChange,
    // Location
    location
  };
};

export default useEditPreviewState;
