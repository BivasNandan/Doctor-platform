import { Router } from "express";
import * as support from "../controllers/support.js";

export const supportRouter = Router();
supportRouter.post("/support-requests", support.createSupportRequest);
