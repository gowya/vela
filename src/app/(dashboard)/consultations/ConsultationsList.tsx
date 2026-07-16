"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardTextIcon } from "@phosphor-icons/react";
import type { ConsultationListItem } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { NewConsultationDialog } from "./NewConsultationDialog";
import { TemplatesManagerDialog } from "./TemplatesManagerDialog";
import { PatientDetailDrawer } from "../patients/PatientDetailDrawer";

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Un seul label par consultation, jamais dupliqué : le titre saisi s'il existe,
// sinon le nom du modèle de départ, sinon un fallback neutre.
function consultationLabel(consultation: ConsultationListItem): string {
  return consultation.title ?? consultation.templateName ?? "Sans titre";
}

function ConsultationCard({
  consultation,
  showPatient,
  onPatientClick,
}: {
  consultation: ConsultationListItem;
  showPatient: boolean;
  onPatientClick: (patientId: string) => void;
}) {
  const router = useRouter();

  return (
    // Pas de <Link> englobant : le nom du patient a besoin de son propre
    // élément cliquable (ouvrir ses infos sans quitter la liste, retour test
    // user #01, P3), et un <button> imbriqué dans un <a> serait invalide.
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={() => router.push(`/consultations/${consultation.id}`)}
    >
      <CardContent className="flex flex-col gap-1 py-3">
        <div className="flex items-center justify-between gap-4">
          <p className="min-w-0 truncate text-sm font-medium text-foreground">
            {consultationLabel(consultation)}
            {showPatient && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onPatientClick(consultation.patientId);
                }}
                className="ml-2 text-xs font-normal text-muted-foreground hover:text-foreground hover:underline"
              >
                {consultation.patientFirstName} {consultation.patientLastName}
              </button>
            )}
          </p>
          <span className="shrink-0 text-sm text-muted-foreground">
            {formatDate(consultation.date)}
          </span>
        </div>
        {consultation.excerpt && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {consultation.excerpt}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Regroupe les consultations par patient en conservant l'ordre d'arrivée (déjà
// trié par date décroissante côté API) : le patient avec la consultation la plus
// récente apparaît en premier.
function groupByPatient(consultations: ConsultationListItem[]) {
  const groups = new Map<
    string,
    { patientId: string; patientName: string; items: ConsultationListItem[] }
  >();
  for (const consultation of consultations) {
    const existing = groups.get(consultation.patientId);
    if (existing) {
      existing.items.push(consultation);
    } else {
      groups.set(consultation.patientId, {
        patientId: consultation.patientId,
        patientName: `${consultation.patientFirstName} ${consultation.patientLastName}`,
        items: [consultation],
      });
    }
  }
  return Array.from(groups.values());
}

export function ConsultationsList() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");

  const [consultations, setConsultations] = useState<ConsultationListItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("basic");
  const [error, setError] = useState<string | null>(null);
  // Infos patient "à portée de main" sans quitter la liste des consultations
  // (retour test user #01, P3) : réutilise le même drawer que la page Patients.
  const [openPatientId, setOpenPatientId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (patientId) params.set("patientId", patientId);

      fetch(`/api/consultations?${params.toString()}`)
        .then((response) => {
          if (!response.ok) throw new Error();
          return response.json();
        })
        .then((data) => {
          if (!cancelled) setConsultations(data.consultations);
        })
        .catch(() => {
          if (!cancelled) setError("Impossible de charger les consultations.");
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search, patientId]);

  const isEmpty = consultations?.length === 0;

  return (
    <main className="flex min-h-screen min-w-0 flex-col gap-6 px-16 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Consultations</h1>
        <div className="flex items-center gap-2">
          <TemplatesManagerDialog />
          <NewConsultationDialog />
        </div>
      </div>

      <Input
        placeholder="Rechercher par patient, mot-clé, problématique, date…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {consultations === null && !error && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between gap-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-3 w-72" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isEmpty && search && (
        <p className="text-sm text-muted-foreground">
          Aucune consultation ne correspond à cette recherche.
        </p>
      )}

      {isEmpty && !search && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardTextIcon />
            </EmptyMedia>
            <EmptyTitle>Aucune consultation pour le moment</EmptyTitle>
            <EmptyDescription>
              Démarrez votre première consultation pour commencer à documenter le suivi.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewConsultationDialog />
          </EmptyContent>
        </Empty>
      )}

      {consultations && !isEmpty && (
        <Tabs value={view} onValueChange={setView} className="gap-4">
          <TabsList>
            <TabsTrigger value="basic">Toutes</TabsTrigger>
            <TabsTrigger value="byPatient">Par patient</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <div className="flex flex-col gap-2">
              {consultations.map((consultation) => (
                <ConsultationCard
                  key={consultation.id}
                  consultation={consultation}
                  // Vue globale : on montre le patient ; si la liste est déjà
                  // filtrée sur un patient, c'est redondant.
                  showPatient={!patientId}
                  onPatientClick={setOpenPatientId}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="byPatient">
            <div className="flex flex-col gap-6">
              {groupByPatient(consultations).map((group) => (
                <div key={group.patientId} className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenPatientId(group.patientId)}
                    className="text-left text-sm font-semibold text-foreground hover:underline"
                  >
                    {group.patientName}
                  </button>
                  <div className="flex flex-col gap-2">
                    {group.items.map((consultation) => (
                      <ConsultationCard
                        key={consultation.id}
                        consultation={consultation}
                        showPatient={false}
                        onPatientClick={setOpenPatientId}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <PatientDetailDrawer
        patientId={openPatientId}
        onClose={() => setOpenPatientId(null)}
        onUpdated={() => {}}
        onDeleted={(deletedPatientId) =>
          setConsultations(
            (previous) =>
              previous?.filter((consultation) => consultation.patientId !== deletedPatientId) ??
              previous
          )
        }
      />
    </main>
  );
}
