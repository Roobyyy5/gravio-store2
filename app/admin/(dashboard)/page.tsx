import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncButtons } from "@/components/admin/sync-buttons";
import { OrderStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Clock, Layers, Package, ShoppingCart } from "lucide-react";

// Reads live DB stats, so it must not be statically generated at build time
// (the DB is unreachable from the build container on Railway/Nixpacks).
export const dynamic = "force-dynamic";

async function getStats() {
  const [productCount, activeProductCount, variantCount, outOfStockCount, orderCounts] =
    await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.variant.count(),
      prisma.variant.count({ where: { stock: 0 } }),
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

  const ordersByStatus = Object.fromEntries(
    orderCounts.map((row) => [row.status, row._count._all])
  ) as Partial<Record<OrderStatus, number>>;

  const totalOrders = orderCounts.reduce((sum, row) => sum + row._count._all, 0);

  return {
    productCount,
    activeProductCount,
    variantCount,
    outOfStockCount,
    totalOrders,
    ordersByStatus,
  };
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  PAID: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  PROCESSING: "bg-primary/10 text-primary",
  SHIPPED: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  DELIVERED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  CANCELLED: "bg-red-500/10 text-red-600 dark:text-red-400",
  REFUNDED: "bg-muted text-muted-foreground",
};

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const orderStatusOrder: OrderStatus[] = [
    "PENDING",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <SyncButtons />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="size-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Products</p>
              <p className="text-2xl font-bold">{stats.productCount}</p>
              <p className="text-xs text-muted-foreground">{stats.activeProductCount} active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers className="size-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Variants</p>
              <p className="text-2xl font-bold">{stats.variantCount}</p>
              <p className="text-xs text-muted-foreground">{stats.outOfStockCount} out of stock</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShoppingCart className="size-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Orders</p>
              <p className="text-2xl font-bold">{stats.totalOrders}</p>
              <p className="text-xs text-muted-foreground">
                {stats.ordersByStatus.PENDING ?? 0} pending
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="size-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">In progress</p>
              <p className="text-2xl font-bold">
                {(stats.ordersByStatus.PAID ?? 0) +
                  (stats.ordersByStatus.PROCESSING ?? 0) +
                  (stats.ordersByStatus.SHIPPED ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">paid, processing or shipped</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Orders by status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {orderStatusOrder.map((status) => (
              <div
                key={status}
                className={cn("rounded-lg border p-3 text-center", STATUS_STYLES[status])}
              >
                <p className="text-lg font-bold">{stats.ordersByStatus[status] ?? 0}</p>
                <p className="text-xs font-medium">{status}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
