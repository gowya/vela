-- Personnalisation du praticien : ordre d'affichage des champs personnalisés
-- (drawer patient, glisser-déposer) et affichage ou non en colonne dans le
-- tableau Patients. display_order est initialisé sur l'ordre alphabétique
-- existant pour ne rien réordonner au déploiement.
ALTER TABLE custom_field_definitions
  ADD COLUMN display_order INTEGER,
  ADD COLUMN show_in_table BOOLEAN NOT NULL DEFAULT true;

UPDATE custom_field_definitions cfd
SET display_order = ordered.row_number
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY practitioner_id ORDER BY field_name) AS row_number
  FROM custom_field_definitions
) AS ordered
WHERE cfd.id = ordered.id;

ALTER TABLE custom_field_definitions
  ALTER COLUMN display_order SET NOT NULL,
  ALTER COLUMN display_order SET DEFAULT 0;
