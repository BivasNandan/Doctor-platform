import multer from "multer";
import { ApiError } from "../utils/errors.js";

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
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes, files: 1 } }).single(
    "file",
  );
  return (request, response, next) =>
    upload(request, response, (error) => {
      if (error?.code === "LIMIT_FILE_SIZE")
        return next(
          new ApiError(
            413,
            "FILE_TOO_LARGE",
            `The file is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.`,
          ),
        );
      if (error) return next(new ApiError(422, "VALIDATION_FAILED", "The file could not be read."));
      if (!request.file)
        return next(
          new ApiError(422, "VALIDATION_FAILED", "Choose a file to upload.", { file: "Choose a file." }),
        );
      if (types && !types.includes(request.file.mimetype))
        return next(
          new ApiError(422, "UNSUPPORTED_FILE", "This file type is not allowed.", {
            file: "Unsupported file type.",
          }),
        );
      return next();
    });
}
