"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/lib/cart-store";

type CaptureState = "processing" | "success" | "error";

export default function CheckoutSuccessPage() {
  const t = useTranslations("CheckoutSuccess");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<CaptureState>("processing");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }

    fetch("/api/checkout/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("capture failed");
        useCartStore.getState().clear();
        setState("success");
      })
      .catch(() => setState("error"));
  }, [token]);

  if (state === "processing") {
    return (
      <main className="container mx-auto flex flex-col items-center gap-4 px-4 py-24 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h1 className="text-2xl font-bold">{t("processingTitle")}</h1>
        <p className="max-w-md text-muted-foreground">{t("processingDescription")}</p>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="container mx-auto flex flex-col items-center gap-4 px-4 py-24 text-center">
        <XCircle className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">{t("errorTitle")}</h1>
        <p className="max-w-md text-muted-foreground">{t("errorDescription")}</p>
        <Button render={<Link href="/cart">{t("backToCart")}</Link>} nativeButton={false} />
      </main>
    );
  }

  return (
    <main className="container mx-auto flex flex-col items-center gap-4 px-4 py-24 text-center">
      <CheckCircle2 className="h-12 w-12 text-green-600" />
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="max-w-md text-muted-foreground">{t("description")}</p>
      <Button render={<Link href="/products">{t("continueShopping")}</Link>} nativeButton={false} />
    </main>
  );
}
