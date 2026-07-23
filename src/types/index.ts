import type { JSONContent } from "@tiptap/core";

export interface Practitioner {
  id: string;
  email: string;
  name: string;
  specialties: string[];
  createdAt: Date;
}

export interface Patient {
  id: string;
  practitionerId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  intakeNotes: string | null;
  genderIdentity: string | null;
  identifiedIssue: string | null;
  address: string | null;
  status: string | null;
  lastAppointmentAt: Date | null;
  nextAppointmentAt: Date | null;
  createdAt: Date;
  // Uniquement peuplé par la liste des patients (colonnes dynamiques du
  // tableau) : valeurs des champs personnalisés, indexées par field_definition_id.
  customFieldValues?: Record<string, string>;
}

// Rendez-vous planifié pour un patient. Une consultation peut être liée à un
// rendez-vous (appointmentId non null) ou exister seule (suivi ponctuel sans
// rdv préalable) — voir consultations.appointment_id, nullable.
export interface Appointment {
  id: string;
  patientId: string;
  scheduledAt: Date;
  // Figée au moment de la création (copiée depuis appointmentType si choisi) :
  // supprimer ou modifier le type plus tard ne doit pas changer les rendez-vous
  // déjà pris.
  durationMinutes: number;
  appointmentTypeId: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Version allégée retournée par la liste de l'onglet Rendez-vous : inclut le nom du
// patient (jointure), sans les métadonnées de création/mise à jour.
export interface AppointmentListItem {
  id: string;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  scheduledAt: Date;
  durationMinutes: number;
  appointmentTypeId: string | null;
  // Nom du type au moment de la requête (jointure) : peut être null si le type
  // a été supprimé depuis, le rendez-vous garde alors sa durée mais perd le nom.
  appointmentTypeName: string | null;
  cancelledAt: Date | null;
}

// Catalogue de types de rendez-vous réutilisables du praticien (façon
// catalogue de prestations Qonto) : un nom associé à une durée par défaut.
export interface AppointmentType {
  id: string;
  practitionerId: string;
  name: string;
  durationMinutes: number;
  displayOrder: number;
  createdAt: Date;
}

export type OpeningHoursDayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface OpeningHoursDay {
  enabled: boolean;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

// Vide/absent = non configuré : aucune restriction n'est appliquée à la vue
// calendrier (comportement identique à avant l'ajout de ce réglage).
export type OpeningHours = Partial<Record<OpeningHoursDayKey, OpeningHoursDay>>;

export type CustomFieldType = "text" | "choice" | "date" | "number";

export interface CustomFieldDefinition {
  id: string;
  practitionerId: string;
  fieldName: string;
  fieldType: CustomFieldType;
  // Uniquement pour fieldType === "choice" : liste des options proposées.
  options: string[] | null;
  // Uniquement pertinent pour fieldType === "choice" : sélection unique ou multiple.
  allowMultiple: boolean;
  // Position dans la section "Champs personnalisés" du drawer patient (drag & drop).
  displayOrder: number;
  // Si le praticien a choisi d'afficher ce champ en colonne dans le tableau Patients.
  showInTable: boolean;
  createdAt: Date;
}

export interface PatientCustomFieldValue {
  id: string;
  patientId: string;
  fieldDefinitionId: string;
  value: string | null;
  updatedAt: Date;
}

// Éditeur riche façon Notion (Tiptap/ProseMirror) : le contenu est un document
// JSON arborescent (titres, listes, checklist, pièces jointes, formatage inline
// gras/italique/souligné/taille/couleur), pas une simple liste de lignes à texte
// plat — nécessaire pour représenter du formatage mixte au sein d'une même ligne.
export type ConsultationContent = JSONContent;

// Un template n'est qu'un point de départ (titre + contenu pré-rempli) capturé
// depuis une consultation existante via "Enregistrer comme template" — ce n'est
// pas un formulaire structuré à construire à l'avance.
export interface ConsultationTemplate {
  id: string;
  practitionerId: string;
  name: string;
  title: string | null;
  content: ConsultationContent;
  createdAt: Date;
}

// Pièce jointe rattachée à une consultation (nœud "attachment" dans le document
// Tiptap). Les fichiers ne sont jamais servis par URL directe : uniquement via
// une route API authentifiée (voir src/app/api/attachments/[id]/route.ts).
export interface ConsultationAttachment {
  id: string;
  consultationId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface Consultation {
  id: string;
  patientId: string;
  templateId: string | null;
  appointmentId: string | null;
  title: string | null;
  content: ConsultationContent;
  contentText: string;
  date: Date;
  updatedAt: Date;
  createdAt: Date;
}

// Version allégée retournée par la liste : jamais le contenu complet (données de
// santé sensibles), seulement un extrait tronqué pour l'aperçu.
export interface ConsultationListItem {
  id: string;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  templateId: string | null;
  templateName: string | null;
  title: string | null;
  excerpt: string;
  date: Date;
  updatedAt: Date;
}
