"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { writeAudit } from "@/lib/audit/write-audit";
import { getActorUsername } from "@/lib/actor";
import { persistEvaluationFromForm } from "@/lib/evaluation-persist";
import { getClientIp, getUserAgent } from "@/lib/request-meta";
import { verifyAdminCsrfToken } from "@/lib/security/csrf";
import { prisma } from "@/lib/prisma";

export type EvalSaveState = { ok: boolean; message?: string };

export async function saveEvaluationAdmin(input: {
  csrf: string;
  id?: string;
  companyId: string;
  companySlug: string;
  groupCode: string;
  areaSqM: number;
  form: Record<string, unknown>;
}): Promise<EvalSaveState> {
  if (!(await verifyAdminCsrfToken(input.csrf))) {
    return { ok: false, message: "Сессия устарела. Обновите страницу и войдите снова." };
  }
  const h = await headers();
  const actor = await getActorUsername();
  const ip = getClientIp(h);
  const ua = getUserAgent(h);

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
    await writeAudit({
      actorUsername: actor,
      action: "evaluation_update",
      entityType: "evaluation",
      entityId: input.id,
      entityLabel: `${input.companySlug} — ${persisted.data.periodLabel}`,
      metadata: { companySlug: input.companySlug },
      ipAddress: ip,
      userAgent: ua,
    });
  } else {
    const created = await prisma.evaluation.create({
      data: {
        companyId: input.companyId,
        ...persisted.data,
      },
    });
    await writeAudit({
      actorUsername: actor,
      action: "evaluation_create",
      entityType: "evaluation",
      entityId: created.id,
      entityLabel: `${input.companySlug} — ${persisted.data.periodLabel}`,
      metadata: { companySlug: input.companySlug },
      ipAddress: ip,
      userAgent: ua,
    });
  }

  revalidatePath(`/companies/${input.companySlug}`);
  revalidatePath(`/admin/companies/${input.companyId}`);
  return { ok: true };
}

export async function deleteEvaluationAdmin(input: {
  csrf: string;
  id: string;
  companyId: string;
  companySlug: string;
}): Promise<EvalSaveState> {
  if (!(await verifyAdminCsrfToken(input.csrf))) {
    return { ok: false, message: "Сессия устарела. Обновите страницу и войдите снова." };
  }
  const h = await headers();
  const actor = await getActorUsername();
  const ip = getClientIp(h);
  const ua = getUserAgent(h);

  const existing = await prisma.evaluation.findFirst({
    where: { id: input.id, companyId: input.companyId },
    select: { periodLabel: true },
  });
  const res = await prisma.evaluation.deleteMany({ where: { id: input.id, companyId: input.companyId } });
  if (res.count === 0) {
    return { ok: false, message: "Запись не найдена." };
  }
  await writeAudit({
    actorUsername: actor,
    action: "evaluation_delete",
    entityType: "evaluation",
    entityId: input.id,
    entityLabel: existing?.periodLabel
      ? `${input.companySlug} — ${existing.periodLabel}`
      : input.companySlug,
    metadata: { companySlug: input.companySlug },
    ipAddress: ip,
    userAgent: ua,
  });

  revalidatePath(`/companies/${input.companySlug}`);
  revalidatePath(`/admin/companies/${input.companyId}`);
  return { ok: true };
}
