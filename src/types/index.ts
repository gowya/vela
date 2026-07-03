export interface Practitioner {
  id: string;
  email: string;
  name: string;
  specialty: string;
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
  createdAt: Date;
}

// Ces deux-là sont prévues pour les briques 3 et 4, pas encore utilisées.
export interface ConsultationTemplate {
  id: string;
  practitionerId: string;
  name: string;
  fields: Record<string, unknown>;
  createdAt: Date;
}

export interface Consultation {
  id: string;
  patientId: string;
  templateId: string;
  content: Record<string, unknown>;
  date: Date;
  createdAt: Date;
}
