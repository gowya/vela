# Architecture

## Vue d'ensemble

Vela est une application Next.js (App Router) monolithique : le frontend et les routes API vivent dans le même projet. Pas de séparation backend/frontend en services distincts pour l'instant.

## Composants majeurs

### Routage (`src/app`)

- `src/app/page.tsx` : page racine, Server Component. Vérifie la session via `getServerSession(authOptions)` et redirige vers `/login` si l'utilisateur n'est pas authentifié.
- `src/app/login/page.tsx` : page de connexion, Client Component (`"use client"`). Gère le formulaire email/mot de passe et appelle `signIn("credentials", ...)` de next-auth.
- `src/app/layout.tsx` : layout racine, charge les polices de marque (Fraunces, Inter, IBM Plex Mono) via `next/font/google` et les expose en variables CSS.

### Authentification (`src/lib/auth.ts`, `src/types/next-auth.d.ts`)

- Provider unique : `CredentialsProvider`. Pas d'OAuth (Google, etc.) configuré — ne pas ajouter de bouton de connexion tierce sans provider correspondant.
- Vérification du mot de passe via bcryptjs contre la table `practitioners`.
- Stratégie de session : JWT.
- Les types `Session`/`JWT` sont étendus pour inclure `id: string`.

### Accès aux données (`src/lib/db.ts`, `src/lib/schema.sql`)

- Pool de connexions PostgreSQL via le package `pg`.
- Pas d'ORM : les requêtes SQL sont écrites directement.
- Le schéma de base de données est versionné dans `src/lib/schema.sql`, découpé en "briques" ajoutées progressivement.
- Chaîne de dépendance actuelle (clés étrangères `ON DELETE CASCADE` de haut en bas) :
  - `practitioners` (praticien, racine de toute donnée — un compte par praticien).
  - `patients` : rattaché à un praticien via `practitioner_id`. Un patient n'appartient qu'à un seul praticien (pas de patientèle partagée entre praticiens).
  - `consultations` : rattachée à un patient via `patient_id`, et optionnellement à un `consultation_templates.id` via `template_id`. C'est la table pivot du suivi patient/consultation — toute évolution de la relation patient ↔ consultation doit passer par cette clé.
  - `consultation_templates` : rattaché à un praticien (`practitioner_id`), sert de gabarit de champs (`fields` JSONB) pour structurer les consultations. Pas encore câblé côté app.
  - `qcm_forms` / `qcm_responses` : formulaires QCM rattachés à un praticien, réponses rattachées à un patient. Pas encore câblés côté app.
- Point de vigilance pour les évolutions futures du suivi patient/consultation : la relation `patients` → `consultations` est 1-N stricte (un patient a plusieurs consultations), toujours scopée par `practitioner_id` en amont — toute requête doit filtrer par praticien pour éviter une fuite de données entre patientèles.

### API (`src/app/api`)

- `api/auth/[...nextauth]/route.ts` : handler standard NextAuth (GET/POST).
- `api/signup/route.ts` : création de compte praticien. Validation des entrées avec Zod, hashage bcrypt du mot de passe, consentement RGPD obligatoire à la création.

### Design system (`src/app/globals.css`, `src/components/ui`, `components.json`)

- Tailwind CSS v4 (CSS-first, pas de `tailwind.config.ts` — les tokens sont définis directement dans `globals.css` via `:root`/`.dark` + un bloc `@theme inline`).
- Base shadcn/ui pure : palette neutre par défaut (`baseColor: "stone"`), tokens sémantiques standards (`background`, `primary`, `card`, etc.) définis en `oklch()` dans `globals.css`. Aucun token de couleur de marque personnalisé n'est appliqué pour l'instant (décision explicite, voir `ui_guidelines.md`).
- Composants sous `src/components/ui` : tous générés par `shadcn` (`button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`, basés sur `@base-ui/react` + `class-variance-authority`), à l'exception de `Logo.tsx` qui est spécifique à l'app.
- `shadcn/ui` est initialisé (`components.json`) et le projet est aligné avec la CLI (Tailwind v4 des deux côtés) — `npx shadcn add <composant>` fonctionne nativement, sans patch manuel requis.

## Flux d'authentification

1. Utilisateur non connecté arrive sur `/` → redirection serveur vers `/login`.
2. Soumission du formulaire → `signIn("credentials", { email, password, redirect: false })`.
3. En cas d'erreur, message générique affiché ("Email ou mot de passe incorrect."), sans détail sur la cause exacte (sécurité).
4. En cas de succès, redirection vers l'URL de callback (`/` par défaut).

## Points d'attention pour les évolutions futures

- Si un provider OAuth est ajouté (Google, etc.), penser à réintroduire le bouton correspondant dans `login/page.tsx` et à documenter le provider dans `auth.ts`.
- Toute nouvelle donnée patient sensible doit transiter par des requêtes paramétrées (`pg`) — jamais de concaténation SQL brute (protection injection SQL).
- Le mode sombre existe via la classe `.dark` (tokens shadcn dupliqués dans `globals.css`) mais n'est pas encore branché sur un composant de bascule dans l'interface.
