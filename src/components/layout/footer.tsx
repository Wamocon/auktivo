import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AuktivoLogo } from "@/components/ui/logo";

export function Footer({ locale }: { locale: string }) {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <AuktivoLogo className="h-6 w-auto" />
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {t("disclaimer")}
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t("company")}
            </p>
            <nav className="flex flex-col gap-1">
              <Link href="/impressum" locale={locale} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                {t("links.imprint")}
              </Link>
              <Link href="/datenschutz" locale={locale} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                {t("links.privacy")}
              </Link>
              <Link href="/agb" locale={locale} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                {t("links.terms")}
              </Link>
              <Link href="/faq" locale={locale} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                {t("links.faq")}
              </Link>
            </nav>
          </div>

          {/* Company Stamp */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              WAMOCON GmbH<br />
              Handelsregister: HRB XXXXXXX<br />
              USt-IdNr.: DE XXXXXXXXX
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-700">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            &copy; {t("copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
