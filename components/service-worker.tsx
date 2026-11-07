import Script from "next/script";

/** Enregistre le service worker (page hors ligne, cache des fichiers statiques). */
export function ServiceWorker({ nonce }: { nonce?: string }) {
  if (process.env.NODE_ENV !== "production") return null;
  // Le script s'exécute après l'hydratation, souvent après l'événement « load » :
  // dans ce cas on enregistre tout de suite, sinon il ne serait jamais enregistré.
  return (
    <Script id="sw-register" strategy="afterInteractive" nonce={nonce}>
      {`if ("serviceWorker" in navigator) { var register = function () { navigator.serviceWorker.register("/sw.js", { scope: "/" }); }; if (document.readyState === "complete") register(); else window.addEventListener("load", register); }`}
    </Script>
  );
}
