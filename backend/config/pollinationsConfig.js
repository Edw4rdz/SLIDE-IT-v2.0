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

    const response = await pollinationsClient.post('/generate', payload, {
      timeout: 60000,
      responseType: 'arraybuffer'
    });

    if (response.status === 200 && response.data) {
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      return `data:image/png;base64,${base64}`;
    }

    throw new Error(`Unexpected response status: ${response.status}`);
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
