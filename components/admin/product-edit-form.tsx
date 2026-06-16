"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMarginInfo, MIN_MULTIPLIER } from "@/lib/pricing";

interface VariantRow {
  id: string;
  sku: string;
  price: number;
  salePrice: number;
  stock: number;
  attributes: Record<string, string>;
}

export function ProductEditForm({
  product,
}: {
  product: { id: string; isActive: boolean; variants: VariantRow[] };
}) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(product.isActive);
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(product.variants.map((v) => [v.id, v.salePrice.toFixed(2)]))
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const minPrices = useMemo(
    () => Object.fromEntries(product.variants.map((v) => [v.id, v.price * MIN_MULTIPLIER])),
    [product.variants]
  );

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive,
          variants: product.variants.map((v) => ({
            id: v.id,
            salePrice: Number(prices[v.id]),
          })),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Product updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this product and all its variants?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Product deleted");
      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
        <Label htmlFor="active">Visible in storefront</Label>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU / Attributes</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Sale price</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {product.variants.map((variant) => {
              const margin = getMarginInfo(variant.price, Number(prices[variant.id]) || 0);
              const attrs = Object.entries(variant.attributes ?? {})
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ");

              return (
                <TableRow key={variant.id}>
                  <TableCell>
                    <div className="font-medium">{variant.sku}</div>
                    {attrs && <div className="text-xs text-muted-foreground">{attrs}</div>}
                  </TableCell>
                  <TableCell>${variant.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min={minPrices[variant.id]}
                      value={prices[variant.id]}
                      onChange={(e) =>
                        setPrices((prev) => ({ ...prev, [variant.id]: e.target.value }))
                      }
                      className="w-28"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      min ${minPrices[variant.id].toFixed(2)}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {margin.marginPercent.toFixed(0)}% · {margin.multiplier.toFixed(2)}x
                  </TableCell>
                  <TableCell>{variant.stock}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between">
        <Button variant="destructive" onClick={remove} disabled={deleting}>
          {deleting ? "Deleting..." : "Delete product"}
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
