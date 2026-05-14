"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { Mail, Loader2, CheckCircle } from "lucide-react";

export default function PasswortVergessenPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/profil`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center">
        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
        <h1 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">E-Mail gesendet</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Prufen Sie Ihr Postfach und klicken Sie auf den Link zum Zurucksetzen.
        </p>
        <Link href="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          Zuruck zum Login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">Passwort vergessen</h1>
      <p className="mb-6 text-sm text-zinc-500">Wir senden Ihnen einen Reset-Link per E-Mail.</p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">E-Mail</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              placeholder="ihre@email.de"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-full bg-zinc-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Reset-Link senden
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-zinc-500">
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Zuruck zum Login
        </Link>
      </div>
    </div>
  );
}
