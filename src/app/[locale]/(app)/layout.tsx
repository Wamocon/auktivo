import { redirect } from "next/navigation";
import { getAuthUser, getProfile } from "@/lib/supabase/cached-queries";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import type { Profile } from "@/lib/types/database";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Parallel: auth + profil gleichzeitig laden
  const user = await getAuthUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const profileData = await getProfile(user.id);

  // Fallback: wenn Profil noch nicht vorhanden, minimales Objekt nutzen
  const profile = (profileData ?? { id: user.id, email: user.email ?? "", plan: "free", user_type: "private", is_admin: false }) as Profile;

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} profile={profile as Profile} />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} />
    </div>
  );
}
