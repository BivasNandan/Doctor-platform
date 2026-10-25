import { Router } from "express";
import { requireRole } from "../middleware/authenticate.js";
import * as accounts from "../controllers/accounts.js";

export const accountsRouter = Router();
const confirmsEmail = requireRole("patient", "doctor"); // patients at sign-up, doctors in their application
const signedIn = requireRole("patient", "doctor", "admin");
accountsRouter.post("/patient/register", accounts.registerPatient);
accountsRouter.post("/verify-email", confirmsEmail, accounts.verifyEmail);
accountsRouter.post("/verify-email/resend", confirmsEmail, accounts.resendVerification);
accountsRouter.post("/forgot-password", accounts.forgotPassword);
accountsRouter.post("/reset-password", accounts.resetPassword);
accountsRouter.patch("/me", signedIn, accounts.updateProfile);
accountsRouter.post("/change-password", signedIn, accounts.changePassword);
