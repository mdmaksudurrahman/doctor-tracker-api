import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        setupFiles: ["./tests/setup.ts"],
        fileParallelism: false, // test files share one database, so run them one at a time
        testTimeout: 15000,
        env: {
            NODE_ENV: "test",
            MONGODB_URI:
                process.env.TEST_MONGODB_URI ?? "mongodb://localhost:27017/doctor-tracker-test",
            JWT_SECRET: "test-secret-test-secret-123",
            CLIENT_URL: "http://localhost:3000",
        },
    },
});