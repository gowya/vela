import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardQuickActions } from "./DashboardQuickActions";
import { CalendarCheckIcon, ClipboardTextIcon, ClockIcon } from "@phosphor-icons/react/dist/ssr";

interface RecentConsultation {
  id: string;
  patientFirstName: string;
  patientLastName: string;
  title: string | null;
  date: Date;
}

interface TodayAppointment {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  identifiedIssue: string | null;
  scheduledAt: Date;
}

interface ActivationState {
  patientCount: number;
  consultationCount: number;
  // Patient le plus récent. Utilisé pour pointer directement "Nouvelle
  // consultation" vers lui tant qu'aucune consultation n'existe encore, et pour
  // suggérer de planifier son prochain rendez-vous tant qu'aucun n'est prévu.
  latestPatient: { id: string; firstName: string; hasNextAppointment: boolean } | null;
}

// État d'activation du compte : sert à distinguer "aucun rendez-vous
// aujourd'hui, journée normale" (practicien déjà actif) de "compte vide,
// jamais utilisé" (nouveau practicien). Les deux se ressemblent sinon.
async function getActivationState(practitionerId: string): Promise<ActivationState> {
  const { rows } = await pool.query<{ patient_count: string; consultation_count: string }>(
    `SELECT
       (SELECT COUNT(*) FROM patients WHERE practitioner_id = $1) AS patient_count,
       (SELECT COUNT(*) FROM consultations c
          JOIN patients p ON p.id = c.patient_id
          WHERE p.practitioner_id = $1) AS consultation_count`,
    [practitionerId]
  );

  const patientCount = Number(rows[0]?.patient_count ?? 0);
  const consultationCount = Number(rows[0]?.consultation_count ?? 0);

  let latestPatient: ActivationState["latestPatient"] = null;
  if (patientCount > 0) {
    const { rows: latestRows } = await pool.query<{
      id: string;
      first_name: string;
      next_appointment_at: Date | null;
    }>(
      `SELECT id, first_name, next_appointment_at FROM patients
       WHERE practitioner_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [practitionerId]
    );
    if (latestRows[0]) {
      latestPatient = {
        id: latestRows[0].id,
        firstName: latestRows[0].first_name,
        hasNextAppointment: latestRows[0].next_appointment_at !== null,
      };
    }
  }

  return { patientCount, consultationCount, latestPatient };
}

// Les rendez-vous du jour viennent de la table `appointments` (voir migration
// 010) : on compare en fuseau Europe/Paris pour que "aujourd'hui" corresponde
// à la journée du praticien, quel que soit le fuseau du serveur de base de
// données. Les rendez-vous annulés (cancelled_at) n'apparaissent jamais ici.
async function getTodayAppointments(practitionerId: string): Promise<TodayAppointment[]> {
  const { rows } = await pool.query<{
    id: string;
    patient_id: string;
    first_name: string;
    last_name: string;
    identified_issue: string | null;
    scheduled_at: Date;
  }>(
    `SELECT a.id, a.patient_id, p.first_name, p.last_name, p.identified_issue, a.scheduled_at
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     WHERE p.practitioner_id = $1
       AND a.cancelled_at IS NULL
       AND (a.scheduled_at AT TIME ZONE 'Europe/Paris')::date = (now() AT TIME ZONE 'Europe/Paris')::date
     ORDER BY a.scheduled_at ASC`,
    [practitionerId]
  );

  return rows.map((row) => ({
    id: row.id,
    patientId: row.patient_id,
    firstName: row.first_name,
    lastName: row.last_name,
    identifiedIssue: row.identified_issue,
    scheduledAt: row.scheduled_at,
  }));
}

// Les rendez-vous de la semaine couvrent les 7 jours suivant aujourd'hui
// (demain inclus, aujourd'hui étant déjà couvert par le bloc précédent).
async function getWeekAppointments(practitionerId: string): Promise<TodayAppointment[]> {
  const { rows } = await pool.query<{
    id: string;
    patient_id: string;
    first_name: string;
    last_name: string;
    identified_issue: string | null;
    scheduled_at: Date;
  }>(
    `SELECT a.id, a.patient_id, p.first_name, p.last_name, p.identified_issue, a.scheduled_at
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     WHERE p.practitioner_id = $1
       AND a.cancelled_at IS NULL
       AND (a.scheduled_at AT TIME ZONE 'Europe/Paris')::date > (now() AT TIME ZONE 'Europe/Paris')::date
       AND (a.scheduled_at AT TIME ZONE 'Europe/Paris')::date <= ((now() AT TIME ZONE 'Europe/Paris')::date + 7)
     ORDER BY a.scheduled_at ASC`,
    [practitionerId]
  );

  return rows.map((row) => ({
    id: row.id,
    patientId: row.patient_id,
    firstName: row.first_name,
    lastName: row.last_name,
    identifiedIssue: row.identified_issue,
    scheduledAt: row.scheduled_at,
  }));
}

// Action rapide "dernières consultations" (retour test user #01, N4) : les 5 plus
// récentes tous patients confondus, pour retrouver un dossier récent sans passer par
// la liste complète des consultations.
async function getRecentConsultations(practitionerId: string): Promise<RecentConsultation[]> {
  const { rows } = await pool.query<{
    id: string;
    first_name: string;
    last_name: string;
    title: string | null;
    date: Date;
  }>(
    `SELECT c.id, p.first_name, p.last_name, c.title, c.date
     FROM consultations c
     JOIN patients p ON p.id = c.patient_id
     WHERE p.practitioner_id = $1 AND c.deleted_at IS NULL
     ORDER BY c.date DESC
     LIMIT 5`,
    [practitionerId]
  );

  return rows.map((row) => ({
    id: row.id,
    patientFirstName: row.first_name,
    patientLastName: row.last_name,
    title: row.title,
    date: row.date,
  }));
}

function formatTime(value: Date): string {
  return new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(value: Date): string {
  const label = new Date(value).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function groupByDay(appointments: TodayAppointment[]): { dayKey: string; date: Date; items: TodayAppointment[] }[] {
  const groups = new Map<string, { date: Date; items: TodayAppointment[] }>();

  for (const appointment of appointments) {
    const date = new Date(appointment.scheduledAt);
    const dayKey = date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
    const group = groups.get(dayKey);
    if (group) {
      group.items.push(appointment);
    } else {
      groups.set(dayKey, { date, items: [appointment] });
    }
  }

  return Array.from(groups.entries()).map(([dayKey, group]) => ({ dayKey, ...group }));
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const practitionerId = session?.user?.id;
  const firstName = (session?.user?.name ?? session?.user?.email ?? "").split(" ")[0];

  const { welcome } = await searchParams;
  if (welcome === "1" && practitionerId && session?.user?.email) {
    // Envoyé ici plutôt que depuis la route de vérification : ça garantit que
    // le praticien a réellement atterri sur le dashboard (pas un simple GET
    // du lien par un scanner de sécurité côté client mail). Le redirect vers
    // l'URL sans le paramètre évite un renvoi si la page est rechargée.
    await sendWelcomeEmail(session.user.email, firstName);
    redirect("/");
  }

  const [todayAppointments, weekAppointments, activationState, recentConsultations] =
    practitionerId
      ? await Promise.all([
          getTodayAppointments(practitionerId),
          getWeekAppointments(practitionerId),
          getActivationState(practitionerId),
          getRecentConsultations(practitionerId),
        ])
      : [[], [], { patientCount: 0, consultationCount: 0, latestPatient: null }, []];
  const weekAppointmentsByDay = groupByDay(weekAppointments);
  const now = new Date();
  const today = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const currentTime = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const hasNoPatients = activationState.patientCount === 0;
  const hasNoConsultations = Boolean(
    !hasNoPatients && activationState.consultationCount === 0 && activationState.latestPatient
  );
  // Une fois la première consultation faite, on suggère de planifier la suite
  // tant que le patient le plus récent n'a pas de prochain rendez-vous prévu.
  const needsAppointmentNudge = Boolean(
    !hasNoPatients &&
      !hasNoConsultations &&
      todayAppointments.length === 0 &&
      activationState.latestPatient &&
      !activationState.latestPatient.hasNextAppointment
  );

  return (
    <main className="flex min-h-screen min-w-0 flex-col gap-8 px-16 py-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground [&::first-letter]:uppercase">
          {today}, {currentTime}
        </p>
        <h1 className="font-display text-3xl text-foreground">
          Bonjour{firstName ? `, ${firstName}` : ""}
        </h1>
      </header>

      <DashboardQuickActions
        nudgeConsultationForPatient={hasNoConsultations ? activationState.latestPatient : null}
      />

      {hasNoPatients ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Vous n&apos;avez pas encore de patient. Ajoutez-en un pour commencer.
          </CardContent>
        </Card>
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CalendarCheckIcon size={18} className="text-muted-foreground" />
              Rendez-vous d&apos;aujourd&apos;hui
            </h2>
            <div className="flex items-center gap-3">
              {todayAppointments.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {todayAppointments.length}{" "}
                  {todayAppointments.length > 1 ? "rendez-vous" : "rendez-vous"}
                </span>
              )}
              <Link href="/appointments" className="text-xs text-primary hover:underline">
                Voir tous les rendez-vous
              </Link>
            </div>
          </div>

          {todayAppointments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                {hasNoConsultations && activationState.latestPatient ? (
                  <p>Ajoutez votre première consultation pour {activationState.latestPatient.firstName}.</p>
                ) : needsAppointmentNudge && activationState.latestPatient ? (
                  <>
                    <p>Aucun rendez-vous aujourd&apos;hui.</p>
                    <Link
                      href={`/patients?patientId=${activationState.latestPatient.id}&edit=nextAppointmentAt`}
                      className="text-primary hover:underline"
                    >
                      Planifier le prochain rendez-vous de{" "}
                      {activationState.latestPatient.firstName}
                    </Link>
                  </>
                ) : (
                  <p>Aucun rendez-vous aujourd&apos;hui.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {todayAppointments.map((appointment) => {
              const isPast = new Date(appointment.scheduledAt) < now;

              return (
                <Link
                  key={appointment.id}
                  href={`/consultations/new?appointmentId=${appointment.id}`}
                  className={isPast ? "opacity-60" : undefined}
                >
                  <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                    <CardContent className="flex items-center gap-4 py-3">
                      <div className="flex w-16 shrink-0 items-center gap-1 text-sm font-medium tabular-nums text-foreground">
                        <ClockIcon size={14} className="text-muted-foreground" />
                        {formatTime(appointment.scheduledAt)}
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
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CalendarCheckIcon size={18} className="text-muted-foreground" />
            Rendez-vous de la semaine
          </h2>
          {weekAppointments.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {weekAppointments.length} rendez-vous
            </span>
          )}
        </div>

        {weekAppointments.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Aucun rendez-vous prévu dans les 7 prochains jours.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {weekAppointmentsByDay.map((group) => (
              <div key={group.dayKey} className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {formatDayLabel(group.date)}
                </p>
                <div className="flex flex-col gap-2">
                  {group.items.map((appointment) => (
                    <Link key={appointment.id} href={`/consultations/new?appointmentId=${appointment.id}`}>
                      <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                        <CardContent className="flex items-center gap-4 py-3">
                          <div className="flex w-16 shrink-0 items-center gap-1 text-sm font-medium tabular-nums text-foreground">
                            <ClockIcon size={14} className="text-muted-foreground" />
                            {formatTime(appointment.scheduledAt)}
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
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {!hasNoPatients && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ClipboardTextIcon size={18} className="text-muted-foreground" />
            Dernières consultations
          </h2>

          {recentConsultations.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Aucune consultation enregistrée pour le moment.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {recentConsultations.map((consultation) => (
                <Link key={consultation.id} href={`/consultations/${consultation.id}`}>
                  <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                    <CardContent className="flex items-center justify-between gap-4 py-3">
                      <p className="min-w-0 truncate text-sm font-medium text-foreground">
                        {consultation.title ?? "Sans titre"}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {consultation.patientFirstName} {consultation.patientLastName}
                        </span>
                      </p>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {new Date(consultation.date).toLocaleDateString("fr-FR")}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
