"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, LayoutDashboard, Package, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/products/import", label: "Import from CJ", icon: Download },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
];

function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  if (pathname === href) return true;
  if (href === "/admin/products") {
    return pathname.startsWith("/admin/products/") && !pathname.startsWith("/admin/products/import");
  }
  return pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActiveLink(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
