import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { findDoctor } from "../models/doctor.js";
import { toUser } from "../models/user.js";
import { hashPassword, startSession } from "../services/auth.js";
import { discardUpload, saveUpload } from "../services/files.js";
import { LINKS, notifyAdmins } from "../services/notifications.js";
import { ApiError, conflict, notFound, parse, uuid } from "../utils/errors.js";

/**
 * How a doctor joins and leaves: self-registration, uploading certificates for the administrator
 * to review, and asking for the account to be deactivated. Mounted at the API root.
 */

const HOUR = 60 * 60 * 1000;
const MAX_CERTIFICATES = 5;

// ── POST /auth/doctor/register ────────────────────────────────────────────────────────────
// The profile fields mirror doctorProfile.js (administrator and doctor editing). They are
// repeated here so this feature stands alone; import them from there once both are merged.
const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{8,18}$/, "Enter a valid phone number."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .refine((value) => Buffer.byteLength(value) <= 72, "Use at most 72 characters."),
  specialtyId: z.string().min(1, "Choose a specialty."),
  qualifications: z.array(z.string().trim().min(1)).min(1, "Add at least one qualification."),
  experienceYears: z.number().int("Use whole years.").min(0).max(60),
  fee: z.number().int("Use a whole number of taka.").min(0),
  location: z.string().trim().min(2, "Enter your practice location.").max(200),
  facilityIds: z.array(z.string().uuid()).min(1, "Choose at least one clinic or hospital."),
});

/**
 * Creates the account and a profile that is `pending` and `unpublished` until an administrator
 * verifies it, signs the doctor in, and returns `{ user, doctor }`. The role is fixed to doctor.
 */
export const registerDoctor = async (request, response) => {
  rateLimit(
    `register-doctor:${request.ip}`,
    5,
    HOUR,
    "Too many registrations from this connection. Try again later.",
  );
  const data = parse(registerSchema, request.body);

  const facilityIds = [...new Set(data.facilityIds)];
  const [specialty, clinics] = await Promise.all([
    prisma.specialty.findFirst({ where: { id: data.specialtyId, active: true } }),
    prisma.clinic.count({ where: { id: { in: facilityIds }, active: true } }),
  ]);
  const details = {};
  if (!specialty) details.specialtyId = "Choose a valid specialty.";
  if (clinics !== facilityIds.length) details.facilityIds = "Choose valid, active clinics or hospitals.";
  if (Object.keys(details).length)
    throw new ApiError(422, "VALIDATION_FAILED", "Some of the submitted details are invalid.", details);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash: await hashPassword(data.password),
      role: "doctor",
      doctor: {
        create: {
          specialtyId: data.specialtyId,
          qualifications: data.qualifications,
          experienceYears: data.experienceYears,
          fee: data.fee,
          location: data.location,
          clinics: { create: facilityIds.map((clinicId) => ({ clinicId })) },
        },
      },
    },
    include: { doctor: { select: { id: true } } },
  });
  await prisma.conversation.create({ data: { kind: "doctor_admin", doctorId: user.doctor.id } });
  await startSession(request, response, user.id);
  await notifyAdmins({
    kind: "doctor",
    title: "New doctor awaiting verification",
    body: `${data.name} registered and is waiting for review.`,
    link: LINKS.adminVerification,
  });
  response.status(201).json({ user: toUser(user), doctor: await findDoctor(user.doctor.id) });
};

const ownDoctorId = (request) => {
  const id = request.user.doctor?.id;
  if (!id) throw notFound("Your doctor profile");
  return id;
};
const toCertificate = (row) => ({
  id: row.id,
  fileName: row.fileName,
  uploadedAt: row.uploadedAt.toISOString(),
});

export const listCertificates = async (request, response) => {
  const rows = await prisma.doctorCertificate.findMany({
    where: { doctorId: ownDoctorId(request) },
    orderBy: { uploadedAt: "asc" },
  });
  response.json(rows.map(toCertificate));
};

/** POST /doctor/certificates (multipart field `file`): a PDF or image, up to 10 MB, at most 5 files. */
export const uploadCertificate = async (request, response) => {
  const doctorId = ownDoctorId(request);
  rateLimit(`certificate:${request.user.id}`, 20, HOUR);
  if ((await prisma.doctorCertificate.count({ where: { doctorId } })) >= MAX_CERTIFICATES)
    throw conflict(
      "TOO_MANY_FILES",
      `You can upload at most ${MAX_CERTIFICATES} certificate files. Remove one first.`,
    );

  const stored = await saveUpload(`certificates/${doctorId}`, request.file);
  try {
    const row = await prisma.doctorCertificate.create({
      data: { doctorId, storageKey: stored.storageKey, fileName: stored.fileName },
    });
    await notifyAdmins({
      kind: "doctor",
      title: "A doctor uploaded a certificate",
      body: `${request.user.name} uploaded "${row.fileName}" for review.`,
      link: LINKS.adminVerification,
      groupKey: `certificate:${doctorId}`,
    });
    response.status(201).json(toCertificate(row));
  } catch (error) {
    await discardUpload(stored.storageKey); // never leave a file nobody can find
    throw error;
  }
};

export const deleteCertificate = async (request, response) => {
  const id = uuid(request.params.id, "This certificate");
  const row = await prisma.doctorCertificate.findFirst({ where: { id, doctorId: ownDoctorId(request) } });
  if (!row) throw notFound("This certificate");
  await prisma.doctorCertificate.delete({ where: { id } });
  await discardUpload(row.storageKey);
  response.status(204).end();
};

// ── POST /doctor/account/deactivation-requests ────────────────────────────────────────────
/**
 * The doctor asks to leave. The account stays usable (status `deactivation_requested`) until an
 * administrator approves or declines in /admin/deactivation-requests.
 */
export const requestDeactivation = async (request, response) => {
  const doctorId = ownDoctorId(request);
  const { reason } = parse(
    z.object({
      reason: z.string().trim().min(3, "Provide a reason for the deactivation request.").max(1000),
    }),
    request.body,
  );
  if (await prisma.deactivationRequest.findFirst({ where: { doctorId, status: "open" } }))
    throw conflict("ALREADY_REQUESTED", "A deactivation request is already waiting for the administrator.");

  await prisma.$transaction([
    prisma.deactivationRequest.create({ data: { doctorId, reason } }),
    prisma.user.update({ where: { id: request.user.id }, data: { accountStatus: "deactivation_requested" } }),
  ]);
  const short = reason.length > 80 ? `${reason.slice(0, 79)}…` : reason;
  await notifyAdmins({
    kind: "doctor",
    title: "Deactivation request",
    body: `${request.user.name} asked to deactivate their account: "${short}"`,
    link: LINKS.adminDeactivations,
  });
  response.status(201).json({ status: "deactivation_requested" });
};
