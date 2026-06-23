"use client";

import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="relative flex items-center">
      <Globe className="pointer-events-none absolute left-2 size-4 text-muted-foreground" />
      <select
        aria-label={t("label")}
        value={locale}
        onChange={(e) => router.replace(pathname, { locale: e.target.value })}
        className="h-7 cursor-pointer appearance-none rounded-md bg-transparent pl-7 pr-2 text-[0.8rem] font-medium uppercase outline-none hover:bg-muted"
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {t(loc)}
          </option>
        ))}
      </select>
    </div>
  );
}
