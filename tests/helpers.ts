import bcrypt from "bcryptjs";
import request from "supertest";
import app from "../src/app";
import { Doctor, User } from "../src/models";

export const ADMIN = { email: "admin@test.com", password: "Password123" };

export async function createAdmin() {
    // Low bcrypt cost keeps the tests fast
    const passwordHash = await bcrypt.hash(ADMIN.password, 4);
    return User.create({ name: "Admin", email: ADMIN.email, passwordHash, role: "admin" });
}

// Returns a supertest agent that already holds the login cookie
export async function loginAgent() {
    await createAdmin();
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send(ADMIN).expect(200);
    return agent;
}

export const doctorData = (overrides: Record<string, unknown> = {}) => ({
    name: "Dr. Ayesha Rahman",
    specialization: "Cardiology",
    hospital: "Square Hospital",
    phone: "01711000000",
    email: "ayesha@example.com",
    ...overrides,
});

export const createDoctorInDb = (overrides: Record<string, unknown> = {}) =>
    Doctor.create(doctorData(overrides));