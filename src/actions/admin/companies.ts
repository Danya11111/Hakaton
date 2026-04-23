"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { writeAudit } from "@/lib/audit/write-audit";
import { getActorUsername } from "@/lib/actor";
import { syncCompanyLocationAggregates } from "@/lib/company-aggregate";
import { getClientIp, getUserAgent } from "@/lib/request-meta";
import { verifyAdminCsrfToken } from "@/lib/security/csrf";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const locationRowSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional().nullable(),
  addressLine: z.string().default(""),
  areaSqM: z.coerce.number().finite().min(0),
  locationType: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
});

const companyMetaSchema = z.object({
  id: z.string().optional(),
  groupId: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().optional().nullable(),
  slug: z.string().min(1, "Укажите slug"),
  sourceOnlyInExcel: z.boolean().default(false),
});

export type CompanySaveState = { ok: boolean; message?: string; id?: string };

export async function saveCompanyAdmin(input: {
  csrf: string;
  id?: string;
  meta: z.infer<typeof companyMetaSchema>;
  locations: z.infer<typeof locationRowSchema>[];
}): Promise<CompanySaveState> {
  if (!(await verifyAdminCsrfToken(input.csrf))) {
    return { ok: false, message: "Сессия устарела. Обновите страницу и войдите снова." };
  }
  const meta = companyMetaSchema.safeParse(input.meta);
  if (!meta.success) {
    const issue = meta.error.issues[0];
    const path = issue?.path?.length ? String(issue.path[0]) : "данные";
    return { ok: false, message: `${path}: ${issue?.message ?? "Ошибка данных компании."}` };
  }
  const locs = z.array(locationRowSchema).safeParse(input.locations);
  if (!locs.success) {
    const issue = locs.error.issues[0];
    const path = issue?.path?.length ? `локация ${Number(issue.path[0]) + 1}` : "локации";
    return { ok: false, message: `${path}: ${issue?.message ?? "Ошибка в локациях."}` };
  }
  if (!locs.data.some((l) => l.areaSqM > 0)) {
    return { ok: false, message: "Нужна хотя бы одна локация с площадью больше нуля." };
  }

  const h = await headers();
  const actor = await getActorUsername();
  const ip = getClientIp(h);
  const ua = getUserAgent(h);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const slug = meta.data.slug.trim();
      const dup = await tx.company.findFirst({
        where: {
          slug,
          ...(meta.data.id ? { NOT: { id: meta.data.id } } : {}),
        },
      });
      if (dup) {
        throw new Error("Компания с таким slug уже существует.");
      }

      let companyId: string;
      let companySlug: string;
      if (meta.data.id) {
        const updated = await tx.company.update({
          where: { id: meta.data.id },
          data: {
            groupId: meta.data.groupId,
            name: meta.data.name,
            shortName: meta.data.shortName ?? null,
            slug,
            sourceOnlyInExcel: meta.data.sourceOnlyInExcel,
          },
        });
        companyId = updated.id;
        companySlug = updated.slug;
      } else {
        const created = await tx.company.create({
          data: {
            groupId: meta.data.groupId,
            name: meta.data.name,
            shortName: meta.data.shortName ?? null,
            slug,
            sourceOnlyInExcel: meta.data.sourceOnlyInExcel,
            totalAreaSqM: 0,
            locationCount: 0,
          },
        });
        companyId = created.id;
        companySlug = created.slug;
      }

      await tx.companyLocation.deleteMany({ where: { companyId } });
      if (locs.data.length) {
        for (const row of locs.data) {
          await tx.companyLocation.create({
            data: {
              ...(row.id ? { id: row.id } : {}),
              companyId,
              title: row.title ?? null,
              addressLine: row.addressLine ?? "",
              areaSqM: row.areaSqM,
              locationType: row.locationType ?? null,
              sortOrder: row.sortOrder,
            },
          });
        }
      }
      await syncCompanyLocationAggregates(companyId, tx);
      return { companyId, companySlug };
    });

    await writeAudit({
      actorUsername: actor,
      action: input.meta.id ? "company_update" : "company_create",
      entityType: "company",
      entityId: result.companyId,
      entityLabel: meta.data.name,
      metadata: { slug: result.companySlug, locations: locs.data.length },
      ipAddress: ip,
      userAgent: ua,
    });

    revalidatePath("/admin/companies");
    revalidatePath(`/admin/companies/${result.companyId}`);
    revalidatePath(`/companies/${result.companySlug}`);
    revalidatePath("/");
    return { ok: true, id: result.companyId };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Ошибка сохранения." };
  }
}

export async function deleteCompanyAdmin(input: {
  csrf: string;
  id: string;
}): Promise<{ ok: boolean; message?: string }> {
  if (!(await verifyAdminCsrfToken(input.csrf))) {
    return { ok: false, message: "Сессия устарела. Обновите страницу и войдите снова." };
  }
  const h = await headers();
  const actor = await getActorUsername();
  const ip = getClientIp(h);
  const ua = getUserAgent(h);

  const c = await prisma.company.findUnique({ where: { id: input.id }, select: { slug: true, name: true } });
  if (!c) return { ok: false, message: "Не найдено." };
  await prisma.company.delete({ where: { id: input.id } });

  await writeAudit({
    actorUsername: actor,
    action: "company_delete",
    entityType: "company",
    entityId: input.id,
    entityLabel: c.name,
    metadata: { slug: c.slug },
    ipAddress: ip,
    userAgent: ua,
  });

  revalidatePath("/admin/companies");
  revalidatePath(`/companies/${c.slug}`);
  revalidatePath("/");
  return { ok: true };
}
