import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess } from "@/lib/feature-gate";
import { analyzeProperty, analyzePropertyFallback, buildPropertyContextText } from "@/lib/ai/max";

export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const allowed = await canAccess(user.id, "ai_analysis");
  if (!allowed) {
    return NextResponse.json({ error: "Pro-Feature erforderlich" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: property } = await admin
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .single();

  if (!property) {
    return NextResponse.json({ error: "Objekt nicht gefunden" }, { status: 404 });
  }

  const { data: existingAnalysis } = await admin
    .from("property_analyses")
    .select("*")
    .eq("property_id", propertyId)
    .single();

  if (existingAnalysis?.analysis_status === "done" && existingAnalysis.analysis_model !== "algorithmic-fallback") {
    return NextResponse.json({ analysis: existingAnalysis });
  }

  const { data: documents } = await admin
    .from("property_documents")
    .select("ocr_text, ocr_status")
    .eq("property_id", propertyId)
    .eq("ocr_status", "done");

  const ocrText = documents?.map((d) => d.ocr_text).filter(Boolean).join("\n\n") ?? "";
  const contextText = ocrText || buildPropertyContextText(property);
  const dataSource = ocrText ? "documents" : "zvg_portal";

  // Status sofort auf "processing" setzen und Antwort senden
  await admin.from("property_analyses").upsert({
    property_id: propertyId,
    analysis_status: "processing",
  });

  // Analyse im Hintergrund ausfuehren - laeuft nach dem Response-Versand weiter
  after(async () => {
    try {
      const result = await analyzeProperty(contextText, {
        court: property.court,
        market_value: property.market_value,
        city: property.city,
      });

      await admin.from("property_analyses").upsert({
        property_id: propertyId,
        risk_level: result.risk_level,
        risk_signals: {
          baulasten: result.baulasten,
          sanierungsbedarf: result.sanierungsbedarf,
          mietverhaeltnisse: result.mietverhaeltnisse,
          grundbuchbelastungen: result.grundbuchbelastungen,
          positive_signals: result.positive_signals,
          disclaimer: result.disclaimer,
        },
        summary: result.summary,
        analysis_model: dataSource === "zvg_portal" ? "max-zvg-portal" : "max-default",
        prompt_version: "v1.0",
        analysis_status: "done",
        analyzed_at: new Date().toISOString(),
      });
    } catch (aiError) {
      console.error("[Analyse] KI-Fehler, starte algorithmischen Fallback:", aiError);
      try {
        const fallbackResult = analyzePropertyFallback(contextText, {
          court: property.court,
          market_value: property.market_value,
          city: property.city,
        });

        await admin.from("property_analyses").upsert({
          property_id: propertyId,
          risk_level: fallbackResult.risk_level,
          risk_signals: {
            baulasten: fallbackResult.baulasten,
            sanierungsbedarf: fallbackResult.sanierungsbedarf,
            mietverhaeltnisse: fallbackResult.mietverhaeltnisse,
            grundbuchbelastungen: fallbackResult.grundbuchbelastungen,
            positive_signals: fallbackResult.positive_signals,
            disclaimer: fallbackResult.disclaimer,
          },
          summary: fallbackResult.summary,
          analysis_model: "algorithmic-fallback",
          prompt_version: "v1.0-fallback",
          analysis_status: "done",
          analyzed_at: new Date().toISOString(),
          error_message: `KI nicht erreichbar: ${String(aiError)}`,
        });
      } catch (fallbackError) {
        console.error("[Analyse] Fallback-Fehler:", fallbackError);
        await admin.from("property_analyses").upsert({
          property_id: propertyId,
          analysis_status: "failed",
          error_message: String(aiError),
        });
      }
    }
  });

  // Sofortige Antwort - Frontend pollt via router.refresh()
  return NextResponse.json({ status: "processing" });
}
