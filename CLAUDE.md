# Project Overview

Vela (soin-app) est un outil de suivi patient destiné aux praticiens de l'accompagnement humain (psychologues, sexologues, hypnothérapeutes, coachs relationnels, sophrologues, naturopathes). L'application permet la gestion de patientèle, l'authentification des praticiens et le suivi de consultations, avec une exigence forte de discrétion, de rigueur (RGPD/HDS) et de sobriété visuelle. Voir `vela-brand-book.md` pour l'identité de marque complète.

# Architecture

- **Next.js App Router** : routage basé sur `src/app`, avec un mélange de pages serveur (ex. `src/app/page.tsx` qui vérifie la session côté serveur) et de pages client (ex. `src/app/login/page.tsx`) pour l'interactivité des formulaires.
- **Authentification** : NextAuth (`src/lib/auth.ts`) avec un provider Credentials, hashage bcrypt, sessions JWT. La page de connexion est définie via `pages.signIn: "/login"`. Les types de session sont étendus dans `src/types/next-auth.d.ts`.
- **Accès données** : PostgreSQL via `pg` (pool défini dans `src/lib/db.ts`), schéma dans `src/lib/schema.sql`. Pas d'ORM — requêtes SQL directes.
- **API routes** : `src/app/api/auth/[...nextauth]/route.ts` (handler NextAuth) et `src/app/api/signup/route.ts` (inscription, validation Zod, hashage bcrypt, consentement RGPD requis).
- **Design system** : Tailwind CSS v4 (CSS-first, pas de fichier de config JS), tokens définis directement dans `src/app/globals.css`, composants réutilisables sous `src/components/ui/`. Détails dans `claude/ui_guidelines.md`.

Pour plus de détails, voir `claude/architecture.md`.

# Tech Stack

- Next.js (App Router)
- TypeScript (mode strict)
- ShadCN UI (recommandé pour les composants standards — inputs, selects, modales)
- Tailwind CSS

# Coding Conventions

- Utiliser TypeScript en mode strict
- Préférer les composants fonctionnels
- Éviter les exports par défaut

Détails et justifications dans `claude/coding_conventions.md`.

# Folder Structure

```
soin-app/
 ├── CLAUDE.md              # Ce fichier : vue d'ensemble du projet
 ├── claude/                # Documentation détaillée pour Claude
 │   ├── architecture.md
 │   ├── coding_conventions.md
 │   ├── testing_strategy.md
 │   └── ui_guidelines.md
 ├── package.json
 ├── components.json        # Config shadcn/ui
 ├── docker-compose.test.yml # Postgres jetable pour les tests d'intégration
 ├── scripts/
 │   └── setup-test-db.mjs  # Reconstruit le schéma de test (schema.sql + migrations)
 ├── src/
 │   ├── app/                # Routes (App Router) : pages, layouts, API
 │   │   ├── api/            # Routes API (auth, signup)
 │   │   └── login/          # Page de connexion
 │   ├── components/
 │   │   └── ui/             # Composants UI réutilisables (Button, Card, Input, Logo)
 │   ├── lib/                # Logique serveur : auth, connexion DB, schéma SQL
 │   └── types/              # Déclarations de types partagées
 ├── tests/
 │   └── integration/        # Tests des routes API contre un vrai Postgres de test
 ├── public/                 # Assets statiques (logo, images)
 ├── vela-brand-book.md      # Identité de marque complète
 └── vela-moodboard.html     # Moodboard visuel de la marque
```

# Commands

- `npm run dev` — démarre le serveur de développement
- `npm run build` — build de production
- `npm run start` — démarre le serveur en mode production
- `npm run lint` — vérifie le code avec ESLint
- `npm run test` — lance toute la suite de tests (unitaires + intégration, nécessite `npm run test:db:up` au préalable)

# Important Rules

- **Performance** : pas d'animation décorative, uniquement des transitions fonctionnelles (ouverture de dossier, sauvegarde). Privilégier le rendu serveur quand c'est possible pour limiter le JS envoyé au client.
- **Accessibilité** : contrastes suffisants (respecter la palette de marque, jamais de texte gris clair sur fond clair), labels explicites sur tous les champs de formulaire, navigation clavier fonctionnelle, composants ShadCN/Radix à privilégier pour l'accessibilité de base.
- **Testing** : suite de tests unitaires (`src/**/*.test.ts`) + intégration (`tests/integration/`) contre un Postgres jetable, lancée en CI sur chaque push/PR. Voir `claude/testing_strategy.md` pour la philosophie, les commandes et les conventions d'écriture des tests.
