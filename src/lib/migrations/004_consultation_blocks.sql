-- Brique 3/4 bis : simplification du modèle de templates + passage du contenu
-- des consultations à un éditeur en blocs (voir revue produit : le form-builder
-- Q&A n'apportait aucune valeur avant d'avoir déjà écrit des consultations).

-- Un template n'est plus qu'un point de départ (titre + blocs) capturé depuis
-- une consultation existante, plus un formulaire à construire à l'avance.
ALTER TABLE consultation_templates ADD COLUMN title TEXT;
ALTER TABLE consultation_templates ADD COLUMN blocks JSONB NOT NULL DEFAULT '[]';
ALTER TABLE consultation_templates DROP COLUMN fields;

-- Le contenu d'une consultation est toujours une liste de blocs, que la
-- consultation parte d'un template ou d'une page vierge : templateId n'est
-- plus qu'une métadonnée (badge, traçabilité), jamais une forme différente
-- de `content`. On remplace donc l'ancien garde-fou conditionnel par un
-- garde-fou unique.
ALTER TABLE consultations DROP CONSTRAINT consultations_content_shape_chk;
ALTER TABLE consultations ADD CONSTRAINT consultations_content_shape_chk
  CHECK (content ? 'blocks');
