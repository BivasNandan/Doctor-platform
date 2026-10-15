/** Client-side attachment limits. The server MUST re-validate all of them. */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const ATTACHMENT_ACCEPT = "image/*,.pdf";

export const MESSAGE_MAX_LENGTH = 2000;
