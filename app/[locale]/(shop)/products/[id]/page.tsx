import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { ProductVariantSelector } from "@/components/shop/product-variant-selector";
import { stripHtml } from "@/lib/utils";

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

  const description = stripHtml(product.description ?? "");

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

          {description && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </main>
  );
}
