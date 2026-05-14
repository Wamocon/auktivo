import { getTranslations } from "next-intl/server";

const faqs = [
  {
    q: "Was ist Auktivo?",
    a: "Auktivo ist eine KI-gestutzte Plattform, die Zwangsversteigerungen in Deutschland analysiert. Wir aggregieren Daten vom ZVG-Portal und nutzen KI, um Risiken in Gutachten und Exposees zu identifizieren.",
  },
  {
    q: "Wie funktioniert die KI-Risikoanalyse?",
    a: "Unser KI-System verarbeitet OCR-ausgelesene Dokumente (Gutachten, Exposees) und identifiziert typische Risikosignale wie Baulasten, Sanierungsbedarf, Mietverhaeltnisse und Grundbuchbelastungen. Das Ergebnis ist eine strukturierte Risikoeinschaetzung - keine Anlage- oder Rechtsberatung.",
  },
  {
    q: "Ersetzt Auktivo eine Rechtsberatung?",
    a: "Nein. Auktivo ist ein Analyse- und Informationswerkzeug. Alle KI-generierten Einschaetzungen sind unverbindlich und ersetzen keine anwaltliche, steuerliche oder bautechnische Beratung. Bitte konsultieren Sie immer qualifizierte Fachleute vor einer Bieterentscheidung.",
  },
  {
    q: "Was kostet Pro?",
    a: "Pro kostet 9,99 EUR / Monat (inkl. MwSt.). Sie koennen jederzeit kuendigen. Die Abrechnung erfolgt monatlich per Stripe.",
  },
  {
    q: "Welche Daten verarbeitet Auktivo?",
    a: "Wir verarbeiten oeffentlich zugaengliche Daten vom ZVG-Portal sowie hochgeladene Dokumente. Personenbezogene Daten werden DSGVO-konform behandelt. Weitere Details in unserer Datenschutzerklaerung.",
  },
  {
    q: "Wie werden Objekte gefunden?",
    a: "Unser automatisierter Crawler prueft regelmaessig das ZVG-Portal auf neue und aktualisierte Versteigerungstermine. Neue Objekte erscheinen in der Regel innerhalb von 24 Stunden in Auktivo.",
  },
  {
    q: "Kann ich mein Abonnement selbst verwalten?",
    a: "Ja. Im Profil-Bereich koennen Sie jederzeit das Stripe-Kundenportal aufrufen, dort Zahlungsmethoden aendern oder kuendigen.",
  },
  {
    q: "In welchen Bundeslaendern sind Objekte verfuegbar?",
    a: "Aktuell aggregieren wir Daten aus allen deutschen Bundeslaendern, die auf dem ZVG-Portal veroeffentlicht sind. Die Verfuegbarkeit haengt von den Gerichten ab, die ihr Daten oeffentlich bereitstellen.",
  },
];

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const t = await getTranslations("faq");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{t("title")}</h1>
        <p className="mt-3 text-zinc-500">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {faqs.map((faq, i) => (
          <details key={i} className="group py-5">
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-semibold text-zinc-900 marker:content-none dark:text-zinc-50">
              {faq.q}
              <span className="ml-auto shrink-0 text-zinc-400 transition-transform group-open:rotate-180">
                &#9660;
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{faq.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
