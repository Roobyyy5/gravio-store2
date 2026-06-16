import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { SHIPPING_COUNTRIES } from "@/lib/countries";

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
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
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

    lineItems.push({
      quantity,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(variant.salePrice * 100),
        product_data: {
          name: variant.product.name,
          images: variant.product.images.slice(0, 1),
        },
      },
    });
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
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel`,
      shipping_address_collection: {
        // SHIPPING_COUNTRIES is string[] (COUNTRIES is keyed as Record<string, string>),
        // but every key is one of the ISO codes Stripe's AllowedCountry union accepts.
        allowed_countries: SHIPPING_COUNTRIES as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      },
      phone_number_collection: { enabled: true },
      metadata: { orderId: order.id },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    await prisma.order.delete({ where: { id: order.id } });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 502 }
    );
  }
}
