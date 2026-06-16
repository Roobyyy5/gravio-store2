import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/shop/product-card";
import { Badge } from "@/components/ui/badge";
import { Link, getPathname } from "@/i18n/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 24;

function buildHref(params: { category?: string; page?: number }) {
  const sp = new URLSearchParams();
  if (params.category) sp.set("category", params.category);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/products?${qs}` : "/products";
}

function buildPaginationHref(params: { category?: string; page?: number }, locale: string) {
  const query: Record<string, string> = {};
  if (params.category) query.category = params.category;
  if (params.page && params.page > 1) query.page = String(params.page);
  return getPathname({
    href: Object.keys(query).length ? { pathname: "/products", query } : "/products",
    locale,
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { page?: string; category?: string };
}) {
  const t = await getTranslations("ProductsPage");
  const tPagination = await getTranslations("Pagination");
  const locale = await getLocale();

  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const category = searchParams.category;

  const where = {
    isActive: true,
    ...(category ? { categoryName: category } : {}),
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
      <p className="mb-6 text-sm text-muted-foreground">
        {t("count", { count: total })}
        {category ? t("inCategory", { category }) : ""}
      </p>

      {categoryNames.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Link href={buildHref({})}>
            <Badge variant={!category ? "default" : "outline"} className="cursor-pointer px-3 py-1">
              {t("all")}
            </Badge>
          </Link>
          {categoryNames.map((name) => (
            <Link key={name} href={buildHref({ category: name })}>
              <Badge
                variant={category === name ? "default" : "outline"}
                className="cursor-pointer px-3 py-1"
              >
                {name}
              </Badge>
            </Link>
          ))}
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
                  href={buildPaginationHref({ category, page: page - 1 }, locale)}
                  text={tPagination("previous")}
                />
              </PaginationItem>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  href={buildPaginationHref({ category, page: p }, locale)}
                  isActive={p === page}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            {page < totalPages && (
              <PaginationItem>
                <PaginationNext
                  href={buildPaginationHref({ category, page: page + 1 }, locale)}
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
