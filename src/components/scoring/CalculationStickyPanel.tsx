"use client";

import { motion } from "framer-motion";
import { AlertCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreStatusBadge } from "@/components/scoring/ScoreStatusBadge";
import { formatNumber } from "@/lib/utils";
import type { SaveEvaluationState } from "@/actions/evaluation";

export function CalculationStickyPanel({
  hasScore,
  integralScore,
  statusLabel,
  resultScore,
  efficiencyScore,
  qualityScore,
  pending,
  canSave,
  onSave,
  saveState,
}: {
  hasScore: boolean;
  integralScore: number;
  statusLabel: string;
  resultScore: number;
  efficiencyScore: number;
  qualityScore: number;
  pending: boolean;
  canSave: boolean;
  onSave: () => void;
  saveState: SaveEvaluationState;
}) {
  return (
    <div className="space-y-3">
      <motion.div
        layout
        className="relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-4 text-white shadow-card"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.25),transparent_50%),radial-gradient(circle_at_80%_0%,rgba(244,114,182,0.2),transparent_40%)]" />
        <div className="relative space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-white/60">Интегральный балл</p>
            {hasScore ? <ScoreStatusBadge label={statusLabel} tone="onCardDark" /> : null}
          </div>
          {hasScore ? (
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                {formatNumber(integralScore, 1)}
              </span>
              <span className="text-sm text-white/55">/ 100</span>
            </div>
          ) : (
            <p className="text-sm text-white/75">Заполните обязательные поля слева — оценка появится сразу.</p>
          )}
          {hasScore ? (
            <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center text-xs">
              <div>
                <p className="text-white/50">Результат</p>
                <p className="mt-0.5 font-semibold text-white">{formatNumber(resultScore, 1)}</p>
              </div>
              <div>
                <p className="text-white/50">Эффект.</p>
                <p className="mt-0.5 font-semibold text-white">{formatNumber(efficiencyScore, 1)}</p>
              </div>
              <div>
                <p className="text-white/50">Качество</p>
                <p className="mt-0.5 font-semibold text-white">{formatNumber(qualityScore, 1)}</p>
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm backdrop-blur-md">
        <Button
          type="button"
          variant="gradient"
          className="h-10 w-full"
          disabled={pending || !canSave}
          onClick={onSave}
        >
          <Save className="h-4 w-4" />
          {pending ? "Сохранение…" : "Сохранить расчёт"}
        </Button>
        {saveState.status === "error" ? (
          <div className="mt-2 flex items-start gap-2 text-xs text-red-600">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {saveState.message}
          </div>
        ) : saveState.status === "success" ? (
          <motion.p
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-xs font-medium text-emerald-700"
          >
            {saveState.message}
          </motion.p>
        ) : (
          <p className="mt-2 text-[11px] leading-snug text-slate-500">
            Сохранение сработает, когда валидация и расчёт на устройстве и сервере согласованы.
          </p>
        )}
      </div>
    </div>
  );
}
