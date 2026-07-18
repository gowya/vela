import { z } from "zod";

// Schémas de validation partagés entre les routes API.
// Convention : les champs optionnels/nullables acceptent une chaîne vide ou null,
// normalisés en `null` avant insertion en base (voir les routes qui les consomment).

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

const emptyStringToNull = (value: unknown) =>
  typeof value === "string" && value.trim().length === 0 ? null : value;

const optionalDateTime = z.preprocess(
  emptyStringToNull,
  z.string().datetime({ message: "Date invalide." }).nullable().optional()
);

// Réservé aux dates de rendez-vous à venir (nextAppointmentAt) : contrairement
// à lastAppointmentAt (un rendez-vous passé, légitimement antérieur à
// aujourd'hui), planifier un rendez-vous dans le passé n'a pas de sens
// (retour test user #01, bug B2).
const optionalFutureDateTime = z.preprocess(
  emptyStringToNull,
  z
    .string()
    .datetime({ message: "Date invalide." })
    .refine((value) => new Date(value).getTime() >= Date.now(), {
      message: "Le rendez-vous ne peut pas être planifié dans le passé.",
    })
    .nullable()
    .optional()
);

const optionalEmail = z.preprocess(
  emptyStringToNull,
  z.string().trim().toLowerCase().email("Email invalide.").nullable().optional()
);

const optionalBirthDate = z.preprocess(
  emptyStringToNull,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date de naissance invalide.")
    .nullable()
    .optional()
);

export const customFieldValueInputSchema = z.object({
  fieldDefinitionId: z.string().uuid("Champ personnalisé invalide."),
  value: z.string().trim().nullable().optional(),
});

export const patientCreateSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est requis."),
  lastName: z.string().trim().min(1, "Le nom est requis."),
  email: optionalEmail,
  phone: optionalTrimmedString,
  birthDate: optionalBirthDate,
  intakeNotes: optionalTrimmedString,
  genderIdentity: optionalTrimmedString,
  identifiedIssue: optionalTrimmedString,
  address: optionalTrimmedString,
  status: optionalTrimmedString,
  // lastAppointmentAt n'est pas un champ ici : calculé en direct depuis
  // `appointments` à la lecture (voir migration 012), jamais saisi.
  nextAppointmentAt: optionalFutureDateTime,
  customFields: z.array(customFieldValueInputSchema).optional().default([]),
});

export const patientUpdateSchema = patientCreateSchema.partial();

export const customFieldTypeSchema = z.enum(["text", "choice", "date", "number"]);

export const customFieldDefinitionCreateSchema = z
  .object({
    fieldName: z.string().trim().min(1, "Le nom du champ est requis."),
    fieldType: customFieldTypeSchema,
    options: z.array(z.string().trim().min(1)).optional().default([]),
    allowMultiple: z.boolean().optional().default(false),
  })
  .refine(
    (data) => data.fieldType !== "choice" || data.options.length >= 2,
    { message: "Un champ à choix nécessite au moins deux options.", path: ["options"] }
  )
  .transform((data) => ({
    ...data,
    options: data.fieldType === "choice" ? data.options : [],
    allowMultiple: data.fieldType === "choice" ? data.allowMultiple : false,
  }));

export const customFieldDefinitionUpdateSchema = z.object({
  showInTable: z.boolean().optional(),
});

export const customFieldReorderSchema = z.object({
  order: z.array(z.string().uuid()).min(1, "L'ordre est requis."),
});

// --- Consultations & templates ---
// Le contenu est un document Tiptap/ProseMirror (éditeur riche façon Notion :
// titres, listes, checklist, pièces jointes, formatage inline), que la
// consultation parte d'un template ou d'une page vierge. On ne valide que la
// forme générique (nœud récursif) plutôt que chaque type de nœud/marque un par
// un : Tiptap garantit déjà la cohérence structurelle côté client, on se
// protège seulement contre un payload malformé ou disproportionné.

const tiptapMarkSchema = z.object({
  type: z.string(),
  attrs: z.record(z.string(), z.any()).optional(),
});

type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: z.infer<typeof tiptapMarkSchema>[];
  content?: TiptapNode[];
  text?: string;
};

const tiptapNodeSchema: z.ZodType<TiptapNode> = z.lazy(() =>
  z.object({
    type: z.string(),
    attrs: z.record(z.string(), z.any()).optional(),
    marks: z.array(tiptapMarkSchema).optional(),
    content: z.array(tiptapNodeSchema).optional(),
    text: z.string().optional(),
  })
);

const MAX_CONTENT_LENGTH = 500_000;

export const consultationContentSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(tiptapNodeSchema),
  })
  .refine((doc) => JSON.stringify(doc).length <= MAX_CONTENT_LENGTH, {
    message: "Contenu trop volumineux.",
  });

// --- Templates de consultation ---
// Un template n'est qu'un point de départ (titre + contenu) capturé depuis une
// consultation existante ("Enregistrer comme template"), pas un formulaire à
// construire à l'avance.

export const consultationTemplateCreateSchema = z.object({
  name: z.string().trim().min(1, "Le nom du modèle est requis."),
  title: optionalTrimmedString,
  content: consultationContentSchema,
});

export const consultationTemplateUpdateSchema = z.object({
  name: z.string().trim().min(1, "Le nom du modèle est requis.").optional(),
  content: consultationContentSchema.optional(),
});

// --- Consultations ---

export const consultationCreateSchema = z.object({
  patientId: z.string().uuid("Patient invalide."),
  templateId: z.string().uuid("Modèle invalide.").nullable().optional(),
  appointmentId: z.string().uuid("Rendez-vous invalide.").nullable().optional(),
  title: optionalTrimmedString,
  date: optionalDateTime,
  content: consultationContentSchema,
});

// patientId, templateId et appointmentId ne sont jamais modifiables après création (une
// consultation ne change pas de patient, le template n'est qu'un point de départ initial,
// et le rendez-vous d'origine reste le même même si ce rendez-vous est renommé/annulé).
export const consultationUpdateSchema = z.object({
  updatedAt: z.string().datetime("Horodatage invalide."),
  title: optionalTrimmedString,
  date: optionalDateTime,
  content: consultationContentSchema.optional(),
});

// --- Rendez-vous ---
// Contrairement à lastAppointmentAt sur les patients (un rendez-vous passé, légitime),
// planifier ou reprogrammer un rendez-vous dans le passé n'a pas de sens (bug B2).
const requiredFutureDateTime = z
  .string()
  .datetime({ message: "Date invalide." })
  .refine((value) => new Date(value).getTime() >= Date.now(), {
    message: "Le rendez-vous ne peut pas être planifié dans le passé.",
  });

// Le type détermine la durée si choisi ; sinon une durée manuelle est requise
// (repli conservant le comportement existant pour qui n'utilise pas le
// catalogue de types de rendez-vous).
const appointmentDurationFields = {
  appointmentTypeId: z.string().uuid("Type de rendez-vous invalide.").nullable().optional(),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(5, "Durée minimale : 5 minutes.")
    .max(480, "Durée maximale : 8 heures.")
    .optional(),
};

export const appointmentCreateSchema = z
  .object({
    patientId: z.string().uuid("Patient invalide."),
    scheduledAt: requiredFutureDateTime,
    ...appointmentDurationFields,
  })
  .refine((data) => data.appointmentTypeId || data.durationMinutes, {
    message: "Choisissez un type de rendez-vous ou indiquez une durée.",
    path: ["durationMinutes"],
  });

export const appointmentRescheduleSchema = z
  .object({
    scheduledAt: requiredFutureDateTime,
    ...appointmentDurationFields,
  })
  .refine((data) => data.appointmentTypeId || data.durationMinutes, {
    message: "Choisissez un type de rendez-vous ou indiquez une durée.",
    path: ["durationMinutes"],
  });

// --- Types de rendez-vous (catalogue) ---

export const appointmentTypeCreateSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(80),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(5, "Durée minimale : 5 minutes.")
    .max(480, "Durée maximale : 8 heures."),
});

export const appointmentTypeUpdateSchema = appointmentTypeCreateSchema;

// --- Horaires d'ouverture ---

const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide.");

const openingHoursDaySchema = z
  .object({
    enabled: z.boolean(),
    start: timeOfDaySchema,
    end: timeOfDaySchema,
  })
  .refine((day) => !day.enabled || day.start < day.end, {
    message: "L'heure de fin doit être après l'heure de début.",
    path: ["end"],
  });

export const openingHoursUpdateSchema = z.object({
  mon: openingHoursDaySchema,
  tue: openingHoursDaySchema,
  wed: openingHoursDaySchema,
  thu: openingHoursDaySchema,
  fri: openingHoursDaySchema,
  sat: openingHoursDaySchema,
  sun: openingHoursDaySchema,
});
