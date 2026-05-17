import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Activity, Users, Home, TrendingUp, FileText } from "lucide-react";
import { CrawlerProgressPanel } from "../crawler/_components/crawler-progress-panel";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const admin = createAdminClient();

  const [
    { count: userCount },
    { count: propertyCount },
    { count: proCount },
    { count: analysisCount },
    { count: documentCount },
    { data: recentUsers },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("properties").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("plan", "pro"),
    admin.from("property_analyses").select("*", { count: "exact", head: true }),
    admin.from("property_documents").select("*", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id, full_name, email, plan, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const stats = [
    {
      label: "Nutzer gesamt",
      value: userCount ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      label: "Pro-Nutzer",
      value: proCount ?? 0,
      icon: TrendingUp,
      color: "text-brand-600",
      bg: "bg-brand-100 dark:bg-brand-900/20",
    },
    {
      label: "Objekte im System",
      value: propertyCount ?? 0,
      icon: Home,
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/20",
    },
    {
      label: "KI-Analysen",
      value: analysisCount ?? 0,
      icon: Activity,
      color: "text-purple-600",
      bg: "bg-purple-100 dark:bg-purple-900/20",
    },
    {
      label: "PDF-Dokumente",
      value: documentCount ?? 0,
      icon: FileText,
      color: "text-red-600",
      bg: "bg-red-100 dark:bg-red-900/20",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">System-Uebersicht und Monitoring</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className={`rounded-lg p-2.5 ${stat.bg}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {stat.value.toLocaleString("de-DE")}
              </p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Crawler Trigger */}
      <CrawlerProgressPanel />

      {/* Recent Users */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          <Users className="h-5 w-5" /> Neueste Nutzer
        </h2>
        {recentUsers && recentUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left dark:border-zinc-700">
                  <th className="pb-2 text-xs font-medium text-zinc-500">Name</th>
                  <th className="pb-2 text-xs font-medium text-zinc-500">E-Mail</th>
                  <th className="pb-2 text-xs font-medium text-zinc-500">Plan</th>
                  <th className="pb-2 text-xs font-medium text-zinc-500">Registriert</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-2 font-medium text-zinc-900 dark:text-zinc-50">
                      {u.full_name ?? "-"}
                    </td>
                    <td className="py-2 text-zinc-600 dark:text-zinc-400">{u.email}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.plan === "pro"
                            ? "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {u.plan}
                      </span>
                    </td>
                    <td className="py-2 text-zinc-600 dark:text-zinc-400">
                      {new Date(u.created_at).toLocaleDateString("de-DE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Keine Nutzer gefunden.</p>
        )}
      </div>
    </div>
  );
}
