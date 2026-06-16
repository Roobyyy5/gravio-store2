"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCartStore, useCartTotal } from "@/lib/cart-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CartPage() {
  const t = useTranslations("CartPage");
  const items = useCartStore((state) => state.items);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const total = useCartTotal();

  if (items.length === 0) {
    return (
      <main className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold">{t("emptyTitle")}</h1>
        <p className="mb-6 text-muted-foreground">{t("emptyDescription")}</p>
        <Button render={<Link href="/products">{t("browseCatalog")}</Link>} nativeButton={false} />
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      <div className="flex flex-col gap-4">
        {items.map((item) => {
          const attrs = Object.entries(item.attributes)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");

          return (
            <div key={item.variantId} className="flex items-center gap-4 rounded-md border p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                {item.image && (
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                {attrs && <p className="text-xs text-muted-foreground">{attrs}</p>}
                <p className="text-sm">${item.price.toFixed(2)}</p>
              </div>
              <Input
                type="number"
                min={1}
                max={item.stock}
                value={item.quantity}
                onChange={(e) => setQuantity(item.variantId, Number(e.target.value) || 1)}
                className="w-20"
              />
              <p className="w-20 text-right font-medium">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("remove")}
                onClick={() => removeItem(item.variantId)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between border-t pt-4">
        <p className="text-lg font-bold">{t("total", { total: `$${total.toFixed(2)}` })}</p>
        <Button size="lg" render={<Link href="/checkout">{t("checkout")}</Link>} nativeButton={false} />
      </div>
    </main>
  );
}
