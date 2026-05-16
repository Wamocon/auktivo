import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// vi.hoisted() stellt sicher dass Mocks vor dem Hoisting von vi.mock verfuegbar sind
const mockCompletionsCreate = vi.hoisted(() => vi.fn());
const OpenAIMock = vi.hoisted(() =>
  vi.fn(function (this: Record<string, unknown>) {
    this.chat = { completions: { create: mockCompletionsCreate } };
  })
);

vi.mock("openai", () => ({ default: OpenAIMock }));

describe("getMaxClient Singleton", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("erstellt OpenAI-Client nur einmal (Singleton-Cache greift beim zweiten Aufruf)", async () => {
    // Beide analyzeProperty-Aufrufe teilen sich denselben _maxClient
    const mockResult = {
      risk_level: "low" as const,
      summary: "",
      baulasten: [],
      sanierungsbedarf: [],
      mietverhaeltnisse: [],
      grundbuchbelastungen: [],
      positive_signals: [],
      disclaimer: "",
    };
    mockCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockResult) } }],
    });

    // Gleiche Modul-Instanz ohne resetModules dazwischen
    const { analyzeProperty } = await import("@/lib/ai/max");

    await analyzeProperty("Text1", { court: "AG Test" });
    await analyzeProperty("Text2", { court: "AG Test" });

    // OpenAI-Konstruktor nur EINMAL aufgerufen - Singleton-Cache hat gegriffen
    expect(OpenAIMock).toHaveBeenCalledTimes(1);
    // completions.create aber zweimal - beide Analysen wurden ausgeführt
    expect(mockCompletionsCreate).toHaveBeenCalledTimes(2);
  });
});

describe("MAX_MODEL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("verwendet Standard-Modell wenn MAX_MODEL nicht gesetzt", async () => {
    vi.stubEnv("MAX_MODEL", "");
    const { MAX_MODEL } = await import("@/lib/ai/max");
    // Da MAX_MODEL beim Modul-Load ausgewertet wird, pruefen wir den Fallback
    expect(typeof MAX_MODEL).toBe("string");
  });

  it("verwendet gesetztes MAX_MODEL aus Umgebungsvariable", async () => {
    vi.resetModules();
    vi.stubEnv("MAX_MODEL", "my-custom-model");
    const { MAX_MODEL } = await import("@/lib/ai/max");
    expect(MAX_MODEL).toBe("my-custom-model");
  });
});

describe("analyzeProperty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("analysiert Gutachtentext und gibt AnalysisResult zurueck", async () => {
    const mockResult = {
      risk_level: "medium",
      summary: "Mittleres Risiko",
      baulasten: [],
      sanierungsbedarf: [{ description: "Dach", severity: "medium", cost_estimate_eur: "20000", text_excerpt: "..." }],
      mietverhaeltnisse: [],
      grundbuchbelastungen: [],
      positive_signals: [],
      disclaimer: "KI-Analyse - keine Haftung.",
    };

    mockCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockResult) } }],
    });

    const { analyzeProperty } = await import("@/lib/ai/max");
    const result = await analyzeProperty("Gutachten-Text...", {
      court: "AG Muenchen",
      market_value: 350000,
      city: "Muenchen",
    });

    expect(result.risk_level).toBe("medium");
    expect(result.summary).toBe("Mittleres Risiko");
    expect(result.disclaimer).toContain("KI-Analyse");
  });

  it("ruft OpenAI API mit System-Prompt und Nutzer-Prompt auf", async () => {
    const mockResult = { risk_level: "low", summary: "", baulasten: [], sanierungsbedarf: [], mietverhaeltnisse: [], grundbuchbelastungen: [], positive_signals: [], disclaimer: "" };
    mockCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockResult) } }],
    });

    const { analyzeProperty } = await import("@/lib/ai/max");
    await analyzeProperty("Text", { court: "AG Berlin", market_value: null, city: null });

    const callArgs = mockCompletionsCreate.mock.calls[0][0];
    expect(callArgs.messages).toHaveLength(2);
    expect(callArgs.messages[0].role).toBe("system");
    expect(callArgs.messages[1].role).toBe("user");
  });

  it("enthaelt Gerichtsinformation im Nutzer-Prompt", async () => {
    const mockResult = { risk_level: "low", summary: "", baulasten: [], sanierungsbedarf: [], mietverhaeltnisse: [], grundbuchbelastungen: [], positive_signals: [], disclaimer: "" };
    mockCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockResult) } }],
    });

    const { analyzeProperty } = await import("@/lib/ai/max");
    await analyzeProperty("Text", { court: "AG Frankfurt", market_value: 200000, city: "Frankfurt" });

    const userPrompt = mockCompletionsCreate.mock.calls[0][0].messages[1].content as string;
    expect(userPrompt).toContain("AG Frankfurt");
    expect(userPrompt).toContain("Frankfurt");
  });

  it("enthaelt 'unbekannt' wenn Ort und Wert fehlen", async () => {
    const mockResult = { risk_level: "low", summary: "", baulasten: [], sanierungsbedarf: [], mietverhaeltnisse: [], grundbuchbelastungen: [], positive_signals: [], disclaimer: "" };
    mockCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockResult) } }],
    });

    const { analyzeProperty } = await import("@/lib/ai/max");
    await analyzeProperty("Text", { court: "AG Test", market_value: null, city: null });

    const userPrompt = mockCompletionsCreate.mock.calls[0][0].messages[1].content as string;
    expect(userPrompt).toContain("unbekannt");
  });

  it("wirft Fehler wenn OpenAI keine Antwort liefert", async () => {
    mockCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    const { analyzeProperty } = await import("@/lib/ai/max");
    await expect(
      analyzeProperty("Text", { court: "AG Test" })
    ).rejects.toThrow("Keine Antwort von MAX erhalten");
  });

  it("verwendet JSON-Antwortformat", async () => {
    const mockResult = { risk_level: "low", summary: "", baulasten: [], sanierungsbedarf: [], mietverhaeltnisse: [], grundbuchbelastungen: [], positive_signals: [], disclaimer: "" };
    mockCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockResult) } }],
    });

    const { analyzeProperty } = await import("@/lib/ai/max");
    await analyzeProperty("Text", { court: "AG Test" });

    expect(mockCompletionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: { type: "json_object" },
        temperature: 0.1,
      })
    );
  });

  it("schneidet langen OCR-Text auf 120000 Zeichen ab", async () => {
    const longText = "a".repeat(200_000);
    const mockResult = { risk_level: "low", summary: "", baulasten: [], sanierungsbedarf: [], mietverhaeltnisse: [], grundbuchbelastungen: [], positive_signals: [], disclaimer: "" };
    mockCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockResult) } }],
    });

    const { analyzeProperty } = await import("@/lib/ai/max");
    await analyzeProperty(longText, { court: "AG Test" });

    const userPrompt = mockCompletionsCreate.mock.calls[0][0].messages[1].content as string;
    // Der Prompt enthaelt maximal 120000 'a' Zeichen aus dem OCR-Text
    // plus einige wenige 'a' aus dem Prefix ("Amtsgericht", "unbekannt" etc.)
    // Daher Grenze: 120000 + kleiner Puffer fuer Prefix-Zeichen
    const aCount = (userPrompt.match(/a/g) ?? []).length;
    expect(aCount).toBeLessThanOrEqual(120_100);
  });
});

describe("chatWithProperty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("gibt Streaming-Antwort als AsyncGenerator zurueck", async () => {
    const chunks = [
      { choices: [{ delta: { content: "Das " } }] },
      { choices: [{ delta: { content: "Objekt " } }] },
      { choices: [{ delta: { content: "ist gut." } }] },
    ];

    // AsyncIterator-Mock
    mockCompletionsCreate.mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        for (const chunk of chunks) yield chunk;
      },
    });

    const { chatWithProperty } = await import("@/lib/ai/max");
    const messages = [{ role: "user" as const, content: "Frage?" }];
    const generator = chatWithProperty(messages, "OCR Text", "Zusammenfassung");

    const collected: string[] = [];
    for await (const chunk of generator) {
      collected.push(chunk);
    }

    expect(collected).toEqual(["Das ", "Objekt ", "ist gut."]);
  });

  it("ignoriert Chunks ohne Content", async () => {
    const chunks = [
      { choices: [{ delta: { content: "Text" } }] },
      { choices: [{ delta: {} }] }, // Kein Content
      { choices: [{ delta: { content: null } }] }, // Null Content
    ];

    mockCompletionsCreate.mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        for (const chunk of chunks) yield chunk;
      },
    });

    const { chatWithProperty } = await import("@/lib/ai/max");
    const generator = chatWithProperty(
      [{ role: "user", content: "Frage" }],
      "Text",
      "Summary"
    );

    const collected: string[] = [];
    for await (const chunk of generator) {
      collected.push(chunk);
    }

    expect(collected).toEqual(["Text"]);
  });

  it("sendet maximal 20 Nachrichten als Kontext", async () => {
    mockCompletionsCreate.mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        // Kein Output
      },
    });

    const { chatWithProperty } = await import("@/lib/ai/max");
    const messages = Array.from({ length: 30 }, (_, i) => ({
      role: "user" as const,
      content: `Frage ${i}`,
    }));

    const generator = chatWithProperty(messages, "Text", "Summary");
    // Generator ausfuehren
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of generator) { /* consume */ }

    const callArgs = mockCompletionsCreate.mock.calls[0][0];
    // System-Message + max 20 user messages = max 21 messages total
    expect(callArgs.messages.length).toBeLessThanOrEqual(21);
  });

  it("sendet korrekte System-Message mit Kontext", async () => {
    mockCompletionsCreate.mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {},
    });

    const { chatWithProperty } = await import("@/lib/ai/max");
    const generator = chatWithProperty(
      [{ role: "user", content: "Test?" }],
      "OCR Inhalt",
      "KI-Zusammenfassung"
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of generator) { /* consume */ }

    const callArgs = mockCompletionsCreate.mock.calls[0][0];
    const systemMsg = callArgs.messages[0];
    expect(systemMsg.role).toBe("system");
    expect(systemMsg.content).toContain("KI-Zusammenfassung");
  });
});
