import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import DOMPurify from "isomorphic-dompurify";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { ProductVariantSelector } from "@/components/shop/product-variant-selector";
import { stripHtml } from "@/lib/utils";

// CJ embeds product photos and the size chart as <img> tags directly inside
// the description HTML - there's no separate "size chart" field in their
// API, so we sanitize and render the description as HTML instead of
// stripping it to plain text, otherwise that imagery is lost.
function sanitizeDescription(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "img", "strong", "em", "b", "i", "ul", "li", "span", "div"],
    ALLOWED_ATTR: ["src", "alt", "style"],
  });
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) return {};

  const description = stripHtml(product.description ?? "").slice(0, 160);
  const image = product.images[0];

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const t = await getTranslations("ProductDetail");

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { variants: true },
  });

  if (!product) notFound();

  const descriptionHtml = product.description ? sanitizeDescription(product.description) : "";

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-muted">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              width={600}
              height={600}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <span className="text-muted-foreground">{t("noImage")}</span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            {product.categoryName && (
              <p className="text-sm text-muted-foreground">{product.categoryName}</p>
            )}
          </div>

          <ProductVariantSelector
            productId={product.id}
            productName={product.name}
            image={product.images[0]}
            variants={product.variants.map((v) => ({
              id: v.id,
              sku: v.sku,
              salePrice: v.salePrice,
              stock: v.stock,
              attributes: v.attributes as Record<string, string>,
            }))}
          />

          {descriptionHtml && (
            <div
              className="flex flex-col gap-3 text-sm text-muted-foreground [&_img]:mx-auto [&_img]:max-w-full [&_img]:rounded-lg"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
