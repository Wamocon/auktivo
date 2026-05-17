import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PDF-Proxy fuer ZVG-Portal-Dokumente.
 *
 * SICHERHEIT (SSRF-Schutz):
 * Akzeptiert KEINE URL vom Client. Stattdessen werden nur `file_id` (numerisch)
 * und `land_abk` (2-3 Buchstaben) entgegengenommen und die Ziel-URL vollstaendig
 * server-seitig aus einem festen Template aufgebaut.
 * Supabase-Storage-Dokumente sind oeffentlich und brauchen keinen Proxy.
 *
 * Usage: GET /api/proxy/pdf?file_id=12345&land_abk=nw
 */

/** Validierung: nur Ziffern */
const FILE_ID_RE = /^\d{1,10}$/;
/** Validierung: 2-3 lateinische Buchstaben (Bundesland-Kuerzel) */
const LAND_ABK_RE = /^[a-z]{2,3}$/i;

export async function GET(request: Request) {
  // Authentifizierung pruefen
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("file_id");
  const landAbk = searchParams.get("land_abk");

  // Strikte Parametervalidierung - Abbruch bei ungueltigem Input
  if (!fileId || !landAbk) {
    return NextResponse.json({ error: "Parameter 'file_id' und 'land_abk' erforderlich" }, { status: 400 });
  }
  if (!FILE_ID_RE.test(fileId)) {
    return NextResponse.json({ error: "Ungueltige file_id (nur Ziffern erlaubt)" }, { status: 400 });
  }
  if (!LAND_ABK_RE.test(landAbk)) {
    return NextResponse.json({ error: "Ungueltige land_abk (2-3 Buchstaben erwartet)" }, { status: 400 });
  }

  // URL vollstaendig server-seitig aus festen Bestandteilen aufbauen.
  // Kein User-Input erreicht fetch() - CodeQL-SSRF-sicher.
  const safeFileId = fileId.replace(/\D/g, ""); // Redundante Bereinigung
  const safeLandAbk = landAbk.toLowerCase().replace(/[^a-z]/g, "");
  const zvgUrl = `https://www.zvg-portal.de/index.php?button=showDoc&file_id=${safeFileId}&land_abk=${safeLandAbk}`;

  // ZVG-Portal benoetigt eine aktive PHP-Session
  let zvgSessionCookie = "";
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

  try {
    const upstream = await fetch(zvgUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/pdf,*/*",
        Referer: "https://www.zvg-portal.de/",
        ...(zvgSessionCookie ? { Cookie: zvgSessionCookie } : {}),
      },
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
        "Cache-Control": "private, no-store",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Disposition": `inline; filename="dokument-${safeFileId}.pdf"`,
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
