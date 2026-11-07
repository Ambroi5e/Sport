# Journal des changements

Format : une entrée par version (semver), du plus récent au plus ancien. Les migrations destructives sont signalées explicitement.

## [Non publié]

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
