"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { persistEvaluationFromForm } from "@/lib/evaluation-persist";

export type SaveEvaluationState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export async function saveCompanyEvaluation(input: {
  companyId: string;
  companySlug: string;
  groupCode: string;
  areaSqM: number;
  form: Record<string, unknown>;
}): Promise<SaveEvaluationState> {
  const persisted = persistEvaluationFromForm({
    groupCode: input.groupCode,
    areaSqM: input.areaSqM,
    form: input.form,
  });

  if (!persisted.ok) {
    return { status: "error", message: persisted.message };
  }

  await prisma.evaluation.create({
    data: {
      companyId: input.companyId,
      ...persisted.data,
    },
  });

  revalidatePath(`/companies/${input.companySlug}`);
  revalidatePath(`/admin/companies/${input.companyId}`);
  return { status: "success", message: "Расчёт сохранён и добавлен в историю." };
}
