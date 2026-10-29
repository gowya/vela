# UI Guidelines

Référence complète : `docs/brand/vela-brand-book.md` et `docs/brand/vela-moodboard.html`. Ce fichier résume les règles applicables au code.

## Palette

Le projet utilise la palette neutre par défaut de shadcn/ui (`baseColor: "stone"`, voir `components.json`), exprimée en tokens sémantiques standards directement dans `src/app/globals.css` (Tailwind v4, syntaxe CSS-first : `:root`/`.dark` + `@theme inline`, pas de `tailwind.config.ts`) : `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `chart-1..5`, `sidebar*`.

Décision actuelle : ne pas réintroduire de tokens de couleur personnalisés (les anciens `sable`/`encre`/`vin`/`sauge`/`brume`/`blanc-chaud` ont été retirés) pour rester sur une base shadcn pure et éviter les incompatibilités Tailwind v3/v4 rencontrées lors des premiers essais. Si la palette de marque doit être réintégrée, le faire en réassignant les valeurs hex du brand book directement aux variables CSS existantes (`--primary`, `--background`, etc.) dans `globals.css`, sans ajouter de nouveaux noms de tokens.

## Typographie

Polices chargées via `next/font/google` dans `src/app/layout.tsx`, exposées en variables CSS (`--font-fraunces`, `--font-inter`, `--font-mono`, plus `--font-heading` injecté par shadcn) et consommées directement dans `globals.css`/les classes utilitaires (`font-sans`, `font-mono`, etc.) :

- `font-display` (Fraunces) : réservé à la marque (logo, wordmark "vela"). Ne jamais l'utiliser dans l'interface produit elle-même.
- `font-sans` (Inter) : police par défaut de toute l'interface produit.
- `font-mono` (IBM Plex Mono) : réservé aux données factuelles chiffrées (dates et heures au format numérique, durées, compteurs, identifiants), jamais au texte rédigé ni aux dates écrites en toutes lettres ("Jeudi 29 octobre"). Exception assumée à la règle Fraunces : le "Bonjour" du tableau de bord.

## Composants (`src/components/ui`)

Tous les composants sont générés par la CLI `shadcn` (basés sur `@base-ui/react` + `class-variance-authority`), à l'exception de `Logo` et `password-input` qui sont spécifiques à l'app :

- `Logo` (`Logo.tsx`, PascalCase) : affiche le logo Vela, version vin en clair et sable en sombre.
- `button.tsx` : variantes `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`. Tailles `default` (h-8, text-sm), `lg` (h-9, écrans hors app), `sm` et `xs` (compactes, pour les tableaux, barres d'outils et menus), `icon*`. Sans largeur imposée — ajouter `w-full` pour un CTA pleine largeur.
- `card.tsx` : `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`. Le padding interne est géré via une variable CSS (`--card-spacing`, syntaxe fonction Tailwind v4 `px-(--card-spacing)`) — fonctionne nativement, pas besoin de repasser du padding explicite en `className` sauf pour ajuster ponctuellement une mise en page.
- `input.tsx`, `select.tsx`, `textarea.tsx`, `combobox.tsx` : champs en h-8 / text-sm par défaut.
- `field.tsx` (sous-ensemble du `field` shadcn) : `Field` + `FieldLabel` + champ + `FieldDescription` (aide) pour chaque champ de formulaire, `FieldGroup` pour empiler des champs. `FieldError` pour toute erreur : elle est annoncée aux lecteurs d'écran (`role="alert"`) et ne rend rien sans contenu (`<FieldError>{error}</FieldError>`). Pas de `<p className="text-destructive">` à la main. Sur un champ en erreur, poser aussi `aria-invalid`. Ne jamais empiler un `Label` et un champ dans un `<div>` nu ni régler l'écart en `mb-*` : `Combobox` et `DatePicker` posent déjà `gap-1.5`, tout autre champ doit passer par `Field` pour que deux colonnes voisines restent alignées.
- `alert.tsx` (`alert` shadcn) : messages en encadré (session expirée, confirmation…). Variantes `default`, `destructive`, `success` (sauge).
- `password-input.tsx` : champ mot de passe avec bouton afficher / masquer, à utiliser pour tout mot de passe.

Composants de mise en page (dans `src/components/`) :

- `PageShell` : conteneur de chaque page de l'app (marges qui suivent la largeur d'écran, rythme vertical). C'est le seul `<main>` de la page (`SidebarInset` est une `<div>`). Ne pas recréer de `<main className="px-16 …">`.
- `PageHeader` : titre de page + `meta` (compteur…) + `actions`, qui passent à la ligne sur mobile au lieu de déborder.
- `AppSidebar` / `AppMobileHeader` : sous 768px la barre latérale est un panneau masqué ; `AppMobileHeader` (bouton menu + logo) est alors le seul accès à la navigation. Tout lien de la barre doit la refermer sur mobile (`closeOnMobile`).

## Mobile

Toute page doit rester utilisable à 375px de large : grilles de formulaire en `grid-cols-1 sm:grid-cols-2`, rangées titre + actions en `flex-wrap`, panneaux plein écran avec un bouton Fermer visible.
- `AuthShell` : gabarit des écrans hors de l'app (connexion, onboarding, compte supprimé, 404, erreur) — logo hors de la carte, carte resserrée, titre court aligné à gauche, liens légaux. Ces écrans utilisent `authFieldClassName` (h-9) et des boutons `size="lg"`.

Toute nouvelle interface doit composer avec ces éléments avant d'en créer de nouveaux. Ne pas dupliquer un composant déjà généré par shadcn — utiliser `npx shadcn add <composant>` pour en ajouter d'autres.

## Ajouter des composants shadcn

Le projet est sur **Tailwind CSS v4**, aligné avec la version ciblée nativement par la CLI `shadcn`. `npx shadcn@latest add <composant>` peut donc être utilisé directement, sans patch manuel :

1. Lancer `npx shadcn@latest add <composant>`.
2. Vérifier que le fichier généré atterrit bien dans `src/components/ui/` en minuscules (convention shadcn) et qu'il n'écrase pas silencieusement un composant existant portant un nom proche (attention : le système de fichiers macOS est insensible à la casse — `Card.tsx` et `card.tsx` désignent le même fichier).
3. Relancer `npm run build` pour confirmer qu'aucune régression n'est introduite.

## Principes d'interface (brand book §5)

- Beaucoup d'espace blanc ; la hiérarchie vient de la typographie, pas du remplissage.
- Pas d'animation décorative — seulement des transitions fonctionnelles (ouverture de dossier, sauvegarde).
- Aucune notification intrusive pendant une consultation.
- Rayons de bordure discrets (6–8px), jamais de formes trop arrondies façon app grand public.
- Taille de texte minimale : `text-xs`. Pas de `text-[0.6rem]` ou équivalent, y compris dans les composants shadcn.
- Focus en sauge (`--ring`), jamais en vin : un halo vin se lit comme une erreur.
- Listes de l'app (Patients, Rendez-vous, Consultations) : tableau encadré `rounded-lg border bg-card`, ligne cliquable, l'entité principale (le patient) en première colonne et en `font-medium`.
- Un seul set d'icônes cohérent (type Phosphor ou Lucide), un seul poids de trait.

## Direction technique recommandée

Le brand book recommande de construire sur un design system open source (ShadCN/ui ou Radix + Tailwind) plutôt que tout recoder from scratch, et de ne personnaliser que via les tokens (couleurs, typographie, rayons, espacements). Éviter les composants custom sans raison fonctionnelle claire.
