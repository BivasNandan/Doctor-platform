/**
 * Static marketing copy and options for the discovery screens.
 * The stats below are placeholders: replace them with a public stats endpoint
 * (e.g. GET /stats/public) before launch rather than hard-coding real claims.
 */

/** External stock imagery. Host these in /public/images for production. */
export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1000&q=85";

export const HERO_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=64&h=64&fit=crop&crop=faces",
];

export const TRUST_STATS = [
  { value: "250", suffix: "+", label: "verified specialists" },
  { value: "18", suffix: "k", label: "appointments made" },
  { value: "4.9", suffix: "★", label: "patient experience" },
];

/** Specialty ids offered as one-click shortcuts under the search box. */
export const POPULAR_SPECIALTY_IDS = ["cardiology", "dermatology", "dentistry", "pediatrics"];

export const AVAILABILITY_OPTIONS = ["Today", "Tomorrow", "This week"];

export const FEE_RANGE = { min: 500, max: 3000, step: 100 };

export const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "fee-low", label: "Lowest fee" },
  { value: "experience", label: "Most experienced" },
];

export const TESTIMONIAL = {
  quote:
    "For the first time, finding a doctor felt simple. I booked in a few minutes and Dr. Nusrat made me feel completely at ease.",
  author: "Demo patient",
  detail: "Carewell patient · Dhaka",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces",
};
