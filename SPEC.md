# Spécification : Fonte

## Le produit en trois phrases

Fonte aide à suivre son entraînement (musculation, endurance, Hyrox, sports de raquette et collectifs), sa nutrition, ses courses et son budget, avec une saisie en 2 ou 3 taps sur téléphone. Elle génère un plan adapté à l'objectif de chacun et le recalcule selon les performances réelles. Elle se partage entre amis sur invitation, chacun gardant ses données privées sauf ce qu'il choisit de montrer.

## Utilisateurs

- **Ambroise, premier utilisateur** : 22 ans, objectif esthétique, prise de masse (environ 3 600 kcal, 190 g de protéines, +0,3 à 0,5 kg par semaine), musculation 3 à 4 fois par semaine, padel chaque semaine, budget courses d'environ 50 € par semaine, peu assidu donc saisie ultra rapide. Ses données servent de seed pour son seul compte, jamais de valeurs par défaut pour les autres.
- **Ses amis** : objectifs variés (prise de masse, sèche, recomposition, force, Hyrox, 10 km à marathon, triathlon S à Ironman, sports de raquette et collectifs, forme générale), un objectif principal plus des secondaires, date de compétition optionnelle.

## Principes produit

1. Fonctionne tout de suite : onboarding en 3 écrans maximum, le reste demandé quand un module en a besoin.
2. Les modules affichés suivent l'objectif (allures et kilométrage pour un marathonien, volume par muscle et mensurations pour l'esthétique) et restent activables à la main.
3. Saisie en 2 ou 3 taps, valeurs préremplies, hors ligne possible.
4. Confidentialité par défaut : rien n'est visible des autres sans permission explicite, par catégorie, révocable.
5. Conseils explicables et prudents ; rappel de consulter un professionnel en cas de problème médical.
6. Pas d'IA en v1.

## Modules (brief complet)

Tableau de bord, musculation, endurance, Hyrox, sports additionnels, planning intelligent, corps et progrès, nutrition, courses et budget, compléments, imports, plan prédictif, mode séance en direct, rappels push, forme du jour, bilan du dimanche, amis et séances communes, données et admin. Le détail de chaque module est dans `docs/ARCHITECTURE.md` et sera repris dans le plan de la version qui le livre.

## Versions

| Version | Contenu |
| --- | --- |
| v0.1 | Socle : CI, design system, connexion par e-mail, invitations, schéma de base + RLS + tests, PWA, onboarding, pesée rapide |
| v0.2 | Musculation : saisie, bibliothèque, modèles, historique, records, 1RM, volume par muscle |
| v0.3 | Mode séance en direct (un tap par série, chrono, écran allumé, hors ligne) |
| v0.4 | Nutrition rapide : aliments pour 100 g et quantité en grammes, favoris, « refaire comme hier », cibles par type de jour |
| v0.5 | Corps et progrès, tableau de bord |
| v0.6 | Plan prédictif, TDEE adaptatif, recettes, scan de code-barres (Open Food Facts) et photo d'étiquette nutritionnelle |
| v0.7 | Confidentialité, export JSON + CSV, suppression du compte, SMTP personnalisé |
| v0.8 | Sports additionnels, planning intelligent, forme du jour |
| v0.9 | Amis, partage par catégorie, séances communes en temps réel |
| v0.10 | Courses, budget, stock, compléments, rappels push, bilan du dimanche |
| v0.11 | Endurance, Hyrox, plans de course |
| v0.12 | Imports Strong, Hevy, CSV, GPX, FIT, Apple Santé, Strava en option |
| v1.0 | Audit sécurité, tests end-to-end complets, auto-hébergement, checklist web |

## Photo d'étiquette nutritionnelle (demande du 2026-11-07)

Ambroise veut photographier l'étiquette d'un emballage pour que l'app récupère les valeurs pour 100 g, puis calcule les apports selon le poids mis dans le plat.

- Ordre de recherche : d'abord le code-barres (Open Food Facts, plus fiable), puis la photo de l'étiquette si le produit est inconnu ou incomplet.
- Lecture de la photo sur le téléphone, sans IA (Tesseract.js), puis extraction des lignes Énergie, Matières grasses, Glucides, Sucres, Protéines, Sel « pour 100 g ».
- Écran de vérification obligatoire : les valeurs lues sont préremplies et modifiables avant d'enregistrer l'aliment. La photo n'est pas conservée.
- Le calcul selon le poids (valeur pour 100 g × grammes / 100) est dans le moteur dès la v0.4.
- Plus tard, si l'IA est activée : lecture par l'interface `AIProvider`, plus robuste sur les emballages courbes ou froissés.

## Hors périmètre

Mini-lecteur de musique, connexion Google, paiement, IA (v1), application native.
