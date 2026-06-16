"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function SyncButton({ type, label }: { type: "stock" | "orders"; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();

  async function run() {
    setPending(true);
    try {
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      toast.success(`${label} sync completed`);
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" onClick={run} disabled={pending}>
      <RefreshCw className={cn("mr-2 h-4 w-4", pending && "animate-spin")} />
      {pending ? "Syncing..." : label}
    </Button>
  );
}

export function SyncButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      <SyncButton type="stock" label="Sync stock & prices" />
      <SyncButton type="orders" label="Sync order statuses" />
    </div>
  );
}
