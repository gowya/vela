import { setupTestDb } from "../../scripts/setup-test-db.mjs";

// Exécuté une seule fois avant toute la suite d'intégration (voir
// vitest.integration.config.ts). Reconstruit le schéma à partir de zéro pour
// garantir que la base de test reflète bien src/lib/schema.sql + migrations,
// même si un run précédent a laissé des tables en place.
export default async function globalSetup() {
  const databaseUrl =
    process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5433/soin_app_test";

  try {
    await setupTestDb(databaseUrl);
  } catch (err) {
    console.error(
      "\nImpossible de préparer la base de test. Le service Postgres est-il démarré ?\n" +
        "  npm run test:db:up\n"
    );
    throw err;
  }
}
