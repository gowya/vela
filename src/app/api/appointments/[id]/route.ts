import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { syncPatientNextAppointment } from "@/lib/appointments";
import { mapAppointmentListItemRow } from "@/lib/mappers";
import { appointmentRescheduleSchema } from "@/lib/validation";

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

  const parsed = appointmentRescheduleSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  // On ne reprogramme jamais un rendez-vous déjà annulé : il faut en planifier un
  // nouveau, pour ne pas perdre la trace de l'annulation d'origine.
  const { rows } = await pool.query(
    `UPDATE appointments a
     SET scheduled_at = $1, updated_at = now()
     FROM patients p
     WHERE a.id = $2 AND a.patient_id = p.id AND p.practitioner_id = $3 AND a.cancelled_at IS NULL
     RETURNING a.id, a.patient_id, a.scheduled_at, a.cancelled_at,
       (SELECT first_name FROM patients WHERE id = a.patient_id) AS patient_first_name,
       (SELECT last_name FROM patients WHERE id = a.patient_id) AS patient_last_name`,
    [parsed.data.scheduledAt, id, session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Rendez-vous introuvable ou déjà annulé." },
      { status: 404 }
    );
  }

  await syncPatientNextAppointment(pool, rows[0].patient_id);

  return NextResponse.json({ appointment: mapAppointmentListItemRow(rows[0]) });
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

  // Annulation douce (cancelled_at), jamais une vraie suppression : conserve le lien
  // avec une éventuelle consultation déjà rédigée pour ce rendez-vous.
  const { rows } = await pool.query(
    `UPDATE appointments a
     SET cancelled_at = now(), updated_at = now()
     FROM patients p
     WHERE a.id = $1 AND a.patient_id = p.id AND p.practitioner_id = $2 AND a.cancelled_at IS NULL
     RETURNING a.patient_id`,
    [id, session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Rendez-vous introuvable ou déjà annulé." },
      { status: 404 }
    );
  }

  await syncPatientNextAppointment(pool, rows[0].patient_id);

  return NextResponse.json({ ok: true });
}
