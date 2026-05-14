import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

interface AiDisclaimerProps {
  variant?: "full" | "short";
  className?: string;
}

export function AiDisclaimer({ variant = "full", className = "" }: AiDisclaimerProps) {
  const t = useTranslations("disclaimer");

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300 ${className}`}
      role="note"
      aria-label="KI-Haftungsausschluss"
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{variant === "short" ? t("short") : t("ai")}</span>
    </div>
  );
}
