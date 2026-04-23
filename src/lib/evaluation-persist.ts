import { Prisma } from "@prisma/client";
import { buildEvaluationFormSchema } from "@/lib/criteria-schema";
import { computeScoringForGroup } from "@/lib/scoring";
import { getTemplatesForGroup } from "@/lib/scoring-templates";

export type EvaluationPersistInput = {
  groupCode: string;
  areaSqM: number;
  /** Строковые поля формы (как с публичной страницы) */
  form: Record<string, unknown>;
};

export type EvaluationPersistResult =
  | {
      ok: true;
      data: {
        periodLabel: string;
        staffCount: number;
        populationInZone: number;
        integralScore: number;
        statusLabel: string;
        resultScore: number;
        efficiencyScore: number;
        qualityScore: number;
        rawPayloadJson: Prisma.InputJsonValue;
        breakdownJson: Prisma.InputJsonValue;
      };
    }
  | { ok: false; message: string; field?: string };

export function persistEvaluationFromForm(input: EvaluationPersistInput): EvaluationPersistResult {
  const schema = buildEvaluationFormSchema(input.groupCode);
  const parsed = schema.safeParse(input.form);
  if (!parsed.success) {
    const err = parsed.error.errors[0];
    return { ok: false, message: err?.message ?? "Ошибка валидации.", field: err?.path.join(".") };
  }

  const values: Record<string, number | undefined> = {};
  const manualTemplates = getTemplatesForGroup(input.groupCode).filter((t) => !t.autoCalculated);
  const row = parsed.data as Record<string, unknown>;
  for (const t of manualTemplates) {
    values[t.code] = row[t.code] as number;
  }

  const scoring = computeScoringForGroup({
    groupCode: input.groupCode,
    values,
    areaSqM: input.areaSqM,
    staffCount: parsed.data.staffCount,
    populationInZone: parsed.data.populationInZone,
  });

  if (!scoring.ok) {
    return { ok: false, message: scoring.issues[0]?.message ?? "Недостаточно данных для расчёта." };
  }

  const rawPayloadJson = JSON.parse(
    JSON.stringify({ ...parsed.data, auto: scoring.auto, values }),
  ) as Prisma.InputJsonValue;
  const breakdownJson = JSON.parse(JSON.stringify(scoring.result.blocks)) as Prisma.InputJsonValue;

  return {
    ok: true,
    data: {
      periodLabel: parsed.data.periodLabel,
      staffCount: parsed.data.staffCount,
      populationInZone: parsed.data.populationInZone,
      integralScore: scoring.result.integralScore,
      statusLabel: scoring.result.statusLabel,
      resultScore: scoring.result.resultScore,
      efficiencyScore: scoring.result.efficiencyScore,
      qualityScore: scoring.result.qualityScore,
      rawPayloadJson,
      breakdownJson,
    },
  };
}
