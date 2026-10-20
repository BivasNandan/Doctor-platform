import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { ApiError, conflict, isForeignKeyViolation } from "../utils/errors.js";

// The editable part of a doctor profile, shared by administrators (any doctor) and by doctors
// (their own profile).

export const profileFields = {
  name: z.string().trim().min(2, "Enter the doctor's full name.").max(120),
  specialtyId: z.string().min(1, "Choose a specialty."),
  qualifications: z.array(z.string().trim().min(1)).min(1, "Add at least one qualification."),
  experienceYears: z.number().int("Use whole years.").min(0).max(60),
  fee: z.number().int("Use a whole number of taka.").min(0),
  location: z.string().trim().min(2, "Enter the practice location.").max(200),
  facilityIds: z.array(z.string().uuid()).min(1, "Choose at least one clinic or hospital."),
};
export const profileSchema = z.object(profileFields);

/** The specialty and clinics must exist (and clinics be active). */
export async function assertReferences({ specialtyId, facilityIds }) {
  const [specialty, clinics] = await Promise.all([
    prisma.specialty.findUnique({ where: { id: specialtyId } }),
    prisma.clinic.count({ where: { id: { in: facilityIds }, active: true } }),
  ]);
  const details = {};
  if (!specialty) details.specialtyId = "Choose a valid specialty.";
  if (clinics !== new Set(facilityIds).size)
    details.facilityIds = "Choose valid, active clinics or hospitals.";
  if (Object.keys(details).length)
    throw new ApiError(422, "VALIDATION_FAILED", "Some of the submitted details are invalid.", details);
}

/**
 * Saves profile fields and the clinic list for `doctor` (a database row with `clinics`).
 * A clinic cannot be dropped while the doctor still has availability there (409 CLINIC_IN_USE).
 * Resolves which fields that need admin re-review changed (specialty, qualifications, clinics).
 */
export async function saveDoctorProfile(doctor, data) {
  await assertReferences(data);

  const wanted = [...new Set(data.facilityIds)];
  const current = doctor.clinics.map((clinic) => clinic.clinicId);
  const removed = current.filter((clinicId) => !wanted.includes(clinicId));
  const added = wanted.filter((clinicId) => !current.includes(clinicId));

  const sameList = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
  const reviewFields = [
    doctor.specialtyId !== data.specialtyId && "specialtyId",
    !sameList(doctor.qualifications, data.qualifications) && "qualifications",
    (removed.length > 0 || added.length > 0) && "facilityIds",
  ].filter(Boolean);

  try {
    await prisma.$transaction([
      prisma.user.update({ where: { id: doctor.userId }, data: { name: data.name } }),
      prisma.doctor.update({
        where: { id: doctor.id },
        data: {
          specialtyId: data.specialtyId,
          qualifications: data.qualifications,
          experienceYears: data.experienceYears,
          fee: data.fee,
          location: data.location,
        },
      }),
      prisma.doctorClinic.deleteMany({ where: { doctorId: doctor.id, clinicId: { in: removed } } }),
      prisma.doctorClinic.createMany({ data: added.map((clinicId) => ({ doctorId: doctor.id, clinicId })) }),
    ]);
  } catch (error) {
    if (isForeignKeyViolation(error))
      throw conflict("CLINIC_IN_USE", "Remove availability at the clinics you are removing first.");
    throw error;
  }
  return reviewFields;
}
