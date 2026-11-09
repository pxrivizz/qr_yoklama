import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

const publicRoutes = [
  { path: "/", priority: 1, changeFrequency: "monthly" },
  { path: "/giris", priority: 0.8, changeFrequency: "monthly" },
  { path: "/rehber-demo", priority: 0.7, changeFrequency: "monthly" },
  { path: "/cerez-politikasi", priority: 0.3, changeFrequency: "yearly" },
  { path: "/kullanim-kosullari", priority: 0.3, changeFrequency: "yearly" },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  return publicRoutes.map(({ path, priority, changeFrequency }) => ({
    url: new URL(path, siteUrl).toString(),
    priority,
    changeFrequency,
  }));
}
