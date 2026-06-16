import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ProductEditForm } from "@/components/admin/product-edit-form";

export default async function AdminProductEditPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { variants: { orderBy: { sku: "asc" } } },
  });

  if (!product) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt={product.name}
            width={64}
            height={64}
            className="rounded object-cover"
            unoptimized
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-sm text-muted-foreground">
            CJ ID: {product.cjProductId} · {product.categoryName ?? product.categoryId}
          </p>
        </div>
      </div>

      <ProductEditForm
        product={{
          id: product.id,
          isActive: product.isActive,
          variants: product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            price: v.price,
            salePrice: v.salePrice,
            stock: v.stock,
            attributes: v.attributes as Record<string, string>,
          })),
        }}
      />
    </div>
  );
}
