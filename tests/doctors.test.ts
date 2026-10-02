import { describe, expect, it } from "vitest";
import { Doctor, Patient } from "../src/models";
import { createDoctorInDb, doctorData, loginAgent } from "./helpers";

describe("POST /api/doctors", () => {
    it("creates a doctor", async () => {
        const agent = await loginAgent();
        const res = await agent.post("/api/doctors").send(doctorData());
        expect(res.status).toBe(201);
        expect(res.body.doctor.email).toBe("ayesha@example.com");
        expect(await Doctor.countDocuments()).toBe(1);
    });

    it("normalizes the email to lowercase", async () => {
        const agent = await loginAgent();
        const res = await agent.post("/api/doctors").send(doctorData({ email: "AYESHA@Example.COM" }));
        expect(res.status).toBe(201);
        expect(res.body.doctor.email).toBe("ayesha@example.com");
    });

    it("rejects a duplicate email with 409", async () => {
        const agent = await loginAgent();
        await agent.post("/api/doctors").send(doctorData()).expect(201);
        const res = await agent.post("/api/doctors").send(doctorData());
        expect(res.status).toBe(409);
    });

    it("rejects missing fields with 400", async () => {
        const agent = await loginAgent();
        const { hospital, ...incomplete } = doctorData();
        const res = await agent.post("/api/doctors").send(incomplete);
        expect(res.status).toBe(400);
        expect(res.body.errors.hospital).toBeDefined();
    });
});

describe("GET /api/doctors", () => {
    it("paginates and reports meta", async () => {
        const agent = await loginAgent();
        for (let i = 0; i < 12; i++) {
            await createDoctorInDb({ name: `Dr. Test ${i}`, email: `d${i}@example.com` });
        }
        const res = await agent.get("/api/doctors?page=2&limit=5");
        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(5);
        expect(res.body.meta).toEqual({ total: 12, page: 2, limit: 5, totalPages: 3 });
    });

    it("searches by the start of any word in the name", async () => {
        const agent = await loginAgent();
        await createDoctorInDb();
        await createDoctorInDb({ name: "Dr. Karim Hossain", email: "karim@example.com" });

        const byFirst = await agent.get("/api/doctors?q=ayes");
        expect(byFirst.body.items).toHaveLength(1);
        const byLast = await agent.get("/api/doctors?q=hoss");
        expect(byLast.body.items[0].name).toBe("Dr. Karim Hossain");
    });

    it("treats regex characters in search as plain text", async () => {
        const agent = await loginAgent();
        await createDoctorInDb();
        const res = await agent.get("/api/doctors?q=" + encodeURIComponent(".*"));
        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(0);
    });

    it("filters by specialization and hospital", async () => {
        const agent = await loginAgent();
        await createDoctorInDb();
        await createDoctorInDb({
            email: "b@example.com",
            specialization: "Neurology",
            hospital: "United Hospital",
        });
        const res = await agent.get("/api/doctors?specialization=Neurology");
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].hospital).toBe("United Hospital");

        const none = await agent.get("/api/doctors?specialization=Neurology&hospital=Square Hospital");
        expect(none.body.items).toHaveLength(0);
    });

    it("filters by date range", async () => {
        const agent = await loginAgent();
        await Doctor.create({ ...doctorData(), createdAt: new Date("2026-01-10") });
        await Doctor.create({
            ...doctorData({ email: "new@example.com" }),
            createdAt: new Date("2026-03-10"),
        });
        const res = await agent.get("/api/doctors?from=2026-03-01&to=2026-03-31");
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].email).toBe("new@example.com");
    });

    it("sorts by name", async () => {
        const agent = await loginAgent();
        await createDoctorInDb({ name: "Dr. Zed", email: "z@example.com" });
        await createDoctorInDb({ name: "Dr. Amy", email: "a@example.com" });
        const res = await agent.get("/api/doctors?sort=name");
        expect(res.body.items.map((d: any) => d.name)).toEqual(["Dr. Amy", "Dr. Zed"]);
    });

    it("rejects an invalid limit", async () => {
        const agent = await loginAgent();
        const res = await agent.get("/api/doctors?limit=1000");
        expect(res.status).toBe(400);
    });

    it("returns distinct filter options", async () => {
        const agent = await loginAgent();
        await createDoctorInDb();
        await createDoctorInDb({ email: "b@example.com" });
        const res = await agent.get("/api/doctors/filters");
        expect(res.body.specializations).toEqual(["Cardiology"]);
        expect(res.body.hospitals).toEqual(["Square Hospital"]);
    });
});

describe("GET /api/doctors/:id", () => {
    it("returns a doctor", async () => {
        const agent = await loginAgent();
        const doc = await createDoctorInDb();
        const res = await agent.get(`/api/doctors/${doc.id}`);
        expect(res.status).toBe(200);
        expect(res.body.doctor.name).toBe(doc.name);
    });

    it("returns 400 for a malformed id and 404 for an unknown one", async () => {
        const agent = await loginAgent();
        await agent.get("/api/doctors/not-an-id").expect(400);
        await agent.get("/api/doctors/64b7f0f2a1b2c3d4e5f6a7b8").expect(404);
    });
});

describe("DELETE /api/doctors/:id", () => {
    it("deletes the doctor and their patients", async () => {
        const agent = await loginAgent();
        const doc = await createDoctorInDb();
        const other = await createDoctorInDb({ email: "other@example.com" });
        const base = { age: 30, gender: "male" as const, condition: "Asthma" }; await Patient.create([
            { ...base, name: "P One", doctor: doc.id },
            { ...base, name: "P Two", doctor: doc.id },
            { ...base, name: "P Three", doctor: other.id },
        ]);

        const res = await agent.delete(`/api/doctors/${doc.id}`);
        expect(res.status).toBe(200);
        expect(res.body.patientsDeleted).toBe(2);
        expect(await Doctor.countDocuments()).toBe(1);
        expect(await Patient.countDocuments()).toBe(1);
    });

    it("returns 404 for an unknown doctor", async () => {
        const agent = await loginAgent();
        await agent.delete("/api/doctors/64b7f0f2a1b2c3d4e5f6a7b8").expect(404);
    });
});