"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Send, Loader2, Bot, User } from "lucide-react";
import { AiDisclaimer } from "@/components/ui/ai-disclaimer";
import type { ChatMessage } from "@/lib/types/database";

interface ChatClientProps {
  propertyId: string;
  initialMessages: ChatMessage[];
}

export function ChatClient({ propertyId, initialMessages }: ChatClientProps) {
  const t = useTranslations("chat");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    setInput("");
    setLoading(true);
    setStreamingContent("");

    const res = await fetch(`/api/ai/chat/${propertyId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: message, created_at: new Date().toISOString() },
        { role: "assistant", content: "Fehler: " + res.statusText, created_at: new Date().toISOString() },
      ]);
      setLoading(false);
      return;
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let full = "";

    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") break;

        try {
          const parsed = JSON.parse(data) as { chunk?: string; error?: string };
          if (parsed.chunk) {
            full += parsed.chunk;
            setStreamingContent(full);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", content: message, created_at: new Date().toISOString() },
      { role: "assistant", content: full, created_at: new Date().toISOString() },
    ]);
    setStreamingContent("");
    setLoading(false);
  }

  return (
    <div className="flex h-full flex-col">
      <AiDisclaimer variant="short" className="mb-4" />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 py-4">
          {messages.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400 dark:border-zinc-700">
              {t("start_chat")}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "bg-brand-500 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-brand-500 text-white" : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"}`}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Streaming */}
          {streamingContent && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800">
                <Bot className="h-4 w-4" />
              </div>
              <div className="max-w-[80%] rounded-2xl bg-zinc-100 px-4 py-3 text-sm leading-relaxed text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                {streamingContent}
                <span className="ml-1 inline-block h-3 w-0.5 animate-pulse bg-zinc-400" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={sendMessage} className="mt-4 flex items-center gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("placeholder")}
          maxLength={2000}
          disabled={loading}
          className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
