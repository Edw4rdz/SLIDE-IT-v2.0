// src/prebuilttemplates.js
export const PREBUILT_TEMPLATES = [
  {
    id: "tpl-tech-01",
    name: "Futuristic Tech Couture",
    thumbnail:
      "https://media.slidesgo.com/storage/76624478/conversions/0-futuristic-background-thumb.jpg",
    link: "https://docs.google.com/presentation/d/1FuturisticTechDemo/copy",
    slides: [
      /* ... slide content ... */
    ],
    design: {
      font: "Roboto",
      // ✅ CHANGED to an array
      globalBackground: ["#0A1F44", "#092F6B", "#005E90"], 
      globalTitleColor: "#00E6FF",
      globalTextColor: "#E5E5E5",
      layouts: {
        title: {
          // ✅ CHANGED to an array
          background: ["#0A1F44", "#092F6B", "#005E90"],
          titleColor: "#00E6FF",
          textColor: "#E5E5E5",
        },
        content: {
          // ✅ CHANGED to an array
          background: ["#0A1F44", "#092F6B", "#005E90"],
          titleColor: "#00E6FF",
          textColor: "#E5E5E5",
        },
      },
    },
  },
  {
    id: "tpl-business-01",
    name: "Elegant Dark Business",
    thumbnail:
      "https://media.slidesgo.com/storage/5068851/conversions/0-dark-elegance-thumb.jpg",
    link: "https://docs.google.com/presentation/d/1ElegantDarkBusiness/copy",
    slides: [
      /* ... slide content ... */
    ],
    design: {
      font: "Lato",
      // ✅ CHANGED to an array
      globalBackground: ["#0D0D0D", "#1A1A1A", "#3E2C00"],
      globalTitleColor: "#FFD700",
      globalTextColor: "#CCCCCC",
      layouts: {
        title: {
          // ✅ CHANGED to an array
          background: ["#0D0D0D", "#1A1A1A", "#3E2C00"],
          titleColor: "#FFD700",
          textColor: "#CCCCCC",
        },
        content: {
          // ✅ CHANGED to an array
          background: ["#0D0D0D", "#1A1A1A", "#3E2C00"],
          titleColor: "#FFD700",
          textColor: "#CCCCCC",
        },
      },
    },
  },
  {
    id: "tpl-creative-01",
    name: "Creative Gradient Splash",
    thumbnail:
      "https://png.pngtree.com/background/20250103/original/pngtree-vibrant-gradient-iridescent-colors-abstract-blur-shapes-transition-texture-for-eye-picture-image_15299202.jpg",
    link: "https://docs.google.com/presentation/d/1CreativeGradientSplash/copy",
    slides: [
      /* ... slide content ... */
    ],
    design: {
      font: "Montserrat",
      // ✅ CHANGED to an array
      globalBackground: ["#FF6A5E", "#D8458B", "#5E2BB8"],
      globalTitleColor: "#FFFFFF",
      globalTextColor: "#F0F0F0",
      layouts: {
        title: {
          // ✅ CHANGED to an array
          background: ["#FF6A5E", "#D8458B", "#5E2BB8"],
          titleColor: "#FFFFFF",
          textColor: "#F0F0F0",
        },
        content: {
          // ✅ CHANGED to an array
          background: ["#FF6A5E", "#D8458B", "#5E2BB8"],
          titleColor: "#FFFFFF",
          textColor: "#F0F0F0",
        },
      },
    },
  },
  {
    id: "tpl-minimal-01",
    name: "Minimalist White Space",
    thumbnail:
      "https://www.slidescarnival.com/wp-content/uploads/Minimalist-White-Slides-1.jpg",
    link: "https://docs.google.com/presentation/d/1MinimalistWhiteSpace/copy",
    slides: [
      /* ... slide content ... */
    ],
    design: {
      font: "Helvetica Neue",
      // ✅ CHANGED to an array
      globalBackground: ["#FFFFFF", "#F8F8F8", "#ECECEC"],
      globalTitleColor: "#222222",
      globalTextColor: "#555555",
      layouts: {
        title: {
          // ✅ CHANGED to an array
          background: ["#FFFFFF", "#F8F8F8", "#ECECEC"],
          titleColor: "#222222",
          textColor: "#555555",
        },
        content: {
          // ✅ CHANGED to an array
          background: ["#FFFFFF", "#F8F8F8", "#ECECEC"],
          titleColor: "#222222",
          textColor: "#555555",
        },
      },
    },
  },
  {
    id: "tpl-nature-01",
    name: "Organic Nature Presentation",
    thumbnail:
      "https://www.slidekit.com/wp-content/uploads/2024/09/Free-Forest-PowerPoint-Template-For-Nature-and-Eco-Friendly-Presentations.jpg",
    link: "https://docs.google.com/presentation/d/1OrganicNatureTemplate/copy",
    slides: [
      /* ... slide content ... */
    ],
    design: {
      font: "Merriweather",
      // ✅ CHANGED to an array
      globalBackground: ["#A8E063", "#56AB2F", "#235E3B"],
      globalTitleColor: "#235E3B",
      globalTextColor: "#3E4E48",
      layouts: {
        title: {
          // ✅ CHANGED to an array
          background: ["#A8E063", "#56AB2F", "#235E3B"],
          titleColor: "#FFFFFF", 
          textColor: "#F0F0F0",
        },
        content: {
          // ✅ This is a solid color, so it STAYS A STRING
          background: "#FFFFFF", 
          titleColor: "#235E3B",
          textColor: "#3E4E48",
        },
      },
    },
  },
];