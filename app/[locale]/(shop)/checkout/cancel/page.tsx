import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function CheckoutCancelPage() {
  const t = await getTranslations("CheckoutCancel");

  return (
    <main className="container mx-auto flex flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="max-w-md text-muted-foreground">{t("description")}</p>
      <Button render={<Link href="/cart">{t("backToCart")}</Link>} nativeButton={false} />
    </main>
  );
}
