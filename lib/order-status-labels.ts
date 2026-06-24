import { OrderStatus } from "@prisma/client";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Очікує оплати",
  PAID: "Оплачено",
  PROCESSING: "Обробляється",
  SHIPPED: "Відправлено",
  DELIVERED: "Доставлено",
  CANCELLED: "Скасовано",
  REFUNDED: "Повернуто",
};
