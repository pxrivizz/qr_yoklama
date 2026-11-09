import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/giris", "/rehber-demo", "/cerez-politikasi", "/kullanim-kosullari"],
      disallow: [
        "/api",
        "/admin",
        "/ogrenci",
        "/ogretmen",
        "/panel",
        "/tara",
      ],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
