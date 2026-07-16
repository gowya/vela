-- Brique 6 : rendez-vous comme entité réelle (retour test user #01 / revue Karen)
-- Remplace la dérivation "rdv = patients.next_appointment_at" par une vraie table,
-- pour permettre un lien stable consultation <-> rendez-vous (fix duplication B1).

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);

ALTER TABLE consultations
  ADD COLUMN appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX uq_consultations_appointment_active
  ON consultations(appointment_id)
  WHERE appointment_id IS NOT NULL AND deleted_at IS NULL;

-- Backfill : les rendez-vous déjà planifiés sur les fiches patient deviennent de vrais
-- rendez-vous, pour que le Dashboard ne perde aucun rdv existant au moment du switch.
INSERT INTO appointments (patient_id, scheduled_at)
SELECT id, next_appointment_at FROM patients WHERE next_appointment_at IS NOT NULL;
