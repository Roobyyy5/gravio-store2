import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paypalApi, PayPalApiError } from "@/lib/paypal";
import { fulfillPaidOrder } from "@/lib/order-fulfillment";
import type { ShippingAddress } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const token = (body as { token?: string } | null)?.token;
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { paypalOrderId: token } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Already captured (e.g. the buyer refreshed the success page) - report success without re-charging.
  if (order.status !== "PENDING") {
    return NextResponse.json({ ok: true, orderId: order.id });
  }

  try {
    const capture = await paypalApi.captureOrder(token);
    if (capture.status !== "COMPLETED") {
      return NextResponse.json({ error: `PayPal capture status: ${capture.status}` }, { status: 502 });
    }

    const shippingAddress: ShippingAddress = {
      line1: capture.shipping?.line1 ?? "",
      line2: capture.shipping?.line2,
      city: capture.shipping?.city ?? "",
      state: capture.shipping?.state,
      postalCode: capture.shipping?.postalCode,
      country: capture.shipping?.country ?? "",
    };

    await fulfillPaidOrder(
      order.id,
      {
        email: capture.payerEmail ?? "",
        name: capture.shipping?.name ?? capture.payerName ?? "",
        phone: undefined,
      },
      shippingAddress
    );

    return NextResponse.json({ ok: true, orderId: order.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof PayPalApiError ? error.message : "Capture failed" },
      { status: 502 }
    );
  }
}
