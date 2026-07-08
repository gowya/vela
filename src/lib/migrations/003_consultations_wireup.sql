-- Brique 3/4 : câblage des consultations et des templates côté app.
-- Les tables consultations / consultation_templates existent déjà (schema.sql),
-- cette migration ajoute ce qui manque pour les exposer via l'API.

-- Titre optionnel affiché dans les listes (sinon on affiche la date).
ALTER TABLE consultations ADD COLUMN title TEXT;

-- Texte brut extrait du contenu (markdown, ou concaténation des réponses de
-- template), utilisé pour la recherche indépendamment du mode de saisie.
ALTER TABLE consultations ADD COLUMN content_text TEXT NOT NULL DEFAULT '';

-- Nécessaire pour le verrouillage optimiste sur l'autosave (voir PATCH /api/consultations/[id]).
ALTER TABLE consultations ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Suppression douce : une consultation supprimée disparaît des listes/recherche
-- mais reste en base (notes de santé potentiellement soumises à obligation de conservation).
ALTER TABLE consultations ADD COLUMN deleted_at TIMESTAMPTZ;

-- Un template supprimé ne doit pas bloquer (FK RESTRICT par défaut) ni supprimer
-- l'historique clinique : on détache juste la référence, content_text garde le texte.
ALTER TABLE consultations DROP CONSTRAINT consultations_template_id_fkey;
ALTER TABLE consultations ADD CONSTRAINT consultations_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES consultation_templates(id) ON DELETE SET NULL;

-- Garde-fou de cohérence : pas de tag redondant dans le JSONB, on dérive le mode
-- de template_id, mais on garantit que le contenu a la forme attendue selon le mode.
ALTER TABLE consultations ADD CONSTRAINT consultations_content_shape_chk
  CHECK (
    (template_id IS NULL AND content ? 'markdown')
    OR (template_id IS NOT NULL AND content ? 'answers')
  );

CREATE INDEX idx_consultations_date ON consultations(date DESC);
CREATE INDEX idx_consultation_templates_practitioner ON consultation_templates(practitioner_id);

-- Recherche insensible aux accents (notes cliniques en français : "dépression" doit
-- matcher "depression"). Extension standard, disponible sur Postgres géré (Clever Cloud).
CREATE EXTENSION IF NOT EXISTS unaccent;
