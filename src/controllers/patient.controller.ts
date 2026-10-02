import { Request, Response } from "express";
import { QueryFilter, isValidObjectId } from "mongoose";
import { Doctor, Patient, PatientDoc } from "../models";
import { ApiError } from "../utils/ApiError";
import { escapeRegex } from "../utils/escapeRegex";
import { ListPatientsQuery } from "../validators/patient.validators";

const SORTS = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    name: { name: 1 },
} as const;

function assertId(id: unknown, label: string) {
    if (!isValidObjectId(id)) throw new ApiError(400, `Invalid ${label} id`);
}

async function runList(query: ListPatientsQuery, forcedDoctorId?: string) {
    const { q, condition, gender, doctor, from, to, sort, page, limit } = query;

    const filter: QueryFilter<PatientDoc> = {};

    const doctorId = forcedDoctorId ?? doctor;
    if (doctorId) filter.doctor = doctorId;
    if (condition) filter.condition = condition;
    if (gender) filter.gender = gender;

    if (from || to) {
        const range: { $gte?: Date; $lte?: Date } = {};
        if (from) range.$gte = from;
        if (to) range.$lte = to;
        filter.createdAt = range;
    }

    if (q) {
        const wordStart = `(^|[\\s.])${escapeRegex(q)}`;
        filter.$or = [
            { name: { $regex: wordStart, $options: "i" } },
            { condition: { $regex: wordStart, $options: "i" } },
        ];
    }

    const [items, total] = await Promise.all([
        Patient.find(filter)
            .sort(SORTS[sort])
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("doctor", "name specialization") // only the fields the UI needs
            .lean(),
        Patient.countDocuments(filter),
    ]);

    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

// GET /api/patients
export async function listPatients(_req: Request, res: Response) {
    res.json(await runList(res.locals.query as ListPatientsQuery));
}

// GET /api/doctors/:id/patients
export async function listDoctorPatients(req: Request, res: Response) {
    const { id } = req.params;
    assertId(id, "doctor");
    if (!(await Doctor.exists({ _id: id }))) throw new ApiError(404, "Doctor not found");
    res.json(await runList(res.locals.query as ListPatientsQuery, id as string));
}

// POST /api/doctors/:id/patients
export async function addPatientToDoctor(req: Request, res: Response) {
    const { id } = req.params;
    assertId(id, "doctor");
    if (!(await Doctor.exists({ _id: id }))) throw new ApiError(404, "Doctor not found");

    const patient = await Patient.create({ ...req.body, doctor: id });
    res.status(201).json({ patient });
}

// PATCH /api/patients/:id
export async function updatePatient(req: Request, res: Response) {
    const { id } = req.params;
    assertId(id, "patient");

    if (req.body.doctor && !(await Doctor.exists({ _id: req.body.doctor }))) {
        throw new ApiError(404, "Doctor not found");
    }

    const patient = await Patient.findByIdAndUpdate(id, req.body, {
        returnDocument: "after",
        runValidators: true,
    }).lean();
    if (!patient) throw new ApiError(404, "Patient not found");
    res.json({ patient });
}

// DELETE /api/patients/:id
export async function deletePatient(req: Request, res: Response) {
    const { id } = req.params;
    assertId(id, "patient");
    const deleted = await Patient.findByIdAndDelete(id).lean();
    if (!deleted) throw new ApiError(404, "Patient not found");
    res.json({ message: "Patient deleted" });
}

// DELETE /api/doctors/:id/patients/:patientId
export async function deletePatientFromDoctor(req: Request, res: Response) {
    const { id, patientId } = req.params;
    assertId(id, "doctor");
    assertId(patientId, "patient");
    const deleted = await Patient.findOneAndDelete({ _id: patientId, doctor: id }).lean();
    if (!deleted) throw new ApiError(404, "Patient not found for this doctor");
    res.json({ message: "Patient deleted" });
}

// GET /api/patients/filters
export async function getPatientFilters(_req: Request, res: Response) {
    const conditions = await Patient.distinct("condition");
    res.json({ conditions: conditions.sort() });
}