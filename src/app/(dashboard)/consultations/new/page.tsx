import { redirect } from "next/navigation";
import { ConsultationEditor } from "../ConsultationEditor";

export default async function NewConsultationPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string; templateId?: string }>;
}) {
  const { patientId, templateId } = await searchParams;

  if (!patientId) {
    redirect("/consultations");
  }

  return (
    <ConsultationEditor
      consultationId={null}
      patientId={patientId}
      templateId={templateId ?? null}
    />
  );
}
