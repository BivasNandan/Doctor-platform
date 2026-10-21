import { Languages } from "lucide-react";

/** Displays language information when it is available from the doctor record. */
export default function DoctorLanguages({ languages }) {
  const items = Array.isArray(languages)
    ? [...new Set(languages.map((language) => String(language).trim()).filter(Boolean))]
    : [];

  if (!items.length) return null;

  return (
    <span className="doctor-languages">
      <Languages size={14} aria-hidden="true" />
      <span>Languages: {items.join(", ")}</span>
    </span>
  );
}
