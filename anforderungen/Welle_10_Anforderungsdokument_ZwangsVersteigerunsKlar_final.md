**Anforderungsdokument**

Auktivo -- Softwareprojekt

  ---------------------- -------------------------------------------------
  **Welle:**             10

  **Projekt:**           Auktivo

  **Unternehmen:**       WAMOCON GmbH

  **App Version:**       1

  **Erstellt von:**      Nikolaj Schefner

  **Eingereicht an:**    Waleri Moretz (Geschäftsführung)

  **Datum:**             12.05.2026

  **Vertraulichkeit:**   Intern vertraulich

  **Status:**            Zur Freigabe eingereicht
  ---------------------- -------------------------------------------------

# **1. Zusammenfassung**

Jedes Jahr werden in Deutschland rund 12.500 Immobilien
zwangsversteigert. Amtsgerichte veröffentlichen Termine und Gutachten
auf dem staatlichen ZVG-Portal[^1], meist als schwer lesbare PDF- oder
TIF-Dateien mit 60 bis 100 Seiten Umfang. Privatpersonen und
Einsteiger-Investoren wollen diese Chancen nutzen, scheitern aber an der
Unübersichtlichkeit:

-   Der Markt bleibt faktisch professionellen Großinvestoren
    vorbehalten, die teure Spezialdienste abonnieren.

**Auktivo** macht diesen Markt zugänglich. Die App
aggregiert automatisch alle Versteigerungstermine aus dem ZVG-Portal,
liest Gutachten per OCR[^2] aus und extrahiert per KI[^3] die
wesentlichen Risikosignale:

-   Baulasten,

-   Sanierungsrückstände,

-   Problemmieter,

-   belastete Grundbücher.

Was bisher 1,5 bis 3 Stunden manueller Prüfung kostete, dauert mit der
App nur wenige Minuten.

Darüber hinaus steht nach jeder Analyse ein KI-Chat-Assistent bereit:

-   Nutzer können direkt Rückfragen zum Gutachten stellen, in
    natürlicher Sprache, ohne juristisches Vorwissen.

-   Die KI beantwortet Fragen wie

    -   „Was bedeutet diese Baulast konkret?" oder

    -   „Wie hoch könnten die Sanierungskosten sein?".

Version 1 umfasst vier Kernbausteine:

-   Automatisierter Import aller Versteigerungstermine aus dem
    staatlichen ZVG-Portal (Intervall-Crawler[^4]).

-   OCR-Auslesung von PDF- und TIF-Gutachten.

-   KI-gestützte Risikoextraktion mit strukturierter
    Warnsignal-Übersicht.

-   KI-Chat-Assistent für Rückfragen zum jeweiligen Gutachten.

*Quelle: Argetra GmbH, Marktbericht Zwangsversteigerungen 2025;
Statistisches Bundesamt, Immobilienmarkt 2024.*

# **2. Marktanalyse**

## **2.1 Marktkennzahlen: Suchendes Publikum und warum es scheitert**

  -----------------------------------------------------------------------
  **Kennzahl**                                      **Wert**
  ------------------------------------------------- ---------------------
  Zwangsversteigerungstermine p.a. (DE)             ca. 12.500 / Monat

  Unique Visitors ZVG-Portal pro Monat              ca. 200.000 Besuche /
                                                    Monat

  Absprungrate ZVG-Portal                           \> 70 %

  Durchschnittliche Verweildauer ZVG-Portal         \< 3 Minuten

  Bieter pro Versteigerungstermin (anwesend)        Ø 8 bis 15 Personen

  Anteil Privatpersonen unter Bietern               ca. 60 bis 70 %

  Interessenten, die Portal besuchen, aber nie      ca. 80 %
  bieten                                            

  Manuelle Prüfzeit eines Gutachtens                1,5 bis 3 Stunden
  -----------------------------------------------------------------------

*Quelle: Argetra, Marktbericht 2025.*

Die Daten belegen eine klare Frustration:

-   Rund 200.000 Personen besuchen das ZVG-Portal monatlich, die
    überwältigende Mehrheit springt nach wenigen Minuten wieder ab.

-   Die Absprungrate von über 70 % und eine Verweildauer von unter 3
    Minuten zeigen, dass das Portal Interesse weckt, aber die Nutzer mit
    unstrukturierten Rohdaten alleinlässt.

Wer die Gutachten nicht selbst lesen kann oder will, hat faktisch keinen
Marktzugang.

*Quelle: Argetra GmbH, Marktbericht Zwangsversteigerungen 2025;
SimilarWeb Analyse ZVG-Portal, März 2025; Statistisches Bundesamt,
Immobilienmarkt 2024.*

## **2.2 Privatpersonen vs. institutionelle Investoren**

Die Frage, ob Privatpersonen oder Unternehmen die eigentliche Zielgruppe
darstellen, ist für die Strategie entscheidend.

  ---------------------------------------------------------------------------
  **Segment**              **Anteil an        **Charakteristik**
                           Ersteigerungen**   
  ------------------------ ------------------ -------------------------------
  Professionelle           ca. 30 bis 40 %    Nutzen teure Spezialdienste
  Immobilieninvestoren und                    (Argetra-Abo, private
  Makler                                      Datenbanken), verfügen über
                                              eigene Analysteams

  Kleinanleger und         ca. 25 bis 35 %    Kaufen 1 bis 3 Objekte; willig
  semiprofessionelle                          zu investieren, aber durch
  Einzelinvestoren                            Informationsaufwand überlastet

  Privatpersonen           ca. 25 bis 35 %    Suchen Eigenheim günstiger als
  (Eigennutzung)                              am freien Markt; scheitern
                                              häufig am Prozess

  Institutionelle          ca. 5 bis 10 %     Wenige Akteure, hohes
  Großinvestoren                              Kapitalvolumen, eigene Juristen
                                              und Analysten
  ---------------------------------------------------------------------------

[Fazit:]{.underline}

-   Institutionelle Großinvestoren sind für **Auktivo**
    keine relevante Zielgruppe.

-   Sie haben eigene Ressourcen und würden ein Consumer-Produkt nicht
    nutzen.

-   Der adressierbare Markt sind Privatpersonen und semiprofessionelle
    Kleinanleger, das sind zusammen 50 bis 70 % der Bieter, die heute
    mangels Werkzeugs verlieren oder gar nicht erst teilnehmen.

*Quelle: Argetra GmbH, Marktbericht Zwangsversteigerungen 2025;
Bundesministerium der Justiz, ZVG-Jahresbericht 2024.*

# **3. Wettbewerb**

## **3.1 Wettbewerbsübersicht**

+--------+----------+------------------------+-----------------------+
| **Anbi | **Typ**  | **Stärken**            | **Schwächen**         |
| eter** |          |                        |                       |
+========+==========+========================+=======================+
| ZVG-   | Sta      | Einzige gesetzlich     | Keine Suchfilter,     |
| Portal | atliches | bindende Primärquelle  | keine                 |
| (zv    | Pflic    |                        | Gutachtenanalyse      |
| g-port | htportal | Vollständige           |                       |
| al.de) |          | Datenabdeckung         | Reines                |
|        |          | kostenlos              | Dokumentenarchiv      |
|        |          |                        |                       |
|        |          |                        | Absprungrate \> 70 %  |
|        |          |                        |                       |
|        |          |                        | technisch veraltet    |
+--------+----------+------------------------+-----------------------+
| A      | Komme    | Ältester Fachdienst    | Keine KI-Analyse      |
| rgetra | rzieller | für Profis             |                       |
| (arget | Date     |                        | nur manuelle Rohdaten |
| ra.de) | nservice | Strukturierte Suche    |                       |
|        |          | nach PLZ, Region,      | teurer Jahresvertrag  |
|        |          | Objekttyp              | (ca. 500 bis 2.000    |
|        |          |                        | EUR/Jahr)             |
|        |          |                        |                       |
|        |          |                        | nicht für Einsteiger  |
+--------+----------+------------------------+-----------------------+
| ZV     | A        | Einfachere Darstellung | Nur Terminlisting     |
| G24.de | ggregato | als staatliches Portal |                       |
|        | r-Portal |                        | kein KI-Modul         |
|        |          | kostenloser Zugang     |                       |
|        |          |                        | keine                 |
|        |          |                        | Gutachtenanalyse      |
+--------+----------+------------------------+-----------------------+
| Bie    | P        | Erklärt den            | Kein Datenaggregator  |
| terhel | rozessbe | Bieterprozess          |                       |
| fer.de | gleitung | schriftlich            | keine                 |
|        |          |                        | Gutachtenaufbereitung |
|        |          |                        |                       |
|        |          |                        | nur redaktionelle     |
|        |          |                        | Hilfe                 |
+--------+----------+------------------------+-----------------------+

## **3.2 Differenzierung und Positionierung**

Das ZVG-Portal hat die stärkste strukturelle Position: Es ist die
einzige gesetzlich vorgeschriebene Primärquelle für
Zwangsversteigerungen in Deutschland. Das macht es unverzichtbar, aber
nicht zu einem echten Wettbewerber im Sinne von Nutzererfahrung oder
Analyse. Es bietet keinerlei Werkzeuge zur Datenaufbereitung, hat eine
miserable Nutzerführung und verweist Nutzer auf unleserliche
Rohdokumente. Diese Schwäche ist der Markteintrittsgrund für
**Auktivo**.

Argetra ist der gefährlichste indirekte Konkurrent:

-   etabliert,

-   bekannt,

-   mit Profi-Kundenstamm.

Argetra hat jedoch keine KI-Gutachtenanalyse und ist strukturell auf
professionelle Dauerkunden ausgerichtet, nicht auf Einsteiger oder
Privatpersonen.

**Auktivo** positioniert sich als erstes Produkt, das
den vollständigen Workflow abbildet:

-   Aggregation → OCR → KI-Risikoanalyse → Chat-Assistent für
    Rückfragen.

Kein bestehender Anbieter bietet diese Kombination.

*Quelle: SimilarWeb Wettbewerbsanalyse Mai 2026; argetra.de, zvg24.de,
bieterhelfer.de (abgerufen Mai 2026).*

# **4. Zielgruppe**

## **4.1 Primäre Zielgruppe**

Privatpersonen und Einsteiger-Investoren in Deutschland, 28 bis 55
Jahre, die eine Immobilie günstig erwerben oder ihr Kapital anlegen
wollen, aber durch die Komplexität des ZVG-Verfahrens abgeschreckt
werden.

Marktvolumen:

-   ca. 80.000 bis 150.000 aktiv suchende Personen pro Jahr (Schätzung
    auf Basis Argetra 2025 und ZVG-Portal-Traffic SimilarWeb 2025).

Drei Nutzerprofile stehen im Fokus:

+-----------------+--------------------------+------------+-----------+
| **Profil**      | **Typische Situation**   | **Za       | *         |
|                 |                          | hlungsbere | *Relevanz |
|                 |                          | itschaft** | V1**      |
+=================+==========================+============+===========+
| Privatperson    | Sucht günstigeres        | Mittel     | Sehr hoch |
| (Eigennutzung)  | Eigenheim durch          |            |           |
|                 | ZVG-Erwerb               | zahlt für  |           |
|                 |                          | klare      |           |
|                 | hat keine Erfahrung mit  | Inf        |           |
|                 | Gutachten                | ormationen |           |
|                 |                          |            |           |
|                 | scheitert an unlesbaren  |            |           |
|                 | TIF-Dokumenten           |            |           |
+-----------------+--------------------------+------------+-----------+
| Eins            | Möchte 1 bis 3           | Hoch       | Sehr hoch |
| teiger-Investor | Renditeobjekte erwerben  |            |           |
| (Kleinanleger)  |                          | investiert |           |
|                 | hat begrenztes           | Zeit und   |           |
|                 | Zeitbudget (\< 5         | Geld in    |           |
|                 | Std./Woche) für          | Vo         |           |
|                 | Gutachtenprüfung         | rrecherche |           |
+-----------------+--------------------------+------------+-----------+
| Semi            | Screent 10 bis 30        | Sehr hoch  | Hoch      |
| professioneller | Objekte pro Monat        |            |           |
| Investor        |                          | hat klaren |           |
|                 | benötigt schnelle        | ROI-Fokus  |           |
|                 | Pre-Screening-Logik ohne |            |           |
|                 | Analysten                |            |           |
+-----------------+--------------------------+------------+-----------+

*Quelle: Argetra GmbH, Marktbericht Zwangsversteigerungen 2025;
Bundesministerium der Justiz, ZVG-Jahresbericht 2024.*

## **4.2 Sekundäre Zielgruppe**

-   Immobilienmakler, die ZVG-Objekte in ihr Portfolio aufnehmen wollen.

-   Vermögensberater und Steuerberater, die Mandanten bei
    ZVG-Investitionen begleiten.

-   Relevant für Version 2 mit Mehrnutzerkonten und API-Zugang.

## **4.3 Nicht-Zielgruppe**

-   Institutionelle Großinvestoren und Immobilien-AGs:

    -   Sie verfügen über eigene Analyseteams und Rechtsabteilungen.

    -   Der Mehrwert eines Consumer-Produkts ist für sie nicht relevant.

-   Deren Anforderungen (Massenverarbeitung, API-Integration,
    White-Label) übersteigen den MVP-Scope[^5] erheblich.

*Quelle: Argetra GmbH, Marktbericht Zwangsversteigerungen 2025;
Bundesministerium der Justiz, ZVG-Jahresbericht 2024.*

# **5. Nutzen und Alleinstellungsmerkmal**

## **5.1 Nutzen für den Markt**

**Auktivo** löst drei konkrete Probleme auf einmal:

-   [Zeitersparnis]{.underline}:

    -   Gutachtenprüfung von 1,5 bis 3 Stunden auf 5 bis 10 Minuten
        reduziert.

-   [Risikoreduktion]{.underline}:

    -   KI markiert Baulasten, Mängel und problematische
        Mietverhältnisse automatisch.

    -   Kritische Informationen werden nicht übersehen.

-   [Interaktive Nachfrage]{.underline}:

    -   Der KI-Chat-Assistent beantwortet Rückfragen zum Gutachten
        direkt, ohne dass Nutzer Jurist oder Bausachverständiger sein
        müssen.

*KI-Disclaimer: Alle KI-Analysen und Chat-Antworten dienen der
Orientierung. Sie ersetzen keine rechtliche, steuerliche oder
bautechnische Fachberatung.*

## **5.2 Alleinstellungsmerkmal**

Kein bestehender Anbieter bietet diese Kombination:

-   Automatisierte Aggregation aller ZVG-Termine aus dem staatlichen
    Portal.

-   OCR-Auslesung und KI-Risikoextraktion aus PDF/TIF-Gutachten.

-   KI-Chat-Assistent für Rückfragen zum konkreten Gutachten nach der
    Analyse.

-   Verständliche, strukturierte Darstellung für Nicht-Experten.

# **6. Abhängigkeiten und Herausforderungen**

+--------------+-----------------+--------------------+---------------+
| **Faktor**   | *               | **Mitigation**     | **            |
|              | *Beschreibung** |                    | Machbarkeit** |
+==============+=================+====================+===============+
| ZVG-Portal   | Keine           | Robuster           | Hoch          |
| Datenzugang  | offizielle API  | Python-Crawler mit |               |
|              |                 | Retry-Logik und    | die           |
|              | Datenbezug per  | Monitoring.        | HTML-Struktur |
|              | Web-Crawling.   |                    | ist seit      |
|              |                 | Keine externe      | Jahren        |
|              |                 | Abhängigkeit       | konstant.     |
|              |                 | erforderlich.      |               |
+--------------+-----------------+--------------------+---------------+
| Gutach       | Alte Scans      | Einsatz moderner   | Hoch          |
| ten-Qualität | können          | OCR-Dienste (AWS   |               |
| (OCR)        | Handschriften   | Textract / Google  | OCR erreicht  |
|              | oder schlechte  | Document AI).      | \> 95 %       |
|              | Scanqualität    |                    | Genauigkeit.  |
|              | enthalten.      | Unlesbare Stellen  |               |
|              |                 | werden dem Nutzer  |               |
|              |                 | als solche         |               |
|              |                 | markiert.          |               |
+--------------+-----------------+--------------------+---------------+
| KI-Interpre  | Modell könnte   | Konservativ-Bias   | Hoch          |
| tationstiefe | Risiken falsch  | im                 |               |
|              | gewichten.      | Prompt-Engineering | durch         |
|              |                 | (lieber zu viele   | Disclaimer    |
|              |                 | Warnhinweise).     | rechtlich     |
|              |                 |                    | abgesichert.  |
|              |                 | Klarer             |               |
|              |                 | KI-Disclaimer bei  |               |
|              |                 | jeder Ausgabe.     |               |
+--------------+-----------------+--------------------+---------------+
| Rechtliche   | ZVG-Daten sind  | Gutachten werden   | Hoch          |
| Situation    | öffentlich      | zusammengefasst,   |               |
|              |                 | nicht kopiert.     | keine         |
|              | Gutachten sind  |                    | bekannten     |
|              | amtliche        | Keine              | P             |
|              | Dokumente.      | urheberrechtlich   | räzedenzfälle |
|              |                 | geschützten        | gegen         |
|              |                 | Inhalte werden     | Aggregatoren. |
|              |                 | verändert.         |               |
+--------------+-----------------+--------------------+---------------+

[Machbarkeitseinschätzung]{.underline}**:**

-   Alle wesentlichen Abhängigkeiten können durch eigene
    Technologieentscheidungen gelöst werden.

-   Es bestehen keine zwingenden Vertragsabhängigkeiten von Dritten.

-   Version 1 ist mit dem beschriebenen Stack vollständig umsetzbar.

# **7. Businessmodell**

## **7.1 Modellbeschreibung**

+---------+----------------------------------------------+------------+
| *       | **Funktionsumfang**                          | **Preis**  |
| *Plan** |                                              |            |
+=========+==============================================+============+
| Free    | Maximal 5 Suchen pro Monat nur Basisdaten    | 0 Euro     |
|         | (Termin, Ort, Verkehrswert-Schätzung),       |            |
|         |                                              |            |
|         | kein Zugriff auf KI-Analyse,                 |            |
|         |                                              |            |
|         | keine Gutachten-Zusammenfassung,             |            |
|         |                                              |            |
|         | kein KI-Chat-Assistent,                      |            |
|         |                                              |            |
|         | keine Alarm-Funktion                         |            |
+---------+----------------------------------------------+------------+
| Pro     | Unbegrenzte Suche,                           | 9,99       |
|         |                                              | Euro/Monat |
|         | vollständige KI-Gutachtenanalyse mit         |            |
|         | Warnsignal-Extraktion,                       |            |
|         |                                              |            |
|         | KI-Chat-Assistent für Rückfragen zum         |            |
|         | Gutachten                                    |            |
|         |                                              |            |
|         | Favoriten-Verwaltung                         |            |
|         |                                              |            |
|         | Push- und E-Mail-Alarme bei neuen            |            |
|         | Versteigerungen im Suchgebiet                |            |
|         |                                              |            |
|         | unbegrenzte PDF-Downloads                    |            |
+---------+----------------------------------------------+------------+

Der stark limitierte Free-Plan erzeugt Upgrade-Druck:

-   Wer mehr als 5 Objekte pro Monat prüfen will oder den KI-Chat nutzen
    möchte, muss upgraden.

-   Pro monetarisiert genau die Funktionen, für die Nutzer den größten
    Zeitgewinn wahrnehmen.

# **8. Anforderungen Version 1**

## **8.1 Hauptprozesse**

+-----+---------------------------------------------------------+------+
| **I | **Anforderung**                                         | *    |
| D** |                                                         | *Pri |
|     |                                                         | orit |
|     |                                                         | ät** |
+=====+=========================================================+======+
| H   | Automatisierter Intervall-Crawler ruft täglich alle     | Muss |
| -01 | Versteigerungstermine und Gutachten-Dokumente vom       |      |
|     | ZVG-Portal ab, neue Termine werden automatisch in der   |      |
|     | Datenbank gespeichert und aktualisiert.                 |      |
+-----+---------------------------------------------------------+------+
| H   | OCR-Pipeline liest PDF- und TIF-Dokumente aus und       | Muss |
| -02 | wandelt sie in maschinenlesbaren Text um.               |      |
+-----+---------------------------------------------------------+------+
| H   | KI-Risikoextraktion:                                    | Muss |
| -03 |                                                         |      |
|     | Baulasten, Sanierungsbedarf, Mieterverhältnisse und     |      |
|     | Grundbuchbelastungen werden automatisch extrahiert und  |      |
|     | als strukturierte Warnsignal-Übersicht dargestellt.     |      |
+-----+---------------------------------------------------------+------+
| H   | KI-Chat-Assistent:                                      | Muss |
| -04 |                                                         |      |
|     | Nutzer stellen nach der Analyse Rückfragen zum          |      |
|     | Gutachten per Chat; die KI beantwortet auf Basis des    |      |
|     | analysierten Dokuments. KI-Disclaimer ist bei jeder     |      |
|     | Antwort sichtbar.                                       |      |
+-----+---------------------------------------------------------+------+
| H   | Such- und Filterfunktion:                               | Muss |
| -05 |                                                         |      |
|     | Suche nach PLZ, Umkreis, Objekttyp (Haus, Wohnung,      |      |
|     | Gewerbe), Termin-Datum und Verkehrswert-Bereich.        |      |
+-----+---------------------------------------------------------+------+
| H   | Detailseite pro Objekt:                                 | Muss |
| -06 |                                                         |      |
|     | Termin, Verkehrswert, Ort, Amtsgericht, verlinkte       |      |
|     | Originaldokumente und KI-Analyse-Übersicht.             |      |
+-----+---------------------------------------------------------+------+
| H   | Alarm-Funktion (Pro):                                   | Soll |
| -07 |                                                         |      |
|     | Push- oder E-Mail-Benachrichtigung bei neuen            |      |
|     | Versteigerungen im Suchgebiet.                          |      |
+-----+---------------------------------------------------------+------+
| H   | Favoritenliste (Pro):                                   | Soll |
| -08 |                                                         |      |
|     | Objekte merken und verwalten.                           |      |
+-----+---------------------------------------------------------+------+

## **8.2 Basisprozesse**

+-----+---------------------------------------------------------+------+
| **I | **Anforderung**                                         | *    |
| D** |                                                         | *Pri |
|     |                                                         | orit |
|     |                                                         | ät** |
+=====+=========================================================+======+
| B   | Registrierung per E-Mail mit Bestätigungslink           | Muss |
| -01 |                                                         |      |
+-----+---------------------------------------------------------+------+
| B   | Passwort zurücksetzen per E-Mail.                       | Muss |
| -02 |                                                         |      |
+-----+---------------------------------------------------------+------+
| B   | Profilseite:                                            | Muss |
| -03 |                                                         |      |
|     | Stammdaten verwalten, Passwort ändern, Abo-Status       |      |
|     | einsehen, Konto löschen (DSGVO[^6]-konform).            |      |
+-----+---------------------------------------------------------+------+
| B   | Dashboard:                                              | Muss |
| -04 |                                                         |      |
|     | Übersicht neuer Versteigerungen, gespeicherte           |      |
|     | Favoriten, letzter Crawler-Status.                      |      |
+-----+---------------------------------------------------------+------+
| B   | Admin-Bereich:                                          | Muss |
| -05 |                                                         |      |
|     | Nutzerverwaltung, Crawler-Konfiguration, manueller      |      |
|     | Re-Import-Trigger, Abo-Verwaltung.                      |      |
+-----+---------------------------------------------------------+------+
| B   | DSGVO-Funktionen:                                       | Muss |
| -06 |                                                         |      |
|     | Datenexport (Portabilität), vollständige Kontolöschung, |      |
|     | Cookie-Banner mit Opt-in.                               |      |
+-----+---------------------------------------------------------+------+
| B   | AGB, Impressum und Datenschutzerklärung.                | Muss |
| -07 |                                                         |      |
+-----+---------------------------------------------------------+------+
| B   | FAQ und Hilfebereich (inkl. Erklärung des               | Muss |
| -08 | Zwangsversteigerungsprozesses in verständlicher         |      |
|     | Sprache).                                               |      |
+-----+---------------------------------------------------------+------+

## **8.3 Businessmodell-Anforderungen**

  ----------------------------------------------------------------------------------
  **ID**   **Anforderung**                                           **Priorität**
  -------- --------------------------------------------------------- ---------------
  M-01     Free-Limit von 5 Suchanfragen pro Monat serverseitig      Muss
           erzwingen, Zähler je Nutzeraccount.                       

  M-02     KI-Analyse und KI-Chat nur für Pro-Nutzer freischalten.   Muss

  M-03     Alarm-Funktion nur für Pro-Nutzer freischalten.           Muss

  M-04     Pro-Upgrade zu 9,99 EUR/Monat in der App buchbar via      Muss
           Stripe.                                                   

  M-05     Self-Service-Kündigung ohne Supportkontakt möglich.       Muss

  M-06     Sichtbare Feature-Abgrenzung zwischen Free und Pro in der Muss
           Oberfläche (Lock-Icons, Upgrade-CTA).                     
  ----------------------------------------------------------------------------------

# **9. Chancen und Risiken**

## **9.1 Chancen**

  -----------------------------------------------------------------------------------------------
  **Chance**           **Eintrittswahrscheinlichkeit**   **Wirkung**   **Begründung**
  -------------------- --------------------------------- ------------- --------------------------
  Unbesetzte KI-Nische Hoch                              Hoch          Kein Anbieter bietet
  im ZVG-Markt                                                         KI-Analyse plus Chat für
                                                                       Privatpersonen.

  Hohe Absprungrate am Hoch (belegt)                     Hoch          \> 70 % verlassen das
  ZVG-Portal als                                                       Portal frustriert,
  direktes                                                             direkter Kaufgrund für
  Einstiegsargument                                                    Pro.

  Wachsender Markt     Mittel bis hoch                   Mittel        Steigende Insolvenzen
  durch steigende                                                      erhöhen
  Insolvenzen                                                          ZVG-Termine-Volumen.

  Niedriger CAC[^7]    Hoch (belegt)                     Mittel        Zielgruppe über
  durch gezieltes SEO                                                  ZVG-Keywords gezielt
  auf ZVG-Keywords                                                     erreichbar.
  -----------------------------------------------------------------------------------------------

## **9.2 Risiken**

  -------------------------------------------------------------------------------------
  **Risiko**             **Eintritt**   **Auswirkung**   **Gegenmaßnahme**
  ---------------------- -------------- ---------------- ------------------------------
  KI bewertet Risiken    Mittel         Hoch             Disclaimer bei jeder
  falsch                                                 KI-Ausgabe, Konservativ-Bias
                                                         im Prompt-Engineering.

  ZVG-Portal ändert      Niedrig        Mittel           Crawler-Monitoring mit
  HTML-Struktur                                          automatischem Alert, schnelle
                                                         Anpassungsstrategie.

  Geringe                Mittel         Mittel           Free-Plan als Einstieg,
  Zahlungsbereitschaft                                   Mehrwert durch Chat-Assistent
  für 9,99 EUR/Monat                                     kommunizieren.

  Rechtliche Unklarheit  Niedrig        Mittel           Rechtsprüfung vor Launch,
  beim Re-Publizieren                                    Inhalte werden
  amtlicher Daten                                        zusammengefasst, nicht
                                                         kopiert.
  -------------------------------------------------------------------------------------

# **10. Technologie und Umsetzungsplan**

## **10.1 Technologiestack**

  -----------------------------------------------------------------------
  **Schicht**                **Technologie**
  -------------------------- --------------------------------------------
  Frontend & Backend         Next.js (React), Supabase

  Web-Crawling               Python (Scrapy / Playwright)

  OCR-Pipeline               AWS Textract oder Google Document AI

  KI-Analyse & Chat          OpenAI API (GPT-4o)

  Benachrichtigungen         Resend (E-Mail), Web Push API

  Payment                    Stripe

  Hosting                    Vercel (Frontend), Supabase (EU-Region
                             Frankfurt)
  -----------------------------------------------------------------------

## **10.2 Daten-Aktualisierung (Crawler-Mechanismus)**

Das ZVG-Portal bietet keine offizielle API. Die App bezieht Daten über
einen eigenen Intervall-Crawler:

-   Der Crawler läuft täglich (konfigurierbar) und prüft das ZVG-Portal
    auf neue Termine und Dokumente.

-   Neue Einträge werden automatisch in der Supabase-Datenbank
    gespeichert.

-   Geänderte oder stornierte Termine werden abgeglichen und
    aktualisiert.

-   Ein Admin-Dashboard zeigt den letzten Crawler-Lauf, Anzahl neuer
    Einträge und eventuelle Fehler.

-   Pro-Nutzer erhalten bei neuen Treffern in ihrem Suchgebiet
    automatisch eine Push- oder E-Mail-Benachrichtigung.

## **10.3 Umsetzungsplan (5 Werktage + 1 Puffertag)**

**GitHub Copilot Premium** übernimmt den Großteil der Codegenerierung.
Der Entwickler reviewt, korrigiert und integriert.

  ------------------------------------------------------------------------
  **Tag**         **Fokus**       **Inhalt**
  --------------- --------------- ----------------------------------------
  Tag 1 (Montag)  Projektsetup    Architektur, Supabase-Schema,
                                  Authentifizierung,
                                  Free/Pro-Feature-Toggle,
                                  Stripe-Anbindung

  Tag 2           Crawler & OCR   Python-Crawler für ZVG-Portal
  (Dienstag)                      implementieren, OCR-Pipeline (PDF/TIF zu
                                  Text) aufbauen und testen

  Tag 3           KI-Analyse &    KI-Risikoextraktion implementieren,
  (Mittwoch)      Chat            KI-Chat-Assistent aufbauen,
                                  KI-Disclaimer integrieren

  Tag 4           Frontend        Dashboard, Detailseiten, Such- und
  (Donnerstag)                    Filterlogik, Alarm-Funktion,
                                  Favoritenliste

  Tag 5 (Freitag) Feinschliff     DSGVO-Funktionen, AGB/Impressum, FAQ,
                                  Feature-Abgrenzung Free/Pro,
                                  End-to-End-Tests

  Tag 6 (Samstag) Puffertag       Crawler-Debugging,
                                  Performance-Optimierung, Release-Abnahme
  ------------------------------------------------------------------------

Das Ergebnis nach Tag 6 ist eine produktive erste Version mit allen
Kernfunktionen, kein finales Endprodukt.

# **11. Quellenverzeichnis**

  -----------------------------------------------------------------------
  **Quelle**                                 **Inhalt**
  ------------------------------------------ ----------------------------
  Argetra GmbH, Marktbericht                 Marktvolumen,
  Zwangsversteigerungen 2025                 Bieterverhalten,
                                             Segmentierung

  Bundesministerium der Justiz,              Rechtliche
  ZVG-Jahresbericht 2024                     Rahmenbedingungen,
                                             Verfahrenszahlen

  Statistisches Bundesamt (Destatis),        Immobilienmarktdaten
  Immobilienmarkt 2024                       Deutschland

  SimilarWeb, Wettbewerbsanalyse ZVG-Portal, Traffic-Daten, Absprungrate,
  März 2025                                  Verweildauer

  zvg-portal.de (abgerufen Mai 2026)         Produktanalyse staatliches
                                             Portal

  argetra.de (abgerufen Mai 2026)            Wettbewerbsanalyse

  zvg24.de, bieterhelfer.de (abgerufen Mai   Wettbewerbsanalyse
  2026)                                      
  -----------------------------------------------------------------------

[^1]: *ZVG-Portal: Das staatliche Portal der deutschen Amtsgerichte zur
    Veröffentlichung von Zwangsversteigerungsterminen und Gutachten.
    URL: zvg-portal.de*

[^2]: *OCR (Optical Character Recognition): Optische Zeichenerkennung,
    Technologie zur automatisierten Texterkennung aus Bild- und
    PDF-Dateien.*

[^3]: *KI (Künstliche Intelligenz): Softwarebasierte Analyse- und
    Generierungssysteme (hier: OpenAI GPT-4o). Alle KI-Ausgaben ersetzen
    keine rechtliche, steuerliche oder bautechnische Fachberatung.*

[^4]: *Crawler (Web-Crawler): Automatisiertes Programm, das Webseiten in
    definierten Zeitintervallen abruft und strukturierte Daten
    extrahiert.*

[^5]: *MVP-Scope (Minimum Viable Product): Der minimale, aber
    vollständig lieferbare Funktionsumfang der ersten Produktversion.*

[^6]: *DSGVO (Datenschutz-Grundverordnung): EU-weite Verordnung zum
    Schutz personenbezogener Daten.*

[^7]: *CAC (Customer Acquisition Cost): Kosten zur Gewinnung eines neuen
    zahlenden Kunden.*
