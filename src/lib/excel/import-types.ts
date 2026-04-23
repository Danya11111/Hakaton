import type { Prisma } from "@prisma/client";

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

export type RowIssue = {
  sheet: string;
  row: number;
  column?: string;
  message: string;
  severity: "fatal" | "warning";
};

export type DryRunSummary = {
  groups: { create: number; update: number; skip: number };
  companies: { create: number; update: number; skip: number };
  locations: { create: number; update: number; skip: number };
  evaluations: { create: number; update: number; skip: number };
  companiesDeletedIfReplace?: number;
};

export type EvaluationDataBlock = {
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

export type ImportPayloadV1 = {
  v: 1;
  mode: ImportMode;
  groups: Array<{
    code: string;
    slug: string;
    title: string;
    unitType: string;
    description: string;
    sortOrder: number;
  }>;
  companies: Array<{
    slug: string;
    groupCode: string;
    name: string;
    shortName: string | null;
    totalAreaSqM: number;
    locationCount: number;
    sourceOnlyInExcel: boolean;
  }>;
  locations: Array<{
    companySlug: string;
    id: string | null;
    title: string | null;
    addressLine: string;
    areaSqM: number;
    locationType: string | null;
    sortOrder: number;
  }>;
  evaluations: Array<{
    companySlug: string;
    id: string | null;
    dataBlock: EvaluationDataBlock;
  }>;
};
