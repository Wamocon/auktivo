import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess } from "@/lib/feature-gate";
import { chatWithProperty } from "@/lib/ai/max";
import type { ChatMessage } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Nicht autorisiert", { status: 401 });
  }

  const allowed = await canAccess(user.id, "ai_chat");
  if (!allowed) {
    return new Response("Pro-Feature erforderlich", { status: 403 });
  }

  const body = await request.json() as { message: string };
  const userMessage = body.message?.trim();

  if (!userMessage || userMessage.length > 2000) {
    return new Response("Ungueltige Nachricht", { status: 400 });
  }

  const admin = createAdminClient();

  // OCR-Text und Analyse laden
  const [{ data: documents }, { data: analysis }, { data: session }] = await Promise.all([
    admin.from("property_documents").select("ocr_text").eq("property_id", propertyId).eq("ocr_status", "done"),
    admin.from("property_analyses").select("summary").eq("property_id", propertyId).single(),
    admin.from("chat_sessions").select("*").eq("user_id", user.id).eq("property_id", propertyId).single(),
  ]);

  const ocrText = documents?.map((d) => d.ocr_text).filter(Boolean).join("\n\n") ?? "";
  const analysisSummary = analysis?.summary ?? "Keine Analyse verfuegbar";
  const existingMessages: ChatMessage[] = (session?.messages as ChatMessage[]) ?? [];

  // Nachrichtenlimit pruefen
  if (existingMessages.length >= 100) {
    return new Response("Maximale Nachrichtenanzahl erreicht", { status: 429 });
  }

  const updatedMessages: ChatMessage[] = [
    ...existingMessages,
    { role: "user", content: userMessage, created_at: new Date().toISOString() },
  ];

  // Chat-Session aktualisieren (mit User-Nachricht)
  await admin.from("chat_sessions").upsert({
    user_id: user.id,
    property_id: propertyId,
    messages: updatedMessages,
    updated_at: new Date().toISOString(),
  });

  // Streaming Response
  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const gen = chatWithProperty(
          updatedMessages.map(({ role, content }) => ({ role, content })),
          ocrText,
          analysisSummary
        );

        for await (const chunk of gen) {
          fullResponse += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
        }

        // Assistent-Antwort in Session speichern
        const finalMessages: ChatMessage[] = [
          ...updatedMessages,
          { role: "assistant", content: fullResponse, created_at: new Date().toISOString() },
        ];

        await admin.from("chat_sessions").upsert({
          user_id: user.id,
          property_id: propertyId,
          messages: finalMessages,
          updated_at: new Date().toISOString(),
        });

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        console.error("Chat stream error:", error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Fehler" })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
