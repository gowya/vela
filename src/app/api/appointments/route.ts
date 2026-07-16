import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { syncPatientNextAppointment } from "@/lib/appointments";
import { mapAppointmentListItemRow } from "@/lib/mappers";
import { appointmentCreateSchema } from "@/lib/validation";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { rows } = await pool.query(
    `SELECT a.id, a.patient_id, p.first_name AS patient_first_name, p.last_name AS patient_last_name,
            a.scheduled_at, a.cancelled_at
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     WHERE p.practitioner_id = $1
     ORDER BY a.scheduled_at ASC`,
    [session.user.id]
  );

  return NextResponse.json({ appointments: rows.map(mapAppointmentListItemRow) });
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

  const parsed = appointmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { patientId, scheduledAt } = parsed.data;

  const { rows: patientRows } = await pool.query(
    "SELECT first_name, last_name FROM patients WHERE id = $1 AND practitioner_id = $2",
    [patientId, session.user.id]
  );
  if (patientRows.length === 0) {
    return NextResponse.json({ error: "Patient introuvable." }, { status: 404 });
  }

  const { rows } = await pool.query(
    `INSERT INTO appointments (patient_id, scheduled_at)
     VALUES ($1, $2)
     RETURNING id, patient_id, scheduled_at, cancelled_at`,
    [patientId, scheduledAt]
  );

  await syncPatientNextAppointment(pool, patientId);

  return NextResponse.json(
    {
      appointment: mapAppointmentListItemRow({
        id: rows[0].id,
        patient_id: rows[0].patient_id,
        patient_first_name: patientRows[0].first_name,
        patient_last_name: patientRows[0].last_name,
        scheduled_at: rows[0].scheduled_at,
        cancelled_at: rows[0].cancelled_at,
      }),
    },
    { status: 201 }
  );
}
