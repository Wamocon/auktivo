import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess } from "@/lib/feature-gate";
import { analyzeProperty, analyzePropertyFallback, buildPropertyContextText } from "@/lib/ai/max";

export const maxDuration = 300; // Vercel-Limit; selbstgehostete KI hat kein eigenes Limit

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

  // Property laden
  const { data: property } = await admin
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .single();

  if (!property) {
    return NextResponse.json({ error: "Objekt nicht gefunden" }, { status: 404 });
  }

  // Bestehende Analyse pruefen
  const { data: existingAnalysis } = await admin
    .from("property_analyses")
    .select("*")
    .eq("property_id", propertyId)
    .single();

  if (existingAnalysis?.analysis_status === "done" && existingAnalysis.analysis_model !== "algorithmic-fallback") {
    return NextResponse.json({ analysis: existingAnalysis });
  }

  // OCR-Text laden
  const { data: documents } = await admin
    .from("property_documents")
    .select("ocr_text, ocr_status")
    .eq("property_id", propertyId)
    .eq("ocr_status", "done");

  const ocrText = documents?.map((d) => d.ocr_text).filter(Boolean).join("\n\n") ?? "";

  // Wenn keine Gutachten-PDFs verfuegbar: ZVG-Portal-Daten aus der DB als Kontext nutzen
  const contextText = ocrText || buildPropertyContextText(property);
  const dataSource = ocrText ? "documents" : "zvg_portal";

  // Status auf "processing" setzen
  await admin
    .from("property_analyses")
    .upsert({
      property_id: propertyId,
      analysis_status: "processing",
    });

  try {
    const result = await analyzeProperty(contextText, {
      court: property.court,
      market_value: property.market_value,
      city: property.city,
    });

    const { data: analysis } = await admin
      .from("property_analyses")
      .upsert({
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
      })
      .select()
      .single();

    return NextResponse.json({ analysis, dataSource });
  } catch (error) {
    console.error("AI analysis error:", error);

    // Algorithmischen Fallback ausfuehren wenn KI nicht erreichbar
    try {
      const fallbackResult = analyzePropertyFallback(contextText, {
        court: property.court,
        market_value: property.market_value,
        city: property.city,
      });

      const { data: fallbackAnalysis } = await admin
        .from("property_analyses")
        .upsert({
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
          error_message: `KI nicht erreichbar: ${String(error)}`,
        })
        .select()
        .single();

      return NextResponse.json({ analysis: fallbackAnalysis, fallback: true });
    } catch (fallbackError) {
      console.error("Fallback analysis error:", fallbackError);
      await admin
        .from("property_analyses")
        .upsert({
          property_id: propertyId,
          analysis_status: "failed",
          error_message: String(error),
        });
      return NextResponse.json({ error: "KI-Analyse fehlgeschlagen" }, { status: 500 });
    }
  }
}
