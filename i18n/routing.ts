import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["uk", "en", "ru"],
  defaultLocale: "uk",
  localePrefix: "as-needed",
});
