// src/prebuilttemplates.js
export const PREBUILT_TEMPLATES = [
  {
    id: "tpl-tech-01",
    name: "Futuristic Tech Couture",
    thumbnail:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop",
    link: "https://docs.google.com/presentation/d/1FuturisticTechDemo/copy",
    slides: [
    ],
    design: {
      font: "Roboto",
      globalBackground: ["#0A1F44", "#092F6B", "#005E90"], 
      globalTitleColor: "#00E6FF",
      globalTextColor: "#E5E5E5",
      layouts: {
        title: {
          background: ["#0A1F44", "#092F6B", "#005E90"],
          titleColor: "#00E6FF",
          textColor: "#E5E5E5",
        },
        content: {
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
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=800&auto=format&fit=crop",
    link: "https://docs.google.com/presentation/d/1ElegantDarkBusiness/copy",
    slides: [
    ],
    design: {
      font: "Lato",
      globalBackground: ["#0D0D0D", "#1A1A1A", "#3E2C00"],
      globalTitleColor: "#FFD700",
      globalTextColor: "#E5E5E5",
      layouts: {
        title: {
          background: ["#0D0D0D", "#1A1A1A", "#3E2C00"],
          titleColor: "#FFD700",
          textColor: "#E5E5E5",
        },
        content: {
          background: ["#0D0D0D", "#1A1A1A", "#3E2C00"],
          titleColor: "#FFD700",
          textColor: "#E5E5E5",
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
    ],
    design: {
      font: "Montserrat",
      globalBackground: ["#FF6A5E", "#D8458B", "#5E2BB8"],
      globalTitleColor: "#FFFFFF",
      globalTextColor: "#F0F0F0",
      layouts: {
        title: {
          background: ["#FF6A5E", "#D8458B", "#5E2BB8"],
          titleColor: "#FFFFFF",
          textColor: "#F0F0F0",
        },
        content: {
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
    ],
    design: {
      font: "Helvetica Neue",
      globalBackground: ["#FFFFFF", "#F8F8F8", "#ECECEC"],
      globalTitleColor: "#222222",
      globalTextColor: "#555555",
      layouts: {
        title: {
          background: ["#FFFFFF", "#F8F8F8", "#ECECEC"],
          titleColor: "#222222",
          textColor: "#555555",
        },
        content: {
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

  // ============ ACADEMIC / SCHOOL TEMPLATES ============
  {
    id: "tpl-academic-01",
    name: "Classic University Blue",
    thumbnail: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop",
    category: "academic",
    design: {
      font: "Georgia",
      globalBackground: ["#003366", "#004080", "#0066CC"],
      globalTitleColor: "#FFFFFF",
      globalTextColor: "#F5F5F5",
      layouts: {
        title: {
          background: ["#003366", "#004080", "#0066CC"],
          titleColor: "#FFFFFF",
          textColor: "#F5F5F5",
        },
        content: {
          background: ["#E3F2FD", "#BBDEFB", "#90CAF9"],
          titleColor: "#003366",
          textColor: "#333333",
        },
      },
    },
  },
  {
    id: "tpl-academic-02",
    name: "Education Chalkboard",
    thumbnail: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=800&auto=format&fit=crop",
    category: "academic",
    design: {
      font: "Courier New",
      globalBackground: ["#2C3E2C", "#3E5E3E", "#1A2A1A"],
      globalTitleColor: "#FFFFFF",
      globalTextColor: "#E8F5E8",
      layouts: {
        title: {
          background: ["#2C3E2C", "#3E5E3E", "#1A2A1A"],
          titleColor: "#FFEB3B",
          textColor: "#FFFFFF",
        },
        content: {
          background: ["#2C3E2C", "#3E5E3E", "#1A2A1A"],
          titleColor: "#FFEB3B",
          textColor: "#E8F5E8",
        },
      },
    },
  },
  {
    id: "tpl-academic-03",
    name: "Scientific Research",
    thumbnail: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=800&auto=format&fit=crop",
    category: "academic",
    design: {
      font: "Times New Roman",
      globalBackground: "#FFFFFF",
      globalTitleColor: "#1A237E",
      globalTextColor: "#424242",
      layouts: {
        title: {
          background: ["#E8EAF6", "#C5CAE9", "#9FA8DA"],
          titleColor: "#1A237E",
          textColor: "#424242",
        },
        content: {
          background: "#FFFFFF",
          titleColor: "#1A237E",
          textColor: "#424242",
        },
      },
    },
  },
  {
    id: "tpl-academic-04",
    name: "Student Friendly Pastel",
    thumbnail: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop",
    category: "academic",
    design: {
      font: "Comic Sans MS",
      globalBackground: ["#FFE4E1", "#FFF0F5", "#FFE4F1"],
      globalTitleColor: "#D81B60",
      globalTextColor: "#4A4A4A",
      layouts: {
        title: {
          background: ["#FFE4E1", "#FFF0F5", "#FFE4F1"],
          titleColor: "#D81B60",
          textColor: "#4A4A4A",
        },
        content: {
          background: ["#FFE4E1", "#FFF0F5", "#FFE4F1"],
          titleColor: "#D81B60",
          textColor: "#4A4A4A",
        },
      },
    },
  },
  {
    id: "tpl-academic-05",
    name: "Modern Campus Green",
    thumbnail: "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=800&auto=format&fit=crop",
    category: "academic",
    design: {
      font: "Arial",
      globalBackground: ["#1B5E20", "#2E7D32", "#388E3C"],
      globalTitleColor: "#FFFFFF",
      globalTextColor: "#E8F5E9",
      layouts: {
        title: {
          background: ["#1B5E20", "#2E7D32", "#388E3C"],
          titleColor: "#FFFFFF",
          textColor: "#E8F5E9",
        },
        content: {
          background: ["#E8F5E9", "#C8E6C9", "#A5D6A7"],
          titleColor: "#1B5E20",
          textColor: "#333333",
        },
      },
    },
  },

  // ============ OFFICE / CORPORATE TEMPLATES ============
  {
    id: "tpl-office-01",
    name: "Corporate Blue Professional",
    thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop",
    category: "office",
    design: {
      font: "Calibri",
      globalBackground: ["#1565C0", "#1976D2", "#1E88E5"],
      globalTitleColor: "#FFFFFF",
      globalTextColor: "#F5F5F5",
      layouts: {
        title: {
          background: ["#1565C0", "#1976D2", "#1E88E5"],
          titleColor: "#FFFFFF",
          textColor: "#F5F5F5",
        },
        content: {
          background: ["#E3F2FD", "#BBDEFB", "#90CAF9"],
          titleColor: "#1565C0",
          textColor: "#424242",
        },
      },
    },
  },
  {
    id: "tpl-office-02",
    name: "Executive Gray Suite",
    thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop",
    category: "office",
    design: {
      font: "Arial",
      globalBackground: ["#37474F", "#455A64", "#546E7A"],
      globalTitleColor: "#FFFFFF",
      globalTextColor: "#ECEFF1",
      layouts: {
        title: {
          background: ["#37474F", "#455A64", "#546E7A"],
          titleColor: "#FFFFFF",
          textColor: "#ECEFF1",
        },
        content: {
          background: ["#ECEFF1", "#CFD8DC", "#B0BEC5"],
          titleColor: "#37474F",
          textColor: "#424242",
        },
      },
    },
  },
  {
    id: "tpl-office-03",
    name: "Finance Green Report",
    thumbnail: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800&auto=format&fit=crop",
    category: "office",
    design: {
      font: "Verdana",
      globalBackground: ["#1B5E20", "#388E3C", "#4CAF50"],
      globalTitleColor: "#FFFFFF",
      globalTextColor: "#E8F5E9",
      layouts: {
        title: {
          background: ["#1B5E20", "#388E3C", "#4CAF50"],
          titleColor: "#FFFFFF",
          textColor: "#E8F5E9",
        },
        content: {
          background: ["#E8F5E9", "#C8E6C9", "#A5D6A7"],
          titleColor: "#1B5E20",
          textColor: "#212121",
        },
      },
    },
  },
  {
    id: "tpl-office-04",
    name: "Modern Startup Orange",
    thumbnail: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800&auto=format&fit=crop",
    category: "office",
    design: {
      font: "Poppins",
      globalBackground: ["#E65100", "#F57C00", "#FF9800"],
      globalTitleColor: "#FFFFFF",
      globalTextColor: "#FFF3E0",
      layouts: {
        title: {
          background: ["#E65100", "#F57C00", "#FF9800"],
          titleColor: "#FFFFFF",
          textColor: "#FFF3E0",
        },
        content: {
          background: ["#FFF3E0", "#FFE0B2", "#FFCC80"],
          titleColor: "#E65100",
          textColor: "#424242",
        },
      },
    },
  },
  {
    id: "tpl-office-05",
    name: "Professional Navy Boardroom",
    thumbnail: "https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=800&auto=format&fit=crop",
    category: "office",
    design: {
      font: "Calibri",
      globalBackground: ["#0D47A1", "#1565C0", "#1976D2"],
      globalTitleColor: "#FFFFFF",
      globalTextColor: "#E3F2FD",
      layouts: {
        title: {
          background: ["#0D47A1", "#1565C0", "#1976D2"],
          titleColor: "#FFFFFF",
          textColor: "#E3F2FD",
        },
        content: {
          background: ["#E3F2FD", "#BBDEFB", "#90CAF9"],
          titleColor: "#0D47A1",
          textColor: "#263238",
        },
      },
    },
  },
  {
    id: "tpl-office-06",
    name: "Clean Minimalist White",
    thumbnail: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=800&auto=format&fit=crop",
    category: "office",
    design: {
      font: "Helvetica Neue",
      globalBackground: "#FFFFFF",
      globalTitleColor: "#212121",
      globalTextColor: "#424242",
      layouts: {
        title: {
          background: ["#F5F5F5", "#EEEEEE", "#E0E0E0"],
          titleColor: "#212121",
          textColor: "#424242",
        },
        content: {
          background: "#FFFFFF",
          titleColor: "#212121",
          textColor: "#424242",
        },
      },
    },
  },
  {
    id: "tpl-office-07",
    name: "Tech Company Purple",
    thumbnail: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=800&auto=format&fit=crop",
    category: "office",
    design: {
      font: "Roboto",
      globalBackground: ["#4A148C", "#6A1B9A", "#7B1FA2"],
      globalTitleColor: "#FFFFFF",
      globalTextColor: "#F3E5F5",
      layouts: {
        title: {
          background: ["#4A148C", "#6A1B9A", "#7B1FA2"],
          titleColor: "#FFFFFF",
          textColor: "#F3E5F5",
        },
        content: {
          background: ["#F3E5F5", "#E1BEE7", "#CE93D8"],
          titleColor: "#4A148C",
          textColor: "#424242",
        },
      },
    },
  },
];