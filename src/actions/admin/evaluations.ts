"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { persistEvaluationFromForm } from "@/lib/evaluation-persist";

export type EvalSaveState = { ok: boolean; message?: string };

export async function saveEvaluationAdmin(input: {
  id?: string;
  companyId: string;
  companySlug: string;
  groupCode: string;
  areaSqM: number;
  form: Record<string, unknown>;
}): Promise<EvalSaveState> {
  const persisted = persistEvaluationFromForm({
    groupCode: input.groupCode,
    areaSqM: input.areaSqM,
    form: input.form,
  });
  if (!persisted.ok) {
    return { ok: false, message: persisted.message };
  }

  if (input.id) {
    const existing = await prisma.evaluation.findFirst({
      where: { id: input.id, companyId: input.companyId },
    });
    if (!existing) {
      return { ok: false, message: "Расчёт не найден." };
    }
    await prisma.evaluation.update({
      where: { id: input.id },
      data: {
        companyId: input.companyId,
        ...persisted.data,
      },
    });
  } else {
    await prisma.evaluation.create({
      data: {
        companyId: input.companyId,
        ...persisted.data,
      },
    });
  }

  revalidatePath(`/companies/${input.companySlug}`);
  revalidatePath(`/admin/companies/${input.companyId}`);
  return { ok: true };
}

export async function deleteEvaluationAdmin(input: {
  id: string;
  companyId: string;
  companySlug: string;
}): Promise<EvalSaveState> {
  const res = await prisma.evaluation.deleteMany({ where: { id: input.id, companyId: input.companyId } });
  if (res.count === 0) {
    return { ok: false, message: "Запись не найдена." };
  }
  revalidatePath(`/companies/${input.companySlug}`);
  revalidatePath(`/admin/companies/${input.companyId}`);
  return { ok: true };
}
