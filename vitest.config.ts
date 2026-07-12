import { defineConfig } from "vitest/config";
import path from "path";

// Tests unitaires : logique pure uniquement (aucune I/O réseau/DB).
// Les tests d'intégration vivent dans tests/integration, voir vitest.integration.config.ts.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
