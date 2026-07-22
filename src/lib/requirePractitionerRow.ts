import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import pool from "@/lib/db";

// Une session JWT valide peut référencer un practitioner qui n'existe plus
// (compte supprimé, changement d'environnement de base de données) : sans ce
// garde-fou, le layout dashboard/onboarding boucle silencieusement puisque
// `rows[0]` est `undefined` sans jamais lever d'erreur. On redirige vers une
// route API (seul endroit où les cookies peuvent être modifiés) qui efface
// le cookie de session avant de renvoyer vers /login.
export async function requirePractitionerRow<T extends Record<string, unknown>>(
  session: Session,
  query: string
): Promise<T> {
  const { rows } = await pool.query(query, [session.user.id]);
  const row = rows[0] as T | undefined;

  if (!row) {
    redirect("/api/session-expired");
  }

  return row;
}
