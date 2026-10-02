import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAdmin, requireAuth } from "../middleware/requireAuth";
import { validateBody, validateQuery } from "../middleware/validate";
import { listPatientsQuerySchema, updatePatientSchema } from "../validators/patient.validators";
import {
    deletePatient,
    getPatientFilters,
    listPatients,
    updatePatient,
} from "../controllers/patient.controller";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/", validateQuery(listPatientsQuerySchema), asyncHandler(listPatients));
router.get("/filters", asyncHandler(getPatientFilters)); // before "/:id"
router.patch("/:id", validateBody(updatePatientSchema), asyncHandler(updatePatient));
router.delete("/:id", asyncHandler(deletePatient));

export default router;