-- Brique 2 (suite) : enrichissement de la fiche patient + champs custom par praticien
-- Ne modifie pas schema.sql : migration à appliquer sur une base déjà initialisée avec la brique 1/2.

ALTER TABLE patients
  ADD COLUMN gender_identity TEXT,
  ADD COLUMN identified_issue TEXT,
  ADD COLUMN address TEXT,
  ADD COLUMN status TEXT,
  ADD COLUMN last_appointment_at TIMESTAMPTZ,
  ADD COLUMN next_appointment_at TIMESTAMPTZ;

CREATE TABLE custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE patient_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  field_definition_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, field_definition_id)
);

CREATE INDEX idx_custom_field_definitions_practitioner ON custom_field_definitions(practitioner_id);
CREATE INDEX idx_patient_custom_field_values_patient ON patient_custom_field_values(patient_id);
CREATE INDEX idx_patient_custom_field_values_definition ON patient_custom_field_values(field_definition_id);
