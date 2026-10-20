import { Router } from "express";
import { requireRole } from "../middleware/authenticate.js";
import * as accounts from "../controllers/accounts.js";

export const accountsRouter = Router();
const patientOnly = requireRole("patient");
const signedIn = requireRole("patient", "doctor", "admin");
accountsRouter.post("/patient/register", accounts.registerPatient);
accountsRouter.post("/verify-email", patientOnly, accounts.verifyEmail);
accountsRouter.post("/verify-email/resend", patientOnly, accounts.resendVerification);
accountsRouter.post("/forgot-password", accounts.forgotPassword);
accountsRouter.post("/reset-password", accounts.resetPassword);
accountsRouter.patch("/me", signedIn, accounts.updateProfile);
accountsRouter.post("/change-password", signedIn, accounts.changePassword);
