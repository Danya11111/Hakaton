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
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-slate-600 backdrop-blur">
        Пока нет сохранённых расчётов для этого учреждения.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {evaluations.map((ev) => (
        <div
          key={ev.id}
          className="flex flex-col gap-3 rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">{ev.periodLabel}</p>
            <p className="text-xs text-slate-500">
              {new Intl.DateTimeFormat("ru-RU", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(ev.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-slate-500">Интегральный балл</p>
              <p className="font-display text-2xl font-semibold text-slate-900">
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
