import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { mapConsultationTemplateRow } from "@/lib/mappers";
import { consultationTemplateUpdateSchema } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;

  const { rows } = await pool.query(
    `SELECT id, practitioner_id, name, title, content, created_at
     FROM consultation_templates
     WHERE id = $1 AND practitioner_id = $2`,
    [id, session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });
  }

  return NextResponse.json({ template: mapConsultationTemplateRow(rows[0]) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = consultationTemplateUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { name, content } = parsed.data;
  if (name === undefined && content === undefined) {
    return NextResponse.json({ error: "Aucune modification fournie." }, { status: 400 });
  }

  // Mise à jour partielle : on ne touche qu'aux colonnes réellement fournies, ce
  // qui permet à l'autosave d'envoyer name seul, content seul, ou les deux.
  const updates: string[] = [];
  const values: unknown[] = [];
  if (name !== undefined) {
    values.push(name);
    updates.push(`name = $${values.length}`);
  }
  if (content !== undefined) {
    values.push(JSON.stringify(content));
    updates.push(`content = $${values.length}`);
  }
  values.push(id, session.user.id);

  const { rows } = await pool.query(
    `UPDATE consultation_templates
     SET ${updates.join(", ")}
     WHERE id = $${values.length - 1} AND practitioner_id = $${values.length}
     RETURNING id, practitioner_id, name, title, content, created_at`,
    values
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });
  }

  return NextResponse.json({ template: mapConsultationTemplateRow(rows[0]) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;

  const { rowCount } = await pool.query(
    `DELETE FROM consultation_templates WHERE id = $1 AND practitioner_id = $2`,
    [id, session.user.id]
  );

  if (rowCount === 0) {
    return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
