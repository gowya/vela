-- Le type de champ personnalisé "Choix" n'avait aucun stockage pour la liste
-- d'options : il se comportait comme du texte libre. On ajoute la liste
-- d'options (utilisée uniquement quand field_type = 'choice') et un indicateur
-- de choix unique/multiple.
ALTER TABLE custom_field_definitions
  ADD COLUMN options TEXT[],
  ADD COLUMN allow_multiple BOOLEAN NOT NULL DEFAULT false;
