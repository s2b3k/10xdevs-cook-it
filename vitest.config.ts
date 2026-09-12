import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    test: {
      environment: "node",
      include: ["src/lib/services/__tests__/**/*.integration.test.ts", "src/pages/api/**/*.integration.test.ts"],
      testTimeout: 30_000,
      hookTimeout: 30_000,
      sequence: { concurrent: false },
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
    },
  };
});
