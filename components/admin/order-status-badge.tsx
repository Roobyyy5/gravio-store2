import { Badge } from "@/components/ui/badge";
import { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS } from "@/lib/order-status-labels";

const VARIANTS: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  PAID: "secondary",
  PROCESSING: "secondary",
  SHIPPED: "default",
  DELIVERED: "default",
  CANCELLED: "destructive",
  REFUNDED: "destructive",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={VARIANTS[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}
