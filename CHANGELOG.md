# Journal des changements

Format : une entrée par version (semver), du plus récent au plus ancien. Les migrations destructives sont signalées explicitement.

## [Non publié]

### v0.10.3 : rappels push

- Réglages > Rappels : quatre rappels au choix, tous éteints par défaut, chacun à son heure. Séance du jour (les jours cochés), forme du jour, compléments, bilan du dimanche.
- Un rappel ne part que s'il sert encore (séance pas commencée, check-in pas fait, prise à cocher, bilan pas enregistré), une fois par jour au plus.
- « Activer sur cet appareil » : la permission n'est demandée qu'à ce tap. Se déconnecter arrête les rappels sur l'appareil. Sur iPhone, l'écran explique qu'il faut installer l'app sur l'écran d'accueil.
- Le signal est vide : le service de notifications du navigateur (Google, Apple, Mozilla, Microsoft) ne reçoit aucune donnée. Le texte est demandé à Fonte par le téléphone, avec la session de la personne.
- Envoi par Supabase (choix du 2026-11-14) : tâche `pg_cron` toutes les 5 minutes, Edge Function `rappels` sans secret ni accès à la base, clés VAPID dans Supabase Vault. Rien à régler dans Vercel.
- Export : `rappels.csv`, `rappels-appareils.csv`, `rappels-envoyes.csv`. Pages Confidentialité et Supprimer mon compte mises à jour.
- Migration non destructive appliquée : `20261122000000_rappels.sql` (tables `reminder_settings`, `push_subscriptions`, `reminder_log`, schéma `private`), avec 25 tests en base et 16 tests de la signature. Aucune dépendance ajoutée.
- En attente de validation : `pending-destructive/20261122010000_rappels_nettoyage.sql` (retire les appareils dont l'adresse est périmée), `pending-destructive/20261122020000_rappels_sans_anon.sql` (retire au rôle `anon` le droit de lire la clé publique) et `pending-destructive/20261122030000_rappels_pg_net_schema.sql` (range l'extension `pg_net` hors du schéma `public`, signalé par l'audit Supabase).

### v0.10.2 : bilan du dimanche

- Bilan de la semaine (depuis Progrès et l'accueil) : cinq rubriques en un chiffre et une phrase. Entraînement (séances faites sur prévues, séries, sports), nutrition (moyenne des jours notés face aux cibles), poids (moyenne et écart avec la semaine d'avant, rythme face à l'objectif), forme (moyenne des check-ins), courses (dépensé sur budget).
- Une rubrique sans données dit ce qui manque au lieu d'afficher un zéro trompeur. Pas de note globale ni de score.
- Le bilan reprend l'alerte de rythme existante (±200 kcal après deux semaines hors fourchette) et renvoie vers Cibles ; rien n'est appliqué seul.
- Ton ressenti : cinq niveaux en un tap et une note libre facultative. C'est la seule chose enregistrée ; les chiffres se recalculent à la lecture.
- Le dimanche, le bilan montre la semaine en cours ; les autres jours, la semaine passée. Flèches pour remonter le temps, liste des bilans précédents.
- Accueil : une carte « Ton bilan de la semaine est prêt » le dimanche et le lundi, tant qu'il n'est pas fait.
- Export : `bilans.csv`. Pages Confidentialité et Supprimer mon compte mises à jour.
- Migration non destructive appliquée : `20261121000000_bilans.sql` (table `weekly_reviews`), avec 4 tests RLS. Aucun fichier destructif. Aucune dépendance ajoutée.
- La v0.10.2 de la spec est découpée : v0.10.2 bilan du dimanche, v0.10.3 rappels push.

### v0.10.1 : stock et compléments

- Mon stock (depuis Courses) : ce qu'on a chez soi, avec une date de péremption facultative. Le plus urgent est en haut, et la péremption est écrite en mots : « Périmé depuis 2 jours », « À finir demain », « Jusqu'au 21 nov. ». « Fini » retire un article en un tap.
- Ranger le panier : après les courses, « Ranger dans mon stock » déplace les articles cochés de la liste vers le stock. « Retirer les articles cochés » reste disponible.
- Depuis mes repas déduit le stock : ce qu'on a déjà (aliment et poids connus, non périmé) est retiré de ce qu'il faut racheter ; un aliment couvert affiche « Assez ».
- Compléments (depuis Nutrition) : sa propre liste, avec la dose telle qu'on l'écrit et le moment de la journée. Un tap coche la prise du jour ; sous chaque nom, les 7 derniers jours en pastilles et en mots (« 5 jours sur 7 »). Un complément peut être mis en pause sans perdre son historique.
- Fonte ne propose aucun complément ni aucune dose : l'écran le dit et renvoie au médecin ou au pharmacien.
- Accueil : une carte Compléments seulement s'il en reste à cocher aujourd'hui.
- Export : `stock.csv`, `complements.csv`, `complements-prises.csv`. Pages Confidentialité et Supprimer mon compte mises à jour.
- Migrations non destructives appliquées : `20261120000000_stock_complements.sql` (tables `stock_items`, `supplements`, `supplement_logs`) et `20261120010000_complements_index.sql` (index demandé par les conseils Supabase), avec 12 tests RLS. Aucun fichier destructif. Aucune dépendance ajoutée.

### v0.10 : liste de courses et budget

- Courses : une seule liste, rangée par rayon dans l'ordre du magasin. On ajoute un article en écrivant son nom ; le rayon est deviné et se corrige d'un tap. Les articles cochés descendent dans le panier, qu'on vide d'un coup.
- Depuis mes repas : Fonte additionne ce qui a été noté les 7 derniers jours, aliment par aliment (une recette est dépliée en ses ingrédients), arrondit à une quantité d'achat et propose la liste à cocher. Rien n'est ajouté sans validation.
- Prix au kilo : saisis par la personne pour les aliments qu'elle mange. La liste affiche un total estimé et dit combien d'articles n'ont pas de prix.
- Budget : un montant par semaine, vide par défaut, sans valeur par défaut pour personne. Après les courses on note le montant du ticket ; la carte montre dépensé, reste et la moyenne des dernières semaines.
- Ce que tu manges : coût moyen par jour d'après le journal et les prix connus, avec la part des calories couverte. Sous 50 %, pas de chiffre ; le chiffre n'est jamais extrapolé.
- Export : `courses.csv`, `prix.csv`, `achats.csv`. Pages Confidentialité et Supprimer mon compte mises à jour.
- Migration non destructive appliquée : `20261119000000_courses.sql` (tables `shopping_items`, `food_prices`, `purchases`, colonne `profiles.weekly_food_budget`), avec 12 tests RLS. Aucun fichier destructif. Aucune dépendance ajoutée.
- La v0.10 de la spec est découpée : v0.10 liste et budget, v0.10.1 stock et compléments, v0.10.2 rappels et bilan du dimanche.

### v0.9.1 : séances communes en temps réel

- Amis > Lancer une séance commune : un nom, les amis à inviter. Chacun garde sa propre séance, son programme et ses charges.
- Un invité voit l'invitation dans Amis et dans Entraînement, et rejoint en un tap. Le bouton dit ce que ça montre : chaque série terminée (exercice, charge, répétitions), aux participants, pendant la séance commune seulement. Jamais l'échauffement ni les notes.
- Tableau en direct : pour chaque participant, le nombre de séries, l'exercice en cours, la dernière série et le volume ; à côté, le fil des dernières séries. Il se met à jour à chaque série (Supabase Realtime), et au pire toutes les 15 secondes.
- La séance commune se termine quand celui qui l'a lancée la termine, ou six heures après son lancement. Chacun peut la quitter avant.
- Export : `seances-communes.csv`, `seances-communes-participations.csv`, `seances-communes-series.csv`. Page Confidentialité mise à jour.
- Migration non destructive appliquée : `20261118000000_seances_communes.sql` (tables `group_sessions`, `group_participants`, `group_events`, déclencheur sur les séries), avec 12 tests RLS. Fichier en attente de validation : `supabase/pending-destructive/20261118010000_seances_communes_sans_anon.sql`. Aucune dépendance ajoutée.
- À vérifier à deux comptes sur l'aperçu Vercel : la mise à jour instantanée (le rechargement toutes les 15 secondes, lui, ne dépend de rien).

### v0.9 : amis et partage par catégorie

- Amis (depuis l'accueil, la barre latérale et Réglages) : on s'ajoute avec un code d'ami à usage unique, valable 7 jours, donné de la main à la main. Pas d'annuaire : personne ne peut te chercher.
- Par défaut, des amis ne voient rien l'un de l'autre. Sur la fiche d'un ami, six interrupteurs choisissent ce que tu lui montres : séances et sports, records, poids, mesures, nutrition (totaux par jour), forme du jour. Chaque interrupteur dit exactement ce qui est montré.
- Ce qu'un ami voit est un résumé en lecture seule : jamais tes notes, le détail de tes repas ni tes photos. Refermer une catégorie ou retirer un ami coupe l'accès tout de suite, des deux côtés.
- Export : `amis.csv` et `partages.csv`. Page Confidentialité mise à jour.
- Migration non destructive appliquée : `20261117000000_amis.sql` (tables `friendships`, `friend_invites`, `share_grants`, fonction `can_view` et lectures partagées), avec 27 tests RLS. Fichier en attente de validation : `supabase/pending-destructive/20261117010000_amis_sans_anon.sql` (retire l'appel de ces fonctions au rôle `anon`, qui est déjà refusé par les fonctions elles-mêmes). Aucune dépendance ajoutée.

### v0.8.1 : planning intelligent

- Entraînement > Ma semaine : les séances du programme placées du lundi au dimanche, sur tes jours disponibles, à 48 h au moins d'une séance ou d'un sport modéré ou intense qui travaille les mêmes muscles (le padel du mercredi éloigne la séance de jambes). Les règles sont écrites sous le planning.
- Une séance ratée est signalée sur son jour et replacée sur les jours qui restent ; s'il n'y a plus de jour, Fonte le dit et le programme reprend dans l'ordre la semaine suivante.
- Déplacer une séance en un tap : chaque jour dit ce qu'il implique (hors de tes jours, sport la veille ou le lendemain), rien n'est interdit. « Remettre en automatique » annule.
- Semaine type : jours disponibles pour la musculation et sports fixes (jour, durée, intensité), pris en compte avant même d'être notés.
- Séance du jour adaptée à la forme : après le check-in, Fonte conseille de la faire, de l'alléger (moins de séries, charges à −10 %, sans toucher à la progression), de la décaler ou de la remplacer par une séance qui travaille d'autres muscles. Les autres choix restent proposés, avec le rappel de consulter un professionnel quand la forme n'est pas bonne.
- Charge des 7 derniers jours (minutes × effort) comparée à ta semaine habituelle sur quatre semaines ; une forte hausse fait conseiller une séance allégée.
- L'accueil, l'Entraînement et le Programme montrent la séance que le planning place, avec son jour.
- Export : `sports-fixes.csv`, `seances-deplacees.csv`, `jours-sans-seance.csv`, et la colonne `is_light` des séances. Page Confidentialité mise à jour.
- Migration non destructive appliquée : `20261116000000_planning.sql` (tables `weekly_sports`, `session_pins`, `blocked_days`, colonne `workouts.is_light`), avec 17 tests RLS. Aucune dépendance ajoutée.

### v0.8 : sports additionnels et forme du jour

- Entraînement > Sports : noter un match de padel, de foot, de tennis (et neuf autres sports, ou « Autre » avec son nom) avec le jour, la durée et l'intensité (légère, modérée, intense, expliquées par le test de la parole). La dernière activité se refait en un tap : +, Sport, « Enregistrer pour aujourd'hui ».
- Dépense estimée de chaque activité : MET du Compendium des activités physiques 2024 × poids de la pesée la plus proche × durée, affichée avec son calcul. Un ordre de grandeur, qui ne change pas les cibles de calories.
- Un jour de sport compte comme jour d'entraînement pour les cibles de nutrition, et a sa balle dans la semaine de l'accueil (sans compter comme séance de musculation).
- Forme du jour sur l'accueil, en dix secondes : sommeil, courbatures, énergie et stress de 1 à 5. Note de forme sur 5, niveau (bonne, moyenne, basse) et conseil général, avec le rappel de consulter un professionnel quand la fatigue dure.
- Progrès > Forme : courbe de la note et sa moyenne sur 7 jours, chaque critère face à la semaine d'avant, la règle de calcul écrite. L'onglet Mensurations s'appelle « Mesures » pour que les cinq onglets tiennent sur téléphone.
- Export : `activites.csv` et `forme.csv`. Page Confidentialité mise à jour (la forme du jour est une donnée de santé).
- Migration non destructive appliquée : `20261115000000_sports_forme.sql` (tables `activities` et `daily_checkins`), avec 12 tests RLS. Aucune dépendance ajoutée.

### v0.7 : confidentialité, export et suppression du compte

- Page Confidentialité, lisible sans compte : ce que Fonte garde, où, qui peut techniquement le lire (l'administrateur du projet Supabase), ce qui sort de l'app, les cookies et tes droits. Liens depuis la connexion, l'inscription et Réglages.
- Réglages > Mes données : une archive zip préparée sur le téléphone, avec toutes les données en JSON, un CSV par table pour un tableur (réglé en français) et les photos de progression. Le JSON seul se télécharge aussi.
- Réglages > Supprimer mon compte : ce qui va disparaître (chiffré), l'export proposé avant, confirmation tapée. Photos d'abord, puis le compte et toutes ses données ; le téléphone est vidé comme à la déconnexion.
- SMTP personnalisé : guide pas à pas dans `docs/SELF-HOSTING.md` (Brevo ou Resend), à régler dans le tableau de bord Supabase.
- Aucune dépendance ajoutée : le zip est écrit à la main (`lib/export/zip.ts`).
- Migration non destructive : `20261114000000_suppression_compte.sql` (fonction `delete_my_account`), avec 5 tests. Fichier en attente de validation : `supabase/pending-destructive/20261114010000_suppression_compte_sans_anon.sql` (retire l'appel de la fonction au rôle `anon`).

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
