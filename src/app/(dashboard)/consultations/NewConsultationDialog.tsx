"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Patient } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelectedPatientId("");
    fetch("/api/patients")
      .then((response) => response.json())
      .then((data) => setPatients(data.patients ?? []));
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

        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Patient</p>
          <Select
            items={Object.fromEntries(
              (patients ?? []).map((patient) => [
                patient.id,
                `${patient.firstName} ${patient.lastName}`,
              ])
            )}
            value={selectedPatientId}
            onValueChange={(value) => setSelectedPatientId(value ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir un patient" />
            </SelectTrigger>
            <SelectContent>
              {patients?.map((patient) => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleStart}>
            Commencer la consultation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
