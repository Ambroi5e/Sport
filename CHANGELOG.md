# Journal des changements

Format : une entrée par version (semver), du plus récent au plus ancien. Les migrations destructives sont signalées explicitement.

## [Non publié]

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
