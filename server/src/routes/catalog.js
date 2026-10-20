import { Router } from "express";
import * as catalog from "../controllers/catalog.js";

export const catalogRouter = Router();
catalogRouter.get("/clinics", catalog.listClinics);
catalogRouter.get("/specialties", catalog.listSpecialties);
catalogRouter.get("/doctors", catalog.listDoctors);
catalogRouter.get("/doctors/:id", catalog.getDoctor);
