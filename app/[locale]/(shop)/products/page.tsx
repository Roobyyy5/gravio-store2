import type { Metadata } from "next";
import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/shop/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, getPathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 24;

function groupCategories(names: string[]) {
  const groups = new Map<string, string[]>();
  for (const name of names) {
    const top = name.split(">")[0]?.trim() ?? name;
    if (!groups.has(top)) groups.set(top, []);
    groups.get(top)!.push(name);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function buildHref(params: { category?: string; page?: number; q?: string }) {
  const sp = new URLSearchParams();
  if (params.category) sp.set("category", params.category);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/products?${qs}` : "/products";
}

function buildPaginationHref(
  params: { category?: string; page?: number; q?: string },
  locale: string
) {
  const query: Record<string, string> = {};
  if (params.category) query.category = params.category;
  if (params.q) query.q = params.q;
  if (params.page && params.page > 1) query.page = String(params.page);
  return getPathname({
    href: Object.keys(query).length ? { pathname: "/products", query } : "/products",
    locale,
  });
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { category?: string; q?: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "ProductsPage" });
  const suffix = searchParams.category
    ? t("inCategory", { category: searchParams.category })
    : searchParams.q
      ? t("forQuery", { query: searchParams.q })
      : "";
  return { title: `${t("title")}${suffix}` };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { page?: string; category?: string; q?: string };
}) {
  const t = await getTranslations("ProductsPage");
  const tPagination = await getTranslations("Pagination");
  const locale = await getLocale();

  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const category = searchParams.category;
  const query = searchParams.q?.trim();

  const where = {
    isActive: true,
    ...(category ? { categoryName: category } : {}),
    ...(query ? { name: { contains: query, mode: "insensitive" as const } } : {}),
  };

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { variants: { select: { salePrice: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where: { isActive: true, categoryName: { not: null } },
      select: { categoryName: true },
      distinct: ["categoryName"],
      orderBy: { categoryName: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const categoryNames = categories
    .map((c) => c.categoryName)
    .filter((name): name is string => !!name);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">{t("title")}</h1>

      <form action={getPathname({ href: "/products", locale })} className="mb-4 flex max-w-md gap-2">
        {category && <input type="hidden" name="category" value={category} />}
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
        />
        <Button type="submit" size="icon" aria-label={t("search")}>
          <Search className="size-4" />
        </Button>
      </form>

      <p className="mb-6 text-sm text-muted-foreground">
        {t("count", { count: total })}
        {category ? t("inCategory", { category }) : ""}
        {query ? t("forQuery", { query }) : ""}
      </p>

      {categoryNames.length > 0 && (
        <div className="mb-8">
          <Link href={buildHref({ q: query })}>
            <Badge variant={!category ? "default" : "outline"} className="mb-4 cursor-pointer px-3 py-1">
              {t("all")}
            </Badge>
          </Link>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {groupCategories(categoryNames).map(([top, names]) => (
              <div key={top} className="rounded-lg border bg-card p-4">
                <p className="mb-2 text-sm font-semibold">{top}</p>
                <div className="flex flex-col gap-1">
                  {names.map((name) => {
                    const label = name.split(">").slice(1).join(" / ").trim() || top;
                    return (
                      <Link
                        key={name}
                        href={buildHref({ category: name, q: query })}
                        className={cn(
                          "rounded px-2 py-1 text-sm transition-colors",
                          category === name
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
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

      {totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            {page > 1 && (
              <PaginationItem>
                <PaginationPrevious
                  href={buildPaginationHref({ category, page: page - 1, q: query }, locale)}
                  text={tPagination("previous")}
                />
              </PaginationItem>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  href={buildPaginationHref({ category, page: p, q: query }, locale)}
                  isActive={p === page}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            {page < totalPages && (
              <PaginationItem>
                <PaginationNext
                  href={buildPaginationHref({ category, page: page + 1, q: query }, locale)}
                  text={tPagination("next")}
                />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </main>
  );
}
