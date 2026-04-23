import type { CriterionInputMode, CriterionTemplate, ScoringBlock } from "./scoring-templates";
import { getTemplatesForGroup } from "./scoring-templates";

export interface AutoMetricsInput {
  attendance: number;
  areaSqM: number;
  staffCount: number;
  populationInZone: number;
}

export interface AutoMetricsResult {
  attendancePer100m2: number;
  attendancePerStaff: number;
  coveragePct: number;
  /** Group A: derived from childEventsCount / eventsCount */
  childEventsSharePct?: number;
}

export function pickAutoMetric(auto: AutoMetricsResult, code: string): number | undefined {
  switch (code) {
    case "attendancePer100m2":
      return auto.attendancePer100m2;
    case "attendancePerStaff":
      return auto.attendancePerStaff;
    case "coveragePct":
      return auto.coveragePct;
    case "childEventsSharePct":
      return auto.childEventsSharePct;
    default:
      return undefined;
  }
}

export interface MetricBreakdownRow {
  code: string;
  label: string;
  block: ScoringBlock;
  rawValue: number;
  normalizedScore: number;
  weight: number;
  weightedContribution: number;
  unit: string;
  benchmarkMax: number;
  inputMode: CriterionInputMode;
  autoCalculated: boolean;
}

export interface BlockBreakdown {
  block: ScoringBlock;
  blockScore: number;
  rows: MetricBreakdownRow[];
}

export interface ScoringResult {
  resultScore: number;
  efficiencyScore: number;
  qualityScore: number;
  integralScore: number;
  statusLabel: string;
  blocks: BlockBreakdown[];
}

export interface ScoringValidationIssue {
  field: string;
  message: string;
}

export function statusFromIntegral(integral: number): string {
  if (integral > 85) return "Лидер";
  if (integral >= 70) return "Выше среднего";
  if (integral >= 50) return "Средний уровень";
  return "Требует вмешательства";
}

export function normalizeRawToTen(
  raw: number,
  benchmarkMax: number,
  inputMode: CriterionInputMode,
): number {
  if (!Number.isFinite(raw) || !Number.isFinite(benchmarkMax) || benchmarkMax <= 0) {
    return 0;
  }
  if (inputMode === "satisfaction") {
    return Math.min(raw / benchmarkMax, 1) * 10;
  }
  return Math.min(raw / benchmarkMax, 1) * 10;
}

export function tryComputeAutoMetrics(input: AutoMetricsInput): {
  ok: true;
  value: AutoMetricsResult;
} | { ok: false; issues: ScoringValidationIssue[] } {
  const issues: ScoringValidationIssue[] = [];
  if (!Number.isFinite(input.attendance) || input.attendance < 0) {
    issues.push({ field: "attendance", message: "Укажите посещаемость (неотрицательное число)." });
  }
  if (!Number.isFinite(input.areaSqM) || input.areaSqM <= 0) {
    issues.push({ field: "areaSqM", message: "Площадь должна быть больше нуля." });
  }
  if (!Number.isInteger(input.staffCount) || input.staffCount <= 0) {
    issues.push({ field: "staffCount", message: "Число штатных ставок должно быть целым и больше нуля." });
  }
  if (!Number.isInteger(input.populationInZone) || input.populationInZone <= 0) {
    issues.push({
      field: "populationInZone",
      message: "Численность жителей в зоне должна быть целой и больше нуля.",
    });
  }
  if (issues.length) return { ok: false, issues };

  const attendancePer100m2 = (input.attendance / input.areaSqM) * 100;
  const attendancePerStaff = input.attendance / input.staffCount;
  const coveragePct = (input.attendance / input.populationInZone) * 100;

  return {
    ok: true,
    value: { attendancePer100m2, attendancePerStaff, coveragePct },
  };
}

export function integralFromBlocks(
  resultScore: number,
  efficiencyScore: number,
  qualityScore: number,
): number {
  const r = Math.max(resultScore, 0);
  const e = Math.max(efficiencyScore, 0);
  const q = Math.max(qualityScore, 0);
  const raw =
    Math.pow(r, 0.5) * Math.pow(e, 0.3) * Math.pow(q, 0.2) * 10;
  return Math.round(raw * 10) / 10;
}

function blockScoreFromRows(rows: MetricBreakdownRow[]): number {
  return rows.reduce((acc, row) => acc + row.weightedContribution, 0);
}

export function computeScoringForGroup(params: {
  groupCode: string;
  /** Значения по кодам показателей; авто-поля могут быть переданы или вычислены */
  values: Record<string, number | undefined>;
  areaSqM: number;
  staffCount: number;
  populationInZone: number;
}): { ok: true; result: ScoringResult; auto: AutoMetricsResult } | { ok: false; issues: ScoringValidationIssue[] } {
  const templates = getTemplatesForGroup(params.groupCode);
  const attendance = params.values.attendance;
  const autoInput: AutoMetricsInput = {
    attendance: attendance ?? NaN,
    areaSqM: params.areaSqM,
    staffCount: params.staffCount,
    populationInZone: params.populationInZone,
  };
  const autoTry = tryComputeAutoMetrics(autoInput);
  if (!autoTry.ok) {
    return { ok: false, issues: autoTry.issues };
  }
  const auto = autoTry.value;

  const merged: Record<string, number> = { ...auto };
  for (const t of templates) {
    if (t.autoCalculated) continue;
    const v = params.values[t.code];
    if (v === undefined || !Number.isFinite(v)) {
      return {
        ok: false,
        issues: [{ field: t.code, message: `Заполните поле «${t.label}».` }],
      };
    }
    merged[t.code] = v;
  }

  if (params.groupCode === "A") {
    const ec = merged.eventsCount;
    const cec = params.values.childEventsCount;
    if (cec !== undefined && Number.isFinite(cec)) {
      merged.childEventsSharePct = ec > 0 ? (cec / ec) * 100 : 0;
    } else {
      const legacy = params.values.childEventsSharePct;
      if (legacy !== undefined && Number.isFinite(legacy)) {
        merged.childEventsSharePct = legacy;
      } else {
        return {
          ok: false,
          issues: [
            { field: "childEventsCount", message: "Укажите количество детских мероприятий (целое неотрицательное число)." },
          ],
        };
      }
    }
  }

  const autoOut: AutoMetricsResult = { ...auto };
  if (params.groupCode === "A" && merged.childEventsSharePct !== undefined) {
    autoOut.childEventsSharePct = merged.childEventsSharePct;
  }

  const blocks: ScoringBlock[] = ["RESULT", "EFFICIENCY", "QUALITY"];
  const breakdown: BlockBreakdown[] = [];

  for (const block of blocks) {
    const rows: MetricBreakdownRow[] = [];
    for (const t of templates.filter((x) => x.block === block)) {
      if (t.includeInBreakdown === false) continue;
      const rawValue = merged[t.code];
      if (!Number.isFinite(rawValue)) {
        return {
          ok: false,
          issues: [{ field: t.code, message: `Недостаточно данных для «${t.label}».` }],
        };
      }
      const normalizedScore = normalizeRawToTen(rawValue, t.benchmarkMax, t.inputMode);
      const weightedContribution = t.weight * normalizedScore;
      rows.push({
        code: t.code,
        label: t.label,
        block: t.block,
        rawValue,
        normalizedScore,
        weight: t.weight,
        weightedContribution,
        unit: t.unit,
        benchmarkMax: t.benchmarkMax,
        inputMode: t.inputMode,
        autoCalculated: t.autoCalculated,
      });
    }
    const blockScore = blockScoreFromRows(rows);
    breakdown.push({ block, blockScore, rows });
  }

  const resultScore = breakdown.find((b) => b.block === "RESULT")?.blockScore ?? 0;
  const efficiencyScore = breakdown.find((b) => b.block === "EFFICIENCY")?.blockScore ?? 0;
  const qualityScore = breakdown.find((b) => b.block === "QUALITY")?.blockScore ?? 0;
  const integralScore = integralFromBlocks(resultScore, efficiencyScore, qualityScore);
  const statusLabel = statusFromIntegral(integralScore);

  return {
    ok: true,
    auto: autoOut,
    result: {
      resultScore,
      efficiencyScore,
      qualityScore,
      integralScore,
      statusLabel,
      blocks: breakdown,
    },
  };
}

export function collectManualFieldCodes(groupCode: string): string[] {
  return getTemplatesForGroup(groupCode)
    .filter((t) => !t.autoCalculated)
    .map((t) => t.code);
}

export function groupTemplatesByBlock(templates: CriterionTemplate[]) {
  const order: ScoringBlock[] = ["RESULT", "EFFICIENCY", "QUALITY"];
  return order.map((block) => ({
    block,
    items: templates.filter((t) => t.block === block),
  }));
}
