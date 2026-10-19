import { splitList } from "./format.js";

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
