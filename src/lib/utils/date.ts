/**
 * Reine Datums-Hilfsfunktionen
 * Ausgelagert aus search-client.tsx fuer einfache Testbarkeit
 */

/**
 * Berechnet die verbleibenden Tage bis zu einem gegebenen Datum.
 * Gibt null zurueck wenn kein Datum vorhanden.
 * Gibt 0 zurueck wenn das Datum bereits vergangen ist.
 */
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const diff = target.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

/**
 * Formatiert ein Datum als deutsches Datumsformat (TT.MM.JJJJ)
 */
export function formatDateDE(dateStr: string | null | undefined): string {
  if (!dateStr) return "Termin offen";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Ungueltig";
  return date.toLocaleDateString("de-DE");
}
