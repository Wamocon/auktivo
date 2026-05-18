import { Resend } from "resend";
import type { Property, SearchAlert } from "@/lib/types/database";

// Lazy initialization - wirft nicht beim Modul-Load wenn RESEND_API_KEY fehlt
let _resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!_resendClient) {
    _resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return _resendClient;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@auktivo.de";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://auktivo.de";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatCurrency(value: number | null): string {
  if (value === null) return "k. A.";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return "k. A.";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

function propertyTypeLabel(type: string | null): string {
  const map: Record<string, string> = {
    house: "Haus",
    apartment: "Wohnung",
    commercial: "Gewerbe",
    land: "Grundstück",
    other: "Sonstiges",
  };
  return type ? (map[type] ?? type) : "k. A.";
}

// ---------------------------------------------------------------------------
// Search Alert Notification
// ---------------------------------------------------------------------------

export async function sendSearchAlertNotification(params: {
  to: string;
  alert: Pick<SearchAlert, "name" | "id">;
  properties: Property[];
}): Promise<void> {
  const { to, alert, properties } = params;
  if (!properties.length) return;

  const propertyRows = properties
    .slice(0, 10)
    .map(
      (p) => `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;">
            <strong>${p.address ?? "Adresse unbekannt"}</strong><br/>
            <span style="color:#666;font-size:13px;">${p.zip_code} ${p.city ?? ""} &bull; ${propertyTypeLabel(p.property_type)}</span>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;white-space:nowrap;">
            ${formatCurrency(p.market_value)}<br/>
            <span style="color:#666;font-size:12px;">Termin: ${formatDate(p.auction_date)}</span>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:center;">
            <a href="${APP_URL}/de/app/properties/${p.id}"
               style="background:#2563eb;color:#fff;text-decoration:none;padding:5px 12px;border-radius:6px;font-size:13px;">
              Details
            </a>
          </td>
        </tr>`
    )
    .join("");

  const moreHint =
    properties.length > 10
      ? `<p style="color:#666;font-size:13px;text-align:center;">… und ${properties.length - 10} weitere Objekte</p>`
      : "";

  const html = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:system-ui,Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#2563eb;padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Auktivo</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:14px;">Neue Treffer für deinen Suchalarm</p>
    </div>
    <div style="padding:28px 32px;">
      <h2 style="font-size:18px;margin:0 0 4px;color:#111;">
        ${properties.length} neue${properties.length === 1 ? "s Objekt" : " Objekte"} – ${alert.name}
      </h2>
      <p style="color:#555;font-size:14px;margin:0 0 24px;">
        Unser Crawler hat ${properties.length === 1 ? "ein Objekt" : `${properties.length} Objekte`} gefunden, die deinem Suchalarm entsprechen.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px;font-size:12px;color:#999;font-weight:500;border-bottom:2px solid #eee;">Objekt</th>
            <th style="text-align:right;padding:8px;font-size:12px;color:#999;font-weight:500;border-bottom:2px solid #eee;">Verkehrswert</th>
            <th style="padding:8px;border-bottom:2px solid #eee;"></th>
          </tr>
        </thead>
        <tbody>${propertyRows}</tbody>
      </table>
      ${moreHint}
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_URL}/de/app/alerts"
           style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">
          Alle Treffer ansehen
        </a>
      </div>
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f0f0f0;text-align:center;">
      <p style="color:#aaa;font-size:12px;margin:0;">
        Du erhältst diese E-Mail, weil du den Suchalarm <em>${alert.name}</em> aktiviert hast.<br/>
        <a href="${APP_URL}/de/app/alerts" style="color:#2563eb;">Suchalarm verwalten</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  await getResendClient().emails.send({
    from: FROM,
    to,
    subject: `${properties.length} neue${properties.length === 1 ? "s Objekt" : " Objekte"} – Suchalarm „${alert.name}"`,
    html,
  });
}

// ---------------------------------------------------------------------------
// Admin Crawler Error Notification
// ---------------------------------------------------------------------------

export async function sendCrawlerErrorNotification(params: {
  errorMessage: string;
  stats: { scraped: number; inserted: number; errors: number; duration_ms: number };
}): Promise<void> {
  const adminEmail = process.env.RESEND_FROM_EMAIL;
  if (!adminEmail) return;

  const { errorMessage, stats } = params;
  const duration = `${Math.round(stats.duration_ms / 1000)}s`;

  const html = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"/></head>
<body style="font-family:system-ui,Arial,sans-serif;padding:32px;background:#f5f5f5;">
  <div style="max-width:500px;margin:auto;background:#fff;border-radius:10px;padding:28px;border-left:4px solid #dc2626;">
    <h2 style="color:#dc2626;margin:0 0 16px;">Crawler-Fehler</h2>
    <pre style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px;font-size:13px;overflow:auto;">${errorMessage}</pre>
    <table style="width:100%;margin-top:16px;font-size:14px;">
      <tr><td style="color:#666;padding:4px 0;">Gescrapt:</td><td><strong>${stats.scraped}</strong></td></tr>
      <tr><td style="color:#666;padding:4px 0;">Gespeichert:</td><td><strong>${stats.inserted}</strong></td></tr>
      <tr><td style="color:#666;padding:4px 0;">Fehler:</td><td><strong style="color:#dc2626;">${stats.errors}</strong></td></tr>
      <tr><td style="color:#666;padding:4px 0;">Laufzeit:</td><td><strong>${duration}</strong></td></tr>
    </table>
    <div style="margin-top:20px;text-align:center;">
      <a href="${APP_URL}/de/admin/crawler"
         style="background:#2563eb;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;">
        Admin-Panel öffnen
      </a>
    </div>
  </div>
</body>
</html>`;

  await getResendClient().emails.send({
    from: FROM,
    to: adminEmail,
    subject: `[Auktivo] Crawler-Fehler – ${new Date().toLocaleDateString("de-DE")}`,
    html,
  });
}
