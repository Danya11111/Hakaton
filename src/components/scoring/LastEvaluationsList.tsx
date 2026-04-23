import { formatNumber } from "@/lib/utils";
import { ScoreStatusBadge } from "@/components/scoring/ScoreStatusBadge";

export function LastEvaluationsList({
  evaluations,
}: {
  evaluations: {
    id: string;
    periodLabel: string;
    integralScore: number;
    statusLabel: string;
    createdAt: Date;
  }[];
}) {
  if (!evaluations.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200/80 bg-slate-50/50 p-3 text-xs text-slate-500 sm:p-4 sm:text-sm">
        Пока нет сохранённых расчётов для этого учреждения.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {evaluations.map((ev) => (
        <div
          key={ev.id}
          className="flex flex-col gap-2 rounded-lg border border-slate-200/60 bg-white/50 px-3 py-2.5 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-3.5"
        >
          <div>
            <p className="text-sm font-medium text-slate-800">{ev.periodLabel}</p>
            <p className="text-[11px] text-slate-500">
              {new Intl.DateTimeFormat("ru-RU", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(ev.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="text-right sm:text-left">
              <p className="text-[9px] uppercase tracking-wide text-slate-500">Балл</p>
              <p className="font-display text-lg font-semibold text-slate-900 sm:text-xl">
                {formatNumber(ev.integralScore, 1)}
              </p>
            </div>
            <ScoreStatusBadge label={ev.statusLabel} />
          </div>
        </div>
      ))}
    </div>
  );
}
