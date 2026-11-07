import type { Metadata, Viewport } from "next";
import { Archivo, Public_Sans } from "next/font/google";
import { cookies, headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

// Polices téléchargées au build et servies par l'app : aucune requête vers Google côté utilisateur.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Fonte", template: "%s · Fonte" },
  description: "Suivi musculation, nutrition, courses et budget, partageable entre amis sans partager ses données.",
  applicationName: "Fonte",
  appleWebApp: { capable: true, title: "Fonte", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#121315",
  colorScheme: "dark light",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("theme")?.value === "light" ? "light" : "dark";
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="fr" data-theme={theme} className={`${archivo.variable} ${publicSans.variable}`}>
      <body className="min-h-dvh">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <ServiceWorker nonce={nonce} />
      </body>
    </html>
  );
}
