import { expect, test } from "@playwright/test";

/**
 * Chaque écran de l'aperçu, au téléphone et à l'ordinateur : il s'affiche avec son
 * titre, sans erreur dans la console, sans défilement horizontal, et tout écran qui
 * n'est pas un onglet racine a sa flèche retour.
 */
const ROOTS = ["accueil", "entrainement", "nutrition", "courses", "progres"];
/** États d'un onglet racine, et sections de Progrès (mêmes onglets en haut) : pas de flèche retour non plus. */
const ROOT_STATES = ["accueil-bilan", "accueil-forme", "onboarding", "nutrition-vide", "courses-vide", "courses-sans-budget", "progres-mensurations", "progres-photos", "progres-force", "forme"];

const SCREENS = [
  ...ROOTS,
  "accueil-bilan", "accueil-forme", "onboarding", "reglages", "donnees", "supprimer", "rappels", "rappels-vide",
  "seance", "exercice", "exercices", "modele", "programme", "programme-nouveau", "programme-remplacer", "programme-vide",
  "semaine", "semaine-basse", "semaine-deplacer", "semaine-forme", "semaine-type",
  "sports", "sports-vide", "sport-ajouter", "sortie-ajouter", "import-gpx", "import-gpx-vide", "import-seances", "import-seances-vide",
  "endurance", "endurance-natation", "endurance-vide", "objectifs", "objectifs-vide", "objectif-ajouter", "zones", "zones-estimees", "zones-vide",
  "hyrox", "hyrox-ancienne", "hyrox-vide", "hyrox-ajouter",
  "nutrition-vide", "nutrition-ajouter", "nutrition-aliment", "nutrition-quantite", "nutrition-quantite-recette", "nutrition-cibles", "nutrition-cibles-attente",
  "nutrition-recettes", "nutrition-recettes-vide", "nutrition-recette", "nutrition-recette-nouvelle", "nutrition-scanner", "nutrition-code-trouve", "nutrition-code-inconnu", "nutrition-etiquette",
  "courses-vide", "courses-article", "courses-budget", "courses-budget-vide", "courses-prix", "courses-repas", "courses-sans-budget",
  "stock", "stock-vide", "stock-article", "complements", "complements-vide", "complement", "complement-nouveau",
  "progres-mensurations", "progres-photos", "progres-photo-ajout", "progres-comparer", "progres-force", "progres-saisie", "forme", "bilan", "bilan-vide",
  "amis", "amis-vide", "ami", "ami-nouveau", "seance-commune", "seance-commune-invitation", "seance-commune-nouvelle",
];

for (const [device, viewport] of [
  ["téléphone", { width: 375, height: 812 }],
  ["ordinateur", { width: 1440, height: 900 }],
] as const) {
  test.describe(device, () => {
    test.use({ viewport });

    for (const screen of SCREENS) {
      test(`${screen}`, async ({ page }) => {
        const errors: string[] = [];
        page.on("console", (m) => {
          if (m.type() === "error") errors.push(m.text());
        });
        page.on("pageerror", (e) => errors.push(String(e)));

        const response = await page.goto(`/apercu?ecran=${screen}`, { waitUntil: "networkidle" });
        expect(response?.status()).toBe(200);
        await expect(page.locator("h1").first()).toBeVisible();
        if (![...ROOTS, ...ROOT_STATES].includes(screen)) await expect(page.getByRole("link", { name: "Retour" }).first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), "défilement horizontal").toBeLessThanOrEqual(0);
        expect(errors).toEqual([]);
      });
    }
  });
}
