import { describe, it, expect } from "vitest";
import type {
  Plan,
  PropertyType,
  PropertyStatus,
  RiskLevel,
  OcrStatus,
  AnalysisStatus,
  CrawlerRunStatus,
  DocumentType,
  Profile,
  Property,
  PropertyAnalysis,
  SearchFilters,
  PropertyWithAnalysis,
  RiskSignal,
  ChatMessage,
} from "@/lib/types/database";

// Diese Tests validieren die Type-Strukturen durch Objekt-Konstruktion.
// TypeScript prueft die Typen zur Compile-Zeit; zur Laufzeit pruefen wir
// gueltigen Werte-Ranges fuer Union-Types.

describe("Plan-Typ", () => {
  it("akzeptiert 'free' als gueltigen Plan", () => {
    const plan: Plan = "free";
    expect(["free", "pro"]).toContain(plan);
  });

  it("akzeptiert 'pro' als gueltigen Plan", () => {
    const plan: Plan = "pro";
    expect(["free", "pro"]).toContain(plan);
  });
});

describe("PropertyType-Typ", () => {
  const validTypes: PropertyType[] = ["house", "apartment", "commercial", "land", "other"];

  it("alle PropertyTypes sind definiert", () => {
    expect(validTypes).toHaveLength(5);
  });

  it.each(validTypes)("'%s' ist ein gueltiger PropertyType", (type) => {
    expect(validTypes).toContain(type);
  });
});

describe("RiskLevel-Typ", () => {
  const validLevels: RiskLevel[] = ["low", "medium", "high", "critical"];

  it("alle RiskLevels sind definiert", () => {
    expect(validLevels).toHaveLength(4);
  });

  it.each(validLevels)("'%s' ist ein gueltiger RiskLevel", (level) => {
    expect(validLevels).toContain(level);
  });
});

describe("PropertyStatus-Typ", () => {
  const validStatuses: PropertyStatus[] = ["active", "withdrawn", "sold"];

  it("alle PropertyStatuses sind definiert", () => {
    expect(validStatuses).toHaveLength(3);
  });
});

describe("CrawlerRunStatus-Typ", () => {
  const validStatuses: CrawlerRunStatus[] = ["running", "completed", "failed"];

  it("alle CrawlerRunStatuses sind definiert", () => {
    expect(validStatuses).toHaveLength(3);
  });

  it("hat 'completed' statt 'success' (wichtige Sicherung!)", () => {
    expect(validStatuses).toContain("completed");
    expect(validStatuses).not.toContain("success");
  });
});

describe("OcrStatus und AnalysisStatus", () => {
  it("OcrStatus hat vier Zustaende", () => {
    const statuses: OcrStatus[] = ["pending", "processing", "done", "failed"];
    expect(statuses).toHaveLength(4);
  });

  it("AnalysisStatus hat vier Zustaende", () => {
    const statuses: AnalysisStatus[] = ["pending", "processing", "done", "failed"];
    expect(statuses).toHaveLength(4);
  });
});

describe("DocumentType-Typ", () => {
  const validTypes: DocumentType[] = ["gutachten", "beschluss", "sonstig"];

  it("alle DocumentTypes sind definiert", () => {
    expect(validTypes).toHaveLength(3);
  });
});

describe("Profile-Interface", () => {
  it("kann ein vollstaendiges Profil-Objekt erstellen", () => {
    const profile: Profile = {
      id: "user-123",
      email: "test@example.com",
      full_name: "Max Mustermann",
      plan: "free",
      user_type: "private",
      is_admin: false,
      phone: null,
      company_name: null,
      email_notifications: true,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      subscription_status: null,
      monthly_search_count: 3,
      monthly_search_reset_at: "2026-05-01T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
    };

    expect(profile.id).toBe("user-123");
    expect(profile.plan).toBe("free");
    expect(profile.is_admin).toBe(false);
    expect(profile.monthly_search_count).toBe(3);
  });
});

describe("Property-Interface", () => {
  it("kann ein Immobilien-Objekt erstellen", () => {
    const property: Property = {
      id: "prop-abc",
      zvg_id: "zvg-001",
      court: "AG Muenchen",
      court_file_number: "123/26",
      auction_date: "2026-07-15T10:00:00Z",
      property_type: "house",
      address: "Musterstrasse 1",
      city: "Muenchen",
      zip_code: "80539",
      state: "Bayern",
      land_abk: "by",
      objekt_lage: "Einfamilienhaus, Musterstrasse 1, 80539 Muenchen",
      lat: 48.1351,
      lng: 11.5820,
      market_value: 450000,
      minimum_bid: 225000,
      document_urls: ["https://example.com/doc.pdf"],
      art_versteigerung: "Versteigerung im Wege der Zwangsvollstreckung",
      grundbuch: "Muenchen Blatt 1234",
      beschreibung: "Einfamilienhaus mit Garten",
      versteigerungsort: "AG Muenchen, Saal 101",
      glaeubigerinfo: null,
      geoserver_url: null,
      status: "active",
      last_crawled_at: "2026-05-14T06:00:00Z",
      created_at: "2026-05-10T00:00:00Z",
      updated_at: "2026-05-14T06:00:00Z",
    };

    expect(property.court).toBe("AG Muenchen");
    expect(property.property_type).toBe("house");
    expect(property.market_value).toBe(450000);
  });
});

describe("RiskSignal-Interface", () => {
  it("kann ein Risikosignal erstellen", () => {
    const signal: RiskSignal = {
      description: "Grundschuld vorhanden",
      severity: "high",
      text_excerpt: "Im Gutachten steht...",
      cost_estimate_eur: "50000",
      type: "grundschuld",
      amount_eur: 50000,
    };

    expect(signal.severity).toBe("high");
    expect(["low", "medium", "high"]).toContain(signal.severity);
  });
});

describe("ChatMessage-Interface", () => {
  it("kann User-Nachrichten erstellen", () => {
    const msg: ChatMessage = {
      role: "user",
      content: "Was sind die Risiken?",
      created_at: "2026-05-14T12:00:00Z",
    };
    expect(msg.role).toBe("user");
  });

  it("kann Assistant-Nachrichten erstellen", () => {
    const msg: ChatMessage = {
      role: "assistant",
      content: "Die Hauptrisiken sind...",
      created_at: "2026-05-14T12:00:01Z",
    };
    expect(msg.role).toBe("assistant");
  });
});

describe("SearchFilters-Interface", () => {
  it("kann leere Suchfilter erstellen", () => {
    const filters: SearchFilters = {};
    expect(filters).toEqual({});
  });

  it("kann vollstaendige Suchfilter erstellen", () => {
    const filters: SearchFilters = {
      zip_code: "80539",
      radius_km: 25,
      property_types: ["house", "apartment"],
      auction_date_from: "2026-06-01",
      auction_date_to: "2026-12-31",
      market_value_min: 100000,
      market_value_max: 500000,
      risk_level: ["low", "medium"],
    };

    expect(filters.zip_code).toBe("80539");
    expect(filters.property_types).toContain("house");
    expect(filters.risk_level).toContain("low");
  });
});

describe("PropertyWithAnalysis-Interface", () => {
  it("kann Property ohne Analyse erstellen", () => {
    const prop: PropertyWithAnalysis = {
      id: "p1",
      zvg_id: "z1",
      court: "AG Test",
      court_file_number: null,
      auction_date: null,
      property_type: null,
      address: null,
      city: "Berlin",
      zip_code: "10115",
      state: null,
      land_abk: null,
      objekt_lage: null,
      lat: null,
      lng: null,
      market_value: null,
      minimum_bid: null,
      document_urls: [],
      art_versteigerung: null,
      grundbuch: null,
      beschreibung: null,
      versteigerungsort: null,
      glaeubigerinfo: null,
      geoserver_url: null,
      status: "active",
      last_crawled_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      property_analyses: null,
    };

    expect(prop.property_analyses).toBeNull();
  });

  it("akzeptiert undefined fuer property_analyses", () => {
    const prop: PropertyWithAnalysis = {
      id: "p2",
      zvg_id: "z2",
      court: "AG Test",
      court_file_number: null,
      auction_date: null,
      property_type: "apartment",
      address: null,
      city: "Hamburg",
      zip_code: "20095",
      state: null,
      land_abk: null,
      objekt_lage: null,
      lat: null,
      lng: null,
      market_value: 200000,
      minimum_bid: null,
      document_urls: [],
      art_versteigerung: null,
      grundbuch: null,
      beschreibung: null,
      versteigerungsort: null,
      glaeubigerinfo: null,
      geoserver_url: null,
      status: "active",
      last_crawled_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    expect(prop.property_analyses).toBeUndefined();
  });
});

describe("PropertyAnalysis-Interface", () => {
  it("kann eine vollstaendige Analyse erstellen", () => {
    const analysis: PropertyAnalysis = {
      id: "a1",
      property_id: "p1",
      risk_level: "medium",
      risk_signals: {
        baulasten: [],
        sanierungsbedarf: [{ description: "Dach", severity: "medium", text_excerpt: "..." }],
        mietverhaeltnisse: [],
        grundbuchbelastungen: [],
        positive_signals: [],
        disclaimer: "KI-Analyse - keine Haftung.",
      },
      summary: "Mittleres Risikoobjekt",
      analysis_model: "max-default",
      prompt_version: "v1",
      analysis_status: "done",
      error_message: null,
      analyzed_at: "2026-05-14T06:00:00Z",
      created_at: "2026-05-14T06:00:00Z",
    };

    expect(analysis.risk_level).toBe("medium");
    expect(analysis.analysis_status).toBe("done");
    expect(analysis.risk_signals.disclaimer).toContain("KI-Analyse");
  });
});
