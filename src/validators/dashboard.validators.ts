import { z } from "zod";

export const dashboardQuerySchema = z.object({
    days: z.coerce.number().int().min(7).max(365).default(30),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;