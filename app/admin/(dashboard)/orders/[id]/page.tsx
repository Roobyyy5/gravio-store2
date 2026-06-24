import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { OrderActions } from "@/components/admin/order-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShippingAddress } from "@/lib/types";

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });

  if (!order) notFound();

  const address = order.shippingAddress as unknown as ShippingAddress;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Замовлення {order.id}</h1>
          <p className="text-sm text-muted-foreground">
            {order.createdAt.toISOString().slice(0, 16).replace("T", " ")}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Клієнт</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{order.customerName}</p>
            <p>{order.customerEmail}</p>
            <p>{order.customerPhone}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Адреса доставки
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{address?.line1}</p>
            {address?.line2 && <p>{address.line2}</p>}
            <p>
              {address?.city}
              {address?.state ? `, ${address.state}` : ""} {address?.postalCode}
            </p>
            <p>{address?.country}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Виконання на CJ</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p>Номер замовлення CJ: {order.cjOrderNumber ?? "ще не створено"}</p>
          <p>Номер відстеження: {order.trackingNumber ?? "—"}</p>
          <OrderActions
            orderId={order.id}
            status={order.status}
            hasCjOrder={!!order.cjOrderNumber}
          />
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Товар</TableHead>
              <TableHead>Артикул</TableHead>
              <TableHead>К-сть</TableHead>
              <TableHead>Ціна</TableHead>
              <TableHead>Сума</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="max-w-xs truncate font-medium">
                  {item.variant.product.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{item.variant.sku}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>${item.price.toFixed(2)}</TableCell>
                <TableCell>${(item.price * item.quantity).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-8 text-sm">
        <div className="text-right">
          <p className="text-muted-foreground">Собівартість</p>
          <p className="font-medium">${order.totalCost.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Сплачено</p>
          <p className="text-lg font-bold">${order.totalPrice.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
