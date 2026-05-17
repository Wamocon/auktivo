import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Erlaubte Domains fuer den PDF-Proxy (Sicherheit: kein Open Redirect)
const ALLOWED_HOSTS = [
  "www.zvg-portal.de",
  "zvg-portal.de",
  "justiz.de",
  "justizministerium.de",
  "einsichten-online.de",
];

function getAllowedTargetUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl);

    if (parsed.protocol !== "https:") return null;

    const normalizedHostname = parsed.hostname.toLowerCase();

    // Supabase Storage URLs erlauben (fuer gespeicherte Dokumente in property-docs Bucket)
    const isSupabaseStorage = normalizedHostname.endsWith(".supabase.co");
    const isAllowedHost = ALLOWED_HOSTS.includes(normalizedHostname);

    if (!isAllowedHost && !isSupabaseStorage) return null;

    // Keine Credentials in Ziel-URLs zulassen
    if (parsed.username || parsed.password) return null;

    // Nur HTTPS-Standardport erlauben (kein internes Port-Scanning)
    if (parsed.port && parsed.port !== "443") return null;

    // Ziel-URL kanonisch aus validierten Bestandteilen neu aufbauen
    const safeUrl = new URL(`https://${normalizedHostname}${parsed.pathname}${parsed.search}`);
    safeUrl.hash = "";

    return safeUrl;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  // Authentifizierung pruefen
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  // URL aus Query-Parameter lesen
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Parameter 'url' fehlt" }, { status: 400 });
  }

  const safeTargetUrl = getAllowedTargetUrl(targetUrl);
  if (!safeTargetUrl) {
    return NextResponse.json(
      { error: "URL nicht erlaubt. Nur ZVG-Portal-Dokumente werden unterstuetzt." },
      { status: 403 }
    );
  }

  // ZVG-Portal benoetigt eine aktive PHP-Session um Dokumente auszuliefern
  let zvgSessionCookie = "";
  if (safeTargetUrl.hostname.includes("zvg-portal.de")) {
    try {
      const sessionResp = await fetch(
        "https://www.zvg-portal.de/index.php?button=Termine%20suchen",
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "text/html",
          },
        }
      );
      const rawCookie = sessionResp.headers.get("set-cookie") ?? "";
      const match = /PHPSESSID=[^;,\s]+/.exec(rawCookie);
      zvgSessionCookie = match ? match[0] : "";
    } catch {
      // Ohne Session trotzdem versuchen
    }
  }

  try {
    const upstream = await fetch(safeTargetUrl.toString(), {
      headers: {
        // Browser-User-Agent damit ZVG-Portal nicht blockt
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/pdf,*/*",
        Referer: "https://www.zvg-portal.de/",
        ...(zvgSessionCookie ? { Cookie: zvgSessionCookie } : {}),
      },
      // Sicherheit: kein Follow von Redirects zu anderen Domains
      redirect: "manual",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Dokument nicht abrufbar (Status ${upstream.status})` },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "application/pdf";
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Kein Caching-Header - sensible Dokumente
        "Cache-Control": "private, no-store",
        // Framing erlauben (nur fuer den eigenen Iframe)
        "X-Frame-Options": "SAMEORIGIN",
        // Dateiname fuer den Download-Fall
        "Content-Disposition": `inline; filename="dokument.pdf"`,
      },
    });
  } catch (err) {
    console.error("[PDF Proxy] Fetch-Fehler:", err);
    return NextResponse.json(
      { error: "Verbindung zum Dokumentenserver fehlgeschlagen" },
      { status: 502 }
    );
  }
}
