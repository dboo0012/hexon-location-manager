import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Integration tests share one database, so run files sequentially.
    fileParallelism: false,
    setupFiles: ["./test/setup.ts"],
  },
});
