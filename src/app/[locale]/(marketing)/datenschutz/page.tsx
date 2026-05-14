export default function DatenschutzPage() {
  return (
    <article className="prose prose-zinc mx-auto max-w-3xl px-4 py-12 dark:prose-invert sm:px-6">
      <h1>Datenschutzerklarung</h1>
      <p><strong>Stand: Mai 2026</strong></p>

      <h2>1 Verantwortlicher</h2>
      <p>WAMOCON GmbH, Mergenthalerallee 79-81, 65760 Eschborn, info@wamocon.com</p>

      <h2>2 Verarbeitete Daten</h2>
      <p>
        Wir verarbeiten folgende Kategorien personenbezogener Daten:
      </p>
      <ul>
        <li><strong>Kontodaten:</strong> Name, E-Mail-Adresse</li>
        <li><strong>Nutzungsdaten:</strong> Suchverhalten, gespeicherte Favoriten, Suchalarm-Einstellungen</li>
        <li><strong>Zahlungsdaten:</strong> Abonnementstatus via Stripe (keine Kreditkartendaten bei uns gespeichert)</li>
        <li><strong>Technische Daten:</strong> IP-Adresse, Browser, Betriebssystem (Logs)</li>
      </ul>

      <h2>3 Zweck und Rechtsgrundlage</h2>
      <p>
        Vertragserfulllung (Art. 6 Abs. 1 lit. b DSGVO), berechtigte Interessen (Art. 6 Abs. 1 lit. f DSGVO) fur Sicherheit und Qualitatsverbesserung.
      </p>

      <h2>4 Speicherdauer</h2>
      <p>
        Kontodaten werden nach Kontoloschhung innerhalb von 30 Tagen geloscht. Gesetzliche Aufbewahrungsfristen (z.B. Rechnungen 10 Jahre) bleiben unberuhrt.
      </p>

      <h2>5 Drittanbieter</h2>
      <ul>
        <li><strong>Supabase Inc.</strong> (Datenbank, Auth) - EU-Server</li>
        <li><strong>Stripe Inc.</strong> (Zahlungsabwicklung) - Standardvertragsklauseln</li>
        <li><strong>Vercel Inc.</strong> (Hosting) - EU-Server verfugbar</li>
      </ul>

      <h2>6 Ihre Rechte</h2>
      <p>
        Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Loschung (Art. 17 DSGVO), Einschrankung (Art. 18 DSGVO), Datenubertragbarkeit (Art. 20 DSGVO), Widerspruch (Art. 21 DSGVO).
        Anfragen an: datenschutz@wamocon.com
      </p>

      <h2>7 Beschwerderecht</h2>
      <p>
        Sie haben das Recht, eine Beschwerde bei einer Datenschutzbehorde einzureichen. Zustandig in Hessen: Der Hessische Beauftragte fur Datenschutz und Informationsfreiheit.
      </p>
    </article>
  );
}
