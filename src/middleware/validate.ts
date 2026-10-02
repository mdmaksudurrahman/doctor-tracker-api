import { NextFunction, Request, Response } from "express";
import { z, ZodType } from "zod";

export const validateBody =
    (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: z.flattenError(result.error).fieldErrors,
            });
        }
        req.body = result.data;
        next();
    };

export const validateQuery =
    (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: z.flattenError(result.error).fieldErrors,
            });
        }
        res.locals.query = result.data;
        next();
    };