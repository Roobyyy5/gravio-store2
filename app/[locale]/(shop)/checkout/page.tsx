"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCartStore, useCartTotal } from "@/lib/cart-store";
import { Button } from "@/components/ui/button";

export default function CheckoutPage() {
  const t = useTranslations("CheckoutPage");
  const items = useCartStore((state) => state.items);
  const total = useCartTotal();
  const [loading, setLoading] = useState(false);

  async function checkout() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("error"));
      window.location.href = data.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("error"));
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold">{t("emptyTitle")}</h1>
        <Button render={<Link href="/products">{t("browseCatalog")}</Link>} nativeButton={false} />
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      <div className="flex flex-col gap-2 rounded-md border p-4">
        {items.map((item) => (
          <div key={item.variantId} className="flex justify-between text-sm">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t pt-2 font-bold">
          <span>{t("total")}</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">{t("notice")}</p>

      <Button size="lg" className="mt-4 w-full" onClick={checkout} disabled={loading}>
        {loading ? t("redirecting") : t("proceedToPayment")}
      </Button>
    </main>
  );
}
