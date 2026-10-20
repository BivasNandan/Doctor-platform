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

/**
 * True when the database refused a change because other rows still refer to this one. Prisma
 * reports most of these as P2003, but PostgreSQL's RESTRICT rule (SQLSTATE 23001) arrives as an
 * "unknown request error", so the message is checked too.
 */
export const isForeignKeyViolation = (error) =>
  error?.code === "P2003" ||
  /violates (RESTRICT setting of )?foreign key constraint/.test(String(error?.message ?? ""));
