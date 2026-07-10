import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { generateVerificationToken, VERIFICATION_TOKEN_TTL_MS } from "@/lib/verification-token";

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide."),
  password: z.string().min(8, "8 caractères minimum."),
  // Consentement RGPD requis pour la création du compte.
  consent: z.literal(true, {
    errorMap: () => ({
      message: "Le consentement RGPD est requis pour créer un compte.",
    }),
  }),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { email, password } = parsed.data;

  const existing = await pool.query(
    "SELECT id FROM practitioners WHERE email = $1",
    [email]
  );
  if (existing.rows.length > 0) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cet email." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { rows } = await pool.query(
    `INSERT INTO practitioners (email, password_hash)
     VALUES ($1, $2)
     RETURNING id, email`,
    [email, passwordHash]
  );
  const practitioner = rows[0];

  const token = generateVerificationToken();
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  await pool.query(
    `INSERT INTO email_verification_tokens (practitioner_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [practitioner.id, token, expiresAt]
  );

  await sendVerificationEmail(practitioner.email, token);

  return NextResponse.json({ ok: true }, { status: 201 });
}
