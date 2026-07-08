"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ConsultationListItem } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NewConsultationDialog } from "./NewConsultationDialog";
import { TemplatesManagerDialog } from "./TemplatesManagerDialog";

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ConsultationsList() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");

  const [consultations, setConsultations] = useState<ConsultationListItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Suivi consultations</h1>
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
        <p className="text-sm text-muted-foreground">Chargement…</p>
      )}

      {consultations?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {search
            ? "Aucune consultation ne correspond à cette recherche."
            : "Aucune consultation pour le moment."}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {consultations?.map((consultation) => (
          <Link key={consultation.id} href={`/consultations/${consultation.id}`}>
            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
              <CardContent className="flex flex-col gap-1 py-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-foreground">
                    {consultation.patientFirstName} {consultation.patientLastName}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {consultation.title ?? "Sans titre"}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {consultation.templateName && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                        {consultation.templateName}
                      </span>
                    )}
                    <span>{formatDate(consultation.date)}</span>
                  </div>
                </div>
                {consultation.excerpt && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {consultation.excerpt}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
