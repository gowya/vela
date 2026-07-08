"use client";

import { useRouter } from "next/navigation";
import { AddPatientDialog } from "./patients/AddPatientDialog";
import { NewConsultationDialog } from "./consultations/NewConsultationDialog";

// Regroupe les deux actions principales du tableau de bord. La création d'un
// patient n'a pas de liste locale à mettre à jour ici (contrairement à la page
// Patients) : on rafraîchit simplement les données serveur, ce qui met aussi à
// jour la liste des rendez-vous du jour si le nouveau patient en a un.
export function DashboardQuickActions() {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-3">
      <AddPatientDialog onCreated={() => router.refresh()} />
      <NewConsultationDialog triggerLabel="Nouvelle consultation" triggerVariant="outline" />
    </div>
  );
}
