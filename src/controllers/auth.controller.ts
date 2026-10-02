import { CookieOptions, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { User } from "../models";
import { ApiError } from "../utils/ApiError";

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const isProd = env.NODE_ENV === "production";

const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function login(req: Request, res: Response) {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const user = await User.findOne({ email }).select("+passwordHash");
    const valid = user && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !valid) throw new ApiError(401, "Invalid credentials");

    const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
        expiresIn: "7d",
    });

    res.cookie("token", token, cookieOptions);
    res.json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
}

export function logout(_req: Request, res: Response) {
    res.clearCookie("token", { ...cookieOptions, maxAge: undefined });
    res.json({ message: "Logged out" });
}

export async function me(req: Request, res: Response) {
    const user = await User.findById(req.user!.sub);
    if (!user) throw new ApiError(401, "User no longer exists");
    res.json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
}