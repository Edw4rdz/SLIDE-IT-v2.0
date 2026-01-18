// Old: conversions/{docId} with userId field
// New: conversions/{authUID}/userconversions/{docId} OR conversions/{authUID}/AI-generated/{docId}

import { db } from "../config/firebaseAdmin.js";

/**
 * Helper function to get authUID from numeric userId
 */
const getAuthUIDFromNumericId = async (numericUserId) => {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('numericId', '==', String(numericUserId)).limit(1).get();
    
    if (snapshot.empty) {
      // Fallback: check if the userId itself is an authUID
      const directDoc = await usersRef.doc(String(numericUserId)).get();
      if (directDoc.exists) {
        return String(numericUserId);
      }
      console.warn(`⚠️  User not found with numericId: ${numericUserId}`);
      return null;
    }
    
    const userDoc = snapshot.docs[0];
    return userDoc.data().authUID || userDoc.id;
  } catch (err) {
    console.error('[Helper] Error getting authUID:', err);
    return null;
  }
};

const migrateConversions = async () => {
  try {
    console.log("🔄 Starting conversion migration...\n");

    // Get all documents from old flat 'conversions' collection
    const oldConversionsRef = db.collection('conversions');
    const snapshot = await oldConversionsRef.get();

    if (snapshot.empty) {
      console.log("✅ No conversions to migrate. Collection is already clean.");
      return;
    }

    console.log(`📦 Found ${snapshot.size} conversions to migrate\n`);

    let migratedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each document
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docId = doc.id;
      const numericUserId = data.userId;

      if (!numericUserId) {
        console.log(`⚠️  Skipping document ${docId} - No userId found`);
        errorCount++;
        errors.push({ docId, reason: 'No userId' });
        continue;
      }

      try {
        console.log(`📝 Migrating ${docId} for user ${numericUserId}...`);

        // Get authUID from numeric userId
        const authUID = await getAuthUIDFromNumericId(numericUserId);
        
        if (!authUID) {
          console.log(`⚠️  Skipping document ${docId} - Could not find authUID for userId ${numericUserId}`);
          errorCount++;
          errors.push({ docId, userId: numericUserId, reason: 'authUID not found' });
          continue;
        }

        // Determine if this is AI-generated
        const isAIGenerated = data.conversionType === 'AI-Generated PPTs' || data.isAIGenerated === true;
        const subcollection = isAIGenerated ? 'AI-generated' : 'userconversions';

        // Add authUID to data
        const updatedData = {
          ...data,
          authUID: authUID
        };

        // Create document in new nested structure using authUID
        const newDocRef = db
          .collection('conversions')
          .doc(authUID)
          .collection(subcollection)
          .doc(docId); // Keep the same document ID

        // Copy all data to new location
        await newDocRef.set(updatedData);

        // Optional: Delete from old location
        // await doc.ref.delete();

        migratedCount++;
        console.log(`✅ Migrated to conversions/${authUID}/${subcollection}/${docId}`);

      } catch (error) {
        console.error(`❌ Error migrating ${docId}:`, error.message);
        errorCount++;
        errors.push({ docId, userId, reason: error.message });
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Successfully migrated: ${migratedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📦 Total processed: ${snapshot.size}`);

    if (errors.length > 0) {
      console.log("\n⚠️  Errors encountered:");
      errors.forEach(err => {
        console.log(`   - Document ${err.docId}: ${err.reason}`);
      });
    }

    console.log("\n⚠️  IMPORTANT: Old documents are still in the flat collection.");
    console.log("   Review the migrated data, then uncomment the delete line in this script");
    console.log("   to clean up the old structure.\n");

  } catch (error) {
    console.error("💥 Migration failed:", error);
    throw error;
  }
};

// Run the migration
migrateConversions()
  .then(() => {
    console.log("✅ Migration complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  });
