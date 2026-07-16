import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { ConsultationEditor } from "../ConsultationEditor";

export default async function NewConsultationPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string; templateId?: string; appointmentId?: string }>;
}) {
  const { patientId, templateId, appointmentId } = await searchParams;

  if (!appointmentId) {
    if (!patientId) {
      redirect("/consultations");
    }

    return (
      <ConsultationEditor
        consultationId={null}
        patientId={patientId}
        templateId={templateId ?? null}
        appointmentId={null}
      />
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Résolution côté serveur avant tout rendu : c'est ce qui empêche la
  // duplication de consultations en cliquant plusieurs fois sur le même
  // rendez-vous depuis le Dashboard (voir bug B1 du test user #01).
  const { rows: appointmentRows } = await pool.query<{ patient_id: string }>(
    `SELECT a.patient_id FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     WHERE a.id = $1 AND p.practitioner_id = $2`,
    [appointmentId, session.user.id]
  );

  if (!appointmentRows[0]) {
    redirect("/consultations");
  }

  const { rows: existingConsultationRows } = await pool.query<{ id: string }>(
    `SELECT id FROM consultations WHERE appointment_id = $1 AND deleted_at IS NULL`,
    [appointmentId]
  );

  if (existingConsultationRows[0]) {
    redirect(`/consultations/${existingConsultationRows[0].id}`);
  }

  return (
    <ConsultationEditor
      consultationId={null}
      patientId={appointmentRows[0].patient_id}
      templateId={templateId ?? null}
      appointmentId={appointmentId}
    />
  );
}
