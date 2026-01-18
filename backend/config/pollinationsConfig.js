import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const pollinationsApiKey = process.env.POLLINATIONS_API_KEY;
const pollinationsBaseUrl = process.env.POLLINATIONS_BASE_URL || 'https://api.pollinations.ai';

export const pollinationsClient = axios.create({
  baseURL: pollinationsBaseUrl,
  headers: {
    'Authorization': pollinationsApiKey ? `Bearer ${pollinationsApiKey}` : '',
    'Content-Type': 'application/json'
  }
});

/**
 * Generate image using Pollinations API with authentication
 * @param {string} prompt - Image generation prompt
 * @param {object} options - Additional options (width, height, style, etc.)
 * @returns {Promise<string>} - Base64 encoded image or image URL
 */
export async function generatePollinationsImage(prompt, options = {}) {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Invalid prompt provided');
  }

  try {
    const payload = {
      prompt: prompt.trim(),
      width: options.width || 1280,
      height: options.height || 720,
      style: options.style || 'cinematic',
      nologo: options.nologo !== false // default true
    };

    // Primary: use gen.pollinations.ai image endpoint first (authenticated if key present)
    try {
      const encodedPrompt = encodeURIComponent(prompt.trim());
      // Prefer gen host: if user left default api host, map to gen.pollinations.ai
      let genBase = pollinationsBaseUrl;
      if (pollinationsBaseUrl.includes('api.pollinations.ai')) {
        genBase = pollinationsBaseUrl.replace('api.pollinations.ai', 'gen.pollinations.ai');
      } else if (!/gen\.pollinations\.ai/.test(pollinationsBaseUrl)) {
        // If a custom host is set and not gen, attempt to use gen.pollinations.ai explicitly
        genBase = 'https://gen.pollinations.ai';
      }

      const model = options.model || 'zimage';
      const width = options.width || 1024;
      const height = options.height || 1024;
      const url = `${genBase.replace(/\/$/, '')}/image/${encodedPrompt}?model=${encodeURIComponent(model)}&width=${width}&height=${height}`;

      const headers = {};
      if (pollinationsApiKey) headers['Authorization'] = `Bearer ${pollinationsApiKey}`;

      const res2 = await axios.get(url, { headers, responseType: 'arraybuffer', timeout: 60000 });
      if (res2.status === 200 && res2.data) {
        const base642 = Buffer.from(res2.data, 'binary').toString('base64');
        return `data:image/jpeg;base64,${base642}`;
      }
      console.warn('[Pollinations] gen image endpoint returned unexpected status:', res2.status);
    } catch (errGen) {
      console.warn('[Pollinations] gen/image primary call failed, will try authenticated /generate then public fallback:', errGen.message);
    }

    // Secondary: try authenticated POST /generate (older API style)
    try {
      const response = await pollinationsClient.post('/generate', payload, {
        timeout: 60000,
        responseType: 'arraybuffer'
      });

      if (response.status === 200 && response.data) {
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        return `data:image/png;base64,${base64}`;
      }
      console.warn('[Pollinations] /generate returned unexpected status:', response.status);
    } catch (err) {
      console.warn('[Pollinations] Authenticated /generate failed, will try public image endpoint fallback:', err.message);
    }

    // Final fallback: use the public (no-auth) image endpoint
    try {
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.trim())}`;
      const resp = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 60000 });
      if (resp.status === 200 && resp.data) {
        return Buffer.from(resp.data, 'binary').toString('base64');
      }
      throw new Error(`Public image endpoint returned status ${resp.status}`);
    } catch (finalErr) {
      console.error('[Pollinations] All generation attempts failed:', finalErr.message);
      throw finalErr;
    }
  } catch (error) {
    console.error('[Pollinations] Image generation failed:', error.message);
    throw error;
  }
}

/**
 * Get Pollinations image URL (no-auth fallback)
 * @param {string} prompt - Image generation prompt
 * @returns {string} - Image URL
 */
export function getPollinationsImageUrl(prompt) {
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') return null;
  const encodedPrompt = encodeURIComponent(prompt.trim());
  return `https://image.pollinations.ai/prompt/${encodedPrompt}`;
}

export const POLLINATIONS_CONFIG = {
  apiKey: pollinationsApiKey,
  baseUrl: pollinationsBaseUrl,
  timeout: 60000,
  defaultWidth: 1280,
  defaultHeight: 720,
  defaultStyle: 'cinematic'
};
