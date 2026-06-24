"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      className="w-full justify-start gap-2"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
    >
      <LogOut className="h-4 w-4" />
      Вийти
    </Button>
  );
}
