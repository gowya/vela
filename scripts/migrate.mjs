import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import pg from "pg";

const { Client } = pg;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = path.join(ROOT, "src/lib/migrations");

// Trace des migrations appliquées à une base. Sans elle, rien ne signalait qu'un
// fichier mergé n'avait jamais été joué sur Neon (010 puis 014 : la 014 manquante
// faisait échouer toute sauvegarde de consultation en 500).
const CREATE_TRACKING_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

export async function listMigrationFiles() {
  return (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith(".sql")).sort();
}

export async function ensureTrackingTable(client) {
  await client.query(CREATE_TRACKING_TABLE);
}

// Marque des fichiers comme appliqués sans les exécuter : base reconstruite de
// zéro (setup-test-db) ou base existante dont on a vérifié le schéma à la main.
export async function recordMigrations(client, files) {
  for (const file of files) {
    await client.query(
      "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING",
      [file]
    );
  }
}

async function getPendingMigrations(client) {
  const { rows: tableRows } = await client.query(
    "SELECT to_regclass('public.schema_migrations') AS name"
  );
  const files = await listMigrationFiles();
  if (!tableRows[0].name) return { tracked: false, pending: files };

  const { rows } = await client.query("SELECT filename FROM schema_migrations");
  const applied = new Set(rows.map((row) => row.filename));
  return { tracked: true, pending: files.filter((file) => !applied.has(file)) };
}

async function applyMigrations(client, files) {
  await ensureTrackingTable(client);
  for (const file of files) {
    const migrationSql = await readFile(path.join(MIGRATIONS_DIR, file), "utf-8");
    // Une transaction par fichier : une migration qui échoue n'est ni appliquée à
    // moitié ni marquée comme faite, et les précédentes restent acquises.
    await client.query("BEGIN");
    try {
      await client.query(migrationSql);
      await recordMigrations(client, [file]);
      await client.query("COMMIT");
      console.log(`  ✓ ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`Échec de ${file} (annulée, les suivantes n'ont pas été jouées) : ${describeError(err)}`);
    }
  }
}

// Un échec de connexion (ECONNREFUSED sur plusieurs adresses) est une
// AggregateError au message vide : on remonte au code ou aux erreurs internes.
function describeError(err) {
  if (err.message) return err.message;
  if (err.errors?.length) return err.errors.map(describeError).join(" ; ");
  return err.code ?? String(err);
}

function describeTarget(databaseUrl) {
  const url = new URL(databaseUrl);
  return `${url.hostname}${url.pathname}`;
}

// Usage :
//   npm run db:migrate:status            liste les migrations en attente (exit 1 s'il y en a)
//   npm run db:migrate                   applique les migrations en attente
//   npm run db:migrate -- --baseline     marque toutes les migrations comme appliquées sans
//                                        les exécuter (une seule fois, sur une base existante)
async function main() {
  // Mêmes fichiers et même priorité que `next dev` (.env.development.local avant
  // .env.local) : le script vise la base sur laquelle tourne l'app en local.
  nextEnv.loadEnvConfig(ROOT, true);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL manquante (ni dans l'environnement, ni dans les fichiers .env).");
  }
  const mode = process.argv.includes("--baseline")
    ? "baseline"
    : process.argv.includes("--apply")
      ? "apply"
      : "status";

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    console.log(`Base : ${describeTarget(databaseUrl)}`);

    if (mode === "baseline") {
      const files = await listMigrationFiles();
      await ensureTrackingTable(client);
      await recordMigrations(client, files);
      console.log(`${files.length} migrations marquées comme appliquées (aucune exécutée).`);
      return;
    }

    const { tracked, pending } = await getPendingMigrations(client);
    // Sans trace, --apply rejouerait toutes les migrations sur une base qui les a
    // peut-être déjà : on exige un baseline explicite d'abord.
    if (!tracked) {
      console.log(
        "Table schema_migrations absente : vérifier le schéma à la main puis lancer " +
          "`npm run db:migrate -- --baseline`."
      );
      process.exitCode = 1;
      return;
    }
    if (pending.length === 0) {
      console.log("Base à jour, aucune migration en attente.");
      return;
    }

    if (mode === "status") {
      console.log(`${pending.length} migration(s) en attente :`);
      for (const file of pending) console.log(`  - ${file}`);
      console.log("Appliquer avec `npm run db:migrate`.");
      process.exitCode = 1;
      return;
    }

    console.log(`Application de ${pending.length} migration(s) :`);
    await applyMigrations(client, pending);
    console.log("Terminé.");
  } finally {
    await client.end();
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(describeError(err));
    process.exitCode = 1;
  });
}
