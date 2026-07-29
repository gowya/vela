-- Historique de versions des consultations (retour test user #01, C3), à la Figma :
-- checkpoints automatiques throttlés à l'autosave + checkpoints manuels nommables,
-- consultables et restaurables. Jamais purgé : les notes de consultation sont des
-- données de santé à obligation de conservation (même logique que le soft-delete
-- existant sur consultations.deleted_at).

CREATE TABLE consultation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  content_text TEXT NOT NULL,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consultation_versions_consultation ON consultation_versions(consultation_id);
