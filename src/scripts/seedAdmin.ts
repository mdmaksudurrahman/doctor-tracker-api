import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../models";

async function run() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");

    await mongoose.connect(process.env.MONGODB_URI!);

    const passwordHash = await bcrypt.hash(password, 12);
    await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { name: "Admin", email, passwordHash, role: "admin" },
        { upsert: true, returnDocument: "after" }
    );

    console.log(`Admin ready: ${email}`);
    await mongoose.disconnect();
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});