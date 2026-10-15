/**
 * Client-side checks shared by every screen that edits a doctor profile.
 * The server must validate the same rules.
 * @param {ReturnType<typeof import('../../utils/forms.js').readDoctorProfileForm>} profile
 * @returns {Record<string, string>}
 */
export function validateDoctorProfile(profile) {
  const errors = {};
  if (profile.name.length < 5) errors.name = "Enter the doctor's full name.";
  if (!profile.specialtyId) errors.specialtyId = "Choose a specialty.";
  if (!profile.qualifications.length) errors.qualifications = "Add at least one qualification.";
  if (!profile.languages.length) errors.languages = "Add at least one language.";
  if (!Number.isFinite(profile.fee) || profile.fee < 0) errors.fee = "Enter a non-negative fee.";
  if (!Number.isFinite(profile.experienceYears) || profile.experienceYears < 0)
    errors.experienceYears = "Enter the years of experience.";
  if (!profile.location) errors.location = "Enter the practice location.";
  if (!profile.facilityIds.length) errors.facilityIds = "Choose at least one clinic or hospital.";
  return errors;
}
