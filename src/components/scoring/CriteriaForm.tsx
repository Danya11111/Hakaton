"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Calculator, Save } from "lucide-react";
import { saveCompanyEvaluation, type SaveEvaluationState } from "@/actions/evaluation";
import { ScoreBreakdown } from "@/components/scoring/ScoreBreakdown";
import { ScoreSummary } from "@/components/scoring/ScoreSummary";
import { Button } from "@/components/ui/button";
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
import { formatNumber } from "@/lib/utils";

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

function CriterionField({
  template,
  value,
  onChange,
  disabled,
}: {
  template: CriterionTemplate;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const placeholder =
    template.inputMode === "satisfaction"
      ? "От 0 до 5"
      : template.inputMode === "percent"
        ? "Например, 42"
        : "Введите значение";

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <Label htmlFor={template.code} className="text-sm text-slate-800">
          {template.label}
        </Label>
        <span className="text-xs font-medium text-slate-500">{template.unit}</span>
      </div>
      <Input
        id={template.code}
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-xs leading-relaxed text-slate-500">{template.helpText}</p>
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

  return (
    <div className="space-y-8">
      {clientPreview ? (
        <ScoreSummary
          integralScore={clientPreview.integralScore}
          statusLabel={clientPreview.statusLabel}
          resultScore={clientPreview.resultScore}
          efficiencyScore={clientPreview.efficiencyScore}
          qualityScore={clientPreview.qualityScore}
        />
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-slate-600 backdrop-blur">
          Как только все обязательные поля будут заполнены, здесь появится интегральный балл и статус по шкале
          методики.
        </div>
      )}

      {clientPreview ? <ScoreBreakdown result={clientPreview} /> : <ScoreBreakdown result={null} />}

      <Card className="border-white/60 bg-white/85 shadow-card backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calculator className="h-5 w-5 text-indigo-600" />
            Расчёт эффективности
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Все показатели подтягиваются из шаблона методики для вашей группы. Автоматические метрики считаются из
            посещаемости, площади и базовых параметров.
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          <section className="space-y-4 rounded-2xl bg-slate-900/[0.02] p-4 ring-1 ring-slate-900/5">
            <p className="text-sm font-semibold text-slate-900">Базовые параметры</p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="periodLabel">Период / отчёт</Label>
                <Input
                  id="periodLabel"
                  placeholder="Например, 2025 · I полугодие"
                  value={fields.periodLabel}
                  onChange={(e) => setFields((f) => ({ ...f, periodLabel: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="populationInZone">Численность жителей в зоне охвата</Label>
                <Input
                  id="populationInZone"
                  inputMode="numeric"
                  placeholder="Например, 12000"
                  value={fields.populationInZone}
                  onChange={(e) => setFields((f) => ({ ...f, populationInZone: e.target.value }))}
                />
                <p className="text-xs text-slate-500">Используется для расчёта охвата населения.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="staffCount">Штатные ставки</Label>
                <Input
                  id="staffCount"
                  inputMode="numeric"
                  placeholder="Например, 32"
                  value={fields.staffCount}
                  onChange={(e) => setFields((f) => ({ ...f, staffCount: e.target.value }))}
                />
                <p className="text-xs text-slate-500">Нужны для показателей на одну ставку.</p>
              </div>
            </div>
            <div className="rounded-xl bg-white/80 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-900/5">
              <p className="font-semibold text-slate-900">Площадь из паспорта учреждения</p>
              <p className="mt-1">
                {formatNumber(areaSqM, 1)} м² — значение зафиксировано в справочнике и участвует в автоматических
                метриках.
              </p>
            </div>
          </section>

          {grouped.map(({ block, items }) => (
            <section key={block} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{blockTitle(block)}</p>
                <span className="text-xs uppercase tracking-wide text-slate-400">шаблон методики</span>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {items.map((t) => {
                  if (t.autoCalculated) {
                    const v = auto ? pickAutoMetric(auto, t.code) : undefined;
                    return (
                      <div
                        key={t.code}
                        className="space-y-2 rounded-2xl bg-slate-900/[0.02] p-4 ring-1 ring-dashed ring-slate-200"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-slate-800">{t.label}</Label>
                          <span className="text-xs font-medium text-slate-500">{t.unit}</span>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2 text-lg font-semibold text-slate-900 ring-1 ring-slate-900/5">
                          {v !== undefined ? formatNumber(v, 2) : "—"}
                        </div>
                        <p className="text-xs leading-relaxed text-slate-500">{t.helpText}</p>
                      </div>
                    );
                  }
                  return (
                    <CriterionField
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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="gradient"
              className="w-full sm:w-auto"
              disabled={pending || !zodPreview || !scoring.ok}
              onClick={handleSave}
            >
              <Save className="h-4 w-4" />
              Сохранить расчёт
            </Button>
            {saveState.status === "error" ? (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {saveState.message}
              </div>
            ) : saveState.status === "success" ? (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-medium text-emerald-700"
              >
                {saveState.message}
              </motion.p>
            ) : (
              <p className="text-xs text-slate-500">
                Сохранение доступно, когда все поля заполнены корректно и расчёт согласован на клиенте и сервере.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {scoring.ok ? null : (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 backdrop-blur">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Нужно чуть больше данных</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {scoring.issues.map((issue) => (
                <li key={issue.field}>{issue.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {clientPreview ? (
        <Card className="border-white/60 bg-white/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg">Как рассчитано</CardTitle>
            <p className="text-sm text-muted-foreground">
              Нормализация: для большинства показателей{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">min(факт / бенчмарк, 1) × 10</code>, для
              удовлетворённости — относительно 5 баллов. Вклад метрики = вес × нормализованный балл.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2">Блок</th>
                  <th className="px-2">Показатель</th>
                  <th className="px-2">Факт</th>
                  <th className="px-2">Бенчмарк</th>
                  <th className="px-2">Нормализация /10</th>
                  <th className="px-2">Вес</th>
                  <th className="px-2">Вклад</th>
                </tr>
              </thead>
              <tbody>
                {clientPreview.blocks.flatMap((b) =>
                  b.rows.map((row) => (
                    <tr key={`${b.block}-${row.code}`} className="rounded-xl bg-slate-900/[0.02] ring-1 ring-slate-900/5">
                      <td className="rounded-l-xl px-3 py-2 text-xs font-semibold text-indigo-700">
                        {blockTitle(b.block)}
                      </td>
                      <td className="px-3 py-2 text-slate-800">{row.label}</td>
                      <td className="px-3 py-2">
                        {formatNumber(row.rawValue, 2)} {row.unit}
                      </td>
                      <td className="px-3 py-2">{formatNumber(row.benchmarkMax, 1)}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">
                        {formatNumber(row.normalizedScore, 2)}
                      </td>
                      <td className="px-3 py-2">{row.weight}</td>
                      <td className="rounded-r-xl px-3 py-2 font-semibold text-slate-900">
                        {formatNumber(row.weightedContribution, 2)}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
