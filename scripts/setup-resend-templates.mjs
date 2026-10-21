import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resend } from "resend";

// Synchronise les templates transactionnels versionnés dans emails/ vers le
// compte Resend, puis les publie (un template créé ou mis à jour reste en
// `draft` tant qu'il n'est pas publié, et n'est donc pas envoyable).
//
// La clé n'est jamais lue depuis un fichier du dépôt : elle doit être fournie
// dans l'environnement au moment de l'appel.
//
//   RESEND_API_KEY=re_xxx npm run resend:templates
//
// Idempotent : relancer le script met à jour le template existant (retrouvé
// par son alias) au lieu d'en créer un doublon.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Seul password-reset est géré ici pour l'instant. Les trois templates
// historiques (email-confirmation, welcome-email, account-deletion-confirmation)
// restent volontairement hors de cette liste : leurs versions en ligne n'ont pas
// été comparées au dépôt, et les ajouter ici les écraserait.
//
// `from` n'est jamais envoyé : `src/lib/email.ts` passe le sien à chaque envoi.
const TEMPLATES = [
  {
    file: "emails/4-password-reset.html",
    alias: "password-reset",
    name: "Vela — Réinitialisation du mot de passe",
    subject: "Réinitialisez votre mot de passe",
    variables: [{ key: "reset_url", type: "string" }],
    // Valeurs factices pour l'envoi de contrôle (voir assertRenders).
    sample: { reset_url: "https://vela.example/reset-password?token=test" },
  },
];

// Resend interpole en accolades triples ; les doubles ressortent littérales
// dans l'email envoyé. On échoue avant l'appel réseau plutôt que d'expédier un
// template cassé.
function assertPlaceholders(html, variables, file) {
  for (const { key } of variables) {
    if (!html.includes(`{{{${key}}}}`)) {
      throw new Error(`${file} : placeholder {{{${key}}}} introuvable.`);
    }
  }

  const doubleOnly = html.match(/(?<!\{)\{\{(?!\{)\s*[\w.]+\s*\}\}(?!\})/g);
  if (doubleOnly) {
    throw new Error(
      `${file} : accolades doubles détectées (${[...new Set(doubleOnly)].join(", ")}). ` +
        `Resend exige des accolades triples.`
    );
  }
}

async function findByAlias(resend, alias) {
  const { data, error } = await resend.templates.list({ limit: 100 });
  if (error) {
    throw new Error(`Impossible de lister les templates : ${error.message}`);
  }
  return data?.data?.find((template) => template.alias === alias) ?? null;
}

async function syncTemplate(resend, definition) {
  const html = await readFile(path.join(ROOT, definition.file), "utf-8");
  assertPlaceholders(html, definition.variables, definition.file);

  const existing = await findByAlias(resend, definition.alias);

  const payload = {
    name: definition.name,
    subject: definition.subject,
    html,
    variables: definition.variables,
  };

  let id;
  if (existing) {
    const { error } = await resend.templates.update(existing.id, payload);
    if (error) {
      throw new Error(`Mise à jour de ${definition.alias} échouée : ${error.message}`);
    }
    id = existing.id;
    console.log(`~ ${definition.alias} mis à jour (${id})`);
  } else {
    const { data, error } = await resend.templates.create({
      ...payload,
      alias: definition.alias,
    });
    if (error) {
      throw new Error(`Création de ${definition.alias} échouée : ${error.message}`);
    }
    id = data.id;
    console.log(`+ ${definition.alias} créé (${id})`);
  }

  const { error: publishError } = await resend.templates.publish(id);
  if (publishError) {
    throw new Error(`Publication de ${definition.alias} échouée : ${publishError.message}`);
  }

  const { data: verified } = await resend.templates.get(id);
  console.log(`  statut : ${verified?.status}, alias : ${verified?.alias}`);

  if (verified?.status !== "published") {
    throw new Error(`${definition.alias} n'est pas publié — il ne sera pas envoyable.`);
  }

  await assertRenders(resend, definition);
}

// Publié ne veut pas dire envoyable : un template au HTML que Resend ne sait
// pas interpréter est refusé à l'envoi (422 « Template rendering failed »), et
// l'app avale cette erreur dans un log. Envoi de contrôle vers l'adresse de
// test de Resend, qui accepte le message sans le remettre à personne.
async function assertRenders(resend, definition) {
  const { error } = await resend.emails.send({
    from: "Vela <onboarding@resend.dev>",
    to: "delivered@resend.dev",
    template: { id: definition.alias, variables: definition.sample },
  });
  if (error) {
    throw new Error(`Envoi de contrôle de ${definition.alias} refusé : ${error.message}`);
  }
  console.log("  envoi de contrôle : ok");
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY manquante. Relance avec : RESEND_API_KEY=re_xxx npm run resend:templates"
    );
  }

  const resend = new Resend(apiKey);

  for (const definition of TEMPLATES) {
    await syncTemplate(resend, definition);
  }

  console.log("\nTemplates Resend synchronisés.");
}

main().catch((err) => {
  console.error(`Échec : ${err.message}`);
  process.exitCode = 1;
});
