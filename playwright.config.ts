import { defineConfig } from "@playwright/test";

/**
 * Tests de bout en bout sur l'aperçu des écrans (`/apercu`, données d'exemple, sans
 * compte ni Supabase). Le serveur de développement est lancé s'il ne tourne pas déjà.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:3000", trace: "off", locale: "fr-FR", timezoneId: "Europe/Paris" },
  webServer: { command: "npm run dev", url: "http://localhost:3000/apercu", reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
