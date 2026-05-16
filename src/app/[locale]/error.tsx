"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Link } from "@/i18n/navigation";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    // Nur message + stack loggen, um React-interne Ref-Serialisierungsfehler zu vermeiden
    console.error("[ErrorBoundary]", error?.message ?? String(error), error?.stack);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 text-5xl font-black text-red-500">500</div>
      <h1 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t("server_error_title")}</h1>
      <p className="mb-8 max-w-sm text-zinc-500">{t("server_error_message")}</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {t("try_again")}
        </button>
        <Link
          href="/"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
        >
          {t("go_home")}
        </Link>
      </div>
    </div>
  );
}
