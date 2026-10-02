import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAdmin, requireAuth } from "../middleware/requireAuth";
import { validateQuery } from "../middleware/validate";
import { dashboardQuerySchema } from "../validators/dashboard.validators";
import { getDashboardStats } from "../controllers/dashboard.controller";

const router = Router();

router.use(requireAuth, requireAdmin);
router.get("/stats", validateQuery(dashboardQuerySchema), asyncHandler(getDashboardStats));

export default router;