import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col gap-4 border-r bg-muted/30 p-4">
        <Link href="/admin" className="flex items-center gap-2 px-1">
          <Image
            src="/admin-avatar.jpg"
            alt="Univa"
            width={32}
            height={32}
            className="size-8 rounded-lg object-cover"
          />
          <div>
            <p className="text-sm font-bold leading-tight">Univa</p>
            <p className="text-xs leading-tight text-muted-foreground">Admin</p>
          </div>
        </Link>
        {session?.user?.email && (
          <p className="truncate px-1 text-xs text-muted-foreground">{session.user.email}</p>
        )}
        <AdminNav />
        <div className="mt-auto">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
