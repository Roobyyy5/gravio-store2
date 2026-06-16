"use client";

import { useTranslations } from "next-intl";
import { ShoppingBag, ShoppingCart } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { useCartCount } from "@/lib/cart-store";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/shop/language-switcher";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const t = useTranslations("Nav");
  const count = useCartCount();
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: t("home") },
    { href: "/products", label: t("catalog") },
  ];

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
            <ShoppingBag className="size-4" />
          </span>
          <span className="bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent">
            Gravio
          </span>
        </Link>

        <nav className="hidden gap-1 text-sm font-medium md:flex">
          {navLinks.map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2 transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <Link
            href="/cart"
            aria-label={t("cart")}
            className="relative flex size-9 items-center justify-center rounded-full transition-colors hover:bg-muted"
          >
            <ShoppingCart className="size-5" />
            {count > 0 && (
              <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-xs">
                {count}
              </Badge>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
