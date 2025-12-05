// backend/services/conversionService.js
import { db } from "../config/firebaseAdmin.js";
import { Timestamp } from "firebase-admin/firestore";

/**
 * Helper function to get authUID from numeric userId
 * @param {string} numericUserId - Numeric user ID
 * @returns {Promise<string>} - Firebase authUID
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
      throw new Error(`User not found with numericId: ${numericUserId}`);
    }
    
    const userDoc = snapshot.docs[0];
    return userDoc.data().authUID || userDoc.id;
  } catch (err) {
    console.error('[Helper] Error getting authUID:', err);
    // Fallback to using the provided ID
    return String(numericUserId);
  }
};

/**
 * Save a conversion record to Firestore with S3 file information
 * This is separate from 'history' - conversions track the actual files in S3
 * 
 * @param {Object} conversionData - Conversion details
 * @param {string} conversionData.userId - User ID who created the conversion
 * @param {string} conversionData.fileName - Original file name
 * @param {string} conversionData.conversionType - Type of conversion (e.g., 'PDF-to-PPTs')
 * @param {string} conversionData.s3Url - Public S3 URL to the generated PPTX file
 * @param {string} conversionData.s3Key - S3 key for file management
 * @param {string} conversionData.s3Bucket - S3 bucket name
 * @param {number} conversionData.fileSize - Size of the generated file in bytes
 * @param {number} conversionData.slideCount - Number of slides in the presentation
 * @returns {Promise<Object>} - The created document with ID
 */
export const saveConversion = async (conversionData) => {
  try {
    const numericUserId = String(conversionData.userId || '');
    
    // Get authUID from numeric userId
    const authUID = conversionData.authUID || await getAuthUIDFromNumericId(numericUserId);
    
    const dataWithTimestamp = {
      ...conversionData,
      userId: numericUserId,
      authUID: authUID,
      status: "Completed",
      createdAt: Timestamp.now(),
      uploadedAt: Timestamp.now()
    };

    console.log(`[Conversions] Saving conversion to Firestore:`, {
      authUID: dataWithTimestamp.authUID,
      userId: dataWithTimestamp.userId,
      fileName: dataWithTimestamp.fileName,
      conversionType: dataWithTimestamp.conversionType,
      s3Key: dataWithTimestamp.s3Key
    });

    // Use nested structure: conversions/{authUID}/userconversions
    const userConversionsRef = db
      .collection('conversions')
      .doc(authUID)
      .collection('userconversions');
    
    const docRef = await userConversionsRef.add(dataWithTimestamp);

    console.log(`[Conversions] Successfully saved with ID: ${docRef.id}`);

    return { id: docRef.id, ...dataWithTimestamp };
  } catch (err) {
    console.error("[Conversions] Error saving conversion:", err);
    throw new Error("Failed to save conversion record.");
  }
};

/**
 * Get all conversions for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - List of conversions
 */
export const getConversions = async (userId, authUID = null) => {
  try {
    if (!userId && !authUID) {
      throw new Error("User ID or authUID is required");
    }

    // Get authUID if not provided
    const uid = authUID || await getAuthUIDFromNumericId(String(userId));
    
    // Query user-specific subcollection: conversions/{authUID}/userconversions
    const userConversionsRef = db
      .collection('conversions')
      .doc(uid)
      .collection('userconversions');
    
    const snapshot = await userConversionsRef
      .orderBy('uploadedAt', 'desc')
      .get();

    if (snapshot.empty) {
      return [];
    }

    const conversions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return conversions;
  } catch (err) {
    console.error("[Conversions] Error getting conversions:", err);
    throw new Error("Failed to retrieve conversions.");
  }
};

/**
 * Delete a conversion record from Firestore
 * Note: This does NOT delete the S3 file - handle that separately with s3Service
 * @param {string} id - Document ID
 * @param {string} userId - User ID for authorization
 * @returns {Promise<Object>}
 */
export const deleteConversion = async (id, userId, authUID = null) => {
  try {
    if (!id || (!userId && !authUID)) {
      throw new Error("ID and User ID/authUID are required");
    }

    // Get authUID if not provided
    const uid = authUID || await getAuthUIDFromNumericId(String(userId));

    // Access document in user-specific subcollection
    const docRef = db
      .collection('conversions')
      .doc(uid)
      .collection('userconversions')
      .doc(id);
    
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error("Conversion not found");
    }

    // Security check
    if (doc.data().userId !== userId) {
      throw new Error("User not authorized to delete this conversion");
    }

    const conversionData = doc.data();
    await docRef.delete();

    console.log(`[Conversions] Deleted conversion ${id}`);

    // Return the S3 key so the caller can also delete from S3
    return { 
      id: id, 
      message: "Successfully deleted",
      s3Key: conversionData.s3Key 
    };
  } catch (err) {
    console.error("[Conversions] Error deleting conversion:", err);
    throw new Error("Failed to delete conversion.");
  }
};

/**
 * Get a single conversion by ID
 * @param {string} id - Document ID
 * @param {string} userId - User ID for authorization (optional)
 * @returns {Promise<Object>}
 */
export const getConversionById = async (id, userId = null, authUID = null) => {
  try {
    if (!userId && !authUID) {
      throw new Error("User ID or authUID is required for nested structure");
    }
    
    // Get authUID if not provided
    const uid = authUID || await getAuthUIDFromNumericId(String(userId));
    
    // Access document in user-specific subcollection
    const docRef = db
      .collection('conversions')
      .doc(uid)
      .collection('userconversions')
      .doc(id);
    
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error("Conversion not found");
    }

    const data = doc.data();

    // Optional security check
    if (userId && data.userId !== userId) {
      throw new Error("User not authorized to access this conversion");
    }

    return { id: doc.id, ...data };
  } catch (err) {
    console.error("[Conversions] Error getting conversion:", err);
    throw new Error("Failed to retrieve conversion.");
  }
};

/**
 * Save AI-generated conversion to separate subcollection
 * Structure: conversions/{userId}/AI-generated/{docId}
 * @param {Object} conversionData - Conversion details
 * @returns {Promise<Object>} - The created document with ID
 */
export const saveAIGeneratedConversion = async (conversionData) => {
  try {
    const numericUserId = String(conversionData.userId || '');
    
    // Get authUID from numeric userId
    const authUID = conversionData.authUID || await getAuthUIDFromNumericId(numericUserId);
    
    const dataWithTimestamp = {
      ...conversionData,
      userId: numericUserId,
      authUID: authUID,
      status: "Completed",
      createdAt: Timestamp.now(),
      uploadedAt: Timestamp.now(),
      isAIGenerated: true
    };

    console.log(`[AI-Generated] Saving AI conversion to Firestore:`, {
      authUID: dataWithTimestamp.authUID,
      userId: dataWithTimestamp.userId,
      fileName: dataWithTimestamp.fileName,
      conversionType: dataWithTimestamp.conversionType
    });

    // Use nested structure: conversions/{authUID}/AI-generated
    const aiGeneratedRef = db
      .collection('conversions')
      .doc(authUID)
      .collection('AI-generated');
    
    const docRef = await aiGeneratedRef.add(dataWithTimestamp);

    console.log(`[AI-Generated] Successfully saved with ID: ${docRef.id}`);

    return { id: docRef.id, ...dataWithTimestamp };
  } catch (err) {
    console.error("[AI-Generated] Error saving conversion:", err);
    throw new Error("Failed to save AI-generated conversion.");
  }
};

/**
 * Get all AI-generated conversions for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - List of AI-generated conversions
 */
export const getAIGeneratedConversions = async (userId, authUID = null) => {
  try {
    if (!userId && !authUID) {
      throw new Error("User ID or authUID is required");
    }

    // Get authUID if not provided
    const uid = authUID || await getAuthUIDFromNumericId(String(userId));
    
    // Query AI-generated subcollection
    const aiGeneratedRef = db
      .collection('conversions')
      .doc(uid)
      .collection('AI-generated');
    
    const snapshot = await aiGeneratedRef
      .orderBy('uploadedAt', 'desc')
      .get();

    if (snapshot.empty) {
      return [];
    }

    const conversions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return conversions;
  } catch (err) {
    console.error("[AI-Generated] Error getting conversions:", err);
    throw new Error("Failed to retrieve AI-generated conversions.");
  }
};

/**
 * Delete an AI-generated conversion
 * @param {string} id - Document ID
 * @param {string} userId - User ID for authorization
 * @returns {Promise<Object>}
 */
export const deleteAIGeneratedConversion = async (id, userId, authUID = null) => {
  try {
    if (!id || (!userId && !authUID)) {
      throw new Error("ID and User ID/authUID are required");
    }

    // Get authUID if not provided
    const uid = authUID || await getAuthUIDFromNumericId(String(userId));

    const docRef = db
      .collection('conversions')
      .doc(uid)
      .collection('AI-generated')
      .doc(id);
    
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error("AI-generated conversion not found");
    }

    const conversionData = doc.data();
    await docRef.delete();

    console.log(`[AI-Generated] Deleted conversion ${id}`);

    return { 
      id: id, 
      message: "Successfully deleted",
      s3Key: conversionData.s3Key 
    };
  } catch (err) {
    console.error("[AI-Generated] Error deleting conversion:", err);
    throw new Error("Failed to delete AI-generated conversion.");
  }
};

