import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MIME_TYPES } from "../constants/attachments.js";

/** @returns {string} an error message, or "" when the file may be uploaded. */
export function validateAttachment(file) {
  if (!ATTACHMENT_MIME_TYPES.includes(file.type)) return "Choose a PDF, JPEG, PNG, WebP, or GIF file.";
  if (file.size > ATTACHMENT_MAX_BYTES)
    return `Choose a file smaller than ${ATTACHMENT_MAX_BYTES / 1024 / 1024} MB.`;
  return "";
}
