# Roadmap avant lancement de prospection

Issue de la review produit du 2026-07-29 (Karen, CPO), ancrée dans le code réel
du dépôt. Objectif : lister ce qui doit être réglé **avant** d'envoyer les
premiers emails de prospection à de vrais praticiens.

Constat général : le produit métier (patients, consultations, rendez-vous,
historique de versions) est solide. Ce qui manque relève de l'enveloppe
opérationnelle — récupération de compte, persistance des fichiers, mobile. Ce
sont des chantiers courts mais bloquants : on ne perd pas un prospect sur un
tooltip, on le perd sur un mot de passe oublié.

## Bloquants (à faire avant le premier email de prospection)

### 1. Pièces jointes perdues en production

`src/lib/attachment-storage.ts` écrit dans `process.cwd()/.attachments`. Sur
Vercel le système de fichiers est éphémère et en lecture seule hors `/tmp` :
l'upload part en 500 (aucun `try/catch` autour du `save` dans
`POST /api/consultations/[id]/attachments`), ou passe et disparaît au
redéploiement suivant.

Le commentaire en tête du fichier signale déjà le problème (« provider
temporaire et NON conforme HDS »), mais il a été écrit avant que le bouton
« Joindre un fichier » soit exposé dans l'éditeur de consultation.

- **Fix court (10 min)** : masquer le bouton d'upload derrière un flag, le temps
  d'avoir un vrai stockage. Supprime immédiatement le risque de perte de données
  de santé.
- **Fix complet (~2 h)** : Vercel Blob en mode privé. L'interface
  `AttachmentStorage` est déjà en place, seule l'implémentation change.

### 2. Aucune récupération de mot de passe

Aucune route, aucun écran. Un praticien qui oublie son mot de passe perd
définitivement l'accès à sa patientèle — le seul recours est une intervention
manuelle en base.

Sur 10 prospects, 1 à 2 oublieront leur mot de passe le premier mois. C'est le
fix au meilleur ratio impact/effort de cette liste.

- **Fix** : reset par token email. Le pattern existe déjà pour
  `email_verification_tokens` (table, génération, expiration) — il suffit de le
  décliner.

### 3. Email de confirmation muet en production

`RESEND_FROM_EMAIL` n'est pas défini en prod : `src/lib/email.ts` retombe sur
l'adresse sandbox `onboarding@resend.dev`, qui n'accepte l'envoi que vers le
titulaire du compte Resend. L'échec est avalé dans un `console.error`, donc
invisible côté produit comme côté monitoring.

Sans conséquence technique aujourd'hui (`src/lib/auth.ts` ne vérifie jamais
`email_verified_at`, la connexion fonctionne), mais du point de vue du prospect
la première promesse du produit n'est pas tenue dans les 60 premières secondes.

- **Fix** : vérifier un domaine d'envoi dans Resend, poser `RESEND_FROM_EMAIL`
  en prod. Faire aussi remonter l'échec d'envoi plutôt que de l'avaler.

### 4. Produit cassé sur mobile

Zéro breakpoint responsive (`sm:`/`md:`/`lg:`) dans `PatientsList`,
`ConsultationEditor`, `AppointmentsList` et le dashboard. `px-16` en dur, soit
70,4 px de padding de chaque côté avec l'échelle racine à 110 %.

Mesuré à 467 px de viewport : 140 px de padding, le bouton « Ajouter un
patient » sort du cadre.

Les liens de prospection s'ouvrent majoritairement sur téléphone : le prospect
juge sur ce qu'il a sous les yeux et ne revient pas sur desktop.

- **Fix (~½ journée)** : `px-4 md:px-16` sur les 7 fichiers concernés. Pas
  besoin d'une app mobile — il suffit que login et dashboard ne soient pas
  cassés.

## À trancher (pas bloquant techniquement, bloquant commercialement)

### 5. Offre Pro fantôme

« Passer à l'offre Pro » dans le menu du compte affiche un toast « Les
abonnements arrivent bientôt ». Il faut décider avant le premier appel de
prospection : bêta gratuite assumée, ou facturation réelle (Stripe).

Tant que la réponse est « bientôt », on récolte du feedback, pas des clients —
et le niveau de finition attendu n'est pas le même.

### 6. Hébergement des données de santé (HDS)

La cible (psychologues, sexologues…) manipule des données de santé au sens du
RGPD (art. 9). Ni Neon ni Vercel ne sont hébergeurs de données de santé
certifiés. À trancher : positionnement bêta explicite et documenté, ou migration
vers un hébergeur certifié.

## Idées UI (non bloquant, à faire dans un commit dédié)

### 7. Bouton « + » de l'historique de versions peu visible

Dans `ConsultationVersionHistory.tsx`, le bouton pour créer un checkpoint manuel
est un `PlusIcon` en `variant="ghost" size="icon-sm"`, seul dans l'en-tête du
panneau — trop discret pour une action qu'on veut que le praticien découvre et
utilise (checkpoint avant une réécriture importante). À retravailler pour plus
de poids visuel (libellé visible, ou `variant="outline"`).

### 8. « Enregistrer comme modèle » : visibilité conditionnelle + repositionnement

Dans `ConsultationEditor.tsx`, le bouton « Enregistrer comme modèle » est
aujourd'hui toujours affiché sous la ligne titre/date, même sur une
consultation vide — un modèle vide n'a pas de sens.

- **Masquer le bouton** tant que le praticien n'a rien écrit dans le contenu de
  la consultation (comparer à `EMPTY_CONSULTATION_CONTENT`).
- **Le déplacer** entre l'input Titre et le `DateTimePicker` (actuellement sur
  la ligne du dessous, à côté de « Partir d'un modèle »).
- **Animation** : apparition en fondu depuis la gauche (fade + slide-in) au
  moment où il devient pertinent, avec le champ Titre qui rétrécit en fondu au
  même instant pour lui faire de la place — les deux transitions synchronisées,
  pas un simple `display: none` qui fait sauter la mise en page.

## Déjà en place (ne bloque pas)

Pour mémoire, à ne pas re-challenger : soft-delete généralisé, verrou optimiste
sur l'autosave des consultations, rate limiting (`008_rate_limiting.sql`), pages
légales publiées, export RGPD (`GET /api/account/export`), suppression de compte
avec motif anonymisé, historique de versions des consultations, suite de tests
(115 tests, unitaires + intégration).
