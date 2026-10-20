import { initials } from "./format.js";

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
