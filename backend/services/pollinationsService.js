import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const pollinationsApiKey = process.env.POLLINATIONS_API_KEY;
const pollinationsBaseUrl = process.env.POLLINATIONS_BASE_URL || 'https://api.pollinations.ai';

// In-memory cache for Pollinations images
const pollinationsImageCache = new Map();

/**
 * Generate image using Pollinations API with authentication
 * @param {string} prompt - Image generation prompt
 * @param {object} options - Additional options (width, height, style, etc.)
 * @returns {Promise<string>} - Base64 encoded image
 */
export async function generatePollinationsImageWithAuth(prompt, options = {}) {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Invalid prompt provided');
  }

  const cacheKey = `auth::${prompt.trim()}`;
  
  // Check cache first
  if (pollinationsImageCache.has(cacheKey)) {
    console.log('[Pollinations] Using cached authenticated image');
    return pollinationsImageCache.get(cacheKey);
  }

  if (!pollinationsApiKey) {
    console.warn('[Pollinations] No API key found, falling back to free version');
    return null;
  }

  try {
    const payload = {
      prompt: prompt.trim(),
      width: options.width || 1280,
      height: options.height || 720,
      style: options.style || 'cinematic',
      nologo: options.nologo !== false // default true
    };

    console.log(`[Pollinations] Generating image with authenticated API for prompt: "${prompt.substring(0, 50)}..."`);
    
    // Construct URL with API key as query parameter (Pollinations auth method)
    const url = `${pollinationsBaseUrl}/generate?key=${encodeURIComponent(pollinationsApiKey)}`;

    const response = await axios.post(url, payload, {
      timeout: 120000, // 2 minutes for image generation
      headers: {
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });

    if (response.status === 200 && response.data) {
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      const imageData = `data:image/png;base64,${base64}`;
      
      console.log('[Pollinations] ✅ Successfully generated authenticated image');
      
      // Cache the result
      pollinationsImageCache.set(cacheKey, imageData);
      
      // Keep cache size manageable
      if (pollinationsImageCache.size > 200) {
        const firstKey = pollinationsImageCache.keys().next().value;
        pollinationsImageCache.delete(firstKey);
      }
      
      return imageData;
    }

    throw new Error(`Unexpected response status: ${response.status}`);
  } catch (error) {
    // Check if it's a rate limit error
    if (error.response?.status === 429) {
      console.error('[Pollinations] ⚠️ Rate limited! API key might be invalid or quota exceeded:', error.message);
    } else {
      console.error('[Pollinations] ❌ Authenticated API failed:', error.message);
      if (error.response?.data) {
        console.error('[Pollinations] Response data:', error.response.data);
      }
    }
    return null;
  }
}

/**
 * Get Pollinations free image URL (no authentication required)
 * @param {string} prompt - Image generation prompt
 * @returns {string} - Image URL
 */
export function getPollinationsFreeImageUrl(prompt) {
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') return null;
  const encodedPrompt = encodeURIComponent(prompt.trim());
  return `https://image.pollinations.ai/prompt/${encodedPrompt}`;
}

/**
 * Fetch image from Pollinations free API and convert to base64
 * @param {string} prompt - Image generation prompt
 * @returns {Promise<string>} - Base64 encoded image
 */
export async function generatePollinationsFreeImage(prompt) {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Invalid prompt provided');
  }

  const cacheKey = `free::${prompt.trim()}`;
  
  // Check cache first
  if (pollinationsImageCache.has(cacheKey)) {
    console.log('[Pollinations-Free] Using cached free image');
    return pollinationsImageCache.get(cacheKey);
  }

  try {
    const imageUrl = getPollinationsFreeImageUrl(prompt);
    
    console.log(`[Pollinations-Free] Fetching image for prompt: "${prompt.substring(0, 50)}..."`);
    
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 120000
    });

    if (response.status === 200 && response.data) {
      const mime = response.headers['content-type'] || 'image/png';
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      const imageData = `data:${mime};base64,${base64}`;
      
      // Cache the result
      pollinationsImageCache.set(cacheKey, imageData);
      
      // Keep cache size manageable
      if (pollinationsImageCache.size > 200) {
        const firstKey = pollinationsImageCache.keys().next().value;
        pollinationsImageCache.delete(firstKey);
      }
      
      return imageData;
    }

    throw new Error(`Failed to fetch image: ${response.status}`);
  } catch (error) {
    console.error('[Pollinations-Free] Image fetch failed:', error.message);
    throw error;
  }
}

/**
 * Generate image with Pollinations (uses free API with smart retries)
 * @param {string} prompt - Image generation prompt
 * @param {object} options - Additional options
 * @returns {Promise<string>} - Base64 encoded image
 */
export async function generatePollinationsImage(prompt, options = {}) {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Invalid prompt provided');
  }

  // Use free API directly - it's more reliable
  // Skip authenticated API for now as it's not working reliably
  console.log('[Pollinations] Using free API for image generation');
  
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const image = await generatePollinationsFreeImage(prompt);
      return image;
    } catch (error) {
      lastError = error;
      
      // Check if rate limited
      if (error.message.includes('429') || error.message.includes('rate')) {
        const backoffMs = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
        console.log(`[Pollinations] Rate limited! Retrying after ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      } else {
        // For other errors, don't retry, just fail
        console.error('[Pollinations] Generation error:', error.message);
        throw error;
      }
    }
  }

  console.error('[Pollinations] All retries exhausted');
  throw lastError || new Error('Failed to generate image after all retries');
}

/**
 * Clear the image cache (useful for memory management)
 */
export function clearPollinationsCache() {
  pollinationsImageCache.clear();
  console.log('[Pollinations] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getPollinationsCacheStats() {
  return {
    size: pollinationsImageCache.size,
    keys: Array.from(pollinationsImageCache.keys())
  };
}
