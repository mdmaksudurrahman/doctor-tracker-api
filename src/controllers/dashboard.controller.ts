import { Request, Response } from "express";
import { Doctor, Patient } from "../models";
import { DashboardQuery } from "../validators/dashboard.validators";

const DAY = 24 * 60 * 60 * 1000;

function startOfUtcDay(d: Date) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

type CountRow = { _id: string; count: number };

export async function getDashboardStats(_req: Request, res: Response) {
    const { days } = res.locals.query as DashboardQuery;
    const start = new Date(startOfUtcDay(new Date()).getTime() - (days - 1) * DAY);

    const [
        totalDoctors,
        totalPatients,
        newDoctors,
        newPatients,
        perDoctor,
        perDay,
        conditions,
        genders,
        specializations,
    ] = await Promise.all([
        // Metadata-based count: instant, no collection scan
        Doctor.estimatedDocumentCount(),
        Patient.estimatedDocumentCount(),
        Doctor.countDocuments({ createdAt: { $gte: start } }),
        Patient.countDocuments({ createdAt: { $gte: start } }),

        // Top 10 doctors by patient count. Group first, then look up names
        // for only 10 doctors instead of joining every patient.
        Patient.aggregate([
            { $group: { _id: "$doctor", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: Doctor.collection.name,
                    localField: "_id",
                    foreignField: "_id",
                    pipeline: [{ $project: { name: 1, specialization: 1 } }],
                    as: "doctor",
                },
            },
            { $unwind: "$doctor" },
            {
                $project: {
                    _id: 0,
                    doctorId: "$_id",
                    name: "$doctor.name",
                    specialization: "$doctor.specialization",
                    count: 1,
                },
            },
        ]),

        // New patients per day inside the selected range
        Patient.aggregate<CountRow>([
            { $match: { createdAt: { $gte: start } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 },
                },
            },
        ]),

        Patient.aggregate<CountRow>([
            { $group: { _id: "$condition", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 },
        ]),

        Patient.aggregate<CountRow>([{ $group: { _id: "$gender", count: { $sum: 1 } } }]),

        Doctor.aggregate<CountRow>([
            { $group: { _id: "$specialization", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
    ]);

    // Fill days with no patients with 0 so the line chart has no gaps
    const byDay = new Map(perDay.map((d) => [d._id, d.count]));
    const patientsOverTime = Array.from({ length: days }, (_, i) => {
        const date = new Date(start.getTime() + i * DAY).toISOString().slice(0, 10);
        return { date, count: byDay.get(date) ?? 0 };
    });

    const rename = (rows: CountRow[]) => rows.map((r) => ({ name: r._id, count: r.count }));

    res.json({
        range: { days, from: start },
        totals: {
            doctors: totalDoctors,
            patients: totalPatients,
            newDoctors,
            newPatients,
            avgPatientsPerDoctor: totalDoctors ? Math.round((totalPatients / totalDoctors) * 10) / 10 : 0,
        },
        patientsPerDoctor: perDoctor,
        patientsOverTime,
        conditions: rename(conditions),
        genders: rename(genders),
        specializations: rename(specializations),
    });
}