import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import doctorRoutes from "./routes/doctor.routes";
import patientRoutes from "./routes/patient.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import { ApiError } from "./utils/ApiError";

const app = express();
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
if (env.NODE_ENV !== "test") app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/dashboard", dashboardRoutes);

// 404 handler (must come after all routes)
app.use((_req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// Central error handler (must be last)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err instanceof ApiError || err.status ? err.status : 500;
    if (status >= 500 && env.NODE_ENV !== "test") console.error(err);
    res.status(status).json({ message: status >= 500 ? "Server error" : err.message });
});

export default app;