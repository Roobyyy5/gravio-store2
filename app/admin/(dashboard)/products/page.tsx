import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductActiveToggle } from "@/components/admin/product-active-toggle";
import { Pencil } from "lucide-react";

// Reads live product data, so it must not be statically generated at build
// time (the DB is unreachable from the build container on Railway/Nixpacks).
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: { variants: { select: { salePrice: true, stock: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Товари</h1>
        <Button render={<Link href="/admin/products/import">Імпорт з CJ</Link>} nativeButton={false} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16"></TableHead>
              <TableHead>Назва</TableHead>
              <TableHead>Категорія</TableHead>
              <TableHead>Варіанти</TableHead>
              <TableHead>На складі</TableHead>
              <TableHead>Доставка</TableHead>
              <TableHead>Ціна</TableHead>
              <TableHead>Активний</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Поки немає товарів. Імпортуйте їх з CJ Dropshipping.
                </TableCell>
              </TableRow>
            )}
            {products.map((product) => {
              const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
              const prices = product.variants.map((v) => v.salePrice);
              const min = prices.length ? Math.min(...prices) : 0;
              const max = prices.length ? Math.max(...prices) : 0;

              return (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.images[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        width={40}
                        height={40}
                        className="rounded object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted" />
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-medium">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.categoryName ?? product.categoryId}
                  </TableCell>
                  <TableCell>{product.variants.length}</TableCell>
                  <TableCell>
                    {totalStock > 0 ? (
                      totalStock
                    ) : (
                      <Badge variant="destructive">Немає в наявності</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.isFreeShipping === true && (
                      <Badge variant="secondary">Безкоштовна</Badge>
                    )}
                    {product.isFreeShipping === false && (
                      <Badge variant="outline">Платна</Badge>
                    )}
                    {product.isFreeShipping === null && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} – $${max.toFixed(2)}`}
                  </TableCell>
                  <TableCell>
                    <ProductActiveToggle productId={product.id} isActive={product.isActive} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      nativeButton={false}
                      render={
                        <Link href={`/admin/products/${product.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
