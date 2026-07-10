import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_PATH = path.join(ROOT, "src/lib/schema.sql");
const MIGRATIONS_DIR = path.join(ROOT, "src/lib/migrations");

// Reconstruit le schéma de zéro à partir de src/lib/schema.sql + les migrations
// numérotées, dans l'ordre — la même séquence que celle documentée dans
// claude/admin_runbook.md pour construire un Postgres à jour.
export async function setupTestDb(databaseUrl) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");

    const schemaSql = await readFile(SCHEMA_PATH, "utf-8");
    await client.query(schemaSql);

    const migrationFiles = (await readdir(MIGRATIONS_DIR))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      const migrationSql = await readFile(path.join(MIGRATIONS_DIR, file), "utf-8");
      await client.query(migrationSql);
    }
  } finally {
    await client.end();
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const databaseUrl =
    process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5433/soin_app_test";
  setupTestDb(databaseUrl)
    .then(() => {
      console.log("Base de test prête.");
    })
    .catch((err) => {
      console.error("Échec de la préparation de la base de test :", err);
      process.exitCode = 1;
    });
}
