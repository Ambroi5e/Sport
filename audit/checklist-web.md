# Checklist web de production

À cocher avant chaque mise en ligne. Un point sauté est justifié sur sa ligne.

| Point | État | Remarque |
| --- | --- | --- |
| Page Confidentialité (RGPD) | à faire | v0.7 |
| Conditions d'utilisation | à faire | v0.7, courtes |
| Aucune API ni secret dans le front | à faire | gitleaks en CI, `service_role` côté serveur seulement |
| HTTPS forcé + HSTS | à faire | Vercel + en-tête HSTS |
| Bandeau cookies | non nécessaire | seulement des cookies de session, statistiques sans cookie |
| Meta title et description | à faire | |
| Image de partage (OG) | à faire | page d'accueil publique seulement |
| Favicon et icônes PWA | à faire | v0.1 |
| sitemap.xml et robots.txt | à faire | seules l'accueil public et Confidentialité sont indexables, le reste en `noindex` |
| Textes alternatifs des images | à faire | |
| Compression des images | à faire | photos de progrès compressées en WebP sur le téléphone (v0.5) |
| Vitesse de chargement | à faire | Lighthouse mobile ≥ 90 |
| Contraste AA | à faire | tokens vérifiés dans `docs/DESIGN.md` |
| Responsive 375 à 1440 px | à faire | captures Playwright |
| Page 404 personnalisée | à faire | v0.1 |
| Liens cassés | à faire | |
| Validation des formulaires | à faire | zod côté serveur, messages au flou |
| Anti-spam | à faire | inscription sur invitation + limites de débit |
| Statistiques respectueuses | à décider | Vercel Web Analytics (sans cookie) ou rien |
| Un seul CTA principal par écran | à faire | |
| Google Search Console | optionnel | app privée sur invitation, peu d'intérêt |
