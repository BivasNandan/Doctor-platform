import { Router } from "express";
import { requireRole } from "../middleware/authenticate.js";
import { receiveFile } from "../middleware/upload.js";
import { MAX_PHOTO_BYTES, PHOTO_TYPES } from "../services/photos.js";
import * as photos from "../controllers/photos.js";

export const photosRouter = Router();
const signedIn = requireRole("patient", "doctor", "admin");
photosRouter.post(
  "/me/photo",
  signedIn,
  receiveFile({ maxBytes: MAX_PHOTO_BYTES, types: PHOTO_TYPES }),
  photos.uploadMyPhoto,
);
photosRouter.delete("/me/photo", signedIn, photos.deleteMyPhoto);
// Public for published doctors; for everyone else the controller decides who may look.
photosRouter.get("/photos/users/:id", photos.getUserPhoto);
