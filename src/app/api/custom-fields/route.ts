import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { mapCustomFieldDefinitionRow } from "@/lib/mappers";
import { customFieldDefinitionCreateSchema } from "@/lib/validation";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { rows } = await pool.query(
    `SELECT id, practitioner_id, field_name, field_type, created_at
     FROM custom_field_definitions
     WHERE practitioner_id = $1
     ORDER BY created_at`,
    [session.user.id]
  );

  return NextResponse.json({ customFields: rows.map(mapCustomFieldDefinitionRow) });
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

  const parsed = customFieldDefinitionCreateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { fieldName, fieldType } = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO custom_field_definitions (practitioner_id, field_name, field_type)
     VALUES ($1, $2, $3)
     RETURNING id, practitioner_id, field_name, field_type, created_at`,
    [session.user.id, fieldName, fieldType]
  );

  return NextResponse.json(
    { customField: mapCustomFieldDefinitionRow(rows[0]) },
    { status: 201 }
  );
}
