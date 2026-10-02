import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { ADMIN, createAdmin, loginAgent } from "./helpers";

describe("health", () => {
    it("returns ok", async () => {
        const res = await request(app).get("/api/health");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: "ok" });
    });

    it("returns 404 json for unknown routes", async () => {
        const res = await request(app).get("/api/nope");
        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Route not found");
    });
});

describe("POST /api/auth/login", () => {
    it("logs in and sets an httpOnly cookie", async () => {
        await createAdmin();
        const res = await request(app).post("/api/auth/login").send(ADMIN);

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe(ADMIN.email);
        expect(res.body.user.passwordHash).toBeUndefined();

        const cookies = res.headers["set-cookie"] as unknown as string[];
        expect(cookies.some((c) => c.startsWith("token=") && c.includes("HttpOnly"))).toBe(true);
    });

    it("rejects a wrong password", async () => {
        await createAdmin();
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: ADMIN.email, password: "wrong" });
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Invalid credentials");
    });

    it("gives the same error for an unknown email", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "nobody@test.com", password: "whatever" });
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Invalid credentials");
    });

    it("validates the request body", async () => {
        const res = await request(app).post("/api/auth/login").send({ email: "not-an-email" });
        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
    });
});

describe("GET /api/auth/me", () => {
    it("rejects requests without a cookie", async () => {
        const res = await request(app).get("/api/auth/me");
        expect(res.status).toBe(401);
    });

    it("rejects a tampered token", async () => {
        const res = await request(app).get("/api/auth/me").set("Cookie", "token=garbage");
        expect(res.status).toBe(401);
    });

    it("returns the current user when logged in", async () => {
        const agent = await loginAgent();
        const res = await agent.get("/api/auth/me");
        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe(ADMIN.email);
    });
});

describe("POST /api/auth/logout", () => {
    it("clears the session", async () => {
        const agent = await loginAgent();
        await agent.post("/api/auth/logout").expect(200);
        await agent.get("/api/auth/me").expect(401);
    });
});

describe("route protection", () => {
    it.each(["/api/doctors", "/api/patients", "/api/dashboard/stats"])(
        "blocks %s without login",
        async (path) => {
            const res = await request(app).get(path);
            expect(res.status).toBe(401);
        }
    );
});