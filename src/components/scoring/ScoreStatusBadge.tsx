import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ScoreStatusBadge({ label }: { label: string }) {
  const variant =
    label === "Лидер"
      ? "success"
      : label === "Выше среднего"
        ? "default"
        : label === "Средний уровень"
          ? "warn"
          : "secondary";

  return (
    <Badge
      variant={variant as "success" | "default" | "warn" | "secondary"}
      className={cn(
        "px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        label === "Лидер" && "bg-emerald-600 text-white hover:bg-emerald-600",
      )}
    >
      {label}
    </Badge>
  );
}
