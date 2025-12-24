import { db } from "../config/firebaseAdmin.js"; // Import our Firestore database
import { Timestamp } from "firebase-admin/firestore";
import { deleteFromS3 } from "./s3Service.js";

const historyCollection = db.collection('history');

/**
 * Business Logic: Saves a completed conversion to the database.
 */
export const saveHistory = async (historyData) => {
  try {
    // Add a server-side timestamp
    const dataWithTimestamp = {
      ...historyData,
      userId: String(historyData.userId || ''),
      status: "Completed",
      progress: 100,
      uploadedAt: Timestamp.now()
    };

    // If caller provided an id, update that document instead of creating a new one
    if (historyData.id) {
      const docRef = historyCollection.doc(historyData.id);
      await docRef.set(dataWithTimestamp, { merge: true });
      return { id: historyData.id, ...dataWithTimestamp };
    }

    // Add the new document to the 'history' collection
    const docRef = await historyCollection.add(dataWithTimestamp);
    return { id: docRef.id, ...dataWithTimestamp };
  } catch (err) {
    console.error("Error saving history:", err);
    throw new Error("Failed to save conversion history.");
  }
};

/**
 * Create a draft history entry used to show progress during generation.
 * Returns the new document id.
 */
export const createHistoryDraft = async (draftData) => {
  try {
    const data = {
      ...draftData,
      userId: String(draftData.userId || ''),
      status: draftData.status || 'In Progress',
      progress: typeof draftData.progress === 'number' ? draftData.progress : 0,
      uploadedAt: draftData.uploadedAt || null,
      createdAt: Timestamp.now()
    };
    const docRef = await historyCollection.add(data);
    return { id: docRef.id, ...data };
  } catch (err) {
    console.error('Error creating history draft:', err);
    throw new Error('Failed to create history draft');
  }
};

/**
 * Update progress/status/other fields on an existing history document.
 */
export const updateHistory = async (id, fields) => {
  try {
    if (!id) throw new Error('History id is required');
    const docRef = historyCollection.doc(id);
    await docRef.set({ ...fields, updatedAt: Timestamp.now() }, { merge: true });
    return { id, ...fields };
  } catch (err) {
    console.error('Error updating history:', err);
    throw new Error('Failed to update history');
  }
};

/**
 * Business Logic: Gets all history items for a specific user.
 */
export const getHistory = async (userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }
    const uid = String(userId);
    // Query the database for documents where userId matches
    const snapshot = await historyCollection
      .where('userId', '==', uid)
      .orderBy('uploadedAt', 'desc') // Show newest first
      .get();
      
    if (snapshot.empty) {
      return []; // Return an empty array if no history
    }
    
    // Map the documents to include their ID
    const historyList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return historyList;
  } catch (err) {
    console.error("Error getting history:", err);
    throw new Error("Failed to retrieve conversion history.");
  }
};

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

/**
 * Business Logic: Deletes a specific history item.
 * Also deletes the corresponding conversion from the conversions collection.
 */
export const deleteHistory = async (id, userId) => {
  try {
    if (!id || !userId) {
      throw new Error("ID and User ID are required");
    }
    
    const docRef = historyCollection.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error("Document not found");
    }

    // Security check: Make sure the user owns this document
    if (doc.data().userId !== userId) {
      throw new Error("User not authorized to delete this item");
    }
    
    const historyData = doc.data();
    
    // Delete the history document
    await docRef.delete();
    console.log(`[History] Deleted history item ${id}`);
    
    // Delete the corresponding conversion from conversions collection
    try {
      const authUID = await getAuthUIDFromNumericId(String(userId));
      if (authUID) {
        // Determine if it's AI-generated or user conversion
        const isAIGenerated = historyData.conversionType === 'AI-Generated PPTs';
        const subcollection = isAIGenerated ? 'AI-generated' : 'userconversions';
        
        // Query the conversions subcollection to find matching conversion
        const conversionsRef = db
          .collection('conversions')
          .doc(authUID)
          .collection(subcollection);
        
        // Find conversion by matching fileName
        const conversionSnapshot = await conversionsRef
          .where('originalFileName', '==', historyData.fileName)
          .where('userId', '==', String(userId))
          .limit(1)
          .get();
        
        if (!conversionSnapshot.empty) {
          const conversionDoc = conversionSnapshot.docs[0];
          const conversionData = conversionDoc.data();
          
          // Delete from S3 first if s3Key exists
          if (conversionData.s3Key) {
            try {
              await deleteFromS3(conversionData.s3Key);
              console.log(`[History] Deleted S3 file: ${conversionData.s3Key}`);
            } catch (s3Error) {
              console.error('[History] Error deleting S3 file:', s3Error);
            }
          }
          
          // Delete image files from S3 if they exist in slides
          if (historyData.slides && Array.isArray(historyData.slides)) {
            for (const slide of historyData.slides) {
              if (slide.uploadedImageKey) {
                try {
                  await deleteFromS3(slide.uploadedImageKey);
                  console.log(`[History] Deleted S3 image: ${slide.uploadedImageKey}`);
                } catch (imgError) {
                  console.error('[History] Error deleting S3 image:', imgError);
                }
              }
            }
          }
          
          // Delete the conversion document
          await conversionDoc.ref.delete();
          console.log(`[History] Deleted conversion ${conversionDoc.id} from ${subcollection}`);
        } else {
          console.log(`[History] No matching conversion found in ${subcollection} for fileName: ${historyData.fileName}`);
        }
      }
    } catch (convError) {
      // Log the error but don't fail the history deletion
      console.error('[History] Error deleting corresponding conversion:', convError);
    }
    
    return { id: id, message: "Successfully deleted" };
  } catch (err) {
    console.error("Error deleting history:", err);
    throw new Error("Failed to delete history item.");
  }
};