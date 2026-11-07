import type { MetadataRoute } from "next";

// App privée sur invitation : rien à indexer pour l'instant.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
