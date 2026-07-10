"use client";

import { useRouter } from "next/navigation";
import { AddPatientDialog } from "./patients/AddPatientDialog";
import { NewConsultationDialog } from "./consultations/NewConsultationDialog";

interface DashboardQuickActionsProps {
  // Patient vers lequel pointer directement "Nouvelle consultation" (sans passer
  // par le sélecteur) tant qu'aucune consultation n'existe encore : évite une
  // étape de choix inutile quand il n'y a qu'un seul patient candidat évident.
  nudgeConsultationForPatient?: { id: string } | null;
}

// Regroupe les deux actions principales du tableau de bord. La création d'un
// patient n'a pas de liste locale à mettre à jour ici (contrairement à la page
// Patients) : on rafraîchit simplement les données serveur, ce qui met aussi à
// jour la liste des rendez-vous du jour si le nouveau patient en a un.
//
// Le poids visuel des deux boutons s'inverse tant qu'aucune consultation n'a
// été créée : "Nouvelle consultation" devient l'action mise en avant, "Ajouter
// un patient" passe en secondaire.
export function DashboardQuickActions({ nudgeConsultationForPatient }: DashboardQuickActionsProps) {
  const router = useRouter();
  const nudgeConsultation = Boolean(nudgeConsultationForPatient);

  return (
    <div className="flex flex-wrap gap-3">
      <AddPatientDialog
        onCreated={() => router.refresh()}
        triggerVariant={nudgeConsultation ? "outline" : "default"}
      />
      <NewConsultationDialog
        patientId={nudgeConsultationForPatient?.id}
        triggerLabel="Nouvelle consultation"
        triggerVariant={nudgeConsultation ? "default" : "outline"}
      />
    </div>
  );
}
