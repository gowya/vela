"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Patient } from "@/types";
import { calculateAge, isBirthdaySoon } from "@/lib/patient-utils";
import { Card, CardContent } from "@/components/ui/card";
import { AddPatientDialog } from "./AddPatientDialog";
import { PatientDetailDialog } from "./PatientDetailDialog";
import { UsersIcon } from "@phosphor-icons/react";

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR");
}

export function PatientsList() {
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    searchParams.get("patientId")
  );
  // Champ à ouvrir directement en édition quand on arrive depuis un lien externe
  // (ex. "planifier le prochain rendez-vous" depuis le tableau de bord).
  const autoEditField =
    searchParams.get("edit") === "nextAppointmentAt" ? "nextAppointmentAt" : undefined;

  useEffect(() => {
    let cancelled = false;

    async function loadPatients() {
      const response = await fetch("/api/patients");
      if (!response.ok) {
        if (!cancelled) setError("Impossible de charger la liste des patients.");
        return;
      }
      const data = await response.json();
      if (!cancelled) setPatients(data.patients);
    }

    loadPatients();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Patients</h1>
          {patients !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <UsersIcon size={14} />
              {patients.length}
            </span>
          )}
        </div>
        <AddPatientDialog
          onCreated={(patient) =>
            setPatients((previous) => [...(previous ?? []), patient])
          }
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {patients === null && !error && (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      )}

      {patients?.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun patient pour le moment.</p>
      )}

      <div className="flex flex-col gap-3">
        {patients?.map((patient) => {
          const age = calculateAge(patient.birthDate);
          const birthdaySoon = isBirthdaySoon(patient.birthDate);

          return (
            <Card
              key={patient.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPatientId(patient.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedPatientId(patient.id);
                }
              }}
              className="cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium text-foreground">
                    {patient.firstName} {patient.lastName}
                    {age !== null && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        {age} ans
                      </span>
                    )}
                    {birthdaySoon && (
                      <span className="ml-2 text-sm text-primary">
                        Anniversaire dans les 7 jours
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {patient.identifiedIssue ?? "Problématique non renseignée"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-sm">
                  <span className="text-foreground">{patient.status ?? "—"}</span>
                  <span className="text-muted-foreground">
                    Prochain rendez-vous : {formatDate(patient.nextAppointmentAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PatientDetailDialog
        patientId={selectedPatientId}
        onClose={() => setSelectedPatientId(null)}
        onUpdated={(updatedPatient) =>
          setPatients(
            (previous) =>
              previous?.map((patient) =>
                patient.id === updatedPatient.id ? updatedPatient : patient
              ) ?? previous
          )
        }
        autoEditField={selectedPatientId ? autoEditField : undefined}
      />
    </main>
  );
}
