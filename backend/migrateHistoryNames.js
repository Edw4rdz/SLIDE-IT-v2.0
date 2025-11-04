import { db } from "./config/firebaseAdmin.js"; //

//
// ----------------- !!! IMPORTANT !!! -----------------
//
// EDIT THIS MAP to match your new names exactly!
// The "key" (left side) is the OLD name in your database.
// The "value" (right side) is the NEW name you are using in your controllers.
//
// I am assuming your new names based on your last message.
// PLEASE DOUBLE-CHECK THESE.
//
const nameMap = {
  "pdftoppt": "PDF-to-PPTs",
  "wordtoppt": "DOCX/WORD-to-PPTs",   // (Verify this is your new name)
  "texttoppt": "TxT-to-PPTs",   // (Verify this is your new name)
  "exceltoppt": "Excel-to-PPTs",  // (Verify this in your new name)
  "ai-generator": "AI-Generated" // (Verify this is your new name)
};
//
// -----------------------------------------------------
//

async function migrateHistoryNames() {
  console.log("Starting history name migration...");

  const historyRef = db.collection("history");
  const batch = db.batch();
  let updatedCount = 0;

  try {
    const snapshot = await historyRef.get();
    
    if (snapshot.empty) {
      console.log("No history documents found.");
      return;
    }

    console.log(`Found ${snapshot.size} documents to check...`);

    snapshot.forEach(doc => {
      const data = doc.data();
      const oldType = data.conversionType;

      // 1. Check if this document has an old type that we need to map
      if (oldType && nameMap[oldType]) {
        
        // 2. Get the new name from our map
        const newType = nameMap[oldType];
        
        // 3. Add the update operation to the batch
        console.log(`Updating doc ${doc.id}: "${oldType}" -> "${newType}"`);
        const docRef = historyRef.doc(doc.id);
        batch.update(docRef, { conversionType: newType });
        
        updatedCount++;
      }
    });

    if (updatedCount === 0) {
      console.log("No documents needed migration. (Maybe they are all updated?)");
      return;
    }

    // 4. Commit all updates to the database
    await batch.commit();

    console.log(`
    -----------------------------------
    ✅ Name Migration complete!
    ✅ Successfully updated ${updatedCount} documents.
    -----------------------------------
    `);

  } catch (error) {
    console.error("Error during name migration:", error);
    console.log("⚠️ Migration failed. No data was changed.");
  }
}

// Run the migration
migrateHistoryNames();