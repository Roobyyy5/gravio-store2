import { ArrowRight, RefreshCw, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/shop/product-card";

// Featured products depend on live catalog data (stock/pricing change via cron sync),
// so this page must not be statically prerendered at build time.
export const dynamic = "force-dynamic";

const FEATURE_ICONS = [Truck, ShieldCheck, Sparkles, RefreshCw] as const;
const FEATURE_KEYS = ["shipping", "checkout", "fresh", "sync"] as const;

export default async function HomePage() {
  const t = await getTranslations("HomePage");

  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { variants: { select: { salePrice: true } } },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 via-background to-background" />
        <div className="absolute -top-24 left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="container mx-auto flex flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="size-3.5 text-primary" />
            {t("badge")}
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            {t.rich("title", {
              highlight: (chunks) => (
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {chunks}
                </span>
              ),
            })}
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">{t("subtitle")}</p>
          <Button
            size="lg"
            render={
              <Link href="/products">
                {t("shopNow")} <ArrowRight />
              </Link>
            }
            nativeButton={false}
          />
        </div>
      </section>

      <section className="container mx-auto grid gap-6 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURE_KEYS.map((key, i) => {
          const Icon = FEATURE_ICONS[i];
          return (
            <div key={key} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <p className="font-semibold">{t(`features.${key}Title`)}</p>
              <p className="text-sm text-muted-foreground">{t(`features.${key}Description`)}</p>
            </div>
          );
        })}
      </section>

      <section className="container mx-auto px-4 pb-16">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t("featuredProducts")}</h2>
          <Link href="/products" className="text-sm font-medium text-primary hover:underline">
            {t("viewAll")}
          </Link>
        </div>
        {products.length === 0 ? (
          <p className="text-muted-foreground">{t("noProducts")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => {
              const prices = product.variants.map((v) => v.salePrice);
              return (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    image: product.images[0],
                    minPrice: prices.length ? Math.min(...prices) : 0,
                    maxPrice: prices.length ? Math.max(...prices) : 0,
                  }}
                />
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
