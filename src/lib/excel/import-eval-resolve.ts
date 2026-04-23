import type { Prisma } from "@prisma/client";
import { persistEvaluationFromForm } from "@/lib/evaluation-persist";
import type { EvaluationDataBlock, RowIssue } from "@/lib/excel/import-types";
import { jsonFormToFormRecord, num, str } from "@/lib/excel/import-shared";

export function resolveEvaluationImportRow(input: {
  r: Record<string, unknown>;
  groupCode: string;
  areaSqM: number;
  sheet: string;
  row: number;
}): { ok: true; dataBlock: EvaluationDataBlock } | { ok: false; issues: RowIssue[] } {
  const { r, groupCode, areaSqM, sheet, row } = input;
  const rawStr = str(r.rawPayloadJson);
  let persisted: ReturnType<typeof persistEvaluationFromForm> | null = null;
  if (rawStr) {
    try {
      const parsed = JSON.parse(rawStr) as Record<string, unknown>;
      const form = jsonFormToFormRecord(parsed);
      persisted = persistEvaluationFromForm({
        groupCode,
        areaSqM,
        form,
      });
    } catch {
      persisted = null;
    }
  }

  let dataBlock: EvaluationDataBlock;

  if (persisted && persisted.ok) {
    dataBlock = persisted.data;
  } else {
    const periodLabel = str(r.periodLabel);
    if (!periodLabel) {
      return {
        ok: false,
        issues: [
          {
            sheet,
            row,
            column: "periodLabel",
            message: "Нет periodLabel и не удалось восстановить расчёт из rawPayloadJson.",
            severity: "fatal",
          },
        ],
      };
    }
    const staffCount = Math.trunc(num(r.staffCount));
    const populationInZone = Math.trunc(num(r.populationInZone));
    if (staffCount <= 0 || populationInZone <= 0) {
      return {
        ok: false,
        issues: [
          {
            sheet,
            row,
            column: "staffCount",
            message: "Некорректные staffCount / populationInZone.",
            severity: "fatal",
          },
        ],
      };
    }
    let rawPayloadJson: Prisma.InputJsonValue = {};
    if (rawStr) {
      try {
        rawPayloadJson = JSON.parse(rawStr) as Prisma.InputJsonValue;
      } catch {
        rawPayloadJson = { raw: rawStr };
      }
    }
    dataBlock = {
      periodLabel,
      staffCount,
      populationInZone,
      integralScore: num(r.integralScore),
      statusLabel: str(r.statusLabel) || "—",
      resultScore: num(r.resultScore),
      efficiencyScore: num(r.efficiencyScore),
      qualityScore: num(r.qualityScore),
      rawPayloadJson,
      breakdownJson: JSON.parse("[]") as Prisma.InputJsonValue,
    };
  }

  return { ok: true, dataBlock };
}
