import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyMinimumMargin } from "@/lib/pricing";

interface VariantUpdate {
  id: string;
  salePrice: number;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const { isActive, variants } = body as { isActive?: boolean; variants?: VariantUpdate[] };

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { variants: { select: { id: true, price: true } } },
  });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (typeof isActive === "boolean") {
    await prisma.product.update({ where: { id: product.id }, data: { isActive } });
  }

  if (Array.isArray(variants)) {
    for (const update of variants) {
      const variant = product.variants.find((v) => v.id === update.id);
      if (!variant || typeof update.salePrice !== "number") continue;

      const salePrice = applyMinimumMargin(variant.price, update.salePrice);
      await prisma.variant.update({ where: { id: variant.id }, data: { salePrice } });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  await prisma.product.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
