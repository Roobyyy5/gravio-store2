import { useTranslations } from "next-intl";
import { ShoppingBag, ShieldCheck, Truck, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto grid gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <Link href="/" className="flex items-center gap-2 text-base font-bold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
              <ShoppingBag className="size-3.5" />
            </span>
            Gravio
          </Link>
          <p className="max-w-xs text-sm text-muted-foreground">{t("description")}</p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <p className="font-semibold">{t("shop")}</p>
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            {t("home")}
          </Link>
          <Link href="/products" className="text-muted-foreground hover:text-foreground">
            {t("catalog")}
          </Link>
          <Link href="/cart" className="text-muted-foreground hover:text-foreground">
            {t("cart")}
          </Link>
        </div>

        <div className="flex flex-col gap-2 text-sm sm:col-span-2 lg:col-span-2">
          <p className="font-semibold">{t("whyUs")}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">{t("shipping")}</span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">{t("secureCheckout")}</span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">{t("freshPicks")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t">
        <div className="container mx-auto px-4 py-4 text-center text-xs text-muted-foreground">
          {t("copyright", { year })}
        </div>
      </div>
    </footer>
  );
}
