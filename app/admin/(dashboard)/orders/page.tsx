import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";

// Reads live order data, so it must not be statically generated at build
// time (the DB is unreachable from the build container on Railway/Nixpacks).
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Замовлення</h1>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Замовлення</TableHead>
              <TableHead>Клієнт</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Сума</TableHead>
              <TableHead>Трекінг</TableHead>
              <TableHead>Створено</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Замовлень ще немає.
                </TableCell>
              </TableRow>
            )}
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-medium hover:underline"
                  >
                    {order.id.slice(0, 10)}
                  </Link>
                </TableCell>
                <TableCell>
                  <div>{order.customerName}</div>
                  <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell>${order.totalPrice.toFixed(2)}</TableCell>
                <TableCell>{order.trackingNumber ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {order.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
