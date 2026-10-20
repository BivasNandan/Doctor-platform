import { Prisma } from "@prisma/client";
import { ApiError, isForeignKeyViolation, notFound } from "../utils/errors.js";

// The rules in prisma/migrations (exclusion, check and partial unique constraints) raise raw
// database errors. Map each one to the error code the API contract promises.
const BY_CONSTRAINT = [
  [/slots_no_overlap/, 409, "SLOT_OVERLAP", "This slot overlaps existing availability."],
  [/appointments_one_accepted_per_slot/, 409, "APPOINTMENT_CONFLICT", "This time is no longer available."],
  [/doctors_published_requires_verified/, 409, "NOT_VERIFIED", "Only verified profiles can be published."],
  [/slots_time_order/, 422, "VALIDATION_FAILED", "The end time must be after the start time."],
  [
    /doctors_fee_non_negative|doctors_experience_range|doctor_clinics_fee_non_negative/,
    422,
    "VALIDATION_FAILED",
    "Check the fee and years of experience.",
  ],
  [
    /messages_body_length|attachments_size_limit/,
    422,
    "VALIDATION_FAILED",
    "That message or file is too large.",
  ],
];

export function translateDbError(error) {
  const text = String(error?.message ?? "");
  for (const [pattern, status, code, message] of BY_CONSTRAINT)
    if (pattern.test(text)) return new ApiError(status, code, message);

  if (!(error instanceof Prisma.PrismaClientKnownRequestError) && isForeignKeyViolation(error))
    return new ApiError(409, "IN_USE", "This record is still in use, so the change was not made.");

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const target = [error.meta?.target ?? error.meta?.field_name ?? ""].flat().join(",");
    switch (error.code) {
      case "P2002": // unique constraint
        // The "one accepted request per slot" rule is a partial index Prisma cannot name.
        if (error.meta?.modelName === "Appointment")
          return new ApiError(409, "APPOINTMENT_CONFLICT", "This time is no longer available.");
        if (/email/.test(target))
          return new ApiError(409, "EMAIL_TAKEN", "An account with this email already exists.");
        if (/specialt/.test(target))
          return new ApiError(409, "DUPLICATE_SPECIALTY", "A specialty with this name already exists.");
        if (/doctor_id.*clinic_id.*date|start_time/.test(target))
          return new ApiError(409, "SLOT_OVERLAP", "This slot overlaps existing availability.");
        return new ApiError(409, "CONFLICT", "This record already exists.");
      case "P2003": // foreign key
        if (/availability_slots_doctor_id_clinic_id/.test(target))
          return new ApiError(422, "VALIDATION_FAILED", "The doctor does not practise at that clinic.");
        if (/doctors_specialty_id/.test(target))
          return new ApiError(422, "VALIDATION_FAILED", "Choose a valid specialty.");
        if (/doctor_clinics_clinic_id/.test(target))
          return new ApiError(422, "VALIDATION_FAILED", "Choose valid clinics.");
        return new ApiError(409, "IN_USE", "This record is still in use, so the change was not made.");
      case "P2025": // record not found
        return notFound();
      default:
        return null;
    }
  }
  return null;
}

/** Express error middleware: turns anything thrown into the contract's error shape. */
export function errorHandler(error, request, response, next) {
  if (response.headersSent) return next(error);

  const known = error instanceof ApiError ? error : translateDbError(error);
  if (known) {
    return response.status(known.status).json({
      code: known.code,
      message: known.message,
      ...(known.details ? { details: known.details } : {}),
    });
  }
  if (error?.type === "entity.parse.failed")
    return response
      .status(400)
      .json({ code: "INVALID_JSON", message: "The request body is not valid JSON." });
  if (error?.type === "entity.too.large")
    return response.status(413).json({ code: "PAYLOAD_TOO_LARGE", message: "The request is too large." });

  console.error("Unhandled error", error);
  return response
    .status(500)
    .json({ code: "INTERNAL_ERROR", message: "Something went wrong on our side. Please try again." });
}
