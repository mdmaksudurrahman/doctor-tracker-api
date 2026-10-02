import { Schema, model, InferSchemaType } from "mongoose";

const patientSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        age: { type: Number, required: true, min: 0, max: 130 },
        gender: { type: String, enum: ["male", "female", "other"], required: true },
        condition: { type: String, required: true, trim: true },
        phone: { type: String, trim: true },
        doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    },
    { timestamps: true }
);

// Patients of one doctor, newest first (doctor detail page)
patientSchema.index({ doctor: 1, createdAt: -1 });
// Filter by condition, newest first (patients page)
patientSchema.index({ condition: 1, createdAt: -1 });
// Default list ordering and date-range filtering
patientSchema.index({ createdAt: -1 });
// Full-text search
patientSchema.index({ name: "text", condition: "text" });

export type PatientDoc = InferSchemaType<typeof patientSchema>;
export const Patient = model("Patient", patientSchema);