"use client";

import { motion } from "framer-motion";
import { ScoreStatusBadge } from "@/components/scoring/ScoreStatusBadge";
import { formatNumber } from "@/lib/utils";

export function ScoreSummary({
  integralScore,
  statusLabel,
  resultScore,
  efficiencyScore,
  qualityScore,
}: {
  integralScore: number;
  statusLabel: string;
  resultScore: number;
  efficiencyScore: number;
  qualityScore: number;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <motion.div
        layout
        className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-8 text-white shadow-2xl"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.35),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(244,114,182,0.25),transparent_40%)]" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white/70">Интегральный балл</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-6xl font-semibold tracking-tight sm:text-7xl">
                {formatNumber(integralScore, 1)}
              </span>
              <span className="text-lg text-white/60">/ 100</span>
            </div>
            <p className="mt-3 max-w-md text-sm text-white/75">
              Сводная оценка по методике ТиНАО: сочетание результата, эффективности и качества с учётом весов
              блоков.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <ScoreStatusBadge label={statusLabel} />
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/80 ring-1 ring-white/15 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-white/60">Блоки</p>
              <div className="mt-2 grid grid-cols-3 gap-3 text-center text-xs font-semibold">
                <div>
                  <p className="text-white/50">Результат</p>
                  <p className="text-lg text-white">{formatNumber(resultScore, 1)}</p>
                </div>
                <div>
                  <p className="text-white/50">Эффективность</p>
                  <p className="text-lg text-white">{formatNumber(efficiencyScore, 1)}</p>
                </div>
                <div>
                  <p className="text-white/50">Качество</p>
                  <p className="text-lg text-white">{formatNumber(qualityScore, 1)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      <motion.div
        layout
        className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-card backdrop-blur-md"
      >
        <p className="text-sm font-semibold text-slate-900">Краткая расшифровка</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Каждый блок оценивается по шкале до 10 баллов с нормализацией к бенчмаркам методики. Итоговый балл
          подчёркивает устойчивый результат и эффективное использование ресурсов.
        </p>
        <div className="mt-5 space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between rounded-2xl bg-slate-900/[0.03] px-3 py-2 ring-1 ring-slate-900/5">
            <span>Результат</span>
            <span className="font-semibold">{formatNumber(resultScore, 1)}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-900/[0.03] px-3 py-2 ring-1 ring-slate-900/5">
            <span>Эффективность</span>
            <span className="font-semibold">{formatNumber(efficiencyScore, 1)}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-900/[0.03] px-3 py-2 ring-1 ring-slate-900/5">
            <span>Качество</span>
            <span className="font-semibold">{formatNumber(qualityScore, 1)}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
