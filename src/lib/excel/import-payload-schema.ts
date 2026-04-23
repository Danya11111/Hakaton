import type { Prisma } from "@prisma/client";
import { z } from "zod";
import type { ImportMode, ImportPayloadV1 } from "@/lib/excel/import-types";

const jsonValue: z.ZodType<Prisma.InputJsonValue> = z.custom<Prisma.InputJsonValue>((v) => v !== undefined);

const evaluationDataBlockSchema = z.object({
  periodLabel: z.string(),
  staffCount: z.number().int(),
  populationInZone: z.number().int(),
  integralScore: z.number(),
  statusLabel: z.string(),
  resultScore: z.number(),
  efficiencyScore: z.number(),
  qualityScore: z.number(),
  rawPayloadJson: jsonValue,
  breakdownJson: jsonValue,
});

export const importPayloadV1Schema = z.object({
  v: z.literal(1),
  mode: z.enum(["merge", "replace_companies"]) as z.ZodType<ImportMode>,
  groups: z.array(
    z.object({
      code: z.string(),
      slug: z.string(),
      title: z.string(),
      unitType: z.string(),
      description: z.string(),
      sortOrder: z.number().int(),
    }),
  ),
  companies: z.array(
    z.object({
      slug: z.string(),
      groupCode: z.string(),
      name: z.string(),
      shortName: z.string().nullable(),
      totalAreaSqM: z.number(),
      locationCount: z.number().int(),
      sourceOnlyInExcel: z.boolean(),
    }),
  ),
  locations: z.array(
    z.object({
      companySlug: z.string(),
      id: z.string().nullable(),
      title: z.string().nullable(),
      addressLine: z.string(),
      areaSqM: z.number(),
      locationType: z.string().nullable(),
      sortOrder: z.number().int(),
    }),
  ),
  evaluations: z.array(
    z.object({
      companySlug: z.string(),
      id: z.string().nullable(),
      dataBlock: evaluationDataBlockSchema,
    }),
  ),
});

export function parseStoredImportPayload(json: unknown): ImportPayloadV1 | null {
  const r = importPayloadV1Schema.safeParse(json);
  return r.success ? (r.data as ImportPayloadV1) : null;
}
