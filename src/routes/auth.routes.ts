import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../utils/asyncHandler";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import { login, loginSchema, logout, me } from "../controllers/auth.controller";

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    // Only failed attempts count: brute force stays limited, and users who share one
    // address (everyone behind the frontend proxy) are not locked out by successful logins
    skipSuccessfulRequests: true,
    message: { message: "Too many login attempts, try again later" },
});

const router = Router();

router.post("/login", loginLimiter, validateBody(loginSchema), asyncHandler(login));
router.post("/logout", logout);
router.get("/me", requireAuth, asyncHandler(me));

export default router;