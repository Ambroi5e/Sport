import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders, Figtree, Instrument_Sans, JetBrains_Mono, Public_Sans } from "next/font/google";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { ServiceWorker } from "@/components/service-worker";
import { getAppearance } from "@/lib/appearance";
import "./globals.css";

// Polices téléchargées au build et servies par l'app : aucune requête vers Google côté utilisateur.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans", display: "swap" });
// Polices des styles Couloir et Carnet : déclarées partout, téléchargées seulement si le style est choisi.
const bigShoulders = Big_Shoulders({ subsets: ["latin"], variable: "--font-big-shoulders", display: "swap", preload: false });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap", preload: false });
const instrumentSans = Instrument_Sans({ subsets: ["latin"], axes: ["wdth"], variable: "--font-instrument-sans", display: "swap", preload: false });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap", preload: false });
const fontVariables = [archivo, publicSans, bigShoulders, figtree, instrumentSans, jetbrainsMono].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: { default: "Fonte", template: "%s · Fonte" },
  description: "Suivi musculation, nutrition, courses et budget, partageable entre amis sans partager ses données.",
  applicationName: "Fonte",
  appleWebApp: { capable: true, title: "Fonte", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export async function generateViewport(): Promise<Viewport> {
  const { background } = await getAppearance();
  return {
    themeColor: background,
    colorScheme: "dark light",
    viewportFit: "cover",
    width: "device-width",
    initialScale: 1,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { style, theme } = await getAppearance();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="fr" data-style={style} data-theme={theme} className={fontVariables}>
      <body className="min-h-dvh">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <ServiceWorker nonce={nonce} />
      </body>
    </html>
  );
}
