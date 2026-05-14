import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { daysUntil, formatDateDE } from "@/lib/utils/date";

describe("daysUntil", () => {
  beforeEach(() => {
    // Fikses Datum: 2026-05-14 12:00:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("gibt null zurueck fuer null-Eingabe", () => {
    expect(daysUntil(null)).toBeNull();
  });

  it("gibt null zurueck fuer undefined-Eingabe", () => {
    expect(daysUntil(undefined)).toBeNull();
  });

  it("gibt null zurueck fuer leeren String", () => {
    expect(daysUntil("")).toBeNull();
  });

  it("gibt null zurueck fuer ungueltiges Datum", () => {
    expect(daysUntil("kein-datum")).toBeNull();
  });

  it("gibt 0 zurueck fuer vergangenes Datum", () => {
    expect(daysUntil("2026-05-01T00:00:00Z")).toBe(0);
  });

  it("gibt 0 zurueck fuer genau jetzt (kein zukuenftiges Datum)", () => {
    expect(daysUntil("2026-05-14T12:00:00Z")).toBe(0);
  });

  it("gibt 1 zurueck fuer morgen", () => {
    expect(daysUntil("2026-05-15T12:00:00Z")).toBe(1);
  });

  it("gibt 7 zurueck fuer naechste Woche", () => {
    expect(daysUntil("2026-05-21T12:00:00Z")).toBe(7);
  });

  it("gibt 30 zurueck fuer naechsten Monat", () => {
    expect(daysUntil("2026-06-13T12:00:00Z")).toBe(30);
  });

  it("rundet aufwaerts (nicht abwaerts)", () => {
    // Aktuell 12:00 Uhr, Termin 2026-05-15 um 00:01 Uhr (23h59m spaeter)
    // Math.ceil(23.99h / 24h) = 1
    expect(daysUntil("2026-05-15T00:01:00Z")).toBe(1);
  });

  it("berechnet 365 Tage korrekt", () => {
    expect(daysUntil("2027-05-14T12:00:00Z")).toBe(365);
  });
});

describe("formatDateDE", () => {
  it("gibt 'Termin offen' fuer null zurueck", () => {
    expect(formatDateDE(null)).toBe("Termin offen");
  });

  it("gibt 'Termin offen' fuer undefined zurueck", () => {
    expect(formatDateDE(undefined)).toBe("Termin offen");
  });

  it("gibt 'Termin offen' fuer leeren String zurueck", () => {
    expect(formatDateDE("")).toBe("Termin offen");
  });

  it("gibt 'Ungueltig' fuer nicht-parsebares Datum zurueck", () => {
    expect(formatDateDE("kein-datum")).toBe("Ungueltig");
  });

  it("formatiert ein gueltiges Datum als TT.MM.JJJJ", () => {
    // Datum in lokaler Zeit formatieren
    const result = formatDateDE("2026-12-31");
    // Deutsches Format beinhaltet Punkte
    expect(result).toMatch(/\d{1,2}\.\d{1,2}\.202\d/);
  });
});
