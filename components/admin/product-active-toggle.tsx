"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export function ProductActiveToggle({
  productId,
  isActive,
}: {
  productId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(isActive);
  const [pending, setPending] = useState(false);

  async function toggle(value: boolean) {
    setPending(true);
    setChecked(value);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: value }),
      });
      if (!res.ok) throw new Error("Не вдалося оновити");
      router.refresh();
    } catch (error) {
      setChecked(!value);
      toast.error(error instanceof Error ? error.message : "Не вдалося оновити");
    } finally {
      setPending(false);
    }
  }

  return <Switch checked={checked} disabled={pending} onCheckedChange={toggle} />;
}
