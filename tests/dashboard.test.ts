import { describe, expect, it } from "vitest";
import { Patient } from "../src/models";
import { createDoctorInDb, loginAgent } from "./helpers";

const base = { age: 30, gender: "male" as const, condition: "Asthma" };
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

describe("GET /api/dashboard/stats", () => {
    it("returns zeros for an empty database", async () => {
        const agent = await loginAgent();
        const res = await agent.get("/api/dashboard/stats?days=7");
        expect(res.status).toBe(200);
        expect(res.body.totals).toMatchObject({ doctors: 0, patients: 0, avgPatientsPerDoctor: 0 });
        expect(res.body.patientsPerDoctor).toEqual([]);
        expect(res.body.patientsOverTime).toHaveLength(7);
    });

    it("aggregates totals, per-doctor counts and breakdowns", async () => {
        const agent = await loginAgent();
        const a = await createDoctorInDb({ name: "Dr. Busy" });
        const b = await createDoctorInDb({
            name: "Dr. Quiet",
            email: "b@example.com",
            specialization: "Neurology",
        });
        await Patient.create([
            { ...base, name: "P1", doctor: a.id },
            { ...base, name: "P2", doctor: a.id },
            { ...base, name: "P3", doctor: a.id, condition: "Migraine", gender: "female" },
            { ...base, name: "P4", doctor: b.id },
        ]);

        const res = await agent.get("/api/dashboard/stats?days=30");
        expect(res.body.totals.doctors).toBe(2);
        expect(res.body.totals.patients).toBe(4);
        expect(res.body.totals.avgPatientsPerDoctor).toBe(2);

        expect(res.body.patientsPerDoctor[0]).toMatchObject({ name: "Dr. Busy", count: 3 });
        expect(res.body.patientsPerDoctor[1]).toMatchObject({ name: "Dr. Quiet", count: 1 });

        expect(res.body.conditions[0]).toEqual({ name: "Asthma", count: 3 });
        expect(res.body.genders).toEqual(
            expect.arrayContaining([
                { name: "male", count: 3 },
                { name: "female", count: 1 },
            ])
        );
        expect(res.body.specializations).toEqual(
            expect.arrayContaining([
                { name: "Cardiology", count: 1 },
                { name: "Neurology", count: 1 },
            ])
        );
    });

    it("zero-fills the daily series and respects the date range", async () => {
        const agent = await loginAgent();
        const doc = await createDoctorInDb();
        await Patient.create([
            { ...base, name: "Today", doctor: doc.id },
            { ...base, name: "Recent", doctor: doc.id, createdAt: daysAgo(2) },
            { ...base, name: "Old", doctor: doc.id, createdAt: daysAgo(60) },
        ]);

        const res = await agent.get("/api/dashboard/stats?days=7");
        const series = res.body.patientsOverTime;
        expect(series).toHaveLength(7);

        const sum = series.reduce((s: number, d: { count: number }) => s + d.count, 0);
        expect(sum).toBe(2); // the 60-day-old patient is outside the range
        expect(series.some((d: { count: number }) => d.count === 0)).toBe(true);
        expect(res.body.totals.patients).toBe(3); // totals are not range-limited
        expect(res.body.totals.newPatients).toBe(2);
    });

    it("rejects an out-of-range days value", async () => {
        const agent = await loginAgent();
        await agent.get("/api/dashboard/stats?days=2").expect(400);
        await agent.get("/api/dashboard/stats?days=9999").expect(400);
    });
});