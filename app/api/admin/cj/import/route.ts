import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cjApi, mapProductDetailToInternal } from "@/lib/cj-api";
import { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  const { pid } = await request.json().catch(() => ({ pid: undefined }));
  if (!pid || typeof pid !== "string") {
    return NextResponse.json({ error: "pid is required" }, { status: 400 });
  }

  try {
    const detail = await cjApi.getProductDetail(pid);
    const mapped = mapProductDetailToInternal(detail);

    const totalStock = mapped.variants.reduce((sum, v) => sum + v.stock, 0);
    if (totalStock === 0) {
      return NextResponse.json({ ok: false, skipped: true, reason: "out_of_stock" });
    }

    const product = await prisma.product.upsert({
      where: { cjProductId: mapped.cjProductId },
      update: {
        name: mapped.name,
        description: mapped.description,
        images: mapped.images,
        categoryId: mapped.categoryId,
        categoryName: detail.categoryName ?? null,
      },
      create: {
        cjProductId: mapped.cjProductId,
        name: mapped.name,
        description: mapped.description,
        images: mapped.images,
        categoryId: mapped.categoryId,
        categoryName: detail.categoryName ?? null,
      },
    });

    // Only keep variants that are actually purchasable - a size/color the
    // supplier has zero of would otherwise show up as a dead option.
    const inStockVariants = mapped.variants.filter((v) => v.stock > 0);

    for (const variant of inStockVariants) {
      await prisma.variant.upsert({
        where: { cjVariantId: variant.cjVariantId },
        update: {
          sku: variant.sku,
          price: variant.price,
          salePrice: variant.salePrice,
          stock: variant.stock,
          weight: variant.weight,
          attributes: variant.attributes as Prisma.InputJsonValue,
        },
        create: {
          cjVariantId: variant.cjVariantId,
          productId: product.id,
          sku: variant.sku,
          price: variant.price,
          salePrice: variant.salePrice,
          stock: variant.stock,
          weight: variant.weight,
          attributes: variant.attributes as Prisma.InputJsonValue,
        },
      });
    }

    return NextResponse.json({ ok: true, productId: product.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CJ import failed" },
      { status: 502 }
    );
  }
}
