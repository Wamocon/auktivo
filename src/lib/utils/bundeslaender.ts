/**
 * Liste aller 16 deutschen Bundeslaender mit ZVG-Abkuerzungen.
 * Wird von Crawler und Client-Komponenten gemeinsam genutzt.
 */
export const BUNDESLAENDER = [
  { short: "bw", name: "Baden-W\u00fcrttemberg" },
  { short: "by", name: "Bayern" },
  { short: "be", name: "Berlin" },
  { short: "bb", name: "Brandenburg" },
  { short: "hb", name: "Bremen" },
  { short: "hh", name: "Hamburg" },
  { short: "he", name: "Hessen" },
  { short: "mv", name: "Mecklenburg-Vorpommern" },
  { short: "ni", name: "Niedersachsen" },
  { short: "nw", name: "Nordrhein-Westfalen" },
  { short: "rp", name: "Rheinland-Pfalz" },
  { short: "sl", name: "Saarland" },
  { short: "sn", name: "Sachsen" },
  { short: "st", name: "Sachsen-Anhalt" },
  { short: "sh", name: "Schleswig-Holstein" },
  { short: "th", name: "Th\u00fcringen" },
] as const;

export type BundeslandShort = (typeof BUNDESLAENDER)[number]["short"];
