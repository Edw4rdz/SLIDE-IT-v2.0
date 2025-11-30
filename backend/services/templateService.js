// backend/services/templateService.js

// 1. Import the database connection from your admin config
import { db } from "../config/firebaseAdmin.js";
// 2. DELETE this line:
// import { PREBUILT_TEMPLATES } from "../data/prebuiltTemplates.js";

/**
 * Business Logic: Get the list of all prebuilt templates.
 * This function must now be "async" to wait for Firestore.
 */
/**
 * Business Logic: Get the list of templates visible to the user.
 * Returns both global (pre-built) templates and the user's private uploads.
 */
export const getAllTemplates = async (userId) => {
  const templatesRef = db.collection('templates');
  const snapshot = await templatesRef.get();

  if (snapshot.empty) {
    console.log('No templates found in Firestore.');
    return [];
  }

  const templates = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    // Condition 1: Template is Pre-built / Public
    // We check for an explicit flag 'isPrebuilt' OR if there is no 'userId' assigned.
    const isPublic = data.isPrebuilt === true || !data.userId;
    // Condition 2: Template belongs to the requesting user
    const isOwner = userId && data.userId === userId;
    if (isPublic || isOwner) {
      templates.push({
        id: doc.id,
        ...data
      });
    }
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