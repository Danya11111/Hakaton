"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { syncCompanyLocationAggregates } from "@/lib/company-aggregate";
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
  id?: string;
  meta: z.infer<typeof companyMetaSchema>;
  locations: z.infer<typeof locationRowSchema>[];
}): Promise<CompanySaveState> {
  const meta = companyMetaSchema.safeParse(input.meta);
  if (!meta.success) {
    return { ok: false, message: meta.error.errors[0]?.message ?? "Ошибка данных компании." };
  }
  const locs = z.array(locationRowSchema).safeParse(input.locations);
  if (!locs.success) {
    return { ok: false, message: locs.error.errors[0]?.message ?? "Ошибка в локациях." };
  }
  if (!locs.data.some((l) => l.areaSqM > 0)) {
    return { ok: false, message: "Нужна хотя бы одна локация с площадью больше нуля." };
  }

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

    revalidatePath("/admin/companies");
    revalidatePath(`/admin/companies/${result.companyId}`);
    revalidatePath(`/companies/${result.companySlug}`);
    revalidatePath("/");
    return { ok: true, id: result.companyId };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Ошибка сохранения." };
  }
}

export async function deleteCompanyAdmin(id: string): Promise<{ ok: boolean; message?: string }> {
  const c = await prisma.company.findUnique({ where: { id }, select: { slug: true } });
  if (!c) return { ok: false, message: "Не найдено." };
  await prisma.company.delete({ where: { id } });
  revalidatePath("/admin/companies");
  revalidatePath(`/companies/${c.slug}`);
  revalidatePath("/");
  return { ok: true };
}
