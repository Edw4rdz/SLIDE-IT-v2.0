// backend/services/conversionService.js
import { db } from "../config/firebaseAdmin.js";
import { Timestamp } from "firebase-admin/firestore";

const conversionsCollection = db.collection('conversions');

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
    const dataWithTimestamp = {
      ...conversionData,
      userId: String(conversionData.userId || ''),
      userIdNumeric: String(conversionData.userId || ''), // Added for easier identification
      status: "Completed",
      createdAt: Timestamp.now(),
      uploadedAt: Timestamp.now()
    };

    console.log(`[Conversions] Saving conversion to Firestore:`, {
      userId: dataWithTimestamp.userId,
      userIdNumeric: dataWithTimestamp.userIdNumeric,
      fileName: dataWithTimestamp.fileName,
      conversionType: dataWithTimestamp.conversionType,
      s3Key: dataWithTimestamp.s3Key
    });

    const docRef = await conversionsCollection.add(dataWithTimestamp);

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
export const getConversions = async (userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const uid = String(userId);
    const snapshot = await conversionsCollection
      .where('userId', '==', uid)
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
export const deleteConversion = async (id, userId) => {
  try {
    if (!id || !userId) {
      throw new Error("ID and User ID are required");
    }

    const docRef = conversionsCollection.doc(id);
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
export const getConversionById = async (id, userId = null) => {
  try {
    const docRef = conversionsCollection.doc(id);
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
