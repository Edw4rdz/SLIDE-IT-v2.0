// backend/services/pptxExtractorService.js
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs/promises';
import xml2js from 'xml2js';

const parseXml = (xml) => {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

/**
 * Extract design information from a PPTX file
 * PPTX files are ZIP archives containing XML files
 */
export const extractPptxDesign = async (pptxPath) => {
  try {
    const zip = new AdmZip(pptxPath);
    const zipEntries = zip.getEntries();
    
    const design = {
      globalBackground: '#ffffff',
      globalTitleColor: '#000000',
      globalTextColor: '#333333',
      font: 'Arial',
      layouts: {},
      themes: {},
      hasBackgroundImage: false,
      backgroundImage: null,
      slides: [] 
    };

    // Create a map for faster entry lookup
    const entryMap = new Map();
    zipEntries.forEach(entry => entryMap.set(entry.entryName, entry));

    // 1. Extract Theme Colors (theme1.xml)
    const themeEntry = zipEntries.find(entry => entry.entryName.includes('theme/theme1.xml'));
    if (themeEntry) {
      const themeXml = themeEntry.getData().toString('utf8');
      const themeParsed = await parseXml(themeXml);
      const colorScheme = themeParsed?.['a:theme']?.['a:themeElements']?.[0]?.['a:clrScheme']?.[0];
      if (colorScheme) {
        design.themes.accent1 = extractColor(colorScheme['a:accent1']);
        design.themes.accent2 = extractColor(colorScheme['a:accent2']);
        design.themes.accent3 = extractColor(colorScheme['a:accent3']);
        design.themes.accent4 = extractColor(colorScheme['a:accent4']);
        design.themes.accent5 = extractColor(colorScheme['a:accent5']);
        design.themes.accent6 = extractColor(colorScheme['a:accent6']);
        design.themes.dk1 = extractColor(colorScheme['a:dk1']); // Dark 1 (Text)
        design.themes.lt1 = extractColor(colorScheme['a:lt1']); // Light 1 (Bg)
        design.themes.dk2 = extractColor(colorScheme['a:dk2']);
        design.themes.lt2 = extractColor(colorScheme['a:lt2']);
      }
    }

    // 2. Extract Master Slide Background (The Ultimate Fallback)
    const slideMasterEntry = zipEntries.find(entry => entry.entryName.includes('slideMasters/slideMaster1.xml'));
    let masterBackgroundColor = null;

    if (slideMasterEntry) {
      const masterXml = slideMasterEntry.getData().toString('utf8');
      const masterParsed = await parseXml(masterXml);
      
      // Helper to find background in any XML node (Master, Layout, or Slide)
      masterBackgroundColor = await findBackgroundInElement(masterParsed?.['p:sldMaster'], design.themes);
      
      if (masterBackgroundColor && masterBackgroundColor !== '#ffffff') {
          design.globalBackground = masterBackgroundColor;
      }
    }

    // 3. Process Slides
    const slideEntries = zipEntries.filter(entry => entry.entryName.match(/^ppt\/slides\/slide\d+\.xml$/));
    slideEntries.sort((a, b) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)\.xml/)[1]);
      const numB = parseInt(b.entryName.match(/slide(\d+)\.xml/)[1]);
      return numA - numB;
    });
    
    design.slideCount = slideEntries.length;

    for (let i = 0; i < slideEntries.length; i++) {
      const entry = slideEntries[i];
      const slideXml = entry.getData().toString('utf8');
      const slideParsed = await parseXml(slideXml);
      const slide = slideParsed?.['p:sld'];
      
      const slideInfo = {
        id: `slide-${i + 1}`,
        background: null,
        titleColor: null,
        textColor: null
      };

      if (slide) {
        // --- A. Check Slide Specific Background (Highest Priority) ---
        slideInfo.background = await findBackgroundInElement(slide, design.themes);

        // --- B. Check Layout Background (Medium Priority) ---
        if (!slideInfo.background) {
            try {
                const relsName = `ppt/slides/_rels/slide${i + 1}.xml.rels`;
                const relsEntry = entryMap.get(relsName);
                if (relsEntry) {
                    const relsXml = relsEntry.getData().toString('utf8');
                    const relsParsed = await parseXml(relsXml);
                    const relationships = relsParsed?.['Relationships']?.['Relationship'];
                    if (relationships) {
                        const layoutRel = relationships.find(r => r['$']?.Type?.endsWith('/slideLayout'));
                        if (layoutRel) {
                            const layoutTarget = layoutRel['$'].Target;
                            const layoutFilename = path.posix.join('ppt/slides', layoutTarget);
                            const layoutEntry = entryMap.get(layoutFilename);
                            if (layoutEntry) {
                                const layoutXml = layoutEntry.getData().toString('utf8');
                                const layoutParsed = await parseXml(layoutXml);
                                
                                // Check Layout for BG
                                const layoutBg = await findBackgroundInElement(layoutParsed?.['p:sldLayout'], design.themes);
                                
                                if (layoutBg) {
                                    // Logic: If Layout is White, but Master has a specific color (e.g. Texture), 
                                    // prefer Master unless Layout explicitly wants White.
                                    // For now, we assume if Layout has a result, we use it.
                                    slideInfo.background = layoutBg;
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn('Layout extraction failed', err);
            }
        }

        // --- C. Fallback to Master / Global (Lowest Priority) ---
        if (!slideInfo.background) {
            // If we found a master color earlier, use it
            if (masterBackgroundColor) {
                slideInfo.background = masterBackgroundColor;
            } else if (design.globalBackground) {
                slideInfo.background = design.globalBackground;
            } else {
                slideInfo.background = '#FFFFFF';
            }
        }

        // --- D. Final "White" Check ---
        // If result is White, but we have a Master Texture (Accent 1 fallback), force it.
        // This solves the "Nature Journal" issue where layouts are transparent/white but Master is paper.
        if ((!slideInfo.background || slideInfo.background.toLowerCase() === '#ffffff') && 
            design.globalBackground && design.globalBackground !== '#ffffff') {
            slideInfo.background = design.globalBackground;
        }

        // --- Text Color Logic ---
        // Always try to extract the actual font color for title and text from the first shapes
        const shapes = slide?.['p:cSld']?.[0]?.['p:spTree']?.[0]?.['p:sp'];
        if (shapes && shapes.length > 0) {
          let foundTitle = false;
          let foundText = false;
          shapes.forEach((shape, index) => {
            const txBody = shape?.['p:txBody'];
            if (txBody) {
              const textColor = extractTextColor(txBody[0]);
              if (textColor) {
                // Heuristic: first shape is usually title, second is body/text
                if (!foundTitle) {
                  slideInfo.titleColor = textColor;
                  if (i === 0) design.globalTitleColor = textColor;
                  foundTitle = true;
                } else if (!foundText) {
                  slideInfo.textColor = textColor;
                  if (i === 0 && !design.globalTextColor) design.globalTextColor = textColor;
                  foundText = true;
                }
              }
            }
          });
        }
        // Fallbacks if not found
        if (!slideInfo.titleColor) {
          slideInfo.titleColor = isColorDark(slideInfo.background) ? '#FFFFFF' : '#000000';
        }
        if (!slideInfo.textColor) {
          slideInfo.textColor = isColorDark(slideInfo.background) ? '#E0E0E0' : '#333333';
        }
      }
      design.slides.push(slideInfo);
    }

    // Add layouts structure for compatibility with EditPreview
    // Use the most common slide background or globalBackground for content layout
    const contentBackground = design.slides.length > 0 
      ? (design.slides[0].background || design.globalBackground)
      : design.globalBackground;
    
    design.layouts = {
      title: {
        background: design.globalBackground,
        titleColor: design.globalTitleColor,
        textColor: design.globalTextColor
      },
      content: {
        background: contentBackground,
        titleColor: design.globalTitleColor,
        textColor: design.globalTextColor
      }
    };

    return design;
  } catch (err) {
    console.error('Error extracting PPTX design:', err);
    throw new Error('Failed to extract template design');
  }
};

// --- HELPERS ---

/**
 * Universal function to find a background color in a Slide, Layout, or Master
 * Checks: 1. Property <p:bg> 2. Background Shape (Rect) 3. Background Picture
 */
async function findBackgroundInElement(elementRoot, themeColors) {
    if (!elementRoot) return null;
    const cSld = elementRoot['p:cSld']?.[0];
    if (!cSld) return null;

    // 1. Check Standard Background Property (<p:bg>)
    const bg = cSld['p:bg'];
    if (bg) {
        const color = extractBackgroundColor(bg[0], themeColors);
        // If valid color (and not "transparent/null"), return it
        if (color) return color;
    }

    // 2. Check Shape Tree for "Background Objects"
    const spTree = cSld['p:spTree']?.[0];
    if (spTree) {
        // A. Check for Shapes (Rectangles) acting as background
        // We iterate shapes to find the largest rectangle at the bottom (z-order)
        if (spTree['p:sp']) {
            const shapeColor = findLargestRectangleColor(spTree['p:sp'], themeColors);
            if (shapeColor) return shapeColor;
        }

        // B. Check for Pictures (Textures) acting as background
        // If a picture is at the bottom, we assume it's a texture and return a fallback color
        if (spTree['p:pic']) {
            // Determine fallback color based on theme
            if (themeColors.accent1) return themeColors.accent1;
            if (themeColors.dk1) return themeColors.dk1;
            return '#D2B48C'; // Generic "Paper" Tan fallback
        }
    }
    return null;
}

/**
 * Finds the largest rectangle in a shape tree to use as background
 */
function findLargestRectangleColor(shapesArray, themeColors) {
    let maxArea = 0;
    let bgShapeColor = null;
    const slideWidth = 9144000; // Standard EMU width
    const slideHeight = 6858000;

    if (!shapesArray || shapesArray.length === 0) return null;

    for (const shape of shapesArray) {
        const shapeProps = shape?.['p:spPr']?.[0];
        const xfrm = shapeProps?.['a:xfrm']?.[0];
        const off = xfrm?.['a:off']?.[0]?.['$'];
        const ext = xfrm?.['a:ext']?.[0]?.['$'];
        
        if (off && ext) {
            const x = parseInt(off.x || '0', 10);
            const y = parseInt(off.y || '0', 10);
            const cx = parseInt(ext.cx || '0', 10);
            const cy = parseInt(ext.cy || '0', 10);
            const area = cx * cy;
            const slideArea = slideWidth * slideHeight;

            // Logic: Shape must cover at least 70% of the slide and start near top-left (0,0)
            if (area > maxArea && area > 0.7 * slideArea && x < 100000 && y < 100000) {
                // Check if it has a fill color
                const mockBgStruct = { 'p:bgPr': [shapeProps] };
                const shapeColor = extractBackgroundColor(mockBgStruct, themeColors);
                
                if (shapeColor && shapeColor.toLowerCase() !== '#ffffff') {
                    maxArea = area;
                    bgShapeColor = shapeColor;
                }
            }
        }
    }
    return bgShapeColor;
}

// ... (Keep extractPptxThumbnail as is) ...
export const extractPptxThumbnail = async (pptxPath, outputDir, baseFilename) => {
  try {
    const zip = new AdmZip(pptxPath);
    const zipEntries = zip.getEntries();
    const thumbnailEntry = zipEntries.find(entry => entry.entryName.toLowerCase().includes('docprops/thumbnail'));
    if (thumbnailEntry) {
      const extension = path.extname(thumbnailEntry.entryName) || '.jpg';
      const thumbnailFilename = `${baseFilename}${extension}`;
      const outputPath = path.join(outputDir, thumbnailFilename);
      await fs.writeFile(outputPath, thumbnailEntry.getData());
      return thumbnailFilename;
    }
    return null;
  } catch (err) { return null; }
};

// ... (Keep extractColor as is) ...
function extractColor(colorElement) {
  if (!colorElement || !colorElement[0]) return null;
  const srgbClr = colorElement[0]['a:srgbClr'];
  if (srgbClr && srgbClr[0]?.['$']?.val) return '#' + srgbClr[0]['$'].val;
  const sysClr = colorElement[0]['a:sysClr'];
  if (sysClr && sysClr[0]?.['$']?.lastClr) return '#' + sysClr[0]['$'].lastClr;
  return null;
}

// ... (Unified extractBackgroundColor) ...
function extractBackgroundColor(bgElement, themeColors = {}) {
  try {
    let props = bgElement['p:bgPr'];
    if (!props && bgElement['p:spPr']) props = bgElement['p:spPr'];
    
    if (!props) {
       const bgRef = bgElement['p:bgRef'];
       if (bgRef && bgRef[0]) {
         const schemeClr = bgRef[0]['a:schemeClr'];
         if (schemeClr && schemeClr[0]?.['$']?.val) return getSchemeColor(schemeClr[0]['$'].val, themeColors);
         const srgbClr = bgRef[0]['a:srgbClr'];
         if (srgbClr && srgbClr[0]?.['$']?.val) return '#' + srgbClr[0]['$'].val;
       }
       return null;
    }

    const prop = props[0];
    // 1. Solid fill
    const solidFill = prop['a:solidFill'];
    if (solidFill) {
      const srgbClr = solidFill[0]?.['a:srgbClr'];
      if (srgbClr && srgbClr[0]?.['$']?.val) return '#' + srgbClr[0]['$'].val;
      const schemeClr = solidFill[0]?.['a:schemeClr'];
      if (schemeClr && schemeClr[0]?.['$']?.val) return getSchemeColor(schemeClr[0]['$'].val, themeColors);
    }
    // 2. Gradient fill
    const gradFill = prop['a:gradFill'];
    if (gradFill) {
       const gsLst = gradFill[0]?.['a:gsLst'];
       if (gsLst && gsLst[0]?.['a:gs']) {
         const stops = gsLst[0]['a:gs'];
         const colors = stops.map(stop => {
           const srgbClr = stop?.['a:srgbClr'];
           if (srgbClr && srgbClr[0]?.['$']?.val) return '#' + srgbClr[0]['$'].val;
           const schemeClr = stop?.['a:schemeClr'];
           if (schemeClr && schemeClr[0]?.['$']?.val) return getSchemeColor(schemeClr[0]['$'].val, themeColors);
           return '#ffffff';
         });
         if (colors.length > 1) return `linear-gradient(135deg, ${colors.join(', ')})`;
         else if (colors.length === 1) return colors[0];
       }
    }
    // 3. Image/Texture Fill (Fallback)
    const blipFill = prop['a:blipFill'];
    if (blipFill) return themeColors.accent1 || '#D2B48C'; 

    return null;
  } catch (err) { return null; }
}

// ... (Helpers) ...
function extractTextColor(txBody) {
  try {
    const paragraphs = txBody['a:p'];
    if (!paragraphs || paragraphs.length === 0) return null;
    // Check each paragraph for color
    for (const para of paragraphs) {
      // 1. Check paragraph properties (a:pPr)
      const pPr = para['a:pPr']?.[0];
      if (pPr && pPr['a:solidFill']) {
        const solidFill = pPr['a:solidFill'];
        const srgbClr = solidFill[0]?.['a:srgbClr'];
        if (srgbClr && srgbClr[0]?.['$']?.val) return '#' + srgbClr[0]['$'].val;
        const schemeClr = solidFill[0]?.['a:schemeClr'];
        if (schemeClr && schemeClr[0]?.['$']?.val) return getSchemeColor(schemeClr[0]['$'].val);
      }
      // 2. Check runs (a:r)
      const runs = para['a:r'];
      if (runs && runs.length > 0) {
        for (const run of runs) {
          const rPr = run['a:rPr']?.[0];
          if (rPr && rPr['a:solidFill']) {
            const solidFill = rPr['a:solidFill'];
            const srgbClr = solidFill[0]?.['a:srgbClr'];
            if (srgbClr && srgbClr[0]?.['$']?.val) return '#' + srgbClr[0]['$'].val;
            const schemeClr = solidFill[0]?.['a:schemeClr'];
            if (schemeClr && schemeClr[0]?.['$']?.val) return getSchemeColor(schemeClr[0]['$'].val);
          }
        }
      }
    }
  } catch (e) { return null; }
  return null;
}

function getSchemeColor(colorName, themeColors = {}) {
  if (themeColors && themeColors[colorName]) return themeColors[colorName];
  const schemeColors = { 'dk1': '#000000', 'lt1': '#ffffff', 'dk2': '#44546a', 'lt2': '#e7e6e6', 'accent1': '#4472c4', 'accent2': '#ed7d31' };
  return schemeColors[colorName] || null;
}

function isColorDark(hexColor) {
  if (!hexColor || hexColor.length < 6) return false;
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}