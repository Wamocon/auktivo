import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProGateProps {
  children: React.ReactNode;
  isPro: boolean;
  upgradeHref: string;
  featureName?: string;
}

export function ProGate({ children, isPro, upgradeHref, featureName }: ProGateProps) {
  const t = useTranslations("common");

  if (isPro) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-30 blur-sm">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-zinc-900/60 p-6 text-center backdrop-blur-sm">
        <Lock className="h-8 w-8 text-zinc-100" />
        <p className="text-sm font-medium text-zinc-100">
          {featureName ?? t("pro_badge")} - {t("lock_tooltip")}
        </p>
        <a
          href={upgradeHref}
          className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Upgrade auf Pro
        </a>
      </div>
    </div>
  );
}

export function ProBadge({ className = "" }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <span className={`inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 ${className}`}>
      {t("pro_badge")}
    </span>
  );
}

export function ProLockIcon({ href }: { href: string }) {
  const t = useTranslations("common");
  return (
    <a
      href={href}
      title={t("lock_tooltip")}
      className="inline-flex items-center text-zinc-400 hover:text-brand-500 transition-colors"
    >
      <Lock className="h-4 w-4" />
    </a>
  );
}
