import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { deriveContentText } from "@/lib/consultation-utils";
import { mapConsultationRow } from "@/lib/mappers";
import { consultationUpdateSchema } from "@/lib/validation";

const CONSULTATION_COLUMNS = `c.id, c.patient_id, c.template_id, c.title, c.content, c.content_text,
  c.date, c.updated_at, c.created_at`;

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
    `SELECT ${CONSULTATION_COLUMNS}
     FROM consultations c
     JOIN patients p ON p.id = c.patient_id
     WHERE c.id = $1 AND p.practitioner_id = $2 AND c.deleted_at IS NULL`,
    [id, session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Consultation introuvable." }, { status: 404 });
  }

  return NextResponse.json({ consultation: mapConsultationRow(rows[0]) });
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

  const parsed = consultationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { updatedAt, title, date, content } = parsed.data;

  // Distingue le 404 (consultation inexistante/pas la sienne) du 409 (conflit
  // d'autosave) que renvoie l'UPDATE optimiste juste après.
  const { rows: existingRows } = await pool.query(
    `SELECT c.id
     FROM consultations c
     JOIN patients p ON p.id = c.patient_id
     WHERE c.id = $1 AND p.practitioner_id = $2 AND c.deleted_at IS NULL`,
    [id, session.user.id]
  );

  if (existingRows.length === 0) {
    return NextResponse.json({ error: "Consultation introuvable." }, { status: 404 });
  }

  const contentText = content ? deriveContentText(content) : null;

  // Verrou optimiste : la mise à jour n'a lieu que si `updated_at` n'a pas bougé
  // depuis la dernière lecture côté client (autosave depuis un autre onglet/appareil
  // sinon écraserait silencieusement les notes).
  const { rows } = await pool.query(
    `UPDATE consultations c
     SET title = COALESCE($1, c.title),
         date = COALESCE($2, c.date),
         content = COALESCE($3, c.content),
         content_text = COALESCE($4, c.content_text),
         updated_at = now()
     FROM patients p
     WHERE c.id = $5
       AND c.patient_id = p.id
       AND p.practitioner_id = $6
       AND c.updated_at = $7
       AND c.deleted_at IS NULL
     RETURNING ${CONSULTATION_COLUMNS}`,
    [
      title ?? null,
      date ?? null,
      content ? JSON.stringify(content) : null,
      contentText,
      id,
      session.user.id,
      updatedAt,
    ]
  );

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Cette consultation a été modifiée ailleurs. Rechargez-la avant de continuer." },
      { status: 409 }
    );
  }

  return NextResponse.json({ consultation: mapConsultationRow(rows[0]) });
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

  // Suppression douce : les notes de consultation sont des données de santé
  // potentiellement soumises à une obligation de conservation. On masque la
  // consultation des listes/recherche sans la supprimer réellement de la base.
  const { rows } = await pool.query(
    `UPDATE consultations c
     SET deleted_at = now()
     FROM patients p
     WHERE c.id = $1 AND c.patient_id = p.id AND p.practitioner_id = $2 AND c.deleted_at IS NULL
     RETURNING c.id`,
    [id, session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Consultation introuvable." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
