import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paypalApi } from "@/lib/paypal";

interface CheckoutItem {
  variantId: string;
  quantity: number;
}

function parseItems(body: unknown): CheckoutItem[] {
  if (!body || typeof body !== "object" || !Array.isArray((body as { items?: unknown }).items)) {
    return [];
  }

  return (body as { items: unknown[] }).items.filter((item): item is CheckoutItem => {
    const candidate = item as Partial<CheckoutItem>;
    return (
      typeof candidate.variantId === "string" &&
      Number.isInteger(candidate.quantity) &&
      (candidate.quantity as number) > 0
    );
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const requested = parseItems(body);

  if (requested.length === 0) {
    return NextResponse.json({ error: "items is required" }, { status: 400 });
  }

  const variants = await prisma.variant.findMany({
    where: { id: { in: requested.map((item) => item.variantId) } },
    include: { product: true },
  });

  const orderItems: { variantId: string; cjVariantId: string; quantity: number; price: number }[] = [];
  let totalCost = 0;
  let totalPrice = 0;

  for (const { variantId, quantity } of requested) {
    const variant = variants.find((v) => v.id === variantId);
    if (!variant || !variant.product.isActive) {
      return NextResponse.json({ error: "One of the items is no longer available" }, { status: 400 });
    }
    if (variant.stock < quantity) {
      return NextResponse.json(
        { error: `Not enough stock for ${variant.product.name}` },
        { status: 400 }
      );
    }

    orderItems.push({
      variantId: variant.id,
      cjVariantId: variant.cjVariantId,
      quantity,
      price: variant.salePrice,
    });
    totalCost += variant.price * quantity;
    totalPrice += variant.salePrice * quantity;
  }

  const order = await prisma.order.create({
    data: {
      customerEmail: "",
      customerName: "",
      customerPhone: "",
      shippingAddress: {},
      totalCost,
      totalPrice,
      status: "PENDING",
      items: { create: orderItems },
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? request.nextUrl.origin;

  try {
    const { id, approveUrl } = await paypalApi.createOrder({
      orderId: order.id,
      totalPrice,
      returnUrl: `${baseUrl}/checkout/success`,
      cancelUrl: `${baseUrl}/checkout/cancel`,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { paypalOrderId: id },
    });

    return NextResponse.json({ url: approveUrl });
  } catch (error) {
    await prisma.order.delete({ where: { id: order.id } });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 502 }
    );
  }
}
