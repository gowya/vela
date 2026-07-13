import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { mapCustomFieldDefinitionRow } from "@/lib/mappers";
import {
  customFieldDefinitionCreateSchema,
  customFieldReorderSchema,
} from "@/lib/validation";

const CUSTOM_FIELD_COLUMNS = `id, practitioner_id, field_name, field_type, options, allow_multiple,
  display_order, show_in_table, created_at`;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { rows } = await pool.query(
    `SELECT ${CUSTOM_FIELD_COLUMNS}
     FROM custom_field_definitions
     WHERE practitioner_id = $1
     ORDER BY display_order`,
    [session.user.id]
  );

  return NextResponse.json({ customFields: rows.map(mapCustomFieldDefinitionRow) });
}

// Réordonnancement en masse (drag & drop dans le drawer patient) : `order`
// donne la nouvelle séquence complète des identifiants du praticien.
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = customFieldReorderSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { order } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: owned } = await client.query(
      `SELECT id FROM custom_field_definitions WHERE id = ANY($1::uuid[]) AND practitioner_id = $2`,
      [order, session.user.id]
    );
    if (owned.length !== new Set(order).size) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Un champ personnalisé référencé est invalide." },
        { status: 422 }
      );
    }

    for (const [index, id] of order.entries()) {
      await client.query(
        `UPDATE custom_field_definitions SET display_order = $1 WHERE id = $2 AND practitioner_id = $3`,
        [index + 1, id, session.user.id]
      );
    }

    const { rows } = await client.query(
      `SELECT ${CUSTOM_FIELD_COLUMNS}
       FROM custom_field_definitions
       WHERE practitioner_id = $1
       ORDER BY display_order`,
      [session.user.id]
    );

    await client.query("COMMIT");

    return NextResponse.json({ customFields: rows.map(mapCustomFieldDefinitionRow) });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { error: "Le réordonnancement a échoué." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
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

  const { fieldName, fieldType, options, allowMultiple } = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO custom_field_definitions (
       practitioner_id, field_name, field_type, options, allow_multiple, display_order
     )
     VALUES (
       $1, $2, $3, $4, $5,
       COALESCE((SELECT MAX(display_order) FROM custom_field_definitions WHERE practitioner_id = $1), 0) + 1
     )
     RETURNING ${CUSTOM_FIELD_COLUMNS}`,
    [session.user.id, fieldName, fieldType, options.length > 0 ? options : null, allowMultiple]
  );

  return NextResponse.json(
    { customField: mapCustomFieldDefinitionRow(rows[0]) },
    { status: 201 }
  );
}
