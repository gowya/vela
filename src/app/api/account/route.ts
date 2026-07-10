import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { buildAccountExport } from "@/lib/accountExport";
import { sendAccountDeletionEmail } from "@/lib/email";
import { ACCOUNT_DELETION_REASONS } from "@/lib/accountDeletionReasons";

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Le mot de passe est requis."),
  reason: z.enum(ACCOUNT_DELETION_REASONS, {
    errorMap: () => ({ message: "Merci de préciser le motif de départ." }),
  }),
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
    "SELECT email, password_hash FROM practitioners WHERE id = $1",
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

  // L'export doit être construit avant la suppression : les données n'existent
  // plus une fois la cascade déclenchée.
  const { zipBuffer, patientsCount, consultationsCount } = await buildAccountExport(
    session.user.id
  );
  const deletedAt = new Date();

  // Envoyé dans tous les cas, même si le praticien a déjà téléchargé son
  // export depuis la modale : sert de justificatif horodaté de suppression.
  await sendAccountDeletionEmail(practitioner.email, {
    deletedAt,
    zipBuffer,
    patientsCount,
    consultationsCount,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Journal anonyme du motif de départ (aucune référence au practitioner_id)
    // pour analyser le churn sans conserver de PII après suppression.
    await client.query("INSERT INTO account_deletion_feedback (reason) VALUES ($1)", [
      parsed.data.reason,
    ]);
    // Les patients, consultations, templates, QCM, feedback et jetons de
    // vérification liés sont supprimés en cascade (ON DELETE CASCADE, voir
    // schema.sql).
    await client.query("DELETE FROM practitioners WHERE id = $1", [session.user.id]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return NextResponse.json({ success: true });
}
