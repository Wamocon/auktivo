/**
 * WAMOCON Anforderungsdokument Generator
 * Projekt: KI-Pruefungstrainer
 * Struktur: 9 Kapitel + Quellenverzeichnis (WAMOCON-Standard)
 */

import {
  Document, Packer, Paragraph, TextRun,
  Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, BorderStyle, Header
} from "docx";
import fs from "fs";

const FONT = "Arial Narrow";
const TODAY = "16.04.2026";
const BLUE = "1E3A5F";

// --- Helpers ---
const r = (text, opts = {}) =>
  new TextRun({ text: String(text), font: FONT, size: 22, ...opts });

const p = (text, opts = {}) =>
  new Paragraph({ children: [r(text)], spacing: { after: 120 }, ...opts });

const pBold = (text) =>
  new Paragraph({ children: [r(text, { bold: true })], spacing: { after: 120 } });

const h1 = (text) =>
  new Paragraph({
    children: [r(text, { bold: true, size: 34, color: BLUE })],
    spacing: { before: 400, after: 160 }
  });

const h2 = (text) =>
  new Paragraph({
    children: [r(text, { bold: true, size: 26, color: "2E4057" })],
    spacing: { before: 280, after: 100 }
  });

const li = (text) =>
  new Paragraph({
    children: [r(text)],
    bullet: { level: 0 },
    spacing: { after: 60 }
  });

const src = (text) =>
  new Paragraph({
    children: [r("Quelle: " + text, { italics: true, size: 18, color: "666666" })],
    spacing: { after: 80 }
  });

const spacer = () => new Paragraph({ children: [r("")], spacing: { after: 120 } });

const pageBreak = () =>
  new Paragraph({ children: [new TextRun({ break: 1 })], pageBreakBefore: true });

function makeHeader() {
  return new Header({
    children: [
      new Paragraph({
        children: [r("WAMOCON GmbH, Mergenthalerallee 79-81, 65760 Eschborn", { size: 16, color: "888888" })]
      }),
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } },
        children: [new TextRun({ text: "" })]
      })
    ]
  });
}

const hCell = (text, w) =>
  new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: { fill: BLUE, type: ShadingType.CLEAR },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [r(text, { bold: true, color: "FFFFFF", size: 20 })]
    })]
  });

const dCell = (text, w, gray = false) =>
  new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: { fill: gray ? "F5F5F5" : "FFFFFF", type: ShadingType.CLEAR },
    children: [new Paragraph({ children: [r(text, { size: 20 })] })]
  });

function tbl(headers, rows, widths) {
  return new Table({
    columnWidths: widths,
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => hCell(h, widths[i])) }),
      ...rows.map((row, ri) =>
        new TableRow({ children: row.map((c, ci) => dCell(c, widths[ci], ri % 2 !== 0)) })
      )
    ]
  });
}

function coverTbl(rows) {
  const nb = { style: BorderStyle.NONE, size: 0 };
  return new Table({
    columnWidths: [3000, 6000],
    width: { size: 9000, type: WidthType.DXA },
    borders: { top: nb, bottom: nb, left: nb, right: nb, insideH: nb, insideV: nb },
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({ width: { size: 3000, type: WidthType.DXA }, children: [new Paragraph({ children: [r(label, { bold: true })] })] }),
          new TableCell({ width: { size: 6000, type: WidthType.DXA }, children: [new Paragraph({ children: [r(value)] })] })
        ]
      })
    )
  });
}

// =====================================================================
// DECKBLATT
// =====================================================================
const deckblatt = [
  new Paragraph({ border: { top: { style: BorderStyle.THICK, size: 12, color: BLUE } }, children: [r("")] }),
  spacer(),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [r("Anforderungsdokument", { bold: true, size: 28, color: BLUE })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [r("KI-Pruefungstrainer Softwareprojekt", { bold: true, size: 24, color: "333333" })] }),
  spacer(), spacer(),
  coverTbl([
    ["Welle:", "1"],
    ["Projekt:", "KI-Pruefungstrainer"],
    ["Unternehmen:", "WAMOCON GmbH"],
    ["App Version:", "1"],
    ["Erstellt von:", "Yash Bhesaniya"],
    ["Eingereicht an:", "Waleri Moretz (Geschaeftsfuehrung)"],
    ["Datum:", TODAY],
    ["Vertraulichkeit:", "Intern vertraulich"],
    ["Status:", "Zur Freigabe eingereicht"]
  ]),
  spacer(), spacer(),
  new Paragraph({ border: { bottom: { style: BorderStyle.DASHED, size: 6, color: "AAAAAA" } }, children: [r("")] })
];

// =====================================================================
// KAPITEL 1: ZUSAMMENFASSUNG
// =====================================================================
const kap1 = [
  h1("1. Zusammenfassung"),
  h2("1.1 Die Idee"),
  p("KI-Pruefungstrainer ist ein KI-basierter Lernassistent, der auf Basis realer Schulbuecher gezielte Pruefungsfragen generiert und Nutzerantworten validiert. Anwender laden PDFs hoch oder scannen Buchseiten per Handykamera ein. Die App analysiert den Text mittels RAG-Architektur (Retrieval-Augmented Generation), stellt Pruefungsfragen und gibt direktes, quellengebundenes Feedback zur eingegebenen Loesung. Dadurch entsteht eine verlaessliche und kosteneffiziente Alternative zur klassischen Nachhilfe."),
  h2("1.2 Warum jetzt?"),
  p("Der deutsche EdTech-Markt waechst laut HolonIQ mit einem CAGR von 14,7 % und soll 2030 ein Volumen von ueber 5 Mrd. Euro erreichen. 2025 durchliefen in Deutschland ca. 1,3 Mio. Auszubildende ihre IHK-Abschlusspruefungen (BIBB Datenreport 2025). Hinzu kommen ca. 330.000 Abiturienten (Destatis 2025). Gleichzeitig zeigt der Gartner Hype Cycle 2025, dass KI-Tutoring-Systeme mit RAG-Architektur 2026 das Plateau der Produktivitaet erreichen. Herkoemmliche KI-Programme (ChatGPT, Gemini) scheitern an Fachregeln, weil sie ohne Quellenbindung halluzinieren. Die Kombination aus wachsendem Bedarf und technischer Reife macht den Zeitpunkt ideal."),
  src("HolonIQ Europe EdTech Report 2025, BIBB Datenreport 2025, Destatis 2025, Gartner 2025")
];

// =====================================================================
// KAPITEL 2: MARKTANALYSE
// =====================================================================
const kap2 = [
  h1("2. Marktanalyse: Fokus Deutschland"),
  h2("2.1 Zielgruppe in Zahlen"),
  p("In Deutschland durchlaufen jaehrlich ca. 1,3 Mio. Auszubildende eine IHK-Abschlusspruefung (BIBB 2025). Dazu kommen ca. 330.000 Abiturienten (Destatis 2025). Die realistische Kernzielgruppe im DACH-Raum: ueber 2 Mio. potenzielle Nutzer pro Jahrgang. Nachhilfeinstitute bedienen ca. 1,1 Mio. Schueler jaehrlich (Bertelsmann 2025). 57 % der Lernenden nutzen heute mindestens ein digitales Lernmittel (mmb Institut 2025). Der Anteil, der gezielt KI-gestuetzte Tools nutzt, liegt erst bei ca. 12 %. Der Markt ist also weit offen."),
  src("BIBB Datenreport 2025, Destatis 2025, Bertelsmann Stiftung 2025, mmb Institut 2025"),

  h2("2.2 Marktwachstum und Trends"),
  p("Der europaeische EdTech-Markt waechst mit 14,7 % CAGR bis 2030 (HolonIQ 2025). Im Teilsegment KI-basiertes Lernen betraegt das Wachstum sogar 22 % CAGR (2024-2028). Treiber sind: steigende Nachhilfekosten (durchschnittlich 30-50 EUR/Stunde), Fachkraeftemangel bei Lehrkraeften, und die zunehmende Akzeptanz von KI-Tools bei Lernenden unter 25 Jahren (Bitkom 2025: 71 % nutzen KI regelmaessig)."),
  src("HolonIQ 2025, Bitkom Digital Education Survey 2025"),

  h2("2.3 Das Kernproblem"),
  p("Qualitativ hochwertige Nachhilfe ist teuer: 30-50 EUR pro Stunde, fuer viele Familien nicht dauerhaft finanzierbar (Bertelsmann 2025). Herkoemmliche KI-Programme (ChatGPT, Gemini) sind keine Loesung, weil sie:"),
  li("Fachregeln und Spezialwissen (IHK-Richtlinien, Lehrplaene) nicht zuverlaessig kennen"),
  li("Ohne Quellenbindung halluzinieren: falsche Antworten werden ueberzeugend formuliert"),
  li("Nicht auf die eigenen Schulbuecher des Nutzers zugreifen koennen"),
  p("Das Ergebnis: Lernende erhalten falsche Informationen und merken es nicht. Das ist schaedlicher als keine Hilfe."),
  src("Bertelsmann Stiftung 2025, eigene Analyse"),

  h2("2.4 Regulatorisches Umfeld"),
  p("KI-Lerntools fallen unter die DSGVO (besonderer Schutz bei Minderjaehrigen, Art. 8) und ab August 2026 unter den EU AI Act. Lernunterstuetzungstools gelten nicht als Hochrisiko-KI (Anhang III), muessen aber Transparenzpflichten erfuellen (Nutzer muss wissen, dass er mit KI interagiert). Die RAG-Architektur staerkt den Datenschutz: Rohe Texte werden nach Embedding-Erstellung geloescht, nur Vektoren bleiben gespeichert."),
  src("DSGVO (EU) 2016/679, EU AI Act 2024/1689, Art. 6 und Anhang III")
];

// =====================================================================
// KAPITEL 3: WETTBEWERB
// =====================================================================
const kap3 = [
  h1("3. Wettbewerb"),
  h2("3.1 Direkte und indirekte Wettbewerber"),
  p("Der Markt hat etablierte Akteure, aber keiner kombiniert Upload eigener Materialien mit RAG-basierter Quellenbindung und IHK-Spezifik:"),
  spacer(),
  tbl(
    ["Anbieter", "Staerken", "Schwaechen / Chance fuer uns", "Preis/Monat"],
    [
      ["StudySmarter", "Grosse Nutzerbasis (2 Mio. weltweit), Flashcards, Karteikarten, Mobile App", "Keine RAG-Architektur, generische KI-Antworten ohne Quellenbindung, kein PDF-Upload", "0-9 EUR"],
      ["Sofatutor", "Professionelle Lehrvideos, abgestimmt auf Schulkurrikulum DE", "Kein Upload eigener Materialien, keine KI-Fragen, teuer, nicht auf IHK spezialisiert", "15-20 EUR"],
      ["ChatGPT / GPT-4o", "Hohe Sprachkompetenz, flexibel, breite Wissensbasis", "Halluziniert Fachregeln, keine Quellenbindung, keine Pruefungsspezifik, kein Dokumenten-Upload", "20 EUR"],
      ["Quizlet", "Bewaehertes Karteikartsystem, Gamification, grosse Community", "Kein Dokumenten-Upload, keine IHK-Spezifik, kein KI-Feedback auf freie Antworten", "3-8 EUR"],
      ["Simpleclub", "Ansprechendes Design, Videos fuer DACH-Lehrplaene", "Keine eigene Materialien, keine RAG, keine IHK-Vorbereitung, reiner Konsum", "10-15 EUR"]
    ],
    [1500, 2500, 3000, 1200]
  ),
  spacer(),
  h2("3.2 Die Marktluecke"),
  p("Kein bestehender Wettbewerber kombiniert alle drei Elemente:"),
  li("Upload eigener Schulbuecher und PDFs als Wissensbasis"),
  li("RAG-basierte Fragegenerierung aus exakt diesen Materialien (keine Halluzinationen)"),
  li("IHK-spezifische Pruefungslogik und Quellenbindung"),
  p("Diese Kombination ist das Alleinstellungsmerkmal des KI-Pruefungstrainers.")
];

// =====================================================================
// KAPITEL 4: ZIELGRUPPE
// =====================================================================
const kap4 = [
  h1("4. Zielgruppe"),
  h2("4.1 Primaere Zielgruppe"),
  p("Auszubildende in IHK-Berufen und Abiturienten in Deutschland. Sie bilden den groesseren Markt, haben hohen Leidensdruck vor Pruefungen und entscheiden selbst ueber ihre Lernmittel. Zwei Nutzerprofile:"),
  spacer(),
  pBold("Profil 1: Lena, 19, Industriekauffrau im 3. Lehrjahr"),
  p("Lena bereitet sich auf die IHK-Abschlusspruefung vor. Ihr Lehrbuch ist 400 Seiten lang. Sie hat keine Wallbox, sondern Fachbuecher. Nachhilfe kostet 40 EUR/Stunde, das kann sie sich nicht dauerhaft leisten. Sie laedt ihr Lehrbuch als PDF hoch und bekommt sofort Pruefungsfragen mit quellengebundenen Antworten. 20 Minuten abends statt 60 Minuten Nachhilfe."),
  spacer(),
  pBold("Profil 2: Tim, 17, Abiturient, Leistungskurs Biologie"),
  p("Tim fotografiert Buchseiten mit dem Handy. Die App scannt den Text (OCR), generiert Klausurfragen und bewertet seine Antworten gegen den Originaltext. Er nutzt die App taeglich im Bus und lernt in Haeppchen. Sein Ziel: Abi-Note 1,5."),
  spacer(),

  h2("4.2 Sekundaere Zielgruppe"),
  p("Studenten an Fachhochschulen und Universitaeten, die Lehrbuecher fuer Klausuren aufbereiten muessen. Sie haben aehnliche Beduerfnisse, aber laengere Texte und komplexere Fragen. Fuer V1 nicht der Fokus, aber die Infrastruktur (PDF-Upload, RAG, pgvector) deckt diesen Use Case bereits ab."),

  h2("4.3 Nicht-Zielgruppe"),
  p("Grundschueler (zu jung, andere Lernmethoden), Nutzer die reine Video-Erklaerungen suchen (Sofatutor/Simpleclub bedienen das), und Unternehmen mit eigenen E-Learning-Plattformen (kein B2B in V1).")
];

// =====================================================================
// KAPITEL 5: NUTZEN
// =====================================================================
const kap5 = [
  h1("5. Nutzen"),
  h2("5.1 Nutzen fuer Kunden"),
  tbl(
    ["Problem heute", "Loesung durch KI-Pruefungstrainer", "Konkreter Vorteil"],
    [
      ["Nachhilfe kostet 30-50 EUR/Stunde", "KI-gestuetzte Pruefungsfragen fuer 9,90 EUR/Monat (Pro) oder kostenlos (Free)", "Bis zu 90 % Kostenersparnis gegenueber Nachhilfe"],
      ["ChatGPT halluziniert Fachregeln", "RAG-Architektur: Antworten stammen ausschliesslich aus dem eigenen Lehrbuch", "Verlaessliche, quellengebundene Antworten"],
      ["Lehrbuecher sind schwer zu lernen", "App generiert 3-5 Pruefungsfragen pro Textabschnitt automatisch", "Aus 400 Seiten werden 200+ gezielte Fragen"],
      ["Kein Feedback auf eigene Antworten", "KI vergleicht Antwort mit Originaltext und gibt praezise Korrektur", "Sofortiges Feedback statt Warten auf den Lehrer"],
      ["Lernen nur am Schreibtisch", "OCR-Scanner: Buchseite fotografieren, ueberall lernen", "Mobiles Lernen im Bus, in der Pause, unterwegs"]
    ],
    [2500, 3500, 3000]
  ),
  spacer(),
  src("Eigene Kalkulation, Bertelsmann 2025"),

  h2("5.2 Nutzen fuer WAMOCON GmbH"),
  p("KI-Pruefungstrainer ist ein Konsumentenprodukt mit taeglich wiederkehrender Nutzung. Jede Pruefungsphase (2x pro Jahr: Winter und Sommer) erzeugt eine vorhersagbare Nutzungsspitze. WAMOCON baut damit eine direkte Kundenbeziehung zu einer stark wachsenden Zielgruppe auf."),
  pBold("Einnahmequellen:"),
  li("Free-Tier (2 Dokumente, 20 Fragen/Tag) + Pro-Abo (9,90 EUR/Monat, unbegrenzt)"),
  li("Langfristig: Content-Marktplatz mit vorgefertigten IHK-Lernpaketen (Provision)"),
  li("B2B-Lizenzen fuer Berufsschulen und IHK-Bildungszentren (ab V2)"),
  pBold("Strategischer Wert:"),
  li("Eigenes Produkt in einem gesetzlich gesicherten Wachstumsmarkt"),
  li("Netzwerkeffekte: Je mehr Nutzer, desto wertvoller die Plattform fuer Content-Anbieter"),
  li("Technologie-Showcase: RAG + Supabase + Next.js als Kompetenznachweis fuer WAMOCON")
];

// =====================================================================
// KAPITEL 6: ABHAENGIGKEITEN UND MACHBARKEIT
// =====================================================================
const kap6 = [
  h1("6. Abhaengigkeiten und Machbarkeit"),
  h2("6.1 Externe Abhaengigkeiten"),
  tbl(
    ["Quelle", "Was sie liefert", "Fuer welche Funktion", "Kosten"],
    [
      ["OpenAI API (GPT-4o-mini)", "Frage-Generierung und Antwort-Check per RAG", "Kernfunktion: Fragen und Feedback", "Pay-per-use, ca. 0,01-0,02 USD pro Anfrage"],
      ["Supabase + pgvector", "PostgreSQL mit Vektor-Datenbank fuer Embeddings", "Dokument-Chunks und Aehnlichkeitssuche", "10 EUR/Monat (Pro)"],
      ["OpenAI Embeddings API", "Text zu Vektor-Embeddings (text-embedding-3-small)", "Dokumenten-Indexierung in pgvector", "Pay-per-use, minimal"],
      ["Tesseract.js", "Client-seitige OCR fuer Buchseiten-Fotos", "OCR-Scanner Funktion", "Kostenlos (Open Source)"],
      ["Vercel", "Hosting und Deployment", "Frontend und Backend", "Free Tier ausreichend fuer V1"]
    ],
    [2000, 2500, 2500, 2000]
  ),
  spacer(),

  h2("6.2 Bewertung Tech-Stack"),
  p("Next.js 16 (App Router) ist fuer dieses Projekt sehr geeignet: Server Actions ermoeglichen sichere API-Calls zu OpenAI ohne Client-seitige Schluessel-Exposition. Supabase mit pgvector ist die richtige Wahl fuer die Vektor-Datenbank."),
  pBold("Moegliche Bottlenecks:"),
  li("OCR-Qualitaet: Tesseract.js hat begrenzte Genauigkeit bei schlechten Fotos. Loesung V1: Qualitaetsschwelle + Fehlermeldung. V2: Cloud-OCR (Google Vision)."),
  li("Vercel Timeout: Server Actions haben 10s Standard-Timeout. PDF-Verarbeitung ueber Supabase Edge Functions auslagern."),
  li("pgvector-Performance: Ab 100.000 Vektoren HNSW-Index noetig. Fuer V1 unkritisch (wenige tausend Chunks erwartet)."),

  h2("6.3 Gesamtbewertung"),
  p("Version 1 hat keine kritischen Abhaengigkeiten, die den Start blockieren koennten. OpenAI API ist pay-per-use ohne Vertrag, Tesseract.js ist Open Source, Supabase und Vercel sind sofort verfuegbar. Kein Gatekeeper kann den Marktzugang blockieren.")
];

// =====================================================================
// KAPITEL 7: ANFORDERUNGEN VERSION 1
// =====================================================================
const kap7 = [
  h1("7. Anforderungen Version 1"),
  p("Version 1 ist bewusst minimal gehalten: maximaler Nutzen fuer Lernende, minimale Kosten. Fokus auf PDF-Upload, Frage-Generierung und Antwort-Check mit RAG."),

  h2("7.1 Hauptprozesse"),
  pBold("7.1.1 Dokumenten-Upload und Verarbeitung"),
  tbl(
    ["ID", "Anforderung", "Prioritaet", "Status"],
    [
      ["K-01", "PDF-Upload: einzelne Lern-PDFs hochladen (max. 50 MB)", "Muss", "Neu"],
      ["K-02", "Textsegmentierung: PDF in sinnvolle Textabschnitte (Chunks) aufteilen", "Muss", "Neu"],
      ["K-03", "Embedding-Generierung: Chunks per OpenAI Embeddings API vektorisieren und in pgvector speichern", "Muss", "Neu"],
      ["K-04", "Dokument-Verwaltung: Liste aller Dokumente mit Status, Chunk-Anzahl und Loeschen-Funktion", "Muss", "Neu"],
      ["K-05", "Rohe PDFs nach Verarbeitung loeschen (Datenschutz und Urheberrecht)", "Muss", "Neu"]
    ],
    [700, 5800, 1300, 1200]
  ),
  spacer(),

  pBold("7.1.2 OCR-Scanner"),
  tbl(
    ["ID", "Anforderung", "Prioritaet", "Status"],
    [
      ["K-06", "Kamerazugriff auf dem Mobilgeraet: Buchseite fotografieren", "Muss", "Neu"],
      ["K-07", "OCR per Tesseract.js: fotografierten Text extrahieren", "Muss", "Neu"],
      ["K-08", "Qualitaetspruefschwelle: bei schlechter Erkennung Fehlermeldung anzeigen", "Soll", "Neu"],
      ["K-09", "Extrahierten Text wie PDF-Upload weiterverarbeiten (Chunking, Embedding)", "Muss", "Neu"]
    ],
    [700, 5800, 1300, 1200]
  ),
  spacer(),

  pBold("7.1.3 Frage-Generator"),
  tbl(
    ["ID", "Anforderung", "Prioritaet", "Status"],
    [
      ["K-10", "Frage-Generierung: 3-5 Pruefungsfragen pro Textabschnitt per RAG-LLM", "Muss", "Neu"],
      ["K-11", "Fragentypen: Multiple Choice, Lueckentext und offene Fragen", "Soll", "Neu"],
      ["K-12", "Shuffle-Modus: zufaellige Fragenreihenfolge", "Soll", "Neu"]
    ],
    [700, 5800, 1300, 1200]
  ),
  spacer(),

  pBold("7.1.4 Antwort-Check und Feedback"),
  tbl(
    ["ID", "Anforderung", "Prioritaet", "Status"],
    [
      ["K-13", "Eingabefeld fuer Nutzerloesung, KI-Abgleich gegen Originaltext per RAG", "Muss", "Neu"],
      ["K-14", "Quellennachweis: relevante Textstelle aus dem Dokument bei jeder Antwort anzeigen", "Muss", "Neu"],
      ["K-15", "Bewertung: richtig/teilweise richtig/falsch mit erklaerend Korrektur", "Muss", "Neu"],
      ["K-16", "Fortschrittsanzeige: Trefferquote und bearbeitete Fragen pro Dokument", "Soll", "Neu"]
    ],
    [700, 5800, 1300, 1200]
  ),
  spacer(),

  h2("7.2 Basisfunktionalitaeten"),
  pBold("7.2.1 Rollen, Anmeldung, Registrierung"),
  tbl(
    ["ID", "Anforderung", "Prioritaet", "Status"],
    [
      ["B-01", "Zwei Rollen: Lernender (Standard), Admin (WAMOCON intern)", "Muss", "Neu"],
      ["B-02", "Registrierung per E-Mail mit Bestaetigungslink (Double-Opt-In)", "Muss", "Neu"],
      ["B-03", "Anmeldung per E-Mail und Passwort", "Muss", "Neu"],
      ["B-04", "Passwort zuruecksetzen per E-Mail", "Muss", "Neu"],
      ["B-05", "Admin-Bereich: Nutzerverwaltung, Systemeinstellungen", "Muss", "Neu"]
    ],
    [700, 5800, 1300, 1200]
  ),
  spacer(),

  pBold("7.2.2 Navigation, Dashboard, Profil"),
  tbl(
    ["ID", "Anforderung", "Prioritaet", "Status"],
    [
      ["B-06", "Dashboard als Startseite: Dokumente, letzte Aktivitaeten, Fortschritt", "Muss", "Neu"],
      ["B-07", "Navigation mit Breadcrumbs auf allen Unterseiten", "Muss", "Neu"],
      ["B-08", "Profilseite: Name, E-Mail, Einstellungen", "Muss", "Neu"],
      ["B-09", "Dunkel/Hell-Modus umschaltbar", "Muss", "Neu"],
      ["B-10", "Spracheinstellungen: Deutsch und Englisch", "Muss", "Neu"],
      ["B-11", "Responsive Design: Mobile und Desktop gleichwertig", "Muss", "Neu"]
    ],
    [700, 5800, 1300, 1200]
  ),
  spacer(),

  pBold("7.2.3 Recht, Datenschutz, Geschaeftsmodell"),
  tbl(
    ["ID", "Anforderung", "Prioritaet", "Status"],
    [
      ["B-12", "AGB, Impressum, Datenschutzerklaerung als eigene Seiten", "Muss", "Neu"],
      ["B-13", "Cookie-Banner bei erstem Aufruf, DSGVO-konform", "Muss", "Neu"],
      ["B-14", "DSGVO-Funktionen: Daten exportieren, Konto loeschen", "Muss", "Neu"],
      ["B-15", "Free-Tier: 2 Dokumente, 20 Fragen/Tag. Pro: 9,90 EUR/Monat unbegrenzt", "Muss", "Neu"],
      ["B-16", "Upgrade von Free auf Pro direkt in der App", "Muss", "Neu"]
    ],
    [700, 5800, 1300, 1200]
  ),
  spacer(),

  h2("7.3 Scope"),
  tbl(
    ["In Scope Version 1", "Out of Scope (geplant V2+)"],
    [
      ["PDF-Upload (einzeln) mit RAG-Embedding", "Batch-Upload mehrerer Dokumente"],
      ["Tesseract.js OCR (kostenlos, client-seitig)", "Cloud-OCR (Google Vision / AWS Textract)"],
      ["3-5 Fragen pro Textabschnitt", "Dynamischer Lernplan (Schwaechen-Algorithmus)"],
      ["Text-Antwort-Check mit RAG", "Audio-Pruefung (Speech-to-Text / muendliche Pruefung)"],
      ["Free + Pro Abo", "Team-Accounts / Berufsschul-Verwaltung"],
      ["Quellennachweis pro Antwort", "Content-Marktplatz fuer IHK-Lernpakete"],
      ["Fortschrittsanzeige", "Gamification (Badges, Leaderboard, Streaks)"],
      ["Responsive Web-App", "Native Mobile App (iOS/Android)"]
    ],
    [4500, 4500]
  )
];

// =====================================================================
// KAPITEL 8: CHANCEN UND RISIKEN
// =====================================================================
const kap8 = [
  h1("8. Chancen und Risiken"),
  h2("8.1 Chancen"),
  tbl(
    ["Chance", "Begruendung"],
    [
      ["Wachsende Zielgruppe ohne Deckel", "1,3 Mio. Azubis + 330.000 Abiturienten pro Jahr allein in DE. EdTech CAGR 14,7 %. Der Markt verdoppelt sich bis 2030."],
      ["Kein RAG-basierter Wettbewerber fuer Schueler", "Kein Anbieter kombiniert PDF-Upload, RAG-Quellenbindung und Pruefungsspezifik. Die Luecke ist vollstaendig offen."],
      ["KI-Akzeptanz bei Jugendlichen hoch", "71 % der unter 25-Jaehrigen nutzen KI-Tools regelmaessig (Bitkom 2025). Die Zielgruppe ist bereit."],
      ["Niedrige Betriebskosten", "V1 laeuft mit ca. 47-57 EUR/Monat. Break-even bereits ab ca. 6 Pro-Abonnenten."],
      ["Content-Marktplatz als Skalierungshebel", "Ab V2: vorgefertigte IHK-Pakete verkaufen. Jeder Kauf generiert Umsatz ohne eigene Contentproduktion."]
    ],
    [3500, 5500]
  ),
  spacer(),

  h2("8.2 Risiken"),
  tbl(
    ["Risiko", "Warum es eintreten kann", "Gegenmassnahme"],
    [
      ["OCR-Qualitaet bei schlechten Fotos", "Tesseract.js hat Grenzen bei schlechter Beleuchtung oder kleiner Schrift", "Qualitaetsschwelle + Fehlermeldung. Migration zu Cloud-OCR in V2."],
      ["OpenAI-API-Kosten skalieren", "Bei hoher Nutzung steigen die Kosten pro Anfrage", "Token-Limit im Free-Tier. Pro-Abo deckt Kosten. Wechsel zu guenstigerem Modell moeglich."],
      ["Urheberrechtsprobleme bei Buchern", "Nutzer laden geschuetzte Buecher hoch", "AGB-Hinweis. PDFs nach Embedding sofort loeschen. Nur Vektoren bleiben."],
      ["KI-Halluzinationen trotz RAG", "RAG reduziert, eliminiert Halluzinationen aber nicht zu 100 %", "Jede Antwort mit Originaltext-Stelle belegen. Confidence Score anzeigen."],
      ["Niedrige Retention ohne Gamification", "Lernende verlieren nach 2 Wochen Interesse", "Fortschrittsbalken in V1. Gamification (Badges, Streaks) in V2."]
    ],
    [2200, 2800, 4000]
  )
];

// =====================================================================
// KAPITEL 9: UMSETZUNGSPLAN VERSION 1
// =====================================================================
const kap9 = [
  h1("9. Umsetzungsplan Version 1"),
  h2("9.1 Entwicklungsansatz"),
  p("Die Entwicklung erfolgt mit GitHub Copilot als aktivem Implementierungswerkzeug. GitHub Copilot schreibt den Grossteil des Codes, der Entwickler uebernimmt Review, Architekturentscheidungen und Qualitaetssicherung."),
  pBold("Tech-Stack:"),
  li("Frontend: Next.js 16 (App Router), Tailwind CSS, TypeScript"),
  li("Backend/DB: Supabase (PostgreSQL + pgvector, Auth, Row Level Security)"),
  li("KI: OpenAI API (GPT-4o-mini + text-embedding-3-small) mit RAG-Architektur"),
  li("OCR: Tesseract.js (client-seitig)"),
  li("Hosting: Vercel (automatisches Deployment aus GitHub)"),
  spacer(),

  h2("9.2 Umsetzungsplan 5-7 Werktage"),
  tbl(
    ["Tag", "Fokus", "Inhalt"],
    [
      ["Tag 1-3", "Hauptprozesse (Entwurf)", "PDF-Upload mit Chunking und Embedding, OCR-Scanner, Frage-Generator per RAG, Antwort-Check mit Quellennachweis. DB-Schema: documents, document_chunks mit pgvector. GitHub Copilot schreibt Code, Entwickler reviewt."],
      ["Tag 3-4", "Testing und Bugfixing", "Manuelles Testen aller Kernfunktionen, Fehlerkorrektur, Edge Cases. Parallel: Supabase Auth konfigurieren, Vercel-Deployment einrichten, RLS-Policies."],
      ["Tag 4-5", "Basisfunktionalitaeten", "Registrierung, Login, Dashboard, Profilseite, Dunkel/Hell-Modus, Spracheinstellungen, Free/Pro-Modell, AGB/Datenschutz/Impressum, Cookie-Banner, DSGVO-Funktionen. Landing Page."],
      ["Tag 5-6 (Puffer)", "Letzte Arbeiten", "Letzte Fehler beseitigen, offene Arbeitspakete pruefen, Produkthandbuch (erster Entwurf), Vorbereitung auf Praesentation."]
    ],
    [1200, 1800, 6000]
  ),
  spacer(),
  p("Hinweis: Die 5-7-Tage-Umsetzung produziert einen lauffaehigen Prototyp der Hauptprozesse und alle Basisfunktionalitaeten fuer einen ersten Launch. Qualitaetssicherung und Stabilisierung laufen nach dem Sprint weiter."),
  spacer(),

  pBold("Betriebskosten V1 (monatlich):"),
  tbl(
    ["Position", "Kosten/Monat"],
    [
      ["GitHub Copilot (Entwicklung)", "35 EUR"],
      ["Supabase Pro", "10 EUR"],
      ["Domain (.de oder .com)", "2-4 EUR"],
      ["OpenAI API (ca. 500 Anfragen/Monat Free-Tier)", "0-8 EUR"],
      ["Gesamt", "ca. 47-57 EUR"]
    ],
    [6000, 3000]
  )
];

// =====================================================================
// QUELLENVERZEICHNIS
// =====================================================================
const quellen = [
  h1("Quellenverzeichnis"),
  tbl(
    ["Quelle", "Inhalt / Fundstelle"],
    [
      ["BIBB Datenreport 2025", "1,3 Mio. Auszubildende in IHK-Pruefungen, bibb.de"],
      ["Destatis Schulstatistik 2025", "330.000 Abiturienten pro Jahr, destatis.de"],
      ["HolonIQ Europe EdTech Report 2025", "EdTech DACH CAGR 14,7 % bis 2030, holoniq.com"],
      ["Gartner Hype Cycle Education 2025", "RAG-Tutoring-Systeme erreichen Produktivitaet 2026, gartner.com"],
      ["Bitkom Digital Education Survey 2025", "71 % der unter 25-Jaehrigen nutzen KI regelmaessig, bitkom.org"],
      ["Bertelsmann Stiftung 2025", "1,1 Mio. Nachhilfeschueler, 30-50 EUR/Stunde, bertelsmann-stiftung.de"],
      ["mmb Institut 2025", "57 % nutzen digitale Lernmittel, mmb-institut.de"],
      ["DSGVO (EU) 2016/679", "Datenschutz-Grundverordnung, Art. 5, 8, 13, 17, 25, eur-lex.europa.eu"],
      ["EU AI Act 2024/1689", "KI-Verordnung, Transparenzpflichten, Anhang III, eur-lex.europa.eu"],
      ["Lewis et al. 2020", "RAG for Knowledge-Intensive NLP Tasks, Facebook AI Research, arxiv.org"]
    ],
    [3000, 6000]
  )
];

// =====================================================================
// DOKUMENT ZUSAMMENBAUEN
// =====================================================================
const doc = new Document({
  sections: [{
    properties: {
      titlePage: true,
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
      }
    },
    headers: {
      first: new Header({ children: [] }),
      default: makeHeader()
    },
    children: [
      ...deckblatt,    pageBreak(),
      ...kap1,         pageBreak(),
      ...kap2,         pageBreak(),
      ...kap3,         pageBreak(),
      ...kap4,         pageBreak(),
      ...kap5,         pageBreak(),
      ...kap6,         pageBreak(),
      ...kap7,         pageBreak(),
      ...kap8,         pageBreak(),
      ...kap9,         pageBreak(),
      ...quellen
    ]
  }],
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } }
  }
});

if (!fs.existsSync("public")) fs.mkdirSync("public");

const buffer = await Packer.toBuffer(doc);
const outputPath = "public/Anforderungsdokument_KI-Pruefungstrainer.docx";
fs.writeFileSync(outputPath, buffer);
console.log("Dokument erstellt: " + outputPath);