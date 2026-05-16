export type CrawlerPropertyType =
  | "house"
  | "apartment"
  | "commercial"
  | "land"
  | "other";

export interface ZvgLand {
  short: string;
  name: string;
}

export interface ZvgEntry {
  /** Eindeutige ID: "{LAND_ABK_UPPER}-{numeric_zvg_id}", z.B. "BY-12345" */
  zvg_id: string;
  land_abk: string;
  aktenzeichen: string | null;
  amtsgericht: string;
  objekt_lage: string | null;
  adresse: string | null;
  plz: string | null;
  ort: string | null;
  state: string | null;
  verkehrswert_eur: number | null;
  termin: Date | null;
  document_urls: string[];
  property_type: CrawlerPropertyType;
}

export interface CrawlerRunResult {
  run_id: string;
  scraped: number;
  inserted: number;
  skipped: number;
  errors: number;
  duration_ms: number;
}
