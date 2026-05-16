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
        // geo-enrichment.ts: macht externe Nominatim-API-Aufrufe, keine sinnvollen Unit-Tests moeglich
        "src/lib/utils/geo-enrichment.ts",
        "node_modules/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/__tests__/**",
      ],
      thresholds: {
        // Realistische Schwellenwerte fuer aktuelle Codebase
        // (stripe.ts und max.ts haben API-Aufrufe die schwer zu mocken sind)
        branches: 35,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
