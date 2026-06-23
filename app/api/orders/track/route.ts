import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const orderId = (body as { orderId?: string } | null)?.orderId?.trim();
  const email = (body as { email?: string } | null)?.email?.trim().toLowerCase();

  if (!orderId || !email) {
    return NextResponse.json({ error: "orderId and email are required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });

  // Same "not found" response whether the order or the email doesn't match,
  // so this can't be used to enumerate orders by id alone.
  if (!order || order.customerEmail.toLowerCase() !== email) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    status: order.status,
    trackingNumber: order.trackingNumber,
    totalPrice: order.totalPrice,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      name: item.variant.product.name,
      quantity: item.quantity,
      price: item.price,
    })),
  });
}
