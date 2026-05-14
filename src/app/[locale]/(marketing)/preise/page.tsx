import { getTranslations } from "next-intl/server";
import { Check, X } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default async function PreisePage() {
  const t = await getTranslations("pricing");

  const freeFeatures = [
    { label: "5 Suchen pro Monat", included: true },
    { label: "Objekt-Grunddaten", included: true },
    { label: "Direktlink zum ZVG-Portal", included: true },
    { label: "KI-Risikoanalyse", included: false },
    { label: "KI-Chat-Assistent", included: false },
    { label: "Favoriten speichern", included: false },
    { label: "Suchalarm", included: false },
    { label: "Risiko-Filter", included: false },
  ];

  const proFeatures = [
    { label: "Unbegrenzte Suchen", included: true },
    { label: "Objekt-Grunddaten", included: true },
    { label: "Direktlink zum ZVG-Portal", included: true },
    { label: "KI-Risikoanalyse", included: true },
    { label: "KI-Chat-Assistent", included: true },
    { label: "Favoriten speichern", included: true },
    { label: "Suchalarm per E-Mail", included: true },
    { label: "Risiko-Filter", included: true },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-50">{t("title")}</h1>
        <p className="mt-4 text-lg text-zinc-500">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:mx-auto lg:max-w-3xl">
        {/* Free */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">Free</h2>
          <div className="mb-6 text-3xl font-black text-zinc-900 dark:text-zinc-50">
            0 EUR <span className="text-base font-normal text-zinc-500">/ Monat</span>
          </div>
          <ul className="mb-8 flex flex-col gap-3">
            {freeFeatures.map((f, i) => (
              <li key={i} className="flex items-center gap-3">
                {f.included ? (
                  <Check className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <X className="h-4 w-4 shrink-0 text-zinc-300" />
                )}
                <span className={`text-sm ${f.included ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400"}`}>
                  {f.label}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/registrieren"
            className="flex w-full items-center justify-center rounded-full border border-zinc-300 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
          >
            Kostenlos starten
          </Link>
        </div>

        {/* Pro */}
        <div className="relative rounded-2xl border-2 border-brand-500 bg-white p-8 dark:bg-zinc-900">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="rounded-full bg-brand-500 px-4 py-1 text-xs font-bold text-white">Empfohlen</span>
          </div>
          <h2 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">Pro</h2>
          <div className="mb-6 text-3xl font-black text-zinc-900 dark:text-zinc-50">
            9,99 EUR <span className="text-base font-normal text-zinc-500">/ Monat</span>
          </div>
          <ul className="mb-8 flex flex-col gap-3">
            {proFeatures.map((f, i) => (
              <li key={i} className="flex items-center gap-3">
                <Check className="h-4 w-4 shrink-0 text-brand-500" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{f.label}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/upgrade"
            className="flex w-full items-center justify-center rounded-full bg-brand-500 py-3 text-sm font-bold text-white hover:bg-brand-600"
          >
            Jetzt upgraden
          </Link>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-zinc-400">
        Alle Preise inkl. MwSt. Jederzeit kuendbar. Abrechnung monatlich per Stripe.
      </p>
    </div>
  );
}
