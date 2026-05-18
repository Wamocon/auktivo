"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Scale, X, Send, Loader2, Bot, User, Lock, Minimize2 } from "lucide-react";
import type { ChatMessage } from "@/lib/types/database";
import { AiDisclaimer } from "@/components/ui/ai-disclaimer";

interface ChatFloatButtonProps {
  propertyId: string;
  locale: string;
  isPro: boolean;
}

export function ChatFloatButton({ propertyId, locale, isPro }: ChatFloatButtonProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Focus input when chat opens
  useEffect(() => {
    if (chatOpen && isPro) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [chatOpen, isPro]);

  // ESC closes chat
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setChatOpen(false);
    }
    if (chatOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [chatOpen]);

  function handleToggle() {
    if (!isPro) {
      router.push(`/${locale}/upgrade`);
      return;
    }
    setChatOpen((v) => !v);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    const userMsg: ChatMessage = { role: "user", content: message, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
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
        { role: "assistant", content: "Fehler beim Abrufen der Antwort. Bitte erneut versuchen.", created_at: new Date().toISOString() },
      ]);
      setLoading(false);
      return;
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let full = "";

    if (!reader) { setLoading(false); return; }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value).split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") break;
        try {
          const parsed = JSON.parse(data) as { chunk?: string };
          if (parsed.chunk) { full += parsed.chunk; setStreamingContent(full); }
        } catch { /* ignore */ }
      }
    }

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: full, created_at: new Date().toISOString() },
    ]);
    setStreamingContent("");
    setLoading(false);
  }

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat-Popup */}
      {chatOpen && isPro && (
        <div className="flex w-95 h-130 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-100">
                <Scale className="h-3.5 w-3.5 text-white dark:text-zinc-900" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">KI-Rechtsassistent</p>
                <p className="text-[10px] text-zinc-400">Fragen zur Immobilie &amp; zum Verfahren</p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              aria-label="Chat schliessen"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            <AiDisclaimer variant="short" className="mb-3" />
            {messages.length === 0 && !streamingContent && (
              <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400 dark:border-zinc-700">
                Stell eine Frage zur Immobilie, zum Gutachten oder zum Bietprozess.
              </div>
            )}
            <div className="flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] ${msg.role === "user" ? "bg-brand-500 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                    {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                  </div>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === "user" ? "bg-brand-500 text-white" : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {streamingContent && (
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800">
                    <Bot className="h-3 w-3" />
                  </div>
                  <div className="max-w-[85%] rounded-xl bg-zinc-100 px-3 py-2 text-xs leading-relaxed text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    {streamingContent}
                    <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-zinc-400" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-zinc-100 px-3 py-3 dark:border-zinc-800">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Frage zur Immobilie..."
              maxLength={2000}
              disabled={loading}
              className="flex-1 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <div className="relative flex flex-col items-center gap-1">
        {/* Pulse-Ring (nur wenn Chat geschlossen) */}
        {!chatOpen && (
          <span className="pointer-events-none absolute inset-0 rounded-full bg-zinc-900/30 dark:bg-zinc-100/20 animate-ping" />
        )}
        <button
          onClick={handleToggle}
          aria-label={chatOpen ? "Chat schliessen" : "KI-Assistent offnen"}
          title={isPro ? "KI-Chat starten" : "Pro-Feature - jetzt freischalten"}
          className="relative flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 text-white shadow-2xl ring-2 ring-white transition-transform hover:scale-110 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-zinc-800"
        >
          {chatOpen ? (
            <X className="h-7 w-7" />
          ) : isPro ? (
            <Scale className="h-7 w-7" />
          ) : (
            <Lock className="h-6 w-6" />
          )}
        </button>
        {/* Label */}
        {!chatOpen && (
          <span className="whitespace-nowrap rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-white shadow dark:bg-zinc-100 dark:text-zinc-900">
            KI-Chat
          </span>
        )}
      </div>
    </div>
  );
}
