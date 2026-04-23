import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type LightVariant = "success" | "default" | "warn" | "secondary";
type OnDarkVariant = "statusOnDarkLeader" | "statusOnDarkGood" | "statusOnDarkMid" | "statusOnDarkLow";

export function ScoreStatusBadge({
  label,
  tone = "default",
}: {
  label: string;
  /** `onCardDark`: high-contrast light text on tinted glass for dark gradient cards. */
  tone?: "default" | "onCardDark";
}) {
  if (tone === "onCardDark") {
    const onDark: OnDarkVariant =
      label === "Лидер"
        ? "statusOnDarkLeader"
        : label === "Выше среднего"
          ? "statusOnDarkGood"
          : label === "Средний уровень"
            ? "statusOnDarkMid"
            : "statusOnDarkLow";

    return (
      <Badge
        variant={onDark}
        className="px-3 py-1 text-xs font-semibold uppercase tracking-wide"
      >
        {label}
      </Badge>
    );
  }

  const variant: LightVariant =
    label === "Лидер"
      ? "success"
      : label === "Выше среднего"
        ? "default"
        : label === "Средний уровень"
          ? "warn"
          : "secondary";

  return (
    <Badge
      variant={variant}
      className={cn(
        "px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        label === "Лидер" && "bg-emerald-600 text-white hover:bg-emerald-600",
      )}
    >
      {label}
    </Badge>
  );
}
