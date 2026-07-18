-- Brique 7 : catalogue de types de rendez-vous (nom + durée, façon catalogue
-- de prestations Qonto) et horaires d'ouverture par jour, pour calibrer la
-- vue Agenda et remplacer le forfait de 50 min utilisé jusqu'ici.

ALTER TABLE practitioners
  ADD COLUMN opening_hours JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE appointment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointment_types_practitioner ON appointment_types(practitioner_id);

-- `appointment_type_id` en ON DELETE SET NULL : supprimer un type ne doit pas
-- supprimer l'historique des rendez-vous déjà pris avec ce type, qui gardent
-- leur duration_minutes figée au moment de la création.
ALTER TABLE appointments
  ADD COLUMN appointment_type_id UUID REFERENCES appointment_types(id) ON DELETE SET NULL,
  ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 50;
