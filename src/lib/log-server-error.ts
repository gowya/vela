import * as Sentry from "@sentry/nextjs";

// Ne garde d'une erreur que ce qui sert au diagnostic : jamais `detail`, `where`
// ni `parameters` d'une erreur Postgres, qui peuvent recopier des valeurs de
// ligne (email, notes de consultation…). Le message pg reste générique
// ("relation \"x\" does not exist", "violates unique constraint \"y\"").
export function describeServerError(error: unknown) {
  if (!(error instanceof Error)) return { message: String(error) };
  const pgError = error as Error & { code?: string; table?: string; constraint?: string };
  return {
    name: error.name,
    message: error.message,
    code: pgError.code,
    table: pgError.table,
    constraint: pgError.constraint,
  };
}

// Pour les erreurs interceptées par un catch qui renvoie une 500 propre : sans
// ça elles ne laissent aucune trace (ni log Vercel, ni Sentry, qui ne voit que
// les erreurs non gérées via onRequestError). Cas réel : la table
// consultation_versions manquante en prod n'apparaissait nulle part.
export function logServerError(context: string, error: unknown) {
  console.error(`[${context}]`, describeServerError(error));
  Sentry.captureException(error, { tags: { context } });
}
