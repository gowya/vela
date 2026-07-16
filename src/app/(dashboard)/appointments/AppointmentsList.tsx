"use client";

import { useEffect, useState } from "react";
import type { AppointmentListItem } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PatientDetailDrawer } from "../patients/PatientDetailDrawer";
import { ScheduleAppointmentDialog } from "./ScheduleAppointmentDialog";

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(value: Date | string): string {
  return new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function getStatus(
  appointment: AppointmentListItem,
  now: Date
): { label: string; className: string } {
  if (appointment.cancelledAt) {
    return { label: "Annulé", className: "bg-muted text-muted-foreground" };
  }
  const scheduledAt = new Date(appointment.scheduledAt);
  if (scheduledAt < now) {
    return { label: "Passé", className: "bg-muted text-muted-foreground" };
  }
  if (isSameDay(scheduledAt, now)) {
    return { label: "Aujourd'hui", className: "bg-primary/10 text-primary" };
  }
  return { label: "À venir", className: "bg-primary/10 text-primary" };
}

export function AppointmentsList() {
  const [appointments, setAppointments] = useState<AppointmentListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openPatientId, setOpenPatientId] = useState<string | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<AppointmentListItem | null>(
    null
  );
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetch("/api/appointments")
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => setAppointments(data.appointments ?? []))
      .catch(() => setError("Impossible de charger les rendez-vous."));
  }, []);

  function upsertLocal(updated: AppointmentListItem) {
    setAppointments((previous) => {
      if (!previous) return previous;
      const exists = previous.some((appointment) => appointment.id === updated.id);
      return (
        exists
          ? previous.map((appointment) => (appointment.id === updated.id ? updated : appointment))
          : [...previous, updated]
      ).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    });
  }

  async function confirmCancel() {
    if (!appointmentToCancel) return;
    setIsCancelling(true);
    const response = await fetch(`/api/appointments/${appointmentToCancel.id}`, {
      method: "DELETE",
    });
    setIsCancelling(false);

    if (!response.ok) {
      setError("L'annulation du rendez-vous a échoué.");
      setAppointmentToCancel(null);
      return;
    }

    const cancelledId = appointmentToCancel.id;
    setAppointments(
      (previous) =>
        previous?.map((appointment) =>
          appointment.id === cancelledId ? { ...appointment, cancelledAt: new Date() } : appointment
        ) ?? previous
    );
    setAppointmentToCancel(null);
  }

  const now = new Date();
  const isEmpty = appointments?.length === 0;

  return (
    <main className="flex min-h-screen min-w-0 flex-col gap-6 px-16 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Rendez-vous</h1>
        <ScheduleAppointmentDialog onSaved={upsertLocal} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {appointments === null && !error && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="py-3">
                <Skeleton className="h-5 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isEmpty && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Aucun rendez-vous planifié pour le moment.
          </CardContent>
        </Card>
      )}

      {appointments && !isEmpty && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Heure</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((appointment) => {
              const status = getStatus(appointment, now);
              const isCancelled = Boolean(appointment.cancelledAt);
              return (
                <TableRow key={appointment.id} className={isCancelled ? "opacity-60" : undefined}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setOpenPatientId(appointment.patientId)}
                      className="hover:text-foreground hover:underline"
                    >
                      {appointment.patientFirstName} {appointment.patientLastName}
                    </button>
                  </TableCell>
                  <TableCell>{formatDate(appointment.scheduledAt)}</TableCell>
                  <TableCell>{formatTime(appointment.scheduledAt)}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        status.className
                      )}
                    >
                      {status.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {!isCancelled && (
                      <div className="flex justify-end gap-2">
                        <ScheduleAppointmentDialog
                          appointment={appointment}
                          onSaved={upsertLocal}
                          triggerVariant="ghost"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAppointmentToCancel(appointment)}
                        >
                          Annuler
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <PatientDetailDrawer
        patientId={openPatientId}
        onClose={() => setOpenPatientId(null)}
        onUpdated={() => {}}
      />

      <Dialog
        open={appointmentToCancel !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setAppointmentToCancel(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler ce rendez-vous ?</DialogTitle>
            <DialogDescription>
              {appointmentToCancel &&
                `Le rendez-vous du ${formatDate(appointmentToCancel.scheduledAt)} à ${formatTime(
                  appointmentToCancel.scheduledAt
                )} avec ${appointmentToCancel.patientFirstName} ${appointmentToCancel.patientLastName} sera annulé.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAppointmentToCancel(null)}>
              Garder le rendez-vous
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isCancelling}
              onClick={() => void confirmCancel()}
            >
              {isCancelling ? "Annulation…" : "Annuler le rendez-vous"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
