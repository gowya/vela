import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { mapCustomFieldDefinitionRow } from "@/lib/mappers";
import { customFieldDefinitionUpdateSchema } from "@/lib/validation";

const CUSTOM_FIELD_COLUMNS = `id, practitioner_id, field_name, field_type, options, allow_multiple,
  display_order, show_in_table, created_at`;

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

  const parsed = customFieldDefinitionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { showInTable } = parsed.data;
  if (showInTable === undefined) {
    return NextResponse.json({ error: "Aucune modification fournie." }, { status: 400 });
  }

  const { rows } = await pool.query(
    `UPDATE custom_field_definitions
     SET show_in_table = $1
     WHERE id = $2 AND practitioner_id = $3
     RETURNING ${CUSTOM_FIELD_COLUMNS}`,
    [showInTable, id, session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Champ personnalisé introuvable." }, { status: 404 });
  }

  return NextResponse.json({ customField: mapCustomFieldDefinitionRow(rows[0]) });
}

// Supprime le champ pour tous les patients (patient_custom_field_values
// cascade sur field_definition_id) : action irréversible, confirmée côté UI.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;

  const { rows } = await pool.query(
    "DELETE FROM custom_field_definitions WHERE id = $1 AND practitioner_id = $2 RETURNING id",
    [id, session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Champ personnalisé introuvable." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
