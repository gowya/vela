import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Le nom est trop court."),
    email: z.string().trim().toLowerCase().email("Email invalide."),
    specialty: z.string().trim().optional(),
    password: z.string().min(8, "8 caractères minimum."),
    confirmPassword: z.string(),
    // Consentement RGPD requis pour la création du compte.
    consent: z.literal(true, {
      errorMap: () => ({
        message: "Le consentement RGPD est requis pour créer un compte.",
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
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

  const { name, email, specialty, password } = parsed.data;

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
    `INSERT INTO practitioners (email, password_hash, name, specialty)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, specialty, created_at`,
    [email, passwordHash, name, specialty || null]
  );

  return NextResponse.json({ practitioner: rows[0] }, { status: 201 });
}
