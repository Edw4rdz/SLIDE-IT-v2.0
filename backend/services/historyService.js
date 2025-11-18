import { db } from "../config/firebaseAdmin.js"; // Import our Firestore database
import { Timestamp } from "firebase-admin/firestore";

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
    
    // Add the new document to the 'history' collection
    const docRef = await historyCollection.add(dataWithTimestamp);
    
    return { id: docRef.id, ...dataWithTimestamp };
  } catch (err) {
    console.error("Error saving history:", err);
    throw new Error("Failed to save conversion history.");
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
 * Business Logic: Deletes a specific history item.
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
    
    // Delete the document
    await docRef.delete();
    
    return { id: id, message: "Successfully deleted" };
  } catch (err) {
    console.error("Error deleting history:", err);
    throw new Error("Failed to delete history item.");
  }
};