import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MIME_TYPES } from "./constants.js";

// ─── date ──────────────────────────────────────────────────────────────────────────────────

/** Local calendar date as YYYY-MM-DD (never UTC, to avoid off-by-one days). */
export const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Parses a YYYY-MM-DD key at local noon so DST shifts cannot change the day. */
export const parseDateKey = (key) => new Date(`${key}T12:00:00`);

/** "5:30 PM" -> minutes since midnight (1050). */
export function clockLabelToMinutes(label) {
  const [clock, meridiem] = label.split(" ");
  const [hours, minutes] = clock.split(":").map(Number);
  return ((hours % 12) + (meridiem === "PM" ? 12 : 0)) * 60 + minutes;
}

// ─── format ────────────────────────────────────────────────────────────────────────────────

/** Formats a consultation fee in Bangladeshi taka. */
export const formatFee = (amount) => `৳${Number(amount ?? 0).toLocaleString()}`;

/** "Dr. Arif Rahman" -> "AR". */
export function initials(name = "") {
  return (
    name
      .replace(/^dr\.?\s+/i, "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

/** "MBBS, FCPS" -> ["MBBS", "FCPS"]. */
export const splitList = (value = "") =>
  String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const joinList = (items = []) => items.join(", ");

export const capitalize = (value = "") => value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");

// ─── validation ────────────────────────────────────────────────────────────────────────────

/**
 * Client-side validation helpers. They improve UX only: the backend must
 * validate every field again.
 */
export const PHONE_PATTERN = "\\+?[0-9\\s-]{8,18}";
const PHONE_REGEX = new RegExp(`^${PHONE_PATTERN}$`);
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

export const isValidPhone = (value = "") => PHONE_REGEX.test(value.trim());
export const isValidEmail = (value = "") => EMAIL_REGEX.test(value.trim());

export const slugify = (value = "") =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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

// ─── forms ─────────────────────────────────────────────────────────────────────────────────

/** Reads a <form> into a plain object (single-valued fields only). */
export const readForm = (form) => Object.fromEntries(new FormData(form));

/**
 * Reads the shared doctor-profile fields rendered by <DoctorProfileFields>.
 * @param {HTMLFormElement} form
 */
export function readDoctorProfileForm(form) {
  const data = new FormData(form);
  return {
    name: String(data.get("name") ?? "").trim(),
    specialtyId: String(data.get("specialtyId") ?? ""),
    qualifications: splitList(data.get("qualifications")),
    experienceYears: Number(data.get("experienceYears")),
    fee: Number(data.get("fee")),
    location: String(data.get("location") ?? "").trim(),
    facilityIds: data.getAll("facilityIds").map(String),
  };
}

// ─── attachments ───────────────────────────────────────────────────────────────────────────

/** @returns {string} an error message, or "" when the file may be uploaded. */
export function validateAttachment(file) {
  if (!ATTACHMENT_MIME_TYPES.includes(file.type)) return "Choose a PDF, JPEG, PNG, WebP, or GIF file.";
  if (file.size > ATTACHMENT_MAX_BYTES)
    return `Choose a file smaller than ${ATTACHMENT_MAX_BYTES / 1024 / 1024} MB.`;
  return "";
}

// ─── placeholders ──────────────────────────────────────────────────────────────────────────

const toDataUri = (svg) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

const GRADIENT = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#0f9d9a"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/>`;

/** Initials on the brand gradient, used when a person has no photo. */
export const avatarPlaceholder = (name) =>
  toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${GRADIENT}<text x="50" y="50" dy=".35em" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="38" font-weight="700">${initials(name)}</text></svg>`,
  );

/** Neutral building glyph used when a clinic has no photo. */
export const facilityPlaceholder = () =>
  toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${GRADIENT}<path d="M30 72V34h40v38M42 72V58h16v14M46 42h8M50 38v8" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  );
