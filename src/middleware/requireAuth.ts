import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

export interface AuthPayload {
    sub: string;
    role: "admin";
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthPayload;
        }
    }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
    const token = req.cookies?.token;
    if (!token) return next(new ApiError(401, "Not authenticated"));

    try {
        req.user = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
        next();
    } catch {
        next(new ApiError(401, "Invalid or expired token"));
    }
}

export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role !== "admin") return next(new ApiError(403, "Forbidden"));
    next();
};