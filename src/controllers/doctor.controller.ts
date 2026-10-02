import { Request, Response } from "express";
import { QueryFilter, isValidObjectId } from "mongoose";
import { Doctor, DoctorDoc, Patient } from "../models";
import { ApiError } from "../utils/ApiError";
import { escapeRegex } from "../utils/escapeRegex";
import { ListDoctorsQuery } from "../validators/doctor.validators";

const SORTS = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    name: { name: 1 },
} as const;

export async function listDoctors(_req: Request, res: Response) {
    const { q, specialization, hospital, from, to, sort, page, limit } =
        res.locals.query as ListDoctorsQuery;

    const filter: QueryFilter<DoctorDoc> = {};

    if (specialization) filter.specialization = specialization;
    if (hospital) filter.hospital = hospital;

    if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = from;
        if (to) filter.createdAt.$lte = to;
    }

    if (q) {
        const safe = escapeRegex(q);
        // Matches at the start of the string or after a space/dot, so
        // "ayes" finds "Dr. Ayesha Rahman" and "rahm" finds it too.
        const wordStart = `(^|[\\s.])${safe}`;
        filter.$or = [
            { name: { $regex: wordStart, $options: "i" } },
            { specialization: { $regex: wordStart, $options: "i" } },
            { hospital: { $regex: wordStart, $options: "i" } },
        ];
    }

    const [items, total] = await Promise.all([
        Doctor.find(filter)
            .sort(SORTS[sort])
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Doctor.countDocuments(filter),
    ]);

    res.json({
        items,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
}

export async function getDoctor(req: Request, res: Response) {
    const { id } = req.params;
    if (!isValidObjectId(id)) throw new ApiError(400, "Invalid doctor id");

    const doctor = await Doctor.findById(id).lean();
    if (!doctor) throw new ApiError(404, "Doctor not found");
    res.json({ doctor });
}

export async function createDoctor(req: Request, res: Response) {
    try {
        const doctor = await Doctor.create(req.body);
        res.status(201).json({ doctor });
    } catch (err: any) {
        if (err.code === 11000) throw new ApiError(409, "A doctor with this email already exists");
        throw err;
    }
}

export async function getDoctorFilters(_req: Request, res: Response) {
    // Distinct values to populate the filter dropdowns on the frontend
    const [specializations, hospitals] = await Promise.all([
        Doctor.distinct("specialization"),
        Doctor.distinct("hospital"),
    ]);
    res.json({
        specializations: specializations.sort(),
        hospitals: hospitals.sort(),
    });
}

export async function deleteDoctor(req: Request, res: Response) {
    const { id } = req.params;
    if (!isValidObjectId(id)) throw new ApiError(400, "Invalid doctor id");

    const doctor = await Doctor.findByIdAndDelete(id).lean();
    if (!doctor) throw new ApiError(404, "Doctor not found");

    // No orphaned patients
    const { deletedCount } = await Patient.deleteMany({ doctor: id });
    res.json({ message: "Doctor deleted", patientsDeleted: deletedCount });
}