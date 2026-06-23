import { prisma } from "@/lib/prisma";
import { cjApi, CJApiError } from "@/lib/cj-api";
import { getCountryName } from "@/lib/countries";
import type { ShippingAddress } from "@/lib/types";

/**
 * Places (and, with payType 2, pays for) the CJ order for an internal order.
 * payType 2 = pay from the CJ account balance, so the wholesale cost leaves
 * via CJ immediately and only the margin (totalPrice - totalCost) stays in
 * our PayPal balance - no manual step needed.
 */
export async function placeCJOrder(orderId: string, options: { payType?: number } = {}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new Error("Order not found");
  if (order.cjOrderNumber) throw new Error("CJ order already created for this order");

  const address = order.shippingAddress as unknown as ShippingAddress;

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
    payType: options.payType,
    products: order.items.map((item) => ({ vid: item.cjVariantId, quantity: item.quantity })),
  });

  const cjOrderNumber = result.orderNumber ?? result.orderId;

  // createOrderV2's own response never confirms payment (actualPayment/
  // payId/orderStatus all come back null even on success), so the only way
  // to know whether payType 2 actually deducted the CJ balance is to read
  // the order back and check paymentDate.
  const detail = await cjApi.getOrderDetail(cjOrderNumber);
  const isPaid = Boolean(detail.paymentDate);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      cjOrderNumber,
      ...(isPaid ? { status: "PROCESSING" } : {}),
    },
  });

  if (options.payType === 2 && !isPaid) {
    throw new Error(
      `CJ order ${cjOrderNumber} was created but is still UNPAID (likely insufficient CJ balance). ` +
        `Top up your CJ balance and pay it manually from the CJ dashboard - the order will not be ` +
        `recreated on retry.`
    );
  }

  return result;
}

export { CJApiError };
