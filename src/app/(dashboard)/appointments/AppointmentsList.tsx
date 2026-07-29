"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheckIcon,
  CalendarXIcon,
  DotsThreeIcon,
  GearIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PatientDetailDrawer } from "../patients/PatientDetailDrawer";
import { ScheduleAppointmentDialog } from "./ScheduleAppointmentDialog";
import { AppointmentsCalendar } from "./AppointmentsCalendar";

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
  // Le dialog de reprogrammation n'est plus déclenché par un bouton de la ligne
  // mais depuis le menu d'actions : il est donc piloté ici.
  const [appointmentToEdit, setAppointmentToEdit] = useState<AppointmentListItem | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [view, setView] = useState<"liste" | "agenda">("liste");

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
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarCheckIcon />
            </EmptyMedia>
            <EmptyTitle>Aucun rendez-vous planifié</EmptyTitle>
            <EmptyDescription>
              Planifiez un rendez-vous pour le retrouver ici et dans votre agenda.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <ScheduleAppointmentDialog onSaved={upsertLocal} />
          </EmptyContent>
        </Empty>
      )}

      {appointments && !isEmpty && (
        <Tabs value={view} onValueChange={(value) => setView(value as "liste" | "agenda")}>
          <div className="flex items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="liste">Liste</TabsTrigger>
              <TabsTrigger value="agenda">Agenda</TabsTrigger>
            </TabsList>

            {/* Les horaires d'ouverture ne se voient que dans la vue Agenda (ils
                calibrent la plage horaire affichée) : le raccourci vers leur
                réglage n'apparaît donc que là, à côté des types de rendez-vous. */}
            {/* Vraie navigation vers une autre page : on stylise un <a> (via Link)
                avec `buttonVariants` plutôt que d'utiliser <Button>, qui attend un
                <button> natif et perd sinon ses sémantiques. */}
            {view === "agenda" && (
              <Link
                href="/account?tab=agenda"
                className={cn(buttonVariants({ variant: "outline" }), "gap-1")}
              >
                <GearIcon size={14} />
                Régler mon agenda
              </Link>
            )}
          </div>

          <TabsContent value="liste">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => {
                  const status = getStatus(appointment, now);
                  const isCancelled = Boolean(appointment.cancelledAt);

                  const cells = (
                    <>
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
                      <TableCell className="text-muted-foreground">
                        {appointment.appointmentTypeName ?? "—"}
                      </TableCell>
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
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Plus d'actions"
                                />
                              }
                            >
                              <DotsThreeIcon size={18} weight="bold" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setAppointmentToEdit(appointment)}>
                                <PencilSimpleIcon size={14} />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setAppointmentToCancel(appointment)}
                              >
                                <CalendarXIcon size={14} />
                                Annuler
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </>
                  );

                  // Un rendez-vous annulé n'a plus d'action : pas de menu
                  // contextuel non plus, sinon le clic droit ouvrirait un menu vide
                  // (et bloquerait au passage le menu natif du navigateur).
                  if (isCancelled) {
                    return (
                      <TableRow key={appointment.id} className="opacity-60">
                        {cells}
                      </TableRow>
                    );
                  }

                  return (
                    <ContextMenu key={appointment.id}>
                      <ContextMenuTrigger render={<TableRow />}>{cells}</ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => setAppointmentToEdit(appointment)}>
                          <PencilSimpleIcon size={14} />
                          Modifier
                        </ContextMenuItem>
                        <ContextMenuItem
                          variant="destructive"
                          onClick={() => setAppointmentToCancel(appointment)}
                        >
                          <CalendarXIcon size={14} />
                          Annuler
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </TableBody>
            </Table>

            {/* Ajout dans la continuité du tableau : après avoir parcouru ses
                rendez-vous, on planifie le suivant sans remonter au bouton du
                header. Discret (ghost) pour rester une action de second plan. */}
            <div className="flex">
              <ScheduleAppointmentDialog
                onSaved={upsertLocal}
                triggerLabel="+ Nouveau rendez-vous"
                triggerVariant="ghost"
              />
            </div>
          </TabsContent>

          <TabsContent value="agenda">
            <AppointmentsCalendar
              appointments={appointments}
              onSelectPatient={setOpenPatientId}
              onEditAppointment={setAppointmentToEdit}
              onCancelAppointment={setAppointmentToCancel}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Monté à la demande et remonté à chaque rendez-vous (`key`) : le
          formulaire s'initialise ainsi depuis le bon rendez-vous, sans avoir à
          resynchroniser son état interne à l'ouverture. */}
      {appointmentToEdit && (
        <ScheduleAppointmentDialog
          key={appointmentToEdit.id}
          appointment={appointmentToEdit}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setAppointmentToEdit(null);
          }}
          onSaved={upsertLocal}
        />
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
