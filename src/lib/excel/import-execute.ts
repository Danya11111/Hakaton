import { prisma } from "@/lib/prisma";
import { syncCompanyLocationAggregates } from "@/lib/company-aggregate";
import type { ImportCounters, ImportPayloadV1, ImportResult } from "@/lib/excel/import-types";

export async function executeImportPayload(payload: ImportPayloadV1): Promise<ImportResult> {
  const mode = payload.mode;
  const counters: ImportCounters = {
    groups: { created: 0, updated: 0, skipped: 0 },
    companies: { created: 0, updated: 0, skipped: 0 },
    locations: { created: 0, updated: 0, skipped: 0 },
    evaluations: { created: 0, updated: 0, skipped: 0 },
  };
  const errors: { row: string; message: string }[] = [];

  try {
    await prisma.$transaction(async (tx) => {
      if (mode === "replace_companies") {
        await tx.company.deleteMany();
      }

      for (const g of payload.groups) {
        if (!g.code) {
          counters.groups.skipped++;
          continue;
        }
        const existing = await tx.group.findUnique({ where: { code: g.code } });
        const data = {
          code: g.code,
          slug: g.slug,
          title: g.title,
          unitType: g.unitType,
          description: g.description,
          sortOrder: g.sortOrder,
        };
        if (existing) {
          await tx.group.update({ where: { code: g.code }, data });
          counters.groups.updated++;
        } else {
          await tx.group.create({ data });
          counters.groups.created++;
        }
      }

      const companyBySlug = new Map<string, { id: string; slug: string }>();

      for (const c of payload.companies) {
        const slug = c.slug;
        const groupCode = c.groupCode;
        const group = await tx.group.findUnique({ where: { code: groupCode } });
        if (!group) {
          errors.push({ row: `companies:${slug}`, message: `Группа ${groupCode} не найдена.` });
          counters.companies.skipped++;
          continue;
        }
        const existing = await tx.company.findUnique({ where: { slug } });
        const name = c.name;
        const shortName = c.shortName;
        const sourceOnlyInExcel = c.sourceOnlyInExcel;
        const totalAreaSqM = c.totalAreaSqM;
        const locationCount = c.locationCount;
        if (existing) {
          await tx.company.update({
            where: { slug },
            data: {
              groupId: group.id,
              name,
              shortName,
              sourceOnlyInExcel,
            },
          });
          companyBySlug.set(slug, { id: existing.id, slug });
          counters.companies.updated++;
        } else {
          const created = await tx.company.create({
            data: {
              groupId: group.id,
              slug,
              name,
              shortName,
              totalAreaSqM,
              locationCount,
              sourceOnlyInExcel,
            },
          });
          companyBySlug.set(slug, { id: created.id, slug });
          counters.companies.created++;
        }
      }

      const allCompanies = await tx.company.findMany({ select: { id: true, slug: true } });
      for (const c of allCompanies) companyBySlug.set(c.slug, c);

      const touchedCompanies = new Set<string>();

      for (let i = 0; i < payload.locations.length; i++) {
        const loc = payload.locations[i]!;
        const comp = companyBySlug.get(loc.companySlug);
        if (!comp) {
          errors.push({
            row: `locations#${i + 2}`,
            message: `Компания ${loc.companySlug} не найдена.`,
          });
          counters.locations.skipped++;
          continue;
        }
        let handled = false;
        if (loc.id) {
          const found = await tx.companyLocation.findFirst({
            where: { id: loc.id, companyId: comp.id },
          });
          if (found) {
            await tx.companyLocation.update({
              where: { id: loc.id },
              data: {
                title: loc.title,
                addressLine: loc.addressLine,
                areaSqM: loc.areaSqM,
                locationType: loc.locationType,
                sortOrder: loc.sortOrder,
              },
            });
            counters.locations.updated++;
            touchedCompanies.add(comp.id);
            handled = true;
          }
        }
        if (!handled) {
          const candidates = await tx.companyLocation.findMany({
            where: { companyId: comp.id, addressLine: loc.addressLine },
          });
          const dup = candidates.find((l) => (l.title ?? "") === (loc.title ?? ""));
          if (dup) {
            await tx.companyLocation.update({
              where: { id: dup.id },
              data: {
                areaSqM: loc.areaSqM,
                locationType: loc.locationType,
                sortOrder: loc.sortOrder,
                title: loc.title,
                addressLine: loc.addressLine,
              },
            });
            counters.locations.updated++;
          } else {
            await tx.companyLocation.create({
              data: {
                companyId: comp.id,
                title: loc.title,
                addressLine: loc.addressLine,
                areaSqM: loc.areaSqM,
                locationType: loc.locationType,
                sortOrder: loc.sortOrder,
              },
            });
            counters.locations.created++;
          }
          touchedCompanies.add(comp.id);
        }
      }

      for (const companyId of touchedCompanies) {
        await syncCompanyLocationAggregates(companyId, tx);
      }

      for (let i = 0; i < payload.evaluations.length; i++) {
        const ev = payload.evaluations[i]!;
        const comp = companyBySlug.get(ev.companySlug);
        if (!comp) {
          errors.push({
            row: `evaluations#${i + 2}`,
            message: `Компания ${ev.companySlug} не найдена.`,
          });
          counters.evaluations.skipped++;
          continue;
        }
        const dataBlock = ev.dataBlock;
        const eid = ev.id;
        if (eid) {
          const ex = await tx.evaluation.findUnique({ where: { id: eid } });
          if (ex && ex.companyId === comp.id) {
            await tx.evaluation.update({
              where: { id: eid },
              data: { ...dataBlock },
            });
            counters.evaluations.updated++;
            continue;
          }
        }
        await tx.evaluation.create({
          data: {
            ...(eid ? { id: eid } : {}),
            companyId: comp.id,
            ...dataBlock,
          },
        });
        counters.evaluations.created++;
      }
    });
  } catch (e) {
    errors.push({
      row: "_transaction",
      message: e instanceof Error ? e.message : "Ошибка применения импорта (откат транзакции).",
    });
    return { ok: false, mode, counters, errors };
  }

  return { ok: errors.length === 0, mode, counters, errors };
}
