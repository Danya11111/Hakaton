import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import {
  buildWorkbook,
  sheetFromRows,
  SHEET_COMPANIES,
  SHEET_EVALUATIONS,
  SHEET_GROUPS,
  SHEET_LOCATIONS,
} from "@/lib/excel/workbook";

export async function buildCompaniesExportBuffer(): Promise<Buffer> {
  const groups = await prisma.group.findMany({ orderBy: { sortOrder: "asc" } });
  const companies = await prisma.company.findMany({
    include: { group: true, locations: true, evaluations: true },
    orderBy: [{ groupId: "asc" }, { name: "asc" }],
  });

  const groupRows = groups.map((g) => ({
    code: g.code,
    slug: g.slug,
    title: g.title,
    unitType: g.unitType,
    description: g.description,
    sortOrder: g.sortOrder,
  }));

  const companyRows = companies.map((c) => ({
    id: c.id,
    groupCode: c.group.code,
    slug: c.slug,
    name: c.name,
    shortName: c.shortName ?? "",
    totalAreaSqM: c.totalAreaSqM,
    locationCount: c.locationCount,
    sourceOnlyInExcel: c.sourceOnlyInExcel,
  }));

  const locationRows = companies.flatMap((c) =>
    c.locations.map((l) => ({
      id: l.id,
      companySlug: c.slug,
      title: l.title ?? "",
      addressLine: l.addressLine,
      areaSqM: l.areaSqM,
      locationType: l.locationType ?? "",
      sortOrder: l.sortOrder,
    })),
  );

  const evaluationRows = companies.flatMap((c) =>
    c.evaluations.map((e) => ({
      id: e.id,
      companySlug: c.slug,
      periodLabel: e.periodLabel,
      staffCount: e.staffCount,
      populationInZone: e.populationInZone,
      integralScore: e.integralScore,
      statusLabel: e.statusLabel,
      resultScore: e.resultScore,
      efficiencyScore: e.efficiencyScore,
      qualityScore: e.qualityScore,
      rawPayloadJson: JSON.stringify(e.rawPayloadJson ?? {}),
    })),
  );

  return buildWorkbook([
    sheetFromRows(SHEET_GROUPS, groupRows),
    sheetFromRows(SHEET_COMPANIES, companyRows),
    sheetFromRows(SHEET_LOCATIONS, locationRows),
    sheetFromRows(SHEET_EVALUATIONS, evaluationRows),
  ]);
}

export function buildTemplateBuffer(): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([["code", "slug", "title", "unitType", "description", "sortOrder"]]),
    SHEET_GROUPS,
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        "id",
        "groupCode",
        "slug",
        "name",
        "shortName",
        "totalAreaSqM",
        "locationCount",
        "sourceOnlyInExcel",
      ],
    ]),
    SHEET_COMPANIES,
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([["id", "companySlug", "title", "addressLine", "areaSqM", "locationType", "sortOrder"]]),
    SHEET_LOCATIONS,
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        "id",
        "companySlug",
        "periodLabel",
        "staffCount",
        "populationInZone",
        "integralScore",
        "statusLabel",
        "resultScore",
        "efficiencyScore",
        "qualityScore",
        "rawPayloadJson",
      ],
    ]),
    SHEET_EVALUATIONS,
  );
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
