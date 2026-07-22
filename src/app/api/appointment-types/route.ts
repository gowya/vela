import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { mapAppointmentTypeRow } from "@/lib/mappers";
import { appointmentTypeCreateSchema } from "@/lib/validation";

const APPOINTMENT_TYPE_COLUMNS = `id, practitioner_id, name, duration_minutes, display_order, created_at`;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { rows } = await pool.query(
    `SELECT ${APPOINTMENT_TYPE_COLUMNS}
     FROM appointment_types
     WHERE practitioner_id = $1
     ORDER BY display_order`,
    [session.user.id]
  );

  return NextResponse.json({ appointmentTypes: rows.map(mapAppointmentTypeRow) });
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

  const parsed = appointmentTypeCreateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { name, durationMinutes } = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO appointment_types (practitioner_id, name, duration_minutes, display_order)
     VALUES (
       $1, $2, $3,
       COALESCE((SELECT MAX(display_order) FROM appointment_types WHERE practitioner_id = $1), 0) + 1
     )
     RETURNING ${APPOINTMENT_TYPE_COLUMNS}`,
    [session.user.id, name, durationMinutes]
  );

  return NextResponse.json(
    { appointmentType: mapAppointmentTypeRow(rows[0]) },
    { status: 201 }
  );
}
