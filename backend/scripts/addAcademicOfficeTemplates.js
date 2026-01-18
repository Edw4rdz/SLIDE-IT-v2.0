import { db } from "../config/firebaseAdmin.js";

const ACADEMIC_OFFICE_TEMPLATES = [
  // ============ ACADEMIC / SCHOOL TEMPLATES ============
  {
    id: "tpl-academic-01",
    name: "Classic University Blue",
    thumbnail: "https://www.shutterstock.com/image-illustration/blue-silver-premium-background-creative-600nw-2645329981.jpg",
    category: "academic",
    isPrebuilt: true,
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
          background: "#FFFFFF",
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
    isPrebuilt: true,
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
    isPrebuilt: true,
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
    isPrebuilt: true,
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
          background: "#FFFEF7",
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
    isPrebuilt: true,
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
          background: "#FFFFFF",
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
    isPrebuilt: true,
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
          background: "#FFFFFF",
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
    isPrebuilt: true,
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
          background: "#FAFAFA",
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
    isPrebuilt: true,
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
          background: "#FFFFFF",
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
    isPrebuilt: true,
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
          background: "#FFFFFF",
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
    isPrebuilt: true,
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
          background: "#FFFFFF",
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
    isPrebuilt: true,
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
    isPrebuilt: true,
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
          background: "#FFFFFF",
          titleColor: "#4A148C",
          textColor: "#424242",
        },
      },
    },
  },
];

async function addTemplatesToFirestore() {
  console.log("Starting to add Academic and Office templates to Firestore...\n");
  
  const batch = db.batch();
  let addedCount = 0;
  let skippedCount = 0;

  for (const template of ACADEMIC_OFFICE_TEMPLATES) {
    const templateRef = db.collection('templates').doc(template.id);
    
    // Check if template already exists
    const doc = await templateRef.get();
    
    if (doc.exists) {
      console.log(`⏭️  Skipping "${template.name}" (${template.id}) - already exists`);
      skippedCount++;
    } else {
      batch.set(templateRef, template);
      console.log(`✅ Adding "${template.name}" (${template.id}) - ${template.category}`);
      addedCount++;
    }
  }

  if (addedCount > 0) {
    await batch.commit();
    console.log(`\n🎉 Successfully added ${addedCount} new templates to Firestore!`);
  }
  
  if (skippedCount > 0) {
    console.log(`⏭️  Skipped ${skippedCount} existing templates`);
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   - Academic templates: 5`);
  console.log(`   - Office templates: 7`);
  console.log(`   - Total new templates: ${addedCount}`);
  console.log(`   - Total in system: ${addedCount + skippedCount}`);
}

// Run the script
addTemplatesToFirestore()
  .then(() => {
    console.log("\n✨ Template migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error adding templates:", error);
    process.exit(1);
  });
