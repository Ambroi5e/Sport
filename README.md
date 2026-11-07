# Fonte

Suivi musculation, endurance, nutrition, courses et budget, pensé pour le téléphone et partageable entre amis sans partager leurs données.

- Saisie en 2 ou 3 taps, installable sur l'écran d'accueil (PWA), utilisable hors ligne.
- Modules adaptés à l'objectif : prise de masse, force, Hyrox, course, triathlon, sports de raquette, forme générale.
- Données cloisonnées par utilisateur (Row Level Security Supabase), partage entre amis par catégorie et révocable.
- Inscription sur invitation.

> En développement. Voir `SPEC.md` pour le périmètre et `CHANGELOG.md` pour l'avancement.

## Démarrer en local

```bash
cp .env.example .env.local   # puis renseigner les valeurs
npm install
npm run dev
```

Tests :

```bash
npm run lint && npm run typecheck
npm test                     # moteur de calcul ; tests RLS si DATABASE_URL_TEST est défini
npm run test:e2e             # Playwright
```

## Documentation

- [SPEC.md](SPEC.md) : le produit et les versions
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) : stack, structure, schéma de données
- [docs/SECURITY.md](docs/SECURITY.md) : RLS, secrets, en-têtes, RGPD
- [docs/DESIGN.md](docs/DESIGN.md) : design system Fonte
- [docs/SELF-HOSTING.md](docs/SELF-HOSTING.md) : déployer sa propre copie
- [CLAUDE.md](CLAUDE.md) : règles de travail du projet

## Licence

À définir.
