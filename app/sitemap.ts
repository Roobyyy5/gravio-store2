import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";

// Reads live product data, so it must not be statically generated at build
// time (the DB is unreachable from the build container on Railway/Nixpacks).
export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

/** Prefixes a path with the locale, matching localePrefix: "as-needed" (default locale has no prefix). */
function localizedUrl(path: string, locale: string) {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `${BASE_URL}${prefix}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, updatedAt: true },
  });

  const staticPaths = ["", "/products", "/track"];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of staticPaths) {
      entries.push({ url: localizedUrl(path, locale), changeFrequency: "daily" });
    }
    for (const product of products) {
      entries.push({
        url: localizedUrl(`/products/${product.id}`, locale),
        lastModified: product.updatedAt,
        changeFrequency: "daily",
      });
    }
  }

  return entries;
}
