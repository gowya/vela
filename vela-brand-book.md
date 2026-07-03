# VELA
### Brand book

---

## 1. Positionnement

Vela est l'outil de suivi patient pensé pour les praticiens de l'accompagnement humain : psychologues, sexologues, hypnothérapeutes, coachs relationnels, sophrologues, naturopathes.

Vela ne cherche pas à impressionner. Elle veille. Elle reste en retrait pendant que le praticien est concentré sur la personne en face de lui, et redevient utile dès qu'il en a besoin : entre deux séances, pour préparer la suivante, pour retrouver un historique.

**Positionnement en une phrase :**
Vela est le logiciel de suivi patient qui ne se fait jamais remarquer pendant la consultation.

**Territoire de référence :** Notion, Linear, Cron. Des outils pro, sobres, qui inspirent confiance par leur discrétion plutôt que par leur démonstration.

**Ce que Vela n'est pas :** une app de bien-être grand public. Pas de pastel lavande, pas de ton mièvre, pas d'icônes en forme de nuage souriant. Vela s'adresse à des professionnels de santé et de l'accompagnement, pas à leurs patients.

---

## 2. Mission

Donner aux praticiens de l'accompagnement humain un outil de suivi aussi rigoureux qu'un logiciel médical, et aussi silencieux qu'un carnet de notes.

---

## 3. Personnalité de marque

**Vela est :**
- Discrète — elle s'efface pendant l'essentiel, qui est la relation humaine
- Rigoureuse — la donnée patient est traitée avec sérieux (RGPD, HDS)
- Chaleureuse sans être familière — un ton posé, jamais infantilisant
- Précise — chaque mot, chaque écran a une fonction claire

**Vela n'est pas :**
- Ludique ou gamifiée
- Bavarde (pas de pop-up, pas de mascotte, pas de confettis)
- Clinique et froide comme un dossier administratif
- Tape-à-l'œil ou tendance pour la tendance

**Trois adjectifs qui résument tout :** posée, fiable, présente.

---

## 4. Identité verbale

Le ton de Vela est direct et sobre. Peu de mots, mais des mots justes.

**À faire :**
- Phrases courtes, verbes actifs
- Vocabulaire du praticien, pas du jargon logiciel ("votre patient", pas "l'utilisateur enregistré")
- Les erreurs expliquent ce qui s'est passé, sans s'excuser à outrance
- Les états vides invitent à agir, sans pression

**À éviter :**
- Le point d'exclamation
- Les tournures publicitaires ("boostez votre pratique !")
- L'humour ou les jeux de mots dans l'interface
- Les emojis dans le produit

**Exemple :**
- Pas bien : "Oups ! Une petite erreur est survenue 😅"
- Bien : "La note n'a pas pu être enregistrée. Vérifiez votre connexion et réessayez."

---

## 5. Identité visuelle

### Palette

| Rôle | Nom | Hex | Usage |
|---|---|---|---|
| Fond principal | Sable | `#F7F3EC` | Fond d'app en clair, chaleureux sans être blanc pur |
| Texte principal | Encre | `#2B2A28` | Corps de texte, jamais de noir pur |
| Signature | Vin | `#6B3F45` | Accent unique : actions principales, logo, éléments de marque |
| Secondaire | Sauge | `#A9B8AC` | États discrets, badges, confirmations douces |
| Neutre UI | Brume | `#D8D3C9` | Bordures, séparateurs, champs inactifs |
| Surface | Blanc chaud | `#FFFDF9` | Cartes, modales, zones de saisie |

La couleur Vin est la seule note de couleur forte de la marque. Elle doit rester rare : un bouton principal, le logo, un lien. Le reste de l'interface vit dans les neutres. C'est cette rareté qui fait la discrétion de Vela, à l'inverse d'une app qui multiplie les couleurs pour paraître vivante.

Un mode sombre existe pour les praticiens qui travaillent en cabinet tamisé ou en fin de journée : fond `#1C1B19`, texte `#F2EEE6`, même accent Vin ajusté en `#8C5D63` pour rester lisible sans agresser.

### Typographie

- **Display (logo, titres de marque uniquement) :** Fraunces — serif chaleureux et humaniste, utilisé avec retenue, jamais dans l'interface produit elle-même.
- **Interface (tout le produit) :** Inter — lisible, neutre, conçue pour la densité d'information d'un dossier patient.
- **Données (dates, identifiants, métadonnées) :** IBM Plex Mono — pour distinguer visuellement la donnée factuelle du texte rédigé.

Règle simple : le serif est réservé à la marque, jamais au produit. Dans l'app, tout est en Inter. Ça évite tout effet démonstratif à l'écran, exactement l'inverse de ce qu'on veut pendant une consultation.

### Logo : piste "Le Voile"

Vela vient du latin *velum*, le voile. L'idée directrice du mark : un arc ouvert, tracé d'un seul geste, qui n'est jamais une forme fermée. Il évoque à la fois une aile qui protège, un voile qui se soulève, une présence discrète qui ne s'impose pas.

Le mark reste volontairement incomplet. Une forme fermée dirait "contrôle total du dossier". Une forme ouverte dit "je suis là, en retrait, disponible".

Décliné en deux versions :
- **Symbole seul** — pour favicon, icône d'app mobile/desktop, avatar
- **Symbole + wordmark** — pour le site, les documents, les écrans de connexion

Le wordmark utilise Fraunces en bas de casse, jamais en majuscules : "vela" tout en minuscules, pour rester humain et non institutionnel.

### Principes d'interface

- Beaucoup de blanc. La densité d'info vient de la hiérarchie typographique, pas du remplissage.
- Pas d'animation décorative. Les seules transitions sont fonctionnelles (ouverture d'un dossier, sauvegarde).
- Aucune notification intrusive pendant une plage identifiée comme "en consultation". L'app doit savoir se taire.
- Coins arrondis discrets (6-8px), jamais de formes trop douces façon app grand public.
- Les icônes viennent d'un set neutre et cohérent (type Phosphor ou Lucide), un seul poids de trait, jamais mélangées avec des styles différents.

### Design system technique

Recommandation : partir d'un DS open source en marque blanche (Shadcn/ui ou Radix + Tailwind) plutôt que de tout construire from scratch. Ça garantit l'accessibilité et la cohérence dès le départ, et laisse le budget de design sur les vrais points de friction du praticien plutôt que sur la réinvention de composants standards (inputs, selects, modales).

La personnalisation de marque se fait uniquement via les tokens : couleurs, typographie, rayons de bordure, espacements. Aucun composant ne doit être custom sans raison fonctionnelle claire.

---

## 6. Ce que le logo doit raconter en un coup d'œil

Un praticien qui voit le logo Vela pour la première fois doit sentir : sérieux, discrétion, chaleur humaine. Pas : innovation disruptive, fun, jeunesse.

Référence de ton juste : le logo d'un cabinet d'avocat de qualité qui aurait été redessiné par quelqu'un qui comprend le web moderne. Pas une startup qui veut prouver qu'elle est une startup.
