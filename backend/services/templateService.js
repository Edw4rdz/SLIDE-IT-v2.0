// backend/services/templateService.js

// 1. Import the database connection from your admin config
import { db } from "../config/firebaseAdmin.js";
// 2. DELETE this line:
// import { PREBUILT_TEMPLATES } from "../data/prebuiltTemplates.js";

/**
 * Business Logic: Get the list of all prebuilt templates.
 * This function must now be "async" to wait for Firestore.
 */
export const getAllTemplates = async () => {
  const templatesRef = db.collection('templates');
  const snapshot = await templatesRef.get();

  if (snapshot.empty) {
    console.log('No templates found in Firestore.');
    return [];
  }

  const templates = [];
  snapshot.forEach(doc => {
    templates.push({
      id: doc.id, // Get the document ID
      ...doc.data() // Get the rest of the data (name, thumbnail, design)
    });
  });

  return templates;
};

/**
 * Business Logic: Find a single template and return its design details.
 * This function must also be "async".
 */
export const getTemplateDetailsById = async (id) => {
  const templateRef = db.collection('templates').doc(id);
  const doc = await templateRef.get();

  if (!doc.exists) {
    const error = new Error("Template not found");
    error.statusCode = 404;
    throw error;
  }

  const template = doc.data();

  // Return all the design details from the 'design' map
  return template.design;
};