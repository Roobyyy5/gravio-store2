import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cjApi } from "@/lib/cj-api";
import { getCountryName } from "@/lib/countries";
import type { ShippingAddress } from "@/lib/types";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.cjOrderNumber) {
    return NextResponse.json({ error: "CJ order already created for this order" }, { status: 400 });
  }

  const address = order.shippingAddress as unknown as ShippingAddress;

  try {
    const result = await cjApi.createOrder({
      orderNumber: order.id,
      shippingCountryCode: address.country,
      shippingCountry: getCountryName(address.country),
      shippingProvince: address.state ?? address.city,
      shippingCity: address.city,
      shippingAddress: address.line1,
      shippingAddress2: address.line2,
      shippingCustomerName: order.customerName,
      shippingPhone: order.customerPhone,
      shippingZip: address.postalCode,
      email: order.customerEmail,
      products: order.items.map((item) => ({ vid: item.cjVariantId, quantity: item.quantity })),
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        cjOrderNumber: result.orderNumber ?? result.orderId,
        status: "PROCESSING",
      },
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CJ order creation failed" },
      { status: 502 }
    );
  }
}
