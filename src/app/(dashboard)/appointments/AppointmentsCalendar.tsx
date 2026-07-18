"use client";

import { useEffect, useMemo, useState } from "react";
import moment from "moment";
import "moment/locale/fr";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { momentLocalizer, type EventPropGetter, type ToolbarProps, type View } from "react-big-calendar";
import ShadcnBigCalendar from "@/components/shadcn-big-calendar/shadcn-big-calendar";
import type { AppointmentListItem, OpeningHours } from "@/types";

moment.locale("fr");
const localizer = momentLocalizer(moment);

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  appointment: AppointmentListItem;
}

const messages = {
  date: "Date",
  time: "Heure",
  event: "Rendez-vous",
  allDay: "Toute la journée",
  week: "Semaine",
  day: "Jour",
  month: "Mois",
  previous: "Précédent",
  next: "Suivant",
  yesterday: "Hier",
  tomorrow: "Demain",
  today: "Aujourd'hui",
  agenda: "Agenda",
  noEventsInRange: "Aucun rendez-vous sur cette période.",
  showMore: (total: number) => `+ ${total} de plus`,
};

// react-big-calendar attend des `Date` pour `min`/`max` mais n'en lit que
// l'heure/minute (même jour arbitraire pour les deux bornes).
function timeOfDay(value: string): Date {
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(1972, 0, 1, hours, minutes);
}

// Plage la plus large parmi les jours activés — react-big-calendar n'a
// qu'une seule borne min/max partagée par toute la semaine, pas de blocage
// par jour. Retourne `undefined` si aucun jour n'est configuré (comportement
// inchangé : grille complète 00:00–23:59).
function computeVisibleRange(openingHours: OpeningHours | null): { min?: Date; max?: Date } {
  if (!openingHours) return {};

  const enabledDays = Object.values(openingHours).filter(
    (day): day is NonNullable<typeof day> => Boolean(day?.enabled)
  );
  if (enabledDays.length === 0) return {};

  const earliestStart = enabledDays.reduce((min, day) => (day.start < min ? day.start : min), enabledDays[0].start);
  const latestEnd = enabledDays.reduce((max, day) => (day.end > max ? day.end : max), enabledDays[0].end);

  return { min: timeOfDay(earliestStart), max: timeOfDay(latestEnd) };
}

const VIEW_LABELS: Record<View, string> = {
  month: "Mois",
  week: "Semaine",
  day: "Jour",
  agenda: "Agenda",
  work_week: "Semaine de travail",
};

// Toolbar par défaut de react-big-calendar remplacée pour deux raisons :
// boutons Précédent/Suivant en icônes façon Google Calendar (plutôt que du
// texte), demandé en retour d'usage.
function CalendarToolbar({ label, view, views, onNavigate, onView }: ToolbarProps<CalendarEvent>) {
  const viewNames = Array.isArray(views) ? views : (Object.keys(views) as View[]);

  return (
    <div className="rbc-toolbar">
      <span className="rbc-btn-group">
        <button type="button" onClick={() => onNavigate("TODAY")}>
          Aujourd&apos;hui
        </button>
        <button type="button" aria-label="Période précédente" onClick={() => onNavigate("PREV")}>
          <CaretLeftIcon size={16} />
        </button>
        <button type="button" aria-label="Période suivante" onClick={() => onNavigate("NEXT")}>
          <CaretRightIcon size={16} />
        </button>
      </span>
      <span className="rbc-toolbar-label">{label}</span>
      <span className="rbc-btn-group">
        {viewNames.map((name) => (
          <button
            key={name}
            type="button"
            className={view === name ? "rbc-active" : undefined}
            onClick={() => onView(name)}
          >
            {VIEW_LABELS[name]}
          </button>
        ))}
      </span>
    </div>
  );
}

interface AppointmentsCalendarProps {
  appointments: AppointmentListItem[];
  onSelectPatient: (patientId: string) => void;
}

export function AppointmentsCalendar({ appointments, onSelectPatient }: AppointmentsCalendarProps) {
  // Géré nous-mêmes plutôt que via `defaultView` : le state interne de
  // react-big-calendar (HOC `uncontrollable`) ne se met pas à jour de façon
  // fiable sous React 19, ce qui bloquait le changement de vue.
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(() => new Date());
  const [openingHours, setOpeningHours] = useState<OpeningHours | null>(null);

  useEffect(() => {
    fetch("/api/account/opening-hours")
      .then((response) => response.json())
      .then((data) => setOpeningHours(data.openingHours ?? null))
      .catch(() => setOpeningHours(null));
  }, []);

  const { min, max } = useMemo(() => computeVisibleRange(openingHours), [openingHours]);

  const events = useMemo<CalendarEvent[]>(
    () =>
      appointments.map((appointment) => {
        const start = new Date(appointment.scheduledAt);
        return {
          title: `${appointment.patientFirstName} ${appointment.patientLastName}`,
          start,
          end: new Date(start.getTime() + appointment.durationMinutes * 60_000),
          appointment,
        };
      }),
    [appointments]
  );

  const eventPropGetter: EventPropGetter<CalendarEvent> = (event) => {
    if (event.appointment.cancelledAt) {
      return { className: "event-variant-outline" };
    }
    if (new Date(event.appointment.scheduledAt) < new Date()) {
      return { className: "event-variant-secondary" };
    }
    return { className: "event-variant-primary" };
  };

  return (
    <div className="h-[70vh]">
      <ShadcnBigCalendar
        localizer={localizer}
        culture="fr"
        events={events}
        views={["month", "week", "day", "agenda"]}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        min={min}
        max={max}
        messages={messages}
        components={{ toolbar: CalendarToolbar }}
        eventPropGetter={eventPropGetter}
        onSelectEvent={(event) => {
          const calendarEvent = event as CalendarEvent;
          onSelectPatient(calendarEvent.appointment.patientId);
        }}
        style={{ height: "100%" }}
      />
    </div>
  );
}
