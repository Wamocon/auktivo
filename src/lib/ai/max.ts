import OpenAI from "openai";

// MAX ist eine selbstgehostete KI mit OpenAI-kompatibler API
// Lazy initialized - wirft nicht beim Modul-Load
let _maxClient: OpenAI | null = null;

function getMaxClient(): OpenAI {
  if (!_maxClient) {
    _maxClient = new OpenAI({
      apiKey: process.env.MAX_API_KEY || "max-local-key",
      baseURL: process.env.MAX_API_BASE_URL || "http://localhost:8080/v1",
      timeout: 300_000, // 5 Minuten - MAX laeuft intern, kein Cloud-Timeout
      maxRetries: 2,
    });
  }
  return _maxClient;
}

export const MAX_MODEL = process.env.MAX_MODEL ?? "max-default";

export { getMaxClient as maxClient };

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

export async function analyzeProperty(
  ocrText: string,
  propertyInfo: { court: string; market_value?: number | null; city?: string | null }
): Promise<AnalysisResult> {
  const userPrompt = `OBJEKT-KONTEXT:
Amtsgericht: ${propertyInfo.court}
Ort: ${propertyInfo.city ?? "unbekannt"}
Verkehrswert: ${propertyInfo.market_value ? `${propertyInfo.market_value.toLocaleString("de-DE")} EUR` : "unbekannt"}

GUTACHTEN-TEXT:
${ocrText.slice(0, 120_000)}`;

  const response = await getMaxClient().chat.completions.create({
    model: MAX_MODEL,
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
const CHAT_SYSTEM_PROMPT = `Du bist ein hilfreicher Assistent fuer Immobilienkaefer bei Zwangsversteigerungen in Deutschland.

Dir liegt das vollstaendige Gutachten sowie eine KI-Risikoanalyse vor.
Beantworte Fragen ausschliesslich auf Basis dieser Informationen.
Bei Unsicherheit sage klar, dass die Information nicht im Dokument enthalten ist.

Sprache: Antworte auf Deutsch, klar und verstaendlich fuer Nicht-Experten.
Ton: Freundlich, sachlich, hilfreich.
Format: Markdown erlaubt (Listen, Fettdruck).

WICHTIG: Fuge am Ende jeder Antwort folgende Zeile hinzu:
---
*Diese Antwort ersetzt keine rechtliche oder bautechnische Fachberatung.*`;

export async function* chatWithProperty(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  ocrText: string,
  analysisSummary: string
): AsyncGenerator<string> {
  const systemWithContext = `${CHAT_SYSTEM_PROMPT}

GUTACHTEN-ZUSAMMENFASSUNG DER KI:
${analysisSummary}

VOLLSTAENDIGER GUTACHTEN-TEXT (Auszug):
${ocrText.slice(0, 80_000)}`;

  const stream = await getMaxClient().chat.completions.create({
    model: MAX_MODEL,
    messages: [
      { role: "system", content: systemWithContext },
      ...messages.slice(-20), // Letzte 20 Nachrichten als Kontext
    ],
    stream: true,
    temperature: 0.3,
    max_tokens: 1500,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
