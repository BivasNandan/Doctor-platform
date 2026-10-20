import { Router } from "express";
import { requireRole } from "../middleware/authenticate.js";
import { receiveFile } from "../middleware/upload.js";
import { DOCUMENT_TYPES, MAX_FILE_BYTES } from "../services/files.js";
import * as onboarding from "../controllers/onboarding.js";

export const onboardingRouter = Router();
const doctorOnly = requireRole("doctor");
onboardingRouter.post("/auth/doctor/register", onboarding.registerDoctor);
onboardingRouter.get("/doctor/certificates", doctorOnly, onboarding.listCertificates);
onboardingRouter.post(
  "/doctor/certificates",
  doctorOnly,
  receiveFile({ maxBytes: MAX_FILE_BYTES, types: DOCUMENT_TYPES }),
  onboarding.uploadCertificate,
);
onboardingRouter.delete("/doctor/certificates/:id", doctorOnly, onboarding.deleteCertificate);
onboardingRouter.post("/doctor/account/deactivation-requests", doctorOnly, onboarding.requestDeactivation);
