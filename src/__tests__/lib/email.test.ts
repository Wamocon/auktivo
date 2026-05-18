import { describe, it, expect, vi, beforeEach } from "vitest";

// Resend Mock vor dem Import hoisten
const sendEmailMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ id: "mock-email-id", error: null })
);

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendEmailMock };
  },
}));

import { sendSearchAlertNotification, sendCrawlerErrorNotification } from "@/lib/email";
import type { Property } from "@/lib/types/database";

// ---------------------------------------------------------------------------
// Test-Fixture
// ---------------------------------------------------------------------------

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: "prop-test-1",
    zvg_id: "zvg-1",
    court: "AG Frankfurt",
    court_file_number: "1 K 100/26",
    auction_date: "2026-08-15",
    property_type: "house",
    address: "Musterstraße 1",
    city: "Frankfurt am Main",
    zip_code: "60311",
    state: "Hessen",
    land_abk: "HE",
    objekt_lage: null,
    lat: 50.1109,
    lng: 8.6821,
    market_value: 250000,
    minimum_bid: 125000,
    document_urls: [],
    art_versteigerung: null,
    grundbuch: null,
    beschreibung: null,
    versteigerungsort: null,
    glaeubigerinfo: null,
    geoserver_url: null,
    status: "active",
    last_crawled_at: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-17T00:00:00Z",
    ...overrides,
  } as Property;
}

const mockAlert = { id: "alert-1", name: "Frankfurt Wohnungen" };

// ---------------------------------------------------------------------------
// sendSearchAlertNotification
// ---------------------------------------------------------------------------

describe("sendSearchAlertNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RESEND_FROM_EMAIL", "noreply@auktivo.de");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  });

  it("gibt fruehzeitig zurueck wenn properties leer ist (kein Email-Versand)", async () => {
    await sendSearchAlertNotification({ to: "user@test.de", alert: mockAlert, properties: [] });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sendet E-Mail wenn Objekte vorhanden sind", async () => {
    await sendSearchAlertNotification({
      to: "user@test.de",
      alert: mockAlert,
      properties: [makeProperty()],
    });
    expect(sendEmailMock).toHaveBeenCalledOnce();
    const args = sendEmailMock.mock.calls[0][0];
    expect(args.to).toBe("user@test.de");
    expect(args.html).toContain("Auktivo");
  });

  it("nutzt Singular im Betreff bei genau 1 Objekt", async () => {
    await sendSearchAlertNotification({
      to: "x@x.de",
      alert: mockAlert,
      properties: [makeProperty()],
    });
    const subject: string = sendEmailMock.mock.calls[0][0].subject;
    expect(subject).toMatch(/1 neues Objekt/);
  });

  it("nutzt Plural im Betreff bei mehreren Objekten", async () => {
    await sendSearchAlertNotification({
      to: "x@x.de",
      alert: mockAlert,
      properties: [makeProperty(), makeProperty({ id: "prop-2", zvg_id: "zvg-2" })],
    });
    const subject: string = sendEmailMock.mock.calls[0][0].subject;
    expect(subject).toMatch(/2 neue Objekte/);
  });

  it("zeigt moreHint an wenn mehr als 10 Objekte vorhanden sind", async () => {
    const props = Array.from({ length: 12 }, (_, i) =>
      makeProperty({ id: `prop-${i}`, zvg_id: `zvg-${i}` })
    );
    await sendSearchAlertNotification({ to: "x@x.de", alert: mockAlert, properties: props });
    const html: string = sendEmailMock.mock.calls[0][0].html;
    expect(html).toContain("2 weitere Objekte");
  });

  it("zeigt keinen moreHint bei 10 oder weniger Objekten", async () => {
    const props = Array.from({ length: 10 }, (_, i) =>
      makeProperty({ id: `prop-${i}`, zvg_id: `zvg-${i}` })
    );
    await sendSearchAlertNotification({ to: "x@x.de", alert: mockAlert, properties: props });
    const html: string = sendEmailMock.mock.calls[0][0].html;
    expect(html).not.toContain("weitere Objekte");
  });

  it("formatiert null market_value als 'k. A.'", async () => {
    await sendSearchAlertNotification({
      to: "x@x.de",
      alert: mockAlert,
      properties: [makeProperty({ market_value: null })],
    });
    const html: string = sendEmailMock.mock.calls[0][0].html;
    expect(html).toContain("k. A.");
  });

  it("formatiert null auction_date als 'k. A.'", async () => {
    await sendSearchAlertNotification({
      to: "x@x.de",
      alert: mockAlert,
      properties: [makeProperty({ auction_date: null })],
    });
    const html: string = sendEmailMock.mock.calls[0][0].html;
    expect(html).toContain("k. A.");
  });

  it("verwendet 'Adresse unbekannt' fuer null address", async () => {
    await sendSearchAlertNotification({
      to: "x@x.de",
      alert: mockAlert,
      properties: [makeProperty({ address: null })],
    });
    const html: string = sendEmailMock.mock.calls[0][0].html;
    expect(html).toContain("Adresse unbekannt");
  });

  it("behandelt null city korrekt", async () => {
    await sendSearchAlertNotification({
      to: "x@x.de",
      alert: mockAlert,
      properties: [makeProperty({ city: null })],
    });
    expect(sendEmailMock).toHaveBeenCalledOnce();
  });

  it.each([
    ["house", "Haus"],
    ["apartment", "Wohnung"],
    ["commercial", "Gewerbe"],
    ["land", "Grundstück"],
    ["other", "Sonstiges"],
  ])("zeigt Objekttyp '%s' als '%s' an", async (type, label) => {
    await sendSearchAlertNotification({
      to: "x@x.de",
      alert: mockAlert,
      properties: [makeProperty({ property_type: type as Property["property_type"] })],
    });
    const html: string = sendEmailMock.mock.calls[0][0].html;
    expect(html).toContain(label);
  });

  it("gibt 'k. A.' fuer null property_type zurueck", async () => {
    await sendSearchAlertNotification({
      to: "x@x.de",
      alert: mockAlert,
      properties: [makeProperty({ property_type: null })],
    });
    const html: string = sendEmailMock.mock.calls[0][0].html;
    expect(html).toContain("k. A.");
  });

  it("enthält Alert-Name im Betreff und HTML", async () => {
    await sendSearchAlertNotification({
      to: "x@x.de",
      alert: { id: "a-1", name: "Mein Alarm" },
      properties: [makeProperty()],
    });
    const call = sendEmailMock.mock.calls[0][0];
    expect(call.subject).toContain("Mein Alarm");
    expect(call.html).toContain("Mein Alarm");
  });
});

// ---------------------------------------------------------------------------
// sendCrawlerErrorNotification
// ---------------------------------------------------------------------------

describe("sendCrawlerErrorNotification", () => {
  const stats = { scraped: 100, inserted: 50, errors: 50, duration_ms: 12500 };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gibt fruehzeitig zurueck wenn RESEND_FROM_EMAIL nicht gesetzt ist", async () => {
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    await sendCrawlerErrorNotification({ errorMessage: "Fehler", stats });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sendet Fehler-E-Mail an Admin wenn RESEND_FROM_EMAIL gesetzt ist", async () => {
    vi.stubEnv("RESEND_FROM_EMAIL", "admin@auktivo.de");
    await sendCrawlerErrorNotification({ errorMessage: "Verbindung fehlgeschlagen", stats });
    expect(sendEmailMock).toHaveBeenCalledOnce();
    const args = sendEmailMock.mock.calls[0][0];
    expect(args.to).toBe("admin@auktivo.de");
  });

  it("enthält Fehlermeldung im HTML-Body", async () => {
    vi.stubEnv("RESEND_FROM_EMAIL", "admin@auktivo.de");
    await sendCrawlerErrorNotification({ errorMessage: "Timeout nach 30s", stats });
    const html: string = sendEmailMock.mock.calls[0][0].html;
    expect(html).toContain("Timeout nach 30s");
  });

  it("zeigt Statistiken im HTML an", async () => {
    vi.stubEnv("RESEND_FROM_EMAIL", "admin@auktivo.de");
    await sendCrawlerErrorNotification({ errorMessage: "Err", stats });
    const html: string = sendEmailMock.mock.calls[0][0].html;
    expect(html).toContain("100");   // scraped
    expect(html).toContain("50");    // inserted / errors
    expect(html).toContain("13s");   // duration_ms 12500 -> 13s (Math.round)
  });

  it("enthält [Auktivo] im Betreff", async () => {
    vi.stubEnv("RESEND_FROM_EMAIL", "admin@auktivo.de");
    await sendCrawlerErrorNotification({ errorMessage: "X", stats });
    expect(sendEmailMock.mock.calls[0][0].subject).toContain("[Auktivo]");
  });
});
