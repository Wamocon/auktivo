import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ChevronRight, Shield, MessageSquare, Bell, Search, TrendingDown,
  Clock, FileSearch, BrainCircuit, ArrowRight, Star, Zap,
  Building2, CheckCircle2, Lock,
} from "lucide-react";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("hero");
  const tProblem = await getTranslations("problem");
  const tSolution = await getTranslations("solution");
  const tFeatures = await getTranslations("features");
  const tPricing = await getTranslations("pricing");

  return (
    <>
      {/* HERO */}
      <section className="hero-grid relative overflow-hidden px-4 pb-24 pt-20 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.04)_1px,transparent_1px)] bg-size-[48px_48px]"
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 dark:border-brand-800/40 dark:bg-brand-900/20 dark:text-brand-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            {t("badge")}
          </div>

          <h1 className="mb-6 text-[2.75rem] font-black leading-[1.1] tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl lg:text-7xl">
            {t("title")}
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-xl leading-8 text-zinc-500 dark:text-zinc-400">
            {t("subtitle")}
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/registrieren"
              locale={locale}
              className="group flex items-center gap-2 rounded-full bg-zinc-900 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-zinc-900/20 hover:bg-zinc-700 dark:bg-brand-500 dark:shadow-brand-500/20 dark:hover:bg-brand-600"
            >
              {t("cta_primary")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#wie-funktioniert-es"
              className="flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {t("cta_secondary")} <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-zinc-400">
            <Lock className="h-3 w-3" /> Kostenlos starten &middot; Keine Kreditkarte &middot; DSGVO-konform
          </p>

          <div className="mt-16 grid grid-cols-3 divide-x divide-zinc-200 rounded-2xl border border-zinc-200 bg-white/80 backdrop-blur-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/60">
            {[
              { value: "12.500+", label: "Objekte/Jahr", icon: Building2 },
              { value: "5 min", label: "statt 2 Stunden", icon: Clock },
              { value: "200.000+", label: "Sucher/Monat", icon: Star },
            ].map(({ value, label, icon: Icon }) => (
              <div key={label} className="py-5 text-center">
                <div className="mb-0.5 flex items-center justify-center gap-1.5 text-2xl font-black text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                  {value}
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-zinc-500">
                  <Icon className="h-3 w-3" /> {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="bg-white px-4 py-20 dark:bg-zinc-950 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-red-200 dark:bg-red-900/40" />
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-red-500">
              <TrendingDown className="h-3.5 w-3.5" /> Das Problem
            </span>
            <span className="h-px flex-1 bg-red-200 dark:bg-red-900/40" />
          </div>
          <h2 className="mb-3 text-center text-3xl font-black text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            {tProblem("title")}
          </h2>
          <p className="mb-10 text-center text-lg text-zinc-500 dark:text-zinc-400">
            {tProblem("description")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border-l-4 border-red-400 bg-red-50 py-3.5 pl-4 pr-5 dark:border-red-500/60 dark:bg-red-900/10"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600 dark:bg-red-900/40 dark:text-red-400">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {tProblem(`points.${i}` as Parameters<typeof tProblem>[0])}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOESUNG */}
      <section id="wie-funktioniert-es" className="bg-zinc-50 px-4 py-20 dark:bg-zinc-900 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Zap className="h-4 w-4 text-brand-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
              So funktioniert es
            </span>
          </div>
          <h2 className="mb-4 text-center text-3xl font-black text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            {tSolution("title")}
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-zinc-500 dark:text-zinc-400">
            In drei einfachen Schritten zur fundierten Entscheidungsgrundlage.
          </p>
          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="absolute left-1/2 top-8 hidden h-px w-2/3 -translate-x-1/2 bg-linear-to-r from-transparent via-brand-200 to-transparent dark:via-brand-800 md:block" />
            {[
              { icon: FileSearch, title: tSolution("step1_title"), desc: tSolution("step1_desc"), step: "01", color: "brand" },
              { icon: BrainCircuit, title: tSolution("step2_title"), desc: tSolution("step2_desc"), step: "02", color: "purple" },
              { icon: MessageSquare, title: tSolution("step3_title"), desc: tSolution("step3_desc"), step: "03", color: "green" },
            ].map(({ icon: Icon, title, desc, step, color }) => (
              <div
                key={step}
                className="relative rounded-2xl bg-white p-6 shadow-md shadow-zinc-950/5 dark:bg-zinc-800 dark:shadow-none dark:ring-1 dark:ring-white/5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color === "brand" ? "bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300" : color === "purple" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300" : "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-4xl font-black text-zinc-100 dark:text-zinc-700">{step}</span>
                </div>
                <h3 className="mb-2 text-base font-bold text-zinc-900 dark:text-zinc-50">{title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-white px-4 py-20 dark:bg-zinc-950 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            Features
          </div>
          <h2 className="mb-12 text-center text-3xl font-black text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            {tFeatures("title")}
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {[
              { icon: Shield, key: "ai_analysis", accent: "bg-brand-500", bg: "bg-brand-50 dark:bg-brand-900/10", fg: "text-brand-600 dark:text-brand-300" },
              { icon: MessageSquare, key: "ai_chat", accent: "bg-purple-500", bg: "bg-purple-50 dark:bg-purple-900/10", fg: "text-purple-600 dark:text-purple-300" },
              { icon: Bell, key: "alerts", accent: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-900/10", fg: "text-amber-600 dark:text-amber-300" },
              { icon: Search, key: "search", accent: "bg-green-500", bg: "bg-green-50 dark:bg-green-900/10", fg: "text-green-600 dark:text-green-300" },
            ].map(({ icon: Icon, key, accent, bg, fg }) => (
              <div key={key} className="group flex gap-4 rounded-2xl bg-zinc-50 p-6 transition-shadow hover:shadow-md dark:bg-zinc-900">
                <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                  <div className={`absolute -top-1 -left-1 h-3 w-3 rounded-full ${accent} opacity-80`} />
                  <Icon className={`h-5 w-5 ${fg}`} />
                </div>
                <div>
                  <h3 className="mb-1.5 font-bold text-zinc-900 dark:text-zinc-50">
                    {tFeatures(`${key}.title` as Parameters<typeof tFeatures>[0])}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {tFeatures(`${key}.desc` as Parameters<typeof tFeatures>[0])}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-zinc-50 px-4 py-20 dark:bg-zinc-900 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">Preise</div>
          <h2 className="mb-3 text-3xl font-black text-zinc-900 dark:text-zinc-50 sm:text-4xl">{tPricing("title")}</h2>
          <p className="mb-12 text-zinc-500 dark:text-zinc-400">{tPricing("subtitle")}</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-7 text-left shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-800 dark:ring-white/5">
              <h3 className="mb-1 text-sm font-semibold uppercase tracking-widest text-zinc-500">{tPricing("free.name")}</h3>
              <div className="mb-5 mt-2">
                <span className="text-4xl font-black text-zinc-900 dark:text-zinc-50">0 EUR</span>
              </div>
              <ul className="mb-6 space-y-2">
                {(["5 Suchen/Monat", "Basisdaten", "Dokumente einsehen"] as const).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" /> {f}
                  </li>
                ))}
                {(["KI-Analyse", "KI-Chat", "Suchwecker"] as const).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-400 line-through dark:text-zinc-600">
                    <Lock className="h-4 w-4 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/registrieren" locale={locale} className="block rounded-full border border-zinc-300 py-3 text-center text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700">
                {tPricing("free.cta")}
              </Link>
            </div>
            <div className="relative rounded-2xl bg-zinc-900 p-7 text-left shadow-xl shadow-zinc-900/30 dark:bg-brand-600">
              <span className="absolute -top-3 right-6 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white dark:bg-white dark:text-brand-700">
                {tPricing("pro.badge")}
              </span>
              <h3 className="mb-1 text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-brand-100">{tPricing("pro.name")}</h3>
              <div className="mb-5 mt-2">
                <span className="text-4xl font-black text-white">9,99 EUR</span>
                <span className="ml-1 text-sm text-zinc-500 dark:text-brand-200">/Monat</span>
              </div>
              <ul className="mb-6 space-y-2">
                {(["Unbegrenzte Suchen", "KI-Gutachtenanalyse", "KI-Chat-Assistent", "Favoritenverwaltung", "Suchwecker"] as const).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-300 dark:text-brand-100">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/registrieren" locale={locale} className="block rounded-full bg-white py-3 text-center text-sm font-bold text-zinc-900 hover:bg-zinc-100">
                {tPricing("pro.cta")}
              </Link>
            </div>
          </div>
          <Link href="/preise" locale={locale} className="mt-6 inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Alle Features vergleichen <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-zinc-900 px-4 py-20 text-center dark:bg-zinc-950 sm:px-6">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,oklch(0.56_0.20_250/0.3),transparent_60%)]" />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="mb-4 text-3xl font-black text-white sm:text-4xl">
            Kein Expertenwissen erforderlich
          </h2>
          <p className="mb-8 text-lg text-zinc-400">
            Auktivo macht Zwangsversteigerungen fuer jeden zugaenglich. Kostenlos starten, jederzeit upgraden.
          </p>
          <Link
            href="/registrieren"
            locale={locale}
            className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-zinc-900 shadow-lg shadow-white/10 hover:bg-zinc-100"
          >
            Jetzt kostenlos starten
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </>
  );
}
