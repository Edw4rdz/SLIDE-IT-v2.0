// Quick script to verify templates in Firestore have proper backgrounds
import { db } from "../config/firebaseAdmin.js";

async function checkTemplateBackgrounds() {
  console.log("Checking template backgrounds in Firestore...\n");
  
  const snapshot = await db.collection('templates').get();
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const design = data.design;
    
    console.log(`\n📄 ${data.name} (${doc.id})`);
    console.log(`   Category: ${data.category || 'N/A'}`);
    console.log(`   globalBackground: ${JSON.stringify(design?.globalBackground)}`);
    console.log(`   layouts.content.background: ${JSON.stringify(design?.layouts?.content?.background)}`);
    console.log(`   layouts.title.background: ${JSON.stringify(design?.layouts?.title?.background)}`);
  });
}

checkTemplateBackgrounds()
  .then(() => {
    console.log("\n✅ Check complete!");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
