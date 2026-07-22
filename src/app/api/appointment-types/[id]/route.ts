import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { mapAppointmentTypeRow } from "@/lib/mappers";
import { appointmentTypeUpdateSchema } from "@/lib/validation";

const APPOINTMENT_TYPE_COLUMNS = `id, practitioner_id, name, duration_minutes, display_order, created_at`;

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

  const parsed = appointmentTypeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { name, durationMinutes } = parsed.data;

  const { rows } = await pool.query(
    `UPDATE appointment_types
     SET name = $1, duration_minutes = $2
     WHERE id = $3 AND practitioner_id = $4
     RETURNING ${APPOINTMENT_TYPE_COLUMNS}`,
    [name, durationMinutes, id, session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Type de rendez-vous introuvable." }, { status: 404 });
  }

  return NextResponse.json({ appointmentType: mapAppointmentTypeRow(rows[0]) });
}

// Les rendez-vous déjà pris avec ce type gardent leur duration_minutes (figée
// à la création) et perdent seulement la référence (appointment_type_id ->
// NULL via ON DELETE SET NULL) : aucune perte de données.
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
    "DELETE FROM appointment_types WHERE id = $1 AND practitioner_id = $2 RETURNING id",
    [id, session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Type de rendez-vous introuvable." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
