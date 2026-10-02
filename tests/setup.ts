import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach } from "vitest";
import "../src/models";

beforeAll(async () => {
    const uri = process.env.MONGODB_URI!;
    // Safety net: tests wipe collections, so never run against a real database
    if (!new URL(uri).pathname.endsWith("-test")) {
        throw new Error("Refusing to run tests: database name must end with '-test'");
    }
    await mongoose.connect(uri);
    // Make sure indexes (including unique ones) exist before tests run
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
});

beforeEach(async () => {
    await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})));
});

afterAll(async () => {
    await mongoose.disconnect();
});