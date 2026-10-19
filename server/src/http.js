import { Prisma } from "@prisma/client";

/**
 * Every error the API sends has the shape { code, message, details? }, and `message` is always
 * safe to show to a user. Throw an ApiError anywhere in a route and it is sent for you.
 */
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (what = "This record") => new ApiError(404, "NOT_FOUND", `${what} is unavailable.`);
export const conflict = (code, message) => new ApiError(409, code, message);

/** Validates `data` with a zod schema; throws a 422 carrying one message per bad field. */
export function parse(schema, data) {
  const result = schema.safeParse(data ?? {});
  if (result.success) return result.data;
  const details = {};
  for (const issue of result.error.issues) details[issue.path.join(".") || "_"] ??= issue.message;
  throw new ApiError(422, "VALIDATION_FAILED", "Some of the submitted details are invalid.", details);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Route ids are UUIDs. Anything else cannot exist, so answer 404 instead of a database error. */
export function uuid(value, what) {
  if (!UUID.test(String(value))) throw notFound(what);
  return String(value);
}

// ── Database errors → API errors ───────────────────────────────────────────────────────
// The rules in prisma/migrations (exclusion, check and partial unique constraints) raise raw
// database errors. Map each one to the error code the API contract promises.
const BY_CONSTRAINT = [
  [/slots_no_overlap/, 409, "SLOT_OVERLAP", "This slot overlaps existing availability."],
  [/appointments_one_accepted_per_slot/, 409, "APPOINTMENT_CONFLICT", "This time is no longer available."],
  [/doctors_published_requires_verified/, 409, "NOT_VERIFIED", "Only verified profiles can be published."],
  [/slots_time_order/, 422, "VALIDATION_FAILED", "The end time must be after the start time."],
  [/doctors_fee_non_negative|doctors_experience_range|doctor_clinics_fee_non_negative/, 422, "VALIDATION_FAILED", "Check the fee and years of experience."],
  [/messages_body_length|attachments_size_limit/, 422, "VALIDATION_FAILED", "That message or file is too large."],
];

/**
 * True when the database refused a change because other rows still refer to this one. Prisma
 * reports most of these as P2003, but PostgreSQL's RESTRICT rule (SQLSTATE 23001) arrives as an
 * "unknown request error", so the message is checked too.
 */
export const isForeignKeyViolation = (error) =>
  error?.code === "P2003" || /violates (RESTRICT setting of )?foreign key constraint/.test(String(error?.message ?? ""));

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
        if (/email/.test(target)) return new ApiError(409, "EMAIL_TAKEN", "An account with this email already exists.");
        if (/specialt/.test(target)) return new ApiError(409, "DUPLICATE_SPECIALTY", "A specialty with this name already exists.");
        if (/doctor_id.*clinic_id.*date|start_time/.test(target)) return new ApiError(409, "SLOT_OVERLAP", "This slot overlaps existing availability.");
        return new ApiError(409, "CONFLICT", "This record already exists.");
      case "P2003": // foreign key
        if (/availability_slots_doctor_id_clinic_id/.test(target))
          return new ApiError(422, "VALIDATION_FAILED", "The doctor does not practise at that clinic.");
        if (/doctors_specialty_id/.test(target)) return new ApiError(422, "VALIDATION_FAILED", "Choose a valid specialty.");
        if (/doctor_clinics_clinic_id/.test(target)) return new ApiError(422, "VALIDATION_FAILED", "Choose valid clinics.");
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
    return response.status(400).json({ code: "INVALID_JSON", message: "The request body is not valid JSON." });
  if (error?.type === "entity.too.large")
    return response.status(413).json({ code: "PAYLOAD_TOO_LARGE", message: "The request is too large." });

  console.error("Unhandled error", error);
  return response.status(500).json({ code: "INTERNAL_ERROR", message: "Something went wrong on our side. Please try again." });
}
