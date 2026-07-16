import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { ConsultationEditor } from "../ConsultationEditor";

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const { rows } = await pool.query(
    `SELECT c.patient_id, c.template_id, c.appointment_id
     FROM consultations c
     JOIN patients p ON p.id = c.patient_id
     WHERE c.id = $1 AND p.practitioner_id = $2 AND c.deleted_at IS NULL`,
    [id, session?.user?.id]
  );

  if (rows.length === 0) {
    notFound();
  }

  return (
    <ConsultationEditor
      consultationId={id}
      patientId={rows[0].patient_id}
      templateId={rows[0].template_id}
      appointmentId={rows[0].appointment_id}
    />
  );
}
