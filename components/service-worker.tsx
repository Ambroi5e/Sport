import Script from "next/script";

/** Enregistre le service worker (page hors ligne, cache des fichiers statiques). */
export function ServiceWorker({ nonce }: { nonce?: string }) {
  if (process.env.NODE_ENV !== "production") return null;
  return (
    <Script id="sw-register" strategy="afterInteractive" nonce={nonce}>
      {`if ("serviceWorker" in navigator) { window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js", { scope: "/" }); }); }`}
    </Script>
  );
}
