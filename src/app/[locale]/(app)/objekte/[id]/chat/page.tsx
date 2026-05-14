import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess } from "@/lib/feature-gate";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { ChatClient } from "./_components/chat-client";
import { ProGate } from "@/components/ui/pro-gate";
import type { ChatMessage } from "@/lib/types/database";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations("chat");
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const allowed = await canAccess(user.id, "ai_chat");

  if (!allowed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link href={{ pathname: "/objekte/[id]", params: { id } }} locale={locale} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
          &larr; Zurueck
        </Link>
        <ProGate isPro={false} upgradeHref={`/${locale}/upgrade`} featureName="KI-Chat-Assistent">
          <div className="h-64 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        </ProGate>
      </div>
    );
  }

  const admin = createAdminClient();
  const [{ data: property }, { data: session }] = await Promise.all([
    admin.from("properties").select("city, zip_code").eq("id", id).single(),
    supabase.from("chat_sessions").select("messages").eq("user_id", user.id).eq("property_id", id).single(),
  ]);

  if (!property) redirect(`/${locale}/suche`);

  const initialMessages = (session?.messages as ChatMessage[]) ?? [];

  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] max-w-2xl flex-col px-4 py-4 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href={{ pathname: "/objekte/[id]", params: { id } }} locale={locale} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          &larr; {property.city}
        </Link>
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t("title")}</h1>
      </div>
      <ChatClient propertyId={id} initialMessages={initialMessages} />
    </div>
  );
}
