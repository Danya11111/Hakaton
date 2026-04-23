"use client";

import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import type { ScoringResult } from "@/lib/scoring";
import { formatNumber } from "@/lib/utils";

function BlockRadar({
  r,
  e,
  q,
  size = "md",
}: {
  r: number;
  e: number;
  q: number;
  size?: "sm" | "md";
}) {
  const scale = (v: number) => Math.min(100, Math.max(0, (v / 10) * 100));
  const pts = [
    { label: "Результат", value: scale(r), angle: -90 },
    { label: "Эффективность", value: scale(e), angle: 30 },
    { label: "Качество", value: scale(q), angle: 150 },
  ];
  const cx = 70;
  const cy = 70;
  const maxR = size === "sm" ? 34 : 48;
  const toXY = (angleDeg: number, dist: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + dist * Math.cos(rad), y: cy + dist * Math.sin(rad) };
  };
  const poly = pts
    .map((p) => {
      const { x, y } = toXY(p.angle, (p.value / 100) * maxR);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 140 140"
      className={size === "sm" ? "h-24 w-full max-w-[120px]" : "h-32 w-full max-w-[150px]"}
    >
      {[0.33, 0.66, 1].map((t) => (
        <polygon
          key={t}
          fill="none"
          stroke="rgba(148,163,184,0.35)"
          strokeWidth="1"
          points={pts
            .map((p) => {
              const { x, y } = toXY(p.angle, t * maxR);
              return `${x},${y}`;
            })
            .join(" ")}
        />
      ))}
      {pts.map((p) => {
        const outer = toXY(p.angle, maxR);
        return (
          <line
            key={p.label}
            x1={cx}
            y1={cy}
            x2={outer.x}
            y2={outer.y}
            stroke="rgba(148,163,184,0.45)"
            strokeWidth="1"
          />
        );
      })}
      <polygon points={poly} fill="url(#grad)" fillOpacity={0.35} stroke="url(#grad)" strokeWidth="2" />
      <defs>
        <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#e879f9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ScoreBreakdown({
  result,
  compact = false,
}: {
  result: ScoringResult | null;
  compact?: boolean;
}) {
  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-xs text-slate-600 backdrop-blur sm:text-sm">
        Заполните обязательные поля в форме — здесь появится разбор по блокам и по метрикам.
      </div>
    );
  }

  const { resultScore, efficiencyScore, qualityScore, blocks } = result;

  return (
    <div className={compact ? "grid gap-3 lg:grid-cols-[auto_1fr] lg:gap-4" : "grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={
          compact
            ? "flex flex-col items-center justify-center rounded-2xl border border-white/60 bg-white/80 p-3 text-center shadow-sm backdrop-blur md:items-center"
            : "flex flex-col items-center justify-center rounded-3xl border border-white/60 bg-white/80 p-6 text-center shadow-card backdrop-blur-md"
        }
      >
        <p className="text-xs font-semibold text-slate-900">Профиль блоков</p>
        <p className="text-[10px] text-slate-500">0–10</p>
        <div className="mt-2">
          <BlockRadar r={resultScore} e={efficiencyScore} q={qualityScore} size={compact ? "sm" : "md"} />
        </div>
        <div
          className={compact ? "mt-2 grid w-full min-w-0 max-w-xs grid-cols-3 gap-1.5 text-[10px] text-slate-600" : "mt-4 grid w-full grid-cols-3 gap-2 text-xs text-slate-600"}
        >
          <div className="rounded-lg bg-slate-900/[0.03] px-1.5 py-1 ring-1 ring-slate-900/5">
            <p className="text-[9px] font-semibold text-slate-800">Рез-тат</p>
            <p className="font-medium">{formatNumber(resultScore, 1)}</p>
          </div>
          <div className="rounded-lg bg-slate-900/[0.03] px-1.5 py-1 ring-1 ring-slate-900/5">
            <p className="text-[9px] font-semibold text-slate-800">Эфф-ть</p>
            <p className="font-medium">{formatNumber(efficiencyScore, 1)}</p>
          </div>
          <div className="rounded-lg bg-slate-900/[0.03] px-1.5 py-1 ring-1 ring-slate-900/5">
            <p className="text-[9px] font-semibold text-slate-800">Кач-во</p>
            <p className="font-medium">{formatNumber(qualityScore, 1)}</p>
          </div>
        </div>
      </motion.div>
      <div className={compact ? "space-y-2.5" : "space-y-4"}>
        {blocks.map((block) => (
          <motion.div
            key={block.block}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={
              compact
                ? "rounded-2xl border border-white/60 bg-white/85 p-3 shadow-sm backdrop-blur"
                : "rounded-3xl border border-white/60 bg-white/85 p-5 shadow-sm backdrop-blur-md"
            }
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                  {block.block === "RESULT"
                    ? "Результат"
                    : block.block === "EFFICIENCY"
                      ? "Эффективность"
                      : "Качество"}
                </p>
                <p className="font-display text-base font-semibold text-slate-900 sm:text-lg">
                  {formatNumber(block.blockScore, 1)}{" "}
                  <span className="text-xs font-normal text-slate-500">баллов</span>
                </p>
              </div>
              <Progress
                value={Math.min(100, (block.blockScore / 10) * 100)}
                className={compact ? "hidden w-20 sm:block" : "hidden w-32 sm:block"}
              />
            </div>
            <div className={compact ? "mt-2 space-y-1.5" : "mt-4 space-y-3"}>
              {block.rows.map((row) => (
                <div key={row.code} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-600 sm:text-xs">
                    <span className="line-clamp-1 font-medium text-slate-800" title={row.label}>
                      {row.label}
                    </span>
                    <span>
                      {formatNumber(row.normalizedScore, 1)} / 10
                    </span>
                  </div>
                  <Progress className="h-1" value={Math.min(100, (row.normalizedScore / 10) * 100)} />
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
