import multer from "multer";
import { ApiError } from "./http.js";

/**
 * Receives ONE uploaded file in the multipart field `file`, keeps it in memory (so it can be
 * checked and then sent to object storage) and puts it on `request.file`.
 *
 *   router.post("/attachments", receiveFile({ maxBytes: 10 * 1024 * 1024, types: ["application/pdf"] }), handler)
 *
 * `types` is checked against the declared MIME type here; check the real file content too
 * (see `looksLike`) before trusting it.
 */
export function receiveFile({ maxBytes, types }) {
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes, files: 1 } }).single("file");
  return (request, response, next) =>
    upload(request, response, (error) => {
      if (error?.code === "LIMIT_FILE_SIZE")
        return next(new ApiError(413, "FILE_TOO_LARGE", `The file is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.`));
      if (error) return next(new ApiError(422, "VALIDATION_FAILED", "The file could not be read."));
      if (!request.file) return next(new ApiError(422, "VALIDATION_FAILED", "Choose a file to upload.", { file: "Choose a file." }));
      if (types && !types.includes(request.file.mimetype))
        return next(new ApiError(422, "UNSUPPORTED_FILE", "This file type is not allowed.", { file: "Unsupported file type." }));
      return next();
    });
}

const SIGNATURES = {
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
};

/** True when the first bytes of `buffer` match the declared type, so a renamed .exe is refused. */
export const looksLike = (mimetype, buffer) =>
  (SIGNATURES[mimetype] ?? []).some((signature) => signature.every((byte, index) => buffer[index] === byte));
