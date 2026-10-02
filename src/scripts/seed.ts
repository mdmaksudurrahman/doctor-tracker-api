import "dotenv/config";
import mongoose from "mongoose";
import { Doctor, Patient } from "../models";

const DAY = 24 * 60 * 60 * 1000;
const DOCTOR_COUNT = 30;
const PATIENT_COUNT = 400;

const FIRST = ["Ayesha", "Rahim", "Nusrat", "Imran", "Farhana", "Tanvir", "Sadia", "Kamal", "Mehnaz", "Arif", "Shirin", "Rafiq", "Tasnim", "Jamal", "Nabila"];
const LAST = ["Rahman", "Hossain", "Ahmed", "Chowdhury", "Islam", "Khan", "Akter", "Uddin", "Sarker", "Mahmud"];
const SPECIALIZATIONS = ["Cardiology", "Neurology", "Orthopedics", "Dermatology", "Pediatrics", "Endocrinology", "Pulmonology", "General Medicine"];
const HOSPITALS = ["Square Hospital", "United Hospital", "Evercare Hospital", "Labaid Hospital", "Popular Medical College Hospital", "Ibn Sina Hospital"];
const CONDITIONS = ["Hypertension", "Diabetes", "Asthma", "Migraine", "Arthritis", "Anemia", "Fracture", "Thyroid Disorder", "Skin Allergy", "Back Pain"];
const GENDERS = ["male", "female", "other"] as const;

function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

const phone = () => `01${pick([3, 5, 6, 7, 8, 9])}${Math.floor(10000000 + Math.random() * 90000000)}`;

async function run() {
    await mongoose.connect(process.env.MONGODB_URI!);

    // Only doctors and patients are cleared; the admin user is kept
    await Promise.all([Doctor.deleteMany({}), Patient.deleteMany({})]);

    const now = Date.now();

    const doctors = await Doctor.insertMany(
        Array.from({ length: DOCTOR_COUNT }, (_, i) => {
            const first = pick(FIRST);
            const last = pick(LAST);
            const createdAt = new Date(now - Math.random() * 90 * DAY);
            return {
                name: `Dr. ${first} ${last}`,
                specialization: pick(SPECIALIZATIONS),
                hospital: pick(HOSPITALS),
                phone: phone(),
                email: `${first}.${last}${i}@doctortracker.dev`.toLowerCase(),
                createdAt,
                updatedAt: createdAt,
            };
        })
    );

    const patients = Array.from({ length: PATIENT_COUNT }, () => {
        // Squaring the random number skews patients toward the first doctors,
        // so "patients per doctor" has a visible spread instead of being flat
        const doctor = doctors[Math.floor(Math.random() ** 2 * doctors.length)];
        const start = doctor.createdAt.getTime();
        const createdAt = new Date(start + Math.random() * (now - start));
        return {
            name: `${pick(FIRST)} ${pick(LAST)}`,
            age: Math.floor(Math.random() * 90) + 1,
            gender: pick(GENDERS),
            condition: pick(CONDITIONS),
            phone: phone(),
            doctor: doctor._id,
            createdAt,
            updatedAt: createdAt,
        };
    });
    await Patient.insertMany(patients);

    console.log(`Seeded ${DOCTOR_COUNT} doctors and ${PATIENT_COUNT} patients`);
    await mongoose.disconnect();
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});