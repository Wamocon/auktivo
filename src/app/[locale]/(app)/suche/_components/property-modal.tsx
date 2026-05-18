"use client";

import { X, MapPin, Building2, Calendar, ExternalLink, TrendingDown, FileText, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { PropertyWithAnalysis } from "@/lib/types/database";
import { RiskBadge } from "@/components/ui/risk-badge";
import { daysUntil } from "@/lib/utils/date";

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  house: "Haus",
  apartment: "Wohnung",
  commercial: "Gewerbe",
  land: "Grundstuck",
  other: "Sonstiges",
};

interface PropertyModalProps {
  property: PropertyWithAnalysis;
  locale: string;
  onClose: () => void;
}

export function PropertyModal({ property: p, locale, onClose }: PropertyModalProps) {
  const t = useTranslations("property");
  const days = daysUntil(p.auction_date ?? null);

  const minBid = p.minimum_bid ?? (p.market_value ? Math.round(p.market_value * 0.5) : null);
  const discount =
    p.market_value && minBid
      ? Math.round(((p.market_value - minBid) / p.market_value) * 100)
      : null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Risk-farbiger Balken oben */}
        <div
          className={`h-1.5 w-full rounded-t-2xl ${
            p.property_analyses?.risk_level === "critical"
              ? "bg-red-500"
              : p.property_analyses?.risk_level === "high"
                ? "bg-orange-400"
                : p.property_analyses?.risk_level === "medium"
                  ? "bg-amber-400"
                  : p.property_analyses?.risk_level === "low"
                    ? "bg-green-400"
                    : "bg-zinc-200 dark:bg-zinc-700"
          }`}
        />

        {/* Schliessen-Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Schliessen"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="mb-4 flex flex-wrap items-start gap-2">
            <span className="flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              <Building2 className="h-3 w-3" />
              {PROPERTY_TYPE_LABELS[p.property_type ?? "other"] ?? "Objekt"}
            </span>
            {p.property_analyses?.risk_level && (
              <RiskBadge level={p.property_analyses.risk_level} />
            )}
            {days !== null && days <= 7 && (
              <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-400">
                Termin in {days} Tagen
              </span>
            )}
          </div>

          <h2 className="mb-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {p.address ? `${p.address}` : p.city}
          </h2>
          <p className="mb-4 flex items-center gap-1 text-sm text-zinc-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {p.zip_code} {p.city}
            {p.state ? `, ${p.state}` : ""}
          </p>

          {/* Kurzbeschreibung (objekt_lage) */}
          {p.objekt_lage && (
            <div className="mb-4 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              <p className="line-clamp-3">{p.objekt_lage}</p>
            </div>
          )}

          {/* Zahlen */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800">
              <p className="mb-0.5 text-xs text-zinc-500">{t("market_value")}</p>
              <p className="text-base font-black text-zinc-900 dark:text-zinc-50">
                {p.market_value ? `${p.market_value.toLocaleString("de-DE")} EUR` : "k. A."}
              </p>
            </div>
            <div className="rounded-xl bg-brand-50 p-3 dark:bg-brand-900/20">
              <p className="mb-0.5 text-xs text-brand-600 dark:text-brand-400">Mindestgebot (ca.)</p>
              <p className="text-base font-black text-brand-700 dark:text-brand-300">
                {minBid ? `${minBid.toLocaleString("de-DE")} EUR` : "k. A."}
              </p>
              {discount !== null && (
                <p className="mt-0.5 flex items-center gap-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
                  <TrendingDown className="h-2.5 w-2.5" /> {discount}% unter Verkehrswert
                </p>
              )}
            </div>
          </div>

          {/* Gericht & Termin */}
          <div className="mb-4 flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <Info className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Amtsgericht:</span>
              {p.court}
              {p.court_file_number && (
                <span className="text-zinc-400">&middot; Az. {p.court_file_number}</span>
              )}
            </div>
            {p.auction_date && (
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Termin:</span>
                {new Date(p.auction_date).toLocaleDateString("de-DE", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {days !== null && (
                  <span
                    className={`ml-auto rounded-md px-2 py-0.5 text-xs font-semibold ${
                      days <= 7
                        ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        : days <= 21
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    in {days}d
                  </span>
                )}
              </div>
            )}
            {p.document_urls.length > 0 && (
              <div className="flex items-center gap-2 text-zinc-500">
                <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                {p.document_urls.length} Dokument{p.document_urls.length !== 1 ? "e" : ""} verfugbar
              </div>
            )}
          </div>

          {/* Aktions-Buttons */}
          <div className="flex gap-3">
            <Link
              href={{ pathname: "/objekte/[id]", params: { id: p.id } }}
              locale={locale}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-zinc-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Details ansehen
            </Link>
            <a
              href={`https://www.zvg-portal.de`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-full border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ExternalLink className="h-3.5 w-3.5" /> ZVG-Portal
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
