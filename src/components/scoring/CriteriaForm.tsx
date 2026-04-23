"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertCircle, ChevronDown, Sparkles } from "lucide-react";
import { saveCompanyEvaluation, type SaveEvaluationState } from "@/actions/evaluation";
import { CalculationStickyPanel } from "@/components/scoring/CalculationStickyPanel";
import { ScoreBreakdown } from "@/components/scoring/ScoreBreakdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildEvaluationFormSchema } from "@/lib/criteria-schema";
import {
  computeScoringForGroup,
  groupTemplatesByBlock,
  pickAutoMetric,
  type ScoringResult,
} from "@/lib/scoring";
import { getTemplatesForGroup } from "@/lib/scoring-templates";
import type { CriterionTemplate } from "@/lib/scoring-templates";
import { cn, formatNumber } from "@/lib/utils";

type FieldMap = Record<string, string>;

function parseNumber(raw: string): number | undefined {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function buildNumericValues(
  groupCode: string,
  fields: FieldMap,
): { values: Record<string, number | undefined>; staffCount: number; populationInZone: number } {
  const templates = getTemplatesForGroup(groupCode);
  const values: Record<string, number | undefined> = {};
  for (const t of templates) {
    if (t.autoCalculated) continue;
    values[t.code] = parseNumber(fields[t.code] ?? "");
  }
  return {
    values,
    staffCount: parseNumber(fields.staffCount ?? "") ?? NaN,
    populationInZone: parseNumber(fields.populationInZone ?? "") ?? NaN,
  };
}

function ManualMetricField({
  template,
  value,
  onChange,
}: {
  template: CriterionTemplate;
  value: string;
  onChange: (v: string) => void;
}) {
  const placeholder =
    template.inputMode === "satisfaction"
      ? "От 0 до 5"
      : template.inputMode === "percent"
        ? "Например, 42"
        : "0";

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={template.code} className="text-xs font-medium text-slate-800">
          {template.label}
        </Label>
        <span className="shrink-0 text-[10px] font-medium text-slate-500">{template.unit}</span>
      </div>
      <Input
        id={template.code}
        className="h-9 border-slate-200/80 bg-white text-sm shadow-sm"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-[11px] leading-relaxed text-slate-500">{template.helpText}</p>
    </div>
  );
}

function AutoMetricField({
  template,
  value,
  formulaHint,
}: {
  template: CriterionTemplate;
  value: string | number | undefined;
  /** Extra line, e.g. for Group A share */
  formulaHint?: string;
}) {
  const display = value === undefined || value === "" ? "—" : typeof value === "number" ? formatNumber(value, 2) : value;

  return (
    <div
      className={cn(
        "space-y-1.5 rounded-lg border border-indigo-200/50 bg-indigo-50/40 p-2.5 ring-1 ring-indigo-100/50",
        "select-none",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Авто</span>
          <span className="text-xs font-medium text-slate-800">{template.label}</span>
        </div>
        <span className="shrink-0 text-[10px] text-slate-500">{template.unit}</span>
      </div>
      <div
        className="rounded-md border border-indigo-200/30 bg-indigo-50/60 px-2.5 py-1.5 text-base font-semibold leading-none text-slate-900"
        title={String(display)}
        aria-label={`${template.label}: ${display}`}
      >
        {display}
      </div>
      <p className="text-[11px] leading-relaxed text-slate-600">
        {formulaHint ?? template.helpText}
      </p>
    </div>
  );
}

export function CriteriaForm({
  companyId,
  companySlug,
  groupCode,
  areaSqM,
}: {
  companyId: string;
  companySlug: string;
  groupCode: string;
  areaSqM: number;
}) {
  const templates = useMemo(() => getTemplatesForGroup(groupCode), [groupCode]);
  const grouped = useMemo(() => groupTemplatesByBlock(templates), [templates]);
  const schema = useMemo(() => buildEvaluationFormSchema(groupCode), [groupCode]);

  const initialFields = useMemo(() => {
    const base: FieldMap = {
      periodLabel: "",
      staffCount: "",
      populationInZone: "",
    };
    for (const t of templates) {
      if (!t.autoCalculated) base[t.code] = "";
    }
    return base;
  }, [templates]);

  const [fields, setFields] = useState<FieldMap>(initialFields);
  const [saveState, setSaveState] = useState<SaveEvaluationState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  const { values, staffCount, populationInZone } = useMemo(
    () => buildNumericValues(groupCode, fields),
    [fields, groupCode],
  );

  const scoring = useMemo(() => {
    return computeScoringForGroup({
      groupCode,
      values,
      areaSqM,
      staffCount,
      populationInZone,
    });
  }, [groupCode, values, areaSqM, staffCount, populationInZone]);

  const clientPreview: ScoringResult | null = scoring.ok ? scoring.result : null;
  const zodPreview = useMemo(() => {
    const parsed = schema.safeParse(fields);
    return parsed.success ? parsed.data : null;
  }, [schema, fields]);
  const auto = scoring.ok ? scoring.auto : null;

  const childEventsFormulaHint =
    groupCode === "A" ? "Авто: (детские ÷ все мероприятия) × 100. При 0 мероприятий — 0%." : undefined;

  const handleSave = () => {
    setSaveState({ status: "idle" });
    startTransition(async () => {
      const res = await saveCompanyEvaluation({
        companyId,
        companySlug,
        groupCode,
        areaSqM,
        form: fields,
      });
      setSaveState(res);
    });
  };

  const blockTitle = (block: string) =>
    block === "RESULT" ? "Результат" : block === "EFFICIENCY" ? "Эффективность" : "Качество";

  const canSave = !!zodPreview && scoring.ok;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_19rem] xl:gap-6">
        <Card className="border-white/60 bg-white/90 shadow-card backdrop-blur-md">
          <CardHeader className="space-y-0 pb-2 pt-4 sm:pb-3 sm:pt-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <CardTitle className="text-base font-semibold sm:text-lg">Рабочая зона расчёта</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Показатели по методике группы. Серые поля ввода — вручную; блоки с меткой{" "}
              <span className="font-semibold text-indigo-600">авто</span> пересчитываются сами.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 px-3 pb-4 sm:space-y-5 sm:px-6 sm:pb-5">
            <section className="space-y-2.5 rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 sm:p-3.5">
              <p className="text-xs font-semibold text-slate-800">Базовые параметры</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="periodLabel" className="text-xs text-slate-700">
                    Период / отчёт
                  </Label>
                  <Input
                    id="periodLabel"
                    className="h-9"
                    placeholder="2025 · I пг."
                    value={fields.periodLabel}
                    onChange={(e) => setFields((f) => ({ ...f, periodLabel: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="populationInZone" className="text-xs text-slate-700">
                    Население в зоне
                  </Label>
                  <Input
                    id="populationInZone"
                    className="h-9"
                    inputMode="numeric"
                    placeholder="12000"
                    value={fields.populationInZone}
                    onChange={(e) => setFields((f) => ({ ...f, populationInZone: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="staffCount" className="text-xs text-slate-700">
                    Штат, ставок
                  </Label>
                  <Input
                    id="staffCount"
                    className="h-9"
                    inputMode="numeric"
                    placeholder="32"
                    value={fields.staffCount}
                    onChange={(e) => setFields((f) => ({ ...f, staffCount: e.target.value }))}
                  />
                </div>
                <div className="flex items-end sm:col-span-2 xl:col-span-1">
                  <div className="w-full rounded-lg border border-indigo-200/50 bg-indigo-50/40 px-2.5 py-2 text-[11px] text-slate-700">
                    <p className="text-[10px] font-bold uppercase text-indigo-600">Площадь (паспорт)</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">
                      {formatNumber(areaSqM, 1)} м²
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {grouped.map(({ block, items }) => (
              <section
                key={block}
                className="space-y-2.5 rounded-xl border border-slate-200/60 bg-white/60 p-3 sm:p-3.5"
              >
                <div className="flex items-baseline justify-between gap-2 border-b border-slate-200/50 pb-1.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-indigo-800">{blockTitle(block)}</p>
                  <span className="text-[10px] text-slate-400">методика</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((t) => {
                    if (t.autoCalculated) {
                      const v = auto ? pickAutoMetric(auto, t.code) : undefined;
                      return (
                        <AutoMetricField
                          key={t.code}
                          template={t}
                          value={v}
                          formulaHint={t.code === "childEventsSharePct" ? childEventsFormulaHint : undefined}
                        />
                      );
                    }
                    return (
                      <ManualMetricField
                        key={t.code}
                        template={t}
                        value={fields[t.code] ?? ""}
                        onChange={(v) => setFields((f) => ({ ...f, [t.code]: v }))}
                      />
                    );
                  })}
                </div>
              </section>
            ))}

            {scoring.ok ? null : (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/80 p-2.5 text-xs text-amber-950 sm:text-sm">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="font-semibold">Недостаёт данных</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] sm:text-xs">
                    {scoring.issues.map((issue) => (
                      <li key={issue.field}>{issue.message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <aside className="lg:sticky lg:top-20 z-20 space-y-3 self-start">
          <CalculationStickyPanel
            hasScore={!!clientPreview}
            integralScore={clientPreview?.integralScore ?? 0}
            statusLabel={clientPreview?.statusLabel ?? "—"}
            resultScore={clientPreview?.resultScore ?? 0}
            efficiencyScore={clientPreview?.efficiencyScore ?? 0}
            qualityScore={clientPreview?.qualityScore ?? 0}
            pending={pending}
            canSave={!!canSave}
            onSave={handleSave}
            saveState={saveState}
          />
        </aside>
      </div>

      {clientPreview ? (
        <section className="space-y-3" aria-label="Аналитика">
          <div className="border-t border-slate-200/80 pt-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Аналитика</h3>
          </div>
          <ScoreBreakdown result={clientPreview} compact />
          <details className="group rounded-xl border border-slate-200/70 bg-white/75 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50/80 [&::-webkit-details-marker]:hidden">
              <span>Как рассчитано (нормализация и веса)</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <div className="border-t border-slate-200/60 px-2 pb-3 pt-0">
              <p className="px-1 pb-2 text-[11px] leading-relaxed text-slate-500 sm:px-2 sm:text-xs">
                Для большинства метрик:{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">min(факт/бенчмарк, 1)×10</code> для
                удовлетворённости — к шкале 5. Вклад = вес × норм. балл.
              </p>
              <div className="overflow-x-auto rounded-lg sm:px-1">
                <table className="w-full min-w-[600px] border-separate border-spacing-y-1 text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-slate-500">
                      <th className="px-1.5 py-1.5">Блок</th>
                      <th className="px-1.5 py-1.5">Показатель</th>
                      <th className="px-1.5 py-1.5">Факт</th>
                      <th className="px-1.5 py-1.5">Бенчмарк</th>
                      <th className="px-1.5 py-1.5">/10</th>
                      <th className="px-1.5 py-1.5">Вес</th>
                      <th className="px-1.5 py-1.5">Вклад</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientPreview.blocks.flatMap((b) =>
                      b.rows.map((row) => (
                        <tr key={`${b.block}-${row.code}`} className="bg-slate-900/[0.02] text-slate-800">
                          <td className="rounded-l-md px-2 py-1.5 text-[10px] font-semibold text-indigo-700">
                            {blockTitle(b.block)}
                          </td>
                          <td className="px-2 py-1.5">{row.label}</td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-[11px]">
                            {formatNumber(row.rawValue, 2)} {row.unit}
                          </td>
                          <td className="px-2 py-1.5 text-[11px]">{formatNumber(row.benchmarkMax, 1)}</td>
                          <td className="px-2 py-1.5 font-medium">{formatNumber(row.normalizedScore, 2)}</td>
                          <td className="px-2 py-1.5 text-[11px]">{row.weight}</td>
                          <td className="rounded-r-md px-2 py-1.5 font-medium">{formatNumber(row.weightedContribution, 2)}</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </section>
      ) : null}
    </div>
  );
}
