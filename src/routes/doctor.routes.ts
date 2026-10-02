import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAdmin, requireAuth } from "../middleware/requireAuth";
import { validateBody, validateQuery } from "../middleware/validate";
import {
    createDoctorSchema,
    listDoctorsQuerySchema,
} from "../validators/doctor.validators";
import {
    createDoctor,
    getDoctor,
    getDoctorFilters,
    listDoctors,
    deleteDoctor,
} from "../controllers/doctor.controller";
import { createPatientSchema, listPatientsQuerySchema } from "../validators/patient.validators";
import {
    addPatientToDoctor,
    deletePatientFromDoctor,
    listDoctorPatients,
} from "../controllers/patient.controller";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/", validateQuery(listDoctorsQuerySchema), asyncHandler(listDoctors));
router.post("/", validateBody(createDoctorSchema), asyncHandler(createDoctor));
router.get("/filters", asyncHandler(getDoctorFilters)); // must come before "/:id"
router.get("/:id", asyncHandler(getDoctor));
router.delete("/:id", asyncHandler(deleteDoctor));

router.get("/:id/patients", validateQuery(listPatientsQuerySchema), asyncHandler(listDoctorPatients));
router.post("/:id/patients", validateBody(createPatientSchema), asyncHandler(addPatientToDoctor));
router.delete("/:id/patients/:patientId", asyncHandler(deletePatientFromDoctor));

export default router;