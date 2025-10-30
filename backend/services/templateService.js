// backend/services/templateService.js
import { PREBUILT_TEMPLATES } from "../data/prebuiltTemplates.js";

/**
 * Business Logic: Get the list of all prebuilt templates.
 */
export const getAllTemplates = () => {
  return PREBUILT_TEMPLATES;
};

/**
 * Business Logic: Find a single template and return its design details.
 */
export const getTemplateDetailsById = (id) => {
  const template = PREBUILT_TEMPLATES.find((tpl) => tpl.id === id);

  if (!template) {
    const error = new Error("Template not found");
    error.statusCode = 404;
    throw error;
  }

  // Return all the design details
  return {
    link: template.link,
    background: template.background,
    titleColor: template.titleColor,
    textColor: template.textColor,
    font: template.font,
  };
};