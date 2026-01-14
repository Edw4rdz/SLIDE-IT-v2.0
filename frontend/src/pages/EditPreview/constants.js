// EditPreview Constants

// Fallback placeholder image (base64 1x1 transparent PNG)
export const FALLBACK_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

// Point to pixel conversion
export const ptToPx = (pt) => +(pt * 96 / 72).toFixed(2);

export const BORDER_WIDTH_OPTIONS = [
  { label: '0.5 pt', value: ptToPx(0.5) },
  { label: '0.75 pt', value: ptToPx(0.75) },
  { label: '1 pt', value: ptToPx(1) },
  { label: '1.5 pt', value: ptToPx(1.5) },
  { label: '2.25 pt', value: ptToPx(2.25) },
];

export const BORDER_STYLE_OPTIONS = [
  { label: 'Solid', value: 'solid' },
  { label: 'Dashed', value: 'dashed' },
];

export const DEFAULT_BORDER_WIDTH = ptToPx(1);

// Override/fallback thumbnails for templates with broken or mismatched images
export const TEMPLATE_THUMB_OVERRIDES = {
  "Elegant Dark Business":
    "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=800&auto=format&fit=crop",
  "Futuristic Tech Couture":
    "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop",
  "Modern Corporate Blue":
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=800&auto=format&fit=crop",
};

// Slide dimensions (in inches for PPTX)
export const SLIDE_DIMENSIONS = {
  WIDTH: 10.0,
  HEIGHT: 5.625,
};

// Default design
export const DEFAULT_DESIGN = {
  font: "Arial",
  globalBackground: "#ffffff",
  globalTitleColor: "#000000",
  globalTextColor: "#333333",
  layouts: {
    title: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" },
    content: { background: "#ffffff", titleColor: "#000000", textColor: "#333333" }
  }
};

// Font options for dropdowns
export const FONT_OPTIONS = [
  'Arial',
  'Inter',
  'Poppins',
  'Roboto',
  'Montserrat',
  'Open Sans',
  'Lato',
  'Raleway',
  'Playfair Display',
  'Merriweather',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Impact',
  'Gill Sans',
  'Segoe UI',
  'Helvetica',
  'Garamond',
  'Comic Sans MS',
  'Lucida Console'
];
