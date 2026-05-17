export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Plan = "free" | "pro";
export type UserType = "private" | "business";
export type PropertyType = "house" | "apartment" | "commercial" | "land" | "other";
export type PropertyStatus = "active" | "withdrawn" | "sold";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type OcrStatus = "pending" | "processing" | "done" | "failed";
export type AnalysisStatus = "pending" | "processing" | "done" | "failed";
export type CrawlerRunStatus = "running" | "completed" | "failed";
export type DocumentType = "gutachten" | "beschluss" | "sonstig";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  plan: Plan;
  user_type: UserType;
  is_admin: boolean;
  phone: string | null;
  company_name: string | null;
  email_notifications: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  monthly_search_count: number;
  monthly_search_reset_at: string;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  zvg_id: string;
  court: string;
  court_file_number: string | null;
  auction_date: string | null;
  property_type: PropertyType | null;
  address: string | null;
  city: string | null;
  zip_code: string;
  state: string | null;
  land_abk: string | null;
  objekt_lage: string | null;
  lat: number | null;
  lng: number | null;
  market_value: number | null;
  minimum_bid: number | null;
  document_urls: string[];
  art_versteigerung: string | null;
  grundbuch: string | null;
  beschreibung: string | null;
  versteigerungsort: string | null;
  glaeubigerinfo: string | null;
  geoserver_url: string | null;
  status: PropertyStatus;
  last_crawled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyDocument {
  id: string;
  property_id: string;
  original_url: string;
  storage_path: string | null;
  document_type: DocumentType | null;
  ocr_text: string | null;
  ocr_status: OcrStatus;
  ocr_confidence: number | null;
  file_size_bytes: number | null;
  page_count: number | null;
  processed_at: string | null;
  created_at: string;
}

export interface RiskSignal {
  description: string;
  severity: "low" | "medium" | "high";
  text_excerpt?: string;
  cost_estimate_eur?: string;
  type?: string;
  amount_eur?: number;
}

export interface RiskSignals {
  baulasten: RiskSignal[];
  sanierungsbedarf: RiskSignal[];
  mietverhaeltnisse: RiskSignal[];
  grundbuchbelastungen: RiskSignal[];
  positive_signals: Array<{ description: string }>;
  disclaimer: string;
}

export interface PropertyAnalysis {
  id: string;
  property_id: string;
  risk_level: RiskLevel | null;
  risk_signals: RiskSignals;
  summary: string | null;
  analysis_model: string | null;
  prompt_version: string;
  analysis_status: AnalysisStatus;
  error_message: string | null;
  analyzed_at: string | null;
  created_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  property_id: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  property_id: string;
  notes: string | null;
  created_at: string;
}

export interface SearchAlert {
  id: string;
  user_id: string;
  name: string;
  zip_codes: string[];
  radius_km: number;
  property_types: PropertyType[];
  min_market_value: number | null;
  max_market_value: number | null;
  notification_email: boolean;
  notification_push: boolean;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

export interface CrawlerRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: CrawlerRunStatus;
  new_properties_count: number;
  updated_properties_count: number;
  failed_urls: string[];
  error_message: string | null;
}

export interface SearchFilters {
  zip_code?: string;
  radius_km?: number;
  property_types?: PropertyType[];
  auction_date_from?: string;
  auction_date_to?: string;
  market_value_min?: number;
  market_value_max?: number;
  risk_level?: RiskLevel[];
}

export interface PropertyWithAnalysis extends Property {
  property_analyses?: PropertyAnalysis | null;
}
