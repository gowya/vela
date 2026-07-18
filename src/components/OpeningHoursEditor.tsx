"use client";

import { useEffect, useState } from "react";
import type { OpeningHours, OpeningHoursDay, OpeningHoursDayKey } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const DAYS: { key: OpeningHoursDayKey; label: string }[] = [
  { key: "mon", label: "Lundi" },
  { key: "tue", label: "Mardi" },
  { key: "wed", label: "Mercredi" },
  { key: "thu", label: "Jeudi" },
  { key: "fri", label: "Vendredi" },
  { key: "sat", label: "Samedi" },
  { key: "sun", label: "Dimanche" },
];

export function OpeningHoursEditor() {
  const [hours, setHours] = useState<Record<OpeningHoursDayKey, OpeningHoursDay> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/account/opening-hours")
      .then((response) => response.json())
      .then((data) => setHours(data.openingHours as OpeningHours as Record<OpeningHoursDayKey, OpeningHoursDay>))
      .catch(() => setError("Impossible de charger les horaires."));
  }, []);

  function updateDay(key: OpeningHoursDayKey, patch: Partial<OpeningHoursDay>) {
    setHours((previous) => {
      if (!previous) return previous;
      return { ...previous, [key]: { ...previous[key], ...patch } };
    });
    setSaved(false);
  }

  async function handleSave() {
    if (!hours) return;
    setIsSaving(true);
    setError(null);
    setSaved(false);

    const response = await fetch("/api/account/opening-hours", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hours),
    });

    const data = await response.json().catch(() => null);
    setIsSaving(false);

    if (!response.ok) {
      setError(data?.error ?? "Impossible d'enregistrer les horaires.");
      return;
    }

    setHours(data.openingHours);
    setSaved(true);
  }

  if (!hours) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {DAYS.map(({ key, label }) => {
        const day = hours[key];
        return (
          <div key={key} className="flex items-center gap-3">
            <div className="flex w-32 items-center gap-2">
              <Checkbox
                id={`opening-hours-${key}`}
                checked={day.enabled}
                onCheckedChange={(checked) => updateDay(key, { enabled: checked === true })}
              />
              <Label htmlFor={`opening-hours-${key}`} className="text-sm">
                {label}
              </Label>
            </div>
            <Input
              type="time"
              value={day.start}
              disabled={!day.enabled}
              onChange={(event) => updateDay(key, { start: event.target.value })}
              className="h-8 w-28"
              aria-label={`Heure de début, ${label}`}
            />
            <span className="text-sm text-muted-foreground">à</span>
            <Input
              type="time"
              value={day.end}
              disabled={!day.enabled}
              onChange={(event) => updateDay(key, { end: event.target.value })}
              className="h-8 w-28"
              aria-label={`Heure de fin, ${label}`}
            />
          </div>
        );
      })}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <Button type="button" size="sm" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? "Enregistrement…" : "Enregistrer les horaires"}
        </Button>
        {saved && <span className="text-sm text-muted-foreground">Enregistré.</span>}
      </div>
    </div>
  );
}
