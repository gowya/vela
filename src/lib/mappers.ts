import type {
  Consultation,
  ConsultationAttachment,
  ConsultationListItem,
  ConsultationTemplate,
  CustomFieldDefinition,
  Patient,
} from "@/types";
import { normalizeConsultationContent } from "@/lib/consultation-utils";

// Convertit les lignes SQL (snake_case) en objets applicatifs (camelCase).
// Centralisé ici pour éviter que chaque route API ne réécrive le même mapping.

export function mapPatientRow(row: {
  id: string;
  practitioner_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  intake_notes: string | null;
  gender_identity: string | null;
  identified_issue: string | null;
  address: string | null;
  status: string | null;
  last_appointment_at: Date | null;
  next_appointment_at: Date | null;
  created_at: Date;
}): Patient {
  return {
    id: row.id,
    practitionerId: row.practitioner_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    birthDate: row.birth_date,
    intakeNotes: row.intake_notes,
    genderIdentity: row.gender_identity,
    identifiedIssue: row.identified_issue,
    address: row.address,
    status: row.status,
    lastAppointmentAt: row.last_appointment_at,
    nextAppointmentAt: row.next_appointment_at,
    createdAt: row.created_at,
  };
}

export function mapCustomFieldDefinitionRow(row: {
  id: string;
  practitioner_id: string;
  field_name: string;
  field_type: string;
  options: string[] | null;
  allow_multiple: boolean;
  display_order: number;
  show_in_table: boolean;
  created_at: Date;
}): CustomFieldDefinition {
  return {
    id: row.id,
    practitionerId: row.practitioner_id,
    fieldName: row.field_name,
    fieldType: row.field_type as CustomFieldDefinition["fieldType"],
    options: row.options,
    allowMultiple: row.allow_multiple,
    displayOrder: row.display_order,
    showInTable: row.show_in_table,
    createdAt: row.created_at,
  };
}

export function mapConsultationTemplateRow(row: {
  id: string;
  practitioner_id: string;
  name: string;
  title: string | null;
  content: unknown;
  created_at: Date;
}): ConsultationTemplate {
  return {
    id: row.id,
    practitionerId: row.practitioner_id,
    name: row.name,
    title: row.title,
    content: normalizeConsultationContent(row.content),
    createdAt: row.created_at,
  };
}

export function mapConsultationRow(row: {
  id: string;
  patient_id: string;
  template_id: string | null;
  title: string | null;
  content: unknown;
  content_text: string;
  date: Date;
  updated_at: Date;
  created_at: Date;
}): Consultation {
  return {
    id: row.id,
    patientId: row.patient_id,
    templateId: row.template_id,
    title: row.title,
    content: normalizeConsultationContent(row.content),
    contentText: row.content_text,
    date: row.date,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

export function mapConsultationAttachmentRow(row: {
  id: string;
  consultation_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: Date;
}): ConsultationAttachment {
  return {
    id: row.id,
    consultationId: row.consultation_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

const EXCERPT_LENGTH = 140;

export function mapConsultationListItemRow(row: {
  id: string;
  patient_id: string;
  patient_first_name: string;
  patient_last_name: string;
  template_id: string | null;
  template_name: string | null;
  title: string | null;
  content_text: string;
  date: Date;
  updated_at: Date;
}): ConsultationListItem {
  const trimmed = row.content_text.trim();
  const excerpt =
    trimmed.length > EXCERPT_LENGTH
      ? `${trimmed.slice(0, EXCERPT_LENGTH)}…`
      : trimmed;

  return {
    id: row.id,
    patientId: row.patient_id,
    patientFirstName: row.patient_first_name,
    patientLastName: row.patient_last_name,
    templateId: row.template_id,
    templateName: row.template_name,
    title: row.title,
    excerpt,
    date: row.date,
    updatedAt: row.updated_at,
  };
}
