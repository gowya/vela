import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?verification=expired", url));
  }

  const { rows } = await pool.query(
    "SELECT practitioner_id, expires_at FROM email_verification_tokens WHERE token = $1",
    [token]
  );
  const record = rows[0];

  if (!record || new Date(record.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/login?verification=expired", url));
  }

  // `WHERE email_verified_at IS NULL` : ne redéclenche pas le mail de
  // bienvenue (envoyé depuis le dashboard, voir `welcome=1` ci-dessous) si le
  // lien est recliqué ou redemandé après coup.
  const { rows: practitionerRows } = await pool.query(
    `UPDATE practitioners SET email_verified_at = now()
     WHERE id = $1 AND email_verified_at IS NULL
     RETURNING id`,
    [record.practitioner_id]
  );
  await pool.query("DELETE FROM email_verification_tokens WHERE token = $1", [token]);

  // Le mail de bienvenue part une fois que le praticien a réellement atterri
  // sur le dashboard (voir `src/app/(dashboard)/page.tsx`), pas ici : ça évite
  // de l'envoyer sur un simple GET (scanner de liens des clients mail, par
  // exemple) qui ne correspond pas à une vraie visite.
  const justVerified = practitionerRows.length > 0;
  const destination = justVerified ? "/?welcome=1" : "/";

  return NextResponse.redirect(new URL(destination, url));
}
