import { describe, it, expect } from "vitest";
import { BUNDESLAENDER } from "@/lib/utils/bundeslaender";

describe("BUNDESLAENDER", () => {
  it("enthaelt genau 16 Bundeslaender", () => {
    expect(BUNDESLAENDER).toHaveLength(16);
  });

  it("jedes Bundesland hat short und name", () => {
    for (const bl of BUNDESLAENDER) {
      expect(bl.short).toBeTruthy();
      expect(bl.name).toBeTruthy();
    }
  });

  it("short-Codes sind zweistellig und lowercase", () => {
    for (const bl of BUNDESLAENDER) {
      expect(bl.short).toHaveLength(2);
      expect(bl.short).toBe(bl.short.toLowerCase());
    }
  });

  it("enthaelt Bayern (by)", () => {
    const bayern = BUNDESLAENDER.find((bl) => bl.short === "by");
    expect(bayern?.name).toBe("Bayern");
  });

  it("enthaelt Nordrhein-Westfalen (nw)", () => {
    const nw = BUNDESLAENDER.find((bl) => bl.short === "nw");
    expect(nw?.name).toBe("Nordrhein-Westfalen");
  });

  it("short-Codes sind eindeutig", () => {
    const shorts = BUNDESLAENDER.map((bl) => bl.short);
    const unique = new Set(shorts);
    expect(unique.size).toBe(shorts.length);
  });
});
