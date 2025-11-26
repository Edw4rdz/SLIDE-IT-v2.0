// backend/services/pptxService.js
import PptxGenJS from "pptxgenjs";
import axios from "axios";

/**
 * Helper to get the AI image URL (copied from your frontend)
 */
const getPollinationsImageUrl = (prompt) => {
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') return null;
  const encodedPrompt = encodeURIComponent(prompt.trim());
  return `https://image.pollinations.ai/prompt/${encodedPrompt}`;
};

/**
 * Fetches an image from a URL and returns it as a base64 string.
 * This runs on the server, so it will not have browser-related (CORS) errors.
 */
const fetchImageAsBase64 = async (url) => {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer'
    });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    // We must provide a data URI scheme for pptxgenjs
    return `data:${response.headers['content-type']};base64,${base64}`;
  } catch (err) {
    console.error(`Error fetching image for PPTX: ${url}`, err.message);
    return null; // Return null if fetching fails
  }
};

/**
 * Main service function to generate the PPTX from frontend data.
 */
export const generatePptxFromData = async (requestBody) => {
  const { slides, design, includeImages } = requestBody;

  if (!slides || slides.length === 0) {
    throw new Error("No slides data provided");
  }

  let pptx = new PptxGenJS();
  // Set layout using the correct method
  pptx.defineLayout({ name: 'LAYOUT_16x9', width: 10, height: 5.625 });
  pptx.layout = 'LAYOUT_16x9';

  // Use a 'for...of' loop to handle async image fetching
  for (const slide of slides) {
    let pptxSlide = pptx.addSlide();

    // 1. DETERMINE STYLES from the 'design' object
    const slideLayout = slide.layout || 'content';
    const layoutStyles = design.layouts?.[slideLayout] || {};
    
    // Get colors and remove the '#' for pptxgenjs

    // Always use background color for contrast calculation
    const bgColorHex = layoutStyles.background || design.globalBackground || '#ffffff';
    const bgColor = bgColorHex.startsWith('#') ? bgColorHex : `#${bgColorHex}`;
    const titleColor = getContrastYIQ(bgColor);
    const textColor = getContrastYIQ(bgColor);
    const font = design.font || 'Arial';

    // Set slide background color (This applies your template's blue color)
    pptxSlide.background = { color: bgColor };

    // 2. CHECK FOR IMAGE
    let imageBase64 = null;
    if (includeImages) {
      if (slide.uploadedImage) {
        // Use the already-base64-encoded user-uploaded image
        imageBase64 = slide.uploadedImage;
      } else if (slide.imagePrompt) {
        // Fetch the AI image and convert it to base64
        const imageUrl = getPollinationsImageUrl(slide.imagePrompt);
        if (imageUrl) {
          console.log(`Fetching AI image: ${slide.imagePrompt}`);
          imageBase64 = await fetchImageAsBase64(imageUrl);
        }
      }
    }

    // 3. DEFINE LAYOUTS (coordinates for text and images)
    // All coordinates are in inches: { x, y, w, h }
    let titleOpts, bodyOpts;
    
    // If there's an image, put text on the left and image on the right
    // This creates the layout from your screenshot
    if (imageBase64) {
      titleOpts = {
        x: 0.5, y: 0.25, w: 5.0, h: 0.75,
        fontSize: slideLayout === 'title' ? 36 : 28,
        color: titleColor,
        fontFace: font,
        align: 'left',
      };
      bodyOpts = {
        x: 0.5, y: 1.1, w: 5.0, h: 4.25,
        fontSize: 16,
        color: textColor,
        fontFace: font,
        bullet: true,
      };
      // Add the image to the right side
      pptxSlide.addImage({
        data: imageBase64,
        x: 5.75, y: 1.0, w: 4.0, h: 4.0,
      });
    } 
    // If no image, use a wider, centered layout for text
    else {
      titleOpts = {
        x: 0.5, y: 0.25, w: 9.0, h: 0.75,
        fontSize: slideLayout === 'title' ? 44 : 32,
        color: titleColor,
        fontFace: font,
        align: slideLayout === 'title' ? 'center' : 'left',
        valign: slideLayout === 'title' ? 'middle' : 'top',
      };
      bodyOpts = {
        x: 0.5, y: 1.1, w: 9.0, h: 4.25,
        fontSize: slideLayout === 'title' ? 24 : 18,
        color: textColor,
        fontFace: font,
        align: slideLayout === 'title' ? 'center' : 'left',
        bullet: slideLayout !== 'title', // No bullets on title slide
      };
    }

    // 4. ADD TEXT TO SLIDE
    pptxSlide.addText(slide.title || '', titleOpts);

    // Always add body text, even for title slides, and always use high-contrast color
    let hasBullets = slide.bullets && slide.bullets.length > 0;
    let hasText = slide.text && slide.text.trim().length > 0;
    if (hasBullets) {
      const bulletPoints = slide.bullets.map(b => b.trim()).filter(b => b);
      pptxSlide.addText(bulletPoints, { ...bodyOpts, bullet: slideLayout !== 'title', color: textColor });
    }
    if (hasText) {
      pptxSlide.addText(slide.text, { ...bodyOpts, bullet: false, color: textColor });
    }
  }

  // 5. RETURN THE FILE BUFFER
  // This generates the file in memory
  console.log("PPTX generation complete. Generating buffer...");
  const pptxData = await pptx.write();
  
  // Convert to Buffer if it's a Blob or other type
  let pptxBuffer;
  if (Buffer.isBuffer(pptxData)) {
    pptxBuffer = pptxData;
  } else if (pptxData instanceof Uint8Array) {
    pptxBuffer = Buffer.from(pptxData);
  } else if (pptxData instanceof Blob) {
    // Convert Blob to Buffer
    const arrayBuffer = await pptxData.arrayBuffer();
    pptxBuffer = Buffer.from(arrayBuffer);
  } else if (typeof pptxData === 'string') {
    // Base64 string
    pptxBuffer = Buffer.from(pptxData, 'base64');
  } else {
    throw new Error('Unknown PPTX data format returned from pptxgenjs');
  }
  
  console.log(`PPTX buffer ready, size: ${pptxBuffer.length} bytes`);
  return pptxBuffer;
};