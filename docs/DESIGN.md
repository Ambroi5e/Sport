# Design system : Fonte

Direction choisie le 2026-11-06 : **Fonte**, le graphite des barres et l'orange des marquages de sécurité. Chiffres très condensés et très gras, lisibles à un mètre du téléphone posé sur le banc. Un seul accent, tout le reste en gris acier. Mode sombre par défaut, mode clair disponible.

Les tokens vivent dans `app/globals.css` (variables CSS exposées à Tailwind v4 via `@theme`). Ce fichier en est la référence lisible ; toute modification passe par les deux.

## Trois styles au choix (depuis la v0.1.1)

Les trois directions proposées au cadrage sont devenues des styles que chacun choisit dans Réglages, chacun en sombre et en clair. Fonte reste le style par défaut ; les tableaux plus bas le décrivent. Les composants n'utilisent que les tokens, jamais une couleur, une police ou un rayon en dur : un nouveau style se réduit à un jeu de variables.

| | Fonte | Couloir | Carnet |
| --- | --- | --- | --- |
| Idée | Salle de muscu, graphite et orange sécurité | Piste de nuit, afficheur du chrono | Carnet au stylo, surligneur |
| Fond sombre / clair | #121315 / #F4F4F2 | #0B1220 / #F3F6FA | #17171A / #F6F6F2 |
| Accent (fond de bouton) | #FF6B1A | #3DD6E8 (sombre), #0B6A84 (clair) | #F2CB3A |
| Accent en texte, clair | #B23A0A | #0B6A84 | #7D6000 |
| Titres | Archivo 800, largeur 75 % | Big Shoulders 800 | Instrument Sans 700, largeur 80 % |
| Chiffres | Archivo 850, largeur 68 % | Big Shoulders 800 | JetBrains Mono 600 |
| Texte courant | Public Sans | Figtree | Instrument Sans |
| Rayon | 6 px | 14 px | 10 px |

Mécanique : `data-style` et `data-theme` sur `<html>` (cookies `style` et `theme`, lus au rendu serveur). Un élément peut porter ses propres attributs pour s'afficher dans un autre style : c'est ainsi que Réglages montre un aperçu fidèle de chaque option. Les polices de Couloir et Carnet ne sont téléchargées que si le style est choisi. Le logo prend la couleur d'accent du style.

Contrastes vérifiés pour chaque style et thème : texte, texte secondaire, accent en texte et couleurs de statut à 4,5:1 minimum sur `bg`, `surface` et `surface-2` ; texte sur accent à 5,4:1 minimum.

## Couleurs

Contrastes mesurés selon WCAG 2.1 (texte normal : 4,5:1 minimum).

| Token | Sombre | Clair | Usage | Contraste sur `bg` (sombre / clair) |
| --- | --- | --- | --- | --- |
| `bg` | #121315 | #F4F4F2 | fond de page | |
| `surface` | #1C1D20 | #FFFFFF | cartes, barre d'onglets | |
| `surface-2` | #25272B | #EBEBE8 | survol, champs, éléments en relief | |
| `line` | #2C2E33 | #DADAD6 | bordures, séparateurs | |
| `text` | #EDEBE7 | #151618 | texte principal | 15,6 / 16,4 |
| `muted` | #9A9DA3 | #5B5E64 | texte secondaire, libellés | 6,8 / 5,9 |
| `accent` | #FF6B1A | #FF6B1A | fond du bouton principal, éléments actifs | |
| `on-accent` | #121315 | #151618 | texte sur `accent` | 6,5 / 6,4 |
| `accent-text` | #FF6B1A | #B23A0A | texte et icônes en accent | 6,5 / 5,4 |
| `success` | #3FBF7F | #1A7044 | progression dans la cible | 7,9 / 5,5 |
| `warning` | #F2B53A | #8A5A00 | rythme hors cible | 10,1 / 5,4 |
| `danger` | #FF6363 | #C62828 | erreurs, suppression | 6,4 / 5,1 |

Règles :

- Un seul élément en accent plein par écran : l'action principale. Le reste de l'accent sert d'indicateur (onglet actif, série faite).
- Pas de dégradé, pas de verre dépoli, pas d'ombre en mode sombre : la profondeur vient des paliers `bg` → `surface` → `surface-2` et d'une bordure `line`.
- En mode clair, une ombre discrète sur les cartes : `0 1px 2px rgb(0 0 0 / 0.06)`.
- Les couleurs de statut ne remplacent jamais un texte : « +0,6 kg/sem, au-dessus de la cible » en plus de la couleur.

## Typographie

| Rôle | Police | Réglages |
| --- | --- | --- |
| Chiffres et titres d'écran | Archivo | graisse 850, largeur 68 %, chiffres tabulaires, titres d'exercice en capitales |
| Texte courant, boutons, libellés | Public Sans | 400, 500, 600, 700 |

Les deux polices sont auto-hébergées via `next/font/google` (téléchargées au build, aucune requête à Google côté utilisateur).

Échelle (px) : 12 (légendes), 14 (secondaire), 16 (texte courant, minimum dans les champs pour éviter le zoom iOS), 20 (titres de carte), 28 (titres d'écran), 40 et 56 (chiffres principaux). Interligne 1,5 pour le texte, 1 à 1,1 pour les chiffres. Libellés en capitales : espacement 0,08 em.

## Espacements, rayons, tailles

- Grille de 4 px : 4, 8, 12, 16, 24, 32, 48.
- Marge latérale mobile : 16 px.
- Rayons : `rounded-control` (6 px dans Fonte : boutons, champs, cartes), `rounded-inner` pour un élément logé dans un autre, 999 px (pastilles). Angles volontairement peu arrondis dans Fonte.
- Cible tactile : 48 px minimum, 56 px pour l'action principale sur mobile.

## Mise en page

- **Mobile (moins de 768 px)** : barre d'onglets en bas (Accueil, Entraînement, Nutrition, Courses, Progrès), bouton + flottant au-dessus pour la saisie rapide, une colonne. Seulement l'essentiel : ce n'est pas l'interface ordinateur rétrécie.
- **Ordinateur (768 px et plus)** : sidebar à gauche, tableaux de bord sur 2 ou 3 colonnes.
- Flèche retour en haut à gauche de chaque écran qui n'est pas un onglet racine.
- Respect des zones de sécurité iPhone (`env(safe-area-inset-*)`).

## Mouvement

- Durées : 120 ms (retour de tap), 200 ms (apparition), 280 ms (panneaux).
- Courbe : `cubic-bezier(0.2, 0.8, 0.2, 1)`. Animations limitées à `transform` et `opacity`.
- `prefers-reduced-motion` : animations remplacées par un simple fondu ou supprimées.
- Retour haptique (`navigator.vibrate`) sur Android quand une série ou une pesée est validée ; iPhone n'expose pas cette API.

## États

- Chargement : squelettes aux dimensions du contenu final (pas de saut de mise en page).
- Vide : une phrase qui dit ce qui apparaîtra et un bouton pour ajouter la première entrée.
- Erreur : ce qui s'est passé et comment réessayer, sans accuser l'utilisateur.

## Logo

Disque de fonte vu de face : disque orange, anneau et moyeu graphite, deux poignées. Fichier source : `public/icons/logo.svg`. Les icônes PWA en sont dérivées.

## Icônes

Phosphor (`@phosphor-icons/react`), graisse `regular` par défaut, `fill` pour l'onglet actif. Taille 24 px dans la navigation, 20 px dans le contenu.
