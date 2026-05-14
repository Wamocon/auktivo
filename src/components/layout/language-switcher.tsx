"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  function switchLocale(newLocale: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace(pathname as any, { locale: newLocale });
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-1 dark:border-zinc-700">
      <Globe className="h-3.5 w-3.5 text-zinc-400" />
      {["de", "en"].map((loc) => (
        <button
          key={loc}
          onClick={() => switchLocale(loc)}
          className={`px-1.5 py-0.5 text-xs font-medium uppercase transition-colors ${
            loc === currentLocale
              ? "text-zinc-900 dark:text-zinc-50"
              : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          }`}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
