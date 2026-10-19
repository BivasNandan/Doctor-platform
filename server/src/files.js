import { randomUUID } from "node:crypto";
import { ApiError } from "./http.js";
import { deleteObject, getObject, putObject } from "./storage/objectStore.js";
import { looksLike } from "./upload.js";

/**
 * Stores uploaded files in the private object-storage bucket and reads them back.
 * The bucket is never public: files leave only through routes that check who is asking.
 *
 * STORAGE_PREFIX (optional) puts every key under a folder, so tests and teammates sharing one
 * bucket never touch each other's files.
 */
const prefix = () => process.env.STORAGE_PREFIX ?? "";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const ATTACHMENT_TYPES = [...DOCUMENT_TYPES, "image/gif"];

/** A file name that is safe to store and to put in a download header. */
export function safeFileName(original) {
  const base = String(original ?? "file").split(/[\\/]/).pop();
  const cleaned = base.replace(/[^\w.\- ()]+/g, "_").replace(/^\.+/, "").trim().slice(-120);
  return cleaned || "file";
}

/**
 * Checks that the bytes really are the declared type (a renamed program is refused) and saves them.
 * `folder` is e.g. "certificates/<doctorId>". Resolves `{ storageKey, fileName, fileType, fileSize }`.
 */
export async function saveUpload(folder, file) {
  if (!looksLike(file.mimetype, file.buffer))
    throw new ApiError(422, "UNSUPPORTED_FILE", "That file does not look like the type it claims to be.", { file: "Unsupported file." });
  const fileName = safeFileName(file.originalname);
  const storageKey = `${prefix()}${folder}/${randomUUID()}-${fileName.replace(/ /g, "_")}`;
  await putObject(storageKey, file.buffer, file.mimetype);
  return { storageKey, fileName, fileType: file.mimetype, fileSize: file.size };
}

/** Removes a stored file; a failure is logged, never thrown (the database row is what matters). */
export async function discardUpload(storageKey) {
  try {
    await deleteObject(storageKey);
  } catch (error) {
    console.error(`[files] could not delete ${storageKey}: ${error.message}`);
  }
}

/** Sends a stored file to the browser, as a download or inline preview. */
export async function sendStoredFile(response, { storageKey, fileName, fileType }, { inline = false } = {}) {
  const body = await getObject(storageKey);
  // Rows that do not record a type (certificates) get it from the file's own first bytes.
  const type = fileType ?? ATTACHMENT_TYPES.find((candidate) => looksLike(candidate, body)) ?? "application/octet-stream";
  response.set({
    "Content-Type": type,
    "Content-Length": String(body.length),
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(body);
}
