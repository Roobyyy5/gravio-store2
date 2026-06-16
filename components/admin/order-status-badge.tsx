import { Badge } from "@/components/ui/badge";
import { OrderStatus } from "@prisma/client";

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
  return <Badge variant={VARIANTS[status]}>{status}</Badge>;
}
