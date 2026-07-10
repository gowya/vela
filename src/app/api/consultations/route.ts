import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { deriveContentText } from "@/lib/consultation-utils";
import { mapConsultationListItemRow, mapConsultationRow } from "@/lib/mappers";
import { consultationCreateSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const patientId = searchParams.get("patientId");

  const conditions = ["p.practitioner_id = $1", "c.deleted_at IS NULL"];
  const values: unknown[] = [session.user.id];

  if (patientId) {
    values.push(patientId);
    conditions.push(`c.patient_id = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    const searchIndex = values.length;
    conditions.push(
      `(unaccent(c.content_text) ILIKE unaccent($${searchIndex})
        OR unaccent(COALESCE(c.title, '')) ILIKE unaccent($${searchIndex})
        OR unaccent(p.first_name || ' ' || p.last_name) ILIKE unaccent($${searchIndex})
        OR to_char(c.date, 'DD/MM/YYYY') ILIKE $${searchIndex}
        OR to_char(c.date, 'YYYY-MM-DD') ILIKE $${searchIndex})`
    );
  }

  const { rows } = await pool.query(
    `SELECT c.id, c.patient_id, p.first_name AS patient_first_name, p.last_name AS patient_last_name,
            c.template_id, t.name AS template_name, c.title, c.content_text, c.date, c.updated_at
     FROM consultations c
     JOIN patients p ON p.id = c.patient_id
     LEFT JOIN consultation_templates t ON t.id = c.template_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY c.date DESC`,
    values
  );

  return NextResponse.json({ consultations: rows.map(mapConsultationListItemRow) });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = consultationCreateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { patientId, templateId, title, date, content } = parsed.data;

  const { rows: patientRows } = await pool.query(
    "SELECT id FROM patients WHERE id = $1 AND practitioner_id = $2",
    [patientId, session.user.id]
  );
  if (patientRows.length === 0) {
    return NextResponse.json({ error: "Patient introuvable." }, { status: 404 });
  }

  if (templateId) {
    const { rows: templateRows } = await pool.query(
      "SELECT id FROM consultation_templates WHERE id = $1 AND practitioner_id = $2",
      [templateId, session.user.id]
    );
    if (templateRows.length === 0) {
      return NextResponse.json({ error: "Modèle introuvable." }, { status: 422 });
    }
  }

  const contentText = deriveContentText(content);

  const { rows } = await pool.query(
    `INSERT INTO consultations (patient_id, template_id, title, content, content_text, date)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()))
     RETURNING id, patient_id, template_id, title, content, content_text, date, updated_at, created_at`,
    [
      patientId,
      templateId ?? null,
      title ?? null,
      JSON.stringify(content),
      contentText,
      date ?? null,
    ]
  );

  return NextResponse.json({ consultation: mapConsultationRow(rows[0]) }, { status: 201 });
}
