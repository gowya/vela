"use client";

import { useEffect, useState } from "react";
import type { Patient } from "@/types";
import { Combobox } from "@/components/ui/combobox";
import { AddPatientDialog } from "./AddPatientDialog";

interface PatientPickerProps {
  value: string;
  onValueChange: (patientId: string) => void;
  error?: string | null;
}

// Combobox de patients existants + création à la volée (retour test user #01, P1) :
// utilisé partout où il faut choisir un patient pour démarrer quelque chose (nouvelle
// consultation, nouveau rendez-vous) sans obliger à avoir déjà créé le patient au préalable.
export function PatientPicker({ value, onValueChange, error }: PatientPickerProps) {
  const [patients, setPatients] = useState<Patient[] | null>(null);

  useEffect(() => {
    fetch("/api/patients")
      .then((response) => response.json())
      .then((data) => setPatients(data.patients ?? []));
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <Combobox
        label="Patient"
        options={(patients ?? []).map((patient) => ({
          value: patient.id,
          label: `${patient.firstName} ${patient.lastName}`,
        }))}
        value={value || null}
        onValueChange={(next) => onValueChange(next ?? "")}
        placeholder="Choisir un patient"
      />

      <AddPatientDialog
        triggerLabel="+ Nouveau patient"
        triggerVariant="ghost"
        triggerSize="sm"
        onCreated={(patient) => {
          setPatients((previous) => [...(previous ?? []), patient]);
          onValueChange(patient.id);
        }}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
