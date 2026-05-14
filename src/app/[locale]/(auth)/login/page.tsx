"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      if (authError.message.includes("Invalid login")) {
        setError(t("errors.invalid_credentials"));
      } else if (authError.message.includes("Email not confirmed")) {
        setError(t("errors.email_not_confirmed"));
      } else {
        setError(t("errors.generic"));
      }
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t("login_title")}</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">{t("login_subtitle")}</p>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t("email")}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            placeholder="name@beispiel.de"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("password")}</label>
            <Link href="/passwort-vergessen" className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400">
              {t("forgot_password")}
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-full bg-zinc-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("login_button")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        {t("no_account")}{" "}
        <Link href="/registrieren" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          {t("register_link")}
        </Link>
      </p>
    </>
  );
}
