import { z } from "zod";
import { getTemplatesForGroup } from "./scoring-templates";

function positiveIntString(field: string) {
  return z
    .string()
    .trim()
    .min(1, `Заполните поле «${field}».`)
    .transform((s) => Number(s.replace(",", ".")))
    .refine((n) => Number.isFinite(n), "Введите корректное число.")
    .refine((n) => Number.isInteger(n), "Значение должно быть целым числом.")
    .refine((n) => n > 0, "Значение должно быть больше нуля.");
}

function nonNegativeNumberString(label: string, max?: number) {
  const base = z
    .string()
    .trim()
    .min(1, `Заполните поле «${label}».`)
    .transform((s) => Number(s.replace(",", ".")))
    .refine((n) => Number.isFinite(n), "Введите корректное число.")
    .refine((n) => n >= 0, "Значение не может быть отрицательным.");

  if (typeof max === "number") {
    return base.refine((n) => n <= max, `Максимальное значение для «${label}» — ${max}.`);
  }
  return base;
}

export function buildEvaluationFormSchema(groupCode: string) {
  const manual = getTemplatesForGroup(groupCode).filter((t) => !t.autoCalculated);
  const shape: Record<string, z.ZodTypeAny> = {
    periodLabel: z.string().trim().min(1, "Укажите период или название отчёта."),
    staffCount: positiveIntString("Число штатных ставок"),
    populationInZone: positiveIntString("Численность жителей в зоне охвата"),
  };

  for (const t of manual) {
    if (t.inputMode === "satisfaction") {
      shape[t.code] = nonNegativeNumberString(t.label, 5);
    } else if (t.inputMode === "percent") {
      shape[t.code] = nonNegativeNumberString(t.label, 100);
    } else {
      shape[t.code] = nonNegativeNumberString(t.label);
    }
  }

  return z.object(shape);
}

export type EvaluationFormValues = z.infer<ReturnType<typeof buildEvaluationFormSchema>>;
