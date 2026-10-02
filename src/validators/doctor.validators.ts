import { z } from "zod";

export const createDoctorSchema = z.object({
    name: z.string().trim().min(2).max(100),
    specialization: z.string().trim().min(2).max(100),
    hospital: z.string().trim().min(2).max(150),
    phone: z.string().trim().min(7).max(20),
    email: z.string().trim().toLowerCase().email(),
});

export const listDoctorsQuerySchema = z.object({
    q: z.string().trim().max(100).optional(),
    specialization: z.string().trim().optional(),
    hospital: z.string().trim().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    sort: z.enum(["newest", "oldest", "name"]).default("newest"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>;