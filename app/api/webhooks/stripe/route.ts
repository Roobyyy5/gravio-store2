import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendOrderConfirmationEmail } from "@/lib/email";
import type { ShippingAddress } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "PENDING") return;

  const shipping = session.collected_information?.shipping_details;
  const customer = session.customer_details;

  const shippingAddress: ShippingAddress = {
    line1: shipping?.address.line1 ?? "",
    line2: shipping?.address.line2 ?? undefined,
    city: shipping?.address.city ?? "",
    state: shipping?.address.state ?? undefined,
    postalCode: shipping?.address.postal_code ?? undefined,
    country: shipping?.address.country ?? "",
  };

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      customerEmail: customer?.email ?? "",
      customerName: shipping?.name ?? customer?.name ?? "",
      customerPhone: customer?.phone ?? "",
      shippingAddress: shippingAddress as unknown as Prisma.InputJsonValue,
    },
  });

  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: { variant: { include: { product: true } } },
  });

  for (const item of items) {
    await prisma.variant.update({
      where: { id: item.variantId },
      data: { stock: { decrement: item.quantity } },
    });
  }

  if (customer?.email) {
    await sendOrderConfirmationEmail({
      to: customer.email,
      orderId,
      items: items.map((item) => ({
        name: item.variant.product.name,
        quantity: item.quantity,
        price: item.price,
      })),
      totalPrice: order.totalPrice,
      shippingAddress,
    }).catch((error) => console.error("[webhook] failed to send confirmation email", error));
  }
}
