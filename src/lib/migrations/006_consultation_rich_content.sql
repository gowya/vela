-- Brique 5 : éditeur riche façon Notion pour les consultations (formatage inline
-- gras/italique/souligné/taille/couleur, titres H1-H3, listes, checklist, pièces
-- jointes). Le contenu passe d'une liste de blocs à texte plat à un document
-- ProseMirror/Tiptap (JSON arborescent), seule façon de représenter du formatage
-- inline mixte au sein d'une même ligne.
--
-- Aucune réécriture batch des lignes existantes : la conversion ancien format
-- (`{ blocks: [...] }`) -> nouveau format (`{ type: "doc", content: [...] }`) se
-- fait paresseusement côté application (voir normalizeConsultationContent dans
-- src/lib/consultation-utils.ts), à chaque lecture. Le garde-fou ci-dessous
-- accepte donc les deux formes tant que les anciennes lignes n'ont pas été
-- réenregistrées.
ALTER TABLE consultations DROP CONSTRAINT consultations_content_shape_chk;
ALTER TABLE consultations ADD CONSTRAINT consultations_content_shape_chk
  CHECK (content ? 'blocks' OR content ? 'type');

-- Un template de consultation contient la même forme de contenu qu'une
-- consultation (avant : liste de blocs sous `blocks`, maintenant : document
-- Tiptap) : on aligne le nom de colonne sur `consultations.content` pour éviter
-- toute confusion.
ALTER TABLE consultation_templates RENAME COLUMN blocks TO content;

-- Pièces jointes de consultation. Les fichiers eux-mêmes ne sont jamais servis
-- directement par URL : uniquement via une route API authentifiée qui vérifie
-- l'appartenance practitioner -> patient -> consultation -> pièce jointe.
-- `storage_key` est l'identifiant opaque utilisé par le storage provider
-- (voir src/lib/attachment-storage.ts) ; le provider courant est un stockage
-- filesystem local temporaire, non conforme HDS, à remplacer avant tout
-- déploiement avec de vraies pièces jointes patients.
CREATE TABLE consultation_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consultation_attachments_consultation ON consultation_attachments(consultation_id);
