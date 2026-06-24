"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OrderStatus } from "@prisma/client";

export function OrderActions({
  orderId,
  status,
  hasCjOrder,
}: {
  orderId: string;
  status: OrderStatus;
  hasCjOrder: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"create" | "sync" | null>(null);

  async function run(action: "create" | "sync") {
    setPending(action);
    try {
      const path =
        action === "create"
          ? `/api/admin/orders/${orderId}/create-cj-order`
          : `/api/admin/orders/${orderId}/sync`;
      const res = await fetch(path, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Дія не виконана");
      toast.success(action === "create" ? "Замовлення на CJ створено" : "Статус синхронізовано");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Дія не виконана");
    } finally {
      setPending(null);
    }
  }

  const canCreate = !hasCjOrder && status === "PAID";

  return (
    <div className="flex gap-2">
      {canCreate && (
        <Button size="sm" onClick={() => run("create")} disabled={pending !== null}>
          {pending === "create" ? "Створення..." : "Створити замовлення на CJ"}
        </Button>
      )}
      {hasCjOrder && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => run("sync")}
          disabled={pending !== null}
        >
          {pending === "sync" ? "Синхронізація..." : "Синхронізувати статус зараз"}
        </Button>
      )}
    </div>
  );
}
