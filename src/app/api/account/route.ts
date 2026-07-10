import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Le mot de passe est requis."),
});

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = deleteAccountSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { rows } = await pool.query(
    "SELECT password_hash FROM practitioners WHERE id = $1",
    [session.user.id]
  );
  const practitioner = rows[0];
  if (!practitioner) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }

  const valid = await bcrypt.compare(parsed.data.password, practitioner.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }

  // Les patients, consultations, templates, QCM, feedback et jetons de
  // vérification liés sont supprimés en cascade (ON DELETE CASCADE, voir
  // schema.sql).
  await pool.query("DELETE FROM practitioners WHERE id = $1", [session.user.id]);

  return NextResponse.json({ success: true });
}
