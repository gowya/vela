import { after, NextResponse } from "next/server";
import { z } from "zod";
import pool from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { generateVerificationToken } from "@/lib/verification-token";
import { hashPasswordResetToken, PASSWORD_RESET_TOKEN_TTL_MS } from "@/lib/password-reset-token";
import { consumeRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";

const IP_ATTEMPT_LIMIT = 5;
const EMAIL_ATTEMPT_LIMIT = 3;
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000;

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide."),
});

export async function POST(request: Request) {
  const allowed = await consumeRateLimit({
    key: `forgot-password:${getClientIp(request)}`,
    limit: IP_ATTEMPT_LIMIT,
    windowMs: ATTEMPT_WINDOW_MS,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez plus tard." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { email } = parsed.data;

  // Limite par email en plus de l'IP : empêche d'inonder la boîte d'un
  // praticien depuis plusieurs IP. Dépassée, elle ne renvoie pas de 429 mais
  // la réponse habituelle, sans envoyer d'email.
  const emailAllowed = await consumeRateLimit({
    key: `forgot-password:${email}`,
    limit: EMAIL_ATTEMPT_LIMIT,
    windowMs: ATTEMPT_WINDOW_MS,
  });

  const { rows } = await pool.query("SELECT id, email FROM practitioners WHERE email = $1", [
    email,
  ]);
  const practitioner = rows[0];

  if (emailAllowed && practitioner) {
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

    // Un seul lien actif à la fois : une nouvelle demande invalide les
    // précédentes.
    await pool.query("DELETE FROM password_reset_tokens WHERE practitioner_id = $1", [
      practitioner.id,
    ]);
    await pool.query(
      `INSERT INTO password_reset_tokens (practitioner_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [practitioner.id, hashPasswordResetToken(token), expiresAt]
    );

    // Envoi après la réponse : l'appel à Resend prend plusieurs centaines de
    // millisecondes, l'attendre ici rendrait un compte existant reconnaissable
    // au seul temps de réponse.
    after(() => sendPasswordResetEmail(practitioner.email, token));
  }

  // Même réponse que le compte existe ou non (pas d'énumération d'emails).
  return NextResponse.json({ ok: true });
}
