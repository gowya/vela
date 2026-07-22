"use client";

import { useEffect, useState } from "react";
import type { AppointmentListItem, AppointmentType } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PatientPicker } from "@/app/(dashboard)/patients/PatientPicker";
import { formatDuration } from "@/lib/duration";

// Valeur du select réservée pour "pas de type, durée manuelle" — les ids de
// type sont des UUID, cette chaîne ne peut jamais entrer en collision.
const MANUAL_DURATION_VALUE = "__manual__";
const DEFAULT_MANUAL_DURATION = "50";

interface ScheduleAppointmentDialogProps {
  // Présent = mode édition (reprogrammer un rdv existant, patient non modifiable).
  // Absent = mode création (choisir/créer un patient + une date).
  appointment?: AppointmentListItem;
  onSaved: (appointment: AppointmentListItem) => void;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
}

function toDateTimeLocalValue(value: Date | string): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function ScheduleAppointmentDialog({
  appointment,
  onSaved,
  triggerLabel,
  triggerVariant = "default",
}: ScheduleAppointmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState(appointment?.patientId ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    appointment ? toDateTimeLocalValue(appointment.scheduledAt) : ""
  );
  const [appointmentTypeId, setAppointmentTypeId] = useState(
    appointment?.appointmentTypeId ?? MANUAL_DURATION_VALUE
  );
  const [manualDuration, setManualDuration] = useState(
    appointment && !appointment.appointmentTypeId
      ? String(appointment.durationMinutes)
      : DEFAULT_MANUAL_DURATION
  );
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/appointment-types")
      .then((response) => response.json())
      .then((data) => setAppointmentTypes(data.appointmentTypes ?? []))
      .catch(() => setAppointmentTypes([]));
  }, [open]);

  function reset() {
    setPatientId(appointment?.patientId ?? "");
    setScheduledAt(appointment ? toDateTimeLocalValue(appointment.scheduledAt) : "");
    setAppointmentTypeId(appointment?.appointmentTypeId ?? MANUAL_DURATION_VALUE);
    setManualDuration(
      appointment && !appointment.appointmentTypeId
        ? String(appointment.durationMinutes)
        : DEFAULT_MANUAL_DURATION
    );
    setError(null);
  }

  const selectedType =
    appointmentTypeId === MANUAL_DURATION_VALUE
      ? null
      : appointmentTypes.find((type) => type.id === appointmentTypeId) ?? null;

  async function handleSubmit() {
    if (!appointment && !patientId) {
      setError("Choisissez un patient.");
      return;
    }
    if (!scheduledAt) {
      setError("Choisissez une date.");
      return;
    }
    const manualMinutes = Number(manualDuration);
    if (
      appointmentTypeId === MANUAL_DURATION_VALUE &&
      (!Number.isInteger(manualMinutes) || manualMinutes < 5 || manualMinutes > 480)
    ) {
      setError("La durée doit être comprise entre 5 et 480 minutes.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const isoScheduledAt = new Date(scheduledAt).toISOString();
    const body: Record<string, unknown> = { scheduledAt: isoScheduledAt };
    if (appointmentTypeId === MANUAL_DURATION_VALUE) {
      body.durationMinutes = manualMinutes;
    } else {
      body.appointmentTypeId = appointmentTypeId;
    }
    if (!appointment) {
      body.patientId = patientId;
    }

    const response = appointment
      ? await fetch(`/api/appointments/${appointment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

    setIsSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "L'enregistrement du rendez-vous a échoué.");
      return;
    }

    const data = await response.json();
    onSaved(data.appointment);
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" variant={triggerVariant} size={appointment ? "sm" : "default"} />
        }
      >
        {triggerLabel ?? (appointment ? "Modifier" : "Planifier un rendez-vous")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {appointment ? "Modifier le rendez-vous" : "Planifier un rendez-vous"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {appointment ? (
            <p className="text-sm text-foreground">
              {appointment.patientFirstName} {appointment.patientLastName}
            </p>
          ) : (
            <PatientPicker value={patientId} onValueChange={setPatientId} />
          )}

          <DateTimePicker
            label="Date et heure"
            value={scheduledAt}
            onValueChange={setScheduledAt}
            disablePast
          />

          <div>
            <Label htmlFor="appointment-type" className="mb-1">
              Type de rendez-vous
            </Label>
            <Select
              value={appointmentTypeId}
              onValueChange={(value) => setAppointmentTypeId(value ?? MANUAL_DURATION_VALUE)}
            >
              <SelectTrigger id="appointment-type" className="w-full">
                {/* SelectValue affiche la `value` brute par défaut (base-ui) : on
                    fournit explicitement le libellé correspondant. */}
                <SelectValue placeholder="Choisir un type">
                  {(value: string | null) =>
                    value === MANUAL_DURATION_VALUE || !value
                      ? "Durée personnalisée"
                      : appointmentTypes.find((type) => type.id === value)?.name
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MANUAL_DURATION_VALUE}>Durée personnalisée</SelectItem>
                {appointmentTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} ({formatDuration(type.durationMinutes)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedType ? (
            <p className="text-sm text-muted-foreground">
              Durée : {formatDuration(selectedType.durationMinutes)}
            </p>
          ) : (
            <div>
              <Label htmlFor="appointment-manual-duration" className="mb-1">
                Durée (minutes)
              </Label>
              <Input
                id="appointment-manual-duration"
                type="number"
                min={5}
                max={480}
                step={5}
                value={manualDuration}
                onChange={(event) => setManualDuration(event.target.value)}
                className="w-32"
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement…" : appointment ? "Enregistrer" : "Planifier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
