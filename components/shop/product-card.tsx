import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";

export interface ProductCardData {
  id: string;
  name: string;
  image?: string;
  minPrice: number;
  maxPrice: number;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const t = useTranslations("ProductCard");

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <Card className="h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-primary/40">
        <div className="flex aspect-square items-center justify-center overflow-hidden bg-muted">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              width={300}
              height={300}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
          ) : (
            <span className="text-xs text-muted-foreground">{t("noImage")}</span>
          )}
        </div>
        <CardContent className="p-3">
          <p className="line-clamp-2 min-h-10 text-sm font-medium transition-colors group-hover:text-primary">
            {product.name}
          </p>
          <p className="mt-1 text-base font-bold">
            {product.minPrice === product.maxPrice ? (
              `$${product.minPrice.toFixed(2)}`
            ) : (
              <>
                <span className="text-xs font-normal text-muted-foreground">{t("from")} </span>$
                {product.minPrice.toFixed(2)}
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
