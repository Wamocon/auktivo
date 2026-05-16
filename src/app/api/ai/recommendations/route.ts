import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { maxClient, MAX_MODEL } from "@/lib/ai/max";
import type { Property } from "@/lib/types/database";

const RECOMMENDATION_PROMPT = `Du bist ein erfahrener Immobilieninvestment-Berater, spezialisiert auf deutsche Zwangsversteigerungen.

Der Nutzer hat seine Suchkriterien angegeben. Analysiere die bereitgestellten Objekte und erstelle eine priorisierte Empfehlungsliste.

Beruecksichtige:
- Preis-Leistungs-Verhaeltnis (Verkehrswert vs. Mindestgebot)
- Objekttyp und Lage passend zu den Kriterien
- Risikopotenzial (sofern erkennbar)
- Versteigerungstermin-Dringlichkeit

Antworte AUSSCHLIESSLICH mit validem JSON:
{
  "recommendations": [
    {
      "property_id": "uuid",
      "score": 8.5,
      "reasoning": "Kurze Begruendung (2-3 Saetze)",
      "pros": ["Vorteil 1", "Vorteil 2"],
      "cons": ["Nachteil 1"]
    }
  ]
}

Sortiere nach Score absteigend (1-10). Maximal 10 Empfehlungen.
Disclaimer: "KI-Empfehlungen sind Orientierungshilfen - keine Anlageberatung."`;

export interface RecommendationPreferences {
  budget_max?: number;
  budget_min?: number;
  location?: string;
  bundesland?: string;
  property_types?: string[];
  size_min?: number;
  risk_tolerance?: "low" | "medium" | "high";
  other_criteria?: string;
}

export interface RecommendationResult {
  property_id: string;
  score: number;
  reasoning: string;
  pros: string[];
  cons: string[];
  property?: Property;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  let prefs: RecommendationPreferences;
  try {
    prefs = (await request.json()) as RecommendationPreferences;
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Objekte aus der DB laden - gefiltert nach Praeferenzen
  let query = admin
    .from("properties")
    .select("*")
    .eq("status", "active")
    .order("auction_date", { ascending: true })
    .limit(40);

  if (prefs.budget_max) {
    query = query.lte("market_value", prefs.budget_max * 1.5); // Spielraum
  }
  if (prefs.budget_min) {
    query = query.gte("market_value", prefs.budget_min * 0.5);
  }
  if (prefs.property_types && prefs.property_types.length > 0) {
    query = query.in("property_type", prefs.property_types);
  }
  if (prefs.bundesland) {
    query = query.eq("land_abk", prefs.bundesland);
  }
  if (prefs.location) {
    // Suche nach Stadt oder PLZ
    query = query.or(
      `city.ilike.%${prefs.location}%,zip_code.ilike.${prefs.location}%,state.ilike.%${prefs.location}%`
    );
  }

  const { data: properties, error } = await query;

  if (error || !properties || properties.length === 0) {
    return NextResponse.json(
      { recommendations: [], message: "Keine passenden Objekte gefunden. Bitte Suchkriterien anpassen." },
      { status: 200 }
    );
  }

  // Objektliste kompakt fuer KI aufbereiten
  const propertyList = properties.map((p: Property) => ({
    id: p.id,
    typ: p.property_type ?? "unbekannt",
    ort: `${p.zip_code} ${p.city ?? ""}`.trim(),
    verkehrswert: p.market_value,
    mindestgebot: p.minimum_bid,
    termin: p.auction_date,
    beschreibung: p.beschreibung?.slice(0, 200),
    gericht: p.court,
  }));

  const userPrompt = `SUCHKRITERIEN:
Budget max: ${prefs.budget_max ? `${prefs.budget_max.toLocaleString("de-DE")} EUR` : "keine Angabe"}
Budget min: ${prefs.budget_min ? `${prefs.budget_min.toLocaleString("de-DE")} EUR` : "keine Angabe"}
Bundesland: ${prefs.bundesland ?? "alle Bundeslaender"}
Standort: ${prefs.location ?? "keine Angabe"}
Objekttyp: ${prefs.property_types?.join(", ") ?? "alle"}
Mindestgroesse: ${prefs.size_min ? `${prefs.size_min} m²` : "keine Angabe"}
Risikobereitschaft: ${prefs.risk_tolerance ?? "medium"}
Weitere Kriterien: ${prefs.other_criteria ?? "keine"}

VERFUEGBARE OBJEKTE (${properties.length} Treffer):
${JSON.stringify(propertyList, null, 2)}`;

  try {
    const response = await maxClient().chat.completions.create({
      model: MAX_MODEL,
      messages: [
        { role: "system", content: RECOMMENDATION_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Keine Antwort von MAX");

    const parsed = JSON.parse(content) as {
      recommendations: Array<Omit<RecommendationResult, "property">>;
    };

    // Eigenschaften der empfohlenen Objekte anreichern
    const propertyMap = new Map(properties.map((p: Property) => [p.id, p]));
    const enriched: RecommendationResult[] = (parsed.recommendations ?? [])
      .slice(0, 10)
      .map((r) => ({
        ...r,
        property: propertyMap.get(r.property_id),
      }))
      .filter((r) => r.property != null);

    // Session optional speichern (Fehler ignorieren)
    try {
      await admin.from("ai_recommendation_sessions").insert({
        user_id: user.id,
        preferences_json: prefs,
        results_json: { count: enriched.length },
      });
    } catch {
      // Ignorieren - nicht kritisch
    }

    return NextResponse.json({ recommendations: enriched });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "KI-Fehler";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
