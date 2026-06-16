import cron from "node-cron";
import { prisma } from "./prisma";
import { cjApi, mapCJStatus, refreshAccessToken, sumVariantInventory } from "./cj-api";
import { sendShippingNotificationEmail } from "./email";
import { calculateSalePrice } from "./pricing";

const ACTIVE_ORDER_STATUSES = ["PAID", "PROCESSING", "SHIPPED"] as const;

let started = false;

/**
 * Registers all background cron jobs. Safe to call multiple times - only
 * the first call schedules anything. Invoked once from instrumentation.ts
 * when the Node.js server starts.
 */
export function startSyncJobs() {
  if (started) return;
  started = true;

  // Every 6h: proactively refresh the CJ access token. cj-api.ts also
  // refreshes lazily on demand, but this keeps a token warm at all times.
  cron.schedule("0 */6 * * *", async () => {
    try {
      await refreshAccessToken();
      console.log("[sync] CJ access token refreshed");
    } catch (error) {
      console.error("[sync] failed to refresh CJ access token", error);
    }
  });

  // Every 6h: refresh stock + pricing for every known product.
  cron.schedule("0 */6 * * *", () => {
    syncStockAndPrices().catch((error) => console.error("[sync] stock sync failed", error));
  });

  // Every 2h: poll CJ for order status + tracking updates.
  cron.schedule("0 */2 * * *", () => {
    syncOrderStatuses().catch((error) => console.error("[sync] order sync failed", error));
  });

  console.log("[sync] cron jobs registered");
}

/**
 * Re-fetches each product from CJ (one call per product returns price +
 * inventory for all of its variants), updates Variant.stock/price/salePrice,
 * and flips Product.isActive off once every variant is out of stock.
 *
 * Note: /product/stock/queryByVid only returns inventory, not price, so a
 * per-variant stock call can't update both fields - /product/query does.
 */
export async function syncStockAndPrices() {
  const products = await prisma.product.findMany({
    include: { variants: { select: { id: true, cjVariantId: true } } },
  });

  for (const product of products) {
    try {
      const detail = await cjApi.getProductDetail(product.cjProductId);
      let hasStock = false;

      for (const cjVariant of detail.variants ?? []) {
        const local = product.variants.find((v) => v.cjVariantId === cjVariant.vid);
        if (!local) continue;

        const stock = sumVariantInventory(cjVariant);
        const price = Number(cjVariant.variantSellPrice ?? 0);

        await prisma.variant.update({
          where: { id: local.id },
          data: {
            stock,
            price,
            salePrice: calculateSalePrice(price, "default"),
          },
        });

        if (stock > 0) hasStock = true;
      }

      await prisma.product.update({ where: { id: product.id }, data: { isActive: hasStock } });
    } catch (error) {
      console.error(`[sync] failed to sync product ${product.cjProductId}`, error);
    }
  }
}

/**
 * Polls CJ for status + tracking on every order that's still in flight and
 * updates the local Order record.
 */
export async function syncOrderStatuses() {
  const orders = await prisma.order.findMany({
    where: { status: { in: [...ACTIVE_ORDER_STATUSES] } },
  });

  for (const order of orders) {
    if (!order.cjOrderNumber) continue;

    try {
      const detail = await cjApi.getOrderDetail(order.cjOrderNumber);
      const mappedStatus = mapCJStatus(detail.orderStatus);
      const newTrackingNumber =
        detail.trackNumber && !order.trackingNumber ? detail.trackNumber : null;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          ...(mappedStatus ? { status: mappedStatus } : {}),
          trackingNumber: detail.trackNumber ?? order.trackingNumber,
        },
      });

      if (newTrackingNumber) {
        await sendShippingNotificationEmail({
          to: order.customerEmail,
          orderId: order.id,
          trackingNumber: newTrackingNumber,
        }).catch((err) => console.error(`[sync] failed to send shipping email for order ${order.id}`, err));
      }
    } catch (error) {
      console.error(`[sync] failed to sync order ${order.cjOrderNumber}`, error);
    }
  }
}
