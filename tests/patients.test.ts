import { describe, expect, it } from "vitest";
import { Patient } from "../src/models";
import { createDoctorInDb, loginAgent, patientData } from "./helpers";

describe("doctor-scoped patient routes", () => {
    it("adds a patient under a doctor", async () => {
        const agent = await loginAgent();
        const doc = await createDoctorInDb();
        const res = await agent.post(`/api/doctors/${doc.id}/patients`).send(patientData());
        expect(res.status).toBe(201);
        expect(res.body.patient.doctor).toBe(doc.id);
    });

    it("returns 404 when the doctor does not exist", async () => {
        const agent = await loginAgent();
        const res = await agent
            .post("/api/doctors/64b7f0f2a1b2c3d4e5f6a7b8/patients")
            .send(patientData());
        expect(res.status).toBe(404);
    });

    it("validates the patient body", async () => {
        const agent = await loginAgent();
        const doc = await createDoctorInDb();
        const res = await agent
            .post(`/api/doctors/${doc.id}/patients`)
            .send(patientData({ age: 500, gender: "robot" }));
        expect(res.status).toBe(400);
        expect(res.body.errors.age).toBeDefined();
        expect(res.body.errors.gender).toBeDefined();
    });

    it("lists only that doctor's patients, with the doctor populated", async () => {
        const agent = await loginAgent();
        const a = await createDoctorInDb();
        const b = await createDoctorInDb({ email: "b@example.com" });
        await Patient.create([
            { ...patientData({ name: "For A" }), doctor: a.id },
            { ...patientData({ name: "For B" }), doctor: b.id },
        ]);
        const res = await agent.get(`/api/doctors/${a.id}/patients`);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].name).toBe("For A");
        expect(res.body.items[0].doctor.name).toBe(a.name);
    });

    it("deletes a patient only through the correct doctor", async () => {
        const agent = await loginAgent();
        const a = await createDoctorInDb();
        const b = await createDoctorInDb({ email: "b@example.com" });
        const p = await Patient.create({ ...patientData(), doctor: a.id });

        await agent.delete(`/api/doctors/${b.id}/patients/${p.id}`).expect(404);
        expect(await Patient.countDocuments()).toBe(1);

        await agent.delete(`/api/doctors/${a.id}/patients/${p.id}`).expect(200);
        expect(await Patient.countDocuments()).toBe(0);
    });
});

describe("GET /api/patients", () => {
    it("paginates across all doctors", async () => {
        const agent = await loginAgent();
        const doc = await createDoctorInDb();
        await Patient.insertMany(
            Array.from({ length: 15 }, (_, i) => ({ ...patientData({ name: `Patient ${i}` }), doctor: doc.id }))
        );
        const res = await agent.get("/api/patients?page=2&limit=10");
        expect(res.body.items).toHaveLength(5);
        expect(res.body.meta.total).toBe(15);
        expect(res.body.meta.totalPages).toBe(2);
    });

    it("searches by name and by condition", async () => {
        const agent = await loginAgent();
        const doc = await createDoctorInDb();
        await Patient.create([
            { ...patientData({ name: "Rahim Khan", condition: "Asthma" }), doctor: doc.id },
            { ...patientData({ name: "Nusrat Akter", condition: "Migraine" }), doctor: doc.id },
        ]);
        const byName = await agent.get("/api/patients?q=nusr");
        expect(byName.body.items).toHaveLength(1);
        const byCondition = await agent.get("/api/patients?q=asth");
        expect(byCondition.body.items[0].name).toBe("Rahim Khan");
    });

    it("filters by condition, gender, doctor and date", async () => {
        const agent = await loginAgent();
        const a = await createDoctorInDb();
        const b = await createDoctorInDb({ email: "b@example.com" });
        await Patient.create([
            { ...patientData({ condition: "Asthma" }), doctor: a.id, createdAt: new Date("2026-02-01") },
            { ...patientData({ condition: "Asthma", gender: "female" }), doctor: b.id, createdAt: new Date("2026-04-01") },
            { ...patientData({ condition: "Migraine" }), doctor: b.id, createdAt: new Date("2026-04-02") },
        ]);

        expect((await agent.get("/api/patients?condition=Asthma")).body.items).toHaveLength(2);
        expect((await agent.get("/api/patients?gender=female")).body.items).toHaveLength(1);
        expect((await agent.get(`/api/patients?doctor=${b.id}`)).body.items).toHaveLength(2);
        expect((await agent.get("/api/patients?from=2026-03-01")).body.items).toHaveLength(2);
        expect(
            (await agent.get(`/api/patients?doctor=${b.id}&condition=Asthma&to=2026-04-15`)).body.items
        ).toHaveLength(1);
    });

    it("returns distinct conditions", async () => {
        const agent = await loginAgent();
        const doc = await createDoctorInDb();
        await Patient.create([
            { ...patientData({ condition: "Asthma" }), doctor: doc.id },
            { ...patientData({ condition: "Asthma" }), doctor: doc.id },
            { ...patientData({ condition: "Migraine" }), doctor: doc.id },
        ]);
        const res = await agent.get("/api/patients/filters");
        expect(res.body.conditions).toEqual(["Asthma", "Migraine"]);
    });
});

describe("PATCH /api/patients/:id", () => {
    it("updates fields", async () => {
        const agent = await loginAgent();
        const doc = await createDoctorInDb();
        const p = await Patient.create({ ...patientData(), doctor: doc.id });
        const res = await agent.patch(`/api/patients/${p.id}`).send({ age: 46, condition: "Diabetes" });
        expect(res.status).toBe(200);
        expect(res.body.patient.age).toBe(46);
        expect(res.body.patient.condition).toBe("Diabetes");
    });

    it("reassigns to another doctor, but not to a missing one", async () => {
        const agent = await loginAgent();
        const a = await createDoctorInDb();
        const b = await createDoctorInDb({ email: "b@example.com" });
        const p = await Patient.create({ ...patientData(), doctor: a.id });

        await agent.patch(`/api/patients/${p.id}`).send({ doctor: b.id }).expect(200);
        expect((await Patient.findById(p.id))!.doctor.toString()).toBe(b.id);

        await agent
            .patch(`/api/patients/${p.id}`)
            .send({ doctor: "64b7f0f2a1b2c3d4e5f6a7b8" })
            .expect(404);
    });

    it("rejects empty and invalid updates", async () => {
        const agent = await loginAgent();
        const doc = await createDoctorInDb();
        const p = await Patient.create({ ...patientData(), doctor: doc.id });
        await agent.patch(`/api/patients/${p.id}`).send({}).expect(400);
        await agent.patch(`/api/patients/${p.id}`).send({ age: 500 }).expect(400);
    });

    it("returns 404 for an unknown patient", async () => {
        const agent = await loginAgent();
        await agent.patch("/api/patients/64b7f0f2a1b2c3d4e5f6a7b8").send({ age: 20 }).expect(404);
    });
});

describe("DELETE /api/patients/:id", () => {
    it("deletes, then returns 404 the second time", async () => {
        const agent = await loginAgent();
        const doc = await createDoctorInDb();
        const p = await Patient.create({ ...patientData(), doctor: doc.id });
        await agent.delete(`/api/patients/${p.id}`).expect(200);
        await agent.delete(`/api/patients/${p.id}`).expect(404);
    });
});