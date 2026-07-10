-- Brique 1 : fondations, à exécuter en premier

CREATE TABLE practitioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  specialty TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Brique 2 : fiche patient et prise d'infos

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  intake_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patients_practitioner ON patients(practitioner_id);

-- Brique 3 : templates de consultation (pas encore câblée côté app)

CREATE TABLE consultation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Brique 3/4 : consultations liées à un patient et un template

CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES consultation_templates(id),
  content JSONB NOT NULL DEFAULT '{}',
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consultations_patient ON consultations(patient_id);

-- Brique 4 : QCM générés depuis les PDF existants (pas encore câblée)

CREATE TABLE qcm_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE qcm_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES qcm_forms(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Brique 5 : inscription multi-écrans, vérification email, onboarding, bêta

ALTER TABLE practitioners
  ADD COLUMN first_name TEXT,
  ADD COLUMN last_name TEXT,
  ADD COLUMN phone TEXT,
  ADD COLUMN email_verified_at TIMESTAMPTZ,
  ADD COLUMN onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN beta_notice_dismissed_at TIMESTAMPTZ;

-- Backfill des comptes existants : split de `name` sur le premier espace.
UPDATE practitioners
SET first_name = COALESCE(NULLIF(split_part(name, ' ', 1), ''), name),
    last_name  = NULLIF(substring(name FROM position(' ' IN name) + 1), '')
WHERE first_name IS NULL;

-- Comptes existants traités comme déjà onboardés/vérifiés pour ne pas les
-- renvoyer dans l'onboarding rétroactivement.
UPDATE practitioners
SET onboarding_completed_at = COALESCE(onboarding_completed_at, created_at),
    email_verified_at = COALESCE(email_verified_at, created_at)
WHERE first_name IS NOT NULL;

ALTER TABLE practitioners DROP COLUMN name;

CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_verification_tokens_practitioner ON email_verification_tokens(practitioner_id);

CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_practitioner ON feedback(practitioner_id);

-- Compteur de visites dashboard, utilisé pour ne pas afficher la modale bêta
-- dès la toute première arrivée post-onboarding (retour revue Karen).
ALTER TABLE practitioners
  ADD COLUMN dashboard_visits_count INTEGER NOT NULL DEFAULT 0;

-- Motif de départ à la suppression de compte, anonyme (pas de practitioner_id)
-- pour permettre l'analyse des raisons de churn sans conserver de PII après
-- suppression définitive du compte (retour revue Karen).
CREATE TABLE account_deletion_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
