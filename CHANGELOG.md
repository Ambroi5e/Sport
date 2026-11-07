# Journal des changements

Format : une entrée par version (semver), du plus récent au plus ancien. Les migrations destructives sont signalées explicitement.

## [Non publié]

### v0.6.2 : code-barres et photo d'étiquette

- Scanner un code-barres depuis l'ajout d'un repas ou Mes aliments : un produit déjà enregistré passe directement à la quantité, sinon Fonte cherche sur Open Food Facts et préremplit l'aliment (nom, marque, valeurs pour 100 g, portion), à vérifier avant d'enregistrer.
- Produit inconnu ou fiche incomplète : photographier l'étiquette. Fonte lit le tableau sur le téléphone, sans IA ; la photo n'est ni envoyée ni gardée. Aussi possible sans code-barres, depuis Nouvel aliment.
- Caméra refusée ou absente : les chiffres du code se tapent.
- Le code-barres reste sur l'aliment : le scan suivant le retrouve.
- Dépendances ajoutées, avec leur raison dans `docs/plans/v0.6.2.md` : `tesseract.js`, `barcode-detector`, et `@tesseract.js-data/fra` en développement.
- Sécurité : `Permissions-Policy` ouvre la caméra à Fonte seule, la CSP autorise la compilation WebAssembly (`'wasm-unsafe-eval'`).
- Migration non destructive appliquée : `20261113000000_codes_barres.sql` (index unique par personne et par code-barres), avec 4 tests.

### v0.6.1 : dépense réelle et recettes

- Page Cibles : « Ta dépense réelle », mesurée sur 28 jours d'après ce que tu manges et l'évolution de ton poids, face à la formule. Les jours visiblement incomplets sont écartés ; sans assez de données, la carte dit ce qui manque. Le repère suggéré part de cette mesure quand elle est fiable et ne s'applique que sur un tap.
- Recettes : ingrédients ajoutés depuis une recherche, grammes modifiables, nombre de parts et poids cuit facultatif, valeurs d'une part en direct. Une recette se note comme un aliment, à la part ou au poids, et se retrouve dans la recherche, les favoris et « comme hier ».
- Corriger un aliment recalcule les recettes qui l'utilisent ; les jours passés suivent.
- Migration non destructive appliquée : `20261112000000_recettes.sql` (colonnes `foods.is_recipe`, `recipe_total_g`, `recipe_portions`, table `recipe_items`), avec 8 tests RLS. Pas de table `tdee_estimates` : la dépense se calcule à la lecture.

### v0.6 : plan prédictif et charge suggérée

- Programme généré : séances par semaine, durée, matériel, muscles prioritaires et objectif chiffré facultatif (« développé couché à 100 kg en mai »). Fonte répartit les séances, choisit les exercices selon le matériel, les préférences et les habitudes, et fixe séries et fourchettes. Les séances sont des modèles : tout reste modifiable.
- Charge suggérée en séance : double progression (la charge monte quand toutes les séries atteignent le haut de la fourchette, sinon une rep de plus), semaine de décharge toutes les 5 semaines (60 % des séries, charge −10 %). Les séries sont préremplies et une phrase explique la suggestion.
- Écran Programme : semaine en cours, prochaine séance avec ses charges, objectif avec le 1RM estimé réel et la projection jusqu'à la date estimée, séances de la semaine, volume prévu par muscle, réglages et fin du programme.
- Séance ratée : le programme reprend dans l'ordre, sans calendrier à rattraper.
- Remplacer un exercice en deux taps, parmi les exercices équivalents, avec l'option de l'écarter des prochains programmes.
- Fiche exercice : j'aime, sans avis, à éviter.
- Entraînement : la prochaine séance du programme en tête, à démarrer en un tap.
- La spécification v0.6 est découpée en trois versions : v0.6 (plan prédictif), v0.6.1 (TDEE adaptatif, recettes), v0.6.2 (code-barres, photo d'étiquette).
- Migration non destructive appliquée : `20261111000000_programme.sql` (tables `programs`, `exercise_preferences`, colonne `workout_templates.program_id`), avec 13 tests RLS.

### v0.5 : corps, progrès et tableau de bord

- Progrès, section Poids : courbe des pesées avec la moyenne sur 7 jours, sur 1, 3, 6 ou 12 mois, résumé écrit et tableau des valeurs.
- Alerte de rythme (prise de masse, sèche) : quand deux semaines de suite sortent de la fourchette dans le même sens, l'app propose ±200 kcal sur la cible, en conseil général, jamais appliqué tout seul.
- Mensurations : neuf zones en cm, plusieurs d'un coup, valeurs du jour préremplies, écart depuis la première mesure et la précédente, rappel de mesurer toujours du même côté.
- Photos de progression privées : face, profil, dos, réduites et nettoyées de leurs métadonnées (dont le GPS) sur le téléphone, liens d'affichage de 10 minutes, comparaison côte à côte de deux dates, suppression.
- Force : volume des 8 dernières semaines et 1RM estimé par séance des exercices les plus suivis.
- Accueil : semaine en cours (séances faites face aux séances prévues, jour par jour), alerte de rythme, volume des 8 semaines pour la musculation et la force.
- Courbes en SVG maison, sans bibliothèque ni JavaScript envoyé au téléphone, lisibles dans les trois styles.
- Migration non destructive appliquée : `20261110000000_corps.sql` (tables `body_measurements`, `progress_photos`, bucket privé `progress-photos`), avec 14 tests RLS.

### v0.4 : nutrition rapide

- Onglet Nutrition : jour affiché et jours précédents, calories et protéines face à la cible du jour (entraînement ou repos), glucides et lipides, quatre repas avec leurs aliments.
- Ajout en 2 ou 3 taps : repas favori ou aliment fréquent ajouté en un tap avec la dernière quantité, sinon recherche sans accents puis quantité préremplie (dernière fois, portion ou 100 g) avec raccourcis de portion et apports en direct. Repas proposé selon l'heure.
- « Comme hier » : un repas vide reprend le même repas de la veille en un tap.
- Repas favoris : enregistrer un repas du journal, le rajouter en un tap, le supprimer.
- Aliments personnels : création avec les valeurs de l'étiquette pour 100 g, correction (les jours passés suivent), retrait de la liste.
- Page Cibles : jours habituels d'entraînement, cibles par type de jour, repère suggéré selon le profil, jamais imposé, avec le rappel de consulter un professionnel.
- Accueil : carte « Nutrition du jour ». Bouton + : « Repas » et « Séance » deviennent de vrais raccourcis.
- Catalogue commun de 88 aliments de base (valeurs moyennes Ciqual et USDA).
- Migration non destructive appliquée : `20261109000000_nutrition.sql`, avec 26 tests RLS.

### v0.3 : séance en direct

- Saisie sans réseau : chaque série validée est gardée sur le téléphone puis envoyée dès que possible, sans doublon, avec son heure de validation. État visible quand l'envoi tarde (« 2 séries en attente d'envoi »), session expirée signalée avec un lien pour se reconnecter.
- Séance en cours rouvrable sans réseau, depuis la page hors ligne (« Reprendre ma séance ») : seule page personnelle gardée par l'app, effacée à la fin de la séance et à la déconnexion.
- Chrono de repos : démarre à chaque série validée, se règle par 15 s, retient la durée par exercice, reste visible sur toutes les pages, vibration et son discret à la fin.
- Écran gardé allumé pendant la séance, avec un bouton pour le couper.
- Réglages : carte « Séance » (repos par défaut, son, écran allumé), propre à l'appareil.
- Déconnexion : efface la file, le chrono et les réglages de séance du téléphone, après avertissement s'il reste des saisies non envoyées.
- Correction : le service worker n'était jamais enregistré en production (script lancé après l'événement « load »). La page hors ligne et le cache des fichiers statiques fonctionnent enfin.
- Pas de migration.

### v0.2 : musculation

- Séance : démarrer depuis un modèle ou en libre, séries préremplies avec la dernière fois, validation en un tap, record battu signalé tout de suite, ajout ou retrait de séries et d'exercices, résumé de fin (durée, séries, volume, records).
- Bibliothèque de 71 exercices en français, recherche sans accents, filtre par groupe musculaire, exercices personnels, fiche exercice avec records et historique.
- Modèles : création, séries et fourchette de répétitions, ordre, démarrage en un tap, enregistrement d'une séance terminée comme modèle.
- Historique par semaine, page Records (1RM estimé, charge max, répétitions, volume), volume de la semaine par muscle face au repère général de 10 à 20 séries.
- Moteur : volume, 1RM (Epley, 12 répétitions au plus), records, séries par muscle, préremplissage. Tests.
- Migration non destructive appliquée : `20261108000000_musculation.sql`, avec 24 tests RLS.

### v0.1.1 : styles au choix et connexion Google

- Trois styles au choix dans Réglages : Fonte (graphite et orange), Couloir (nuit et cyan), Carnet (encre et surligneur), chacun en sombre et en clair, avec leurs polices et leurs angles. Choix gardé sur l'appareil.
- Réglages accessibles sur mobile depuis l'accueil (roue dentée).
- Connexion avec Google pour les comptes existants, et inscription avec Google sur invitation (code réservé 15 minutes pour l'adresse saisie). Le bouton n'apparaît qu'une fois Google activé dans Supabase.
- Accessibilité : accent et vert du mode clair Fonte un peu plus foncés (4,5:1 sur tous les fonds), contour de focus plus visible.
- Migration non destructive appliquée : `20261107020000_inscription_google.sql`.

### v0.1 : le socle (en ligne le 2026-11-07)

- Documentation de base : spécification, architecture, sécurité, design system Fonte, guide d'auto-hébergement.
- Cadrage : photo d'étiquette nutritionnelle ajoutée à la v0.6, avec le scan de code-barres.
- Schéma de base (profils, rôles, invitations, modules, objectifs, pesées) avec RLS sur chaque table et 25 tests RLS.
- Inscription sur invitation, vérifiée par un déclencheur côté base ; connexion par code à 6 chiffres reçu par e-mail.
- Moteur de calcul pur : unités, moyenne et rythme de poids, métabolisme et dépense, 1RM estimé.
- Design system Fonte (sombre par défaut, clair disponible), onglets en bas et bouton + sur mobile, sidebar sur ordinateur.
- Onboarding en trois écrans, accueil avec pesée rapide, tendance sur 7 jours et objectif.
- App installable : manifest, icônes, service worker et page hors ligne.
- Sécurité : CSP avec nonce, en-têtes stricts, scan des secrets et audit des dépendances en CI.
- Migration destructive validée par Ambroise et appliquée : `20261107010000_revoke_execute_fonctions.sql` (retire l'exécution publique de quatre fonctions internes).
