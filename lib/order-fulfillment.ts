import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { placeCJOrder } from "@/lib/cj-order";
import type { ShippingAddress } from "@/lib/types";

/**
 * Marks an order PAID, decrements stock, emails the buyer, and auto-places
 * the CJ order paid from our CJ balance. Idempotent - safe to call more than
 * once for the same order (e.g. a retried capture).
 */
export async function fulfillPaidOrder(
  orderId: string,
  buyer: { email: string; name: string; phone?: string },
  shippingAddress: ShippingAddress
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "PENDING") return;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      customerEmail: buyer.email,
      customerName: buyer.name,
      customerPhone: buyer.phone ?? "",
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

  if (buyer.email) {
    await sendOrderConfirmationEmail({
      to: buyer.email,
      orderId,
      items: items.map((item) => ({
        name: item.variant.product.name,
        quantity: item.quantity,
        price: item.price,
      })),
      totalPrice: order.totalPrice,
      shippingAddress,
    }).catch((error) => console.error("[fulfillment] failed to send confirmation email", error));
  }

  // Pay the supplier immediately from the CJ account balance so the
  // wholesale cost leaves right away - only the margin (totalPrice -
  // totalCost) stays in our PayPal balance. If this fails (e.g. low CJ
  // balance) the order stays PAID and an admin can retry it manually from
  // the orders panel.
  await placeCJOrder(orderId, { payType: 2 }).catch((error) =>
    console.error("[fulfillment] failed to auto-place CJ order", orderId, error)
  );
}
