import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for sticker search functionality
 */
export const useStickerSearch = ({
  stickerCategories,
  stickerSearchQuery,
  setExternalStickers,
  setLoadingExternalStickers
}) => {
  // Search external sticker sources (Iconify API)
  const searchExternalStickers = useCallback(async (query) => {
    setLoadingExternalStickers(true);
    try {
      const response = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=24`);
      const data = await response.json();
      
      if (data.icons && data.icons.length > 0) {
        const iconPromises = data.icons.slice(0, 24).map(async (iconName) => {
          try {
            const svgResponse = await fetch(`https://api.iconify.design/${iconName}.svg?height=40`);
            const svgText = await svgResponse.text();
            return {
              name: iconName.split(':')[1] || iconName,
              svg: svgText,
              source: 'iconify',
              fullName: iconName
            };
          } catch (err) {
            return null;
          }
        });
        
        const icons = (await Promise.all(iconPromises)).filter(icon => icon !== null);
        setExternalStickers(icons);
      } else {
        setExternalStickers([]);
      }
    } catch (error) {
      console.error('External sticker search failed:', error);
      setExternalStickers([]);
    } finally {
      setLoadingExternalStickers(false);
    }
  }, [setExternalStickers, setLoadingExternalStickers]);

  // Filter stickers based on search query
  const filterStickers = useCallback((query) => {
    if (!query.trim()) {
      return stickerCategories.flatMap(cat => cat.items.map(item => ({ cat: cat.name, item })));
    }
    
    const searchLower = query.toLowerCase().trim();
    const keywords = searchLower.split(/\s+/);
    
    const matchScore = (stickerName) => {
      const nameLower = stickerName.toLowerCase();
      let score = 0;
      
      keywords.forEach(keyword => {
        if (nameLower.includes(keyword)) score += 10;
        if (nameLower.startsWith(keyword)) score += 5;
      });
      
      return score;
    };
    
    const allStickers = stickerCategories.flatMap(cat => 
      cat.items.map(item => ({
        cat: cat.name, 
        item,
        score: matchScore(item)
      }))
    );
    
    const filtered = allStickers
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ cat, item }) => ({ cat, item }));
    
    return filtered;
  }, [stickerCategories]);

  // Trigger external search when needed
  useEffect(() => {
    if (!stickerSearchQuery.trim()) {
      setExternalStickers([]);
      setLoadingExternalStickers(false);
      return;
    }
    
    const searchLower = stickerSearchQuery.toLowerCase().trim();
    const filtered = filterStickers(stickerSearchQuery);
    
    if (filtered.length === 0 && searchLower.length > 2) {
      searchExternalStickers(searchLower);
    } else {
      setExternalStickers([]);
      setLoadingExternalStickers(false);
    }
  }, [stickerSearchQuery, filterStickers, searchExternalStickers, setExternalStickers, setLoadingExternalStickers]);

  return {
    filterStickers,
    searchExternalStickers
  };
};

export default useStickerSearch;
