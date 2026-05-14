import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("errors");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 text-7xl font-black text-brand-500">404</div>
      <h1 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t("not_found_title")}</h1>
      <p className="mb-8 max-w-sm text-zinc-500">{t("not_found_message")}</p>
      <Link
        href="/"
        className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {t("go_home")}
      </Link>
    </div>
  );
}
