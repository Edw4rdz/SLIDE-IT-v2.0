// Script to update template content backgrounds to use gradients
import { db } from "../config/firebaseAdmin.js";

const TEMPLATE_UPDATES = [
  // Academic templates - most should have gradient content backgrounds
  {
    id: "tpl-academic-01",
    name: "Classic University Blue",
    contentBackground: ["#E3F2FD", "#BBDEFB", "#90CAF9"], // Light blue gradient for readability
  },

  {
    id: "tpl-academic-04",
    name: "Student Friendly Pastel",
    contentBackground: ["#FFE4E1", "#FFF0F5", "#FFE4F1"],
  },
  {
    id: "tpl-academic-05",
    name: "Modern Campus Green",
    contentBackground: ["#E8F5E9", "#C8E6C9", "#A5D6A7"],
  },

  // Office templates - professional look
  {
    id: "tpl-office-01",
    name: "Corporate Blue Professional",
    contentBackground: ["#E3F2FD", "#BBDEFB", "#90CAF9"],
  },
  {
    id: "tpl-office-02",
    name: "Executive Gray Suite",
    contentBackground: ["#ECEFF1", "#CFD8DC", "#B0BEC5"],
  },
  {
    id: "tpl-office-03",
    name: "Finance Green Report",
    contentBackground: ["#E8F5E9", "#C8E6C9", "#A5D6A7"],
  },
  {
    id: "tpl-office-04",
    name: "Modern Startup Orange",
    contentBackground: ["#FFF3E0", "#FFE0B2", "#FFCC80"],
  },
  {
    id: "tpl-office-05",
    name: "Professional Navy Boardroom",
    contentBackground: ["#E3F2FD", "#BBDEFB", "#90CAF9"],
  },
  // tpl-office-06 is minimalist white
  {
    id: "tpl-office-07",
    name: "Tech Company Purple",
    contentBackground: ["#F3E5F5", "#E1BEE7", "#CE93D8"],
  },

  // Update existing templates too
  {
    id: "tpl-nature-01",
    name: "Organic Nature Presentation",
    contentBackground: ["#E8F5E9", "#C8E6C9", "#A5D6A7"],
  },
  {
    id: "tpl-corporate-01",
    name: "Modern Corporate Blue",
    contentBackground: ["#E3F2FD", "#BBDEFB", "#90CAF9"],
  },
];

async function updateTemplateBackgrounds() {
  console.log("Updating template content backgrounds...\n");
  
  const batch = db.batch();
  let updatedCount = 0;

  for (const update of TEMPLATE_UPDATES) {
    const templateRef = db.collection('templates').doc(update.id);
    
    const doc = await templateRef.get();
    
    if (!doc.exists) {
      console.log(`⚠️  Template "${update.name}" (${update.id}) not found - skipping`);
      continue;
    }

    const currentData = doc.data();
    const updatedDesign = {
      ...currentData.design,
      layouts: {
        ...currentData.design.layouts,
        content: {
          ...currentData.design.layouts.content,
          background: update.contentBackground
        }
      }
    };

    batch.update(templateRef, { design: updatedDesign });
    console.log(`✅ Updating "${update.name}" (${update.id})`);
    console.log(`   New content background: ${JSON.stringify(update.contentBackground)}`);
    updatedCount++;
  }

  if (updatedCount > 0) {
    await batch.commit();
    console.log(`\n🎉 Successfully updated ${updatedCount} templates!`);
  } else {
    console.log("\n⚠️  No templates were updated.");
  }
}

updateTemplateBackgrounds()
  .then(() => {
    console.log("\n✨ Template update completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error updating templates:", error);
    process.exit(1);
  });
