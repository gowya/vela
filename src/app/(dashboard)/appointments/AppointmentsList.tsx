"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheckIcon,
  CalendarXIcon,
  DotsThreeIcon,
  GearIcon,
  PencilSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import type { AppointmentListItem } from "@/types";
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
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { FieldError } from "@/components/ui/field";
import { SortableTableHead } from "@/components/SortableTableHead";
import { applyTableSort, type TableSort } from "@/lib/table-sort";

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

// Liste : ce qui arrive d'abord (du plus proche au plus lointain), puis
// l'historique (du plus récent au plus ancien). Un tri chronologique simple
// enterrait les prochains rendez-vous sous tout le passé.
function sortForList(appointments: AppointmentListItem[], now: Date): AppointmentListItem[] {
  const time = (appointment: AppointmentListItem) => new Date(appointment.scheduledAt).getTime();
  const upcoming = appointments.filter((appointment) => time(appointment) >= now.getTime());
  const past = appointments.filter((appointment) => time(appointment) < now.getTime());
  return [
    ...upcoming.sort((a, b) => time(a) - time(b)),
    ...past.sort((a, b) => time(b) - time(a)),
  ];
}

type AppointmentSortKey = "patient" | "date" | "time" | "type" | "status";

// Ordre logique des statuts (pas alphabétique) pour le tri de la colonne.
const STATUS_RANK: Record<string, number> = {
  "Aujourd'hui": 0,
  "À venir": 1,
  Passé: 2,
  Annulé: 3,
};

function sortValues(now: Date): Record<
  AppointmentSortKey,
  (appointment: AppointmentListItem) => string | number
> {
  return {
    patient: (appointment) => `${appointment.patientFirstName} ${appointment.patientLastName}`,
    date: (appointment) => new Date(appointment.scheduledAt).getTime(),
    // Heure de la journée seule : regrouper les créneaux du matin, du soir…
    time: (appointment) => {
      const date = new Date(appointment.scheduledAt);
      return date.getHours() * 60 + date.getMinutes();
    },
    type: (appointment) => appointment.appointmentTypeName ?? "",
    status: (appointment) => STATUS_RANK[getStatus(appointment, now).label] ?? 0,
  };
}

export function AppointmentsList() {
  const [appointments, setAppointments] = useState<AppointmentListItem[] | null>(null);
  // Sans tri choisi : à venir d'abord, puis l'historique (sortForList).
  const [sort, setSort] = useState<TableSort<AppointmentSortKey>>(null);
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
    <PageShell>
      <PageHeader
        title="Rendez-vous"
        actions={<ScheduleAppointmentDialog onSaved={upsertLocal} />}
      />

      <FieldError>{error}</FieldError>

      {appointments === null && !error && (
        // Même silhouette que l'écran chargé (onglets + tableau) pour éviter
        // le saut de mise en page à l'arrivée des données.
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-36" />
          <div className="flex flex-col rounded-lg border border-border bg-card px-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="border-b border-border py-2.5 last:border-0">
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
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

          <TabsContent value="liste" className="flex flex-col gap-2">
            <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead label="Patient" sortKey="patient" sort={sort} onSortChange={setSort} />
                    <SortableTableHead label="Date" sortKey="date" sort={sort} onSortChange={setSort} />
                    <SortableTableHead label="Heure" sortKey="time" sort={sort} onSortChange={setSort} />
                    <SortableTableHead label="Type" sortKey="type" sort={sort} onSortChange={setSort} />
                    <SortableTableHead label="Statut" sortKey="status" sort={sort} onSortChange={setSort} />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applyTableSort(sortForList(appointments, now), sort, sortValues(now)).map((appointment) => {
                    const status = getStatus(appointment, now);
                    const isCancelled = Boolean(appointment.cancelledAt);

                    const cells = (
                      <>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => setOpenPatientId(appointment.patientId)}
                            className="font-medium hover:underline"
                          >
                            {appointment.patientFirstName} {appointment.patientLastName}
                          </button>
                        </TableCell>
                        <TableCell className="font-mono">{formatDate(appointment.scheduledAt)}</TableCell>
                        <TableCell className="font-mono">{formatTime(appointment.scheduledAt)}</TableCell>
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
                        <TableRow key={appointment.id} className="text-muted-foreground">
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
            </div>

            {/* Ajout dans la continuité du tableau : après avoir parcouru ses
                rendez-vous, on planifie le suivant sans remonter au bouton du
                header. Discret (ghost) pour rester une action de second plan. */}
            <div className="flex">
              <ScheduleAppointmentDialog
                onSaved={upsertLocal}
                triggerLabel={
                  <>
                    <PlusIcon size={14} />
                    Nouveau rendez-vous
                  </>
                }
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
    </PageShell>
  );
}
