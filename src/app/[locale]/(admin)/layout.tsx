import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AdminNavLinks } from "./_components/admin-nav-links";
import type { ReactNode } from "react";

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect(`/${locale}/dashboard`);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex">
        {/* Sidebar */}
        <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {/* Admin Header */}
          <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-md bg-red-100 px-2 py-1 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <ShieldAlert className="h-3.5 w-3.5" /> ADMIN
              </span>
            </div>
            <p className="mt-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Auktivo Panel</p>
          </div>

          {/* Nav - Client Component für aktiven Link */}
          <nav className="flex flex-1 flex-col gap-0.5 p-2">
            <AdminNavLinks locale={locale} />
          </nav>

          {/* Back to App */}
          <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
            <Link
              href={`/${locale}/dashboard`}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              Zur App
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
