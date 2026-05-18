import OpenAI from "openai";
import type { Property } from "@/lib/types/database";

// MAX ist eine selbstgehostete KI mit OpenAI-kompatibler API
// Lazy initialized - wirft nicht beim Modul-Load
let _maxClient: OpenAI | null = null;

function getMaxClient(): OpenAI {
  if (!_maxClient) {
    _maxClient = new OpenAI({
      apiKey: process.env.MAX_API_KEY || "sk-max-litellm-2026",
      // Port 11434 = Ollama direkt. Wenn LiteLLM-Proxy (Port 4000) laeuft, diesen bevorzugen.
      baseURL: process.env.MAX_API_BASE_URL || "http://localhost:11434/v1",
      // 2 Minuten: reicht fuer Flash-Modelle (<30s) und kleine Anfragen an 35B-Modell.
      // Bei Timeout greift automatisch der algorithmische Fallback.
      timeout: 120_000,
      maxRetries: 0, // Kein Retry - sofort Fallback statt weitere Wartezeit
    });
  }
  return _maxClient;
}

// Schnelle Erstanalyse: 35B Allround-Modell - beste Qualitaet der verfuegbaren Modelle
export const MAX_MODEL_FAST = process.env.MAX_MODEL_FAST ?? "qwen3.6:35b";

// Tiefenanalyse: 122B Flaggschiff-Modell - maximale Praezision fuer komplexe Auswertungen
// Installation: ollama pull qwen3.5:122b (auf dem MAX-Server ausfuehren)
export const MAX_MODEL_DEEP = process.env.MAX_MODEL_DEEP ?? "qwen3.5:122b";

/** @deprecated Verwende MAX_MODEL_FAST oder MAX_MODEL_DEEP */
export const MAX_MODEL = MAX_MODEL_FAST;

export { getMaxClient as maxClient };

// ----------------------------------------------------------------
// ZVG-Portal-Kontext (Fallback wenn keine Gutachten-PDFs vorliegen)
// ----------------------------------------------------------------

/**
 * Erstellt einen strukturierten Text aus den Property-DB-Feldern,
 * die vom ZVG-Portal-Crawler befuellt werden.
 * Wird als Kontext-Fallback genutzt wenn keine OCR-Dokumente vorliegen.
 */
export function buildPropertyContextText(property: Property): string {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "unbekannt";
    try {
      return new Date(dateStr).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const formatEur = (val: number | null | undefined) =>
    val ? `${val.toLocaleString("de-DE")} EUR` : "nicht angegeben";

  const lines: string[] = [
    "OBJEKT-INFORMATIONEN (Quelle: ZVG-Portal-Eintrag)",
    "==================================================",
    "HINWEIS: Keine Gutachten-PDFs verfuegbar. Analyse basiert auf oeffentlichen ZVG-Portal-Angaben.",
    "",
    `Amtsgericht: ${property.court}`,
  ];

  if (property.court_file_number) lines.push(`Aktenzeichen: ${property.court_file_number}`);
  lines.push(`Versteigerungstermin: ${formatDate(property.auction_date)}`);
  lines.push("");
  lines.push("LAGE UND ADRESSE:");
  lines.push(
    [property.address, property.zip_code, property.city, property.state]
      .filter(Boolean)
      .join(", ") || "nicht angegeben"
  );
  if (property.objekt_lage) lines.push(`Objekt/Lage: ${property.objekt_lage}`);

  lines.push("", "FINANZIELLE ECKDATEN:");
  lines.push(`Verkehrswert: ${formatEur(property.market_value)}`);
  lines.push(`Mindestgebot: ${formatEur(property.minimum_bid)}`);

  if (property.art_versteigerung) {
    lines.push("", "ART DER VERSTEIGERUNG:", property.art_versteigerung);
  }
  if (property.grundbuch) {
    lines.push("", "GRUNDBUCH:", property.grundbuch);
  }
  if (property.beschreibung) {
    lines.push("", "OBJEKTBESCHREIBUNG:", property.beschreibung);
  }
  if (property.versteigerungsort) {
    lines.push("", "VERSTEIGERUNGSORT:", property.versteigerungsort);
  }
  if (property.glaeubigerinfo) {
    lines.push("", "GLAEUBIGERINFORMATION:", property.glaeubigerinfo);
  }

  return lines.join("\n");
}

// ----------------------------------------------------------------
// KI-Risikoanalyse
// ----------------------------------------------------------------
const RISK_ANALYSIS_PROMPT = `Du bist ein erfahrener Immobiliengutachter und Rechtsexperte fuer deutsche Zwangsversteigerungen.

Analysiere das folgende Gutachten und extrahiere strukturiert alle Risikosignale.
Verwende einen konservativ-vorsichtigen Ansatz: Lieber zu viele Warnungen als zu wenige.

Antworte AUSSCHLIESSLICH mit validem JSON gemaess dem angegebenen Schema.
Kein zusaetzlicher Text ausserhalb des JSON.

Risikostufen:
- low: Kein oder minimaler Einfluss auf den Kaufpreis
- medium: Erfordert Aufmerksamkeit, kalkulierbares Risiko (10.000-50.000 EUR Auswirkung)
- high: Erhebliches Risiko, koennte den Kaufpreis stark beeinflussen (>50.000 EUR)

Disclaimer muss immer enthalten sein:
"Diese KI-Analyse wurde automatisch erstellt und dient ausschliesslich der Orientierung. Sie ersetzt keine rechtliche, steuerliche oder bautechnische Fachberatung. WAMOCON GmbH uebernimmt keine Haftung fuer die Richtigkeit dieser Analyse."`;

export interface AnalysisResult {
  risk_level: "low" | "medium" | "high" | "critical";
  summary: string;
  baulasten: Array<{ description: string; severity: string; text_excerpt: string }>;
  sanierungsbedarf: Array<{ description: string; cost_estimate_eur?: string; severity: string; text_excerpt: string }>;
  mietverhaeltnisse: Array<{ description: string; severity: string; text_excerpt: string }>;
  grundbuchbelastungen: Array<{ description: string; type: string; amount_eur?: number; severity: string }>;
  positive_signals: Array<{ description: string }>;
  disclaimer: string;
}

// ----------------------------------------------------------------
// Algorithmischer Fallback (KI nicht erreichbar)
// ----------------------------------------------------------------

const FALLBACK_KEYWORDS = {
  baulasten: [
    { kw: "baulast", severity: "high" as const },
    { kw: "freileitungsrecht", severity: "high" as const },
    { kw: "leitungsrecht", severity: "medium" as const },
    { kw: "wegerecht", severity: "medium" as const },
    { kw: "fahrtrecht", severity: "medium" as const },
    { kw: "gehrecht", severity: "low" as const },
  ],
  sanierungsbedarf: [
    { kw: "asbest", severity: "high" as const },
    { kw: "schimmel", severity: "high" as const },
    { kw: "sanierungsbedarf", severity: "high" as const },
    { kw: "einsturzgefahr", severity: "high" as const },
    { kw: "feuchtigkeit", severity: "medium" as const },
    { kw: "risse", severity: "medium" as const },
    { kw: "sanierung", severity: "medium" as const },
    { kw: "instandsetzung", severity: "medium" as const },
    { kw: "modernisierung", severity: "low" as const },
    { kw: "renovierung", severity: "low" as const },
  ],
  mietverhaeltnisse: [
    { kw: "nießbrauch", severity: "high" as const },
    { kw: "wohnrecht", severity: "high" as const },
    { kw: "mietverhältnis", severity: "medium" as const },
    { kw: "mietvertrag", severity: "medium" as const },
    { kw: "mieter", severity: "medium" as const },
    { kw: "vermietet", severity: "low" as const },
    { kw: "leerstand", severity: "low" as const },
  ],
  grundbuchbelastungen: [
    { kw: "zwangssicherungshypothek", severity: "high" as const, type: "Zwangssicherungshypothek" },
    { kw: "arresthypothek", severity: "high" as const, type: "Arresthypothek" },
    { kw: "grundschuld", severity: "high" as const, type: "Grundschuld" },
    { kw: "hypothek", severity: "high" as const, type: "Hypothek" },
    { kw: "rentenschuld", severity: "high" as const, type: "Rentenschuld" },
    { kw: "pfandrecht", severity: "medium" as const, type: "Pfandrecht" },
    { kw: "dienstbarkeit", severity: "medium" as const, type: "Dienstbarkeit" },
    { kw: "erbbaurecht", severity: "medium" as const, type: "Erbbaurecht" },
    { kw: "vorkaufsrecht", severity: "low" as const, type: "Vorkaufsrecht" },
  ],
} as const;

export function analyzePropertyFallback(
  ocrText: string,
  propertyInfo: { court: string; market_value?: number | null; city?: string | null }
): AnalysisResult {
  const lower = ocrText.toLowerCase();

  function extractExcerpt(kw: string, idx: number): string {
    const start = Math.max(0, idx - 40);
    const end = Math.min(ocrText.length, idx + kw.length + 80);
    return ocrText.slice(start, end).replace(/\s+/g, " ").trim();
  }

  const baulasten: AnalysisResult["baulasten"] = [];
  for (const { kw, severity } of FALLBACK_KEYWORDS.baulasten) {
    const idx = lower.indexOf(kw);
    if (idx !== -1) {
      baulasten.push({ description: `Hinweis auf "${kw}" im Gutachten`, severity, text_excerpt: extractExcerpt(kw, idx) });
    }
  }

  const sanierungsbedarf: AnalysisResult["sanierungsbedarf"] = [];
  for (const { kw, severity } of FALLBACK_KEYWORDS.sanierungsbedarf) {
    const idx = lower.indexOf(kw);
    if (idx !== -1) {
      sanierungsbedarf.push({ description: `Hinweis auf "${kw}" im Gutachten`, severity, text_excerpt: extractExcerpt(kw, idx) });
    }
  }

  const mietverhaeltnisse: AnalysisResult["mietverhaeltnisse"] = [];
  for (const { kw, severity } of FALLBACK_KEYWORDS.mietverhaeltnisse) {
    const idx = lower.indexOf(kw);
    if (idx !== -1) {
      mietverhaeltnisse.push({ description: `Hinweis auf "${kw}" im Gutachten`, severity, text_excerpt: extractExcerpt(kw, idx) });
    }
  }

  const grundbuchbelastungen: AnalysisResult["grundbuchbelastungen"] = [];
  for (const entry of FALLBACK_KEYWORDS.grundbuchbelastungen) {
    const idx = lower.indexOf(entry.kw);
    if (idx !== -1) {
      grundbuchbelastungen.push({ description: `Hinweis auf "${entry.kw}" im Gutachten`, type: entry.type, severity: entry.severity, text_excerpt: extractExcerpt(entry.kw, idx) } as AnalysisResult["grundbuchbelastungen"][number]);
    }
  }

  const highCount = [...baulasten, ...sanierungsbedarf, ...mietverhaeltnisse, ...grundbuchbelastungen]
    .filter((s) => s.severity === "high").length;
  const totalCount = baulasten.length + sanierungsbedarf.length + mietverhaeltnisse.length + grundbuchbelastungen.length;

  const risk_level: AnalysisResult["risk_level"] =
    highCount >= 3 ? "critical" : highCount >= 1 ? "high" : totalCount >= 2 ? "medium" : "low";

  const parts: string[] = [];
  if (baulasten.length) parts.push(`${baulasten.length} Baulast-Hinweis(e)`);
  if (sanierungsbedarf.length) parts.push(`${sanierungsbedarf.length} Sanierungshinweis(e)`);
  if (mietverhaeltnisse.length) parts.push(`${mietverhaeltnisse.length} Miethinweis(e)`);
  if (grundbuchbelastungen.length) parts.push(`${grundbuchbelastungen.length} Grundbuchbelastung(en)`);

  const locationPart = [
    propertyInfo.city ? `Objekt in ${propertyInfo.city}` : "",
    propertyInfo.market_value ? `Verkehrswert: ${propertyInfo.market_value.toLocaleString("de-DE")} EUR` : "",
  ].filter(Boolean).join(", ");

  const summary = parts.length > 0
    ? `Algorithmische Auswertung: ${parts.join(", ")} im Gutachtentext erkannt.${locationPart ? ` ${locationPart}.` : ""} Fuer eine praezisere Analyse bitte KI-Analyse erneut starten.`
    : `Algorithmische Auswertung: Keine kritischen Schlagwoerter im Gutachtentext erkannt.${locationPart ? ` ${locationPart}.` : ""} Fuer eine vollstaendige Risikoeinschaetzung bitte KI-Analyse erneut starten.`;

  return {
    risk_level,
    summary,
    baulasten,
    sanierungsbedarf,
    mietverhaeltnisse,
    grundbuchbelastungen,
    positive_signals: totalCount === 0 ? [{ description: "Keine offensichtlichen Risikosignale im Gutachtentext erkannt" }] : [],
    disclaimer:
      "HINWEIS: Diese Analyse wurde algorithmisch erstellt (Schlagwortsuche), da die KI-Risikoanalyse derzeit nicht erreichbar ist. Sie ist weniger praezise als eine vollstaendige KI-Analyse. Bitte starten Sie die Analyse erneut, sobald der KI-Dienst verfuegbar ist. Sie ersetzt keine rechtliche, steuerliche oder bautechnische Fachberatung.",
  };
}

export async function analyzeProperty(
  ocrText: string,
  propertyInfo: { court: string; market_value?: number | null; city?: string | null },
  mode: "fast" | "deep" = "fast"
): Promise<AnalysisResult> {
  const model = mode === "deep" ? MAX_MODEL_DEEP : MAX_MODEL_FAST;
  const userPrompt = `OBJEKT-KONTEXT:
Amtsgericht: ${propertyInfo.court}
Ort: ${propertyInfo.city ?? "unbekannt"}
Verkehrswert: ${propertyInfo.market_value ? `${propertyInfo.market_value.toLocaleString("de-DE")} EUR` : "unbekannt"}

GUTACHTEN-TEXT:
${ocrText}`;

  const response = await getMaxClient().chat.completions.create({
    model,
    messages: [
      { role: "system", content: RISK_ANALYSIS_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Keine Antwort von MAX erhalten");

  return JSON.parse(content) as AnalysisResult;
}

// ----------------------------------------------------------------
// KI-Chat-Assistent
// ----------------------------------------------------------------
const CHAT_SYSTEM_PROMPT_BASE = `Du bist ein hilfreicher Assistent fuer Immobilienkaefer bei Zwangsversteigerungen in Deutschland.

Beantworte Fragen ausschliesslich auf Basis der bereitgestellten Informationen.
Bei Unsicherheit sage klar, dass die Information nicht verfuegbar ist.

Sprache: Antworte auf Deutsch, klar und verstaendlich fuer Nicht-Experten.
Ton: Freundlich, sachlich, hilfreich.
Format: Markdown erlaubt (Listen, Fettdruck).

WICHTIG: Fuge am Ende jeder Antwort folgende Zeile hinzu:
---
*Diese Antwort ersetzt keine rechtliche oder bautechnische Fachberatung.*`;

export type ChatContextSource = "documents" | "zvg_portal";

export async function* chatWithProperty(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  contextText: string,
  analysisSummary: string,
  contextSource: ChatContextSource = "documents"
): AsyncGenerator<string> {
  const contextLabel =
    contextSource === "zvg_portal"
      ? "ZVG-PORTAL-DATEN (keine Gutachten-PDFs verfuegbar)"
      : "VOLLSTAENDIGER GUTACHTEN-TEXT (Auszug)";

  const sourceNote =
    contextSource === "zvg_portal"
      ? "\nHINWEIS: Fuer dieses Objekt liegen keine Gutachten-Dokumente vor. Du arbeitest ausschliesslich mit den oeffentlichen ZVG-Portal-Angaben (Beschreibung, Grundbuch, Verkehrswert etc.). Weise den Nutzer darauf hin, wenn er nach Details fragt, die nur in Gutachten enthaelt waeren."
      : "\nDir liegt das vollstaendige Gutachten sowie eine KI-Risikoanalyse vor.";

  const systemWithContext = `${CHAT_SYSTEM_PROMPT_BASE}${sourceNote}

RISIKOANALYSE-ZUSAMMENFASSUNG:
${analysisSummary}

${contextLabel}:
${contextText}`;

  // Chat laeuft immer mit dem schnellen Modell (interaktiv, Latenz wichtig)
  const stream = await getMaxClient().chat.completions.create({
    model: MAX_MODEL_FAST,
    messages: [
      { role: "system", content: systemWithContext },
      ...messages.slice(-50), // Letzte 50 Nachrichten als Kontext
    ],
    stream: true,
    temperature: 0.3,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
