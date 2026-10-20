import { Router } from "express";
import * as auth from "../controllers/auth.js";

export const authRouter = Router();
authRouter.post("/login", auth.login);
authRouter.post("/logout", auth.logout);
authRouter.get("/me", auth.currentUser);
