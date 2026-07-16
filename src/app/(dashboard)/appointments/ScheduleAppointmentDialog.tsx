"use client";

import { useState } from "react";
import type { AppointmentListItem } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-picker";
import { PatientPicker } from "@/app/(dashboard)/patients/PatientPicker";

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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setPatientId(appointment?.patientId ?? "");
    setScheduledAt(appointment ? toDateTimeLocalValue(appointment.scheduledAt) : "");
    setError(null);
  }

  async function handleSubmit() {
    if (!appointment && !patientId) {
      setError("Choisissez un patient.");
      return;
    }
    if (!scheduledAt) {
      setError("Choisissez une date.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const isoScheduledAt = new Date(scheduledAt).toISOString();
    const response = appointment
      ? await fetch(`/api/appointments/${appointment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledAt: isoScheduledAt }),
        })
      : await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId, scheduledAt: isoScheduledAt }),
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
