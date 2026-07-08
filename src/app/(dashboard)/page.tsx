import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardQuickActions } from "./DashboardQuickActions";
import { CalendarCheckIcon, ClockIcon } from "@phosphor-icons/react/dist/ssr";

interface TodayAppointment {
  id: string;
  firstName: string;
  lastName: string;
  identifiedIssue: string | null;
  nextAppointmentAt: Date;
}

// Les rendez-vous du jour sont dérivés de `next_appointment_at` sur la fiche
// patient (il n'existe pas d'agenda séparé) : on compare en fuseau Europe/Paris
// pour que "aujourd'hui" corresponde à la journée du praticien, quel que soit
// le fuseau du serveur de base de données.
async function getTodayAppointments(practitionerId: string): Promise<TodayAppointment[]> {
  const { rows } = await pool.query<{
    id: string;
    first_name: string;
    last_name: string;
    identified_issue: string | null;
    next_appointment_at: Date;
  }>(
    `SELECT id, first_name, last_name, identified_issue, next_appointment_at
     FROM patients
     WHERE practitioner_id = $1
       AND next_appointment_at IS NOT NULL
       AND (next_appointment_at AT TIME ZONE 'Europe/Paris')::date = (now() AT TIME ZONE 'Europe/Paris')::date
     ORDER BY next_appointment_at ASC`,
    [practitionerId]
  );

  return rows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    identifiedIssue: row.identified_issue,
    nextAppointmentAt: row.next_appointment_at,
  }));
}

function formatTime(value: Date): string {
  return new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const practitionerId = session?.user?.id;
  const firstName = (session?.user?.name ?? session?.user?.email ?? "").split(" ")[0];

  const todayAppointments = practitionerId ? await getTodayAppointments(practitionerId) : [];
  const now = new Date();
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground [&::first-letter]:uppercase">{today}</p>
        <h1 className="font-display text-3xl text-foreground">
          Bonjour{firstName ? `, ${firstName}` : ""}
        </h1>
      </header>

      <DashboardQuickActions />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CalendarCheckIcon size={18} className="text-muted-foreground" />
            Rendez-vous d&apos;aujourd&apos;hui
          </h2>
          {todayAppointments.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {todayAppointments.length}{" "}
              {todayAppointments.length > 1 ? "rendez-vous" : "rendez-vous"}
            </span>
          )}
        </div>

        {todayAppointments.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Aucun rendez-vous aujourd&apos;hui.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {todayAppointments.map((appointment) => {
              const isPast = new Date(appointment.nextAppointmentAt) < now;

              return (
                <Link
                  key={appointment.id}
                  href={`/consultations/new?patientId=${appointment.id}`}
                  className={isPast ? "opacity-60" : undefined}
                >
                  <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                    <CardContent className="flex items-center gap-4 py-3">
                      <div className="flex w-16 shrink-0 items-center gap-1 text-sm font-medium tabular-nums text-foreground">
                        <ClockIcon size={14} className="text-muted-foreground" />
                        {formatTime(appointment.nextAppointmentAt)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {appointment.firstName} {appointment.lastName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {appointment.identifiedIssue ?? "Problématique non renseignée"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
