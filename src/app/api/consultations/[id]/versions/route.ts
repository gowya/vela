import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { mapConsultationVersionRow } from "@/lib/mappers";
import { consultationVersionCreateSchema } from "@/lib/validation";

const VERSION_LIST_COLUMNS = `v.id, v.consultation_id, v.is_manual, v.label, v.content_text, v.created_at`;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;

  const { rows: consultationRows } = await pool.query(
    `SELECT c.id
     FROM consultations c
     JOIN patients p ON p.id = c.patient_id
     WHERE c.id = $1 AND p.practitioner_id = $2 AND c.deleted_at IS NULL`,
    [id, session.user.id]
  );
  if (consultationRows.length === 0) {
    return NextResponse.json({ error: "Consultation introuvable." }, { status: 404 });
  }

  const { rows } = await pool.query(
    `SELECT ${VERSION_LIST_COLUMNS}
     FROM consultation_versions v
     WHERE v.consultation_id = $1
     ORDER BY v.created_at DESC`,
    [id]
  );

  return NextResponse.json({ versions: rows.map(mapConsultationVersionRow) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const parsed = consultationVersionCreateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  // Checkpoint manuel (bouton "+" ou raccourci clavier du panneau d'historique) :
  // snapshot immédiat du contenu actuel de la consultation, jamais throttlé
  // contrairement aux checkpoints automatiques créés par PATCH /api/consultations/[id].
  const { rows } = await pool.query(
    `INSERT INTO consultation_versions (consultation_id, content, content_text, is_manual, label)
     SELECT c.id, c.content, c.content_text, true, $2
     FROM consultations c
     JOIN patients p ON p.id = c.patient_id
     WHERE c.id = $1 AND p.practitioner_id = $3 AND c.deleted_at IS NULL
     RETURNING id, consultation_id, is_manual, label, content_text, created_at`,
    [id, parsed.data.label ?? null, session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Consultation introuvable." }, { status: 404 });
  }

  return NextResponse.json({ version: mapConsultationVersionRow(rows[0]) }, { status: 201 });
}
