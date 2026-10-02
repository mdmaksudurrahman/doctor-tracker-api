import { z } from "zod";

const patientFields = {
    name: z.string().trim().min(2).max(100),
    age: z.coerce.number().int().min(0).max(130),
    gender: z.enum(["male", "female", "other"]),
    condition: z.string().trim().min(2).max(150),
    phone: z.string().trim().min(7).max(20).optional(),
};

// Doctor is taken from the URL when adding under a doctor
export const createPatientSchema = z.object(patientFields);

// Edit: any subset of fields, and the doctor can be reassigned
export const updatePatientSchema = z
    .object({ ...patientFields, doctor: z.string().length(24) })
    .partial()
    .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

export const listPatientsQuerySchema = z.object({
    q: z.string().trim().max(100).optional(),
    condition: z.string().trim().optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    doctor: z.string().length(24).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    sort: z.enum(["newest", "oldest", "name"]).default("newest"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;