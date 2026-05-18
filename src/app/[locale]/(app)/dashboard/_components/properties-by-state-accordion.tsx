"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MapPin,
  X,
  Home,
  Building2,
  Landmark,
  Layers,
} from "lucide-react";
import type { Property, PropertyType } from "@/lib/types/database";

interface PropertyCardData {
  id: string;
  city: string | null;
  zip_code: string;
  state: string | null;
  court: string;
  property_type: PropertyType | null;
  address: string | null;
  objekt_lage: string | null;
  market_value: number | null;
  minimum_bid: number | null;
  auction_date: string | null;
  court_file_number: string | null;
  status: Property["status"];
}

interface Props {
  propertiesByState: Record<string, PropertyCardData[]>;
}

const TYPE_LABELS: Record<PropertyType, string> = {
  house: "Haus",
  apartment: "Wohnung",
  commercial: "Gewerbe",
  land: "Grundstück",
  other: "Objekt",
};

const TYPE_ICONS: Record<PropertyType, React.ElementType> = {
  house: Home,
  apartment: Building2,
  commercial: Landmark,
  land: Layers,
  other: Layers,
};

function formatCurrency(val: number | null): string {
  if (val == null) return "k. A.";
  return `${val.toLocaleString("de-DE")} EUR`;
}

function formatDate(val: string | null): string {
  if (!val) return "Termin offen";
  return new Date(val).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PropertiesByStateAccordion({ propertiesByState }: Props) {
  const [openStates, setOpenStates] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<PropertyCardData | null>(null);

  const states = Object.keys(propertiesByState).sort((a, b) => a.localeCompare(b, "de"));
  const total = Object.values(propertiesByState).reduce((s, arr) => s + arr.length, 0);

  function toggleState(state: string) {
    setOpenStates((prev) => {
      const next = new Set(prev);
      if (next.has(state)) next.delete(state);
      else next.add(state);
      return next;
    });
  }

  return (
    <>
      {/* Kopfzeile */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Alle Objekte im System
        </h2>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {total} gesamt
        </span>
      </div>

      {/* Akkordeon */}
      <div className="flex flex-col gap-2">
        {states.map((state) => {
          const props = propertiesByState[state];
          const isOpen = openStates.has(state);
          return (
            <div
              key={state}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            >
              {/* Bundesland-Header */}
              <button
                onClick={() => toggleState(state)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <span className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
                  <MapPin className="h-4 w-4 shrink-0 text-zinc-400" />
                  {state}
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {props.length}
                  </span>
                </span>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                )}
              </button>

              {/* Objekt-Liste */}
              {isOpen && (
                <div className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
                  {props.map((p) => {
                    const Icon = TYPE_ICONS[p.property_type ?? "other"];
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelected(p)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                              {p.city ?? "–"}{p.zip_code ? `, ${p.zip_code}` : ""}
                            </p>
                            <p className="truncate text-xs text-zinc-500">{p.court}</p>
                          </div>
                        </div>
                        <div className="ml-4 shrink-0 text-right">
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            {formatCurrency(p.market_value)}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {formatDate(p.auction_date)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {states.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Noch keine Objekte im System.
          </div>
        )}
      </div>

      {/* Detail-Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal-Header */}
            <div className="flex items-start justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {TYPE_LABELS[selected.property_type ?? "other"]}
                  </span>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${selected.status === "active" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"}`}>
                    {selected.status === "active" ? "Aktiv" : selected.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {selected.city ?? "–"}{selected.zip_code ? `, ${selected.zip_code}` : ""}
                </h3>
                {selected.state && (
                  <p className="text-xs text-zinc-500">{selected.state}</p>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Schliessen"
                className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal-Body */}
            <div className="p-5">
              {/* Adresse */}
              {(selected.objekt_lage ?? selected.address) && (
                <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
                  {selected.objekt_lage ?? selected.address}
                </p>
              )}

              {/* Daten-Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                  <p className="text-xs text-zinc-500">Amtsgericht</p>
                  <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {selected.court}
                  </p>
                </div>
                {selected.court_file_number && (
                  <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                    <p className="text-xs text-zinc-500">Aktenzeichen</p>
                    <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {selected.court_file_number}
                    </p>
                  </div>
                )}
                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                  <p className="text-xs text-zinc-500">Verkehrswert</p>
                  <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(selected.market_value)}
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                  <p className="text-xs text-zinc-500">Mindestgebot (ca.)</p>
                  <p className="mt-0.5 text-sm font-semibold text-blue-600">
                    {selected.minimum_bid
                      ? formatCurrency(selected.minimum_bid)
                      : selected.market_value
                      ? formatCurrency(Math.round(selected.market_value * 0.5))
                      : "k. A."}
                  </p>
                </div>
                <div className="col-span-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                  <p className="text-xs text-zinc-500">Versteigerungstermin</p>
                  <p className={`mt-0.5 text-sm font-semibold ${selected.auction_date ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400"}`}>
                    {formatDate(selected.auction_date)}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal-Footer */}
            <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Schließen
              </button>
              <Link
                href={{ pathname: "/objekte/[id]", params: { id: selected.id } }}
                className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                onClick={() => setSelected(null)}
              >
                Detailseite öffnen
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
