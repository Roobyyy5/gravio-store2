"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/cart-store";

interface VariantData {
  id: string;
  sku: string;
  salePrice: number;
  stock: number;
  attributes: Record<string, string>;
}

export function ProductVariantSelector({
  productId,
  productName,
  image,
  variants,
}: {
  productId: string;
  productName: string;
  image?: string;
  variants: VariantData[];
}) {
  const t = useTranslations("VariantSelector");
  const addItem = useCartStore((state) => state.addItem);

  const attributeKeys = useMemo(
    () => Array.from(new Set(variants.flatMap((v) => Object.keys(v.attributes)))),
    [variants]
  );

  const optionsByKey = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const key of attributeKeys) {
      map[key] = Array.from(new Set(variants.map((v) => v.attributes[key]).filter(Boolean)));
    }
    return map;
  }, [attributeKeys, variants]);

  const [selected, setSelected] = useState<Record<string, string>>(() => ({
    ...(variants[0]?.attributes ?? {}),
  }));
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = useMemo(
    () =>
      variants.find((v) => attributeKeys.every((key) => v.attributes[key] === selected[key])) ??
      variants[0],
    [variants, attributeKeys, selected]
  );

  if (!selectedVariant) {
    return <p className="text-muted-foreground">{t("unavailable")}</p>;
  }

  function addToCart() {
    if (selectedVariant.stock <= 0) return;
    addItem(
      {
        variantId: selectedVariant.id,
        productId,
        name: productName,
        image,
        sku: selectedVariant.sku,
        price: selectedVariant.salePrice,
        attributes: selectedVariant.attributes,
        stock: selectedVariant.stock,
      },
      quantity
    );
    toast.success(t("addedToCart"));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-2xl font-bold">${selectedVariant.salePrice.toFixed(2)}</p>

      {attributeKeys.map((key) => (
        <div key={key}>
          <p className="mb-2 text-sm font-medium">{key}</p>
          <div className="flex flex-wrap gap-2">
            {optionsByKey[key].map((value) => {
              const isSelected = selected[key] === value;
              const available = variants.some(
                (v) =>
                  v.attributes[key] === value &&
                  attributeKeys
                    .filter((k) => k !== key)
                    .every((k) => v.attributes[k] === selected[k]) &&
                  v.stock > 0
              );
              return (
                <Button
                  key={value}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  disabled={!available}
                  onClick={() => setSelected((prev) => ({ ...prev, [key]: value }))}
                >
                  {value}
                </Button>
              );
            })}
          </div>
        </div>
      ))}

      <p className={selectedVariant.stock > 0 ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
        {selectedVariant.stock > 0 ? t("inStock", { stock: selectedVariant.stock }) : t("outOfStock")}
      </p>

      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          max={selectedVariant.stock}
          value={quantity}
          onChange={(e) =>
            setQuantity(
              Math.max(1, Math.min(Number(e.target.value) || 1, selectedVariant.stock || 1))
            )
          }
          className="w-20"
          disabled={selectedVariant.stock <= 0}
        />
        <Button onClick={addToCart} disabled={selectedVariant.stock <= 0}>
          {t("addToCart")}
        </Button>
      </div>
    </div>
  );
}
