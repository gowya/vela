import { randomBytes, randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";
import pool from "@/lib/db";
import { deriveContentText } from "@/lib/consultation-utils";
import type { ConsultationContent } from "@/types";

// Un espace démo est un vrai compte praticien, jetable : un par visiteur, pour
// que deux personnes qui testent en même temps ne se marchent pas dessus. Le
// domaine `.invalid` (réservé, RFC 2606) garantit qu'aucun email ne peut
// partir vers une vraie boîte, et sert de marqueur pour reconnaître ces
// comptes sans colonne dédiée en base.
export const DEMO_EMAIL_DOMAIN = "demo.vela.invalid";
export const DEMO_TTL_HOURS = 24;

export function isDemoEmail(email: string | null | undefined): boolean {
  return Boolean(email?.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`));
}

// Les dates du jeu de données sont relatives au jour courant (heure de Paris,
// comme le tableau de bord) pour que la démo ait toujours des rendez-vous
// « aujourd'hui » et « cette semaine », quel que soit le jour de la visite.
function parisTime(dayOffset: number, time: string): string {
  return `(date_trunc('day', now() AT TIME ZONE 'Europe/Paris') + interval '${dayOffset} days ${time}') AT TIME ZONE 'Europe/Paris'`;
}

// Tiptap rejette les nœuds texte vides : un paragraphe vide n'a pas d'enfant.
function paragraph(text: string): ConsultationContent {
  return text ? { type: "paragraph", content: [{ type: "text", text }] } : { type: "paragraph" };
}

function heading(text: string): ConsultationContent {
  return { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] };
}

function bulletList(items: string[]): ConsultationContent {
  return {
    type: "bulletList",
    content: items.map((item) => ({ type: "listItem", content: [paragraph(item)] })),
  };
}

function doc(...nodes: ConsultationContent[]): ConsultationContent {
  return { type: "doc", content: nodes };
}

interface DemoPatient {
  key: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  genderIdentity: string;
  status: string;
  identifiedIssue: string;
  intakeNotes: string;
}

// Patients entièrement fictifs. Emails en example.com (domaine réservé) pour
// qu'un envoi déclenché depuis la démo ne touche jamais une vraie personne.
const DEMO_PATIENTS: DemoPatient[] = [
  {
    key: "lea",
    firstName: "Léa",
    lastName: "Moreau",
    birthDate: "1991-04-12",
    genderIdentity: "Femme",
    status: "En couple",
    identifiedIssue: "Anxiété de performance",
    intakeNotes: "Adressée par son médecin traitant. Difficultés d'endormissement depuis une prise de poste.",
  },
  {
    key: "thomas",
    firstName: "Thomas",
    lastName: "Garnier",
    birthDate: "1985-09-30",
    genderIdentity: "Homme",
    status: "Divorcé.e",
    identifiedIssue: "Séparation récente",
    intakeNotes: "Garde alternée de deux enfants. Souhaite retrouver un rythme de vie stable.",
  },
  {
    key: "couple",
    firstName: "Inès & Malik",
    lastName: "Benali",
    birthDate: "1993-02-03",
    genderIdentity: "Couple",
    status: "Crise de couple",
    identifiedIssue: "Communication dans le couple",
    intakeNotes: "Ensemble depuis 7 ans. Démarche initiée par Inès, Malik partant pour essayer.",
  },
  {
    key: "sarah",
    firstName: "Sarah",
    lastName: "Lefèvre",
    birthDate: "1998-11-21",
    genderIdentity: "Femme",
    status: "Célibataire",
    identifiedIssue: "Estime de soi",
    intakeNotes: "Étudiante en master. Première démarche d'accompagnement.",
  },
  {
    key: "julien",
    firstName: "Julien",
    lastName: "Roux",
    birthDate: "1979-06-08",
    genderIdentity: "Homme",
    status: "En couple",
    identifiedIssue: "Épuisement professionnel",
    intakeNotes: "Arrêt de travail de trois semaines. Reprise envisagée à mi-temps thérapeutique.",
  },
  {
    key: "camille",
    firstName: "Camille",
    lastName: "Petit",
    birthDate: "2001-01-17",
    genderIdentity: "Non-binaire",
    status: "En date",
    identifiedIssue: "Gestion des émotions",
    intakeNotes: "Vient sur recommandation d'un·e ami·e.",
  },
];

interface DemoAppointment {
  patient: string;
  dayOffset: number;
  time: string;
  type: "first" | "followUp" | "couple";
  consultation?: { title: string; content: ConsultationContent };
}

const DEMO_APPOINTMENTS: DemoAppointment[] = [
  {
    patient: "lea",
    dayOffset: -21,
    time: "10:00",
    type: "first",
    consultation: {
      title: "Première séance",
      content: doc(
        heading("Motif de consultation"),
        paragraph("Anxiété marquée avant les réunions d'équipe depuis sa promotion. Réveils nocturnes 3 à 4 fois par semaine."),
        heading("Observations"),
        bulletList([
          "Discours très structuré, beaucoup d'auto-exigence",
          "Peu de temps pour soi en dehors du travail",
        ]),
        heading("Pistes"),
        paragraph("Travailler sur l'identification des pensées automatiques. Proposer un carnet de suivi du sommeil."),
      ),
    },
  },
  {
    patient: "lea",
    dayOffset: -7,
    time: "10:00",
    type: "followUp",
    consultation: {
      title: "Séance de suivi",
      content: doc(
        paragraph("Le carnet de sommeil a été tenu 5 jours sur 7. Moins de réveils en fin de semaine."),
        paragraph("Réunion de lundi vécue comme « moins pire que prévu ». Premier signe de recul sur les anticipations."),
        heading("Pour la prochaine fois"),
        bulletList(["Exercice de respiration avant les réunions", "Noter une situation réussie par jour"]),
      ),
    },
  },
  { patient: "lea", dayOffset: 0, time: "10:00", type: "followUp" },
  {
    patient: "thomas",
    dayOffset: -14,
    time: "18:00",
    type: "first",
    consultation: {
      title: "Première séance",
      content: doc(
        heading("Contexte"),
        paragraph("Séparation il y a quatre mois, après douze ans de vie commune. Garde alternée mise en place sans conflit majeur."),
        heading("Ressenti"),
        paragraph("Sentiment de culpabilité vis-à-vis des enfants. Isolement le week-end où il ne les a pas."),
      ),
    },
  },
  { patient: "thomas", dayOffset: 0, time: "18:00", type: "followUp" },
  {
    patient: "couple",
    dayOffset: -10,
    time: "19:00",
    type: "couple",
    consultation: {
      title: "Séance de couple",
      content: doc(
        paragraph("Chacun a pu exprimer ce qu'il attend de l'accompagnement. Tensions autour de la répartition des tâches et du temps passé ensemble."),
        heading("Exercice proposé"),
        paragraph("Un moment de 20 minutes par semaine, sans écran, pour parler de leur semaine."),
      ),
    },
  },
  { patient: "couple", dayOffset: 0, time: "14:00", type: "couple" },
  {
    patient: "sarah",
    dayOffset: -5,
    time: "16:00",
    type: "first",
    consultation: {
      title: "Première séance",
      content: doc(
        paragraph("Se décrit comme « jamais à la hauteur ». Comparaison constante avec ses camarades de promotion."),
        paragraph("Bonne alliance dès la première séance. Rythme hebdomadaire convenu."),
      ),
    },
  },
  { patient: "sarah", dayOffset: 2, time: "16:00", type: "followUp" },
  {
    patient: "julien",
    dayOffset: -3,
    time: "09:00",
    type: "followUp",
    consultation: {
      title: "Séance de suivi",
      content: doc(
        paragraph("Fatigue toujours présente mais sommeil plus réparateur. A repris la marche quotidienne."),
        heading("Reprise du travail"),
        bulletList([
          "Rendez-vous avec la médecine du travail prévu la semaine prochaine",
          "Appréhension autour du retour dans l'open space",
        ]),
      ),
    },
  },
  { patient: "julien", dayOffset: 3, time: "09:00", type: "followUp" },
  { patient: "camille", dayOffset: 1, time: "11:00", type: "first" },
];

const APPOINTMENT_TYPES = {
  first: { name: "Première séance", durationMinutes: 60 },
  followUp: { name: "Séance de suivi", durationMinutes: 50 },
  couple: { name: "Séance de couple", durationMinutes: 75 },
} as const;

const DEMO_TEMPLATE = {
  name: "Séance de suivi",
  content: doc(
    heading("Depuis la dernière séance"),
    paragraph(""),
    heading("Ce qui a été travaillé"),
    paragraph(""),
    heading("Pour la prochaine fois"),
    bulletList([""]),
  ),
};

async function seedDemoData(client: PoolClient, practitionerId: string) {
  const patientIds = new Map<string, string>();
  for (const patient of DEMO_PATIENTS) {
    const { rows } = await client.query(
      `INSERT INTO patients (practitioner_id, first_name, last_name, email, birth_date,
         gender_identity, status, identified_issue, intake_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        practitionerId,
        patient.firstName,
        patient.lastName,
        `${patient.key}@example.com`,
        patient.birthDate,
        patient.genderIdentity,
        patient.status,
        patient.identifiedIssue,
        patient.intakeNotes,
      ]
    );
    patientIds.set(patient.key, rows[0].id);
  }

  const typeIds = new Map<string, string>();
  let displayOrder = 0;
  for (const [key, type] of Object.entries(APPOINTMENT_TYPES)) {
    const { rows } = await client.query(
      `INSERT INTO appointment_types (practitioner_id, name, duration_minutes, display_order)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [practitionerId, type.name, type.durationMinutes, displayOrder++]
    );
    typeIds.set(key, rows[0].id);
  }

  await client.query(
    `INSERT INTO consultation_templates (practitioner_id, name, content) VALUES ($1, $2, $3)`,
    [practitionerId, DEMO_TEMPLATE.name, JSON.stringify(DEMO_TEMPLATE.content)]
  );

  for (const appointment of DEMO_APPOINTMENTS) {
    const { rows } = await client.query(
      `INSERT INTO appointments (patient_id, appointment_type_id, duration_minutes, scheduled_at)
       VALUES ($1, $2, $3, ${parisTime(appointment.dayOffset, appointment.time)})
       RETURNING id, scheduled_at`,
      [
        patientIds.get(appointment.patient),
        typeIds.get(appointment.type),
        APPOINTMENT_TYPES[appointment.type].durationMinutes,
      ]
    );

    if (appointment.consultation) {
      const { title, content } = appointment.consultation;
      await client.query(
        `INSERT INTO consultations (patient_id, appointment_id, title, content, content_text, date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          patientIds.get(appointment.patient),
          rows[0].id,
          title,
          JSON.stringify(content),
          deriveContentText(content),
          rows[0].scheduled_at,
        ]
      );
    }
  }
}

// Crée un espace démo prêt à l'emploi (onboarding fait, email vérifié, modale
// bêta déjà vue) et renvoie des identifiants jetables pour s'y connecter via
// le flux NextAuth habituel. Au passage, purge les espaces démo expirés :
// même logique opportuniste que le rate limiting, faute de cron.
export async function createDemoPractitioner(): Promise<{ email: string; password: string }> {
  const email = `demo-${randomUUID()}@${DEMO_EMAIL_DOMAIN}`;
  const password = randomBytes(24).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 10);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM practitioners
       WHERE email LIKE $1 AND created_at < now() - make_interval(hours => $2)`,
      [`%@${DEMO_EMAIL_DOMAIN}`, DEMO_TTL_HOURS]
    );
    const { rows } = await client.query(
      `INSERT INTO practitioners (email, password_hash, first_name, last_name, specialties,
         email_verified_at, onboarding_completed_at, beta_notice_dismissed_at)
       VALUES ($1, $2, 'Claire', 'Delmas', ARRAY['psychologie'], now(), now(), now())
       RETURNING id`,
      [email, passwordHash]
    );
    await seedDemoData(client, rows[0].id);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return { email, password };
}
