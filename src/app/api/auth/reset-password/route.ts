import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { hashPasswordResetToken } from "@/lib/password-reset-token";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { consumeRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";

const RESET_ATTEMPT_LIMIT = 10;
const RESET_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

const INVALID_LINK_MESSAGE = "Ce lien n'est plus valide. Demandez-en un nouveau.";

const resetPasswordSchema = z.object({
  token: z.string().min(1, INVALID_LINK_MESSAGE),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`),
});

export async function POST(request: Request) {
  // Le jeton fait 256 bits, la limite ne sert pas à empêcher de le deviner
  // mais à éviter qu'on fasse tourner bcrypt en boucle sur le serveur.
  const allowed = await consumeRateLimit({
    key: `reset-password:${getClientIp(request)}`,
    limit: RESET_ATTEMPT_LIMIT,
    windowMs: RESET_ATTEMPT_WINDOW_MS,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { token, password } = parsed.data;

  // Hashé avant d'ouvrir la transaction pour ne pas tenir une connexion
  // pendant le calcul bcrypt.
  const passwordHash = await bcrypt.hash(password, 12);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Consommation atomique : deux requêtes simultanées avec le même jeton ne
    // peuvent pas toutes les deux réussir.
    const { rows } = await client.query(
      `DELETE FROM password_reset_tokens
       WHERE token_hash = $1 AND expires_at > now()
       RETURNING practitioner_id`,
      [hashPasswordResetToken(token)]
    );
    const record = rows[0];

    if (!record) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: INVALID_LINK_MESSAGE }, { status: 400 });
    }

    await client.query("UPDATE practitioners SET password_hash = $1 WHERE id = $2", [
      passwordHash,
      record.practitioner_id,
    ]);
    await client.query("DELETE FROM password_reset_tokens WHERE practitioner_id = $1", [
      record.practitioner_id,
    ]);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return NextResponse.json({ ok: true });
}
