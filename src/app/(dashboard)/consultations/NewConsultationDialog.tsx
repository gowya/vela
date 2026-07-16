"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PatientPicker } from "@/app/(dashboard)/patients/PatientPicker";

interface NewConsultationDialogProps {
  // Si fourni (ouverture depuis la fiche patient), on saute directement à la page
  // vierge : le choix du patient n'a plus lieu d'être, et le choix d'un template
  // se fait désormais depuis l'éditeur lui-même, jamais avant.
  patientId?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
}

export function NewConsultationDialog({
  patientId,
  triggerLabel = "Nouvelle consultation",
  triggerVariant = "default",
}: NewConsultationDialogProps) {
  const router = useRouter();

  if (patientId) {
    return (
      <Button
        type="button"
        variant={triggerVariant}
        onClick={() => router.push(`/consultations/new?patientId=${patientId}`)}
      >
        {triggerLabel}
      </Button>
    );
  }

  return (
    <NewConsultationPatientPicker triggerLabel={triggerLabel} triggerVariant={triggerVariant} />
  );
}

function NewConsultationPatientPicker({
  triggerLabel,
  triggerVariant,
}: {
  triggerLabel: string;
  triggerVariant: "default" | "outline" | "secondary" | "ghost";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelectedPatientId("");
  }, [open]);

  function handleStart() {
    if (!selectedPatientId) {
      setError("Choisissez un patient.");
      return;
    }
    setOpen(false);
    router.push(`/consultations/new?patientId=${selectedPatientId}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} />}>{triggerLabel}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle consultation</DialogTitle>
        </DialogHeader>

        <PatientPicker value={selectedPatientId} onValueChange={setSelectedPatientId} error={error} />

        <DialogFooter>
          <Button type="button" onClick={handleStart}>
            Commencer la consultation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
