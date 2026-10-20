import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MIME_TYPES } from "../constants.js";

/**
 * Client-side validation helpers. They improve UX only: the backend must
 * validate every field again.
 */
export const PHONE_PATTERN = "\\+?[0-9\\s-]{8,18}";

const PHONE_REGEX = new RegExp(`^${PHONE_PATTERN}$`);

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

export const isValidPhone = (value = "") => PHONE_REGEX.test(value.trim());

export const isValidEmail = (value = "") => EMAIL_REGEX.test(value.trim());

/**
 * Validates the patient fields of an appointment request.
 * @returns {Record<string, string>} field -> message (empty when valid)
 */
export function validateAppointmentDetails({ patientName, phone, email, reason }) {
  const errors = {};
  if (!patientName?.trim() || patientName.trim().length < 2)
    errors.patientName = "Enter the patient's full name.";
  if (!isValidPhone(phone ?? "")) errors.phone = "Enter a valid phone number (8–18 digits).";
  if (!isValidEmail(email ?? "")) errors.email = "Enter a valid email address.";
  if (!reason?.trim() || reason.trim().length < 5)
    errors.reason = "Add a short reason for the visit (at least 5 characters).";
  return errors;
}

/** @returns {string} an error message, or "" when the file may be uploaded. */
export function validateAttachment(file) {
  if (!ATTACHMENT_MIME_TYPES.includes(file.type)) return "Choose a PDF, JPEG, PNG, WebP, or GIF file.";
  if (file.size > ATTACHMENT_MAX_BYTES)
    return `Choose a file smaller than ${ATTACHMENT_MAX_BYTES / 1024 / 1024} MB.`;
  return "";
}
