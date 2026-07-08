import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { mapConsultationTemplateRow } from "@/lib/mappers";
import { consultationTemplateCreateSchema } from "@/lib/validation";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { rows } = await pool.query(
    `SELECT id, practitioner_id, name, title, content, created_at
     FROM consultation_templates
     WHERE practitioner_id = $1
     ORDER BY name`,
    [session.user.id]
  );

  return NextResponse.json({ templates: rows.map(mapConsultationTemplateRow) });
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

  const parsed = consultationTemplateCreateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { name, title, content } = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO consultation_templates (practitioner_id, name, title, content)
     VALUES ($1, $2, $3, $4)
     RETURNING id, practitioner_id, name, title, content, created_at`,
    [session.user.id, name, title ?? null, JSON.stringify(content)]
  );

  return NextResponse.json(
    { template: mapConsultationTemplateRow(rows[0]) },
    { status: 201 }
  );
}
