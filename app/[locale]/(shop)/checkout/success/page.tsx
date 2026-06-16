import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ClearCartOnMount } from "@/components/shop/clear-cart";

export default async function CheckoutSuccessPage() {
  const t = await getTranslations("CheckoutSuccess");

  return (
    <main className="container mx-auto flex flex-col items-center gap-4 px-4 py-24 text-center">
      <ClearCartOnMount />
      <CheckCircle2 className="h-12 w-12 text-green-600" />
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="max-w-md text-muted-foreground">{t("description")}</p>
      <Button render={<Link href="/products">{t("continueShopping")}</Link>} nativeButton={false} />
    </main>
  );
}
