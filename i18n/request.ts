import { getRequestConfig } from "next-intl/server";

// Français seul jusqu'à la v1.0 : la structure est prête pour l'anglais.
export default getRequestConfig(async () => {
  const locale = "fr";
  return {
    locale,
    timeZone: "Europe/Paris",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
