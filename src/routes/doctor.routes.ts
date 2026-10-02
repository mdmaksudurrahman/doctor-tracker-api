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
} from "../controllers/doctor.controller";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/", validateQuery(listDoctorsQuerySchema), asyncHandler(listDoctors));
router.post("/", validateBody(createDoctorSchema), asyncHandler(createDoctor));
router.get("/filters", asyncHandler(getDoctorFilters)); // must come before "/:id"
router.get("/:id", asyncHandler(getDoctor));

export default router;