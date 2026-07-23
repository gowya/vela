-- Un praticien peut exercer plusieurs pratiques (ex. sexologie + hypnothérapie) :
-- specialty (unique) devient specialties (tableau). Colonne specialty conservée
-- pour l'instant, dépréciée — à supprimer dans une migration ultérieure une fois
-- ce code déployé partout (cf. convention du projet : pas de suppression de
-- colonne tant que du code en prod peut encore y écrire/lire).
ALTER TABLE practitioners ADD COLUMN specialties TEXT[] NOT NULL DEFAULT '{}';

-- Backfill : anciens slugs "métier" -> nouveaux slugs "discipline".
UPDATE practitioners
SET specialties = CASE specialty
  WHEN 'psychologue' THEN ARRAY['psychologie']
  WHEN 'sexologue' THEN ARRAY['sexologie']
  WHEN 'hypnotherapeute' THEN ARRAY['hypnotherapie']
  WHEN 'coach_relationnel' THEN ARRAY['coaching_relationnel']
  WHEN 'sophrologue' THEN ARRAY['sophrologie']
  WHEN 'naturopathe' THEN ARRAY['naturopathie']
  WHEN 'autre' THEN ARRAY['autre']
  ELSE '{}'
END
WHERE specialty IS NOT NULL;
