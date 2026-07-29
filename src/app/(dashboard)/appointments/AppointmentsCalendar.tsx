"use client";

import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import moment from "moment";
import "moment/locale/fr";
import {
  CalendarXIcon,
  CaretLeftIcon,
  CaretRightIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { momentLocalizer, type EventPropGetter, type ToolbarProps, type View } from "react-big-calendar";
import ShadcnBigCalendar from "@/components/shadcn-big-calendar/shadcn-big-calendar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

const END_OF_DAY = new Date(1972, 0, 1, 23, 59);

// Ramène un instant réel à sa seule heure/minute, sur le jour de référence.
function toTimeOfDay(value: Date): Date {
  return new Date(1972, 0, 1, value.getHours(), value.getMinutes());
}

function floorToHour(value: Date): Date {
  return new Date(1972, 0, 1, value.getHours(), 0);
}

function ceilToHour(value: Date): Date {
  if (value.getMinutes() === 0) return value;
  // 23h passées : arrondir à l'heure suivante déborderait sur le lendemain et
  // inverserait les bornes — on plafonne à la fin de journée.
  if (value.getHours() >= 23) return END_OF_DAY;
  return new Date(1972, 0, 1, value.getHours() + 1, 0);
}

// Plage la plus large parmi les jours activés — react-big-calendar n'a
// qu'une seule borne min/max partagée par toute la semaine, pas de blocage
// par jour. Retourne `undefined` si aucun jour n'est configuré (comportement
// inchangé : grille complète 00:00–23:59).
function openingHoursRange(openingHours: OpeningHours | null): { min?: Date; max?: Date } {
  if (!openingHours) return {};

  const enabledDays = Object.values(openingHours).filter(
    (day): day is NonNullable<typeof day> => Boolean(day?.enabled)
  );
  if (enabledDays.length === 0) return {};

  const earliestStart = enabledDays.reduce((min, day) => (day.start < min ? day.start : min), enabledDays[0].start);
  const latestEnd = enabledDays.reduce((max, day) => (day.end > max ? day.end : max), enabledDays[0].end);

  return { min: timeOfDay(earliestStart), max: timeOfDay(latestEnd) };
}

// Les rendez-vous visibles sur la période affichée. Les bornes min/max étant
// globales à toute la grille, on ne regarde que la période courante : sinon un
// rendez-vous nocturne isolé étirerait la grille de toutes les autres semaines.
function appointmentsInPeriod(
  appointments: AppointmentListItem[],
  date: Date,
  view: View
): AppointmentListItem[] {
  // La vue Mois n'a pas de grille horaire : min/max n'y servent à rien.
  if (view === "month") return [];

  const unit = view === "day" ? "day" : "week";
  const start = moment(date).startOf(unit);
  const end = moment(date).endOf(unit);

  return appointments.filter((appointment) => {
    const scheduledAt = moment(appointment.scheduledAt);
    return scheduledAt.isSameOrAfter(start) && scheduledAt.isSameOrBefore(end);
  });
}

// Un rendez-vous planifié hors des horaires d'ouverture (tôt le matin, tard le
// soir) doit rester visible : react-big-calendar le rendrait sinon collé au bord
// avec une hauteur nulle (`top: 100%; height: 0%`). On élargit donc les bornes
// pour englober les rendez-vous de la période, sans jamais les rétrécir.
function computeVisibleRange(
  openingHours: OpeningHours | null,
  appointments: AppointmentListItem[],
  date: Date,
  view: View
): { min?: Date; max?: Date } {
  const base = openingHoursRange(openingHours);
  // Pas d'horaires configurés : la grille couvre déjà la journée entière, tout
  // rendez-vous y tient quelle que soit son heure.
  if (!base.min || !base.max) return {};

  let min = base.min;
  let max = base.max;

  for (const appointment of appointmentsInPeriod(appointments, date, view)) {
    const start = new Date(appointment.scheduledAt);
    const end = new Date(start.getTime() + appointment.durationMinutes * 60_000);

    const startTime = floorToHour(toTimeOfDay(start));
    // Rendez-vous qui déborde sur le lendemain : on s'arrête à la fin de la
    // journée plutôt que de repartir à 00:00.
    const endTime =
      end.getDate() !== start.getDate() ? END_OF_DAY : ceilToHour(toTimeOfDay(end));

    if (startTime < min) min = startTime;
    if (endTime > max) max = endTime;
  }

  return { min, max };
}

const VIEW_LABELS: Record<View, string> = {
  month: "Mois",
  week: "Semaine",
  day: "Jour",
  agenda: "Agenda",
  work_week: "Semaine de travail",
};

// Ce que les flèches font dépend de la vue affichée : reculer d'un mois en vue
// Mois, d'une semaine en vue Semaine, etc. Les libellés le disent explicitement
// plutôt que de laisser deviner « Période précédente ».
const NAVIGATION_LABELS: Record<View, { previous: string; next: string }> = {
  month: { previous: "Mois précédent", next: "Mois suivant" },
  week: { previous: "Semaine précédente", next: "Semaine suivante" },
  day: { previous: "Jour précédent", next: "Jour suivant" },
  agenda: { previous: "Période précédente", next: "Période suivante" },
  work_week: { previous: "Semaine précédente", next: "Semaine suivante" },
};

// Toolbar par défaut de react-big-calendar remplacée pour deux raisons :
// boutons Précédent/Suivant en icônes façon Google Calendar (plutôt que du
// texte), demandé en retour d'usage.
function CalendarToolbar({ label, view, views, onNavigate, onView }: ToolbarProps<CalendarEvent>) {
  const viewNames = Array.isArray(views) ? views : (Object.keys(views) as View[]);
  const navigation = NAVIGATION_LABELS[view];

  return (
    <div className="rbc-toolbar">
      <span className="rbc-btn-group">
        <button type="button" onClick={() => onNavigate("TODAY")}>
          Aujourd&apos;hui
        </button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <button type="button" aria-label={navigation.previous} onClick={() => onNavigate("PREV")} />
              }
            >
              <CaretLeftIcon size={16} />
            </TooltipTrigger>
            <TooltipContent>{navigation.previous}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <button type="button" aria-label={navigation.next} onClick={() => onNavigate("NEXT")} />
              }
            >
              <CaretRightIcon size={16} />
            </TooltipTrigger>
            <TooltipContent>{navigation.next}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
  onEditAppointment: (appointment: AppointmentListItem) => void;
  onCancelAppointment: (appointment: AppointmentListItem) => void;
}

export function AppointmentsCalendar({
  appointments,
  onSelectPatient,
  onEditAppointment,
  onCancelAppointment,
}: AppointmentsCalendarProps) {
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

  const { min, max } = useMemo(
    () => computeVisibleRange(openingHours, appointments, date, view),
    [openingHours, appointments, date, view]
  );

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
      return { className: "event-variant-cancelled" };
    }
    if (new Date(event.appointment.scheduledAt) < new Date()) {
      return { className: "event-variant-secondary" };
    }
    return { className: "event-variant-primary" };
  };

  // Mêmes actions au clic droit que dans la vue Liste. On passe l'élément
  // existant à `render` plutôt que d'ajouter un wrapper : react-big-calendar
  // positionne `.rbc-event` en absolu via des styles inline, un nœud
  // intermédiaire casserait la mise en page.
  const components = useMemo(
    () => ({
      toolbar: CalendarToolbar,
      eventWrapper: ({ event, children }: { event: CalendarEvent; children?: ReactNode }) => {
        const { appointment } = event;
        // Un rendez-vous annulé n'a plus d'action : pas de menu (sinon clic
        // droit = menu vide, et menu natif du navigateur bloqué pour rien).
        if (appointment.cancelledAt) return <>{children}</>;

        return (
          <ContextMenu>
            <ContextMenuTrigger render={children as ReactElement} />
            <ContextMenuContent>
              <ContextMenuItem onClick={() => onEditAppointment(appointment)}>
                <PencilSimpleIcon size={14} />
                Modifier
              </ContextMenuItem>
              <ContextMenuItem
                variant="destructive"
                onClick={() => onCancelAppointment(appointment)}
              >
                <CalendarXIcon size={14} />
                Annuler
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      },
    }),
    [onEditAppointment, onCancelAppointment]
  );

  return (
    <div className="h-[70vh]">
      <ShadcnBigCalendar
        localizer={localizer}
        culture="fr"
        events={events}
        // Pas de vue "agenda" de react-big-calendar : c'est une liste
        // chronologique, ce que fait déjà l'onglet Liste au-dessus — deux listes
        // concurrentes pour le même besoin.
        views={["month", "week", "day"]}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        min={min}
        max={max}
        messages={messages}
        components={components}
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
