import { prisma } from "@/lib/prisma";
import { parseWorkbook, sheetToJson, SHEET_COMPANIES, SHEET_EVALUATIONS, SHEET_GROUPS, SHEET_LOCATIONS } from "@/lib/excel/workbook";
import { resolveEvaluationImportRow } from "@/lib/excel/import-eval-resolve";
import type { DryRunSummary, ImportMode, ImportPayloadV1, RowIssue } from "@/lib/excel/import-types";
import { bool, num, str } from "@/lib/excel/import-shared";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export type BuildImportPreviewResult = {
  payload: ImportPayloadV1 | null;
  fatal: RowIssue[];
  warnings: RowIssue[];
  summary: DryRunSummary | null;
};

function assertZipMagic(buf: ArrayBuffer): RowIssue | null {
  const u = new Uint8Array(buf.slice(0, 4));
  if (u.length < 2 || u[0] !== 0x50 || u[1] !== 0x4b) {
    return { sheet: "_file", row: 0, message: "Файл не похож на корректный .xlsx (ожидается ZIP-контейнер).", severity: "fatal" };
  }
  return null;
}

function requireSheetNames(wb: { SheetNames: string[] }): RowIssue | null {
  const need = [SHEET_GROUPS, SHEET_COMPANIES, SHEET_LOCATIONS, SHEET_EVALUATIONS];
  const missing = need.filter((n) => !wb.SheetNames.includes(n));
  if (missing.length) {
    return {
      sheet: "_workbook",
      row: 0,
      message: `Отсутствуют обязательные листы: ${missing.join(", ")}.`,
      severity: "fatal",
    };
  }
  return null;
}

function collectKeys(rows: Record<string, unknown>[]): Set<string> {
  const s = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      if (k && !k.startsWith("__")) s.add(k);
    }
  }
  return s;
}

function requireColumns(sheet: string, keys: Set<string>, required: string[]): RowIssue[] {
  const out: RowIssue[] = [];
  for (const col of required) {
    if (!keys.has(col)) {
      out.push({
        sheet,
        row: 1,
        column: col,
        message: `Отсутствует обязательная колонка «${col}».`,
        severity: "fatal",
      });
    }
  }
  return out;
}

function pushDupIssues(
  sheet: string,
  map: Map<string, number[]>,
  label: string,
  fatal: RowIssue[],
): void {
  for (const [, rows] of map) {
    if (rows.length > 1) {
      fatal.push({
        sheet,
        row: rows[0]!,
        column: label,
        message: `Дубликат ${label} в файле (строки Excel: ${rows.join(", ")}).`,
        severity: "fatal",
      });
    }
  }
}

async function computeDryRunSummary(payload: ImportPayloadV1): Promise<DryRunSummary> {
  const existingGroups = await prisma.group.findMany({ select: { code: true } });
  const groupCodeSet = new Set(existingGroups.map((g) => g.code));

  const existingCompanies = await prisma.company.findMany({
    select: {
      id: true,
      slug: true,
      locations: { select: { id: true, title: true, addressLine: true } },
    },
  });
  const companyBySlug = new Map(existingCompanies.map((c) => [c.slug, c]));

  const summary: DryRunSummary = {
    groups: { create: 0, update: 0, skip: 0 },
    companies: { create: 0, update: 0, skip: 0 },
    locations: { create: 0, update: 0, skip: 0 },
    evaluations: { create: 0, update: 0, skip: 0 },
  };

  if (payload.mode === "replace_companies") {
    summary.companiesDeletedIfReplace = await prisma.company.count();
  }

  for (const g of payload.groups) {
    if (!g.code) {
      summary.groups.skip++;
      continue;
    }
    if (groupCodeSet.has(g.code)) summary.groups.update++;
    else summary.groups.create++;
  }

  if (payload.mode === "replace_companies") {
    summary.companies.create += payload.companies.length;
  } else {
    for (const c of payload.companies) {
      if (companyBySlug.has(c.slug)) summary.companies.update++;
      else summary.companies.create++;
    }
  }

  for (const loc of payload.locations) {
    const comp =
      payload.mode === "replace_companies"
        ? undefined
        : companyBySlug.get(loc.companySlug);
    if (!comp && payload.mode !== "replace_companies") {
      summary.locations.skip++;
      continue;
    }
    if (payload.mode === "replace_companies") {
      summary.locations.create++;
      continue;
    }
    let handled = false;
    if (loc.id) {
      const hit = comp!.locations.find((l) => l.id === loc.id);
      if (hit) {
        summary.locations.update++;
        handled = true;
      }
    }
    if (!handled) {
      const dup = comp!.locations.find(
        (l) => l.addressLine === loc.addressLine && (l.title ?? "") === (loc.title ?? ""),
      );
      if (dup) summary.locations.update++;
      else summary.locations.create++;
    }
  }

  for (const ev of payload.evaluations) {
    const comp =
      payload.mode === "replace_companies"
        ? undefined
        : companyBySlug.get(ev.companySlug);
    if (!comp && payload.mode !== "replace_companies") {
      summary.evaluations.skip++;
      continue;
    }
    if (payload.mode === "replace_companies") {
      summary.evaluations.create++;
      continue;
    }
    if (ev.id) {
      const ex = await prisma.evaluation.findUnique({ where: { id: ev.id } });
      if (ex && ex.companyId === comp!.id) summary.evaluations.update++;
      else summary.evaluations.create++;
    } else {
      summary.evaluations.create++;
    }
  }

  return summary;
}

export async function buildImportPreview(buffer: ArrayBuffer, mode: ImportMode): Promise<BuildImportPreviewResult> {
  const fatal: RowIssue[] = [];
  const warnings: RowIssue[] = [];

  if (buffer.byteLength === 0) {
    fatal.push({ sheet: "_file", row: 0, message: "Пустой файл.", severity: "fatal" });
    return { payload: null, fatal, warnings, summary: null };
  }
  if (buffer.byteLength > MAX_IMPORT_BYTES) {
    fatal.push({
      sheet: "_file",
      row: 0,
      message: `Файл слишком больший (максимум ${Math.round(MAX_IMPORT_BYTES / (1024 * 1024))} МБ).`,
      severity: "fatal",
    });
    return { payload: null, fatal, warnings, summary: null };
  }

  const magic = assertZipMagic(buffer);
  if (magic) {
    fatal.push(magic);
    return { payload: null, fatal, warnings, summary: null };
  }

  let wb: ReturnType<typeof parseWorkbook>;
  try {
    wb = parseWorkbook(buffer);
  } catch (e) {
    fatal.push({
      sheet: "_file",
      row: 0,
      message: e instanceof Error ? e.message : "Не удалось прочитать книгу Excel.",
      severity: "fatal",
    });
    return { payload: null, fatal, warnings, summary: null };
  }

  const sheetErr = requireSheetNames(wb);
  if (sheetErr) {
    fatal.push(sheetErr);
    return { payload: null, fatal, warnings, summary: null };
  }

  const groupRows = sheetToJson<Record<string, unknown>>(wb, SHEET_GROUPS);
  const companyRows = sheetToJson<Record<string, unknown>>(wb, SHEET_COMPANIES);
  const locationRows = sheetToJson<Record<string, unknown>>(wb, SHEET_LOCATIONS);
  const evalRows = sheetToJson<Record<string, unknown>>(wb, SHEET_EVALUATIONS);

  fatal.push(
    ...requireColumns(SHEET_GROUPS, collectKeys(groupRows), ["code"]),
    ...requireColumns(SHEET_COMPANIES, collectKeys(companyRows), ["slug", "groupCode"]),
    ...requireColumns(SHEET_LOCATIONS, collectKeys(locationRows), ["companySlug", "addressLine"]),
    ...requireColumns(SHEET_EVALUATIONS, collectKeys(evalRows), ["companySlug"]),
  );
  if (fatal.length) return { payload: null, fatal, warnings, summary: null };

  const dupGroupCodes = new Map<string, number[]>();
  for (let i = 0; i < groupRows.length; i++) {
    const code = str(groupRows[i]!.code);
    if (!code) continue;
    const row = i + 2;
    if (!dupGroupCodes.has(code)) dupGroupCodes.set(code, []);
    dupGroupCodes.get(code)!.push(row);
  }
  pushDupIssues(SHEET_GROUPS, dupGroupCodes, "code", fatal);

  const dupCompanySlugs = new Map<string, number[]>();
  for (let i = 0; i < companyRows.length; i++) {
    const slug = str(companyRows[i]!.slug);
    if (!slug) continue;
    const row = i + 2;
    if (!dupCompanySlugs.has(slug)) dupCompanySlugs.set(slug, []);
    dupCompanySlugs.get(slug)!.push(row);
  }
  pushDupIssues(SHEET_COMPANIES, dupCompanySlugs, "slug", fatal);

  const dupLocKeys = new Map<string, number[]>();
  for (let i = 0; i < locationRows.length; i++) {
    const r = locationRows[i]!;
    const companySlug = str(r.companySlug);
    const addressLine = str(r.addressLine);
    const title = str(r.title);
    if (!companySlug || !addressLine) continue;
    const key = `${companySlug}\t${addressLine}\t${title}`;
    const row = i + 2;
    if (!dupLocKeys.has(key)) dupLocKeys.set(key, []);
    dupLocKeys.get(key)!.push(row);
  }
  for (const [, rows] of dupLocKeys) {
    if (rows.length > 1) {
      fatal.push({
        sheet: SHEET_LOCATIONS,
        row: rows[0]!,
        column: "companySlug",
        message: `Коллизия идентичности локации в файле (companySlug+адрес+название), строки: ${rows.join(", ")}.`,
        severity: "fatal",
      });
    }
  }

  if (fatal.length) return { payload: null, fatal, warnings, summary: null };

  const dbGroups = await prisma.group.findMany({ select: { code: true } });
  const dbGroupCodes = new Set(dbGroups.map((g) => g.code));

  const payloadGroups: ImportPayloadV1["groups"] = [];
  for (let i = 0; i < groupRows.length; i++) {
    const r = groupRows[i]!;
    const code = str(r.code);
    if (!code) continue;
    payloadGroups.push({
      code,
      slug: str(r.slug) || code.toLowerCase(),
      title: str(r.title) || code,
      unitType: str(r.unitType) || "",
      description: str(r.description) || "",
      sortOrder: Number.isFinite(num(r.sortOrder)) ? Math.trunc(num(r.sortOrder)) : 0,
    });
    if (dbGroupCodes.has(code)) {
      warnings.push({
        sheet: SHEET_GROUPS,
        row: i + 2,
        column: "code",
        message: `Группа ${code} уже есть в базе — строка будет обновлена (merge).`,
        severity: "warning",
      });
    }
  }
  const sheetGroupCodes = new Set(payloadGroups.map((g) => g.code));
  const groupCodesAvailable = new Set([...dbGroupCodes, ...sheetGroupCodes]);

  const payloadCompanies: ImportPayloadV1["companies"] = [];
  const companyMetaBySlug = new Map<string, { groupCode: string; areaSqM: number }>();

  const dbCompanies = await prisma.company.findMany({ select: { slug: true } });
  const dbSlugs = new Set(dbCompanies.map((c) => c.slug));

  for (let i = 0; i < companyRows.length; i++) {
    const r = companyRows[i]!;
    const row = i + 2;
    const slug = str(r.slug);
    const groupCode = str(r.groupCode);
    if (!slug || !groupCode) {
      fatal.push({
        sheet: SHEET_COMPANIES,
        row,
        column: !slug ? "slug" : "groupCode",
        message: "Нужны slug и groupCode.",
        severity: "fatal",
      });
      continue;
    }
    if (!groupCodesAvailable.has(groupCode)) {
      fatal.push({
        sheet: SHEET_COMPANIES,
        row,
        column: "groupCode",
        message: `Группа ${groupCode} не найдена ни на листе groups, ни в базе.`,
        severity: "fatal",
      });
      continue;
    }
    const totalAreaSqM = num(r.totalAreaSqM);
    const locationCount = Math.trunc(num(r.locationCount)) || 0;
    if (!Number.isFinite(totalAreaSqM) || totalAreaSqM < 0) {
      fatal.push({
        sheet: SHEET_COMPANIES,
        row,
        column: "totalAreaSqM",
        message: "Некорректная площадь.",
        severity: "fatal",
      });
      continue;
    }
    const name = str(r.name) || slug;
    const shortName = str(r.shortName) || null;
    payloadCompanies.push({
      slug,
      groupCode,
      name,
      shortName,
      totalAreaSqM,
      locationCount,
      sourceOnlyInExcel: bool(r.sourceOnlyInExcel),
    });
    companyMetaBySlug.set(slug, { groupCode, areaSqM: totalAreaSqM });
    if (mode === "merge" && dbSlugs.has(slug)) {
      warnings.push({
        sheet: SHEET_COMPANIES,
        row,
        column: "slug",
        message: `Компания ${slug} уже есть в базе — будет обновлена.`,
        severity: "warning",
      });
    }
  }

  if (fatal.length) return { payload: null, fatal, warnings, summary: null };

  const payloadLocations: ImportPayloadV1["locations"] = [];
  for (let i = 0; i < locationRows.length; i++) {
    const r = locationRows[i]!;
    const row = i + 2;
    const companySlug = str(r.companySlug);
    if (!companySlug) {
      fatal.push({ sheet: SHEET_LOCATIONS, row, column: "companySlug", message: "Пустой companySlug.", severity: "fatal" });
      continue;
    }
    if (!companyMetaBySlug.has(companySlug)) {
      fatal.push({
        sheet: SHEET_LOCATIONS,
        row,
        column: "companySlug",
        message: `Компания ${companySlug} не найдена на листе companies.`,
        severity: "fatal",
      });
      continue;
    }
    const areaSqM = num(r.areaSqM);
    if (!Number.isFinite(areaSqM) || areaSqM < 0) {
      fatal.push({
        sheet: SHEET_LOCATIONS,
        row,
        column: "areaSqM",
        message: "Некорректная площадь локации.",
        severity: "fatal",
      });
      continue;
    }
    const id = str(r.id) || null;
    const title = str(r.title) || null;
    const addressLine = str(r.addressLine);
    const locationType = str(r.locationType) || null;
    const sortOrder = Number.isFinite(num(r.sortOrder)) ? Math.trunc(num(r.sortOrder)) : 0;
    payloadLocations.push({ companySlug, id, title, addressLine, areaSqM, locationType, sortOrder });
  }

  if (fatal.length) return { payload: null, fatal, warnings, summary: null };

  const payloadEvaluations: ImportPayloadV1["evaluations"] = [];
  for (let i = 0; i < evalRows.length; i++) {
    const r = evalRows[i]!;
    const row = i + 2;
    const companySlug = str(r.companySlug);
    if (!companySlug) {
      fatal.push({ sheet: SHEET_EVALUATIONS, row, column: "companySlug", message: "Пустой companySlug.", severity: "fatal" });
      continue;
    }
    const meta = companyMetaBySlug.get(companySlug);
    if (!meta) {
      fatal.push({
        sheet: SHEET_EVALUATIONS,
        row,
        column: "companySlug",
        message: `Компания ${companySlug} не найдена на листе companies.`,
        severity: "fatal",
      });
      continue;
    }
    const resolved = resolveEvaluationImportRow({
      r,
      groupCode: meta.groupCode,
      areaSqM: meta.areaSqM,
      sheet: SHEET_EVALUATIONS,
      row,
    });
    if (!resolved.ok) {
      fatal.push(...resolved.issues);
      continue;
    }
    const eid = str(r.id) || null;
    payloadEvaluations.push({ companySlug, id: eid, dataBlock: resolved.dataBlock });
  }

  if (fatal.length) return { payload: null, fatal, warnings, summary: null };

  const payload: ImportPayloadV1 = {
    v: 1,
    mode,
    groups: payloadGroups,
    companies: payloadCompanies,
    locations: payloadLocations,
    evaluations: payloadEvaluations,
  };

  const summary = await computeDryRunSummary(payload);

  if (mode === "replace_companies") {
    warnings.push({
      sheet: "_mode",
      row: 0,
      message: "Режим replace_companies удалит все компании и связанные локации/расчёты перед применением.",
      severity: "warning",
    });
  }

  return { payload, fatal, warnings, summary };
}
