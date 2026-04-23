import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncCompanyLocationAggregates } from "@/lib/company-aggregate";
import { persistEvaluationFromForm } from "@/lib/evaluation-persist";
import { parseWorkbook, sheetToJson, SHEET_COMPANIES, SHEET_EVALUATIONS, SHEET_GROUPS, SHEET_LOCATIONS } from "@/lib/excel/workbook";

export type ImportMode = "merge" | "replace_companies";

export type ImportCounters = {
  groups: { created: number; updated: number; skipped: number };
  companies: { created: number; updated: number; skipped: number };
  locations: { created: number; updated: number; skipped: number };
  evaluations: { created: number; updated: number; skipped: number };
};

export type ImportResult = {
  ok: boolean;
  mode: ImportMode;
  counters: ImportCounters;
  errors: { row: string; message: string }[];
};

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function num(v: unknown): number {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function bool(v: unknown): boolean {
  const s = str(v).toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "да";
}

function jsonFormToFormRecord(form: Record<string, unknown>): Record<string, unknown> {
  const skip = new Set(["auto", "values"]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(form)) {
    if (skip.has(k)) continue;
    if (v === null || v === undefined) out[k] = "";
    else if (typeof v === "number" || typeof v === "boolean") out[k] = String(v);
    else if (typeof v === "string") out[k] = v;
    else out[k] = JSON.stringify(v);
  }
  return out;
}

export async function importCompaniesWorkbook(buffer: ArrayBuffer, mode: ImportMode): Promise<ImportResult> {
  const counters: ImportCounters = {
    groups: { created: 0, updated: 0, skipped: 0 },
    companies: { created: 0, updated: 0, skipped: 0 },
    locations: { created: 0, updated: 0, skipped: 0 },
    evaluations: { created: 0, updated: 0, skipped: 0 },
  };
  const errors: { row: string; message: string }[] = [];

  const wb = parseWorkbook(buffer);

  await prisma.$transaction(async (tx) => {
    if (mode === "replace_companies") {
      await tx.company.deleteMany();
    }

    const groupRows = sheetToJson<Record<string, unknown>>(wb, SHEET_GROUPS);
    for (let i = 0; i < groupRows.length; i++) {
      const r = groupRows[i];
      const code = str(r.code);
      if (!code) {
        counters.groups.skipped++;
        continue;
      }
      const existing = await tx.group.findUnique({ where: { code } });
      const data = {
        code,
        slug: str(r.slug) || code.toLowerCase(),
        title: str(r.title) || code,
        unitType: str(r.unitType) || "",
        description: str(r.description) || "",
        sortOrder: Number.isFinite(num(r.sortOrder)) ? Math.trunc(num(r.sortOrder)) : 0,
      };
      if (existing) {
        await tx.group.update({ where: { code }, data });
        counters.groups.updated++;
      } else {
        await tx.group.create({ data });
        counters.groups.created++;
      }
    }

    const companyRows = sheetToJson<Record<string, unknown>>(wb, SHEET_COMPANIES);
    const companyBySlug = new Map<string, { id: string; slug: string }>();

    for (let i = 0; i < companyRows.length; i++) {
      const r = companyRows[i];
      const slug = str(r.slug);
      const groupCode = str(r.groupCode);
      if (!slug || !groupCode) {
        errors.push({ row: `companies#${i + 2}`, message: "Нужны slug и groupCode." });
        counters.companies.skipped++;
        continue;
      }
      const group = await tx.group.findUnique({ where: { code: groupCode } });
      if (!group) {
        errors.push({ row: `companies#${i + 2}`, message: `Группа ${groupCode} не найдена.` });
        counters.companies.skipped++;
        continue;
      }
      const name = str(r.name) || slug;
      const shortName = str(r.shortName) || null;
      const sourceOnlyInExcel = bool(r.sourceOnlyInExcel);
      const existing = await tx.company.findUnique({ where: { slug } });
      const totalAreaSqM = num(r.totalAreaSqM);
      const locationCount = Math.trunc(num(r.locationCount)) || 0;
      if (!Number.isFinite(totalAreaSqM) || totalAreaSqM < 0) {
        errors.push({ row: `companies#${i + 2}`, message: "Некорректная площадь." });
        counters.companies.skipped++;
        continue;
      }

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

    const locationRows = sheetToJson<Record<string, unknown>>(wb, SHEET_LOCATIONS);
    const touchedCompanies = new Set<string>();

    for (let i = 0; i < locationRows.length; i++) {
      const r = locationRows[i];
      const companySlug = str(r.companySlug);
      const comp = companyBySlug.get(companySlug);
      if (!comp) {
        errors.push({ row: `locations#${i + 2}`, message: `Компания ${companySlug} не найдена.` });
        counters.locations.skipped++;
        continue;
      }
      const title = str(r.title) || null;
      const addressLine = str(r.addressLine);
      const areaSqM = num(r.areaSqM);
      const locationType = str(r.locationType) || null;
      const sortOrder = Number.isFinite(num(r.sortOrder)) ? Math.trunc(num(r.sortOrder)) : 0;
      if (!Number.isFinite(areaSqM) || areaSqM < 0) {
        errors.push({ row: `locations#${i + 2}`, message: "Некорректная площадь локации." });
        counters.locations.skipped++;
        continue;
      }

      const id = str(r.id);
      let handled = false;
      if (id) {
        const loc = await tx.companyLocation.findFirst({ where: { id, companyId: comp.id } });
        if (loc) {
          await tx.companyLocation.update({
            where: { id },
            data: { title, addressLine, areaSqM, locationType, sortOrder },
          });
          counters.locations.updated++;
          touchedCompanies.add(comp.id);
          handled = true;
        }
      }
      if (!handled) {
        const candidates = await tx.companyLocation.findMany({
          where: { companyId: comp.id, addressLine },
        });
        const dup = candidates.find((l) => (l.title ?? "") === (title ?? ""));
        if (dup) {
          await tx.companyLocation.update({
            where: { id: dup.id },
            data: { areaSqM, locationType, sortOrder, title, addressLine },
          });
          counters.locations.updated++;
        } else {
          await tx.companyLocation.create({
            data: {
              companyId: comp.id,
              title,
              addressLine,
              areaSqM,
              locationType,
              sortOrder,
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

    const evalRows = sheetToJson<Record<string, unknown>>(wb, SHEET_EVALUATIONS);
    for (let i = 0; i < evalRows.length; i++) {
      const r = evalRows[i];
      const companySlug = str(r.companySlug);
      const comp = companyBySlug.get(companySlug);
      if (!comp) {
        errors.push({ row: `evaluations#${i + 2}`, message: `Компания ${companySlug} не найдена.` });
        counters.evaluations.skipped++;
        continue;
      }
      const full = await tx.company.findUniqueOrThrow({
        where: { id: comp.id },
        include: { group: true },
      });

      const rawStr = str(r.rawPayloadJson);
      let persisted:
        | ReturnType<typeof persistEvaluationFromForm>
        | null = null;
      if (rawStr) {
        try {
          const parsed = JSON.parse(rawStr) as Record<string, unknown>;
          const form = jsonFormToFormRecord(parsed);
          persisted = persistEvaluationFromForm({
            groupCode: full.group.code,
            areaSqM: full.totalAreaSqM,
            form,
          });
        } catch {
          persisted = null;
        }
      }

      let dataBlock: {
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

      if (persisted && persisted.ok) {
        dataBlock = persisted.data;
      } else {
        const periodLabel = str(r.periodLabel);
        if (!periodLabel) {
          errors.push({
            row: `evaluations#${i + 2}`,
            message: "Нет periodLabel и не удалось восстановить расчёт из rawPayloadJson.",
          });
          counters.evaluations.skipped++;
          continue;
        }
        const staffCount = Math.trunc(num(r.staffCount));
        const populationInZone = Math.trunc(num(r.populationInZone));
        if (staffCount <= 0 || populationInZone <= 0) {
          errors.push({ row: `evaluations#${i + 2}`, message: "Некорректные staffCount / populationInZone." });
          counters.evaluations.skipped++;
          continue;
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

      const eid = str(r.id);
      if (eid) {
        const ex = await tx.evaluation.findUnique({ where: { id: eid } });
        if (ex && ex.companyId === full.id) {
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
          companyId: full.id,
          ...dataBlock,
        },
      });
      counters.evaluations.created++;
    }
  });

  return { ok: errors.length === 0, mode, counters, errors };
}
