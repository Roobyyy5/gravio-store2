"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface TrackedOrder {
  id: string;
  status: string;
  trackingNumber: string | null;
  totalPrice: number;
  createdAt: string;
  items: OrderItem[];
}

export default function TrackOrderPage() {
  const t = useTranslations("TrackPage");
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderId.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(t("notFound"));
      setOrder(data);
    } catch {
      setError(t("notFound"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">{t("title")}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t("description")}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="orderId">{t("orderId")}</Label>
          <Input
            id="orderId"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder={t("orderIdPlaceholder")}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? t("checking") : t("checkStatus")}
        </Button>
      </form>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {order && (
        <div className="mt-6 flex flex-col gap-3 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("status")}</span>
            <span className="font-medium">{t(`statuses.${order.status}`)}</span>
          </div>
          {order.trackingNumber && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("trackingNumber")}</span>
              <span className="font-medium">{order.trackingNumber}</span>
            </div>
          )}
          <div className="border-t pt-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t pt-3 font-bold">
            <span>{t("total")}</span>
            <span>${order.totalPrice.toFixed(2)}</span>
          </div>
        </div>
      )}
    </main>
  );
}
