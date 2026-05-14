import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html", "json-summary"],
      reportsDirectory: "./coverage",
      // Nur Dateien mit echtem Runtime-Code einschliessen
      // Ausgeschlossen: Typdefinitionen, Next.js-Middleware (braucht Runtime), next-intl Helpers
      include: [
        "src/lib/utils/**/*.ts",
        "src/lib/feature-gate.ts",
        "src/lib/stripe.ts",
        "src/lib/ai/max.ts",
        "src/i18n/routing.ts",
      ],
      exclude: [
        "src/lib/types/**",
        "src/lib/supabase/**",
        "node_modules/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/__tests__/**",
      ],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
