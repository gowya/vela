import { defineConfig } from "vitest/config";
import path from "path";

// Tests d'intégration : routes API + logique DB contre un vrai Postgres jetable
// (voir docker-compose.test.yml). Les identifiants ci-dessous sont fixes et
// partagés avec le service Postgres du job CI (.github/workflows/test.yml) —
// aucun fichier .env.test à gérer.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    testTimeout: 15_000,
    // Les tests partagent un même pool pg (src/lib/db.ts) et truncatent la DB
    // entre chaque test : les faire tourner en parallèle sur plusieurs workers
    // provoquerait des interférences entre suites.
    fileParallelism: false,
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5433/soin_app_test",
      NEXTAUTH_SECRET: "test-secret-do-not-use-in-production",
    },
  },
});
