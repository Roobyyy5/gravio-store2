import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cjApi, mapCJStatus } from "@/lib/cj-api";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (!order.cjOrderNumber) {
    return NextResponse.json({ error: "No CJ order linked yet" }, { status: 400 });
  }

  try {
    const detail = await cjApi.getOrderDetail(order.cjOrderNumber);
    const mappedStatus = mapCJStatus(detail.orderStatus);

    await prisma.order.update({
      where: { id: order.id },
      data: {
        ...(mappedStatus ? { status: mappedStatus } : {}),
        trackingNumber: detail.trackNumber ?? order.trackingNumber,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 502 }
    );
  }
}
