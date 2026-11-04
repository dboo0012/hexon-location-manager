import { defineConfig } from "vitest/config";

const shared = {
  environment: "node" as const,
  // Integration tests share one database, so run files sequentially.
  fileParallelism: false,
  setupFiles: ["./test/setup.ts"],
};

export default defineConfig({
  test: {
    // The API suite runs against both databases: PostgreSQL (Node server / Docker) and
    // Cloudflare D1 (the Worker deployment). `npm test -- --project pg` runs just one.
    projects: [
      { test: { ...shared, name: "pg", env: { TEST_DB: "pg" } } },
      {
        test: {
          ...shared,
          name: "d1",
          env: { TEST_DB: "d1" },
          // The ZIP parser has no database dependency, so it only needs to run once.
          exclude: ["**/node_modules/**", "test/locationFile.test.ts"],
        },
      },
    ],
  },
});
