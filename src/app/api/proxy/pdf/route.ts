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

function isAllowedUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
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

  if (!isAllowedUrl(targetUrl)) {
    return NextResponse.json(
      { error: "URL nicht erlaubt. Nur ZVG-Portal-Dokumente werden unterstuetzt." },
      { status: 403 }
    );
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        // Browser-User-Agent damit ZVG-Portal nicht blockt
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/pdf,*/*",
        Referer: "https://www.zvg-portal.de/",
      },
      // Sicherheit: kein Follow von Redirects zu anderen Domains
      redirect: "follow",
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
