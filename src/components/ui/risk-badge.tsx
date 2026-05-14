import type { RiskLevel } from "@/lib/types/database";
import { useTranslations } from "next-intl";

interface RiskBadgeProps {
  level: RiskLevel;
  showLabel?: boolean;
  className?: string;
}

const RISK_CLASSES: Record<RiskLevel, string> = {
  low: "risk-low",
  medium: "risk-medium",
  high: "risk-high",
  critical: "risk-critical",
};

export function RiskBadge({ level, showLabel = true, className = "" }: RiskBadgeProps) {
  const t = useTranslations("property.risk_level");

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${RISK_CLASSES[level]} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {showLabel && t(level)}
    </span>
  );
}
