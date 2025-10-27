import { PREBUILT_TEMPLATES } from "../data/prebuiltTemplates.js";

/**
 * Business Logic: Get the list of all prebuilt templates.
 */
export const getAllTemplates = () => {
  // This imports the list from your new 'data' file
  return PREBUILT_TEMPLATES;
};

/**
 * Business Logic: Find a single template and return its edit link.
 */
export const getTemplateLinkById = (id) => {
  // This logic was moved from your old route file
  const template = PREBUILT_TEMPLATES.find((tpl) => tpl.id === id);

  if (!template) {
    const error = new Error("Template not found");
    error.statusCode = 404; // Set a status code for the controller
    throw error;
  }

  return `https://docs.google.com/presentation/d/${id}/edit`;
};